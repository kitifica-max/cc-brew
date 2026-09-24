// Google Trends — endpoint no oficial (sin API key, sin costo). Mismo flujo que usa
// pytrends (github.com/GeneralMills/pytrends), reversado del sitio trends.google.com.
// ponytail: sin SLA — Google puede cambiar o rate-limitear esto sin aviso. Cache de
// 7 días en Supabase (ver tools.js validate_demand) amortigua bloqueos esporádicos
// sirviendo el último dato conocido. Si empieza a bloquear seguido incluso con cache
// tibio, la escalada es una fuente paga (DataForSEO / SerpApi Trends).
//
// Dos pasos: 1) "explore" consigue un token, 2) "widgetdata/multiline" trae los datos
// con ese token. Cada respuesta trae basura al inicio (protección anti-hijacking) que
// hay que recortar antes de parsear JSON — 4 chars en explore, 5 en widgetdata.

import { pathToFileURL } from 'node:url'

const BASE = 'https://trends.google.com/trends/api'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// ponytail: Google bloquea agresivo tráfico de IPs de datacenter con 429 genérico
// (verificado en vivo — bloqueó al primer request desde esta sandbox). 2 reintentos
// con backoff cubren bloqueos transitorios; si el IP de Netlify está blocklisteado
// de forma persistente, esto no alcanza y hay que migrar a una fuente autenticada.
async function trendsFetch(url, method, trimChars, attempt = 0) {
  let res
  try {
    res = await fetch(url, { method, headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) })
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      throw new Error('Google Trends: timeout — no respondió a tiempo')
    }
    throw e
  }
  if (res.status === 429 && attempt < 2) {
    await new Promise(r => setTimeout(r, 500 * 2 ** attempt))
    return trendsFetch(url, method, trimChars, attempt + 1)
  }
  if (!res.ok) throw new Error(`Google Trends HTTP ${res.status}${res.status === 429 ? ' (bloqueado tras reintentos)' : ''}`)
  const text = await res.text()
  try {
    return JSON.parse(text.slice(trimChars))
  } catch {
    throw new Error('Google Trends: respuesta inesperada (¿cambiaron el formato del endpoint no oficial?)')
  }
}

async function getTimeseriesWidget(keyword, geo) {
  const req = JSON.stringify({
    comparisonItem: [{ keyword, geo, time: 'today 12-m' }],
    category: 0,
    property: '',
  })
  const params = new URLSearchParams({ hl: 'es', tz: '360', req })
  const data = await trendsFetch(`${BASE}/explore?${params}`, 'POST', 4)
  const widget = data.widgets?.find(w => w.id === 'TIMESERIES')
  if (!widget) throw new Error('Google Trends: sin datos para ese keyword/geo')
  return widget
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

export async function fetchInterestOverTime(keyword, geo = '') {
  const widget = await getTimeseriesWidget(keyword, geo)
  const params = new URLSearchParams({ req: JSON.stringify(widget.request), token: widget.token, tz: '360' })
  const data = await trendsFetch(`${BASE}/widgetdata/multiline?${params}`, 'GET', 5)

  const allPoints = data.default?.timelineData ?? []
  // El último punto suele venir isPartial:true (período en curso, todavía
  // incompleto) — incluirlo sesga latest_interest y la mitad final del
  // promedio hacia abajo. Se descarta salvo que sea el único dato que hay.
  const points = allPoints.filter(p => !p.isPartial)
  const effectivePoints = points.length ? points : allPoints
  if (!effectivePoints.length) return { keyword, geo, avg_interest: 0, latest_interest: 0, trend: 'sin_datos' }

  const values = effectivePoints.map(p => Number(p.value?.[0] ?? 0))
  const mid = Math.floor(values.length / 2)
  const firstHalfAvg = avg(values.slice(0, mid))
  const secondHalfAvg = avg(values.slice(mid))
  const trend = secondHalfAvg > firstHalfAvg * 1.2 ? 'subiendo'
    : secondHalfAvg < firstHalfAvg * 0.8 ? 'bajando'
    : 'estable'

  return {
    keyword,
    geo,
    avg_interest: Math.round(avg(values)),
    latest_interest: values[values.length - 1],
    trend,
  }
}

// Sin keyword difficulty real — Trends no mide dificultad de ranking, solo interés
// relativo (0-100). Clasifica únicamente por nivel de interés.
export function classifyDemand({ avg_interest }) {
  if (avg_interest < 5) return 'sin_interes'
  if (avg_interest < 20) return 'interes_bajo'
  if (avg_interest < 50) return 'interes_moderado'
  return 'interes_alto'
}

const TRENDS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias — Trends no se mueve rapido

export function isFresh(fetchedAt, ttlMs = TRENDS_CACHE_TTL_MS, now = Date.now()) {
  return now - new Date(fetchedAt).getTime() < ttlMs
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const assert = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg) }
  assert(classifyDemand({ avg_interest: 0 }) === 'sin_interes', 'sin interes')
  assert(classifyDemand({ avg_interest: 10 }) === 'interes_bajo', 'bajo')
  assert(classifyDemand({ avg_interest: 30 }) === 'interes_moderado', 'moderado')
  assert(classifyDemand({ avg_interest: 80 }) === 'interes_alto', 'alto')
  assert(isFresh(new Date(Date.now() - 1000).toISOString()) === true, 'fresh: hace 1s, dentro de TTL 7d')
  assert(isFresh(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()) === false, 'stale: hace 8d, fuera de TTL 7d')
  console.log('trends.js classifyDemand/isFresh: OK (fns puras — fetchInterestOverTime necesita red real, no cubierta acá)')
}
