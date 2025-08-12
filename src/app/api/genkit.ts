import { configure } from 'genkit';
import { openAI } from 'genkitx-openai';
import { ollama } from 'genkitx-ollama';

configure({
  plugins: [
    openAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
    ollama({
      models: [
        {
          name: 'gemma',
          type: 'generate',
        },
      ],
      serverAddress: 'http://127.0.0.1:11434',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
