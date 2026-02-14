'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público a través de Cloud Functions.
 */

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

const BASE_URL = 'https://us-central1-studio-4126028826-31b2f.cloudfunctions.net';

export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  const functionUrl = `${BASE_URL}/getBidsByDate?date=${date}`;

  try {
    const response = await fetch(functionUrl, { cache: 'no-store' });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error(`[Service] Error fetching list: ${error.message}`);
    throw error;
  }
}

export async function getBidDetail(code: string): Promise<MercadoPublicoBid | null> {
  const functionUrl = `${BASE_URL}/getBidDetail?code=${code}`;

  try {
    const response = await fetch(functionUrl, { cache: 'no-store' });
    if (!response.ok) return null;
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error(`[Service] Error fetching detail: ${error.message}`);
    return null;
  }
}
