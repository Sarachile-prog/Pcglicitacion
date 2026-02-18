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
exports.healthCheck = exports.getBidDetail = exports.dailyBidSync = exports.syncOcdsHistorical = exports.getBidsByDate = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
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
            return { ticket: configDoc.data()?.ticket, source: 'custom' };
        }
    }
    catch (e) {
        console.error(">>> [SERVER] Error leyendo ticket personalizado.");
    }
    return { ticket: DEFAULT_TICKET, source: 'default' };
}
async function performSync(date) {
    const db = admin.firestore();
    const { ticket: TICKET } = await getActiveTicket();
    const cacheRef = db.collection("mp_cache").doc(`sync_${date}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists && cacheSnap.data()?.status === 'success') {
        const lastSync = cacheSnap.data()?.lastSync?.toDate();
        const now = new Date();
        if (lastSync && (now.getTime() - lastSync.getTime() < 3600000)) {
            return { success: true, count: cacheSnap.data()?.count, message: "Datos obtenidos desde caché reciente." };
        }
    }
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${date}&ticket=${TICKET}`;
    let apiResponse = await fetch(apiUrl);
    if (!apiResponse.ok) {
        throw new Error(`La API respondió con error: ${apiResponse.status}`);
    }
    let apiData = (await apiResponse.json());
    let attempts = 0;
    while (apiData.Codigo === 10500 && attempts < 5) {
        attempts++;
        const waitTime = 2000 * attempts;
        await sleep(waitTime);
        apiResponse = await fetch(apiUrl);
        apiData = (await apiResponse.json());
    }
    if (apiData.Codigo) {
        throw new Error(apiData.Mensaje || "Error desconocido en la API de Mercado Público");
    }
    const bidsList = apiData.Listado || [];
    const batch = db.batch();
    const nowServer = admin.firestore.FieldValue.serverTimestamp();
    bidsList.forEach((bid) => {
        if (!bid.CodigoExterno)
            return;
        const bidRef = db.collection("bids").doc(bid.CodigoExterno);
        batch.set(bidRef, {
            id: bid.CodigoExterno,
            title: bid.Nombre || "Sin título",
            status: bid.Estado || "No definido",
            scrapedAt: nowServer,
            sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bid.CodigoExterno}`
        }, { merge: true });
    });
    batch.set(cacheRef, { lastSync: nowServer, count: bidsList.length, status: 'success' });
    await batch.commit();
    return { success: true, count: bidsList.length, message: "Sincronización exitosa." };
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
        return response.status(400).json({ error: "Falta el parámetro 'date'" });
    try {
        const result = await performSync(date);
        response.json(result);
    }
    catch (error) {
        response.status(500).json({ success: false, error: error.message });
    }
});
exports.syncOcdsHistorical = (0, https_1.onRequest)({
    cors: true,
    region: "us-central1",
    invoker: "public",
    timeoutSeconds: 300,
    memory: "1GiB"
}, async (request, response) => {
    const { year, month, type } = request.query;
    if (!year || !month || !type)
        return response.status(400).json({ error: "Faltan parámetros" });
    const db = admin.firestore();
    const endpointBase = type === 'Licitacion' ? 'listaOCDSAgnoMes' :
        type === 'TratoDirecto' ? 'listaOCDSAgnoMesTratoDirecto' : 'listaOCDSAgnoMesConvenio';
    try {
        const initialUrl = `https://api.mercadopublico.cl/APISOCDS/OCDS/${endpointBase}/${year}/${month}/0/999`;
        console.log(`>>> [SERVER] Iniciando succión OCDS: ${initialUrl}`);
        const res = await fetch(initialUrl);
        if (!res.ok)
            return response.status(200).json({ success: false, message: `Error Portal Mercado Público: ${res.status}. Es posible que los datos de ese mes no estén disponibles aún.` });
        let data = await res.json();
        if (!data || !data.data || data.data.length === 0)
            return response.json({ success: false, message: "No hay registros disponibles para el periodo seleccionado." });
        const processBatch = async (items) => {
            const batch = db.batch();
            items.forEach((item) => {
                const release = item.releases?.[0];
                if (!release || !release.tender)
                    return;
                const bidId = release.tender.id;
                const bidRef = db.collection("bids").doc(bidId);
                batch.set(bidRef, {
                    id: bidId,
                    title: release.tender.title || "Proceso OCDS",
                    entity: release.buyer?.name || "Institución vía OCDS",
                    status: release.tender.status || "Desconocido",
                    amount: release.tender.value?.amount || 0,
                    currency: release.tender.value?.currency || 'CLP',
                    scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
                    isOcds: true,
                    sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bidId}`
                }, { merge: true });
            });
            await batch.commit();
        };
        await processBatch(data.data);
        response.json({ success: true, count: data.data.length, message: `Se han succionado ${data.data.length} registros del periodo ${month}/${year}.` });
    }
    catch (error) {
        console.error(`>>> [OCDS_CRASH] Error Fatal: ${error.message}`);
        response.json({ success: false, message: `Fallo Crítico: ${error.message}` });
    }
});
exports.dailyBidSync = (0, scheduler_1.onSchedule)({
    schedule: "0 8 * * 1-5",
    timeZone: "America/Santiago",
    region: "us-central1"
}, async (event) => {
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}`;
    try {
        await performSync(formattedDate);
    }
    catch (error) {
        console.error(`>>> [CRON] Error: ${error.message}`);
    }
});
exports.getBidDetail = (0, https_1.onRequest)({
    cors: true,
    region: "us-central1",
    invoker: "public"
}, async (request, response) => {
    const code = request.query.code;
    if (!code)
        return response.status(400).json({ error: "Falta el código" });
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
                amount: detail.MontoEstimado || 0,
                currency: detail.Moneda || 'CLP',
                fullDetailAt: admin.firestore.FieldValue.serverTimestamp()
            });
            response.json({ success: true, data: detail });
        }
        else {
            response.status(404).json({ error: "No encontrado" });
        }
    }
    catch (error) {
        response.status(500).json({ error: error.message });
    }
});
exports.healthCheck = (0, https_1.onRequest)({ cors: true }, (req, res) => {
    res.json({ status: "ok", version: "2.5.0-RESET", timestamp: new Date().toISOString() });
});
//# sourceMappingURL=index.js.map