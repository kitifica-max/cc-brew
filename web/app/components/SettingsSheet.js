'use client';
import { MODELS, EFFORTS } from '../lib/storage';

const ICON_X = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/></svg>`;
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/></svg>`;
const ICON_MONITOR = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8m-4-4v4"/></g></svg>`;

export default function SettingsSheet({ project, onClose, onModelChange, onEffortChange, onOpenDesktop }) {
  if (!project) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10 }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 11,
        background: '#fff', borderRadius: '24px 24px 0 0',
        padding: '20px 20px 40px', maxHeight: '80dvh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>{project.name}</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: '#b0a09a', marginTop: 2 }}>
              {project.path ?? 'Creando directorio...'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#f5f0ee', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: ICON_X }}
          />
        </div>

        {/* Model */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#b0a09a', marginBottom: 10 }}>Modelo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => onModelChange(m.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: project.model === m.id ? '#fde8e4' : '#f9f5f4',
                  border: project.model === m.id ? '1.5px solid #f04e23' : '1.5px solid transparent',
                  borderRadius: 12, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: project.model === m.id ? '#f04e23' : '#333' }}>
                  {m.label}
                </span>
                {project.model === m.id && (
                  <span style={{ color: '#f04e23', display: 'flex' }} dangerouslySetInnerHTML={{ __html: ICON_CHECK }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Effort */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#b0a09a', marginBottom: 10 }}>Effort</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {EFFORTS.map(e => (
              <button
                key={e}
                onClick={() => onEffortChange(e)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: project.effort === e ? '#f04e23' : '#f9f5f4',
                  color: project.effort === e ? '#fff' : '#555',
                  fontSize: 12, fontWeight: 700, fontFamily: 'Sora, sans-serif',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Open in Claude Desktop */}
        <button
          onClick={onOpenDesktop}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#1a1a1a', border: 'none', borderRadius: 14, padding: '14px 20px',
            fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif',
          }}
        >
          <span style={{ display: 'flex', width: 18, height: 18 }} dangerouslySetInnerHTML={{ __html: ICON_MONITOR }} />
          Abrir en Claude Desktop
        </button>
      </div>
    </>
  );
}
