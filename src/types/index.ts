// Core types for Aria

export interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string | ContentBlock[]
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
}

export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  execute: (input: Record<string, unknown>) => Promise<ToolResult>
}

export interface ToolResult {
  success: boolean
  output: string
  error?: string
}

export interface AgentConfig {
  model: string
  maxTokens: number
  systemPrompt: string
  tools: Tool[]
}

export interface Memory {
  facts: string[]
  projectContext: string
  lastUpdated: string
}

export interface SubAgent {
  id: string
  task: string
  status: 'running' | 'done' | 'error'
  result?: string
}
