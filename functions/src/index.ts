
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
 * Valida la existencia del parámetro 'date' en la query.
 */
export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1"
}, (request: any, response: any) => {
  const date = request.query.date;

  if (!date) {
    response.status(400).json({
      error: "Missing date parameter"
    });
    return;
  }

  response.json({
    receivedDate: date
  });
});
