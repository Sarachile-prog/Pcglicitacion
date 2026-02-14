import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Inicialización de Admin SDK
// Esto permite acceso total a Firebase sin depender de Security Rules
admin.initializeApp();

/**
 * Función de prueba Gen2 para verificar que el entorno de servidor
 * está correctamente configurado.
 */
export const healthCheck = onRequest({
  cors: true, // Habilitar CORS para llamadas desde el cliente si es necesario
  region: "us-central1" // Ajustar según preferencia
}, (request, response) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Licitaciones Globales - Backend Functions Gen2"
  });
});