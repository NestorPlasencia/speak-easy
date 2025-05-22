// src/ai/flows/generate-sentences.ts
'use server';

/**
 * @fileOverview Generates sentences on a particular topic for pronunciation practice.
 *
 * - generateSentences - A function that generates sentences based on a topic.
 * - GenerateSentencesInput - The input type for the generateSentences function.
 * - GenerateSentencesOutput - The return type for the generateSentences function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSentencesInputSchema = z.object({
  topic: z.string().describe('The topic on which to generate sentences.'),
  sentenceCount: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('The number of sentences to generate (max 10).'),
});
export type GenerateSentencesInput = z.infer<typeof GenerateSentencesInputSchema>;

const GenerateSentencesOutputSchema = z.object({
  sentences: z.array(z.string()).describe('The generated sentences.'),
});
export type GenerateSentencesOutput = z.infer<typeof GenerateSentencesOutputSchema>;

export async function generateSentences(input: GenerateSentencesInput): Promise<GenerateSentencesOutput> {
  return generateSentencesFlow(input);
}

const generateSentencesPrompt = ai.definePrompt({
  name: 'generateSentencesPrompt',
  input: {schema: GenerateSentencesInputSchema},
  output: {schema: GenerateSentencesOutputSchema},
  prompt: `You are a helpful assistant designed to generate sentences on a given topic.  The sentences should be simple and easy to pronounce for language learners.

  Generate {{{sentenceCount}}} sentences on the topic of "{{{topic}}}". Return the sentences as a JSON array of strings.

  Ensure that your output is valid JSON.

  Example:
  {
    "sentences": [
      "The cat sat on the mat.",
      "The dog barked at the mailman.",
      "The sun is shining brightly.",
      "She is wearing a red dress.",
      "He is reading a book."
    ]
  }`,
});

const generateSentencesFlow = ai.defineFlow(
  {
    name: 'generateSentencesFlow',
    inputSchema: GenerateSentencesInputSchema,
    outputSchema: GenerateSentencesOutputSchema,
  },
  async input => {
    const {output} = await generateSentencesPrompt(input);
    return output!;
  }
);
