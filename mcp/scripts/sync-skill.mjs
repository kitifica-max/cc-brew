#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'path'
import { BUSINESS_CHECK_SECTIONS } from '../lib/prompts/business-check.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const SKILL_FILES = [
  join(__dir, '../../docs/skills/cc-brew/SKILL.md'),
  join(__dir, '../../web/public/skill/SKILL.md'),
]

const MARKER_KEYS = { personality: 'PERSONALITY', criteria: 'CRITERIA', outputFormat: 'OUTPUT' }

function replaceBetweenMarkers(content, markerName, replacement) {
  const start = `<!-- BUSINESS-CHECK:${markerName}:START -->`
  const end = `<!-- BUSINESS-CHECK:${markerName}:END -->`
  const startIdx = content.indexOf(start)
  const endIdx = content.indexOf(end)
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Marcador ${markerName} no encontrado — corré primero la inserción de marcadores vacíos`)
  }
  const before = content.slice(0, startIdx + start.length)
  const after = content.slice(endIdx)
  return `${before}\n${replacement}\n${after}`
}

for (const filePath of SKILL_FILES) {
  let content = readFileSync(filePath, 'utf8')
  for (const [sectionKey, markerName] of Object.entries(MARKER_KEYS)) {
    content = replaceBetweenMarkers(content, markerName, BUSINESS_CHECK_SECTIONS[sectionKey])
  }
  writeFileSync(filePath, content, 'utf8')
  console.log(`sync-skill: actualizado ${filePath}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [fileA, fileB] = SKILL_FILES.map(f => readFileSync(f, 'utf8'))
  for (const markerName of Object.values(MARKER_KEYS)) {
    const extract = (content) => {
      const start = `<!-- BUSINESS-CHECK:${markerName}:START -->`
      const end = `<!-- BUSINESS-CHECK:${markerName}:END -->`
      return content.slice(content.indexOf(start), content.indexOf(end) + end.length)
    }
    if (extract(fileA) !== extract(fileB)) {
      throw new Error(`FAIL: la sección ${markerName} difiere entre los dos SKILL.md tras el sync`)
    }
  }
  if (fileA.includes('Evaluar con 10 criterios') || fileB.includes('Evaluar con 10 criterios')) {
    throw new Error('FAIL: todavía queda texto viejo de "10 criterios" sin reemplazar')
  }
  console.log('sync-skill.mjs: OK (ambos SKILL.md idénticos entre marcadores, sin texto viejo)')
}
