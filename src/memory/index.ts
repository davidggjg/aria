import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, homedir } from 'path'
import type { Memory } from '../types/index.js'

const MEMORY_DIR = join(homedir(), '.aria')
const MEMORY_FILE = join(MEMORY_DIR, 'memory.json')

function ensureDir() {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true })
  }
}

export function loadMemory(): Memory {
  ensureDir()
  if (!existsSync(MEMORY_FILE)) {
    return { facts: [], projectContext: '', lastUpdated: new Date().toISOString() }
  }
  try {
    return JSON.parse(readFileSync(MEMORY_FILE, 'utf-8'))
  } catch {
    return { facts: [], projectContext: '', lastUpdated: new Date().toISOString() }
  }
}

export function saveMemory(memory: Memory): void {
  ensureDir()
  memory.lastUpdated = new Date().toISOString()
  writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2))
}

export function addFact(fact: string): void {
  const memory = loadMemory()
  if (!memory.facts.includes(fact)) {
    memory.facts.push(fact)
    // Keep last 100 facts
    if (memory.facts.length > 100) memory.facts = memory.facts.slice(-100)
    saveMemory(memory)
  }
}

export function setProjectContext(context: string): void {
  const memory = loadMemory()
  memory.projectContext = context
  saveMemory(memory)
}

export function getMemorySummary(): string {
  const memory = loadMemory()
  const parts: string[] = []
  if (memory.projectContext) parts.push(`Project context: ${memory.projectContext}`)
  if (memory.facts.length > 0) parts.push(`Known facts:\n${memory.facts.map(f => `- ${f}`).join('\n')}`)
  return parts.join('\n\n') || 'No memory yet.'
}

// Dream: consolidate memory (runs occasionally in background)
export async function dream(conversationSummary: string): Promise<void> {
  const memory = loadMemory()
  // Extract facts from summary (simple heuristic)
  const lines = conversationSummary.split('\n').filter(l => l.trim().length > 20)
  for (const line of lines.slice(0, 5)) {
    addFact(line.trim())
  }
  console.error('[dream] Memory consolidated.')
}
