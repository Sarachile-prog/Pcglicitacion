'use server';
/**
 * @fileOverview Flujo de Genkit para asesoría experta en licitaciones y detección de leads.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Esquemas de datos
const TimelineEventSchema = z.object({
  event: z.string().describe('Nombre del hito o fecha importante.'),
  date: z.string().describe('Fecha del evento extraída de las bases.'),
  criticality: z.enum(['baja', 'media', 'alta']),
});

const FormRequirementSchema = z.object({
  formName: z.string().describe('Nombre del anexo o formulario.'),
  purpose: z.string().describe('Para qué sirve este documento.'),
  dataRequired: z.array(z.string()).describe('Campos o datos clave que solicita el formulario.'),
});

const PotentialLeadSchema = z.object({
  name: z.string().describe('Nombre de la persona o cargo mencionado.'),
  role: z.string().describe('Rol o relevancia detectada.'),
  reason: z.string().describe('Por qué es un lead potencial.'),
});

const PostulationAdvisorOutputSchema = z.object({
  summary: z.string().describe('Resumen ejecutivo de la licitación.'),
  deadline: z.string().describe('Fecha límite de postulación.'),
  monetaryAmount: z.string().describe('Monto estimado o presupuesto.'),
  strategicAlerts: z.array(z.string()).describe('Alertas sobre multas, garantías o requisitos difíciles.'),
  timeline: z.array(TimelineEventSchema).describe('Hitos clave del proceso.'),
  formChecklist: z.array(FormRequirementSchema).describe('Lista de documentos administrativos requeridos.'),
  strategicAdvice: z.string().describe('Consejo experto para ganar la licitación.'),
  identifiedLeads: z.array(PotentialLeadSchema).describe('Personas o cargos para outreach.'),
  reasoning: z.string().describe('Explicación del razonamiento de la IA.'),
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
  console.log('>>> [AI_DIAGNOSTIC] Probando conexión con Gemini...');
  try {
    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: 'Hola, responde brevemente: ¿Estás activo?',
    });
    return { success: true, response: text };
  } catch (error: any) {
    console.error('>>> [AI_DIAGNOSTIC_ERROR]:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Flujo principal de asesoría estratégica.
 */
export async function extractAndSummarizeBidDetails(
  input: ExtractAndSummarizeBidDetailsInput
): Promise<PostulationAdvisorOutput> {
  console.log(`>>> [AI_FLOW] Analizando licitación: ${input.bidId || 'Sin ID'}`);
  
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `Eres un Asesor Senior Experto en Licitaciones de Mercado Público Chile (Ley 19.886).
      Tu objetivo es analizar bases administrativas y técnicas para detectar riesgos, facilitar la postulación (checklist) e identificar leads.`,
      prompt: `Analiza detalladamente esta licitación y genera el informe estratégico:
      
      ID: ${input.bidId || 'N/A'}
      TEXTO DEL DOCUMENTO:
      ${input.bidDocumentText}
      
      Instrucciones específicas:
      - Si no encuentras montos explícitos, indica "A definir en bases".
      - En el checklist de formularios, busca nombres como "Anexo N°1", "Formulario de Experiencia", etc.`,
      output: {
        schema: PostulationAdvisorOutputSchema,
      },
      config: {
        temperature: 0.1,
      }
    });

    if (!output) {
      throw new Error("El modelo no generó una respuesta válida.");
    }

    return output;
  } catch (error: any) {
    console.error('>>> [AI_FLOW_FATAL_ERROR]:', error.message);
    throw new Error(`Error en el servicio de IA: ${error.message}`);
  }
}
