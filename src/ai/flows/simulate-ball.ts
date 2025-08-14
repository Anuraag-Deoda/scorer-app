import { defineFlow, run } from '@genkit-ai/flow';
import { z } from 'zod';
import { ai } from '../genkit';
import { SimulateBallInputSchema, SimulateBallOutputSchema } from '@/types';

export const simulateBall = defineFlow(
  {
    name: 'simulateBall',
    inputSchema: SimulateBallInputSchema,
    outputSchema: SimulateBallOutputSchema,
  },
  async (input) => {
    const llmResponse = await run('google-ai-generate', async () => ai.generate(`
        You are a cricket simulation expert. Based on the following match context, predict the outcome of the next ball.
        Context: ${input.matchContext}
        Your response should be a JSON object with the exact keys: "event", "runs", "extras", "wicketType", "fielderId".
        - "event": "run", "w", "wd", "nb", "lb", "b"
        - "runs": Number of runs scored off the bat.
        - "extras": Number of extra runs.
        - "wicketType": "BOWLED", "CAUGHT", "LBW", "RUN_OUT", "STUMPED" (only if event is "w").
        - "fielderId": ID of the fielder involved in a dismissal (only for "CAUGHT", "RUN_OUT", "STUMPED").
      `));

    return llmResponse.output();
  }
);
