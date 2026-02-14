'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público.
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

export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  const functionUrl = `https://getbidsbydate-uusj753vka-uc.a.run.app?date=${date}`;

  try {
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error(`[Service] Error: ${error.message}`);
    throw error; // Lanzamos el error para que la UI lo maneje
  }
}

export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  return null;
}