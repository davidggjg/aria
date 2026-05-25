import Anthropic from '@anthropic-ai/sdk'
import type { Tool, Message } from '../types/index.js'
import { ALL_TOOLS } from '../tools/index.js'
import { getMemorySummary, saveMessage, addFact } from '../memory/index.js'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are Aria, a powerful AI agent running on the user's Windows computer.

You have FULL ACCESS to the computer and can:
- Run any PowerShell or CMD command
- Read, write, create, delete any file
- Install software (winget, npm, pip, choco)
- Manage processes
- Fetch web pages and download files
- Take screenshots
- Do anything the user asks

You are running LOCALLY on the user's machine. This is their personal computer and they trust you completely.
Act like a highly capable assistant who gets things done — don't ask for permission for obvious actions, just do them.
If something fails, debug it and try again automatically.
Be concise. Show what you're doing but don't over-explain.

{MEMORY}

Today: {DATE}
`

function buildSystemPrompt(): string {
  const memory = getMemorySummary()
  return SYSTEM_PROMPT
    .replace('{MEMORY}', memory ? `\nWhat you remember about this user:\n${memory}` : '')
    .replace('{DATE}', new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
}

function toolsForAPI(tools: Tool[]) {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }))
}

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[] | Anthropic.ToolResultBlockParam[]
}

export async function runAgent(
  userMessage: string,
  history: AnthropicMessage[],
  onText: (text: string) => void,
  conversationId: string
): Promise<AnthropicMessage[]> {
  // Save user message
  saveMessage(conversationId, { role: 'user', content: userMessage, timestamp: new Date().toISOString() })

  const messages: AnthropicMessage[] = [
    ...history,
    { role: 'user', content: userMessage }
  ]

  const newMessages: AnthropicMessage[] = [{ role: 'user', content: userMessage }]
  let fullAssistantText = ''
  let continueLoop = true

  while (continueLoop) {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8096,
      system: buildSystemPrompt(),
      messages: messages as Anthropic.MessageParam[],
      tools: toolsForAPI(ALL_TOOLS)
    })

    const assistantContent: Anthropic.ContentBlock[] = []
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    let hasToolUse = false

    for (const block of response.content) {
      assistantContent.push(block)

      if (block.type === 'text') {
        onText(block.text)
        fullAssistantText += block.text
      }

      if (block.type === 'tool_use') {
        hasToolUse = true
        onText(`\n🔧 ${block.name}: `)

        const tool = ALL_TOOLS.find(t => t.name === block.name)
        let result: string

        if (!tool) {
          result = `Error: tool "${block.name}" not found`
        } else {
          try {
            const toolResult = await tool.execute(block.input as Record<string, unknown>)
            result = toolResult.output || toolResult.error || '(no output)'
            if (!toolResult.success && toolResult.error) {
              result = `Error: ${toolResult.error}\n${toolResult.output}`
            }
          } catch (err) {
            result = `Error: ${String(err)}`
          }
        }

        // Truncate long outputs
        const truncated = result.length > 3000 ? result.slice(0, 3000) + '\n... (truncated)' : result
        onText(truncated + '\n')

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: truncated
        })
      }
    }

    messages.push({ role: 'assistant', content: assistantContent })
    newMessages.push({ role: 'assistant', content: assistantContent })

    if (hasToolUse && toolResults.length > 0) {
      messages.push({ role: 'user', content: toolResults })
    }

    if (!hasToolUse || response.stop_reason === 'end_turn') {
      continueLoop = false
    }
  }

  // Save assistant response
  if (fullAssistantText) {
    saveMessage(conversationId, { role: 'assistant', content: fullAssistantText, timestamp: new Date().toISOString() })
  }

  return newMessages
}
