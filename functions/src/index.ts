
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Este ticket es de ejemplo y suele estar saturado o bloqueado en producción real.
const DEFAULT_TICKET = 'F80640D6-AB32-4757-827D-02589D211564';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getActiveTicket(): Promise<{ ticket: string, source: string }> {
  try {
    const configDoc = await admin.firestore().collection("settings").doc("mercado_publico").get();
    if (configDoc.exists && configDoc.data()?.ticket) {
      return { ticket: configDoc.data()?.ticket, source: 'custom' };
    }
  } catch (e) {
    console.error(">>> [SERVER] Error leyendo ticket personalizado.");
  }
  return { ticket: DEFAULT_TICKET, source: 'default' };
}

/**
 * Lógica central de sincronización reutilizable.
 * Mantiene la persistencia evitando borrar datos ya enriquecidos.
 */
async function performSync(date: string) {
  const db = admin.firestore();
  const { ticket: TICKET } = await getActiveTicket();
  
  const cacheRef = db.collection("mp_cache").doc(`sync_${date}`);
  const cacheSnap = await cacheRef.get();
  
  if (cacheSnap.exists && cacheSnap.data()?.status === 'success') {
    const lastSync = cacheSnap.data()?.lastSync?.toDate();
    const now = new Date();
    if (lastSync && (now.getTime() - lastSync.getTime() < 3600000)) {
      return { success: true, count: cacheSnap.data()?.count, message: "Datos obtenidos desde caché reciente." };
    }
  }

  const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
  
  let apiResponse = await fetch(apiUrl);
  if (!apiResponse.ok) {
    throw new Error(`La API respondió con error: ${apiResponse.status}`);
  }

  let apiData = (await apiResponse.json()) as any;

  let attempts = 0;
  while (apiData.Codigo === 10500 && attempts < 5) {
    attempts++;
    const waitTime = 2000 * attempts;
    await sleep(waitTime);
    apiResponse = await fetch(apiUrl);
    apiData = (await apiResponse.json()) as any;
  }

  if (apiData.Codigo) {
    throw new Error(apiData.Mensaje || "Error desconocido en la API de Mercado Público");
  }

  const bidsList = apiData.Listado || [];
  const batch = db.batch();
  const nowServer = admin.firestore.FieldValue.serverTimestamp();

  bidsList.forEach((bid: any) => {
    if (!bid.CodigoExterno) return;
    
    const bidRef = db.collection("bids").doc(bid.CodigoExterno);
    
    // Mapeo inicial ligero
    batch.set(bidRef, {
      id: bid.CodigoExterno,
      title: bid.Nombre || "Sin título",
      status: bid.Estado || "No definido",
      deadlineDate: bid.FechaCierre || null,
      scrapedAt: nowServer,
      sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bid.CodigoExterno}`
    }, { merge: true });
  });

  batch.set(cacheRef, { lastSync: nowServer, count: bidsList.length, status: 'success' });
  await batch.commit();

  return { success: true, count: bidsList.length, message: "Sincronización exitosa." };
}

export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  maxInstances: 10,
  timeoutSeconds: 120
}, async (request: any, response: any) => {
  const date = request.query.date;
  if (!date) return response.status(400).json({ error: "Falta el parámetro 'date'" });
  try {
    const result = await performSync(date);
    response.json(result);
  } catch (error: any) {
    response.status(500).json({ success: false, error: error.message });
  }
});

export const dailyBidSync = onSchedule({
  schedule: "0 8 * * 1-5",
  timeZone: "America/Santiago",
  region: "us-central1"
}, async (event) => {
  const now = new Date();
  const formattedDate = `${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}`;
  try {
    await performSync(formattedDate);
  } catch (error: any) {
    console.error(`>>> [CRON] Error: ${error.message}`);
  }
});

export const getBidDetail = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
}, async (request: any, response: any) => {
  const code = request.query.code;
  if (!code) return response.status(400).json({ error: "Falta el código" });
  try {
    const { ticket: TICKET } = await getActiveTicket();
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${code}&ticket=${TICKET}`;
    const apiResponse = await fetch(apiUrl);
    const apiData = (await apiResponse.json()) as any;

    if (apiData.Listado && apiData.Listado.length > 0) {
      const detail = apiData.Listado[0];
      
      // MAPEO SEGÚN DICCIONARIO DE DATOS OFICIAL
      // Licitaciones/Listado/Licitacion/Comprador/NombreOrganismo
      let entity = "Institución no especificada";
      if (detail.Comprador) {
        entity = detail.Comprador.NombreOrganismo || entity;
      } else if (detail.Organismo) {
        entity = detail.Organismo.NombreOrganismo || detail.Organismo.Nombre || entity;
      }

      // Licitaciones/Listado/Licitacion/Fechas/FechaCierre
      const deadlineDate = detail.Fechas?.FechaCierre || detail.FechaCierre || null;
      const publishedDate = detail.Fechas?.FechaPublicacion || detail.FechaPublicacion || null;

      await admin.firestore().collection("bids").doc(code).update({
        description: detail.Descripcion || "Sin descripción adicional.",
        items: detail.Items?.Listado || [],
        amount: detail.MontoEstimado || 0, // Licitaciones/Listado/Licitacion/MontoEstimado
        currency: detail.Moneda || 'CLP', // Unidades Monetarias
        entity: entity,
        typeCode: detail.CodigoTipo || null, // L1, LE, LP, etc.
        publishedDate: publishedDate,
        deadlineDate: deadlineDate,
        fullDetailAt: admin.firestore.FieldValue.serverTimestamp()
      });
      response.json({ success: true, data: detail });
    } else {
      response.status(404).json({ error: "No encontrado" });
    }
  } catch (error: any) {
    response.status(500).json({ error: error.message });
  }
});

export const healthCheck = onRequest({ cors: true }, (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
