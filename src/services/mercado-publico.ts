'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público a través de Cloud Functions Gen 2.
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

// URL base de las Cloud Functions Gen 2 obtenidas de los logs
const BASE_URL = 'https://us-central1-studio-4126028826-31b2f.cloudfunctions.net';

/**
 * Llama a la función de ingesta masiva.
 * No devuelve la lista completa (para ahorrar ancho de banda), 
 * ya que la UI lee de Firestore.
 */
export async function getBidsByDate(date: string): Promise<{ success: boolean; count: number; message: string }> {
  const functionUrl = `${BASE_URL}/getBidsByDate?date=${date}`;

  try {
    const response = await fetch(functionUrl, { 
      cache: 'no-store'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result.error || "Servidor saturado");
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
  const functionUrl = `${BASE_URL}/getBidDetail?code=${code}`;

  try {
    const response = await fetch(functionUrl, { 
      cache: 'no-store'
    });
    
    if (!response.ok) return null;
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error(`[Service] Error en detalle: ${error.message}`);
    return null;
  }
}
