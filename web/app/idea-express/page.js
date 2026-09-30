'use client';
import { useState } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PRECIO = 1.29;

function formatCard(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val) {
  let v = val.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
  return v;
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#0A0A0A', border: '1px solid #2A2A2A',
  borderRadius: 8, color: '#E0E0E0', padding: '12px 14px', fontSize: 14, outline: 'none',
  fontFamily: 'inherit',
};
const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: '#525252', marginBottom: 8, display: 'block',
};

export default function IdeaExpress() {
  const [idea, setIdea] = useState('');
  const [paraQuien, setParaQuien] = useState('');
  const [porQue, setPorQue] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function pagar() {
    setError('');
    if (!idea.trim()) return setError('Contanos tu idea en una frase.');
    if (!paraQuien.trim()) return setError('¿Para quién es?');
    if (!porQue.trim()) return setError('¿Por qué ahora / por qué vos?');
    if (!nombre.trim()) return setError('Ingresá tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Correo inválido.');

    const rawCard = card.replace(/\D/g, '');
    if (rawCard.length < 15) return setError('Número de tarjeta inválido.');
    if (!/^4/.test(rawCard) && !/^5[1-5]/.test(rawCard) && !/^2[2-7]/.test(rawCard)) return setError('Solo Visa y Mastercard.');
    if (!expiry.includes('/') || expiry.length < 5) return setError('Vencimiento inválido. Formato MM/AA.');
    if (!cvv || cvv.replace(/\D/g, '').length < 3) return setError('CVV debe tener 3 dígitos.');

    const [mesStr, anioStr] = expiry.split('/');
    const mes = parseInt(mesStr, 10);
    const anio = parseInt('20' + anioStr, 10);
    if (isNaN(mes) || mes < 1 || mes > 12) return setError('Mes inválido.');
    const now = new Date();
    if (anio < now.getFullYear() || (anio === now.getFullYear() && mes < now.getMonth() + 1)) return setError('Tarjeta vencida.');

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/crear-idea-express-wompi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea_text: idea,
          answers: { para_quien: paraQuien, por_que: porQue },
          nombre, email,
          numero_tarjeta: rawCard,
          cvv: cvv.replace(/\D/g, ''),
          mes_vencimiento: mes,
          anio_vencimiento: anio,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setLoading(false); return setError(data.error || 'Error al procesar el pago.'); }
      window.location.href = data.url3ds;
    } catch {
      setLoading(false);
      setError('Error de conexión. Verificá tu internet.');
    }
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#0A0A0A', display: 'flex', justifyContent: 'center', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#E0E0E0', margin: '0 0 8px' }}>Idea Express</h1>
          <p style={{ fontSize: 13, color: '#525252', margin: 0, lineHeight: 1.5 }}>
            Un pulso rápido a tu idea, ahora, desde el celular. Sin instalar nada.
          </p>
        </div>

        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 20, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tu idea en una frase</label>
            <textarea value={idea} onChange={e => setIdea(e.target.value)}
              placeholder="Ej. una app para que restaurantes vean sus mesas en tiempo real"
              rows={3} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>¿Para quién es?</label>
            <input value={paraQuien} onChange={e => setParaQuien(e.target.value)}
              placeholder="Ej. dueños de restaurantes pequeños" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>¿Por qué ahora, por qué vos?</label>
            <input value={porQue} onChange={e => setPorQue(e.target.value)}
              placeholder="Ej. curro en un restaurante y veo el problema a diario" style={inputStyle} />
          </div>

          <div style={{ height: 1, background: '#2A2A2A', margin: '4px 0 20px' }} />

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Nombre y correo</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Nombre completo" autoComplete="name"
              style={{ ...inputStyle, marginBottom: 8 }} />
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Correo electrónico" type="email" autoComplete="email" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tarjeta (Visa / Mastercard)</label>
            <input value={card} onChange={e => setCard(formatCard(e.target.value))}
              placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number"
              style={{ ...inputStyle, fontFamily: 'monospace', marginBottom: 8 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp" maxLength={5}
                style={{ ...inputStyle, fontFamily: 'monospace' }} />
              <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="CVV" inputMode="numeric" autoComplete="cc-csc" maxLength={3}
                style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#EF4444', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button onClick={pagar} disabled={loading}
            style={{
              width: '100%', padding: '15px 0',
              background: loading ? '#2A2A2A' : '#7c3aed',
              color: loading ? '#525252' : '#fff',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(124,58,237,0.35)', transition: 'all 200ms',
            }}>
            {loading ? 'Procesando...' : `Pagar $${PRECIO.toFixed(2)} y ver veredicto →`}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#525252' }}>
            Pago seguro con <strong style={{ color: '#888' }}>Wompi</strong> · SSL 256-bit · 3DS
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#3A3A3A', marginTop: 16, lineHeight: 1.6 }}>
          Esto es un pulso rápido, no el análisis completo.<br />
          Para los 14 criterios + validación con Google Trends, <a href="/#claude-code" style={{ color: '#7c3aed' }}>instalá el Skill gratis</a>.
        </p>
      </div>
    </main>
  );
}
