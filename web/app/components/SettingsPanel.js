'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getApiKey, setApiKey, getMcpAddCommand, saveAnthropicKey, deleteAnthropicKey } from '../lib/mcp-client';
import { useIsDesktop } from '../lib/useIsDesktop';
import BuyMinutes from './BuyMinutes';

export default function SettingsPanel({ onClose, onReplayOnboarding }) {
  const isDesktop = useIsDesktop();
  const [userEmail, setUserEmail] = useState('');
  const [apiKey, setApiKeyState] = useState(() => getApiKey());
  const [keyCopied, setKeyCopied] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);
  const [skillCopied, setSkillCopied] = useState(false);
  const [minutesBalance, setMinutesBalance] = useState(null);
  const [trialCredits, setTrialCredits] = useState(null);
  const [byoApiActive, setByoApiActive] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [buyInitialPack, setBuyInitialPack] = useState('creador');
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('');
  const [anthropicKeyBusy, setAnthropicKeyBusy] = useState(false);
  const [anthropicKeyError, setAnthropicKeyError] = useState('');
  const [anthropicKeySaved, setAnthropicKeySaved] = useState(false);

  const saveApiKey = (val) => { setApiKey(val); setApiKeyState(val); };

  const MCP_PROMPT = apiKey
    ? `Instala el MCP de CC Brew. Tu API Key ya está incluida. Ejecuta este comando:\n\n${getMcpAddCommand(apiKey)}`
    : `Instala el MCP de CC Brew. Reemplaza TU_API_KEY con tu clave de CC Brew (la encontrás en ccbrew.kitifica.com → Ajustes → campo API Key) y ejecuta:\n\n${getMcpAddCommand('TU_API_KEY')}`;
  const SKILL_PROMPT = `Instala este archivo como una Skill de Claude Code:\n1. Muévelo a ~/.claude/skills/cc-brew/SKILL.md\n2. Agrega esta entrada en ~/.claude/CLAUDE.md:\n\n# cc-brew\n- **cc-brew** (\`~/.claude/skills/cc-brew/SKILL.md\`) - estructura ideas de producto antes de construirlas con Claude Code\n  Trigger: \`/cc-brew\``;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data?.user?.email ?? '';
      setUserEmail(email);
      const SELECT = 'api_key, minutes_balance, trial_credits, byo_api_active, anthropic_api_key_enc';
      let { data: row } = await supabase.from('ccc_users').select(SELECT).single();
      if (!row && data?.user?.id) {
        const { data: inserted } = await supabase
          .from('ccc_users')
          .upsert({ supabase_user_id: data.user.id }, { onConflict: 'supabase_user_id' })
          .select(SELECT)
          .single();
        row = inserted;
      }
      if (row?.api_key && !getApiKey()) saveApiKey(row.api_key);
      if (row?.minutes_balance != null) setMinutesBalance(row.minutes_balance);
      if (row?.trial_credits != null) setTrialCredits(row.trial_credits);
      setByoApiActive(!!row?.byo_api_active);
      setHasAnthropicKey(!!row?.anthropic_api_key_enc);
    });
  }, []);

  const projectsAvailable = (trialCredits ?? 0) + (minutesBalance ?? 0);

  async function handleSaveAnthropicKey() {
    const key = anthropicKeyInput.trim();
    if (!key) return;
    setAnthropicKeyBusy(true);
    setAnthropicKeyError('');
    try {
      await saveAnthropicKey(key);
      setHasAnthropicKey(true);
      setAnthropicKeyInput('');
      setAnthropicKeySaved(true);
      setTimeout(() => setAnthropicKeySaved(false), 2500);
    } catch (e) {
      setAnthropicKeyError(e.message);
    } finally {
      setAnthropicKeyBusy(false);
    }
  }

  async function handleDeleteAnthropicKey() {
    setAnthropicKeyBusy(true);
    setAnthropicKeyError('');
    try {
      await deleteAnthropicKey();
      setHasAnthropicKey(false);
    } catch (e) {
      setAnthropicKeyError(e.message);
    } finally {
      setAnthropicKeyBusy(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1040, display: 'flex', flexDirection: 'column',
      justifyContent: isDesktop ? 'center' : 'flex-end', alignItems: isDesktop ? 'center' : 'stretch',
      padding: isDesktop ? 24 : 0, boxSizing: 'border-box',
    }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

      <div style={{
        position: 'relative', background: '#141414', width: isDesktop ? '100%' : undefined,
        maxWidth: isDesktop ? 480 : undefined,
        borderRadius: isDesktop ? 20 : '16px 16px 0 0', border: isDesktop ? '1px solid #2A2A2A' : undefined, borderTop: '1px solid #2A2A2A',
        padding: `20px 20px calc(20px + env(safe-area-inset-bottom, 0px))`,
        maxHeight: '90dvh', overflowY: 'auto', boxShadow: isDesktop ? '0 24px 64px rgba(0,0,0,0.5)' : undefined,
      }}>
        <div style={{ width: 36, height: 4, background: '#2A2A2A', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#E0E0E0', letterSpacing: '-0.02em' }}>Configuración</span>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#888888', cursor: 'pointer',
                     width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     borderRadius: 8, fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {showBuy && <BuyMinutes initialPack={buyInitialPack} onClose={() => setShowBuy(false)} onSuccess={() => setShowBuy(false)} />}

        {/* Cuenta */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 10 }}>Cuenta</div>
          <div style={{ background: '#0A0A0A', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#7c3aed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {userEmail?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail || 'Cargando...'}
              </div>
              <div style={{ fontSize: 11, color: '#525252', marginTop: 2 }}>Sesión activa</div>
            </div>
            <button onClick={() => supabase.auth.signOut()}
              style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                       borderRadius: 8, color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Salir
            </button>
          </div>
        </div>

        {/* Proyectos disponibles */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 10 }}>Proyectos disponibles</div>
          <div style={{ background: '#0A0A0A', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              {byoApiActive ? (
                <>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#E0E0E0', lineHeight: 1 }}>∞</div>
                  <div style={{ fontSize: 11, color: '#10B981', marginTop: 4, fontWeight: 600 }}>Ilimitados — Trae tu API activo</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#E0E0E0', lineHeight: 1 }}>
                    {minutesBalance == null ? '...' : projectsAvailable}
                  </div>
                  <div style={{ fontSize: 11, color: '#525252', marginTop: 4 }}>
                    {minutesBalance == null ? '' : (
                      trialCredits > 0
                        ? `${trialCredits} de prueba${minutesBalance > 0 ? ` + ${minutesBalance} comprado${minutesBalance === 1 ? '' : 's'}` : ''}`
                        : `${minutesBalance} proyecto${minutesBalance === 1 ? '' : 's'} comprado${minutesBalance === 1 ? '' : 's'}`
                    )}
                  </div>
                </>
              )}
            </div>
            {!byoApiActive && (
              <button onClick={() => { setBuyInitialPack('creador'); setShowBuy(true); }}
                style={{
                  padding: '9px 16px', background: '#7c3aed', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  flexShrink: 0, boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
                }}>
                + Comprar
              </button>
            )}
          </div>
        </div>

        {/* Trae tu API */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 4 }}>Trae tu API</div>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 12 }}>
            {byoApiActive
              ? 'Tu clave de Anthropic procesa tus proyectos — ya no consumís créditos.'
              : 'Cargá tu clave de Anthropic para probarla ya mismo con tus proyectos de prueba. El plan de $29 (precio especial · pago único) la vuelve ilimitada.'}
          </div>
          {hasAnthropicKey ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ flex: 1, fontSize: 13, color: '#888888', fontFamily: 'monospace' }}>sk-ant-••••••••••••</span>
              <button onClick={handleDeleteAnthropicKey} disabled={anthropicKeyBusy}
                style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                         borderRadius: 8, color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: anthropicKeyBusy ? 'default' : 'pointer' }}>
                {anthropicKeyBusy ? '...' : 'Eliminar'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={anthropicKeyInput}
                onChange={e => setAnthropicKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                style={{
                  flex: 1, minWidth: 0, boxSizing: 'border-box',
                  background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8,
                  color: '#E0E0E0', padding: '8px 12px', fontSize: 13, outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
              <button onClick={handleSaveAnthropicKey} disabled={anthropicKeyBusy || !anthropicKeyInput.trim()}
                style={{ padding: '8px 14px', background: anthropicKeySaved ? '#10B981' : '#2A2A2A', border: 'none',
                         borderRadius: 8, color: '#E0E0E0', fontSize: 13, fontWeight: 700,
                         cursor: (anthropicKeyBusy || !anthropicKeyInput.trim()) ? 'default' : 'pointer',
                         flexShrink: 0, transition: 'background 200ms' }}>
                {anthropicKeyBusy ? 'Validando...' : anthropicKeySaved ? '✓' : 'Guardar'}
              </button>
            </div>
          )}
          {anthropicKeyError && (
            <p style={{ fontSize: 11, color: '#EF4444', margin: '8px 0 0' }}>{anthropicKeyError}</p>
          )}
          {!byoApiActive && (
            <button onClick={() => { setBuyInitialPack('api_lifetime'); setShowBuy(true); }}
              style={{ width: '100%', marginTop: 10, padding: '10px 0', background: 'rgba(124,58,237,0.08)',
                       border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, color: '#7c3aed',
                       fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Hacerla ilimitada — $29 precio especial →
            </button>
          )}
        </div>

        {/* API Key */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 4 }}>API Key</div>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 12 }}>Necesaria para conectar Claude Code Desktop</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={apiKey}
              onChange={e => saveApiKey(e.target.value)}
              placeholder="uk_..."
              style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box',
                background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8,
                color: '#E0E0E0', padding: '8px 12px', fontSize: 13, outline: 'none',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => {
                if (!apiKey) return;
                navigator.clipboard.writeText(apiKey).catch(() => {});
                setKeyCopied(true);
                setTimeout(() => setKeyCopied(false), 2000);
              }}
              style={{ padding: '8px 14px', background: keyCopied ? '#10B981' : '#2A2A2A', border: 'none',
                       borderRadius: 8, color: '#E0E0E0', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                       flexShrink: 0, transition: 'background 200ms' }}>
              {keyCopied ? '✓' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Claude Code Desktop — MCP */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 4 }}>
            Conectar Claude Code Desktop
          </div>

          {/* MCP */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            1. Instalar MCP
          </div>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>
            Copia este prompt y pégalo en Claude Code.{!apiKey && <> Tu API Key la encontrás arriba en el campo <strong style={{ color: '#888' }}>API Key</strong>.</>}
            {apiKey && <> Tu API Key ya está incluida en el prompt.</>}
          </div>
          <div style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '10px 12px', marginBottom: 8, overflowX: 'auto' }}>
            <code style={{ fontSize: 10, color: '#E0E0E0', whiteSpace: 'pre-wrap', fontFamily: 'monospace', display: 'block', lineHeight: 1.6 }}>
              {MCP_PROMPT}
            </code>
          </div>
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(MCP_PROMPT).catch(() => {});
                setCmdCopied(true);
                setTimeout(() => setCmdCopied(false), 2000);
              }}
              style={{ padding: '9px 16px', background: cmdCopied ? '#10B981' : '#7c3aed', border: 'none',
                       borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                       transition: 'background 200ms' }}>
              {cmdCopied ? '✓ Copiado' : 'Copiar prompt'}
            </button>
          </div>

          {/* Skill */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            2. Instalar Skill (si ya tienes el MCP)
          </div>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>
            Descargá el archivo, arrastralo al chat de Claude Code y pegá este prompt.
          </div>
          <a
            href="https://ccbrew.kitifica.com/skill/SKILL.md"
            download="SKILL.md"
            style={{
              display: 'inline-block', marginBottom: 10,
              padding: '9px 16px', background: '#1A1A1A', border: '1px solid #2A2A2A',
              borderRadius: 8, color: '#E0E0E0', fontSize: 12, fontWeight: 700,
              textDecoration: 'none', cursor: 'pointer',
            }}>
            ↓ Descargar SKILL.md
          </a>
          <div style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '10px 12px', marginBottom: 8, overflowX: 'auto' }}>
            <code style={{ fontSize: 10, color: '#E0E0E0', whiteSpace: 'pre-wrap', fontFamily: 'monospace', display: 'block', lineHeight: 1.6 }}>
              {SKILL_PROMPT}
            </code>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(SKILL_PROMPT).catch(() => {});
              setSkillCopied(true);
              setTimeout(() => setSkillCopied(false), 2000);
            }}
            style={{ padding: '9px 16px', background: skillCopied ? '#10B981' : '#2A2A2A', border: 'none',
                     borderRadius: 8, color: '#E0E0E0', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                     transition: 'background 200ms' }}>
            {skillCopied ? '✓ Copiado' : 'Copiar prompt'}
          </button>
        </div>

        {onReplayOnboarding && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 10 }}>Ayuda</div>
            <button
              onClick={() => { onReplayOnboarding(); onClose(); }}
              style={{ width: '100%', textAlign: 'left', padding: '13px 14px', background: '#0A0A0A',
                       border: '1px solid #2A2A2A', borderRadius: 10, color: '#E0E0E0', fontSize: 13,
                       fontWeight: 600, cursor: 'pointer' }}>
              Ver introducción de nuevo
            </button>
          </div>
        )}

        <button onClick={onClose}
          style={{ width: '100%', padding: '15px 0', background: '#7c3aed', color: '#fff', border: 'none',
                   borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                   boxShadow: '0 4px 16px rgba(124,58,237,0.35)', letterSpacing: '-0.01em' }}>
          Listo
        </button>
      </div>
    </div>
  );
}
