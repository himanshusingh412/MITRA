import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, profile, locale = 'en' } = body;

    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || 'gemini-3.1-flash-lite';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI_API_KEY is not configured on server' },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemInstruction = `You are MITRA, an empathetic, highly accurate AI assistant for Indian government schemes and social welfare benefits.
Target language/locale: ${locale}.
Context on user's profile: ${JSON.stringify(profile || {})}.
Answer clearly, accurately, concisely, and empathetically in the requested language.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nUser query: ${message}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const candidates = data.candidates || [];
    let text = 'Sorry, I could not process your request at the moment.';

    if (candidates.length > 0 && candidates[0].content?.parts?.length > 0) {
      text = candidates[0].content.parts[0].text;
    }

    return NextResponse.json({ text, model });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
