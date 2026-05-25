// Core types for Aria

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  startedAt: string
  updatedAt: string
  messages: Message[]
  summary?: string
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

export interface Memory {
  facts: string[]
  projectContext: string
  lastUpdated: string
  lastDream: string
  sessionCount: number
}

export interface SubAgent {
  id: string
  task: string
  status: 'running' | 'done' | 'error'
  result?: string
}
