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

  console.log(`[getBidsByDate] Solicitud recibida para fecha: ${date}`);

  if (!date) {
    console.warn("[getBidsByDate] Falta el parámetro 'date'");
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
        console.log(`[getBidsByDate] Sirviendo desde caché para ${date}`);
        response.json({
          fromCache: true,
          data: data?.data || []
        });
        return;
      }
      console.log(`[getBidsByDate] Caché expirado para ${date}, refrescando...`);
    }

    // --- INTEGRACIÓN CON API MERCADO PÚBLICO ---
    const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    
    console.log(`[getBidsByDate] Consultando API oficial: ${apiUrl.replace(TICKET, 'HIDDEN_TICKET')}`);
    
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
      console.error(`[getBidsByDate] Error en API oficial. Status: ${apiResponse.status}`);
      throw new Error(`API responded with status: ${apiResponse.status}`);
    }

    const apiData = (await apiResponse.json()) as any;
    const bidsList = apiData.Listado || [];

    console.log(`[getBidsByDate] API respondió con ${bidsList.length} licitaciones.`);

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
    console.error("[getBidsByDate] Error fatal:", error);
    response.status(500).json({
      error: "External API or Firestore error",
      message: error.message
    });
  }
});
