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
exports.healthCheck = exports.getBidDetail = exports.getBidsByDate = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const DEFAULT_TICKET = 'F80640D6-AB32-4757-827D-02589D211564';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function getActiveTicket() {
    try {
        const configDoc = await admin.firestore().collection("settings").doc("mercado_publico").get();
        if (configDoc.exists && configDoc.data()?.ticket) {
            console.log(">>> [SERVER] Usando ticket personalizado desde Firestore.");
            return { ticket: configDoc.data()?.ticket, source: 'custom' };
        }
    }
    catch (e) {
        console.error(">>> [SERVER] Error leyendo ticket de Firestore.");
    }
    console.log(">>> [SERVER] Usando ticket predeterminado (posiblemente inválido).");
    return { ticket: DEFAULT_TICKET, source: 'default' };
}
exports.getBidsByDate = (0, https_1.onRequest)({
    cors: true,
    region: "us-central1",
    invoker: "public",
    maxInstances: 10,
    timeoutSeconds: 120
}, async (request, response) => {
    const date = request.query.date;
    if (!date)
        return response.status(400).json({ error: "Missing date" });
    console.log(`>>> [SERVER] Solicitud recibida para fecha: ${date}`);
    try {
        const db = admin.firestore();
        const { ticket: TICKET, source } = await getActiveTicket();
        const cacheRef = db.collection("mp_cache").doc(`sync_${date}`);
        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists && cacheSnap.data()?.status === 'success') {
            const lastSync = cacheSnap.data()?.lastSync?.toDate();
            const now = new Date();
            if (lastSync && (now.getTime() - lastSync.getTime() < 3600000)) {
                console.log(`>>> [SERVER] Cache HIT para ${date}. Retornando datos guardados.`);
                return response.json({ success: true, count: cacheSnap.data()?.count, message: "Datos desde cache." });
            }
            console.log(`>>> [SERVER] Cache EXPIRED para ${date}. Refrescando...`);
        }
        const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
        console.log(`>>> [SERVER] Llamando a API Oficial: ${apiUrl.replace(TICKET, '***')}`);
        let apiResponse = await fetch(apiUrl);
        if (!apiResponse.ok) {
            throw new Error(`API responded with status: ${apiResponse.status}`);
        }
        let apiData = (await apiResponse.json());
        let attempts = 0;
        while (apiData.Codigo === 10500 && attempts < 5) {
            attempts++;
            const waitTime = 3000 * attempts;
            console.warn(`>>> [SERVER] API Saturada (10500). Reintento ${attempts} en ${waitTime}ms...`);
            await sleep(waitTime);
            apiResponse = await fetch(apiUrl);
            apiData = (await apiResponse.json());
        }
        if (apiData.Codigo) {
            console.error(`>>> [SERVER] Error API Mercado Público. Status: ${apiResponse.status}. Body: ${JSON.stringify(apiData)}`);
            return response.status(200).json({
                success: false,
                message: apiData.Mensaje || "Error en la API oficial",
                code: apiData.Codigo
            });
        }
        const bidsList = apiData.Listado || [];
        console.log(`>>> [SERVER] API respondió exitosamente con ${bidsList.length} licitaciones.`);
        const batch = db.batch();
        const nowServer = admin.firestore.FieldValue.serverTimestamp();
        bidsList.forEach((bid) => {
            if (!bid.CodigoExterno)
                return;
            const bidRef = db.collection("bids").doc(bid.CodigoExterno);
            batch.set(bidRef, {
                id: bid.CodigoExterno,
                title: bid.Nombre || "Sin título",
                entity: bid.Organismo?.NombreOrganismo || "Institución no especificada",
                status: bid.Estado || "No definido",
                deadlineDate: bid.FechaCierre || null,
                amount: bid.MontoEstimado || 0,
                currency: bid.Moneda || 'CLP',
                scrapedAt: nowServer,
                sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bid.CodigoExterno}`
            }, { merge: true });
        });
        batch.set(cacheRef, { lastSync: nowServer, count: bidsList.length, status: 'success' });
        await batch.commit();
        console.log(`>>> [SERVER] Firestore actualizado para ${date}.`);
        response.json({ success: true, count: bidsList.length, message: "Sincronización exitosa." });
    }
    catch (error) {
        console.error(`>>> [SERVER] ERROR FATAL: ${error.stack || error.message}`);
        response.status(500).json({ success: false, error: error.message });
    }
});
exports.getBidDetail = (0, https_1.onRequest)({
    cors: true,
    region: "us-central1",
    invoker: "public"
}, async (request, response) => {
    const code = request.query.code;
    if (!code)
        return response.status(400).json({ error: "Missing code" });
    try {
        const { ticket: TICKET } = await getActiveTicket();
        const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${code}&ticket=${TICKET}`;
        const apiResponse = await fetch(apiUrl);
        const apiData = (await apiResponse.json());
        if (apiData.Listado && apiData.Listado.length > 0) {
            const detail = apiData.Listado[0];
            await admin.firestore().collection("bids").doc(code).update({
                description: detail.Descripcion || "Sin descripción adicional.",
                items: detail.Items?.Listado || [],
                fullDetailAt: admin.firestore.FieldValue.serverTimestamp()
            });
            response.json({ success: true, data: detail });
        }
        else {
            response.status(404).json({ error: "Not found" });
        }
    }
    catch (error) {
        response.status(500).json({ error: error.message });
    }
});
exports.healthCheck = (0, https_1.onRequest)({ cors: true }, (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
//# sourceMappingURL=index.js.map