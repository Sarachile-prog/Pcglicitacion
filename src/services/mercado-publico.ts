'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público.
 * Llama a la Cloud Function Gen2 desplegada para obtener datos reales.
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
 * Obtiene licitaciones llamando a la Cloud Function Gen2.
 * Nota: Se utiliza la URL específica de Cloud Run detectada en los logs.
 */
export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  // URL detectada en los logs del usuario para la función Gen2
  const functionUrl = `https://getbidsbydate-uusj753vka-uc.a.run.app?date=${date}`;

  console.log(`[Client Service] Llamando a Cloud Function: ${functionUrl}`);

  try {
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Client Service] Error status: ${response.status}. Body: ${errorText}`);
      return [];
    }

    const result = await response.json();
    console.log(`[Client Service] Respuesta recibida. Licitaciones: ${result.data?.length || 0}`);
    return result.data || [];
  } catch (error: any) {
    console.error(`[Client Service] Error fatal en fetch: ${error.message}`);
    return [];
  }
}

export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  return null;
}
