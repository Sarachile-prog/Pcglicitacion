'use server';
/**
 * @fileOverview Flujo de Genkit para asesoría experta en licitaciones y detección de leads.
 * Extrae detalles, genera alertas de cumplimiento, prepara checklists y detecta empresas potenciales.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getBidDetail } from '@/services/mercado-publico';

// Esquema de Hito del Cronograma
const TimelineEventSchema = z.object({
  event: z.string().describe('Nombre del hito o evento (ej: Cierre de consultas).'),
  date: z.string().describe('Fecha y hora del evento.'),
  criticality: z.enum(['baja', 'media', 'alta']).describe('Nivel de importancia para el postulante.'),
});

// Esquema de Formulario/Documento
const FormRequirementSchema = z.object({
  formName: z.string().describe('Nombre del formulario o anexo.'),
  purpose: z.string().describe('Para qué sirve este documento.'),
  dataRequired: z.array(z.string()).describe('Lista de datos específicos que el usuario debe tener a mano.'),
});

// Esquema de Prospecto/Empresa detectada
const PotentialLeadSchema = z.object({
  name: z.string().describe('Nombre de la empresa mencionada o tipo de proveedor.'),
  role: z.string().describe('Por qué es relevante (ej: Proveedor actual, competencia citada, subcontratista necesario).'),
  reason: z.string().describe('Justificación de por qué debería estar en nuestra base de datos.'),
});

// Output Schema Extendido
const PostulationAdvisorOutputSchema = z.object({
  summary: z.string().describe('Resumen ejecutivo de la oportunidad.'),
  deadline: z.string().describe('Fecha límite fatal de postulación.'),
  monetaryAmount: z.string().describe('Monto referencial detectado.'),
  strategicAlerts: z.array(z.string()).describe('Alertas críticas: multas, garantías costosas, plazos irreales o requisitos excluyentes.'),
  timeline: z.array(TimelineEventSchema).describe('Cronograma clave del proceso.'),
  formChecklist: z.array(FormRequirementSchema).describe('Guía paso a paso para completar los formularios y anexos.'),
  strategicAdvice: z.string().describe('Consejo experto sobre cómo ganar esta licitación o si vale la pena el riesgo.'),
  identifiedLeads: z.array(PotentialLeadSchema).describe('Empresas o perfiles identificados en el documento para outreach.'),
  reasoning: z.string().describe('Explicación del análisis realizado.'),
});

export type PostulationAdvisorOutput = z.infer<typeof PostulationAdvisorOutputSchema>;

const ExtractAndSummarizeBidDetailsInputSchema = z.object({
  bidDocumentText: z.string().describe('Texto completo de las bases.'),
  bidId: z.string().optional().describe('ID de Mercado Público.'),
});
export type ExtractAndSummarizeBidDetailsInput = z.infer<typeof ExtractAndSummarizeBidDetailsInputSchema>;

// Herramientas Genkit
const explainConceptTool = ai.defineTool(
  {
    name: 'explainConcept',
    description: 'Explica términos complejos de las bases.',
    inputSchema: z.object({ term: z.string(), context: z.string().optional() }),
    outputSchema: z.object({ explanation: z.string() }),
  },
  async (input) => {
    const { text } = await ai.generate({
      prompt: `Explica el término "${input.term}" en el contexto de licitaciones públicas chilenas.`,
    });
    return { explanation: text || 'Sin explicación.' };
  }
);

const fetchRealBidDataTool = ai.defineTool(
  {
    name: 'fetchRealBidData',
    description: 'Consulta datos vivos de la API de Mercado Público.',
    inputSchema: z.object({ bidId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    try {
      return await getBidDetail(input.bidId);
    } catch (e) {
      return { error: "No se pudo obtener el detalle en este momento." };
    }
  }
);

const postulationAdvisorPrompt = ai.definePrompt({
  name: 'postulationAdvisorPrompt',
  input: { schema: ExtractAndSummarizeBidDetailsInputSchema },
  output: { schema: PostulationAdvisorOutputSchema },
  tools: [explainConceptTool, fetchRealBidDataTool],
  system: `Actúa como un Asesor Senior de Postulaciones a Mercado Público Chile e Inteligencia de Mercado. 
  Tu objetivo es preparar al usuario para ganar la licitación e identificar oportunidades de negocio (leads).
  Utiliza un tono profesional y chileno.`,
  prompt: `Analiza la siguiente oportunidad de licitación:

  ID de Licitación: {{{bidId}}}
  Texto de las Bases: {{{bidDocumentText}}}

  Instrucciones:
  1. Si hay un ID de licitación, utiliza la herramienta fetchRealBidData para obtener datos actualizados.
  2. Identifica "Alertas Rojas" (garantías, multas, requisitos excluyentes).
  3. Crea una guía de formularios necesaria.
  4. Identifica empresas mencionadas para oportunidades de Outreach.
  5. Proporciona un consejo estratégico final.`,
});

const postulationAdvisorFlow = ai.defineFlow(
  {
    name: 'postulationAdvisorFlow',
    inputSchema: ExtractAndSummarizeBidDetailsInputSchema,
    outputSchema: PostulationAdvisorOutputSchema,
  },
  async (input) => {
    const response = await postulationAdvisorPrompt(input);
    const output = response.output;
    
    if (!output) {
      throw new Error("El asesor IA no pudo generar una respuesta estructurada.");
    }
    return output;
  }
);

export async function extractAndSummarizeBidDetails(
  input: ExtractAndSummarizeBidDetailsInput
): Promise<PostulationAdvisorOutput> {
  return postulationAdvisorFlow(input);
}
