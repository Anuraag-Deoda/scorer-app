import { NextRequest, NextResponse } from 'next/server';
import { generateMatchCommentary } from '@/ai/flows/generate-match-commentary';
import { GenerateMatchCommentaryInput } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateMatchCommentaryInput;
    const result = await generateMatchCommentary(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error generating commentary:', error);
    return NextResponse.json({ error: 'Failed to generate commentary', details: error.message }, { status: 500 });
  }
}
