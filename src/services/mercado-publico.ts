/**
 * @fileOverview Servicio para interactuar con la API de Mercado Público (ChileCompra).
 * Documentación oficial: https://desarrolladores.mercadopublico.cl/
 */

export interface MercadoPublicoBid {
  CodigoExterno: string;
  Nombre: string;
  CodigoEstado: number;
  FechaCierre: string;
  Descripcion?: string;
  MontoEstimado?: number;
  Organismo: {
    NombreOrganismo: string;
  };
}

const API_BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';
const TICKET = process.env.NEXT_PUBLIC_MERCADO_PUBLICO_TICKET || 'F8069D13-DEC1-4AD3-BB3D-88229F6F505D'; // Ticket de prueba genérico o env

export async function getBidsByDate(date: string = '01012024'): Promise<MercadoPublicoBid[]> {
  try {
    const response = await fetch(`${API_BASE_URL}?fecha=${date}&ticket=${TICKET}`);
    if (!response.ok) throw new Error('Error al conectar con Mercado Público');
    
    const data = await response.json();
    return data.Listado || [];
  } catch (error) {
    console.error('MercadoPublico Service Error:', error);
    return [];
  }
}

export async function getBidDetail(codigo: string): Promise<MercadoPublicoBid | null> {
  try {
    const response = await fetch(`${API_BASE_URL}?codigo=${codigo}&ticket=${TICKET}`);
    if (!response.ok) throw new Error('Error al obtener detalle de licitación');
    
    const data = await response.json();
    return data.Listado?.[0] || null;
  } catch (error) {
    console.error('MercadoPublico Detail Error:', error);
    return null;
  }
}
