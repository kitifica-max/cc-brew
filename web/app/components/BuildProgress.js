'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PHASE_LABELS = {
  planning: 'Planificando',
  scaffolding: 'Creando estructura',
  building: 'Construyendo',
  styling: 'Aplicando estilos',
  running: 'Servidor listo',
}

export default function BuildProgress({ sessionId, onComplete }) {
  const [events, setEvents] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('broadcast', { event: 'status' }, ({ payload }) => {
        setEvents(prev => [...prev, { ...payload, ts: Date.now() }])
      })
      .on('broadcast', { event: 'preview' }, ({ payload }) => {
        setPreviewUrl(payload.url)
      })
      .on('broadcast', { event: 'complete' }, ({ payload }) => {
        setDone(true)
        setEvents(prev => [...prev, { phase: 'done', message: payload.summary, ts: Date.now() }])
        onComplete?.()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sessionId])

  if (!sessionId) return null

  return (
    <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, padding: '20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
        {done ? 'Listo' : 'Construyendo...'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.length === 0 && (
          <div style={{ fontSize: 13, color: '#525252' }}>Esperando a Claude Code...</div>
        )}
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0,
              background: e.phase === 'done' ? '#10B981' : '#f04e23',
            }} />
            <div>
              <span style={{ fontSize: 11, color: '#525252', marginRight: 6 }}>
                {PHASE_LABELS[e.phase] ?? e.phase}
              </span>
              <span style={{ fontSize: 13, color: '#E0E0E0' }}>{e.message}</span>
            </div>
          </div>
        ))}
      </div>

      {previewUrl && (
        <a href={previewUrl} target="_blank" rel="noopener" style={{
          display: 'block', marginTop: 16, padding: '12px 16px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 10, color: '#10B981', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', textAlign: 'center',
        }}>
          Ver preview → {previewUrl}
        </a>
      )}

      {done && (
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#10B981', fontWeight: 600 }}>
          ✓ Tu app está lista
        </div>
      )}
    </div>
  )
}
