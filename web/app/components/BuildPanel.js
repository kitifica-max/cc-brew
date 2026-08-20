'use client';

export default function BuildPanel({ project, status = 'idle', log = '', shareUrl = '', onClose, onBuild }) {
  const slug = project?.name
    ? project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : '';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
               alignItems: 'flex-end', zIndex: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', background: '#1E293B', borderRadius: '16px 16px 0 0',
                    padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#E2E8F0', fontSize: 18 }}>Construir POC</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8',
                                             cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>

        {status === 'idle' && (
          <div>
            <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 16px' }}>
              Claude Code generará el POC estático en la carpeta del proyecto.
              El resultado se subirá a{' '}
              <code style={{ color: '#6366F1' }}>ccc.kitifica.com/{slug}</code>
            </p>
            <button
              onClick={onBuild}
              style={{ width: '100%', padding: '12px 0', background: '#6366F1', color: '#fff',
                       border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
              Iniciar Build
            </button>
          </div>
        )}

        {(status === 'building' || status === 'uploading') && (
          <div>
            <p style={{ color: '#6366F1', fontWeight: 600, marginBottom: 12 }}>
              {status === 'building' ? 'Construyendo...' : 'Subiendo...'}
            </p>
            <pre style={{ background: '#0F172A', borderRadius: 8, padding: 12, fontSize: 11,
                          color: '#94A3B8', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {log || 'Iniciando...'}
            </pre>
          </div>
        )}

        {status === 'done' && (
          <div>
            <p style={{ color: '#10B981', fontWeight: 600, marginBottom: 8 }}>POC disponible:</p>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer"
               style={{ color: '#6366F1', fontSize: 14, wordBreak: 'break-all' }}>
              {shareUrl}
            </a>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p style={{ color: '#EF4444', marginBottom: 8 }}>Error en el build:</p>
            <pre style={{ background: '#0F172A', borderRadius: 8, padding: 12, fontSize: 11,
                          color: '#EF4444', whiteSpace: 'pre-wrap' }}>{log}</pre>
            {shareUrl && (
              <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
                URL destino:{' '}
                <span style={{ color: '#6366F1' }}>{shareUrl}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
