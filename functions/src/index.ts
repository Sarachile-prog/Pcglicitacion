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
 * Función para obtener licitaciones por fecha.
 * Valida la existencia del parámetro 'date' e intenta leer un documento de prueba en Firestore.
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
    // Referencia al documento de prueba solicitado: test_<date>
    const docRef = db.collection("mp_cache").doc(`test_${date}`);
    const docSnap = await docRef.get();

    response.json({
      fromCache: docSnap.exists
    });
  } catch (error: any) {
    response.status(500).json({
      error: "Firestore operation failed",
      message: error.message
    });
  }
});
