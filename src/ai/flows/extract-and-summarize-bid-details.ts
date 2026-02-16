'use server';
/**
 * @fileOverview Flujo de Genkit para asesoría experta en licitaciones y detección de leads.
 * Incluye capacidad de scraping en tiempo real del portal de Mercado Público.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Esquemas de datos
const TimelineEventSchema = z.object({
  event: z.string().describe('Nombre del hito o fecha importante.'),
  date: z.string().describe('Fecha del evento extraída de las bases.'),
  criticality: z.enum(['baja', 'media', 'alta']).describe('Alta si el incumplimiento significa descalificación inmediata.'),
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
  timeline: z.array(TimelineEventSchema).describe('Cronograma de hitos críticos (Visita a terreno, foro de preguntas, etc).'),
  formChecklist: z.array(FormRequirementSchema).describe('Lista de documentos administrativos requeridos.'),
  strategicAdvice: z.string().describe('Consejo experto para ganar la licitación.'),
  identifiedLeads: z.array(PotentialLeadSchema).describe('Personas o cargos para outreach.'),
  reasoning: z.string().describe('Explicación del razonamiento de la IA.'),
});

export type PostulationAdvisorOutput = z.infer<typeof PostulationAdvisorOutputSchema>;

const ExtractAndSummarizeBidDetailsInputSchema = z.object({
  bidDocumentText: z.string().optional(),
  bidId: z.string(),
  useLivePortal: z.boolean().optional().describe('Indica si debe intentar hacer scraping del portal público.'),
});
export type ExtractAndSummarizeBidDetailsInput = z.infer<typeof ExtractAndSummarizeBidDetailsInputSchema>;

/**
 * Función interna para extraer texto del portal público de Mercado Público.
 */
async function scrapePublicPortal(bidId: string): Promise<string> {
  const url = `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${bidId}`;
  console.log(`>>> [SCRAPER] Intentando obtener datos en vivo de: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) return `Error al acceder al portal: ${response.statusText}`;

    const html = await response.text();
    const cleanContent = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '')
      .replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gmi, '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanContent.substring(0, 50000);
  } catch (error: any) {
    console.error(`>>> [SCRAPER_ERROR]: ${error.message}`);
    return `Error de conexión con el portal público: ${error.message}`;
  }
}

export async function testAiConnection() {
  try {
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: 'Responde OK si estás activo.',
    });
    return { success: true, response: text };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    return { success: true, models: data.models || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function extractAndSummarizeBidDetails(
  input: ExtractAndSummarizeBidDetailsInput
): Promise<PostulationAdvisorOutput> {
  let portalData = "";
  if (input.useLivePortal) {
    portalData = await scrapePublicPortal(input.bidId);
  }

  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `Eres un Asesor Senior Experto en Licitaciones de Mercado Público Chile (Ley 19.886).
      Tu misión principal es evitar que el usuario sea descalificado por errores de forma o por saltarse hitos obligatorios.
      
      CRÍTICO: Debes identificar con precisión absoluta los siguientes hitos si aparecen:
      1. Visita a terreno (¿Es obligatoria?).
      2. Fecha de cierre de consultas (Foro).
      3. Fecha de publicación de respuestas.
      4. Fecha de apertura técnica y económica.
      5. Fecha de adjudicación estimada.`,
      prompt: `Analiza esta licitación para detectar riesgos de descalificación:
      
      ID: ${input.bidId}
      DATOS DEL PORTAL: ${portalData || "No disponible"}
      BASES/TEXTO: ${input.bidDocumentText || "No proporcionado"}
      
      Instrucciones:
      - Si existe una "Visita a Terreno", cárgala en el timeline con criticality: 'alta'.
      - En el Checklist, busca todos los Anexos Administrativos (1, 2, 3...).
      - Identifica leads si se mencionan nombres de contrapartes técnicas.`,
      output: {
        schema: PostulationAdvisorOutputSchema,
      },
      config: {
        temperature: 0.1,
      }
    });

    if (!output) throw new Error("Fallo en generación IA.");
    return output;
  } catch (error: any) {
    console.error('>>> [AI_FLOW_ERROR]:', error.message);
    throw new Error(`Error en el servicio de IA: ${error.message}`);
  }
}
