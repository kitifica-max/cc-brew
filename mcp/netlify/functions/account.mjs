import Anthropic from '@anthropic-ai/sdk'
import { validateApiKey, extractApiKey } from '../../lib/auth.js'
import { encryptSecret } from '../../lib/crypto.js'
import { supabase } from '../../lib/db.js'

// Prueba mínima y barata contra la API real de Anthropic — un formato
// correcto (sk-ant-...) no garantiza que la clave sea válida o tenga saldo,
// así que se confirma con una llamada real antes de guardarla.
async function validateAnthropicKey(key) {
  try {
    const testClient = new Anthropic({ apiKey: key })
    await testClient.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    return true
  } catch (e) {
    console.error('validateAnthropicKey: clave rechazada por Anthropic:', e?.status ?? e.message)
    return false
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed', headers: corsHeaders() }
  }

  const apiKey = extractApiKey(event.headers)
  const userId = await validateApiKey(apiKey)
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }), headers: corsHeaders() }
  }

  let body
  try { body = JSON.parse(event.body ?? '{}') } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }), headers: corsHeaders() }
  }

  try {
    if (body.action === 'save_anthropic_key') {
      const key = String(body.anthropic_key ?? '').trim()
      if (!key.startsWith('sk-ant-')) {
        return json({ error: 'Esa no parece una API key de Anthropic — deben empezar con sk-ant-. Solo se aceptan claves de Anthropic.' }, 400)
      }
      const valid = await validateAnthropicKey(key)
      if (!valid) {
        return json({ error: 'No pudimos validar esa clave con Anthropic. Revisa que esté completa, activa y con saldo.' }, 400)
      }
      const { error } = await supabase
        .from('ccc_users')
        .update({ anthropic_api_key_enc: encryptSecret(key) })
        .eq('id', userId)
      if (error) { console.error('save_anthropic_key:', error); return json({ error: 'No se pudo guardar la clave.' }, 500) }
      return json({ ok: true })
    }

    if (body.action === 'delete_anthropic_key') {
      const { error } = await supabase
        .from('ccc_users')
        .update({ anthropic_api_key_enc: null })
        .eq('id', userId)
      if (error) { console.error('delete_anthropic_key:', error); return json({ error: 'No se pudo eliminar la clave.' }, 500) }
      return json({ ok: true })
    }

    return json({ error: 'action debe ser save_anthropic_key o delete_anthropic_key' }, 400)
  } catch (e) {
    console.error('account.mjs error:', e)
    return json({ error: 'Error inesperado.' }, 500)
  }
}

function json(data, statusCode = 200) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...corsHeaders() }, body: JSON.stringify(data) }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
