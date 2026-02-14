
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

export const MOCK_BIDS: Bid[] = [
  {
    id: 'BID-001',
    title: 'Construcción de Nuevo Puente Vehicular sobre Río Mapocho',
    entity: 'Ministerio de Obras Públicas',
    category: 'Infraestructura',
    amount: 1500000000,
    currency: 'CLP',
    deadline: '2025-05-15',
    status: 'Abierta',
    location: 'Región Metropolitana',
    description: 'Licitación para el diseño y construcción de un puente de 4 pistas con ciclovía integrada.',
    fullText: 'El presente documento establece las bases para la licitación pública del proyecto "Construcción Puente Mapocho Norte". El presupuesto estimado es de 1.500 millones de pesos chilenos. Se requiere experiencia mínima de 10 años en obras similares. La fecha límite de recepción de ofertas es el 15 de mayo de 2025. Se evaluará 60% oferta técnica y 40% oferta económica.'
  },
  {
    id: 'BID-002',
    title: 'Suministro de Equipamiento Médico para Hospital Regional',
    entity: 'Servicio de Salud',
    category: 'Salud',
    amount: 450000,
    currency: 'USD',
    deadline: '2025-04-20',
    status: 'Abierta',
    location: 'Concepción',
    description: 'Adquisición de 5 equipos de resonancia magnética de última generación.',
    fullText: 'Convocatoria para el suministro de equipos médicos de alta complejidad. Monto referencial: 450,000 USD. Los equipos deben contar con certificación internacional y garantía extendida por 3 años. Plazo de entrega: 90 días corridos post-adjudicación. Consultas hasta el 10 de abril.'
  },
  {
    id: 'BID-003',
    title: 'Modernización del Sistema de Gestión Tributaria',
    entity: 'Servicio de Impuestos Internos',
    category: 'Tecnología',
    amount: 800000000,
    currency: 'CLP',
    deadline: '2025-06-30',
    status: 'En Evaluación',
    location: 'Nacional',
    description: 'Migración a nube híbrida y desarrollo de nuevas APIs de fiscalización.',
    fullText: 'Proyecto de transformación digital para el mejoramiento de la recaudación fiscal. Requiere arquitecturas basadas en microservicios y cumplimiento de normas ISO 27001. Presupuesto: 800 millones CLP. Duración estimada del proyecto: 24 meses.'
  },
  {
    id: 'BID-004',
    title: 'Servicio de Mantenimiento de Parques y Áreas Verdes',
    entity: 'Municipalidad de Las Condes',
    category: 'Servicios Profesionales',
    amount: 25000000,
    currency: 'CLP',
    deadline: '2025-03-25',
    status: 'Cerrada',
    location: 'Santiago',
    description: 'Contratación de servicios de jardinería y mantenimiento preventivo.',
    fullText: 'Mantenimiento integral de áreas verdes comunales. El contrato tiene una duración de 3 años renovables. Requisito contar con maquinaria propia y personal capacitado en manejo de residuos orgánicos.'
  }
];
