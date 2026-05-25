#!/usr/bin/env node
import * as readline from 'readline'
import { randomUUID } from 'crypto'
import { runAgent } from './agent/index.js'
import { coordinatedRun } from './coordinator/index.js'
import { getMemorySummary, addFact, loadRecentHistory, shouldDream, incrementSession } from './memory/index.js'
import { runDream } from './memory/dream.js'
import { printBanner, printSystem, colors } from './utils/index.js'
import type { Message } from './types/index.js'
import Anthropic from '@anthropic-ai/sdk'

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[] | Anthropic.ToolResultBlockParam[]
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
})

const conversationId = randomUUID()
let history: AnthropicMessage[] = []

printBanner()

// Increment session count and check if dream needed
incrementSession()
if (shouldDream()) {
  runDream((msg) => process.stdout.write(colors.dim(msg)))
}

function prompt() {
  rl.question(colors.user('\nYou: '), async (input) => {
    const line = input.trim()
    if (!line) return prompt()

    // ── Commands ─────────────────────────────────────────────────────────────

    if (line === '/exit' || line === '/quit') {
      printSystem('Goodbye.')
      process.exit(0)
    }

    if (line === '/clear') {
      history = []
      printSystem('Conversation cleared (history on disk is preserved).')
      return prompt()
    }

    if (line === '/memory') {
      const mem = getMemorySummary()
      printSystem('\n── Memory ──────────────────────────────────\n' + (mem || '(nothing yet)') + '\n────────────────────────────────────────────')
      return prompt()
    }

    if (line === '/history') {
      const recent = loadRecentHistory(20)
      printSystem('\n── Recent History ───────────────────────────')
      for (const m of recent) {
        const who = m.role === 'user' ? 'You' : 'Aria'
        const ts = new Date(m.timestamp).toLocaleTimeString('he-IL')
        printSystem(`[${ts}] ${who}: ${String(m.content).slice(0, 120)}`)
      }
      printSystem('─────────────────────────────────────────────')
      return prompt()
    }

    if (line.startsWith('/remember ')) {
      const fact = line.slice('/remember '.length)
      addFact(fact)
      printSystem(`✓ Remembered: "${fact}"`)
      return prompt()
    }

    if (line === '/dream') {
      await runDream((msg) => process.stdout.write(colors.dim(msg)))
      return prompt()
    }

    if (line.startsWith('/coordinator ')) {
      const task = line.slice('/coordinator '.length)
      printSystem('[coordinator mode activated]')
      process.stdout.write(colors.assistant('\nAria: '))
      const result = await coordinatedRun(task, (msg) => {
        process.stdout.write(colors.dim(msg))
      })
      process.stdout.write('\n' + result + '\n')
      return prompt()
    }

    if (line === '/help') {
      printSystem(`
Commands:
  /memory              — show everything Aria remembers about you
  /history             — show recent conversation history
  /remember <fact>     — manually add a fact to memory
  /dream               — run memory consolidation now
  /coordinator <task>  — multi-agent mode for complex tasks
  /clear               — clear current conversation (history preserved)
  /help                — show this
  /exit                — quit
      `)
      return prompt()
    }

    // ── Agent turn ────────────────────────────────────────────────────────────
    process.stdout.write(colors.assistant('\nAria: '))

    try {
      const newMessages = await runAgent(line, history, (text) => {
        process.stdout.write(text)
      }, conversationId)

      history.push(...newMessages)
      // Keep last 30 exchanges in memory to avoid overflow
      if (history.length > 60) history = history.slice(-60)

      process.stdout.write('\n')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      process.stdout.write(colors.error(`\nError: ${msg}\n`))
    }

    prompt()
  })
}

prompt()
