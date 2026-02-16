'use server';
/**
 * @fileOverview Flujo de Genkit para auditoría final de propuestas de licitación.
 * Compara el borrador del usuario contra los requisitos identificados por la IA.
 * Enfocado en detectar errores de forma, placeholders vacíos y errores de suma.
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
  riskWarnings: z.array(z.string()).describe('Riesgos detectados (Formato, sumas, placeholders).'),
  improvementSuggestions: z.string().describe('Sugerencias específicas para corregir la oferta.'),
  isReady: z.boolean().describe('¿Está la oferta lista para ser enviada?'),
});
export type AuditOutput = z.infer<typeof AuditOutputSchema>;

export async function auditBidProposal(input: AuditInput): Promise<AuditOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `Eres un Auditor Crítico de Licitaciones Públicas.
      Tu objetivo es buscar cualquier error que cause que la oferta sea declarada "Inadmisible".
      
      BUSCA ESPECÍFICAMENTE:
      1. Placeholders vacíos como "[...]", "Insertar aquí", "Nombre Empresa", "RUT".
      2. Errores de formato en RUT (falta dígito verificador o puntos).
      3. Incoherencias en montos (si el monto en letras no coincide con números).
      4. Omisión de Garantías de Seriedad de la Oferta si son requeridas.
      5. Falta de firmas mencionadas o sellos.`,
      prompt: `Audita esta propuesta técnica/económica:

      CONTEXTO ESTRATÉGICO:
      ${JSON.stringify(input.strategicContext)}

      BORRADOR DEL USUARIO:
      ${input.proposalText}

      Instrucciones:
      - Sé extremadamente severo con los campos vacíos.
      - Si el contexto dice que el Anexo 3 es obligatorio y no ves su estructura en el texto, márcalo como faltante.
      - Verifica que el nombre de la institución sea el correcto.`,
      output: {
        schema: AuditOutputSchema,
      },
      config: {
        temperature: 0.2,
      }
    });

    if (!output) throw new Error("Fallo al auditar.");
    return output;
  } catch (error: any) {
    throw new Error(`Error en auditoría IA: ${error.message}`);
  }
}
