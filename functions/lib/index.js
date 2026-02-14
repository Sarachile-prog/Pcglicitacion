"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBidsByDate = exports.healthCheck = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
exports.healthCheck = (0, https_1.onRequest)({
    cors: true,
    region: "us-central1"
}, (request, response) => {
    response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "Licitaciones Globales - Backend"
    });
});
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.getBidsByDate = (0, https_1.onRequest)({
    cors: true,
    region: "us-central1",
    invoker: "public"
}, async (request, response) => {
    const date = request.query.date;
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
            console.log(`>>> [SERVER] Cache EXPIRED para ${date}. Refrescando...`);
        }
        const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';
        const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
        let bidsList = [];
        let apiSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts && !apiSuccess) {
            attempts++;
            console.log(`>>> [SERVER] Intento ${attempts} para fecha ${date}...`);
            const apiResponse = await fetch(apiUrl);
            const apiData = (await apiResponse.json());
            if (apiResponse.ok) {
                bidsList = apiData.Listado || [];
                apiSuccess = true;
                console.log(`>>> [SERVER] Éxito en intento ${attempts}. Bids encontrados: ${bidsList.length}`);
            }
            else if (apiData.Codigo === 10500) {
                console.warn(`>>> [SERVER] Error 10500 (Simultaneidad). Esperando reintento...`);
                await sleep(2000 * attempts);
            }
            else {
                console.error(`>>> [SERVER] API Error ${apiResponse.status}:`, apiData);
                throw new Error(`API Error ${apiResponse.status}: ${JSON.stringify(apiData)}`);
            }
        }
        if (!apiSuccess) {
            throw new Error("Máximo de reintentos alcanzado para la API de Mercado Público (Error 10500).");
        }
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
    }
    catch (error) {
        console.error(">>> [SERVER] ERROR FATAL:", error);
        response.status(500).json({
            error: "Internal Server Error",
            message: error.message
        });
    }
});
//# sourceMappingURL=index.js.map