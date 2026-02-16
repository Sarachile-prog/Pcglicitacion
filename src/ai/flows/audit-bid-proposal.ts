'use server';
/**
 * @fileOverview Flujo de Genkit para auditoría técnica de anexos en PDF.
 * Utiliza capacidades multimodales para analizar documentos originales.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AuditInputSchema = z.object({
  bidId: z.string(),
  fileDataUri: z.string().describe("El archivo PDF del anexo en formato data URI (base64)."),
  strategicContext: z.any().describe('El análisis estratégico previo generado por la IA.'),
});
export type AuditInput = z.infer<typeof AuditInputSchema>;

const AuditOutputSchema = z.object({
  complianceScore: z.number().min(0).max(100).describe('Puntaje de cumplimiento estimado.'),
  missingElements: z.array(z.string()).describe('Elementos o anexos que parecen faltar.'),
  riskWarnings: z.array(z.string()).describe('Riesgos detectados (Formato, sumas, placeholders, firmas).'),
  improvementSuggestions: z.string().describe('Sugerencias específicas para corregir el documento.'),
  isReady: z.boolean().describe('¿Está el documento listo para ser enviado al portal oficial?'),
});
export type AuditOutput = z.infer<typeof AuditOutputSchema>;

export async function auditBidProposal(input: AuditInput): Promise<AuditOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `Eres un Auditor Senior de Licitaciones Públicas experto en revisión de Anexos Administrativos y Técnicos.
      Tu objetivo es encontrar cualquier error que cause que la oferta sea declarada "Fuera de Bases" o "Inadmisible".
      
      ERES UN EXPERTO EN DETECTAR:
      1. Errores de aritmética: Sumas mal realizadas en tablas de presupuesto.
      2. Datos faltantes: RUTs sin dígito verificador, firmas omitidas o nombres de empresa incorrectos.
      3. Inconsistencias: El monto en palabras no coincide con el monto en números.
      4. Vigencia: Fechas de documentos que podrían estar vencidas.`,
      prompt: [
        { text: `Audita este documento PDF adjunto basándote en el contexto estratégico de la licitación ${input.bidId}.
        
        CONTEXTO ESTRATÉGICO DE LA LICITACIÓN:
        ${JSON.stringify(input.strategicContext)}
        
        INSTRUCCIONES DE AUDITORÍA:
        - Revisa minuciosamente cada tabla numérica.
        - Verifica que el RUT de la empresa y el nombre de la institución coincidan con lo requerido.
        - Si detectas un error de suma, especifícalo claramente en las sugerencias.` },
        { media: { url: input.fileDataUri, contentType: 'application/pdf' } }
      ],
      output: {
        schema: AuditOutputSchema,
      },
      config: {
        temperature: 0.1,
      }
    });

    if (!output) throw new Error("Fallo al auditar el PDF.");
    return output;
  } catch (error: any) {
    console.error('>>> [AUDIT_IA_ERROR]:', error.message);
    throw new Error(`Error en auditoría de PDF: ${error.message}`);
  }
}
