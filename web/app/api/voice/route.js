import { NextResponse } from 'next/server';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

  const form = await request.formData();
  const audio = form.get('audio');
  if (!audio) return NextResponse.json({ error: 'no audio' }, { status: 400 });

  const buf = await audio.arrayBuffer();
  const base64 = Buffer.from(buf).toString('base64');
  const mimeType = audio.type || 'audio/webm';

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: 'Transcribe this audio exactly as spoken. Return only the transcription, nothing else.' },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 502 });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  return NextResponse.json({ text });
}
