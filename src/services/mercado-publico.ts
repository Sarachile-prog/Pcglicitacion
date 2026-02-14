'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público (ChileCompra).
 * Sincronizado con la lógica de Cloud Functions para manejo de Cache y TTL.
 */

import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface MercadoPublicoItem {
  CodigoProducto: number;
  CodigoCategoria: number;
  Categoria: string;
  NombreProducto: string;
  Descripcion: string;
  UnidadMedida: string;
  Cantidad: number;
}

export interface MercadoPublicoBid {
  CodigoExterno: string;
  Nombre: string;
  CodigoEstado: number;
  Estado: string;
  FechaCierre: string;
  FechaPublicacion: string;
  Descripcion?: string;
  MontoEstimado?: number;
  Moneda?: string;
  Organismo: {
    CodigoOrganismo: string;
    NombreOrganismo: string;
    RutUnidad: string;
  };
  Items?: {
    Listado: MercadoPublicoItem[];
  };
}

const API_BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';
const TICKET = process.env.MERCADO_PUBLICO_TICKET;

/**
 * Obtiene licitaciones filtradas por fecha.
 * Implementa la misma lógica de TTL (10 min) que la Cloud Function.
 */
export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  const { firestore } = initializeFirebase();
  const cacheId = `bids_${date}`;
  const TTL_MS = 10 * 60 * 1000;

  try {
    const docRef = doc(firestore, 'mp_cache', cacheId);
    const docSnap = await getDoc(docRef);
    const now = Date.now();

    if (docSnap.exists()) {
      const cache = docSnap.data();
      const expiresAt = (cache.expiresAt as Timestamp)?.toMillis() || 0;
      
      // Si el cache aún es válido
      if (expiresAt > now) {
        console.log(`[Service] Cache hit para ${date}`);
        return cache.data || [];
      }
    }

    // Si no hay cache o expiró, inicializamos (aquí se integrará la API real)
    console.log(`[Service] Cache miss/expired para ${date}. Refrescando...`);
    
    // Por ahora, simulamos el refresco como en la Cloud Function
    const newExpiresAt = Timestamp.fromMillis(now + TTL_MS);
    await setDoc(docRef, {
      data: [], // Aquí irían los resultados de la API
      expiresAt: newExpiresAt,
      updatedAt: serverTimestamp()
    });

    return [];
  } catch (error: any) {
    console.error(`[Service] Error en getBidsByDate: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene el detalle de una licitación específica.
 */
export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  if (!codigo) return null;
  const { firestore } = initializeFirebase();
  const cacheId = `bid_${codigo}`;
  
  try {
    const docRef = doc(firestore, 'mp_cache', cacheId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().data;
    }

    // Si no hay cache, por ahora retornamos null hasta integrar fetch real
    return null;
  } catch (error: any) {
    console.error(`[Service] Error en getBidDetail: ${error.message}`);
    return null;
  }
}
