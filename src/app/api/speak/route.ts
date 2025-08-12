import { exec } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text to speak is required' }, { status: 400 });
    }

    // Basic sanitization to prevent command injection
    const sanitizedText = text.replace(/(["'$`\\])/g, '\\$1');

    await execPromise(`say -r 200 "${sanitizedText} "`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error executing say command:', error);
    return NextResponse.json({ error: 'Failed to execute say command' }, { status: 500 });
  }
}
