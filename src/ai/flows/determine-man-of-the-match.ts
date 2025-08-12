import { defineFlow } from '@genkit-ai/flow';
import { z } from 'zod';
import { ai } from '../genkit';

const manOfTheMatchSchema = z.object({
  playerName: z.string(),
});

const determineManOfTheMatchPrompt = ai.definePrompt(
  {
    name: 'determineManOfTheMatchPrompt',
    input: {
      schema: z.object({
        scoreboardInnings1: z.string(),
        scoreboardInnings2: z.string(),
      }),
    },
    output: { schema: manOfTheMatchSchema },
    prompt: `
      Based on the following scoreboards from a cricket match, determine the Man of the Match.
      Consider batting performance (runs scored, strike rate), bowling performance (wickets taken, economy rate), and overall impact on the match.

      Innings 1 Scoreboard:
      {{{scoreboardInnings1}}}

      Innings 2 Scoreboard:
      {{{scoreboardInnings2}}}

      Who is the Man of the Match? Please return a JSON object with the key "playerName" and the value as the player's name.
    `,
  },
);

export const determineManOfTheMatch = defineFlow(
  {
    name: 'determineManOfTheMatch',
    inputSchema: z.object({
      scoreboardInnings1: z.string(),
      scoreboardInnings2: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await determineManOfTheMatchPrompt(input);
    if (!output) {
      return "Could not determine Man of the Match";
    }
    console.log('Man of the Match:', output.playerName);
    return output.playerName;
  }
);
