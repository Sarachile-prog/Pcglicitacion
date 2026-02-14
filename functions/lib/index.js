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
exports.getBidsByDate = (0, https_1.onRequest)({
    cors: true,
    region: "us-central1"
}, async (request, response) => {
    const date = request.query.date;
    if (!date) {
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
                response.json({
                    fromCache: true,
                    data: data?.data || []
                });
                return;
            }
        }
        const TICKET = process.env.MERCADO_PUBLICO_TICKET || 'F80640D6-AB32-4757-827D-02589D211564';
        const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
        const apiResponse = await fetch(apiUrl);
        if (!apiResponse.ok) {
            throw new Error(`API responded with status: ${apiResponse.status}`);
        }
        const apiData = await apiResponse.json();
        const bidsList = apiData.Listado || [];
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
    }
    catch (error) {
        console.error("Error en getBidsByDate:", error);
        response.status(500).json({
            error: "External API or Firestore error",
            message: error.message
        });
    }
});
//# sourceMappingURL=index.js.map