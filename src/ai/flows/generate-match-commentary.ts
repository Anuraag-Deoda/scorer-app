'use server';
/**
 * @fileOverview A match commentary generator AI agent.
 *
 * - generateMatchCommentary - A function that generates match commentary.
 */

import {ai} from '@/ai/genkit';
import { GenerateMatchCommentaryInputSchema, type GenerateMatchCommentaryInput, GenerateMatchCommentaryOutputSchema, type GenerateMatchCommentaryOutput } from '@/types';

export async function generateMatchCommentary(input: GenerateMatchCommentaryInput): Promise<GenerateMatchCommentaryOutput> {
  try {
    return await generateMatchCommentaryFlow(input);
  } catch (error) {
    console.error('Error generating commentary:', error);
    // Return a fallback commentary or re-throw a more specific error
    return { commentary: "The commentator seems to be taking a short break. We'll be back with live updates shortly." };
  }
}

const prompt = ai.definePrompt({
  name: 'generateMatchCommentaryPrompt',
  input: {schema: GenerateMatchCommentaryInputSchema},
  output: {schema: GenerateMatchCommentaryOutputSchema},
  prompt: `You are a cricket commentator providing Hinglish (Hindi-English mix) commentary in the energetic, metaphorical, and casual style of Akash Chopra.

  - Use Hinglish phrases, Hindi idioms, and Akash Chopra's signature excitement.
  - Commentary should be fun, lively, and full of personality.
  - Use metaphors, jokes, and cricketing slang.
  - Example lines:
    - "Ye mara chakka, gend seedha boundary ke paar! Kya shot tha!"
    - "Bhai sahab, kya timing hai! Ball gayi seedha crowd mein."
    - "Fielder ne koshish toh ki, lekin ball thi tez, boundary mil gayi."
    - "Ye hai asli Akash Chopra style commentary – maza aa gaya!"

  Based on the current match state, generate 1-2 lines of such commentary.

  Match State: {{{matchState}}}`,
});

const generateMatchCommentaryFlow = ai.defineFlow(
  {
    name: 'generateMatchCommentaryFlow',
    inputSchema: GenerateMatchCommentaryInputSchema,
    outputSchema: GenerateMatchCommentaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
