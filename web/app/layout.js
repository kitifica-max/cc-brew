import './globals.css';
import InstallPopup from './components/InstallPopup';

export const metadata = {
  title: 'CC Controller',
  description: 'Control Claude Code desde tu móvil',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'CC Controller' },
  icons: { icon: '/favicon.ico', apple: '/icon-192.png' },
};

export const viewport = {
  themeColor: '#f04e23',
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
