import Anthropic from '@anthropic-ai/sdk'
import type { Tool, Message } from '../types/index.js'
import { ALL_TOOLS } from '../tools/index.js'
import { getMemorySummary } from '../memory/index.js'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are Aria, an expert AI coding agent running in the terminal.

You help users write, read, debug, and understand code. You have access to tools:
- bash: run shell commands
- file_read: read files
- file_write: write/create files
- glob: find files by pattern
- grep: search in files

Guidelines:
- Be concise and direct
- Use tools proactively — don't ask if you can just do it
- When writing code, write the full implementation
- Explain what you're doing briefly before doing it
- If something fails, debug it automatically

{MEMORY}
`

function buildSystemPrompt(): string {
  const memory = getMemorySummary()
  return SYSTEM_PROMPT.replace('{MEMORY}', memory ? `\nWhat you remember:\n${memory}` : '')
}

function toolsForAPI(tools: Tool[]) {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }))
}

export async function runAgent(
  userMessage: string,
  history: Message[],
  onText: (text: string) => void
): Promise<Message[]> {
  const messages = [
    ...history,
    { role: 'user' as const, content: userMessage }
  ]

  let continueLoop = true
  const newMessages: Message[] = [{ role: 'user', content: userMessage }]

  while (continueLoop) {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8096,
      system: buildSystemPrompt(),
      messages: messages.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role as 'user' | 'assistant',
        content: m.content
      })),
      tools: toolsForAPI(ALL_TOOLS)
    })

    const assistantContent: Anthropic.ContentBlock[] = []
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    let hasToolUse = false

    for (const block of response.content) {
      assistantContent.push(block)

      if (block.type === 'text') {
        onText(block.text)
      }

      if (block.type === 'tool_use') {
        hasToolUse = true
        onText(`\n[tool: ${block.name}]\n`)

        // Find and execute the tool
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
            result = `Error executing tool: ${String(err)}`
          }
        }

        onText(`${result}\n`)

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result
        })
      }
    }

    // Add assistant message to history
    messages.push({ role: 'assistant', content: assistantContent })
    newMessages.push({ role: 'assistant', content: JSON.stringify(assistantContent) })

    // If there were tool uses, add results and continue
    if (hasToolUse && toolResults.length > 0) {
      messages.push({ role: 'user', content: toolResults })
    }

    // Stop if no tool use or stop reason is end_turn
    if (!hasToolUse || response.stop_reason === 'end_turn') {
      continueLoop = false
    }
  }

  return newMessages
}
