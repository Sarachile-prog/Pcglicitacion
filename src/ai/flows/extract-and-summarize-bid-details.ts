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
      next: { revalidate: 0 } // No cachear para asegurar datos frescos
    });

    if (!response.ok) return `Error al acceder al portal: ${response.statusText}`;

    const html = await response.text();
    
    // Limpieza básica del HTML para no saturar de tokens
    // Extraemos solo el cuerpo principal y eliminamos scripts/estilos
    const cleanContent = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '')
      .replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gmi, '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanContent.substring(0, 50000); // Limitamos a 50k caracteres para seguridad de tokens
  } catch (error: any) {
    console.error(`>>> [SCRAPER_ERROR]: ${error.message}`);
    return `Error de conexión con el portal público: ${error.message}`;
  }
}

/**
 * Función de diagnóstico para probar la conexión con el modelo.
 */
export async function testAiConnection() {
  console.log('>>> [AI_DIAGNOSTIC] Probando conexión con Gemini 2.5 Flash...');
  try {
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: 'Hola, responde brevemente: ¿Estás activo en el modelo 2.5?',
    });
    return { success: true, response: text };
  } catch (error: any) {
    console.error('>>> [AI_DIAGNOSTIC_ERROR]:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Función para listar modelos disponibles.
 */
export async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    return { success: true, models: data.models || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Flujo principal de asesoría estratégica.
 */
export async function extractAndSummarizeBidDetails(
  input: ExtractAndSummarizeBidDetailsInput
): Promise<PostulationAdvisorOutput> {
  console.log(`>>> [AI_FLOW] Analizando licitación con Gemini 2.5: ${input.bidId}`);
  
  let portalData = "";
  if (input.useLivePortal) {
    portalData = await scrapePublicPortal(input.bidId);
  }

  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `Eres un Asesor Senior Experto en Licitaciones de Mercado Público Chile (Ley 19.886).
      Tu objetivo es analizar los datos proporcionados para detectar riesgos, facilitar la postulación (checklist) e identificar leads.
      
      IMPORTANTE: Se te puede proporcionar texto crudo extraído directamente del portal público de Mercado Público. 
      Este texto puede ser desordenado. Tu labor es encontrar los datos clave (fechas, montos, estados) dentro de ese ruido.`,
      prompt: `Analiza detalladamente esta licitación y genera el informe estratégico:
      
      ID DE LICITACIÓN: ${input.bidId}
      
      DATOS DEL PORTAL EN VIVO (Scraping):
      ${portalData || "No disponible"}
      
      TEXTO ADICIONAL / BASES:
      ${input.bidDocumentText || "No proporcionado"}
      
      Instrucciones específicas:
      - Si encuentras discrepancias entre los datos de bases y el portal, prioriza lo que diga el PORTAL EN VIVO sobre el estado actual (si está cerrada o abierta).
      - En el checklist de formularios, busca nombres como "Anexo N°1", "Formulario de Experiencia", etc.
      - Si el texto indica que está cerrada pero el usuario pregunta por qué, explícalo basándote en las fechas encontradas.`,
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
