import { supabase } from './db.js'

export async function broadcastEvent(sessionId, eventType, payload) {
  const channel = supabase.channel(`session:${sessionId}`)
  let settled = false
  const finish = (resolve) => {
    if (settled) return
    settled = true
    supabase.removeChannel(channel)
    resolve()
  }
  // Conectar, enviar, desconectar (fire-and-forget en Netlify Function).
  // Race contra un timeout duro — ningún estado del canal (incluido CLOSED,
  // que Supabase puede emitir sin pasar por CHANNEL_ERROR/TIMED_OUT) puede
  // dejar esto colgado, porque cada tool que llama esto hace await.
  await new Promise((resolve) => {
    const hardTimeout = setTimeout(() => finish(resolve), 5000)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: eventType,
          payload,
        }).then(() => {
          clearTimeout(hardTimeout)
          finish(resolve)
        }).catch(() => {
          clearTimeout(hardTimeout)
          finish(resolve) // resolve on send failure too — don't hang
        })
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(hardTimeout)
        finish(resolve) // degrade gracefully, don't hang
      }
    })
  })
}
