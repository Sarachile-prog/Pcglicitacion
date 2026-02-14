import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000));

/**
 * Función Maestra de Ingesta: 
 * Descarga licitaciones de una fecha y las "siembra" en la colección /bids de Firestore.
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  maxInstances: 10,
  timeoutSeconds: 120
}, async (request: any, response: any) => {
  const date = request.query.date; // Formato DDMMYYYY

  if (!date) {
    response.status(400).json({ error: "Missing date parameter" });
    return;
  }

  console.log(`>>> [SERVER] Iniciando ingesta masiva para fecha: ${date}`);

  try {
    const db = admin.firestore();
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    
    let bidsList: any[] = [];
    let apiSuccess = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !apiSuccess) {
      attempts++;
      console.log(`>>> [SERVER] Intento API ${attempts} para ${date}...`);
      
      const apiResponse = await fetch(apiUrl);
      const apiData = (await apiResponse.json()) as any;

      if (apiResponse.ok && apiData.Listado) {
        bidsList = apiData.Listado;
        apiSuccess = true;
      } else if (apiData.Codigo === 10500) {
        console.warn(`>>> [SERVER] API Saturada. Reintentando en ${2000 * attempts}ms...`);
        await sleep(2000 * attempts);
      } else {
        throw new Error(apiData.Mensaje || `Error ${apiResponse.status}`);
      }
    }

    if (!apiSuccess) throw new Error("API Mercado Público no disponible tras reintentos.");

    console.log(`>>> [SERVER] Procesando ${bidsList.length} licitaciones para Firestore...`);

    // Ingesta Atómica: Guardamos cada licitación en la colección principal
    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    bidsList.forEach((bid) => {
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
        sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bid.CodigoExterno}`,
        rawResponse: bid // Guardamos el original por si acaso
      }, { merge: true });
    });

    // También actualizamos el cache de control
    const cacheRef = db.collection("mp_cache").doc(`sync_${date}`);
    batch.set(cacheRef, {
      lastSync: now,
      count: bidsList.length,
      status: 'success'
    });

    await batch.commit();

    response.json({ 
      success: true, 
      count: bidsList.length,
      message: `Ingesta completada: ${bidsList.length} licitaciones sincronizadas.` 
    });

  } catch (error: any) {
    console.error(`>>> [SERVER] ERROR FATAL: ${error.message}`);
    response.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

export const getBidDetail = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  maxInstances: 10
}, async (request: any, response: any) => {
  const code = request.query.code;
  if (!code) {
    response.status(400).json({ error: "Missing code parameter" });
    return;
  }

  try {
    const db = admin.firestore();
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${code}&ticket=${TICKET}`;
    
    const apiResponse = await fetch(apiUrl);
    const apiData = (await apiResponse.json()) as any;

    if (apiResponse.ok && apiData.Listado && apiData.Listado.length > 0) {
      const detail = apiData.Listado[0];
      
      // Actualizamos el documento en /bids con el detalle rico
      await db.collection("bids").doc(code).update({
        description: detail.Descripcion,
        items: detail.Items?.Listado || [],
        fullDetailAt: admin.firestore.FieldValue.serverTimestamp(),
        rawDetail: detail
      });

      response.json({ success: true, data: detail });
    } else {
      response.status(404).json({ error: "Not Found" });
    }
  } catch (error: any) {
    response.status(500).json({ error: error.message });
  }
});

export const healthCheck = onRequest({ cors: true }, (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
