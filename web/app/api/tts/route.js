import { NextResponse } from 'next/server';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;

// Gemini TTS returns raw PCM (LINEAR16, 24kHz). Wrap in WAV so the browser can decode it.
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const dataLen = pcm.length;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  buf.writeUInt16LE(channels * bitsPerSample / 8, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  pcm.copy(buf, 44);
  return buf;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

  const { text } = await request.json();
  if (!text?.trim()) return NextResponse.json({ error: 'no text' }, { status: 400 });

  const abort = new AbortController();
  const tid = setTimeout(() => abort.abort(), 20_000);

  try {
    const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      signal: abort.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' }
            }
          }
        }
      })
    });

    const body = await res.text();
    if (!res.ok) {
      console.error('[tts] Gemini error', res.status, body.slice(0, 300));
      return NextResponse.json({ error: `Gemini ${res.status}` }, { status: 502 });
    }

    const data = JSON.parse(body);
    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) return NextResponse.json({ error: 'no audio in response' }, { status: 500 });

    const pcm = Buffer.from(inlineData.data, 'base64');
    const wav = pcmToWav(pcm);
    return new Response(wav, { headers: { 'Content-Type': 'audio/wav' } });
  } finally {
    clearTimeout(tid);
  }
}
