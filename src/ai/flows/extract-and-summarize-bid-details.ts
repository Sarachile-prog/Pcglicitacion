'use server';
/**
 * @fileOverview Flujo de Genkit para asesoría experta en licitaciones y detección de leads.
 * Refactorizado para máxima estabilidad en Server Actions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getBidDetail } from '@/services/mercado-publico';

// Esquemas de datos
const TimelineEventSchema = z.object({
  event: z.string().describe('Nombre del hito.'),
  date: z.string().describe('Fecha del evento.'),
  criticality: z.enum(['baja', 'media', 'alta']),
});

const FormRequirementSchema = z.object({
  formName: z.string(),
  purpose: z.string(),
  dataRequired: z.array(z.string()),
});

const PotentialLeadSchema = z.object({
  name: z.string(),
  role: z.string(),
  reason: z.string(),
});

const PostulationAdvisorOutputSchema = z.object({
  summary: z.string(),
  deadline: z.string(),
  monetaryAmount: z.string(),
  strategicAlerts: z.array(z.string()),
  timeline: z.array(TimelineEventSchema),
  formChecklist: z.array(FormRequirementSchema),
  strategicAdvice: z.string(),
  identifiedLeads: z.array(PotentialLeadSchema),
  reasoning: z.string(),
});

export type PostulationAdvisorOutput = z.infer<typeof PostulationAdvisorOutputSchema>;

const ExtractAndSummarizeBidDetailsInputSchema = z.object({
  bidDocumentText: z.string(),
  bidId: z.string().optional(),
});
export type ExtractAndSummarizeBidDetailsInput = z.infer<typeof ExtractAndSummarizeBidDetailsInputSchema>;

// Herramientas refinadas
const fetchRealBidDataTool = ai.defineTool(
  {
    name: 'fetchRealBidData',
    description: 'Consulta datos técnicos oficiales de la licitación.',
    inputSchema: z.object({ bidId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    try {
      const data = await getBidDetail(input.bidId);
      return data || { info: "No hay datos adicionales disponibles." };
    } catch (e) {
      return { info: "Error al consultar la API externa." };
    }
  }
);

/**
 * Flujo principal de asesoría estratégica.
 */
export async function extractAndSummarizeBidDetails(
  input: ExtractAndSummarizeBidDetailsInput
): Promise<PostulationAdvisorOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    tools: [fetchRealBidDataTool],
    system: `Actúa como un Asesor Senior de Postulaciones a Mercado Público Chile. 
    Tu misión es analizar licitaciones para maximizar las chances de ganar y detectar riesgos.
    Usa un tono profesional, experto y directo.`,
    prompt: `Analiza esta licitación:
    ID: ${input.bidId || 'No provisto'}
    Texto: ${input.bidDocumentText}

    Instrucciones críticas:
    1. Usa fetchRealBidData si tienes el ID para obtener montos y descripciones técnicas reales.
    2. Identifica alertas estratégicas (multas, garantías, requisitos difíciles).
    3. Prepara un checklist de formularios para no quedar fuera por errores administrativos.
    4. Detecta empresas o perfiles para outreach.`,
    output: {
      schema: PostulationAdvisorOutputSchema,
    },
    config: {
      temperature: 0.4,
    }
  });

  if (!output) {
    throw new Error("La IA no pudo procesar la solicitud. Por favor, intenta de nuevo.");
  }

  return output;
}
