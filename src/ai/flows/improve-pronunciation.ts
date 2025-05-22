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
  accuracyPercentage: z.number().min(0).max(100).describe('The overall pronunciation accuracy percentage (0-100), calculated as (correct words / total words) * 100, rounded to the nearest whole number.'),
});
export type ImprovePronunciationOutput = z.infer<typeof ImprovePronunciationOutputSchema>;

export async function improvePronunciation(input: ImprovePronunciationInput): Promise<ImprovePronunciationOutput> {
  return improvePronunciationFlow(input);
}

const improvePronunciationPrompt = ai.definePrompt({
  name: 'improvePronunciationPrompt',
  input: {schema: ImprovePronunciationInputSchema},
  output: {schema: ImprovePronunciationOutputSchema},
  prompt: `You are an expert pronunciation tutor. Your task is to analyze the user's pronunciation of a given sentence based on their audio recording.

Sentence to analyze: "{{{sentence}}}"
User's audio recording: {{media url=userRecording}}

Please perform the following steps:
1.  Carefully listen to the user's recording and compare it against the provided sentence.
2.  Identify each word in the original sentence that the user pronounced correctly.
3.  Identify each word in the original sentence that the user pronounced incorrectly or missed. Punctuation attached to words should be considered part of the word for this analysis (e.g. if "end." is in the sentence, "end." is the token to evaluate).
4.  Provide concise, constructive, overall feedback on the user's pronunciation.
5.  Calculate an overall accuracy percentage. This should be (Number of correctly pronounced words / Total number of words in the original sentence) * 100. Round this percentage to the nearest whole number. Ensure the value is between 0 and 100. If the sentence has no words, accuracy is 0.

Return your analysis in the following JSON format. Ensure the output is valid JSON:
{
  "feedback": "string", // Your overall feedback text
  "correctWords": ["word1", "word2"], // Array of correctly pronounced words
  "incorrectWords": ["word3", "word4"], // Array of incorrectly pronounced words
  "accuracyPercentage": number // The calculated accuracy percentage (0-100)
}

Example:
Sentence: "The quick brown fox jumps."
User pronounces "The", "quick", "jumps." correctly. "brown" and "fox" are incorrect.
Total words = 5. Correct words = 3.
Calculation: (3 / 5) * 100 = 60.
Output: { ..., "accuracyPercentage": 60, ... }

If the input sentence is empty or contains only punctuation resulting in zero processable words, the accuracyPercentage should be 0.
Correct words: these are the words that the user pronounced correctly.
Incorrect words: these are the words that the user did not pronounce correctly.
Feedback: this is an overall summary of the quality of the user's pronunciation.
Accuracy Percentage: this is a number between 0 and 100 representing the percentage of words pronounced correctly.`,
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
