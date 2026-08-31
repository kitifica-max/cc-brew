'use client';
import { useEffect, useState } from 'react';
import { supabase, CONFIGURED } from '../lib/supabase';
import { useIsDesktop } from '../lib/useIsDesktop';

const F = "'Sora', -apple-system, BlinkMacSystemFont, sans-serif";

function LogoMark({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 431.63 431.63" xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}>
      <rect fill="#ccc" width="431.63" height="431.63" rx="63.18" ry="63.18"/>
      <path fill="#0d0c0f" d="M149.06,121.13c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58v-172.21c0-5.07-4.37-9.08-9.42-8.58Z"/>
      <path fill="#0d0c0f" d="M252.81,121.13c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58v-172.21c0-5.07-4.37-9.08-9.42-8.58Z"/>
      <path fill="#0d0c0f" d="M337.9,215.79c17.85-7.43,30.39-25.03,30.39-45.57,0-25.6-19.5-46.65-44.45-49.1v-.02h-43.64c-4.05,0-7.34,3.28-7.34,7.34v174.72c0,4.05,3.28,7.34,7.34,7.34h42.82c.27.02.54.03.82,0,24.96-2.45,44.47-23.51,44.47-49.11,0-20.55-12.56-38.16-30.41-45.58Z"/>
    </svg>
  );
}

// Mark cuadrado con ícono + wordmark "CC Brew" ya integrado — usar donde el
// texto "CC Brew" sería redundante al lado del logo.
function LogoFull({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 431.63 431.63" xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}>
      <rect fill="#ccc" width="431.63" height="431.63" rx="63.18" ry="63.18"/>
      <path fill="#0d0c0f" d="M115.04,342.22c-2.21,10.25-9.94,17.72-23.71,17.72-17.43,0-25.67-12.34-25.67-27.97s8.5-28.57,26.24-28.57c14.64,0,21.73,8.59,23.07,17.78h-11.89c-1.15-4.24-4.1-8.46-11.57-8.46-9.8,0-13.59,8.82-13.59,18.82,0,9.29,3.28,19.08,13.91,19.08,7.76,0,10.2-5.2,11.24-8.4h11.96Z"/>
      <path fill="#0d0c0f" d="M167.34,342.22c-2.21,10.25-9.94,17.72-23.71,17.72-17.43,0-25.67-12.34-25.67-27.97s8.5-28.57,26.24-28.57c14.64,0,21.73,8.59,23.07,17.78h-11.89c-1.15-4.24-4.1-8.46-11.57-8.46-9.8,0-13.59,8.82-13.59,18.82,0,9.29,3.28,19.08,13.91,19.08,7.76,0,10.2-5.2,11.24-8.4h11.96Z"/>
      <path fill="#0d0c0f" d="M181.99,304.2h24.02c13.28,0,18.32,6.92,18.32,14.06,0,6.2-3.28,10.22-7,11.92,3.71,1.4,8.57,5.3,8.57,12.53,0,9.41-7.39,16.46-19.08,16.46h-24.83v-54.97ZM204.64,325.88c5.65,0,7.98-2.53,7.98-6.4s-3.05-6.11-7.64-6.11h-11.33v12.5h10.99ZM193.65,349.99h10.72c6.42,0,9.33-2.68,9.33-7.67,0-4.43-2.86-7.26-9.4-7.26h-10.66v14.93Z"/>
      <path fill="#0d0c0f" d="M233.83,329.1c0-4.1,0-7.74-.08-11.19h11.21c.15.92.3,5.02.3,7.25,1.82-4.72,6.22-8.16,13.24-8.2v10.9c-8.29-.21-13.24,2.02-13.24,13.33v17.99h-11.43v-30.07Z"/>
      <path fill="#0d0c0f" d="M273.61,340.98c0,5.16,2.59,10.21,8.28,10.21,4.76,0,6.12-1.91,7.2-4.41h11.44c-1.46,5.05-5.97,13.35-18.93,13.35s-19.49-10.16-19.49-20.99c0-12.95,6.64-22.19,19.9-22.19,14.17,0,18.99,10.25,18.99,20.56,0,1.4,0,2.3-.15,3.48h-27.23ZM289.55,333.96c-.08-4.8-2-8.85-7.57-8.85s-7.68,3.78-8.13,8.85h15.7Z"/>
      <path fill="#0d0c0f" d="M316.66,317.9c3.72,16.57,5.75,25.98,6.53,31.11h.15c.85-4.59,2.03-11.07,7.05-31.11h10.62c4.68,20.29,6.07,26.26,6.65,30.7h.08c.84-4.25,2.11-10.44,6.92-30.7h11.31l-12.25,41.27h-12.25c-3.39-15.66-5.35-23.9-6.28-29.33h-.08c-.66,5.17-2.88,14.53-6.52,29.33h-12.29l-11.72-41.27h12.09Z"/>
      <path fill="#0d0c0f" d="M149.06,71.55c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58V80.13c0-5.07-4.37-9.08-9.42-8.58Z"/>
      <path fill="#0d0c0f" d="M252.81,71.55c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58V80.13c0-5.07-4.37-9.08-9.42-8.58Z"/>
      <path fill="#0d0c0f" d="M337.9,166.2c17.85-7.43,30.39-25.03,30.39-45.57,0-25.6-19.5-46.65-44.45-49.1v-.02h-43.64c-4.05,0-7.34,3.28-7.34,7.34v174.72c0,4.05,3.28,7.34,7.34,7.34h42.82c.27.02.54.03.82,0,24.96-2.45,44.47-23.51,44.47-49.11,0-20.55-12.56-38.16-30.41-45.58Z"/>
    </svg>
  );
}

// Footer del Shell — logo de Kitifica (hipervínculo) + copy del valor actual de la herramienta.
function KitificaFooter() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <a href="https://kitifica.com" target="_blank" rel="noopener" aria-label="Kitifica" style={{ display: 'inline-flex', opacity: 0.55 }}>
        <svg width="72" height="19" viewBox="0 0 508.3 135.4" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path fill="#fff" d="M107.7,56.9v50.7c0,4.1-3.4,7.5-7.5,7.5H25.1c-4.1,0-7.5-3.3-7.5-7.5v-49.4c-3.6-.2-7.1-.9-10.6-1.2v50.6c0,10,8.1,18.1,18.1,18.1h75.2c10,0,18.1-8.1,18.1-18.1v-50.7h-10.6Z"/>
            <path fill="#fff" d="M109.3,19.2H16c-8.8,0-16,7.2-16,16v17.7c0,5.2,4.2,9.4,9.3,9.4h41.8c-.7-3.6-.4-7.3,1.1-10.7H10.7v-16.4c0-2.9,2.4-5.3,5.3-5.3h93.3c2.9,0,5.3,2.4,5.3,5.3v16.4h-40.3c0,3.6-.2,7.2-1.2,10.7h42.8c5.2,0,9.3-4.2,9.3-9.4v-17.7c0-8.8-7.2-16-16-16Z"/>
            <path fill="#fff" d="M86.9,24.5h-10.7v-10.7c0-1.8-1.4-3.2-3.2-3.2h-20.8c-1.8,0-3.2,1.4-3.2,3.2v10.7h-10.7v-10.7c0-7.6,6.2-13.8,13.8-13.8h20.8c7.6,0,13.8,6.2,13.8,13.8v10.7h0Z"/>
            <path fill="#fff" d="M65.3,73.9h-5.3c-7.6,0-13.8-6.2-13.8-13.8v-5.3c0-7.6,6.2-13.8,13.8-13.8h5.3c7.6,0,13.8,6.2,13.8,13.8v5.3c0,7.6-6.2,13.8-13.8,13.8ZM60,51.6c-1.8,0-3.2,1.4-3.2,3.2v5.3c0,1.8,1.4,3.2,3.2,3.2h5.3c1.8,0,3.2-1.4,3.2-3.2v-5.3c0-1.8-1.4-3.2-3.2-3.2,0,0-5.3,0-5.3,0Z"/>
            <path fill="#fff" d="M171,109.6c-1.7,1.9-4.2,2.9-7.4,2.9s-5.6-1-7.4-2.9c-1.7-1.9-2.6-4.4-2.6-7.5v-60.9c0-3,.9-5.5,2.6-7.4,1.7-1.9,4.2-2.9,7.4-2.9s5.6,1,7.4,2.9c1.7,1.9,2.6,4.4,2.6,7.4v20.7h10.9l16.1-26c1-1.7,2.2-3,3.4-3.8,1.2-.8,2.9-1.2,5-1.2s5.2,1,7.1,2.9c2,1.9,2.9,4.2,2.9,6.8s-.4,3.7-1.3,5l-17,25.5,17.9,26.6c1,1.6,1.4,3.2,1.4,5,0,2.7-1,5-3.1,6.9-2.1,2-4.5,2.9-7.3,2.9s-3.7-.4-5-1.3c-1.3-.8-2.4-2.2-3.4-3.9l-17.1-26.4h-10.5v21.2c0,3.1-.9,5.6-2.6,7.5h0Z"/>
            <path fill="#fff" d="M243.9,45c-2.3,2.1-5.3,3.2-9,3.2s-6.8-1.1-9.1-3.2c-2.3-2.1-3.4-5.1-3.4-8.8s1.1-6.6,3.4-8.7c2.3-2.1,5.3-3.2,9.1-3.2s6.7,1,9,3.2,3.4,5,3.4,8.7-1.1,6.6-3.4,8.8ZM242.4,109.6c-1.7,1.9-4.1,2.9-7.3,2.9s-5.6-1-7.4-2.9c-1.8-2-2.7-4.4-2.7-7.5v-37.1c0-3,.9-5.5,2.6-7.4,1.7-1.9,4.2-2.9,7.5-2.9s5.6.9,7.3,2.8c1.7,1.9,2.6,4.4,2.6,7.5v37.1c0,3.1-.9,5.6-2.6,7.5Z"/>
            <path fill="#fff" d="M287.2,94.5c1.7,0,3.1.7,4.3,2s1.8,3.1,1.8,5.4-.7,4.9-2.1,6.7c-2.6,3.2-7.1,4.8-13.4,4.8s-12-2.1-15.4-6.2c-3.4-4.1-5-9.5-5-16.1v-19.2h-1.4c-2.4,0-4.3-.8-5.9-2.3-1.6-1.6-2.3-3.6-2.3-6s.8-4.3,2.3-5.9,3.5-2.3,5.9-2.3h2.4c.2-1.3.5-2.5,1-3.8,1.9-6.4,5.1-9.5,9.9-9.5s8.1,3,8.1,9v4.3h6.4c2.4,0,4.3.8,5.8,2.3,1.5,1.5,2.3,3.5,2.3,5.9s-.8,4.4-2.3,6c-1.5,1.6-3.5,2.3-5.8,2.3h-6.4v17c0,2.2.3,3.9.8,5.1s1.6,1.8,3.3,1.8,1.8-.2,2.8-.6c1.1-.4,2-.6,2.9-.6h0Z"/>
            <path fill="#fff" d="M316.1,45c-2.2,2.1-5.3,3.2-9,3.2s-6.8-1.1-9.1-3.2c-2.3-2.1-3.4-5.1-3.4-8.8s1.1-6.6,3.4-8.7,5.3-3.2,9.1-3.2,6.7,1,9,3.2,3.4,5,3.4,8.7-1.1,6.6-3.4,8.8ZM314.5,109.6c-1.7,1.9-4.1,2.9-7.3,2.9s-5.6-1-7.4-2.9c-1.8-2-2.7-4.4-2.7-7.5v-37.1c0-3,.9-5.5,2.6-7.4,1.7-1.9,4.2-2.9,7.5-2.9s5.6.9,7.3,2.8c1.7,1.9,2.5,4.4,2.5,7.5v37.1c0,3.1-.9,5.6-2.5,7.5Z"/>
            <path fill="#fff" d="M375.7,55.4c2.7,0,4.7.8,6.1,2.3,1.4,1.5,2.1,3.5,2.1,6v38.4c0,3.1-.9,5.6-2.5,7.5-1.7,1.9-4.1,2.9-7.3,2.9s-5.6-1-7.4-2.9c-1.8-2-2.7-4.4-2.7-7.5v-30.2h-13.8v53.2c0,3-.9,5.5-2.5,7.4-1.7,1.9-4.1,2.9-7.3,2.9s-5.8-.9-7.5-2.8c-1.7-1.9-2.6-4.4-2.6-7.5l-.2-53.2h-.3c-2.4,0-4.3-.8-5.9-2.3-1.5-1.6-2.3-3.6-2.3-6s.8-4.3,2.3-5.9,3.5-2.3,5.9-2.3h.3c.7-10.7,3.7-18.2,9.1-22.6,5.4-4.4,12.6-6.5,21.6-6.5s15,1.9,19.2,5.6c2.1,1.8,3.2,3.9,3.2,6.3s-.7,4.3-2,5.5c-1.4,1.3-3,1.9-5,1.9s-4.1-.5-7.1-1.6-5.8-1.6-8.6-1.6c-6.1,0-9.4,4.3-10,13h25.4Z"/>
            <path fill="#fff" d="M419.7,113.4c-9.5,0-17-2.8-22.3-8.3s-8-12.7-8-21.5,2.8-16.2,8.5-21.7,13.2-8.2,22.7-8.2,11.5,1.2,15,3.4c3,2.1,4.5,4.8,4.5,8.2s-.7,3.8-2,5.3c-1.3,1.4-3.1,2.2-5.3,2.2s-3.2-.4-5.3-1.2c-2.1-.8-4.2-1.2-6.2-1.2-3.8,0-6.7,1.2-8.9,3.7-2.1,2.5-3.2,5.6-3.2,9.5s1.1,6.9,3.2,9.4c2.1,2.5,5.1,3.7,8.9,3.7s4.1-.4,6.2-1.2c2.1-.8,3.9-1.2,5.3-1.2,2.2,0,4,.7,5.3,2.2,1.3,1.4,2,3.2,2,5.2,0,3.5-1.6,6.2-4.9,8.2-3.5,2.3-8.6,3.4-15.4,3.4h0Z"/>
            <path fill="#fff" d="M467.4,113.5c-7.8,0-14-2.8-18.6-8.3-4.6-5.5-6.9-12.7-6.9-21.6s2.4-16.1,7.1-21.6,11.1-8.3,19.1-8.3,14.1,3.2,17.4,9.7h.2v-1.3c.1-2.2.9-4,2.3-5.4s3.3-2,5.8-2,4.6.8,6,2.3c1.4,1.5,2.1,3.5,2.1,6v26.9c0,1.4.1,2.5.3,3.3.2.8.4,1.3.7,1.6.2.3.7.7,1.4,1.3,2.7,1.9,4,4.4,4,7.5s-1,5.3-2.9,7.2c-1.9,1.8-4.6,2.7-8,2.7s-6.3-1-8.3-3-3.2-4-3.8-6h-.2c-1.6,2.9-4,5.1-7.1,6.7-3.1,1.6-6.6,2.3-10.6,2.3h0ZM465.2,93c1.9,2.3,4.4,3.5,7.6,3.5s5.7-1.1,7.5-3.4,2.7-5.4,2.7-9.6c0-4.1-.9-7.3-2.7-9.5-1.8-2.2-4.3-3.3-7.6-3.3s-5.6,1.2-7.5,3.4-2.8,5.4-2.8,9.4.9,7,2.8,9.4Z"/>
          </g>
        </svg>
      </a>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#999999', letterSpacing: '0.03em', textAlign: 'center' }}>
        © 2026 Kitifica · de idea a herramienta que convence
      </p>
    </div>
  );
}

// Mark 3D de fondo — mismo asset e idea que la sección "Iteración incluida"
// del landing (hard-light sobre el color sólido), pero mucho más tenue acá
// para no competir con la tarjeta de login.
function BgMark() {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: 'url(/ccb_logo_v10.png)',
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      mixBlendMode: 'hard-light', opacity: 0.15,
    }} />
  );
}

function Shell({ hero, card, footer }) {
  const isDesktop = useIsDesktop();

  // Desktop: página normal — tarjeta centrada, footer al fondo.
  if (isDesktop) {
    return (
      <main style={{ minHeight: '100dvh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', fontFamily: F, padding: '32px 24px 24px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <BgMark />
        <div style={{ flex: 1, minHeight: 0 }} />
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, position: 'relative', zIndex: 1 }}>
          {hero}
          <div style={{ width: '100%', background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', boxSizing: 'border-box' }}>
            {card}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', textAlign: 'center', position: 'relative', zIndex: 1, paddingTop: 20 }}>
          {footer}
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', fontFamily: F, overscrollBehavior: 'none', position: 'relative', overflow: 'hidden' }}>
      <BgMark />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 32px 40px', gap: 14, position: 'relative' }}>
        {hero}
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: '36px 36px 0 0', padding: '28px 20px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 8px 40px rgba(124,58,237,0.10)' }}>
          {card}
        </div>
        <div style={{ textAlign: 'center', padding: '16px 0 max(20px, env(safe-area-inset-bottom, 20px))' }}>
          {footer}
        </div>
      </div>
    </main>
  );
}

// Splash — logo completo (ícono + texto) sobre fondo morado sólido. Se ve
// mientras se resuelve la sesión, antes de saber si hay que mostrar login o la app.
function Splash() {
  return (
    <main style={{ height: '100dvh', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Cuadrícula del landing (versión blanca) — rompe el morado sólido sin nada. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
      }} />
      <style>{`
        @keyframes splash-in { 0% { opacity: 0; transform: scale(0.82) translateY(10px); } 60% { opacity: 1; transform: scale(1.04) translateY(0); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes splash-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        .splash-mark { animation: splash-in 620ms cubic-bezier(0.16, 1, 0.3, 1) both, splash-breathe 2.6s ease-in-out 620ms infinite; }
        @media (prefers-reduced-motion: reduce) { .splash-mark { animation: none; } }
      `}</style>
      <svg width="160" height="160" viewBox="0 0 431.63 431.63" xmlns="http://www.w3.org/2000/svg" className="splash-mark">
        <rect fill="#ccc" width="431.63" height="431.63" rx="63.18" ry="63.18"/>
        <path fill="#0d0c0f" d="M115.04,342.22c-2.21,10.25-9.94,17.72-23.71,17.72-17.43,0-25.67-12.34-25.67-27.97s8.5-28.57,26.24-28.57c14.64,0,21.73,8.59,23.07,17.78h-11.89c-1.15-4.24-4.1-8.46-11.57-8.46-9.8,0-13.59,8.82-13.59,18.82,0,9.29,3.28,19.08,13.91,19.08,7.76,0,10.2-5.2,11.24-8.4h11.96Z"/>
        <path fill="#0d0c0f" d="M167.34,342.22c-2.21,10.25-9.94,17.72-23.71,17.72-17.43,0-25.67-12.34-25.67-27.97s8.5-28.57,26.24-28.57c14.64,0,21.73,8.59,23.07,17.78h-11.89c-1.15-4.24-4.1-8.46-11.57-8.46-9.8,0-13.59,8.82-13.59,18.82,0,9.29,3.28,19.08,13.91,19.08,7.76,0,10.2-5.2,11.24-8.4h11.96Z"/>
        <path fill="#0d0c0f" d="M181.99,304.2h24.02c13.28,0,18.32,6.92,18.32,14.06,0,6.2-3.28,10.22-7,11.92,3.71,1.4,8.57,5.3,8.57,12.53,0,9.41-7.39,16.46-19.08,16.46h-24.83v-54.97ZM204.64,325.88c5.65,0,7.98-2.53,7.98-6.4s-3.05-6.11-7.64-6.11h-11.33v12.5h10.99ZM193.65,349.99h10.72c6.42,0,9.33-2.68,9.33-7.67,0-4.43-2.86-7.26-9.4-7.26h-10.66v14.93Z"/>
        <path fill="#0d0c0f" d="M233.83,329.1c0-4.1,0-7.74-.08-11.19h11.21c.15.92.3,5.02.3,7.25,1.82-4.72,6.22-8.16,13.24-8.2v10.9c-8.29-.21-13.24,2.02-13.24,13.33v17.99h-11.43v-30.07Z"/>
        <path fill="#0d0c0f" d="M273.61,340.98c0,5.16,2.59,10.21,8.28,10.21,4.76,0,6.12-1.91,7.2-4.41h11.44c-1.46,5.05-5.97,13.35-18.93,13.35s-19.49-10.16-19.49-20.99c0-12.95,6.64-22.19,19.9-22.19,14.17,0,18.99,10.25,18.99,20.56,0,1.4,0,2.3-.15,3.48h-27.23ZM289.55,333.96c-.08-4.8-2-8.85-7.57-8.85s-7.68,3.78-8.13,8.85h15.7Z"/>
        <path fill="#0d0c0f" d="M316.66,317.9c3.72,16.57,5.75,25.98,6.53,31.11h.15c.85-4.59,2.03-11.07,7.05-31.11h10.62c4.68,20.29,6.07,26.26,6.65,30.7h.08c.84-4.25,2.11-10.44,6.92-30.7h11.31l-12.25,41.27h-12.25c-3.39-15.66-5.35-23.9-6.28-29.33h-.08c-.66,5.17-2.88,14.53-6.52,29.33h-12.29l-11.72-41.27h12.09Z"/>
        <path fill="#0d0c0f" d="M149.06,71.55c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58V80.13c0-5.07-4.37-9.08-9.42-8.58Z"/>
        <path fill="#0d0c0f" d="M252.81,71.55c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58V80.13c0-5.07-4.37-9.08-9.42-8.58Z"/>
        <path fill="#0d0c0f" d="M337.9,166.2c17.85-7.43,30.39-25.03,30.39-45.57,0-25.6-19.5-46.65-44.45-49.1v-.02h-43.64c-4.05,0-7.34,3.28-7.34,7.34v174.72c0,4.05,3.28,7.34,7.34,7.34h42.82c.27.02.54.03.82,0,24.96-2.45,44.47-23.51,44.47-49.11,0-20.55-12.56-38.16-30.41-45.58Z"/>
      </svg>
    </main>
  );
}

// Tiempo mínimo que se muestra el Splash — para que el logo animado alcance a
// verse aunque la sesión resuelva casi instantáneo (sesión ya cacheada, etc.).
const MIN_SPLASH_MS = 900;

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let minElapsed = false;
    let pending = null;
    const minTimer = setTimeout(() => {
      minElapsed = true;
      if (pending !== null) { setStatus(pending); pending = null; }
    }, MIN_SPLASH_MS);

    function apply(next) {
      if (cancelled) return;
      if (!minElapsed) { pending = next; return; }
      setStatus(next);
    }

    if (!CONFIGURED) { apply('unconfigured'); return () => { cancelled = true; clearTimeout(minTimer); }; }
    supabase.auth.getSession().then(({ data }) => apply(data.session ? 'ready' : 'anon'));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { apply('recovery'); return; }
      apply(session ? 'ready' : 'anon');
    });
    return () => { cancelled = true; clearTimeout(minTimer); sub.subscription.unsubscribe(); };
  }, []);

  if (status === 'loading') return <Splash />;
  if (status === 'unconfigured') return <Unconfigured />;
  if (status === 'anon') return <SignIn />;
  if (status === 'recovery') return <ResetPassword />;

  return children;
}

function SignIn() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'confirm' | 'forgot' | 'recovery_sent'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  async function handleResetPassword() {
    const addr = email.trim();
    if (!addr) { setError('Ingresa tu correo electrónico'); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(addr, {
      redirectTo: 'https://ccbrew.kitifica.com',
    });
    setBusy(false);
    if (err) setError(err.message);
    else setMode('recovery_sent');
  }

  const hero = (
    <>
      <LogoFull size={104} />
      <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em', textAlign: 'center' }}>
        De tu idea a una herramienta que convence al cliente
      </p>
    </>
  );

  const inputStyle = { width: '100%', boxSizing: 'border-box', background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '14px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: F, outline: 'none', minHeight: 52, touchAction: 'manipulation' };
  const btnStyle = (disabled) => ({ width: '100%', marginTop: 12, background: disabled ? '#b39ddb' : '#7c3aed', border: 'none', borderRadius: 14, padding: '15px 20px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: disabled ? 'default' : 'pointer', fontFamily: F, minHeight: 52, touchAction: 'manipulation', transition: 'background 200ms' });

  let card;
  if (mode === 'confirm') {
    card = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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
    );
  } else if (mode === 'recovery_sent') {
    card = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Correo enviado</p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666666', lineHeight: 1.5 }}>
          Revisa <strong>{email}</strong> y haz clic en el enlace para restablecer tu contraseña.
        </p>
        <button onClick={() => { setMode('login'); setError(null); }} style={{ ...btnStyle(false), marginTop: 20 }}>
          Volver a iniciar sesión
        </button>
      </div>
    );
  } else if (mode === 'forgot') {
    card = (
      <>
        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: '#666666', lineHeight: 1.55 }}>
          Ingresa tu correo y te enviaremos un enlace seguro para restablecer tu contraseña.
        </p>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, fontFamily: F }}>
          Correo electrónico
        </label>
        <input
          type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleResetPassword(); }}
          style={inputStyle}
        />
        {error && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{error}</p>}
        <button onClick={handleResetPassword} disabled={busy} style={btnStyle(busy)}>
          {busy ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
        </button>
        <button
          onClick={() => { setMode('login'); setError(null); }}
          style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', padding: '10px', fontSize: 13, fontWeight: 600, color: '#7c3aed', cursor: 'pointer', fontFamily: F }}
        >
          ← Volver a iniciar sesión
        </button>
      </>
    );
  } else {
    card = (
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 6px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: F }}>
            Contraseña
          </label>
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(null); }}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 11.5, fontWeight: 600, color: '#7c3aed', cursor: 'pointer', fontFamily: F }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            id="cc-pwd"
            type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleSignup(); }}
            style={{ ...inputStyle, paddingRight: 46 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{
              position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)',
              background: 'none', border: 'none', padding: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999999',
            }}>
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
        {error && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{error}</p>}
        <button onClick={mode === 'login' ? handleLogin : handleSignup} disabled={busy} style={btnStyle(busy)}>
          {busy ? (mode === 'login' ? 'Entrando...' : 'Creando cuenta...') : (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
        </button>
        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
          style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', padding: '10px', fontSize: 13, fontWeight: 600, color: '#7c3aed', cursor: 'pointer', fontFamily: F }}
        >
          {mode === 'login' ? '¿Sin cuenta? Crear una' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </>
    );
  }

  return <Shell hero={hero} card={card} footer={<KitificaFooter />} />;
}

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const F = "'Inter', 'SF Pro Display', -apple-system, sans-serif";
  const inputStyle = { width: '100%', boxSizing: 'border-box', background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '14px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: F, outline: 'none', minHeight: 52, touchAction: 'manipulation' };
  const btnStyle = (disabled) => ({ width: '100%', marginTop: 12, background: disabled ? '#b39ddb' : '#7c3aed', border: 'none', borderRadius: 14, padding: '15px 20px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: disabled ? 'default' : 'pointer', fontFamily: F, minHeight: 52, touchAction: 'manipulation', transition: 'background 200ms' });

  async function handleUpdate() {
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    // Sign in fresh so onAuthStateChange fires 'SIGNED_IN' and status → 'ready'
    setTimeout(() => supabase.auth.refreshSession(), 800);
  }

  const hero = (
    <>
      <LogoFull size={104} />
      <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em', textAlign: 'center' }}>
        De tu idea a una herramienta que convence al cliente
      </p>
    </>
  );

  const card = done ? (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Contraseña actualizada</p>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666666', lineHeight: 1.5 }}>Entrando a tu cuenta...</p>
    </div>
  ) : (
    <>
      <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, color: '#666666', lineHeight: 1.55 }}>
        Elige una contraseña nueva para tu cuenta.
      </p>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, fontFamily: F }}>
        Nueva contraseña
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id="rp-pwd" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') document.getElementById('rp-confirm')?.focus(); }}
          style={{ ...inputStyle, paddingRight: 48 }}
        />
        <button
          type="button" onClick={() => setShowPassword(v => !v)}
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#999', display: 'flex', alignItems: 'center' }}
        >
          {showPassword
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </button>
      </div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999999', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '14px 0 6px', fontFamily: F }}>
        Confirmar contraseña
      </label>
      <input
        id="rp-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
        placeholder="Repite la contraseña"
        value={confirm} onChange={e => setConfirm(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleUpdate(); }}
        style={inputStyle}
      />
      {error && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{error}</p>}
      <button onClick={handleUpdate} disabled={busy} style={btnStyle(busy)}>
        {busy ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </>
  );

  return <Shell hero={hero} card={card} footer={<KitificaFooter />} />;
}

function PairDevice({ onSubmit }) {
  const [code, setCode] = useState('');

  function handleSubmit() {
    const val = code.trim();
    if (!val) return;
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
        type="password" autoComplete="off" placeholder="••••••••••••••••"
        value={code} onChange={e => setCode(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        style={{ width: '100%', boxSizing: 'border-box', background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '14px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: F, outline: 'none', minHeight: 52, touchAction: 'manipulation' }}
      />
      <button
        onClick={handleSubmit}
        style={{ width: '100%', marginTop: 12, background: '#7c3aed', border: 'none', borderRadius: 14, padding: '15px 20px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F, minHeight: 52, touchAction: 'manipulation' }}
      >
        Emparejar dispositivo
      </button>
    </>
  );

  return <Shell hero={hero} card={card} footer={<KitificaFooter />} />;
}

function Unconfigured() {
  return (
    <Shell
      hero={<LogoFull size={90} />}
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
