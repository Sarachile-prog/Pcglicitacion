
'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público y API OCDS.
 * Mapeado según el diccionario de datos oficial de ChileCompra y estándar OCDS.
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
  Descripcion?: string;
  MontoEstimado?: number;
  Moneda?: string;
  CodigoTipo?: number;
  Comprador?: {
    NombreOrganismo?: string;
    RutUnidad?: string;
  };
  Fechas?: {
    FechaCierre?: string;
    FechaPublicacion?: string;
    FechaCreacion?: string;
    FechaAdjudicacion?: string;
  };
  Items?: {
    Listado: MercadoPublicoItem[];
  };
}

const BASE_URL = 'https://us-central1-studio-4126028826-31b2f.cloudfunctions.net';

/**
 * Llama a la función de ingesta masiva (Sincronización por Fecha - API Ticket).
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
 * Obtiene el detalle profundo consultando por código externo y actualiza Firestore.
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

/**
 * NUEVO: Dispara la ingesta masiva histórica usando el estándar OCDS.
 * Permite cargar miles de registros de un mes específico.
 */
export async function syncOcdsHistorical(year: string, month: string, type: 'Licitacion' | 'TratoDirecto' | 'Convenio'): Promise<{ success: boolean; count: number; message: string }> {
  const url = `${BASE_URL}/syncOcdsHistorical?year=${year}&month=${month}&type=${type}`;

  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Error en carga OCDS");
    return result;
  } catch (error: any) {
    console.error(`[OCDS] Error: ${error.message}`);
    throw error;
  }
}
