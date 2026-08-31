'use client';
import { useState, useEffect } from 'react';

// La app se diseñó mobile-first (bottom sheets, position:fixed inset:0, sin max-width).
// Este hook deja detectar viewports de escritorio para recentrar el contenido en una
// columna con ancho máximo, en vez de estirar el layout de teléfono a pantalla completa.
export function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    setIsDesktop(mq.matches);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isDesktop;
}
