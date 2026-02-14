import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Obtiene el listado de licitaciones para una fecha específica.
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
}, async (request: any, response: any) => {
  const date = request.query.date; // Formato DDMMYYYY

  if (!date) {
    response.status(400).json({ error: "Missing date parameter" });
    return;
  }

  try {
    const db = admin.firestore();
    const cacheRef = db.collection("mp_cache").doc(`bids_${date}`);
    const docSnap = await cacheRef.get();
    
    const now = Date.now();
    const TTL_MS = 15 * 60 * 1000; // 15 minutos de cache

    if (docSnap.exists) {
      const data = docSnap.data();
      const expiresAt = data?.expiresAt;
      if (expiresAt && expiresAt.toMillis() > now) {
        response.json({ fromCache: true, data: data?.data || [] });
        return;
      }
    }

    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    
    let bidsList: any[] = [];
    let apiSuccess = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !apiSuccess) {
      attempts++;
      const apiResponse = await fetch(apiUrl);
      const apiData = (await apiResponse.json()) as any;

      if (apiResponse.ok && apiData.Listado) {
        bidsList = apiData.Listado;
        apiSuccess = true;
      } else if (apiData.Codigo === 10500) {
        await sleep(2000 * attempts);
      } else {
        throw new Error(apiData.Mensaje || `Error ${apiResponse.status}`);
      }
    }

    if (!apiSuccess) throw new Error("API saturada (Error 10500).");

    const newExpiresAt = admin.firestore.Timestamp.fromMillis(now + TTL_MS);
    await cacheRef.set({
      data: bidsList,
      expiresAt: newExpiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    response.json({ fromCache: false, refreshed: true, data: bidsList });

  } catch (error: any) {
    response.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

/**
 * Obtiene el detalle profundo de una licitación específica por su ID (CodigoExterno).
 */
export const getBidDetail = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
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
      response.json({ fromCache: true, data: docSnap.data()?.data });
      return;
    }

    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${code}&ticket=${TICKET}`;
    const apiResponse = await fetch(apiUrl);
    const apiData = (await apiResponse.json()) as any;

    if (apiResponse.ok && apiData.Listado && apiData.Listado.length > 0) {
      const detail = apiData.Listado[0];
      await cacheRef.set({
        data: detail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      response.json({ fromCache: false, data: detail });
    } else {
      response.status(404).json({ error: "Not Found", message: apiData.Mensaje || "Licitación no encontrada" });
    }
  } catch (error: any) {
    response.status(500).json({ error: "Internal Error", message: error.message });
  }
});
