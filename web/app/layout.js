import './globals.css';
import InstallPopup from './components/InstallPopup';

export const metadata = {
  title: 'CC Brew — ¿Vale la pena construir tu idea?',
  description: 'Evaluamos tu idea antes de que gastes tiempo y dinero. Te decimos si construirla, replantearla o dejarla.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'CC Brew' },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'CC Brew — ¿Vale la pena construir tu idea?',
    description: 'Evaluamos tu idea antes de que gastes tiempo y dinero. Te decimos si construirla, replantearla o dejarla.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        `}} />
        <InstallPopup />
      </body>
    </html>
  );
}
