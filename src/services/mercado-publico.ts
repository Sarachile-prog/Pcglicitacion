'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público.
 * Llama a la Cloud Function desplegada para obtener datos reales y gestionar el caché.
 */

import { firebaseConfig } from '@/firebase/config';

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
 * Obtiene licitaciones llamando a la Cloud Function de Firebase.
 * La función se encarga de la lógica de caché en Firestore y la consulta a la API oficial.
 */
export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  const projectId = firebaseConfig.projectId;
  const region = 'us-central1';
  
  // URL de la Cloud Function (v2 utiliza el formato de Cloud Run o el mapeo de Firebase)
  // Intentamos con el formato estándar de Firebase Functions
  const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/getBidsByDate?date=${date}`;

  try {
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 } // Cache opcional a nivel de Next.js
    });

    if (!response.ok) {
      console.warn(`[Service] Error llamando a la función: ${response.status}`);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error(`[Service] Error en fetch: ${error.message}`);
    return [];
  }
}

export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  // Por ahora devolvemos null, el detalle se puede obtener del listado cargado
  return null;
}
