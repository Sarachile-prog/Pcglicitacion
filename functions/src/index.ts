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
  region: "us-central1"
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
    const TTL_MS = 10 * 60 * 1000; // 10 minutos de caché

    if (docSnap.exists) {
      const data = docSnap.data();
      const expiresAt = data?.expiresAt;

      if (expiresAt && expiresAt.toMillis() > now) {
        response.json({
          fromCache: true,
          data: data?.data || []
        });
        return;
      }
    }

    // --- INTEGRACIÓN CON API MERCADO PÚBLICO ---
    // Usamos un ticket de prueba por defecto. Lo ideal es configurarlo en variables de entorno.
    const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
      throw new Error(`API responded with status: ${apiResponse.status}`);
    }

    const apiData = await apiResponse.json();
    const bidsList = apiData.Listado || [];

    // Guardamos en caché para los próximos 10 minutos
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
    console.error("Error en getBidsByDate:", error);
    response.status(500).json({
      error: "External API or Firestore error",
      message: error.message
    });
  }
});
