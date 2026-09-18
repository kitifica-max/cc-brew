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

const MARKER_KEYS = { personality: 'PERSONALITY', criteria: 'CRITERIA', outputFormat: 'OUTPUT', persistence: 'PERSISTENCE' }
const GENERATED_WARNING = '<!-- Generado desde mcp/lib/prompts/business-check.js — no editar a mano, se pisa en el próximo sync-skill -->'

function markerBounds(markerName) {
  return {
    start: `<!-- BUSINESS-CHECK:${markerName}:START -->`,
    end: `<!-- BUSINESS-CHECK:${markerName}:END -->`,
  }
}

function replaceBetweenMarkers(content, markerName, replacement) {
  const { start, end } = markerBounds(markerName)
  const startIdx = content.indexOf(start)
  const endIdx = content.indexOf(end, startIdx + start.length)
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Marcador ${markerName} no encontrado — corré primero la inserción de marcadores vacíos`)
  }
  const before = content.slice(0, startIdx + start.length)
  const after = content.slice(endIdx)
  return `${before}\n${GENERATED_WARNING}\n${replacement}\n${after}`
}

function extractSection(content, markerName) {
  const { start, end } = markerBounds(markerName)
  const startIdx = content.indexOf(start)
  const endIdx = content.indexOf(end, startIdx + start.length)
  return content.slice(startIdx, endIdx + end.length)
}

function sync() {
  for (const filePath of SKILL_FILES) {
    let content = readFileSync(filePath, 'utf8')
    for (const [sectionKey, markerName] of Object.entries(MARKER_KEYS)) {
      content = replaceBetweenMarkers(content, markerName, BUSINESS_CHECK_SECTIONS[sectionKey])
    }
    writeFileSync(filePath, content, 'utf8')
    console.log(`sync-skill: actualizado ${filePath}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  sync()

  const [fileA, fileB] = SKILL_FILES.map(f => readFileSync(f, 'utf8'))
  for (const markerName of Object.values(MARKER_KEYS)) {
    if (extractSection(fileA, markerName) !== extractSection(fileB, markerName)) {
      throw new Error(`FAIL: la sección ${markerName} difiere entre los dos SKILL.md tras el sync`)
    }
  }
  if (fileA.includes('Evaluar con 10 criterios') || fileB.includes('Evaluar con 10 criterios')) {
    throw new Error('FAIL: todavía queda texto viejo de "10 criterios" sin reemplazar')
  }
  console.log('sync-skill.mjs: OK (ambos SKILL.md idénticos entre marcadores, sin texto viejo)')
}
