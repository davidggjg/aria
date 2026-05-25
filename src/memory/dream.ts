import Anthropic from '@anthropic-ai/sdk'
import { loadRecentHistory, loadMemory, saveMemory, saveConversationSummary, markDreamed, ARIA_DIR } from './index.js'
import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const client = new Anthropic()

export async function runDream(onUpdate: (msg: string) => void): Promise<void> {
  onUpdate('\n💭 [dream] Starting memory consolidation...\n')

  const recentMessages = loadRecentHistory(100)
  if (recentMessages.length === 0) {
    onUpdate('💭 [dream] No history to process.\n')
    markDreamed()
    return
  }

  const historyText = recentMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 500)}`)
    .join('\n\n')

  const memory = loadMemory()
  const existingFacts = memory.facts.join('\n')

  const prompt = `You are performing a "dream" - consolidating recent conversation history into lasting memories.

Existing facts you know:
${existingFacts || '(none yet)'}

Recent conversation history:
${historyText}

Your job:
1. Extract important facts about the user (preferences, projects they work on, their setup, things they told you)
2. Extract important facts about their computer/environment
3. Identify what projects/tasks they care about
4. Remove any facts from existing list that are now outdated or wrong

Respond with JSON only:
{
  "new_facts": ["fact1", "fact2", ...],
  "remove_facts": ["exact fact to remove", ...],
  "project_context": "brief description of main project/work this user does"
}

Keep facts concise (under 100 chars each). Max 30 new facts.`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    const json = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(json)

    const mem = loadMemory()

    // Remove outdated facts
    if (result.remove_facts?.length) {
      mem.facts = mem.facts.filter(f => !result.remove_facts.includes(f))
    }

    // Add new facts
    if (result.new_facts?.length) {
      for (const fact of result.new_facts) {
        if (!mem.facts.includes(fact)) mem.facts.push(fact)
      }
      if (mem.facts.length > 200) mem.facts = mem.facts.slice(-200)
    }

    // Update project context
    if (result.project_context) {
      mem.projectContext = result.project_context
    }

    saveMemory(mem)

    // Save dream log
    const dreamLog = join(ARIA_DIR, `dream-${Date.now()}.json`)
    writeFileSync(dreamLog, JSON.stringify({ date: new Date().toISOString(), result }, null, 2), 'utf-8')

    onUpdate(`💭 [dream] Learned ${result.new_facts?.length ?? 0} new facts. Memory updated.\n`)
  } catch (err) {
    onUpdate(`💭 [dream] Failed: ${String(err)}\n`)
  }

  markDreamed()
}
