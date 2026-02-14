
'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público a través de Cloud Run / Gen 2 Functions.
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

// URLs directas de Cloud Run para Gen 2 Functions (obtenidas de los logs del usuario)
const SYNC_URL = 'https://getbidsbydate-uusj753vka-uc.a.run.app';
const DETAIL_URL = 'https://getbiddetail-uusj753vka-uc.a.run.app';

/**
 * Llama a la función de ingesta masiva.
 */
export async function getBidsByDate(date: string): Promise<{ success: boolean; count: number; message: string }> {
  const url = `${SYNC_URL}?date=${date}`;

  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result.error || "Error de conexión con la API");
    }
    
    return result;
  } catch (error: any) {
    console.error(`[Service] Error en sincronización: ${error.message}`);
    throw error;
  }
}

/**
 * Obtiene el detalle profundo y actualiza Firestore.
 */
export async function getBidDetail(code: string): Promise<MercadoPublicoBid | null> {
  const url = `${DETAIL_URL}?code=${code}`;

  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) return null;
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error(`[Service] Error en detalle: ${error.message}`);
    return null;
  }
}
