/*!
 * Kitifica App Directa — Install Popup v2
 * Drop-in: <script src="kitifica-install-popup.js"></script>
 * Archivos PNG requeridos (misma carpeta):
 *   install_iphone_ipad.png, install_android.png,
 *   install_safari_desktop.png, install_chrome_desktop.png, appdirectaicon.png
 */
(function () {
  'use strict';

  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (window.navigator.standalone === true) return;
  if (localStorage.getItem('kap-installed') === '1') return;

  // ── Detección de dispositivo ─────────────────────────────────────────────
  var ua = navigator.userAgent;
  var isIOS    = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  var isIPadOS = !isIOS && navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
  var isAnd    = /Android/.test(ua);
  var isOther  = isAnd && (/MIUI|XiaoMi|MiuiBrowser/.test(ua) || /HUAWEI|HMSCore/.test(ua));
  var isSafari = !isIOS && !isIPadOS && !isAnd && /Safari/.test(ua) && !/Chrome|CriOS/.test(ua);

  var initDev = (isIOS || isIPadOS) ? 'ios'
    : isOther  ? 'other'
    : isAnd    ? 'android'
    : isSafari ? 'safari'
    : 'chrome';

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener('appinstalled', function () {
    localStorage.setItem('kap-installed', '1');
    kapClose();
  });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', function (e) {
    if (e.matches) { localStorage.setItem('kap-installed', '1'); kapClose(); }
  });

  // Base path del script
  var _el = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  var base = _el && _el.src ? _el.src.replace(/[^/]*$/, '') : './';

  // ── Config de dispositivos ───────────────────────────────────────────────
  var DEVS = {
    ios:     { label: 'iPhone / iPad',  title: 'Instala en iPhone o iPad',     img: 'install_iphone_ipad.png',    cols: 3 },
    android: { label: 'Android',        title: 'Instala en Android',            img: 'install_android.png',        cols: 2 },
    safari:  { label: 'Safari Mac',     title: 'Instala en Safari',             img: 'install_safari_desktop.png', cols: 3 },
    chrome:  { label: 'Chrome',         title: 'Instala en Chrome',             img: 'install_chrome_desktop.png', cols: 2 },
    other:   { label: 'REDMI · Huawei', title: 'Instala en REDMI o Huawei',    img: 'install_android.png',        cols: 2 }
  };

  // ── Iconos SVG ───────────────────────────────────────────────────────────
  var iArrow  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  var iBack   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
  var iShield = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  var iZap    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  var iBox    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
  var iDl     = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  var iWarn   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  var logoKitifica = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 508.32 135.45" height="28"><defs><style>.kl1{fill:#00b58b}.kl2{fill:#fff}</style></defs><g><g><g><g><path class="kl1" d="M24.19,33.87h76.93c6.58,0,11.91,5.34,11.91,11.91v62.76c0,6.53-5.3,11.82-11.82,11.82H24.1c-6.53,0-11.82-5.3-11.82-11.82v-62.76c0-6.58,5.34-11.91,11.91-11.91Z"/><path d="M100.25,125.69H25.06c-9.99,0-18.11-8.12-18.11-18.11v-60.93c0-9.99,8.12-18.11,18.11-18.11h75.19c9.99,0,18.11,8.12,18.11,18.11v60.93c0,9.99-8.12,18.11-18.11,18.11ZM25.06,39.2c-4.11,0-7.46,3.35-7.46,7.46v60.93c0,4.11,3.35,7.46,7.46,7.46h75.19c4.11,0,7.46-3.35,7.46-7.46v-60.93c0-4.11-3.35-7.46-7.46-7.46H25.06Z"/></g><g><path class="kl1" d="M14.6,24.5h96.11c5.12,0,9.27,4.15,9.27,9.27v14.24c0,4.9-3.98,8.87-8.87,8.87H14.2c-4.9,0-8.87-3.98-8.87-8.87v-14.24c0-5.12,4.15-9.27,9.27-9.27Z"/><path d="M115.96,62.21H9.35c-5.15,0-9.35-4.19-9.35-9.35v-17.71c0-8.81,7.17-15.98,15.98-15.98h93.35c8.81,0,15.98,7.17,15.98,15.98v17.71c0,5.15-4.19,9.35-9.35,9.35ZM10.65,51.56h104v-16.4c0-2.94-2.39-5.33-5.33-5.33H15.98c-2.94,0-5.33,2.39-5.33,5.33v16.4Z"/></g><path d="M86.89,24.5h-10.65v-10.67c0-1.75-1.42-3.18-3.17-3.18h-20.81c-1.75,0-3.17,1.42-3.17,3.18v10.67h-10.65v-10.67c0-7.62,6.2-13.83,13.83-13.83h20.81c7.62,0,13.83,6.2,13.83,13.83v10.67Z"/><g><rect class="kl2" x="51.47" y="46.23" width="22.37" height="22.37" rx="11.18" ry="11.18"/><path d="M65.32,73.93h-5.33c-7.64,0-13.85-6.21-13.85-13.85v-5.33c0-7.64,6.21-13.85,13.85-13.85h5.33c7.64,0,13.85,6.21,13.85,13.85v5.33c0,7.64-6.21,13.85-13.85,13.85ZM59.99,51.56c-1.76,0-3.2,1.43-3.2,3.2v5.33c0,1.76,1.43,3.2,3.2,3.2h5.33c1.76,0,3.2-1.43,3.2-3.2v-5.33c0-1.76-1.43-3.2-3.2-3.2h-5.33Z"/></g></g><g><path d="M171,109.62c-1.74,1.92-4.2,2.88-7.37,2.88s-5.64-.96-7.37-2.88c-1.74-1.92-2.61-4.43-2.61-7.54v-60.87c0-3.03.87-5.5,2.61-7.43,1.74-1.92,4.19-2.88,7.37-2.88s5.64.96,7.37,2.88c1.74,1.92,2.61,4.4,2.61,7.43v20.73h10.86l16.08-26.05c1.03-1.7,2.16-2.96,3.38-3.77,1.22-.81,2.9-1.22,5.04-1.22,2.81,0,5.19.96,7.15,2.88,1.96,1.92,2.94,4.18,2.94,6.76,0,2.07-.44,3.73-1.33,4.99l-16.96,25.5,17.85,26.61c.96,1.55,1.44,3.22,1.44,4.99,0,2.66-1.04,4.97-3.1,6.93-2.07,1.96-4.51,2.94-7.32,2.94-2.07,0-3.73-.43-4.99-1.27-1.26-.85-2.4-2.16-3.44-3.94l-17.07-26.39h-10.53v21.18c0,3.1-.87,5.62-2.61,7.54Z"/><path d="M243.95,44.98c-2.26,2.14-5.27,3.22-9.04,3.22s-6.8-1.07-9.09-3.22c-2.29-2.14-3.44-5.06-3.44-8.76s1.15-6.6,3.44-8.7c2.29-2.11,5.32-3.16,9.09-3.16s6.69,1.05,8.98,3.16c2.29,2.11,3.44,5.01,3.44,8.7s-1.13,6.62-3.38,8.76ZM242.35,109.62c-1.7,1.92-4.14,2.88-7.32,2.88s-5.65-.98-7.43-2.94c-1.77-1.96-2.66-4.45-2.66-7.48v-37.14c0-3.03.87-5.5,2.61-7.43,1.74-1.92,4.23-2.88,7.48-2.88s5.62.94,7.32,2.83c1.7,1.88,2.55,4.38,2.55,7.48v37.14c0,3.1-.85,5.62-2.55,7.54Z"/><path d="M287.25,94.54c1.7,0,3.14.67,4.32,2,1.18,1.33,1.77,3.14,1.77,5.43,0,2.66-.7,4.88-2.11,6.65-2.59,3.18-7.06,4.77-13.41,4.77-6.88,0-11.99-2.07-15.36-6.21-3.36-4.14-5.04-9.5-5.04-16.08v-19.18h-1.44c-2.37,0-4.32-.78-5.88-2.33-1.55-1.55-2.33-3.55-2.33-5.99s.78-4.32,2.33-5.88,3.51-2.33,5.88-2.33h2.44c.22-1.26.55-2.51,1-3.77,1.85-6.36,5.14-9.54,9.87-9.54,5.39,0,8.09,2.99,8.09,8.98v4.32h6.43c2.37,0,4.3.78,5.82,2.33,1.51,1.55,2.27,3.51,2.27,5.88s-.76,4.43-2.27,5.99c-1.52,1.55-3.46,2.33-5.82,2.33h-6.43v16.96c0,2.22.26,3.92.78,5.1.52,1.18,1.62,1.77,3.33,1.77.81,0,1.76-.2,2.83-.61,1.07-.41,2.05-.61,2.94-.61Z"/><path d="M316.13,44.98c-2.25,2.14-5.27,3.22-9.04,3.22s-6.8-1.07-9.09-3.22c-2.29-2.14-3.44-5.06-3.44-8.76s1.15-6.6,3.44-8.7,5.32-3.16,9.09-3.16,6.69,1.05,8.98,3.16c2.29,2.11,3.44,5.01,3.44,8.7s-1.13,6.62-3.38,8.76ZM314.52,109.62c-1.7,1.92-4.14,2.88-7.32,2.88s-5.65-.98-7.43-2.94c-1.77-1.96-2.66-4.45-2.66-7.48v-37.14c0-3.03.87-5.5,2.61-7.43,1.74-1.92,4.23-2.88,7.48-2.88s5.62.94,7.32,2.83c1.7,1.88,2.55,4.38,2.55,7.48v37.14c0,3.1-.85,5.62-2.55,7.54Z"/><path d="M375.72,55.4c2.66,0,4.69.76,6.1,2.27,1.4,1.52,2.11,3.53,2.11,6.04v38.36c0,3.1-.85,5.62-2.55,7.54-1.7,1.92-4.14,2.88-7.32,2.88s-5.65-.98-7.43-2.94c-1.77-1.96-2.66-4.45-2.66-7.48v-30.16h-13.75v53.22c0,3.03-.85,5.5-2.55,7.43-1.7,1.92-4.14,2.88-7.32,2.88s-5.75-.94-7.48-2.83c-1.74-1.88-2.61-4.38-2.61-7.48l-.22-53.22h-.33c-2.37,0-4.32-.78-5.88-2.33-1.55-1.55-2.33-3.55-2.33-5.99s.78-4.32,2.33-5.88,3.51-2.33,5.88-2.33h.33c.67-10.72,3.71-18.25,9.15-22.62,5.43-4.36,12.62-6.54,21.56-6.54s14.97,1.88,19.18,5.65c2.14,1.77,3.22,3.88,3.22,6.32s-.68,4.29-2.05,5.54c-1.37,1.26-3.05,1.88-5.04,1.88-1.77,0-4.14-.54-7.1-1.61-2.96-1.07-5.84-1.61-8.65-1.61-6.06,0-9.39,4.32-9.98,12.97h25.39Z"/><path d="M419.73,113.39c-9.54,0-16.98-2.77-22.34-8.31-5.36-5.54-8.04-12.71-8.04-21.51s2.83-16.24,8.48-21.67,13.21-8.15,22.67-8.15c6.5,0,11.49,1.15,14.97,3.44,3.03,2.07,4.55,4.81,4.55,8.21,0,2.07-.67,3.82-2,5.27-1.33,1.44-3.1,2.16-5.32,2.16-1.41,0-3.18-.39-5.32-1.16-2.14-.78-4.21-1.16-6.21-1.16-3.77,0-6.73,1.24-8.87,3.71-2.14,2.48-3.21,5.64-3.21,9.48s1.07,6.89,3.21,9.37c2.14,2.48,5.1,3.71,8.87,3.71,2,0,4.06-.39,6.21-1.16,2.14-.78,3.92-1.16,5.32-1.16,2.22,0,3.99.72,5.32,2.16,1.33,1.44,2,3.16,2,5.16,0,3.47-1.63,6.21-4.88,8.2-3.47,2.29-8.61,3.44-15.41,3.44Z"/><path d="M467.41,113.5c-7.83,0-14.04-2.75-18.63-8.26-4.58-5.5-6.87-12.69-6.87-21.56s2.36-16.08,7.09-21.62c4.73-5.54,11.09-8.32,19.07-8.32s14.15,3.21,17.41,9.65h.22v-1.33c.15-2.22.9-4.01,2.27-5.38s3.31-2.05,5.82-2.05,4.58.76,5.99,2.27c1.4,1.52,2.11,3.53,2.11,6.04v26.94c0,1.41.11,2.51.33,3.33.22.81.44,1.35.67,1.61.22.26.7.68,1.44,1.28,2.66,1.92,3.99,4.43,3.99,7.54s-.96,5.34-2.88,7.15c-1.92,1.81-4.58,2.72-7.98,2.72s-6.32-1-8.31-2.99-3.25-3.99-3.77-5.99h-.22c-1.63,2.88-3.99,5.1-7.1,6.65-3.1,1.55-6.65,2.33-10.64,2.33ZM465.24,93.04c1.88,2.33,4.42,3.49,7.59,3.49s5.69-1.13,7.54-3.38c1.85-2.25,2.73-5.45,2.66-9.59,0-4.14-.91-7.3-2.72-9.48-1.81-2.18-4.34-3.27-7.59-3.27s-5.6,1.15-7.48,3.44c-1.88,2.29-2.83,5.43-2.83,9.42s.94,7.04,2.83,9.37Z"/></g></g></g></svg>';

  // ── CSS ──────────────────────────────────────────────────────────────────
  var css = [
    ':root{--kap-green:#00b58b;--kap-green-dark:#009472;--kap-green-dim:rgba(0,181,139,.12);',
    '--kap-text:#0f1b17;--kap-muted:#4a6358;--kap-surface:#f4faf8;--kap-surface-2:#ffffff;',
    '--kap-border:#d0e8e0;--kap-shadow:0 24px 64px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);',
    '--kap-overlay-bg:rgba(10,30,22,.6)}',
    '@media(prefers-color-scheme:dark){:root{--kap-text:#e2f2ec;--kap-muted:#7ab09a;',
    '--kap-surface:#0d1c17;--kap-surface-2:#142a21;--kap-border:#1e3d30;',
    '--kap-shadow:0 24px 64px rgba(0,0,0,.55),0 4px 16px rgba(0,0,0,.3);',
    '--kap-overlay-bg:rgba(0,0,0,.72)}}',
    '[data-theme="dark"]{--kap-text:#e2f2ec;--kap-muted:#7ab09a;--kap-surface:#0d1c17;',
    '--kap-surface-2:#142a21;--kap-border:#1e3d30;',
    '--kap-shadow:0 24px 64px rgba(0,0,0,.55),0 4px 16px rgba(0,0,0,.3);',
    '--kap-overlay-bg:rgba(0,0,0,.72)}',
    '[data-theme="light"]{--kap-text:#0f1b17;--kap-muted:#4a6358;--kap-surface:#f4faf8;',
    '--kap-surface-2:#ffffff;--kap-border:#d0e8e0;',
    '--kap-shadow:0 24px 64px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);',
    '--kap-overlay-bg:rgba(10,30,22,.6)}',

    '#kap-overlay{position:fixed;inset:0;z-index:99999;background:var(--kap-overlay-bg);',
    'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
    'display:flex;align-items:flex-end;justify-content:center}',
    '@media(min-width:480px){#kap-overlay{align-items:center;padding:20px}}',

    '#kap-card{background:var(--kap-surface-2);color:var(--kap-text);',
    'width:100%;max-width:440px;border-radius:20px 20px 0 0;',
    'box-shadow:var(--kap-shadow);',
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'overflow:hidden;animation:kap-up .35s cubic-bezier(.16,1,.3,1) both;',
    'max-height:90dvh;display:flex;flex-direction:column}',
    '@media(min-width:480px){#kap-card{border-radius:20px;max-height:85vh}}',
    '@media(prefers-reduced-motion:reduce){#kap-card{animation:none}}',
    '@keyframes kap-up{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}',

    '.kap-header{padding:20px 20px 0;display:flex;align-items:center;justify-content:center;',
    'gap:10px;flex-shrink:0}',
    '.kap-header svg{height:28px;width:auto}',
    '.kap-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:0 24px 24px}',

    /* Step 1 */
    '.kap-app-icon{display:block;margin:20px auto 0;width:88px;height:88px}',
    '.kap-s1-title{font-size:22px;font-weight:700;letter-spacing:-.5px;color:var(--kap-text);',
    'text-align:center;text-wrap:balance;margin:16px 0 4px}',
    '.kap-tagline{text-align:center;font-size:14px;color:var(--kap-muted);',
    'margin:0 0 20px;line-height:1.5}',
    '.kap-benefits{background:var(--kap-surface);border:1px solid var(--kap-border);',
    'border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:12px}',
    '.kap-benefit{display:flex;align-items:flex-start;gap:12px}',
    '.kap-benefit-icon{width:34px;height:34px;border-radius:10px;background:var(--kap-green-dim);',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.kap-benefit-icon svg{width:18px;height:18px;color:var(--kap-green)}',
    '.kap-benefit-text strong{display:block;font-size:13px;font-weight:600;color:var(--kap-text);margin-bottom:1px}',
    '.kap-benefit-text span{font-size:12px;color:var(--kap-muted);line-height:1.4}',
    '.kap-security{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;',
    'border-radius:10px;background:var(--kap-green-dim);',
    'font-size:12px;color:var(--kap-muted);margin-bottom:20px;line-height:1.4}',
    '.kap-security svg{width:16px;height:16px;flex-shrink:0;color:var(--kap-green);margin-top:1px}',

    /* Step 2 */
    '#kap-step-2{display:none}',
    '.kap-back{background:none;border:none;cursor:pointer;color:var(--kap-muted);font-size:13px;',
    'display:flex;align-items:center;gap:6px;padding:10px 0;margin:12px 0 6px;',
    'font-family:inherit;transition:color .15s}',
    '.kap-back:hover{color:var(--kap-green)}',
    '.kap-back svg{width:16px;height:16px}',
    '.kap-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}',
    '.kap-tab{padding:6px 13px;border-radius:20px;font-size:12.5px;font-weight:600;',
    'border:1.5px solid var(--kap-border);background:var(--kap-surface);',
    'color:var(--kap-muted);cursor:pointer;font-family:inherit;transition:all .15s;',
    'white-space:nowrap}',
    '.kap-tab.active{background:var(--kap-green);color:#fff;border-color:var(--kap-green)}',
    '.kap-device-label{font-size:11px;font-weight:600;letter-spacing:.08em;',
    'text-transform:uppercase;color:var(--kap-green);margin:0 0 4px}',
    '.kap-device-title{font-size:20px;font-weight:700;letter-spacing:-.4px;',
    'color:var(--kap-text);margin:0 0 14px;text-wrap:balance}',
    '.kap-diagram{display:flex;justify-content:center;margin-bottom:16px}',
    '.kap-diagram.col3 img{width:100%}',
    '.kap-diagram.col2 img{width:67%;margin:0 auto}',
    '.kap-diagram img{height:auto;display:block}',
    '.kap-compat-note{display:flex;align-items:flex-start;gap:10px;',
    'background:#fff8ec;border:1px solid #f5d78c;border-radius:10px;',
    'padding:11px 13px;margin-bottom:14px;font-size:12px;line-height:1.5;color:#7a5c1a}',
    '.kap-compat-note svg{width:16px;height:16px;flex-shrink:0;margin-top:1px}',
    '@media(prefers-color-scheme:dark){.kap-compat-note{',
    'background:rgba(245,215,140,.1);border-color:rgba(245,215,140,.3);color:#d4a847}}',
    '[data-theme="dark"] .kap-compat-note{',
    'background:rgba(245,215,140,.1);border-color:rgba(245,215,140,.3);color:#d4a847}',
    '[data-theme="light"] .kap-compat-note{background:#fff8ec;border-color:#f5d78c;color:#7a5c1a}',
    '.kap-support{margin-top:20px;padding-top:16px;border-top:1px solid var(--kap-border);',
    'text-align:center;font-size:12px;color:var(--kap-muted)}',
    '.kap-support a{color:var(--kap-green);text-decoration:none;font-weight:600}',
    '.kap-support a:hover{text-decoration:underline}',

    /* Button */
    '.kap-btn{display:flex;align-items:center;justify-content:center;gap:8px;',
    'width:100%;padding:14px;background:var(--kap-green);color:#fff;',
    'border:none;border-radius:12px;font-size:15px;font-weight:600;font-family:inherit;',
    'cursor:pointer;transition:background .15s}',
    '.kap-btn:hover{background:var(--kap-green-dark)}',
    '.kap-btn svg{width:18px;height:18px}',
    '#kap-install-btn{display:none}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── HTML ─────────────────────────────────────────────────────────────────
  var tabs = Object.keys(DEVS).map(function (k) {
    return '<button class="kap-tab" data-device="' + k + '" type="button">' + DEVS[k].label + '</button>';
  }).join('');

  var html = [
    '<div id="kap-overlay" role="dialog" aria-modal="true" aria-labelledby="kap-title">',
    '<div id="kap-card">',
    '<div class="kap-header">' + logoKitifica + '</div>',

    /* Step 1 */
    '<div class="kap-body" id="kap-step-1">',
    '<img class="kap-app-icon" src="' + base + 'appdirectaicon.png" alt="App Directa" width="88" height="88">',
    '<h2 class="kap-s1-title" id="kap-title">App Directa</h2>',
    '<p class="kap-tagline">Instala esta app directamente en tu dispositivo,<br>sin pasar por ninguna tienda de apps.</p>',
    '<div class="kap-benefits">',
    '<div class="kap-benefit"><div class="kap-benefit-icon">' + iZap + '</div>',
    '<div class="kap-benefit-text"><strong>Acceso inmediato</strong>',
    '<span>Se abre como app nativa. Ícono en tu pantalla de inicio, sin abrir el navegador.</span></div></div>',
    '<div class="kap-benefit"><div class="kap-benefit-icon">' + iBox + '</div>',
    '<div class="kap-benefit-text"><strong>Sin tiendas de apps</strong>',
    '<span>No necesita App Store ni Google Play. Sin esperas ni aprobaciones.</span></div></div>',
    '<div class="kap-benefit"><div class="kap-benefit-icon">' + iShield + '</div>',
    '<div class="kap-benefit-text"><strong>Segura y verificada</strong>',
    '<span>Presentada y garantizada por Kitifica. Solo instala lo que ves en pantalla.</span></div></div>',
    '</div>',
    '<div class="kap-security">' + iShield,
    '<span>No accede a datos del sistema ni de otras apps.',
    ' Puedes desinstalarla en cualquier momento desde la configuración de tu dispositivo.</span></div>',
    '<button class="kap-btn" id="kap-next" type="button">Cómo instalar ' + iArrow + '</button>',
    '</div>',

    /* Step 2 */
    '<div class="kap-body" id="kap-step-2">',
    '<button class="kap-back" id="kap-back" type="button" aria-label="Volver">' + iBack + ' Volver</button>',
    '<div class="kap-tabs">' + tabs + '</div>',
    '<p class="kap-device-label" id="kap-dev-label"></p>',
    '<h2 class="kap-device-title" id="kap-dev-title"></h2>',
    '<div id="kap-diagram-area"></div>',
    '<button class="kap-btn" id="kap-install-btn" type="button">' + iDl + ' Instalar app</button>',
    '<div class="kap-support">¿Problemas al instalar? Escríbenos a ',
    '<a href="mailto:hola@kitifica.com">hola@kitifica.com</a></div>',
    '</div>',

    '</div></div>'
  ].join('');

  var container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  // ── Eventos ──────────────────────────────────────────────────────────────
  document.getElementById('kap-next').addEventListener('click', function () {
    showStep(2);
  });
  document.getElementById('kap-back').addEventListener('click', function () {
    showStep(1);
  });
  document.getElementById('kap-install-btn').addEventListener('click', function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (r) {
        if (r.outcome === 'accepted') { localStorage.setItem('kap-installed', '1'); kapClose(); }
        deferredPrompt = null;
      });
    }
  });
  document.querySelectorAll('.kap-tab').forEach(function (btn) {
    btn.addEventListener('click', function () { setDevice(this.dataset.device); });
  });

  setDevice(initDev);

  // ── Funciones ─────────────────────────────────────────────────────────────
  function setDevice(key) {
    var d = DEVS[key];
    document.querySelectorAll('.kap-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.device === key);
    });
    document.getElementById('kap-dev-label').textContent = d.label;
    document.getElementById('kap-dev-title').textContent = d.title;

    var colCls = d.cols === 2 ? 'col2' : 'col3';
    var note = key === 'other'
      ? '<div class="kap-compat-note">' + iWarn +
        '<span><strong>Abre Chrome</strong> (no el navegador de fábrica).' +
        ' Si no lo tienes, descárgalo gratis desde la tienda de tu dispositivo.' +
        ' En Huawei sin Google Play, busca Chrome en <strong>AppGallery</strong>' +
        ' o <strong>Petal Search</strong>.</span></div>'
      : '';
    document.getElementById('kap-diagram-area').innerHTML =
      note + '<div class="kap-diagram ' + colCls + '">' +
      '<img src="' + base + d.img + '" alt="Instrucciones ' + d.label + '" loading="lazy"></div>';

    var showBtn = key === 'android' || key === 'other';
    document.getElementById('kap-install-btn').style.display = showBtn ? 'flex' : 'none';
  }

  function showStep(n) {
    document.getElementById('kap-step-1').style.display = n === 1 ? 'block' : 'none';
    document.getElementById('kap-step-2').style.display = n === 2 ? 'block' : 'none';
  }

  function kapClose() {
    var o = document.getElementById('kap-overlay');
    if (!o) return;
    o.style.opacity = '0';
    o.style.transition = 'opacity .2s';
    setTimeout(function () { container.remove(); }, 220);
  }

})();
