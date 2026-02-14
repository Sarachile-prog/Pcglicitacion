
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Este ticket es de ejemplo y suele estar saturado o bloqueado.
const DEFAULT_TICKET = 'F80640D6-AB32-4757-827D-02589D211564';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getActiveTicket(): Promise<{ ticket: string, source: string }> {
  try {
    const configDoc = await admin.firestore().collection("settings").doc("mercado_publico").get();
    if (configDoc.exists && configDoc.data()?.ticket) {
      console.log(">>> [SERVER] Usando ticket personalizado desde Firestore.");
      return { ticket: configDoc.data()?.ticket, source: 'custom' };
    }
  } catch (e) {
    console.error(">>> [SERVER] Error leyendo ticket de Firestore.");
  }
  console.log(">>> [SERVER] Usando ticket predeterminado (posiblemente inválido).");
  return { ticket: DEFAULT_TICKET, source: 'default' };
}

export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  maxInstances: 10,
  timeoutSeconds: 120
}, async (request: any, response: any) => {
  const date = request.query.date;
  if (!date) return response.status(400).json({ error: "Missing date" });

  console.log(`>>> [SERVER] Solicitud recibida para fecha: ${date}`);

  try {
    const db = admin.firestore();
    const { ticket: TICKET, source } = await getActiveTicket();
    
    // Check Cache
    const cacheRef = db.collection("mp_cache").doc(`sync_${date}`);
    const cacheSnap = await cacheRef.get();
    
    if (cacheSnap.exists && cacheSnap.data()?.status === 'success') {
      console.log(`>>> [SERVER] Cache HIT para ${date}. Retornando datos guardados.`);
      return response.json({ success: true, count: cacheSnap.data()?.count, message: "Datos desde cache." });
    }

    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    console.log(`>>> [SERVER] Llamando a API Oficial con ticket tipo: ${source}`);
    
    let apiResponse = await fetch(apiUrl);
    let apiData = (await apiResponse.json()) as any;

    // Manejo de Error de Saturación (10500) con reintentos
    let attempts = 0;
    while (apiData.Codigo === 10500 && attempts < 5) {
      attempts++;
      const waitTime = 2000 * attempts;
      console.warn(`>>> [SERVER] API Saturada (10500). Reintento ${attempts} en ${waitTime}ms...`);
      await sleep(waitTime);
      apiResponse = await fetch(apiUrl);
      apiData = (await apiResponse.json()) as any;
    }

    // Si después de reintentos sigue habiendo error de ticket o similar
    if (apiData.Codigo && apiData.Codigo !== 10500) {
      console.error(`>>> [SERVER] Error API Mercado Público. Código: ${apiData.Codigo}. Mensaje: ${apiData.Mensaje}`);
      return response.status(401).json({ 
        success: false, 
        message: apiData.Mensaje || "Ticket inválido",
        code: apiData.Codigo
      });
    }

    const bidsList = apiData.Listado || [];
    console.log(`>>> [SERVER] API respondió exitosamente con ${bidsList.length} licitaciones.`);

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    bidsList.forEach((bid: any) => {
      const bidRef = db.collection("bids").doc(bid.CodigoExterno);
      batch.set(bidRef, {
        id: bid.CodigoExterno,
        title: bid.Nombre,
        entity: bid.Organismo.NombreOrganismo,
        status: bid.Estado,
        deadlineDate: bid.FechaCierre || null,
        amount: bid.MontoEstimado || 0,
        currency: bid.Moneda || 'CLP',
        scrapedAt: now,
        sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bid.CodigoExterno}`
      }, { merge: true });
    });

    batch.set(cacheRef, { lastSync: now, count: bidsList.length, status: 'success' });
    await batch.commit();

    console.log(`>>> [SERVER] Firestore actualizado para ${date}.`);
    response.json({ success: true, count: bidsList.length, message: "Sincronización exitosa." });
  } catch (error: any) {
    console.error(`>>> [SERVER] ERROR FATAL: ${error.message}`);
    response.status(500).json({ error: error.message });
  }
});

export const getBidDetail = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
}, async (request: any, response: any) => {
  const code = request.query.code;
  if (!code) return response.status(400).json({ error: "Missing code" });

  try {
    const { ticket: TICKET } = await getActiveTicket();
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${code}&ticket=${TICKET}`;
    const apiResponse = await fetch(apiUrl);
    const apiData = (await apiResponse.json()) as any;

    if (apiData.Listado && apiData.Listado.length > 0) {
      const detail = apiData.Listado[0];
      await admin.firestore().collection("bids").doc(code).update({
        description: detail.Descripcion,
        items: detail.Items?.Listado || [],
        fullDetailAt: admin.firestore.FieldValue.serverTimestamp()
      });
      response.json({ success: true, data: detail });
    } else {
      response.status(404).json({ error: "Not found" });
    }
  } catch (error: any) {
    response.status(500).json({ error: error.message });
  }
});

export const healthCheck = onRequest({ cors: true }, (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
