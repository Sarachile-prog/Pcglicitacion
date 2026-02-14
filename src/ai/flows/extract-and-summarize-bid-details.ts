'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting and summarizing key details from bid documents.
 * It also provides a reasoning tool that the LLM can use to enhance comprehension by explaining specific concepts.
 *
 * - extractAndSummarizeBidDetails - A function that handles the extraction and summarization process.
 * - ExtractAndSummarizeBidDetailsInput - The input type for the extractAndSummarizeBidDetails function.
 * - ExtractAndSummarizeBidDetailsOutput - The return type for the extractAndSummarizeBidDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const ExtractAndSummarizeBidDetailsInputSchema = z.object({
  bidDocumentText: z.string().describe('The full text content of the bid document.'),
});
export type ExtractAndSummarizeBidDetailsInput = z.infer<typeof ExtractAndSummarizeBidDetailsInputSchema>;

// Output Schema
const ExtractAndSummarizeBidDetailsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the bid opportunity, highlighting its main purpose and scope.'),
  deadline: z.string().describe('The submission deadline for the bid, if explicitly mentioned in the document.'),
  monetaryAmount: z.string().describe('The estimated or specified monetary value of the bid, including currency, if mentioned.'),
  keyRequirements: z.array(z.string()).describe('A list of the most important or critical requirements for the bid.'),
  reasoning: z.string().describe('Your step-by-step reasoning and explanation for why these specific details were extracted, including any clarifications provided by tools, and their importance for a quick understanding.'),
});
export type ExtractAndSummarizeBidDetailsOutput = z.infer<typeof ExtractAndSummarizeBidDetailsOutputSchema>;

// Define the 'explainConcept' tool
const ExplainConceptInputSchema = z.object({
  term: z.string().describe('The concept or term to explain.'),
  context: z.string().optional().describe('Optional context from the bid document to help in explaining the term.'),
});

const ExplainConceptOutputSchema = z.object({
  explanation: z.string().describe('A clear and concise explanation of the term.'),
});

const explainConceptTool = ai.defineTool(
  {
    name: 'explainConcept',
    description: 'Provides a clear and concise explanation of a specific concept or term from a bid document. Use this tool if you encounter specialized or ambiguous terminology that needs clarification for better comprehension.',
    inputSchema: ExplainConceptInputSchema,
    outputSchema: ExplainConceptOutputSchema,
  },
  async (input) => {
    // In a real application, this tool would typically query an external knowledge base,
    // a specialized glossary API, or an internal database of definitions.
    // For this example, we simulate an explanation using the LLM itself,
    // demonstrating how a tool's output would be structured.
    // In a production scenario, you might replace this with a more efficient lookup.

    const explanationPrompt = `Explain the following term clearly and concisely: "${input.term}".
    ${input.context ? `Consider this context from the bid document: "${input.context}".` : ''}
    Focus on relevance to bid documents and general business/legal contexts.`;

    const { output } = await ai.generate({
      prompt: explanationPrompt,
      model: 'googleai/gemini-2.5-flash', // Using the default Genkit model for consistency.
      temperature: 0.2, // Keep explanations concise and factual
    });

    return {
      explanation: output?.text || `Could not find an explanation for "${input.term}".`,
    };
  }
);


// Define the prompt
const extractAndSummarizeBidDetailsPrompt = ai.definePrompt({
  name: 'extractAndSummarizeBidDetailsPrompt',
  input: { schema: ExtractAndSummarizeBidDetailsInputSchema },
  output: { schema: ExtractAndSummarizeBidDetailsOutputSchema },
  tools: [explainConceptTool], // Make the explainConcept tool available to the LLM
  prompt: `You are an expert bid analyst. Your task is to extract and summarize key details from the provided bid document.
  Pay close attention to submission deadlines, monetary amounts (including currency), and specific requirements.

  If you encounter any complex, specialized, or ambiguous terms, use the 'explainConcept' tool to clarify them.
  Integrate any explanations from the tool into your 'reasoning' field to enhance the user's comprehension.
  Your 'reasoning' should explain your thought process for extraction and highlight the importance of the extracted details.

  Bid Document:
  {{{bidDocumentText}}}`,
});

// Define the flow
const extractAndSummarizeBidDetailsFlow = ai.defineFlow(
  {
    name: 'extractAndSummarizeBidDetailsFlow',
    inputSchema: ExtractAndSummarizeBidDetailsInputSchema,
    outputSchema: ExtractAndSummarizeBidDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await extractAndSummarizeBidDetailsPrompt(input);
    return output!;
  }
);

// Export wrapper function
export async function extractAndSummarizeBidDetails(
  input: ExtractAndSummarizeBidDetailsInput
): Promise<ExtractAndSummarizeBidDetailsOutput> {
  return extractAndSummarizeBidDetailsFlow(input);
}
