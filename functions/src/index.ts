import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const healthCheck = onRequest({
  cors: true,
  region: "us-central1"
}, (request: any, response: any) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Licitaciones Globales - Backend"
  });
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Obtiene licitaciones reales de Mercado Público con lógica de reintentos robusta.
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
}, async (request: any, response: any) => {
  const date = request.query.date;

  console.log(`>>> [SERVER] Solicitud recibida para fecha: ${date}`);

  if (!date) {
    response.status(400).json({ error: "Missing date parameter" });
    return;
  }

  try {
    const db = admin.firestore();
    const cacheRef = db.collection("mp_cache").doc(`bids_${date}`);
    const docSnap = await cacheRef.get();
    
    const now = Date.now();
    const TTL_MS = 10 * 60 * 1000;

    if (docSnap.exists) {
      const data = docSnap.data();
      const expiresAt = data?.expiresAt;

      if (expiresAt && expiresAt.toMillis() > now) {
        console.log(`>>> [SERVER] Cache HIT para ${date}.`);
        response.json({
          fromCache: true,
          data: data?.data || []
        });
        return;
      }
    }

    const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    
    let bidsList: any[] = [];
    let apiSuccess = false;
    let attempts = 0;
    const maxAttempts = 5; // Aumentado para mayor robustez

    while (attempts < maxAttempts && !apiSuccess) {
      attempts++;
      console.log(`>>> [SERVER] Intento ${attempts} para fecha ${date}...`);
      
      const apiResponse = await fetch(apiUrl);
      const apiData = (await apiResponse.json()) as any;

      if (apiResponse.ok && apiData.Listado) {
        bidsList = apiData.Listado;
        apiSuccess = true;
        console.log(`>>> [SERVER] Éxito. Bids encontrados: ${bidsList.length}`);
      } else if (apiData.Codigo === 10500) {
        console.warn(`>>> [SERVER] Error 10500 (Simultaneidad). Intento ${attempts}.`);
        // Espera más larga y aleatoria para romper el ciclo de simultaneidad
        await sleep(3000 * attempts + Math.random() * 2000);
      } else {
        console.error(`>>> [SERVER] API Error ${apiResponse.status}:`, apiData);
        // Si no es simultaneidad, fallamos rápido
        throw new Error(apiData.Mensaje || `Error ${apiResponse.status}`);
      }
    }

    if (!apiSuccess) {
      throw new Error("La API de Mercado Público está saturada (Error 10500).");
    }

    const newExpiresAt = admin.firestore.Timestamp.fromMillis(now + TTL_MS);
    await cacheRef.set({
      data: bidsList,
      expiresAt: newExpiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    response.json({
      fromCache: false,
      refreshed: true,
      data: bidsList
    });

  } catch (error: any) {
    console.error(">>> [SERVER] ERROR:", error.message);
    response.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
});