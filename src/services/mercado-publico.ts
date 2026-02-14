'use server';
/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público (ChileCompra).
 * Se ejecuta en el servidor para evitar problemas de CORS y proteger el ticket.
 * 
 * TODO: Implementar mecanismo de Rate Limit Guard para prevenir bloqueos por exceso de cuota.
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

// Se obtiene el ticket desde las variables de entorno del servidor.
const TICKET = process.env.MERCADO_PUBLICO_TICKET;

if (!TICKET) {
  // Error fatal en configuración de servidor
  throw new Error("Missing MERCADO_PUBLICO_TICKET environment variable");
}

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
      console.log(`[MercadoPublico Service] HTTP Error ${response.status} al consultar fecha: ${date}`);
      return [];
    }
    
    const data = await response.json();
    
    // La API devuelve un mensaje de error dentro del JSON si hay problemas de negocio
    if (data.Mensaje) {
      console.log(`[MercadoPublico Service] API Message: ${data.Mensaje}`);
      
      const lowerMsg = data.Mensaje.toLowerCase();
      if (lowerMsg.includes('ticket') || lowerMsg.includes('invalido') || lowerMsg.includes('inválido')) {
        throw new Error("MercadoPublico API ticket inválido o bloqueado");
      }
      return [];
    }

    return data.Listado || [];
  } catch (error: any) {
    // Logging controlado en servidor para diagnóstico
    console.log(`[MercadoPublico Service] Exception in getBidsByDate: ${error.message}`);
    // Retorno seguro para la UI
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
    
    if (!response.ok) {
      console.log(`[MercadoPublico Service] HTTP Error ${response.status} al consultar código: ${codigo}`);
      return null;
    }
    
    const data = await response.json();

    if (data.Mensaje) {
      console.log(`[MercadoPublico Service] API Message: ${data.Mensaje}`);
      
      const lowerMsg = data.Mensaje.toLowerCase();
      if (lowerMsg.includes('ticket') || lowerMsg.includes('invalido') || lowerMsg.includes('inválido')) {
        throw new Error("MercadoPublico API ticket inválido o bloqueado");
      }
      return null;
    }

    return data.Listado?.[0] || null;
  } catch (error: any) {
    console.log(`[MercadoPublico Service] Exception in getBidDetail: ${error.message}`);
    return null; // Retorno seguro para la UI
  }
}
