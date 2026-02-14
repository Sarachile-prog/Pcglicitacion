
export type BidStatus = 'Abierta' | 'Cerrada' | 'En Evaluación' | 'Adjudicada';

export interface Bid {
  id: string;
  title: string;
  entity: string;
  category: string;
  amount: number;
  currency: string;
  deadline: string;
  status: BidStatus;
  description: string;
  fullText: string;
  location: string;
}

export const CATEGORIES = [
  'Construcción',
  'Tecnología',
  'Salud',
  'Servicios Profesionales',
  'Infraestructura',
  'Educación'
];

// Se eliminan los datos de ejemplo para asegurar que la plataforma solo muestre datos reales.
export const MOCK_BIDS: Bid[] = [];
