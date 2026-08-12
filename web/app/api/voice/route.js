import { NextResponse } from 'next/server';

// gemini-1.5-flash: GA, soporta audio inline sin restricciones de preview
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// iOS Safari graba video/mp4 aunque sea solo audio — Gemini acepta audio/mp4
function normalizeAudioMime(type) {
  if (!type || type === 'application/octet-stream') return 'audio/webm';
  if (type === 'video/mp4') return 'audio/mp4';
  return type;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

  const form = await request.formData();
  const audio = form.get('audio');
  if (!audio) return NextResponse.json({ error: 'no audio' }, { status: 400 });

  const buf = await audio.arrayBuffer();
  if (buf.byteLength < 100) {
    return NextResponse.json({ error: 'audio demasiado corto' }, { status: 400 });
  }

  const base64 = Buffer.from(buf).toString('base64');
  const mimeType = normalizeAudioMime(audio.type);

  const abort = new AbortController();
  setTimeout(() => abort.abort(), 25_000);

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    signal: abort.signal,
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

  const body = await res.text();
  if (!res.ok) {
    console.error('[voice] Gemini error', res.status, body.slice(0, 300));
    return NextResponse.json({ error: `Gemini ${res.status}: ${body.slice(0, 200)}` }, { status: 502 });
  }

  const data = JSON.parse(body);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  return NextResponse.json({ text });
}
