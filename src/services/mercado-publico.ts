
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

// URLs directas de Cloud Run para Gen 2 Functions (obtenidas del log de despliegue del usuario)
const BASE_URL = 'https://us-central1-studio-4126028826-31b2f.cloudfunctions.net';

/**
 * Llama a la función de ingesta masiva.
 */
export async function getBidsByDate(date: string): Promise<{ success: boolean; count: number; message: string }> {
  const url = `${BASE_URL}/getBidsByDate?date=${date}`;

  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || result.message || "Error de conexión con el servidor");
    }
    
    if (result.success === false) {
      throw new Error(result.message || "Error en la sincronización");
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
  const url = `${BASE_URL}/getBidDetail?code=${code}`;

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
