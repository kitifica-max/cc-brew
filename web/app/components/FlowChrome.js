'use client';

// Mark cuadrado solo-ícono — mismo mark de LogoMark en AuthGate.js, a tamaño chico
// para anclar cada pantalla del flujo a la marca sin repetir el wordmark completo.
export function FlowMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 431.63 431.63" xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
      <rect fill="#ccc" width="431.63" height="431.63" rx="63.18" ry="63.18"/>
      <path fill="#0d0c0f" d="M149.06,121.13c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58v-172.21c0-5.07-4.37-9.08-9.42-8.58Z"/>
      <path fill="#0d0c0f" d="M252.81,121.13c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58v-172.21c0-5.07-4.37-9.08-9.42-8.58Z"/>
      <path fill="#0d0c0f" d="M337.9,215.79c17.85-7.43,30.39-25.03,30.39-45.57,0-25.6-19.5-46.65-44.45-49.1v-.02h-43.64c-4.05,0-7.34,3.28-7.34,7.34v174.72c0,4.05,3.28,7.34,7.34,7.34h42.82c.27.02.54.03.82,0,24.96-2.45,44.47-23.51,44.47-49.11,0-20.55-12.56-38.16-30.41-45.58Z"/>
    </svg>
  );
}

// Franja de marca compacta para el top bar de cada pantalla del flujo: mark + "CC Brew".
export function FlowBrand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <FlowMark size={18} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#525252', letterSpacing: '-0.01em' }}>CC Brew</span>
    </div>
  );
}

// Footer chico para el cierre de cada pantalla — unifica el flujo con AuthGate/landing.
export function FlowFooter() {
  return (
    <p style={{ margin: '10px 0 0', fontSize: 10.5, color: '#3A3A3A', textAlign: 'center', letterSpacing: '0.02em' }}>
      kitifica.com · CC Brew
    </p>
  );
}
