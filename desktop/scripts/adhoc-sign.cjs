'use strict';

// Sin certificado de Apple, electron-builder se salta la firma por completo y
// el .app queda solo con la firma del linker: al modificar el bundle esa firma
// deja de validar y macOS (sobre todo en Apple Silicon) dice que la app está
// dañada. Firmamos ad-hoc a mano antes de construir el DMG.
//
// Esto no sustituye a la notarización: el primer arranque sigue pidiendo
// clic derecho → Abrir.

const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appDir = context.appOutDir;
  const app = path.join(appDir, `${context.packager.appInfo.productFilename}.app`);
  const entitlements = path.join(__dirname, '..', 'assets', 'entitlements.mac.plist');

  execFileSync(
    'codesign',
    [
      '--force',
      '--deep',
      '--sign', '-',
      '--options', 'runtime',
      '--entitlements', entitlements,
      '--timestamp=none',
      app,
    ],
    { stdio: 'inherit' }
  );
};
