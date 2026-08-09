'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, getSessionToken, setSessionToken, CONFIGURED } from '../lib/supabase';

const SHELL = { height: '100dvh', background: '#fde8e4', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px', fontFamily: 'Sora, sans-serif' };
const CARD = { background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 12px 40px rgba(240,78,35,0.12)' };
const INPUT = { width: '100%', boxSizing: 'border-box', background: '#fde8e4', border: '1.5px solid #f0d8d2', borderRadius: 14, padding: '12px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: 'Sora, sans-serif', outline: 'none' };
const BUTTON = { width: '100%', marginTop: 12, background: '#f04e23', border: 'none', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif' };
const TITLE = { fontSize: 20, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 };
const HINT = { fontSize: 12, fontWeight: 500, color: '#b0a09a', marginBottom: 16, lineHeight: 1.5 };

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('loading');
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (!CONFIGURED) { setStatus('unconfigured'); return; }
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'ready' : 'anon');
      setHasToken(Boolean(getSessionToken()));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setStatus(session ? 'ready' : 'anon');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleToken = useCallback((token) => {
    setSessionToken(token);
    setHasToken(true);
  }, []);

  if (status === 'loading') return <main style={SHELL} />;
  if (status === 'unconfigured') return <Unconfigured />;
  if (status === 'anon') return <SignIn />;
  if (!hasToken) return <PairDevice onSubmit={handleToken} />;
  return children;
}

function Unconfigured() {
  return (
    <main style={SHELL}>
      <div style={CARD}>
        <div style={TITLE}>Falta configurar Supabase</div>
        <div style={{ ...HINT, marginBottom: 0 }}>
          Define <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en el
          entorno del despliegue y vuelve a publicar.
        </div>
      </div>
    </main>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <main style={SHELL}>
      <div style={CARD}>
        <div style={TITLE}>CC Controller</div>
        {sent ? (
          <div style={HINT}>Te enviamos un enlace a <strong>{email}</strong>. Ábrelo en este mismo teléfono para entrar.</div>
        ) : (
          <>
            <div style={HINT}>Entra con tu correo. Solo las cuentas autorizadas pueden abrir el canal de tu Mac.</div>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              style={INPUT}
            />
            {error && <div style={{ ...HINT, color: '#dc2626', marginTop: 10, marginBottom: 0 }}>{error}</div>}
            <button onClick={handleSubmit} disabled={busy} style={{ ...BUTTON, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Enviando...' : 'Enviar enlace de acceso'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function PairDevice({ onSubmit }) {
  const [token, setToken] = useState('');

  return (
    <main style={SHELL}>
      <div style={CARD}>
        <div style={TITLE}>Emparejar con tu Mac</div>
        <div style={HINT}>
          Pega el <code>SESSION_TOKEN</code> de <code>~/.config/cc-controller/.env</code>. Se guarda solo en este
          dispositivo; nunca viaja al servidor ni se compila en la app.
        </div>
        <input
          type="password"
          autoComplete="off"
          placeholder="SESSION_TOKEN"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && token.trim()) onSubmit(token.trim()); }}
          style={INPUT}
        />
        <button onClick={() => token.trim() && onSubmit(token.trim())} style={BUTTON}>Emparejar</button>
      </div>
    </main>
  );
}
