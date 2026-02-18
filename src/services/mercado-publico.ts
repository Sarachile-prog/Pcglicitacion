'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público y API OCDS.
 * Ajustado para funciones de 2ª Generación (Cloud Run).
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

// URL base detectada desde el despliegue de 2ª generación
const BASE_DOMAIN = 'https://uusj753vka-uc.a.run.app';

/**
 * Llama a la función de ingesta masiva (Sincronización por Fecha - API Ticket).
 */
export async function getBidsByDate(date: string): Promise<{ success: boolean; count: number; message: string }> {
  // Las funciones de 2ª gen tienen subdominios específicos o rutas mapeadas
  const url = `https://getbidsbydate-uusj753vka-uc.a.run.app?date=${date}`;

  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error("El servidor de funciones no está listo. Por favor espera a que el despliegue termine.");
    }
    
    const result = await response.json();
    if (result.success === false) throw new Error(result.message || "Error en la sincronización");
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
  const url = `https://getbiddetail-uusj753vka-uc.a.run.app?code=${code}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error(`[Service] Error en detalle: ${error.message}`);
    return null;
  }
}

/**
 * Dispara la ingesta masiva histórica usando el estándar OCDS.
 */
export async function syncOcdsHistorical(year: string, month: string, type: 'Licitacion' | 'TratoDirecto' | 'Convenio'): Promise<{ success: boolean; count: number; message: string }> {
  const url = `https://syncocdshistorical-uusj753vka-uc.a.run.app?year=${year}&month=${month}&type=${type}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error("Respuesta no válida del servidor. Reintenta en un momento.");
    }
    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error(`[OCDS] Error: ${error.message}`);
    throw error;
  }
}
