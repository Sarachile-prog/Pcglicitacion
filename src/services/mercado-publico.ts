/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público (ChileCompra).
 * Documentación oficial: https://desarrolladores.mercadopublico.cl/
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

const API_BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';

// Se prioriza la variable de entorno para producción, usando el ticket proporcionado como fallback.
const getTicket = () => {
  return process.env.NEXT_PUBLIC_MERCADO_PUBLICO_TICKET || 'CE1F854E-2ED7-42B9-837B-066A77AED4EB';
};

/**
 * Obtiene licitaciones filtradas por fecha.
 * @param date Formato DDMMAAAA
 */
export async function getBidsByDate(date: string = '01012024'): Promise<MercadoPublicoBid[]> {
  try {
    const ticket = getTicket();
    const response = await fetch(`${API_BASE_URL}?fecha=${date}&ticket=${ticket}`, {
      next: { revalidate: 3600 } // Cache de 1 hora
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.Listado || [];
  } catch (error) {
    return [];
  }
}

/**
 * Obtiene el detalle de una licitación específica por su Código Externo.
 */
export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  if (!codigo) return null;
  
  try {
    const ticket = getTicket();
    const response = await fetch(`${API_BASE_URL}?codigo=${codigo}&ticket=${ticket}`, {
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.Listado?.[0] || null;
  } catch (error) {
    return null;
  }
}
