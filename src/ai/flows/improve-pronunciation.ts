// src/ai/flows/improve-pronunciation.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for providing pronunciation feedback.
 *
 * - improvePronunciation - A function that takes a sentence and user's recording and returns feedback on pronunciation.
 * - ImprovePronunciationInput - The input type for the improvePronunciation function.
 * - ImprovePronunciationOutput - The return type for the improvePronunciation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImprovePronunciationInputSchema = z.object({
  sentence: z.string().describe('The sentence to be pronounced.'),
  userRecording: z
    .string()
    .describe(
      "The user's recording of the sentence, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ImprovePronunciationInput = z.infer<typeof ImprovePronunciationInputSchema>;

const ImprovePronunciationOutputSchema = z.object({
  feedback: z.string().describe('Feedback on the user\'s pronunciation.'),
  correctWords: z.array(z.string()).describe('Words that were pronounced correctly.'),
  incorrectWords: z.array(z.string()).describe('Words that were not pronounced correctly.'),
});
export type ImprovePronunciationOutput = z.infer<typeof ImprovePronunciationOutputSchema>;

export async function improvePronunciation(input: ImprovePronunciationInput): Promise<ImprovePronunciationOutput> {
  return improvePronunciationFlow(input);
}

const improvePronunciationPrompt = ai.definePrompt({
  name: 'improvePronunciationPrompt',
  input: {schema: ImprovePronunciationInputSchema},
  output: {schema: ImprovePronunciationOutputSchema},
  prompt: `You are a pronunciation tutor. Provide feedback to the user on their pronunciation of the following sentence.

Sentence: {{{sentence}}}
User Recording: {{media url=userRecording}}

Analyze the user's pronunciation and provide feedback on the accuracy of their pronunciation, specifically indicating which words were pronounced correctly and incorrectly.

Output the feedback in a structured format including overall feedback, a list of correctly pronounced words, and a list of incorrectly pronounced words.

Correct words: these are the words that the user pronounced correctly.
Incorrect words: these are the words that the user did not pronounce correctly.
Feedback: this is an overall summary of the quality of the user's pronunciation.`, // Updated prompt instructions
});

const improvePronunciationFlow = ai.defineFlow(
  {
    name: 'improvePronunciationFlow',
    inputSchema: ImprovePronunciationInputSchema,
    outputSchema: ImprovePronunciationOutputSchema,
  },
  async input => {
    const {output} = await improvePronunciationPrompt(input);
    return output!;
  }
);

