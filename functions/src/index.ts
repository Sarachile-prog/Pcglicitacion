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
 * Función auxiliar para esperar N milisegundos
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Obtiene licitaciones reales de Mercado Público con lógica de reintentos para error 10500.
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
}, async (request: any, response: any) => {
  const date = request.query.date; // Formato DDMMYYYY

  console.log(`>>> [SERVER] Solicitud recibida para fecha: ${date}`);

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
    const TTL_MS = 10 * 60 * 1000; // 10 minutos de cache

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
      console.log(`>>> [SERVER] Cache EXPIRED para ${date}. Refrescando...`);
    }

    // --- INTEGRACIÓN CON API MERCADO PÚBLICO CON REINTENTOS ---
    const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    
    let bidsList: any[] = [];
    let apiSuccess = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !apiSuccess) {
      attempts++;
      console.log(`>>> [SERVER] Intento ${attempts} para fecha ${date}...`);
      
      const apiResponse = await fetch(apiUrl);
      const apiData = (await apiResponse.json()) as any;

      if (apiResponse.ok) {
        bidsList = apiData.Listado || [];
        apiSuccess = true;
        console.log(`>>> [SERVER] Éxito en intento ${attempts}. Bids encontrados: ${bidsList.length}`);
      } else if (apiData.Codigo === 10500) {
        console.warn(`>>> [SERVER] Error 10500 (Simultaneidad). Esperando reintento...`);
        // Espera incremental: 2s, 4s, 6s...
        await sleep(2000 * attempts);
      } else {
        console.error(`>>> [SERVER] API Error ${apiResponse.status}:`, apiData);
        throw new Error(`API Error ${apiResponse.status}: ${JSON.stringify(apiData)}`);
      }
    }

    if (!apiSuccess) {
      throw new Error("Máximo de reintentos alcanzado para la API de Mercado Público (Error 10500).");
    }

    // Guardar en caché incluso si está vacío (para evitar llamadas infinitas a la API hoy)
    const newExpiresAt = admin.firestore.Timestamp.fromMillis(now + TTL_MS);
    await cacheRef.set({
      data: bidsList,
      expiresAt: newExpiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`>>> [SERVER] Firestore actualizado para ${date}.`);

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