'use server';
/**
 * @fileOverview Flujo de Genkit para auditoría final de propuestas de licitación.
 * Compara el borrador del usuario contra los requisitos identificados por la IA.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AuditInputSchema = z.object({
  bidId: z.string(),
  proposalText: z.string().describe('El texto del borrador o documentos que el usuario planea subir.'),
  strategicContext: z.any().describe('El análisis estratégico previo generado por la IA.'),
});
export type AuditInput = z.infer<typeof AuditInputSchema>;

const AuditOutputSchema = z.object({
  complianceScore: z.number().min(0).max(100).describe('Puntaje de cumplimiento estimado.'),
  missingElements: z.array(z.string()).describe('Elementos o anexos que parecen faltar.'),
  riskWarnings: z.array(z.string()).describe('Riesgos detectados en la redacción o montos.'),
  improvementSuggestions: z.string().describe('Sugerencias específicas para mejorar la oferta.'),
  isReady: z.boolean().describe('¿Está la oferta lista para ser enviada?'),
});
export type AuditOutput = z.infer<typeof AuditOutputSchema>;

export async function auditBidProposal(input: AuditInput): Promise<AuditOutput> {
  console.log(`>>> [AI_AUDITOR] Auditando propuesta para: ${input.bidId}`);

  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `Eres un Auditor Experto en Licitaciones Públicas. 
      Tu misión es actuar como el último filtro de seguridad antes de que una empresa suba su oferta a Mercado Público.
      Debes ser extremadamente crítico y buscar errores en anexos, montos, plazos o requisitos técnicos.`,
      prompt: `Revisa minuciosamente este borrador de propuesta:

      CONTEXTO ESTRATÉGICO DE LA LICITACIÓN:
      ${JSON.stringify(input.strategicContext)}

      BORRADOR DEL USUARIO / DOCUMENTOS:
      ${input.proposalText}

      Instrucciones:
      1. Compara los "Elementos Requeridos" del contexto con lo que el usuario escribió.
      2. Si el usuario no menciona una garantía o un anexo específico, márcalo como faltante.
      3. Revisa si el tono es profesional y cumple con las bases administrativas.
      4. Da un veredicto final de "Listo" o "No Listo".`,
      output: {
        schema: AuditOutputSchema,
      },
      config: {
        temperature: 0.2,
      }
    });

    if (!output) throw new Error("Fallo al auditar la propuesta.");
    return output;
  } catch (error: any) {
    console.error('>>> [AI_AUDITOR_ERROR]:', error.message);
    throw new Error(`Error en auditoría IA: ${error.message}`);
  }
}
