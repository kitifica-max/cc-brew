// Google Trends vía SerpApi (https://serpapi.com/google-trends-api) — API paga,
// requiere SERPAPI_KEY. Reemplaza el scraping del endpoint no oficial: mismo dato
// de Trends, sin bloqueos de IP por tráfico de datacenter (era el problema real).
//
// cat = categoría de Google Ads (id numérico, 0 = todas). Ids completos en
// google-trends-categories.json en la raíz del repo — referencia para elegir el
// id correcto al llamar validate_demand, no se distribuye vía MCP.

import { pathToFileURL } from 'node:url'

const BASE = 'https://serpapi.com/search'

async function fetchTimeseries(keyword, geo, cat) {
  const params = new URLSearchParams({
    engine: 'google_trends',
    q: keyword,
    data_type: 'TIMESERIES',
    date: 'today 12-m',
    api_key: process.env.SERPAPI_KEY ?? '',
  })
  if (geo) params.set('geo', geo)
  if (cat) params.set('cat', String(cat))

  let res
  try {
    res = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(10000) })
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      throw new Error('SerpApi: timeout — no respondió a tiempo')
    }
    throw e
  }

  const body = await res.json().catch(() => null)
  if (!res.ok || body?.error) {
    throw new Error(`SerpApi: ${body?.error ?? `HTTP ${res.status}`}`)
  }
  return body
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

export async function fetchInterestOverTime(keyword, geo = '', cat = 0) {
  const body = await fetchTimeseries(keyword, geo, cat)

  const allPoints = body.interest_over_time?.timeline_data ?? []
  // El último punto puede venir isPartial:true (período en curso, todavía
  // incompleto) — incluirlo sesga latest_interest y la mitad final del
  // promedio hacia abajo. Se descarta salvo que sea el único dato que hay.
  const points = allPoints.filter(p => !p.isPartial)
  const effectivePoints = points.length ? points : allPoints
  if (!effectivePoints.length) return { keyword, geo, avg_interest: 0, latest_interest: 0, trend: 'sin_datos' }

  const values = effectivePoints.map(p => Number(p.values?.[0]?.extracted_value ?? 0))
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
