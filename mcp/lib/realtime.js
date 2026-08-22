import { supabase } from './db.js'

export async function broadcastEvent(sessionId, eventType, payload) {
  const channel = supabase.channel(`session:${sessionId}`)
  // Conectar, enviar, desconectar (fire-and-forget en Netlify Function)
  await new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: eventType,
          payload,
        }).then(() => {
          supabase.removeChannel(channel)
          resolve()
        })
      }
    })
  })
}
