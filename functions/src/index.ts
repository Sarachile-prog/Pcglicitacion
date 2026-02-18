
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

/**
 * EMERGENCY RE-DEPLOY POKE: 18-02-2026 16:20
 * Resolviendo bloqueo de publicación y errores de sesión 403.
 * Forzando limpieza de caché de compilación en GCP.
 */

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const DEFAULT_TICKET = 'F80640D6-AB32-4757-827D-02589D211564';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getActiveTicket(): Promise<{ ticket: string, source: string }> {
  try {
    const configDoc = await admin.firestore().collection("settings").doc("mercado_publico").get();
    if (configDoc.exists && configDoc.data()?.ticket) {
      return { ticket: configDoc.data()?.ticket, source: 'custom' };
    }
  } catch (e) {
    console.error(">>> [SERVER] Error leyendo ticket personalizado.");
  }
  return { ticket: DEFAULT_TICKET, source: 'default' };
}

async function performSync(date: string) {
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

  let apiData = (await apiResponse.json()) as any;

  let attempts = 0;
  while (apiData.Codigo === 10500 && attempts < 5) {
    attempts++;
    const waitTime = 2000 * attempts;
    await sleep(waitTime);
    apiResponse = await fetch(apiUrl);
    apiData = (await apiResponse.json()) as any;
  }

  if (apiData.Codigo) {
    throw new Error(apiData.Mensaje || "Error desconocido en la API de Mercado Público");
  }

  const bidsList = apiData.Listado || [];
  const batch = db.batch();
  const nowServer = admin.firestore.FieldValue.serverTimestamp();

  bidsList.forEach((bid: any) => {
    if (!bid.CodigoExterno) return;
    
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

export const getBidsByDate = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  maxInstances: 10,
  timeoutSeconds: 120
}, async (request: any, response: any) => {
  const date = request.query.date;
  if (!date) return response.status(400).json({ error: "Falta el parámetro 'date'" });
  try {
    const result = await performSync(date);
    response.json(result);
  } catch (error: any) {
    response.status(500).json({ success: false, error: error.message });
  }
});

export const syncOcdsHistorical = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  timeoutSeconds: 300,
  memory: "512MiB"
}, async (request: any, response: any) => {
  const { year, month, type } = request.query;
  if (!year || !month || !type) return response.status(400).json({ error: "Faltan parámetros" });

  const now = new Date();
  const reqDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  
  if (reqDate > now) {
    return response.json({ success: false, message: "No se puede sincronizar el futuro. Selecciona un mes pasado (Contexto: Feb 2026)." });
  }

  const db = admin.firestore();
  const endpointBase = type === 'Licitacion' ? 'listaOCDSAgnoMes' : 
                       type === 'TratoDirecto' ? 'listaOCDSAgnoMesTratoDirecto' : 'listaOCDSAgnoMesConvenio';
  
  try {
    const initialUrl = `https://api.mercadopublico.cl/APISOCDS/OCDS/${endpointBase}/${year}/${month}/0/999`;
    console.log(`>>> [OCDS] Consultando: ${initialUrl}`);
    
    const res = await fetch(initialUrl);
    
    if (!res.ok) {
      return response.json({ success: false, message: `Portal Mercado Público no responde (Error ${res.status}). Reintenta en 1 minuto.` });
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return response.json({ success: false, message: "La API oficial está saturada. Por favor espera un momento y vuelve a intentar." });
    }

    let data;
    try {
      data = await res.json() as any;
    } catch (e) {
      return response.json({ success: false, message: "Error al interpretar datos de la API oficial." });
    }

    if (!data || !data.data || !Array.isArray(data.data)) {
      return response.json({ success: false, message: "No se encontraron registros para el periodo " + month + "/" + year });
    }

    const totalRecords = data.total || data.data.length;
    let processedCount = 0;
    const nowServer = admin.firestore.FieldValue.serverTimestamp();

    const processBatch = async (items: any[]) => {
      const batch = db.batch();
      items.forEach((item: any) => {
        const release = item.releases?.[0];
        if (!release || !release.tender) return;

        const bidId = release.tender.id;
        const bidRef = db.collection("bids").doc(bidId);
        
        batch.set(bidRef, {
          id: bidId,
          title: release.tender.title || "Proceso OCDS",
          entity: release.buyer?.name || "Institución vía OCDS",
          status: release.tender.status || "Desconocido",
          amount: release.tender.value?.amount || 0,
          currency: release.tender.value?.currency || 'CLP',
          scrapedAt: nowServer,
          sourceType: type,
          isOcds: true,
          sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bidId}`
        }, { merge: true });
      });
      await batch.commit();
    };

    await processBatch(data.data);
    processedCount += data.data.length;

    const limitRecords = Math.min(totalRecords, 2000);
    
    for (let start = 1000; start < limitRecords; start += 1000) {
      const nextUrl = `https://api.mercadopublico.cl/APISOCDS/OCDS/${endpointBase}/${year}/${month}/${start}/${start + 999}`;
      try {
        const nextRes = await fetch(nextUrl);
        if (nextRes.ok) {
          const nextData = await nextRes.json() as any;
          if (nextData && nextData.data) {
            await processBatch(nextData.data);
            processedCount += nextData.data.length;
          }
        }
      } catch (e) {
        console.warn(`>>> [OCDS] Fallo lote ${start}:`, e);
      }
      await sleep(1500);
    }

    response.json({ 
      success: true, 
      count: processedCount, 
      message: `Carga finalizada: ${processedCount} registros sincronizados exitosamente.` 
    });

  } catch (error: any) {
    console.error(">>> [OCDS_CRASH]:", error.message);
    response.json({ success: false, message: "Error técnico del servidor: " + error.message });
  }
});

export const dailyBidSync = onSchedule({
  schedule: "0 8 * * 1-5",
  timeZone: "America/Santiago",
  region: "us-central1"
}, async (event) => {
  const now = new Date();
  const formattedDate = `${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}`;
  try {
    await performSync(formattedDate);
  } catch (error: any) {
    console.error(`>>> [CRON] Error: ${error.message}`);
  }
});

export const getBidDetail = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public"
}, async (request: any, response: any) => {
  const code = request.query.code;
  if (!code) return response.status(400).json({ error: "Falta el código" });
  try {
    const { ticket: TICKET } = await getActiveTicket();
    const apiUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${code}&ticket=${TICKET}`;
    const apiResponse = await fetch(apiUrl);
    const apiData = (await apiResponse.json()) as any;

    if (apiData.Listado && apiData.Listado.length > 0) {
      const detail = apiData.Listado[0];
      
      let entity = "Institución no especificada";
      if (detail.Comprador) {
        entity = detail.Comprador.NombreOrganismo || entity;
      }

      const deadlineDate = detail.Fechas?.FechaCierre || detail.FechaCierre || null;
      const publishedDate = detail.Fechas?.FechaPublicacion || detail.FechaPublicacion || null;

      await admin.firestore().collection("bids").doc(code).update({
        description: detail.Descripcion || "Sin descripción adicional.",
        items: detail.Items?.Listado || [],
        amount: detail.MontoEstimado || 0,
        currency: detail.Moneda || 'CLP',
        entity: entity,
        typeCode: detail.CodigoTipo || null,
        publishedDate: publishedDate,
        deadlineDate: deadlineDate,
        fullDetailAt: admin.firestore.FieldValue.serverTimestamp()
      });
      response.json({ success: true, data: detail });
    } else {
      response.status(404).json({ error: "No encontrado" });
    }
  } catch (error: any) {
    response.status(500).json({ error: error.message });
  }
});

export const healthCheck = onRequest({ cors: true }, (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
