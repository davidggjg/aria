import Anthropic from '@anthropic-ai/sdk'
import type { SubAgent } from '../types/index.js'
import { runAgent } from '../agent/index.js'
import type { Message } from '../types/index.js'

const client = new Anthropic()

const COORDINATOR_SYSTEM = `You are the coordinator of an AI agent team called Aria.
Your job is to break down complex tasks into parallel subtasks and delegate them to worker agents.

When given a complex task:
1. Analyze what needs to be done
2. Break it into independent subtasks that can run in parallel
3. Describe each subtask clearly
4. Synthesize the results into a coherent whole

Respond with JSON in this format:
{
  "tasks": [
    { "id": "1", "description": "..." },
    { "id": "2", "description": "..." }
  ],
  "synthesis_prompt": "How to combine the results..."
}

If the task is simple enough for one agent, respond with:
{ "tasks": [{ "id": "1", "description": "<original task>" }], "synthesis_prompt": "" }
`

interface CoordinatorPlan {
  tasks: { id: string; description: string }[]
  synthesis_prompt: string
}

export async function coordinatedRun(
  task: string,
  onUpdate: (msg: string) => void
): Promise<string> {
  // Step 1: Coordinator plans the work
  onUpdate('[coordinator] Planning...\n')

  const planResponse = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: COORDINATOR_SYSTEM,
    messages: [{ role: 'user', content: task }]
  })

  let plan: CoordinatorPlan
  try {
    const text = planResponse.content.find(b => b.type === 'text')?.text ?? ''
    const json = text.replace(/```json|```/g, '').trim()
    plan = JSON.parse(json)
  } catch {
    // Fallback: single task
    plan = { tasks: [{ id: '1', description: task }], synthesis_prompt: '' }
  }

  onUpdate(`[coordinator] ${plan.tasks.length} task(s) identified\n`)

  // Step 2: Run tasks (in parallel if multiple)
  const agents: SubAgent[] = plan.tasks.map(t => ({
    id: t.id,
    task: t.description,
    status: 'running'
  }))

  const results = await Promise.all(
    agents.map(async (agent) => {
      onUpdate(`[agent-${agent.id}] Starting: ${agent.task.slice(0, 60)}...\n`)
      const msgs: Message[] = []
      let output = ''
      await runAgent(agent.task, msgs, (text) => { output += text })
      onUpdate(`[agent-${agent.id}] Done.\n`)
      return { id: agent.id, output }
    })
  )

  // Step 3: Synthesize if multiple tasks
  if (results.length === 1) {
    return results[0].output
  }

  onUpdate('[coordinator] Synthesizing results...\n')

  const synthesisInput = results
    .map(r => `=== Agent ${r.id} ===\n${r.output}`)
    .join('\n\n')

  const synthesisPrompt = plan.synthesis_prompt
    ? `${plan.synthesis_prompt}\n\nAgent results:\n${synthesisInput}`
    : `Combine these agent results into a coherent response:\n${synthesisInput}`

  const synthesisResponse = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: synthesisPrompt }]
  })

  return synthesisResponse.content.find(b => b.type === 'text')?.text ?? synthesisInput
}
