'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useIsDesktop } from '../lib/useIsDesktop';

const PACKS = [
  { id: 'inicio',       name: 'Inicio',       desc: '5 proyectos · $0.80/proy',  price: '$4',  badge: null },
  { id: 'creador',      name: 'Creador',      desc: '12 proyectos · $0.75/proy', price: '$9',  badge: 'Popular' },
  { id: 'estudio',      name: 'Estudio',      desc: '20 proyectos · $0.60/proy', price: '$12', badge: '25% ahorro' },
  { id: 'api_lifetime', name: 'Trae tu API',  desc: 'Proyectos ilimitados · pago único', price: '$29', origPrice: '$39', badge: 'De por vida' },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

function formatCard(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val) {
  let v = val.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
  return v;
}

export default function BuyMinutes({ onClose, onSuccess, initialPack = 'creador' }) {
  const isDesktop = useIsDesktop();
  const [pack, setPack] = useState(initialPack);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmail(data.user.email);
    });
  }, []);

  const pagar = async () => {
    setError('');
    const rawCard = card.replace(/\D/g, '');
    if (!nombre.trim()) return setError('Ingresa tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Correo inválido.');
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return setError('Sesión expirada. Recarga la página.');

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/crear-minutos-wompi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          pack, nombre, email,
          numero_tarjeta: rawCard,
          cvv: cvv.replace(/\D/g, ''),
          mes_vencimiento: mes,
          anio_vencimiento: anio,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setLoading(false); return setError(data.error || 'Error al procesar el pago.'); }
      localStorage.setItem('ccc_txn', data.txn_id);
      window.location.href = data.url3ds;
    } catch {
      setLoading(false);
      setError('Error de conexión. Verifica tu internet.');
    }
  };

  const selectedPack = PACKS.find(p => p.id === pack);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', flexDirection: 'column',
      justifyContent: isDesktop ? 'center' : 'flex-end', alignItems: isDesktop ? 'center' : 'stretch',
      padding: isDesktop ? 24 : 0, boxSizing: 'border-box',
    }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
      <div style={{
        position: 'relative', background: '#141414', width: isDesktop ? '100%' : undefined,
        maxWidth: isDesktop ? 440 : undefined,
        borderRadius: isDesktop ? 20 : '16px 16px 0 0', border: isDesktop ? '1px solid #2A2A2A' : undefined, borderTop: '1px solid #2A2A2A',
        padding: `20px 20px calc(20px + env(safe-area-inset-bottom, 0px))`,
        maxHeight: '90dvh', overflowY: 'auto', boxShadow: isDesktop ? '0 24px 64px rgba(0,0,0,0.5)' : undefined,
      }}>
        <div style={{ width: 36, height: 4, background: '#2A2A2A', borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#E0E0E0' }}>Comprar proyectos</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>

        {/* Selección de plan */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 10 }}>Plan</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PACKS.map(p => {
              const active = pack === p.id;
              return (
                <button key={p.id} onClick={() => setPack(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    background: active ? 'rgba(124,58,237,0.08)' : '#0A0A0A',
                    border: `1.5px solid ${active ? '#7c3aed' : '#2A2A2A'}`,
                    borderRadius: 12, cursor: 'pointer', transition: 'all 150ms', textAlign: 'left',
                  }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? '#7c3aed' : '#2A2A2A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#E0E0E0' : '#888' }}>{p.name}</span>
                      {p.badge && <span style={{ fontSize: 9, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.15)', borderRadius: 4, padding: '1px 6px' }}>{p.badge}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#525252', marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <span style={{ textAlign: 'right' }}>
                    {p.origPrice && <s style={{ fontSize: 10, color: '#525252', display: 'block', lineHeight: 1 }}>{p.origPrice}</s>}
                    <span style={{ fontSize: 15, fontWeight: 800, color: active ? '#7c3aed' : '#525252' }}>{p.price}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Separador */}
        <div style={{ height: 1, background: '#2A2A2A', margin: '4px 0 20px' }} />

        {/* Datos personales */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 10 }}>Datos</div>
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Nombre completo" autoComplete="name"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E0E0E0', padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 8 }} />
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Correo electrónico" type="email" autoComplete="email"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E0E0E0', padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        </div>

        {/* Datos de tarjeta */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 10 }}>Tarjeta (Visa / Mastercard)</div>
          <input value={card} onChange={e => setCard(formatCard(e.target.value))}
            placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E0E0E0', padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'monospace', marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp" maxLength={5}
              style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E0E0E0', padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
            <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="CVV" inputMode="numeric" autoComplete="cc-csc" maxLength={3}
              style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E0E0E0', padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
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
          {loading ? 'Procesando...' : `Pagar ${selectedPack?.price} →`}
        </button>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#525252' }}>
          Pago seguro con <strong style={{ color: '#888' }}>Wompi</strong> · SSL 256-bit · 3DS
        </div>
      </div>
    </div>
  );
}
