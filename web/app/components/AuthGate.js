'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, getSessionToken, setSessionToken, setSessionId, CONFIGURED } from '../lib/supabase';

const F = "'Sora', -apple-system, BlinkMacSystemFont, sans-serif";

function LogoMark({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 302.21 302.21" xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: Math.round(size * 0.225), flexShrink: 0, display: 'block' }}>
      <rect width="302.21" height="302.21" rx="68" ry="68" fill="#f0f0f0"/>
      <path fill="#ff582a" d="M242.73,157.22h0c-7.37,0-13.92,4.45-16.91,11.19-2.08,4.69-5.07,8.99-8.99,12.9-8.11,8.11-17.83,12.29-29.14,12.57-.4,0-.79.03-1.19.03-11.82,0-21.91-4.18-30.26-12.53-.96-.96-1.86-1.94-2.7-2.95-6.55-7.75-9.83-16.85-9.83-27.32s3.29-19.6,9.87-27.36c-.84-1.01-1.74-2-2.7-2.96-8.39-8.31-18.5-12.47-30.31-12.47-.4,0-.8.02-1.2.03-8.22,12.57-12.35,26.82-12.35,42.77,0,15.96,4.13,30.21,12.35,42.77,3.08,4.71,6.71,9.18,10.94,13.42,7.07,7.07,14.81,12.51,23.2,16.36,10.05,4.61,21.04,6.93,32.99,6.93,21.93,0,40.68-7.78,56.25-23.36,7.34-7.34,12.94-15.42,16.8-24.22,5.33-12.16-3.55-25.8-16.83-25.8Z"/>
      <path fill="#ff582a" d="M187.74,108.33c11.29.28,20.99,4.42,29.1,12.45,3.91,3.96,6.91,8.29,8.98,13,2.98,6.75,9.54,11.21,16.92,11.21h0c13.27,0,22.14-13.62,16.83-25.78-3.86-8.83-9.46-16.95-16.82-24.35-15.57-15.49-34.32-23.23-56.25-23.23-11.93,0-22.91,2.32-32.95,6.92,8.4,3.84,16.16,9.27,23.25,16.32,4.23,4.25,7.86,8.75,10.93,13.48Z"/>
      <path fill="#ff9477" d="M176.78,157.22c-7.37,0-13.92,4.45-16.91,11.19-1.58,3.56-3.69,6.9-6.33,10.01.85,1,1.75,1.99,2.7,2.95,8.35,8.36,18.44,12.53,30.26,12.53.4,0,.79-.02,1.19-.03,2.28-3.49,4.26-7.1,5.91-10.86,5.33-12.16-3.55-25.8-16.83-25.8Z"/>
      <path fill="#ff9477" d="M119.38,193.88c-11.31-.27-21.01-4.43-29.08-12.51-8.36-8.35-12.53-18.44-12.53-30.26s4.18-21.91,12.53-30.26c7.74-7.74,18.17-12.2,29.08-12.51.4-.01.8-.03,1.2-.03,11.81,0,21.91,4.16,30.31,12.47.95.97,1.85,1.95,2.7,2.96,2.62,3.13,4.72,6.48,6.29,10.03,2.98,6.75,9.54,11.21,16.92,11.21h0c13.27,0,22.14-13.62,16.83-25.78-1.64-3.76-3.62-7.38-5.89-10.87-3.07-4.73-6.7-9.23-10.93-13.48-7.09-7.05-14.84-12.48-23.25-16.32-10.06-4.6-21.06-6.92-33-6.92-21.93,0-40.66,7.76-56.19,23.29-15.53,15.53-23.3,34.26-23.3,56.19s7.76,40.66,23.3,56.19c15.53,15.53,34.26,23.3,56.19,23.3,11.93,0,22.91-2.32,32.96-6.93-8.39-3.85-16.13-9.29-23.2-16.36-4.23-4.23-7.87-8.71-10.94-13.42Z"/>
    </svg>
  );
}

function Shell({ hero, card, footer }) {
  return (
    <main style={{ minHeight: '100dvh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', fontFamily: F, overscrollBehavior: 'none' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 32px 40px', gap: 14 }}>
        {hero}
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: '36px 36px 0 0', padding: '28px 20px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 8px 40px rgba(240,78,35,0.10)' }}>
          {card}
        </div>
        <div style={{ textAlign: 'center', padding: '16px 0 max(20px, env(safe-area-inset-bottom, 20px))' }}>
          {footer}
        </div>
      </div>
    </main>
  );
}

async function checkAccess(session) {
  // Check user_access table
  const { data } = await supabase
    .from('user_access')
    .select('trial_ends_at, paid_at')
    .eq('user_id', session.user.id)
    .single();

  if (data?.paid_at) return 'paid';

  const trialEnds = data?.trial_ends_at
    ? new Date(data.trial_ends_at)
    : new Date(new Date(session.user.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);

  return new Date() < trialEnds ? 'trial' : 'expired';
}

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('loading');
  const [hasToken, setHasToken] = useState(false);
  const [access, setAccess] = useState(null); // null | 'paid' | 'trial' | 'expired'

  useEffect(() => {
    if (!CONFIGURED) { setStatus('unconfigured'); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const acc = await checkAccess(data.session);
        setAccess(acc);
      }
      setStatus(data.session ? 'ready' : 'anon');
      setHasToken(Boolean(getSessionToken()));
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session) {
        const acc = await checkAccess(session);
        setAccess(acc);
      }
      setStatus(session ? 'ready' : 'anon');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleToken = useCallback((token, sessionId) => {
    setSessionToken(token);
    if (sessionId) setSessionId(sessionId);
    setHasToken(true);
  }, []);

  if (status === 'loading') return <main style={{ height: '100dvh', background: '#1a1a1a' }} />;
  if (status === 'unconfigured') return <Unconfigured />;
  if (status === 'anon') return <SignIn />;
  if (!hasToken) return <PairDevice onSubmit={handleToken} />;
  if (access === 'expired') return <PaywallScreen />;
  return children;
}

function SignIn() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'confirm'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    const addr = email.trim();
    if (!addr || !password) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: addr, password });
    setBusy(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message);
  }

  async function handleSignup() {
    const addr = email.trim();
    if (!addr || !password) return;
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({ email: addr, password });
    setBusy(false);
    if (err) setError(err.message);
    else setMode('confirm');
  }

  const hero = (
    <>
      <LogoMark size={80} />
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          CC Controller
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em' }}>
          Controla Claude Code desde tu iPhone
        </p>
      </div>
    </>
  );

  const inputStyle = { width: '100%', boxSizing: 'border-box', background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '14px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: F, outline: 'none', minHeight: 52, touchAction: 'manipulation' };
  const btnStyle = (disabled) => ({ width: '100%', marginTop: 12, background: disabled ? '#c0a090' : '#f04e23', border: 'none', borderRadius: 14, padding: '15px 20px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: disabled ? 'default' : 'pointer', fontFamily: F, minHeight: 52, touchAction: 'manipulation', transition: 'background 200ms' });

  const card = mode === 'confirm' ? (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#f04e23" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Confirma tu cuenta</p>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666666', lineHeight: 1.5 }}>
        Revisa <strong>{email}</strong> y abre el enlace de confirmación. Luego vuelve aquí e inicia sesión.
      </p>
      <button onClick={() => setMode('login')} style={{ ...btnStyle(false), marginTop: 20 }}>
        Ir a iniciar sesión
      </button>
    </div>
  ) : (
    <>
      <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: '#666666', lineHeight: 1.55 }}>
        {mode === 'login' ? 'Inicia sesión con tu cuenta.' : 'Crea una cuenta nueva.'}
      </p>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, fontFamily: F }}>
        Correo electrónico
      </label>
      <input
        type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com"
        value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') document.getElementById('cc-pwd')?.focus(); }}
        style={inputStyle}
      />
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '14px 0 6px', fontFamily: F }}>
        Contraseña
      </label>
      <input
        id="cc-pwd"
        type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••"
        value={password} onChange={e => setPassword(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleSignup(); }}
        style={inputStyle}
      />
      {error && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{error}</p>}
      <button onClick={mode === 'login' ? handleLogin : handleSignup} disabled={busy} style={btnStyle(busy)}>
        {busy ? (mode === 'login' ? 'Entrando...' : 'Creando cuenta...') : (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
      </button>
      <button
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
        style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', padding: '10px', fontSize: 13, fontWeight: 600, color: '#f04e23', cursor: 'pointer', fontFamily: F }}
      >
        {mode === 'login' ? '¿Sin cuenta? Crear una' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </>
  );

  const footer = (
    <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#999999', letterSpacing: '0.03em' }}>
      kitifica.com · CC Controller
    </p>
  );

  return <Shell hero={hero} card={card} footer={footer} />;
}

function PairDevice({ onSubmit }) {
  const [code, setCode] = useState('');

  function handleSubmit() {
    const val = code.trim();
    if (!val) return;
    // Pairing code format: "sessionId:token" or just "token" (legacy)
    const idx = val.indexOf(':');
    if (idx > 0 && idx < val.length - 1) {
      onSubmit(val.slice(idx + 1), val.slice(0, idx));
    } else {
      onSubmit(val, null);
    }
  }

  const hero = (
    <>
      <LogoMark size={80} />
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Emparejar Mac
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em' }}>
          Conecta este iPhone con tu Mac
        </p>
      </div>
    </>
  );

  const card = (
    <>
      <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: '#666666', lineHeight: 1.55 }}>
        Pega el código de emparejamiento de la app de escritorio. Se guarda solo en este dispositivo.
      </p>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, fontFamily: F }}>
        Código de emparejamiento
      </label>
      <input
        type="password"
        autoComplete="off"
        placeholder="••••••••••••••••"
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        style={{ width: '100%', boxSizing: 'border-box', background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '14px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: F, outline: 'none', minHeight: 52, touchAction: 'manipulation' }}
      />
      <button
        onClick={handleSubmit}
        style={{ width: '100%', marginTop: 12, background: '#f04e23', border: 'none', borderRadius: 14, padding: '15px 20px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F, minHeight: 52, touchAction: 'manipulation' }}
      >
        Emparejar dispositivo
      </button>
    </>
  );

  const footer = (
    <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#999999', letterSpacing: '0.03em' }}>
      kitifica.com · CC Controller
    </p>
  );

  return <Shell hero={hero} card={card} footer={footer} />;
}

function PaywallScreen() {
  return (
    <Shell
      hero={
        <>
          <LogoMark size={80} />
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Prueba finalizada
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em' }}>
              Tu período de 7 días ha terminado
            </p>
          </div>
          <div style={{ background: 'rgba(240,78,35,0.15)', border: '1px solid rgba(240,78,35,0.3)', borderRadius: 20, padding: '8px 20px' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#ff582a', letterSpacing: '-0.04em' }}>$4.99</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(240,78,35,0.7)', marginLeft: 6 }}>acceso de por vida</span>
          </div>
        </>
      }
      card={
        <>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: '#666666', lineHeight: 1.55 }}>
            Un solo pago. Sin suscripción. Acceso permanente a CC Controller.
          </p>
          <a
            href="/pago"
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box',
              background: '#f04e23', border: 'none', borderRadius: 14,
              padding: '15px 20px', fontSize: 15, fontWeight: 700,
              color: '#fff', textAlign: 'center', textDecoration: 'none',
              fontFamily: F, touchAction: 'manipulation',
            }}
          >
            Pagar $4.99 →
          </a>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', padding: '10px', fontSize: 13, fontWeight: 600, color: '#999999', cursor: 'pointer', fontFamily: F }}
          >
            Cerrar sesión
          </button>
        </>
      }
      footer={<p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#999999', letterSpacing: '0.03em' }}>kitifica.com · CC Controller</p>}
    />
  );
}

function Unconfigured() {
  return (
    <Shell
      hero={<><LogoMark size={80} /><h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>CC Controller</h1></>}
      card={
        <>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>Falta configurar Supabase</p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666666', lineHeight: 1.55 }}>
            Define <code style={{ background: '#f0f0f0', borderRadius: 4, padding: '1px 5px', fontSize: 11 }}>NEXT_PUBLIC_SUPABASE_URL</code> y <code style={{ background: '#f0f0f0', borderRadius: 4, padding: '1px 5px', fontSize: 11 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en Netlify y redespliega.
          </p>
        </>
      }
      footer={<p style={{ margin: 0, fontSize: 11, color: '#999999' }}>kitifica.com</p>}
    />
  );
}
