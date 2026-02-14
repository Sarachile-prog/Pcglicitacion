
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Inicialización de Admin SDK
// Esto permite acceso total a Firebase sin depender de Security Rules
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Función de prueba Gen2 para verificar que el entorno de servidor
 * está correctamente configurado.
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
