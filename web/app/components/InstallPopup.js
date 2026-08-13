'use client';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

export default function InstallPopup() {
  const path = usePathname();
  if (path.startsWith('/pago')) return null;
  return <Script src="/kap/kitifica-install-popup.js" strategy="lazyOnload" />;
}
