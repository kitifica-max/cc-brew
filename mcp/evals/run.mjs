#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const cases = JSON.parse(readFileSync(join(__dir, 'cases.json'), 'utf8'))

const BASE = process.env.MCP_URL ?? 'https://cc-brew-mcp.netlify.app'
const API_KEY = process.env.CCC_API_KEY

if (!API_KEY) {
  console.error('Missing CCC_API_KEY env var')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
}

async function runCase(c) {
  const res = await fetch(`${BASE}/api/ai/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ step: 'evaluate', idea_text: c.idea_text, answers: c.answers }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function checkCriteria(key, expected, actual) {
  const score = actual[key] ?? 0
  const failures = []
  if (expected.min !== undefined && score < expected.min)
    failures.push(`${key}=${score} (expected >= ${expected.min})`)
  if (expected.max !== undefined && score > expected.max)
    failures.push(`${key}=${score} (expected <= ${expected.max})`)
  if (expected.exact !== undefined && score !== expected.exact)
    failures.push(`${key}=${score} (expected ${expected.exact})`)
  return failures
}

let passed = 0, failed = 0

for (const c of cases) {
  process.stdout.write(`[${c.id}] ${c.description}... `)
  try {
    const result = await runCase(c)
    const sem = result.semaforo
    const blocking = ['claridad_problema', 'usuario_y_journey', 'alcance_v1']
    const isBlocked = blocking.some(k => (sem[k] ?? 0) === 0)

    const failures = []

    for (const [key, exp] of Object.entries(c.expected)) {
      if (key === 'isBlocked') {
        if (exp !== isBlocked) failures.push(`isBlocked=${isBlocked} (expected ${exp})`)
      } else {
        failures.push(...checkCriteria(key, exp, sem))
      }
    }

    if (failures.length === 0) {
      console.log('PASS')
      passed++
    } else {
      console.log(`FAIL\n  ${failures.join('\n  ')}`)
      failed++
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`)
    failed++
  }
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exit(1)
