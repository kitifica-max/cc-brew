'use client';
import { useState, useEffect } from 'react';
import { MODELS, EFFORTS } from '../lib/storage';
import { getSessionToken, setSessionToken } from '../lib/supabase';

const ICON_X = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/></svg>`;
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/></svg>`;
const ICON_MONITOR = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8m-4-4v4"/></g></svg>`;
const ICON_KEY = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m15.5 7.5l2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4m2-2l-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></g></svg>`;
const ICON_LINK = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g></svg>`;
const ICON_PLUG = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 22v-5M9 8V2M15 8V2M18 8H6a1 1 0 0 0-1 1v3a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V9a1 1 0 0 0-1-1Z"/></g></svg>`;
const ICON_BOT = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M9 13v2M15 13v2"/></g></svg>`;

const ENV_KEYS = ['GITHUB_TOKEN', 'NETLIFY_AUTH_TOKEN', 'SUPABASE_SERVICE_KEY'];
const EMPTY_ENV = Object.fromEntries(ENV_KEYS.map(k => [k, '']));
const EMPTY_SERVER = { name: '', command: '', args: '' };

export default function SettingsSheet({ project, mcpConfig = {}, onClose, onModelChange, onEffortChange, onSkipPermissionsChange, onOpenDesktop, onSaveEnv, onSaveMcpConfig }) {
  const [envData, setEnvData] = useState(EMPTY_ENV);
  const [newToken, setNewToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [mcpServers, setMcpServers] = useState(mcpConfig);
  const [newServer, setNewServer] = useState(EMPTY_SERVER);
  const [mcpSaved, setMcpSaved] = useState(false);

  useEffect(() => { setMcpServers(mcpConfig); }, [mcpConfig]);

  function handleSaveToken() {
    const t = newToken.trim();
    if (!t) return;
    setSessionToken(t);
    setNewToken('');
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 2000);
  }

  if (!project) return null;

  function handleAddServer() {
    const name = newServer.name.replace(/[^a-zA-Z0-9_-]/g, '').trim();
    const command = newServer.command.trim();
    if (!name || !command) return;
    const args = newServer.args.trim() ? newServer.args.trim().split(/\s+/) : [];
    const updated = { ...mcpServers, [name]: { command, args } };
    setMcpServers(updated);
    setNewServer(EMPTY_SERVER);
    onSaveMcpConfig?.(updated);
    setMcpSaved(true);
    setTimeout(() => setMcpSaved(false), 2000);
  }

  function handleRemoveServer(name) {
    const updated = { ...mcpServers };
    delete updated[name];
    setMcpServers(updated);
    onSaveMcpConfig?.(updated);
  }

  function handleSaveEnv() {
    const filtered = Object.fromEntries(Object.entries(envData).filter(([, v]) => v.trim() !== ''));
    if (Object.keys(filtered).length === 0) return;
    onSaveEnv(filtered);
    setEnvData(EMPTY_ENV);
  }

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
            <div style={{ fontSize: 10, fontWeight: 500, color: '#999999', marginTop: 2 }}>
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
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999999', marginBottom: 10 }}>Modelo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => onModelChange(m.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: project.model === m.id ? '#f0f0f0' : '#f5f5f5',
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
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999999', marginBottom: 10 }}>Effort</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {EFFORTS.map(e => (
              <button
                key={e}
                onClick={() => onEffortChange(e)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: project.effort === e ? '#f04e23' : '#f5f5f5',
                  color: project.effort === e ? '#fff' : '#555',
                  fontSize: 12, fontWeight: 700, fontFamily: 'Sora, sans-serif',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Env / Secrets */}
        <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ display: 'flex', width: 14, height: 14, color: '#f04e23' }} dangerouslySetInnerHTML={{ __html: ICON_KEY }} />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999999' }}>
              Entorno / Secretos (.env)
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {ENV_KEYS.map(key => (
              <input
                key={key}
                type="password"
                placeholder={key}
                value={envData[key]}
                onChange={e => setEnvData(prev => ({ ...prev, [key]: e.target.value }))}
                style={{
                  background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 10,
                  padding: '10px 14px', fontSize: 12, fontFamily: 'Sora, sans-serif',
                  outline: 'none', color: '#1a1a1a', width: '100%', boxSizing: 'border-box',
                }}
              />
            ))}
          </div>
          <button
            onClick={handleSaveEnv}
            style={{
              width: '100%', background: '#f04e23', border: 'none', borderRadius: 10,
              padding: '10px', fontSize: 12, fontWeight: 700, color: '#fff',
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}
          >
            Guardar e Inyectar en Local
          </button>
        </div>

        {/* Session Token */}
        <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ display: 'flex', width: 14, height: 14, color: '#f04e23' }} dangerouslySetInnerHTML={{ __html: ICON_LINK }} />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999999' }}>
              Session Token
            </div>
          </div>
          <input
            type="password"
            autoComplete="off"
            placeholder="Nuevo SESSION_TOKEN..."
            value={newToken}
            onChange={e => setNewToken(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveToken(); }}
            style={{
              background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 10,
              padding: '10px 14px', fontSize: 12, fontFamily: 'Sora, sans-serif',
              outline: 'none', color: '#1a1a1a', width: '100%', boxSizing: 'border-box', marginBottom: 8,
            }}
          />
          <button
            onClick={handleSaveToken}
            style={{
              width: '100%', background: tokenSaved ? '#00b09b' : '#f04e23', border: 'none', borderRadius: 10,
              padding: '10px', fontSize: 12, fontWeight: 700, color: '#fff',
              cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'background 200ms',
            }}
          >
            {tokenSaved ? 'Token guardado' : 'Cambiar token'}
          </button>
        </div>

        {/* Subagentes / Modo autónomo */}
        <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ display: 'flex', width: 14, height: 14, color: '#f04e23' }} dangerouslySetInnerHTML={{ __html: ICON_BOT }} />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999999' }}>
              Subagentes / Workflows
            </div>
          </div>
          <button
            onClick={() => onSkipPermissionsChange?.(!project.skipPermissions)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff', border: `1.5px solid ${project.skipPermissions ? '#f04e23' : '#e0e0e0'}`,
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: project.skipPermissions ? '#f04e23' : '#333' }}>
                Modo autónomo
              </div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                Permite herramientas sin confirmación manual
              </div>
            </div>
            <div style={{
              width: 36, height: 20, borderRadius: 10, flexShrink: 0,
              background: project.skipPermissions ? '#f04e23' : '#ccc',
              position: 'relative', transition: 'background 200ms',
            }}>
              <div style={{
                position: 'absolute', top: 2, left: project.skipPermissions ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </button>
        </div>

        {/* MCP Servers */}
        <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ display: 'flex', width: 14, height: 14, color: '#f04e23' }} dangerouslySetInnerHTML={{ __html: ICON_PLUG }} />
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999999' }}>
              MCP Servers
            </div>
          </div>

          {/* Lista de servers existentes */}
          {Object.entries(mcpServers).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {Object.entries(mcpServers).map(([name, cfg]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 10, padding: '8px 12px', border: '1.5px solid #e0e0e0' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{name}</div>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>
                      {cfg.command}{cfg.args?.length ? ' ' + cfg.args.join(' ') : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveServer(name)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Agregar nuevo server */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              placeholder="Nombre (ej: filesystem)"
              value={newServer.name}
              onChange={e => setNewServer(s => ({ ...s, name: e.target.value }))}
              style={{ background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontFamily: 'Sora, sans-serif', outline: 'none', color: '#1a1a1a', width: '100%', boxSizing: 'border-box' }}
            />
            <input
              placeholder="Comando (ej: npx)"
              value={newServer.command}
              onChange={e => setNewServer(s => ({ ...s, command: e.target.value }))}
              style={{ background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontFamily: 'Sora, sans-serif', outline: 'none', color: '#1a1a1a', width: '100%', boxSizing: 'border-box' }}
            />
            <input
              placeholder="Args (ej: -y @modelcontextprotocol/server-filesystem /ruta)"
              value={newServer.args}
              onChange={e => setNewServer(s => ({ ...s, args: e.target.value }))}
              style={{ background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontFamily: 'Sora, sans-serif', outline: 'none', color: '#1a1a1a', width: '100%', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleAddServer}
              style={{ width: '100%', background: mcpSaved ? '#00b09b' : '#f04e23', border: 'none', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'background 200ms' }}
            >
              {mcpSaved ? '✓ Guardado' : 'Agregar MCP server'}
            </button>
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
