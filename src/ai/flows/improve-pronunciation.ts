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
  accuracyPercentage: z.number().min(0).max(100).describe('The overall pronunciation accuracy percentage (0-100), calculated as (number of correct words / total number of words in sentence) * 100, rounded to the nearest whole number.'),
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

Please perform the following steps meticulously:
1.  Carefully listen to the user's recording and compare it against the provided sentence: "{{{sentence}}}".
2.  Tokenize the original sentence \`{{{sentence}}}\` into words. Treat words as space-separated tokens. Punctuation attached to a word (e.g., "fox.") should be considered part of that word token. These are the "sentence words".
3.  For each sentence word:
    a.  Determine if the user pronounced it correctly based on their audio.
    b.  If pronounced correctly, add the exact sentence word (maintaining its original casing and punctuation) to the \`correctWords\` array.
    c.  If pronounced incorrectly or missed, add the exact sentence word (maintaining its original casing and punctuation) to the \`incorrectWords\` array.
    d.  **Crucially, each sentence word must appear in EITHER the \`correctWords\` array OR the \`incorrectWords\` array, but NEVER in both.** Ensure there is no overlap. Every word from the original tokenized sentence must be accounted for in one of these two lists.
4.  Provide concise, constructive, overall feedback on the user's pronunciation for the \`feedback\` field. This feedback should be a general summary.
5.  Calculate the \`accuracyPercentage\`:
    a.  Let \`NumCorrect\` be the total number of words in the \`correctWords\` array (populated in step 3).
    b.  Let \`NumIncorrect\` be the total number of words in the \`incorrectWords\` array (populated in step 3).
    c.  Let \`TotalWordsInSentence\` be \`NumCorrect + NumIncorrect\`. This sum MUST equal the total number of tokens identified in step 2.
    d.  If \`TotalWordsInSentence\` is 0 (e.g., if the original sentence was empty), the \`accuracyPercentage\` is 0.
    e.  Otherwise, calculate \`(NumCorrect / TotalWordsInSentence) * 100\`.
    f.  Round the result to the nearest whole number. This is the \`accuracyPercentage\`. Ensure it is a number between 0 and 100.

Return your analysis in the following JSON format. Ensure the output is valid JSON and all fields are populated according to the schema. The words in \`correctWords\` and \`incorrectWords\` arrays must be exactly as they appear in the original sentence.
{
  "feedback": "string",
  "correctWords": ["word1", "word2.0"],
  "incorrectWords": ["Word3", "word4!"],
  "accuracyPercentage": number
}

Example for accuracy calculation:
Sentence: "The quick brown fox jumps."
User pronounces "The", "quick", "jumps." correctly. "brown" and "fox" are incorrect.
Based on analysis, \`correctWords\` would be \`["The", "quick", "jumps."]\` (NumCorrect = 3)
and \`incorrectWords\` would be \`["brown", "fox"]\` (NumIncorrect = 2).
TotalWordsInSentence = 3 + 2 = 5.
Calculation: (3 / 5) * 100 = 60.
Output: { ..., "correctWords": ["The", "quick", "jumps."], "incorrectWords": ["brown", "fox"], "accuracyPercentage": 60, ... }

If the input sentence is empty or contains only punctuation resulting in zero processable words, the accuracyPercentage should be 0, correctWords should be an empty array, and incorrectWords should be an empty array.
Feedback: this is an overall summary of the quality of the user's pronunciation.
Correct words: these are the words that the user pronounced correctly.
Incorrect words: these are the words that the user did not pronounce correctly.
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

