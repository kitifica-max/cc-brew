'use client'
import { useState } from 'react'
import { getMcpAddCommand } from '../lib/mcp-client'

export default function OnboardingMCP({ apiKey, sessionId, onDone }) {
  const [copied, setCopied] = useState(false)
  const cmd = getMcpAddCommand(apiKey)

  const copy = () => {
    navigator.clipboard.writeText(cmd).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16,
      padding: '24px 20px', maxWidth: 520, margin: '0 auto',
    }}>
      <div style={{ fontSize: 11, color: '#f04e23', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Solo la primera vez
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#E0E0E0', marginBottom: 12 }}>
        Conecta Claude Code
      </div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
        Pega este comando en tu terminal. Solo necesitas hacerlo una vez.
      </p>
      <div style={{
        background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10,
        padding: '12px 14px', marginBottom: 12, overflowX: 'auto',
      }}>
        <code style={{ fontSize: 11, color: '#E0E0E0', whiteSpace: 'pre', fontFamily: 'monospace' }}>
          {cmd}
        </code>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={copy} style={{
          flex: 1, padding: '12px 0', background: copied ? '#10B981' : '#f04e23',
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 14,
          fontWeight: 700, cursor: 'pointer', transition: 'background 200ms',
        }}>
          {copied ? '✓ Copiado' : 'Copiar comando'}
        </button>
        <button onClick={onDone} style={{
          padding: '12px 16px', background: 'transparent',
          color: '#888', border: '1px solid #2A2A2A', borderRadius: 10,
          fontSize: 13, cursor: 'pointer',
        }}>
          Ya lo hice →
        </button>
      </div>
      {sessionId && (
        <div style={{ marginTop: 16, fontSize: 11, color: '#525252' }}>
          session_id: {sessionId}
        </div>
      )}
    </div>
  )
}
