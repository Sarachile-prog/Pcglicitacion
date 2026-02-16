'use server';
/**
 * @fileOverview Flujo de Genkit para asesoría experta en licitaciones y detección de leads.
 * Incluye logs detallados para diagnóstico de errores en el servidor.
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

/**
 * Función de diagnóstico para probar la conexión con el modelo.
 */
export async function testAiConnection() {
  try {
    const { text } = await ai.generate('Hola, ¿puedes responder?');
    return { success: true, response: text };
  } catch (error: any) {
    console.error('[AI_DIAGNOSTIC_ERROR]:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Flujo principal de asesoría estratégica con logging mejorado.
 */
export async function extractAndSummarizeBidDetails(
  input: ExtractAndSummarizeBidDetailsInput
): Promise<PostulationAdvisorOutput> {
  console.log(`>>> [AI_FLOW] Iniciando análisis para licitación: ${input.bidId || 'Sin ID'}`);
  
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `Actúa como un Asesor Senior de Postulaciones a Mercado Público Chile. 
      Tu misión es analizar licitaciones para maximizar las chances de ganar y detectar riesgos.
      Usa un tono profesional, experto y directo.`,
      prompt: `Analiza esta licitación y extrae los detalles estratégicos:
      ID: ${input.bidId || 'No provisto'}
      Texto: ${input.bidDocumentText}

      Instrucciones críticas:
      1. Identifica alertas estratégicas (multas, garantías, requisitos difíciles).
      2. Prepara un checklist de formularios administrativos.
      3. Detecta perfiles potenciales para outreach.`,
      output: {
        schema: PostulationAdvisorOutputSchema,
      },
      config: {
        temperature: 0.3,
      }
    });

    if (!output) {
      console.error('>>> [AI_FLOW_ERROR]: La IA devolvió un output nulo.');
      throw new Error("El modelo no generó una respuesta válida.");
    }

    console.log('>>> [AI_FLOW] Análisis completado con éxito.');
    return output;
  } catch (error: any) {
    // Este log aparecerá en la terminal del servidor/consola de desarrollo
    console.error('>>> [AI_FLOW_FATAL_ERROR]:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    throw new Error(`Error en el servicio de IA: ${error.message}`);
  }
}
