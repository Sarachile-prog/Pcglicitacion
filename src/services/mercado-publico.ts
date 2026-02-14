'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público.
 * Ahora devuelve los datos reales procesados por la Cloud Function o Firestore.
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

/**
 * Obtiene licitaciones filtradas por fecha.
 * Primero intenta leer el caché local en Firestore para ahorrar cuota de API.
 */
export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  const { firestore } = initializeFirebase();
  const cacheId = `bids_${date}`;

  try {
    const docRef = doc(firestore, 'mp_cache', cacheId);
    const docSnap = await getDoc(docRef);
    const now = Date.now();

    if (docSnap.exists()) {
      const cache = docSnap.data();
      const expiresAt = (cache.expiresAt as Timestamp)?.toMillis() || 0;
      
      if (expiresAt > now) {
        return cache.data || [];
      }
    }

    // Si no hay caché o expiró, la UI debería llamar a la Cloud Function
    // pero por ahora devolvemos lo que haya o vacío.
    // Una vez desplegada la función, ésta llenará el caché automáticamente.
    return docSnap.exists() ? docSnap.data()?.data || [] : [];
  } catch (error: any) {
    console.error(`[Service] Error: ${error.message}`);
    return [];
  }
}

export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  if (!codigo) return null;
  const { firestore } = initializeFirebase();
  const cacheId = `bid_${codigo}`;
  
  try {
    const docRef = doc(firestore, 'mp_cache', cacheId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data().data;
    return null;
  } catch (error) {
    return null;
  }
}
