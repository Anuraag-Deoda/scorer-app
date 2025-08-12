import { NextRequest, NextResponse } from 'next/server';
import { runFlow } from '@genkit-ai/flow';
import { determineManOfTheMatch } from '@/ai/flows/determine-man-of-the-match';

export async function POST(req: NextRequest) {
  try {
    const { scoreboardInnings1, scoreboardInnings2 } = await req.json();

    if (!scoreboardInnings1) {
      return NextResponse.json({ error: 'Scoreboard for innings 1 is required' }, { status: 400 });
    }

    console.log('Received scoreboards:', { scoreboardInnings1, scoreboardInnings2 });
    const manOfTheMatch = await runFlow(determineManOfTheMatch, {
        scoreboardInnings1,
        scoreboardInnings2,
    });
    console.log('Man of the Match determined:', manOfTheMatch);

    if (typeof manOfTheMatch !== 'string') {
      console.error('Unexpected MOTM format:', manOfTheMatch);
      return NextResponse.json({ error: 'Failed to determine Man of the Match' }, { status: 500 });
    }

    return NextResponse.json({ manOfTheMatch });
  } catch (error) {
    console.error('Error determining Man of the Match:', error);
    return NextResponse.json({ error: 'Failed to determine Man of the Match' }, { status: 500 });
  }
}
