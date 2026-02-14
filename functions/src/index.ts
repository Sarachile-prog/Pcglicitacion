import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Inicialización de Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Función de prueba para verificar el estado del servicio.
 */
export const healthCheck = onRequest({
  cors: true,
  region: "us-central1"
}, (request: any, response: any) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Licitaciones Globales - Backend Functions Gen2"
  });
});

/**
 * Función para obtener licitaciones por fecha con lógica de caché (TTL).
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1"
}, async (request: any, response: any) => {
  const date = request.query.date;

  if (!date) {
    response.status(400).json({
      error: "Missing date parameter"
    });
    return;
  }

  try {
    const db = admin.firestore();
    const cacheRef = db.collection("mp_cache").doc(`bids_${date}`);
    const docSnap = await cacheRef.get();
    
    const now = Date.now();
    const TTL_MS = 10 * 60 * 1000; // 10 minutos

    if (docSnap.exists) {
      const data = docSnap.data();
      const expiresAt = data?.expiresAt;

      // Si el documento tiene un campo expiresAt y aún no ha expirado
      if (expiresAt && expiresAt.toMillis() > now) {
        response.json({
          fromCache: true
        });
        return;
      }
    }

    // Si no existe o está expirado, creamos/actualizamos el caché
    const newExpiresAt = admin.firestore.Timestamp.fromMillis(now + TTL_MS);
    
    await cacheRef.set({
      data: [], // Aún no integramos Mercado Público
      expiresAt: newExpiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    response.json({
      fromCache: false,
      refreshed: true
    });

  } catch (error: any) {
    response.status(500).json({
      error: "Firestore operation failed",
      message: error.message
    });
  }
});
