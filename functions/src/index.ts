
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

/**
 * SERVICIOS CORE - PCG LICITACIÓN 2026
 * Motor de sincronización oficial con API Mercado Público.
 * Versión: 6.1.0 - Blindaje total contra sobre-escritura y limpieza agresiva de IDs.
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

/**
 * INGESTA DIARIA (Sincronización por Fecha)
 * Se ha modificado para NO enviar el campo 'type' y evitar borrar categorizaciones históricas.
 */
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
  
  for (let i = 0; i < bidsList.length; i += 450) {
    const batch = db.batch();
    const chunk = bidsList.slice(i, i + 450);
    const nowServer = admin.firestore.FieldValue.serverTimestamp();

    chunk.forEach((bid: any) => {
      if (!bid.CodigoExterno) return;
      const bidRef = db.collection("bids").doc(bid.CodigoExterno);
      
      // BLINDAJE DE TIPO: No enviamos 'type' en la ingesta diaria.
      // Esto evita que si un proceso es 'Convenio Marco' (vía OCDS), 
      // la ingesta diaria lo degrade a 'Licitación' por omisión.
      const payload: any = {
        id: bid.CodigoExterno,
        title: bid.Nombre || "Sin título",
        status: bid.Estado || "No definido",
        scrapedAt: nowServer,
        sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bid.CodigoExterno}`
      };

      batch.set(bidRef, payload, { merge: true });
    });
    await batch.commit();
  }

  await cacheRef.set({ lastSync: admin.firestore.FieldValue.serverTimestamp(), count: bidsList.length, status: 'success' });

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

/**
 * INGESTA HISTÓRICA OCDS
 * Se ha mejorado la limpieza de IDs y el bucle de páginas para asegurar volumen real.
 */
export const syncOcdsHistorical = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
  timeoutSeconds: 300,
  memory: "1GiB"
}, async (request: any, response: any) => {
  const { year, month, type, countOnly } = request.query;
  if (!year || !month || !type) return response.status(400).json({ error: "Faltan parámetros" });

  const db = admin.firestore();
  const endpointBase = type === 'Licitacion' ? 'listaOCDSAgnoMes' : 
                       type === 'TratoDirecto' ? 'listaOCDSAgnoMesTratoDirecto' : 'listaOCDSAgnoMesConvenio';
  
  const typeLabel = type === 'Convenio' ? 'Convenio Marco' : 
                    type === 'TratoDirecto' ? 'Trato Directo' : 'Licitación';

  try {
    if (countOnly === 'true') {
      const checkUrl = `https://api.mercadopublico.cl/APISOCDS/OCDS/${endpointBase}/${year}/${month}/0/10`;
      const checkRes = await fetch(checkUrl);
      const checkData = await checkRes.json() as any;
      const realTotal = checkData.total || (checkData.pagination && checkData.pagination.total) || (checkData.data ? checkData.data.length : 0);
      return response.json({ 
        success: true, 
        count: realTotal, 
        message: `Hay ${realTotal.toLocaleString()} procesos en el mercado.` 
      });
    }

    let totalIngested = 0;
    const pagesToFetch = 10; // Aumentado a 10,000 registros por pasada
    const pageSize = 1000;

    for (let page = 0; page < pagesToFetch; page++) {
      const offset = page * pageSize;
      const url = `https://api.mercadopublico.cl/APISOCDS/OCDS/${endpointBase}/${year}/${month}/${offset}/${pageSize}`;
      
      const res = await fetch(url);
      if (!res.ok) break;

      const data = await res.json() as any;
      const items = data.data || data.Listado || [];
      if (items.length === 0) break;

      for (let i = 0; i < items.length; i += 450) {
        const batch = db.batch();
        const chunk = items.slice(i, i + 450);
        
        chunk.forEach((item: any) => {
          const release = item.releases?.[0];
          if (!release || !release.tender) return;
          
          let bidId = release.tender.id;
          // LIMPIEZA DE ID AGRESIVA: ocds-70d2nz-XXXX-YY-ZZ -> XXXX-YY-ZZ
          if (bidId.startsWith('ocds-')) {
            const parts = bidId.split('-');
            if (parts.length > 2) {
              bidId = parts.slice(2).join('-');
            }
          }

          const bidRef = db.collection("bids").doc(bidId);
          
          batch.set(bidRef, {
            id: bidId,
            title: (release.tender.title || "Proceso OCDS").trim(),
            entity: release.buyer?.name || release.tender.procuringEntity?.name || "Institución vía OCDS",
            status: release.tender.status || "Desconocido",
            type: typeLabel, 
            amount: release.tender.value?.amount || 0,
            currency: release.tender.value?.currency || 'CLP',
            scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
            isOcds: true,
            sourceUrl: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bidId}`
          }, { merge: true });
        });
        await batch.commit();
      }
      totalIngested += items.length;
      if (items.length < pageSize) break; 
    }

    response.json({ success: true, count: totalIngested, message: `Éxito: Se han procesado ${totalIngested.toLocaleString()} registros como '${typeLabel}'.` });

  } catch (error: any) {
    console.error(`>>> [OCDS_CRASH]: ${error.message}`);
    response.json({ success: false, message: `Fallo Crítico: ${error.message}` });
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
      const bidRef = admin.firestore().collection("bids").doc(code);
      const currentDoc = await bidRef.get();
      const currentData = currentDoc.data();

      const orgName = detail.Comprador?.NombreOrganismo || 
                      detail.NombreInstitucion || 
                      detail.OrganismoComprador?.Nombre ||
                      detail.Responsable?.NombreInstitucion ||
                      detail.Comprador?.NombreUnidad ||
                      "Institución no especificada";

      let typeLabel = currentData?.type || "Licitación";
      
      const typeCode = detail.CodigoTipo;
      if (typeCode === 3) typeLabel = "Convenio Marco";
      else if (typeCode === 2) typeLabel = "Trato Directo";
      else if (currentData?.type === "Convenio Marco" || currentData?.type === "Trato Directo") {
        typeLabel = currentData.type;
      } else {
        typeLabel = "Licitación";
      }

      await bidRef.update({
        entity: orgName,
        type: typeLabel,
        description: detail.Descripcion || "Sin descripción adicional.",
        items: detail.Items?.Listado || [],
        amount: detail.MontoEstimado || detail.MontoTotal || 0,
        currency: detail.Moneda || 'CLP',
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
  res.json({ status: "ok", version: "6.1.0-FIXED-IDs-LABELS", timestamp: new Date().toISOString() });
});
