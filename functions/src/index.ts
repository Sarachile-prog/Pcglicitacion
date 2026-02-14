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

/**
 * Obtiene licitaciones reales de Mercado Público con lógica de caché.
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
}, async (request: any, response: any) => {
  const date = request.query.date; // Formato DDMMYYYY

  console.log(`>>> [SERVER] Solicitud para fecha: ${date}`);

  if (!date) {
    console.error(">>> [SERVER] Error: Falta parámetro date");
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
        console.log(`>>> [SERVER] Cache HIT para ${date}`);
        response.json({
          fromCache: true,
          data: data?.data || []
        });
        return;
      }
      console.log(`>>> [SERVER] Cache EXPIRED para ${date}`);
    } else {
      console.log(`>>> [SERVER] Cache MISS para ${date}`);
    }

    // --- INTEGRACIÓN CON API MERCADO PÚBLICO ---
    const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    
    console.log(`>>> [SERVER] Consultando API Oficial: ${apiUrl.replace(TICKET, '***')}`);
    
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`>>> [SERVER] Error API Mercado Público. Status: ${apiResponse.status}. Body: ${errorText}`);
      throw new Error(`API responded with status: ${apiResponse.status}`);
    }

    const apiData = (await apiResponse.json()) as any;
    const bidsList = apiData.Listado || [];

    console.log(`>>> [SERVER] API respondió con ${bidsList.length} licitaciones.`);

    // Guardamos en caché
    const newExpiresAt = admin.firestore.Timestamp.fromMillis(now + TTL_MS);
    
    await cacheRef.set({
      data: bidsList,
      expiresAt: newExpiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`>>> [SERVER] Firestore actualizado para ${date}`);

    response.json({
      fromCache: false,
      refreshed: true,
      data: bidsList
    });

  } catch (error: any) {
    console.error(">>> [SERVER] ERROR FATAL:", error);
    response.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
});
