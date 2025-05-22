// src/lib/textUtils.ts

/**
 * Segments a given text into an array of sentences.
 * Uses a regular expression to identify sentence boundaries.
 * @param text The input text to segment.
 * @returns An array of strings, where each string is a sentence.
 */
export function segmentSentences(text: string): string[] {
  if (!text.trim()) {
    return [];
  }
  // This regex tries to capture sentences ending with ., !, or ?
  // It handles multiple spaces and newlines between sentences.
  const sentences = text.match(/\S.*?[.!?](?=\s+|$)|\S.+/g);
  return sentences ? sentences.map(s => s.trim()).filter(s => s.length > 0) : [];
}

/**
 * Converts a Blob object to a Base64 encoded data URI.
 * @param blob The Blob to convert.
 * @returns A promise that resolves with the Base64 data URI.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
