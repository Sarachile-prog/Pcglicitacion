
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
 * Lógica central de sincronización reutilizable para triggers manuales (HTTP) y automáticos (CRON).
 */
async function performSync(date: string) {
  const db = admin.firestore();
  const { ticket: TICKET } = await getActiveTicket();
  
  // Verificación de Caché para evitar llamadas innecesarias a la API
  const cacheRef = db.collection("mp_cache").doc(`sync_${date}`);
  const cacheSnap = await cacheRef.get();
  
  if (cacheSnap.exists && cacheSnap.data()?.status === 'success') {
    const lastSync = cacheSnap.data()?.lastSync?.toDate();
    const now = new Date();
    // Cache de 1 hora
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

  // Manejo de saturación de la API (Error 10500)
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
    
    const title = bid.Nombre || bid.NombreLicitacion || "Sin título";
    const status = bid.Estado || bid.EstadoLicitacion || "No definido";
    
    // Mapeo robusto de Organismo
    let entity = "Institución no especificada";
    if (bid.Organismo) {
      entity = bid.Organismo.NombreOrganismo || bid.Organismo.Nombre || (typeof bid.Organismo === 'string' ? bid.Organismo : entity);
    } else if (bid.Institucion) {
      entity = bid.Institucion;
    }
    
    const amount = bid.MontoEstimado || bid.Monto || 0;
    
    // Fechas con fallback
    const publishedDate = bid.FechaPublicacion || null;
    const deadlineDate = bid.FechaCierre || bid.FechaCierreLicitacion || null;
    
    const bidRef = db.collection("bids").doc(bid.CodigoExterno);
    batch.set(bidRef, {
      id: bid.CodigoExterno,
      title,
      entity,
      status,
      publishedDate,
      deadlineDate,
      amount,
      currency: bid.Moneda || 'CLP',
      scrapedAt: nowServer,
      sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bid.CodigoExterno}`
    }, { merge: true });
  });

  batch.set(cacheRef, { lastSync: nowServer, count: bidsList.length, status: 'success' });
  await batch.commit();

  return { success: true, count: bidsList.length, message: "Sincronización exitosa." };
}

/**
 * Trigger Manual: Permite al usuario sincronizar una fecha específica desde el UI.
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  maxInstances: 10,
  timeoutSeconds: 120
}, async (request: any, response: any) => {
  const date = request.query.date;
  if (!date) return response.status(400).json({ error: "Falta el parámetro 'date' (formato ddMMyyyy)" });

  try {
    const result = await performSync(date);
    response.json(result);
  } catch (error: any) {
    console.error(`>>> [SERVER] Error en sincronización manual: ${error.message}`);
    response.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Trigger Automático: Sincroniza las licitaciones del día todos los días hábiles a las 8 AM.
 */
export const dailyBidSync = onSchedule({
  schedule: "0 8 * * 1-5", // Lunes a Viernes a las 08:00 AM
  timeZone: "America/Santiago",
  region: "us-central1"
}, async (event) => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const formattedDate = `${day}${month}${year}`;
  
  console.log(`>>> [CRON] Iniciando sincronización diaria automática para ${formattedDate}`);
  try {
    const result = await performSync(formattedDate);
    console.log(`>>> [CRON] Sincronización exitosa: ${result.count} licitaciones procesadas.`);
  } catch (error: any) {
    console.error(`>>> [CRON] Error crítico en sincronización diaria: ${error.message}`);
  }
});

export const getBidDetail = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
}, async (request: any, response: any) => {
  const code = request.query.code;
  if (!code) return response.status(400).json({ error: "Falta el código de licitación" });

  try {
    const { ticket: TICKET } = await getActiveTicket();
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${code}&ticket=${TICKET}`;
    const apiResponse = await fetch(apiUrl);
    const apiData = (await apiResponse.json()) as any;

    if (apiData.Listado && apiData.Listado.length > 0) {
      const detail = apiData.Listado[0];
      
      let entity = "Institución no especificada";
      if (detail.Organismo) {
        entity = detail.Organismo.NombreOrganismo || detail.Organismo.Nombre || (typeof detail.Organismo === 'string' ? detail.Organismo : entity);
      }

      await admin.firestore().collection("bids").doc(code).update({
        description: detail.Descripcion || "Sin descripción adicional.",
        items: detail.Items?.Listado || [],
        amount: detail.MontoEstimado || 0,
        currency: detail.Moneda || 'CLP',
        entity: entity,
        publishedDate: detail.FechaPublicacion || null,
        deadlineDate: detail.FechaCierre || null,
        fullDetailAt: admin.firestore.FieldValue.serverTimestamp()
      });
      response.json({ success: true, data: detail });
    } else {
      response.status(404).json({ error: "Licitación no encontrada" });
    }
  } catch (error: any) {
    response.status(500).json({ error: error.message });
  }
});

export const healthCheck = onRequest({ cors: true }, (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), service: "Mercado Público Sync" });
});
