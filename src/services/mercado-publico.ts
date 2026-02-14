'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público (ChileCompra).
 * Se ejecuta en el servidor para evitar problemas de CORS y proteger el ticket.
 * 
 * Implementa un mecanismo de Cache en Firestore que actúa como Rate Limit Guard
 * para prevenir bloqueos por exceso de cuota.
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

if (!TICKET) {
  throw new Error("Missing MERCADO_PUBLICO_TICKET environment variable");
}

/**
 * Obtiene licitaciones filtradas por fecha.
 * Implementa Cache de 10 minutos en Firestore.
 * @param date Formato DDMMAAAA
 */
export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  const { firestore } = initializeFirebase();
  const cacheId = `bids_${date}`;
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

  try {
    const docRef = doc(firestore, 'mp_cache', cacheId);
    
    // 1. Intentar obtener de Cache (Rate Limit Guard)
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cache = docSnap.data();
        const createdAt = (cache.createdAt as Timestamp)?.toDate()?.getTime() || 0;
        const now = Date.now();
        
        if (now - createdAt < CACHE_TTL_MS) {
          return cache.data;
        }
      }
    } catch (cacheError: any) {
      console.log(`[Cache Service] Error leyendo cache: ${cacheError.message}`);
    }

    // 2. Si no hay cache válido, llamar a la API
    const url = `${API_BASE_URL}?fecha=${date}&ticket=${TICKET}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }
    });
    
    if (!response.ok) {
      console.log(`[MercadoPublico Service] HTTP Error ${response.status} al consultar fecha: ${date}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.Mensaje) {
      const lowerMsg = data.Mensaje.toLowerCase();
      if (lowerMsg.includes('ticket') || lowerMsg.includes('invalido') || lowerMsg.includes('inválido')) {
        throw new Error("MercadoPublico API ticket inválido o bloqueado");
      }
      return [];
    }

    const results = data.Listado || [];

    // 3. Actualizar Cache (Non-blocking)
    if (results.length > 0) {
      setDoc(docRef, {
        data: results,
        createdAt: serverTimestamp()
      }).catch(e => console.log(`[Cache Service] Error actualizando cache: ${e.message}`));
    }

    return results;
  } catch (error: any) {
    console.log(`[MercadoPublico Service] Exception in getBidsByDate: ${error.message}`);
    return [];
  }
}

/**
 * Obtiene el detalle de una licitación específica.
 * Implementa Cache de 1 hora en Firestore.
 */
export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  if (!codigo) return null;
  const { firestore } = initializeFirebase();
  const cacheId = `bid_${codigo}`;
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
  
  try {
    const docRef = doc(firestore, 'mp_cache', cacheId);

    // 1. Intentar obtener de Cache
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cache = docSnap.data();
        const createdAt = (cache.createdAt as Timestamp)?.toDate()?.getTime() || 0;
        const now = Date.now();
        
        if (now - createdAt < CACHE_TTL_MS) {
          return cache.data;
        }
      }
    } catch (cacheError: any) {
      console.log(`[Cache Service] Error leyendo cache detalle: ${cacheError.message}`);
    }

    // 2. Llamada a la API
    const url = `${API_BASE_URL}?codigo=${codigo}&ticket=${TICKET}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      console.log(`[MercadoPublico Service] HTTP Error ${response.status} al consultar código: ${codigo}`);
      return null;
    }
    
    const data = await response.json();
    const result = data.Listado?.[0] || null;

    // 3. Actualizar Cache (Non-blocking)
    if (result) {
      setDoc(docRef, {
        data: result,
        createdAt: serverTimestamp()
      }).catch(e => console.log(`[Cache Service] Error actualizando cache detalle: ${e.message}`));
    }

    return result;
  } catch (error: any) {
    console.log(`[MercadoPublico Service] Exception in getBidDetail: ${error.message}`);
    return null;
  }
}
