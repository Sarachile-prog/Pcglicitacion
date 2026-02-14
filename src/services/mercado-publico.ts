'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público.
 * Llama a la Cloud Function Gen2 desplegada para obtener datos reales.
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

/**
 * Obtiene licitaciones llamando a la Cloud Function Gen2.
 */
export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  // URL de Cloud Run para la función Gen2 según logs de despliegue
  const functionUrl = `https://getbidsbydate-uusj753vka-uc.a.run.app?date=${date}`;

  console.log(`[Client Service] Consultando Cloud Function: ${functionUrl}`);

  try {
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Client Service] Error de servidor (${response.status}): ${errorText}`);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error(`[Client Service] Error de red/conexión: ${error.message}`);
    return [];
  }
}

export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  return null;
}
