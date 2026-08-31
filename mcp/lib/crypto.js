// Encripta/desencripta la API key de Anthropic que el usuario trae con el
// plan "Trae tu API". La clave de encriptación vive SOLO como env var de
// Netlify — nunca en la base de datos, nunca en el cliente. El texto plano
// de la API key del usuario solo existe en memoria durante el request que
// la guarda o la usa; nunca se loguea.
import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'

function getKey() {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET
  if (!secret) throw new Error('Missing API_KEY_ENCRYPTION_SECRET')
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptSecret(stored) {
  const [ivB64, tagB64, dataB64] = String(stored).split(':')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Formato de secreto encriptado inválido')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return dec.toString('utf8')
}
