import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, homedir } from 'path'
import type { Memory, Conversation, Message } from '../types/index.js'

export const ARIA_DIR = join(homedir(), '.aria')
const MEMORY_FILE = join(ARIA_DIR, 'memory.json')
const CONVERSATIONS_DIR = join(ARIA_DIR, 'conversations')
const HISTORY_FILE = join(ARIA_DIR, 'history.jsonl')

export function ensureDirs() {
  for (const d of [ARIA_DIR, CONVERSATIONS_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true })
  }
}

// ── Memory ───────────────────────────────────────────────────────────────────

export function loadMemory(): Memory {
  ensureDirs()
  if (!existsSync(MEMORY_FILE)) {
    return { facts: [], projectContext: '', lastUpdated: new Date().toISOString(), lastDream: '', sessionCount: 0 }
  }
  try {
    return JSON.parse(readFileSync(MEMORY_FILE, 'utf-8'))
  } catch {
    return { facts: [], projectContext: '', lastUpdated: new Date().toISOString(), lastDream: '', sessionCount: 0 }
  }
}

export function saveMemory(memory: Memory): void {
  ensureDirs()
  memory.lastUpdated = new Date().toISOString()
  writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf-8')
}

export function addFact(fact: string): void {
  const memory = loadMemory()
  if (!memory.facts.includes(fact)) {
    memory.facts.push(fact)
    if (memory.facts.length > 200) memory.facts = memory.facts.slice(-200)
    saveMemory(memory)
  }
}

export function getMemorySummary(): string {
  const memory = loadMemory()
  const parts: string[] = []
  if (memory.projectContext) parts.push(`Project context: ${memory.projectContext}`)
  if (memory.facts.length > 0) parts.push(`Known facts:\n${memory.facts.map(f => `- ${f}`).join('\n')}`)
  return parts.join('\n\n') || ''
}

// ── Conversation History ─────────────────────────────────────────────────────

export function saveMessage(conversationId: string, message: Message): void {
  ensureDirs()
  const line = JSON.stringify({ conversationId, ...message }) + '\n'
  writeFileSync(HISTORY_FILE, line, { flag: 'a', encoding: 'utf-8' })
}

export function loadConversation(conversationId: string): Message[] {
  ensureDirs()
  if (!existsSync(HISTORY_FILE)) return []
  const lines = readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean)
  return lines
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(m => m && m.conversationId === conversationId)
    .map(({ role, content, timestamp }: { role: string; content: string; timestamp: string }) => ({ role, content, timestamp })) as Message[]
}

export function loadRecentHistory(limit = 50): Message[] {
  ensureDirs()
  if (!existsSync(HISTORY_FILE)) return []
  const lines = readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean)
  return lines
    .slice(-limit)
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean) as Message[]
}

export function saveConversationSummary(conversationId: string, summary: string): void {
  ensureDirs()
  const file = join(CONVERSATIONS_DIR, `${conversationId}.json`)
  writeFileSync(file, JSON.stringify({ conversationId, summary, savedAt: new Date().toISOString() }, null, 2), 'utf-8')
}

export function listConversations(): string[] {
  ensureDirs()
  if (!existsSync(CONVERSATIONS_DIR)) return []
  return readdirSync(CONVERSATIONS_DIR).filter(f => f.endsWith('.json'))
}

// ── Dream System ─────────────────────────────────────────────────────────────

export function shouldDream(): boolean {
  const memory = loadMemory()
  if (!memory.lastDream) return memory.sessionCount >= 3
  const hoursSince = (Date.now() - new Date(memory.lastDream).getTime()) / 1000 / 60 / 60
  return hoursSince >= 24 && memory.sessionCount >= 3
}

export function markDreamed(): void {
  const memory = loadMemory()
  memory.lastDream = new Date().toISOString()
  memory.sessionCount = 0
  saveMemory(memory)
}

export function incrementSession(): void {
  const memory = loadMemory()
  memory.sessionCount = (memory.sessionCount || 0) + 1
  saveMemory(memory)
}
