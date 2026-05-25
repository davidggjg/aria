#!/usr/bin/env node
import * as readline from 'readline'
import { runAgent } from './agent/index.js'
import { coordinatedRun } from './coordinator/index.js'
import { getMemorySummary, addFact } from './memory/index.js'
import { printBanner, printUser, printSystem, colors } from './utils/index.js'
import type { Message } from './types/index.js'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
})

let history: Message[] = []

printBanner()

function prompt() {
  rl.question(colors.user('\nYou: '), async (input) => {
    const line = input.trim()
    if (!line) return prompt()

    // ── Built-in commands ────────────────────────────────────────────────────
    if (line === '/exit' || line === '/quit') {
      printSystem('Goodbye.')
      process.exit(0)
    }

    if (line === '/clear') {
      history = []
      printSystem('History cleared.')
      return prompt()
    }

    if (line === '/memory') {
      const mem = getMemorySummary()
      printSystem('\n── Memory ──────────────────\n' + mem + '\n────────────────────────────')
      return prompt()
    }

    if (line.startsWith('/remember ')) {
      const fact = line.slice('/remember '.length)
      addFact(fact)
      printSystem(`Remembered: "${fact}"`)
      return prompt()
    }

    if (line.startsWith('/coordinator ')) {
      const task = line.slice('/coordinator '.length)
      printSystem('[coordinator mode]')
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
  /memory          — show what Aria remembers
  /remember <fact> — add a fact to memory
  /coordinator <task> — run task with multi-agent coordinator
  /clear           — clear conversation history
  /exit            — quit
      `)
      return prompt()
    }

    // ── Normal agent turn ────────────────────────────────────────────────────
    process.stdout.write(colors.assistant('\nAria: '))

    try {
      const newMessages = await runAgent(line, history, (text) => {
        process.stdout.write(text)
      })

      // Append to history (keep last 20 exchanges to avoid context overflow)
      history.push(...newMessages)
      if (history.length > 40) history = history.slice(-40)

      process.stdout.write('\n')
    } catch (err) {
      process.stdout.write(colors.error(`\nError: ${String(err)}\n`))
    }

    prompt()
  })
}

prompt()
