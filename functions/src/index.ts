import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';

/**
 * Espera con jitter para evitar colisiones en la API.
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000));

/**
 * Obtiene el listado de licitaciones para una fecha específica.
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  maxInstances: 10
}, async (request: any, response: any) => {
  const date = request.query.date; // Formato DDMMYYYY

  if (!date) {
    response.status(400).json({ error: "Missing date parameter" });
    return;
  }

  console.log(`>>> [SERVER] Solicitud recibida para fecha: ${date}`);

  try {
    const db = admin.firestore();
    const cacheRef = db.collection("mp_cache").doc(`bids_${date}`);
    const docSnap = await cacheRef.get();
    
    const now = Date.now();
    const TTL_MS = 10 * 60 * 1000; // 10 minutos de cache para listas

    if (docSnap.exists) {
      const data = docSnap.data();
      const expiresAt = data?.expiresAt;
      if (expiresAt && expiresAt.toMillis() > now) {
        console.log(`>>> [SERVER] Cache HIT para ${date}.`);
        response.json({ fromCache: true, data: data?.data || [] });
        return;
      }
      console.log(`>>> [SERVER] Cache EXPIRED para ${date}. Refrescando...`);
    }

    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    
    let bidsList: any[] = [];
    let apiSuccess = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts && !apiSuccess) {
      attempts++;
      console.log(`>>> [SERVER] Intento ${attempts} para ${date}...`);
      
      const apiResponse = await fetch(apiUrl);
      const apiData = (await apiResponse.json()) as any;

      if (apiResponse.ok && apiData.Listado) {
        bidsList = apiData.Listado;
        apiSuccess = true;
        console.log(`>>> [SERVER] API respondió exitosamente con ${bidsList.length} licitaciones.`);
      } else if (apiData.Codigo === 10500) {
        console.warn(`>>> [SERVER] API Saturada (Error 10500). Esperando para reintentar...`);
        await sleep(2000 * attempts); // Espera exponencial
      } else {
        throw new Error(apiData.Mensaje || `Error ${apiResponse.status}`);
      }
    }

    if (!apiSuccess) throw new Error("API Mercado Público saturada tras varios intentos.");

    const newExpiresAt = admin.firestore.Timestamp.fromMillis(now + TTL_MS);
    await cacheRef.set({
      data: bidsList,
      expiresAt: newExpiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    response.json({ fromCache: false, refreshed: true, data: bidsList });

  } catch (error: any) {
    console.error(`>>> [SERVER] ERROR FATAL: ${error.message}`);
    response.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

/**
 * Obtiene el detalle profundo de una licitación específica por su ID.
 */
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
    const cacheRef = db.collection("mp_cache").doc(`detail_${code}`);
    const docSnap = await cacheRef.get();
    
    if (docSnap.exists) {
      console.log(`>>> [SERVER] Detail HIT para ${code}`);
      response.json({ fromCache: true, data: docSnap.data()?.data });
      return;
    }

    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${code}&ticket=${TICKET}`;
    
    let attempts = 0;
    const maxAttempts = 3;
    let detail = null;

    while (attempts < maxAttempts && !detail) {
      attempts++;
      const apiResponse = await fetch(apiUrl);
      const apiData = (await apiResponse.json()) as any;

      if (apiResponse.ok && apiData.Listado && apiData.Listado.length > 0) {
        detail = apiData.Listado[0];
      } else if (apiData.Codigo === 10500) {
        await sleep(2000 * attempts);
      } else {
        break;
      }
    }

    if (detail) {
      await cacheRef.set({
        data: detail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      response.json({ fromCache: false, data: detail });
    } else {
      response.status(404).json({ error: "Not Found", message: "Licitación no disponible." });
    }
  } catch (error: any) {
    response.status(500).json({ error: "Internal Error", message: error.message });
  }
});
