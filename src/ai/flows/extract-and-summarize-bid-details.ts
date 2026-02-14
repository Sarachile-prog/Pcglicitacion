'use server';
/**
 * @fileOverview Flujo de Genkit para asesoría experta en licitaciones.
 * Extrae detalles, genera alertas de cumplimiento, prepara checklists de formularios y brinda consejos estratégicos.
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

// Output Schema Extendido
const PostulationAdvisorOutputSchema = z.object({
  summary: z.string().describe('Resumen ejecutivo de la oportunidad.'),
  deadline: z.string().describe('Fecha límite fatal de postulación.'),
  monetaryAmount: z.string().describe('Monto referencial detectado.'),
  strategicAlerts: z.array(z.string()).describe('Alertas críticas: multas, garantías costosas, plazos irreales o requisitos excluyentes.'),
  timeline: z.array(TimelineEventSchema).describe('Cronograma clave del proceso.'),
  formChecklist: z.array(FormRequirementSchema).describe('Guía paso a paso para completar los formularios y anexos.'),
  strategicAdvice: z.string().describe('Consejo experto sobre cómo ganar esta licitación o si vale la pena el riesgo.'),
  reasoning: z.string().describe('Explicación del análisis realizado.'),
});

export type PostulationAdvisorOutput = z.infer<typeof PostulationAdvisorOutputSchema>;

const ExtractAndSummarizeBidDetailsInputSchema = z.object({
  bidDocumentText: z.string().describe('Texto completo de las bases.'),
  bidId: z.string().optional().describe('ID de Mercado Público.'),
});
export type ExtractAndSummarizeBidDetailsInput = z.infer<typeof ExtractAndSummarizeBidDetailsInputSchema>;

// Herramienta de conceptos (mantenida para mejor comprensión)
const explainConceptTool = ai.defineTool(
  {
    name: 'explainConcept',
    description: 'Explica términos complejos de las bases.',
    inputSchema: z.object({ term: z.string(), context: z.string().optional() }),
    outputSchema: z.object({ explanation: z.string() }),
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `Explica el término "${input.term}" en el contexto de licitaciones públicas chilenas.`,
      model: 'googleai/gemini-2.5-flash',
    });
    return { explanation: output?.text || 'Sin explicación.' };
  }
);

const fetchRealBidDataTool = ai.defineTool(
  {
    name: 'fetchRealBidData',
    description: 'Consulta datos vivos de la API.',
    inputSchema: z.object({ bidId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    return await getBidDetail(input.bidId);
  }
);

const postulationAdvisorPrompt = ai.definePrompt({
  name: 'postulationAdvisorPrompt',
  input: { schema: ExtractAndSummarizeBidDetailsInputSchema },
  output: { schema: PostulationAdvisorOutputSchema },
  tools: [explainConceptTool, fetchRealBidDataTool],
  prompt: `Actúa como un Asesor Senior de Postulaciones a Mercado Público Chile. 
  Tu objetivo es preparar al usuario para ganar la licitación.

  1. Analiza las bases adjuntas: {{{bidDocumentText}}}.
  2. Si hay ID ({{{bidId}}}), valida plazos reales con la API.
  3. Identifica "Alertas Rojas": ¿Piden una boleta de garantía muy alta? ¿El plazo de entrega es absurdo? ¿Hay multas severas?
  4. Crea una guía de formularios: ¿Qué anexos son obligatorios? ¿Qué datos de la empresa se deben preparar?
  5. Define un cronograma de hitos críticos.
  6. Da un consejo final: "Postular" o "Pasar" basado en la dificultad vs beneficio.

  Responde en español chileno profesional.`,
});

const postulationAdvisorFlow = ai.defineFlow(
  {
    name: 'postulationAdvisorFlow',
    inputSchema: ExtractAndSummarizeBidDetailsInputSchema,
    outputSchema: PostulationAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await postulationAdvisorPrompt(input);
    return output!;
  }
);

export async function extractAndSummarizeBidDetails(
  input: ExtractAndSummarizeBidDetailsInput
): Promise<PostulationAdvisorOutput> {
  return postulationAdvisorFlow(input);
}
