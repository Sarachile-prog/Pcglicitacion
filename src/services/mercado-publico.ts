'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público (ChileCompra).
 * Se ejecuta en el servidor para evitar problemas de CORS.
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

// Ticket oficial proporcionado por el usuario
const TICKET = 'CE1F854E-2ED7-42B9-837B-066A77AED4EB';

/**
 * Obtiene licitaciones filtradas por fecha.
 * @param date Formato DDMMAAAA
 */
export async function getBidsByDate(date: string): Promise<MercadoPublicoBid[]> {
  try {
    const url = `${API_BASE_URL}?fecha=${date}&ticket=${TICKET}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // Cache de 5 minutos para datos frescos
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    // La API devuelve un mensaje de error dentro del JSON si el ticket es inválido o no hay datos
    if (data.Mensaje) {
      return [];
    }

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
    const url = `${API_BASE_URL}?codigo=${codigo}&ticket=${TICKET}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.Listado?.[0] || null;
  } catch (error) {
    return null;
  }
}
