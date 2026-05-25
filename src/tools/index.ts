import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import type { Tool, ToolResult } from '../types/index.js'

// ── Bash Tool ────────────────────────────────────────────────────────────────
export const bashTool: Tool = {
  name: 'bash',
  description: 'Execute a shell command. Use for running scripts, git, npm, compilers, etc.',
  input_schema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The shell command to run' },
      timeout: { type: 'number', description: 'Timeout in ms (default 30000)' }
    },
    required: ['command']
  },
  async execute(input): Promise<ToolResult> {
    const { command, timeout = 30000 } = input as { command: string; timeout?: number }
    try {
      const output = execSync(command, {
        timeout,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      return { success: true, output: output || '(no output)' }
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string }
      const out = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n')
      return { success: false, output: out, error: String(e.message) }
    }
  }
}

// ── File Read Tool ───────────────────────────────────────────────────────────
export const fileReadTool: Tool = {
  name: 'file_read',
  description: 'Read the contents of a file.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' }
    },
    required: ['path']
  },
  async execute(input): Promise<ToolResult> {
    const { path } = input as { path: string }
    try {
      const content = readFileSync(resolve(path), 'utf-8')
      return { success: true, output: content }
    } catch (err) {
      return { success: false, output: '', error: String(err) }
    }
  }
}

// ── File Write Tool ──────────────────────────────────────────────────────────
export const fileWriteTool: Tool = {
  name: 'file_write',
  description: 'Write content to a file. Creates the file if it does not exist.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' },
      content: { type: 'string', description: 'Content to write' }
    },
    required: ['path', 'content']
  },
  async execute(input): Promise<ToolResult> {
    const { path, content } = input as { path: string; content: string }
    try {
      writeFileSync(resolve(path), content, 'utf-8')
      return { success: true, output: `Written to ${path}` }
    } catch (err) {
      return { success: false, output: '', error: String(err) }
    }
  }
}

// ── Glob Tool ────────────────────────────────────────────────────────────────
export const globTool: Tool = {
  name: 'glob',
  description: 'List files matching a pattern in a directory.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'File extension or name pattern (e.g. .ts, .py)' },
      dir: { type: 'string', description: 'Directory to search (default: current)' }
    },
    required: ['pattern']
  },
  async execute(input): Promise<ToolResult> {
    const { pattern, dir = '.' } = input as { pattern: string; dir?: string }
    try {
      const results: string[] = []
      function walk(d: string) {
        for (const f of readdirSync(d)) {
          if (f.startsWith('.') || f === 'node_modules') continue
          const full = join(d, f)
          const stat = statSync(full)
          if (stat.isDirectory()) walk(full)
          else if (full.includes(pattern)) results.push(full)
        }
      }
      walk(resolve(dir))
      return { success: true, output: results.join('\n') || 'No files found.' }
    } catch (err) {
      return { success: false, output: '', error: String(err) }
    }
  }
}

// ── Grep Tool ────────────────────────────────────────────────────────────────
export const grepTool: Tool = {
  name: 'grep',
  description: 'Search for a pattern in files.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Search pattern' },
      path: { type: 'string', description: 'File or directory to search' },
      recursive: { type: 'boolean', description: 'Search recursively (default true)' }
    },
    required: ['pattern', 'path']
  },
  async execute(input): Promise<ToolResult> {
    const { pattern, path, recursive = true } = input as { pattern: string; path: string; recursive?: boolean }
    try {
      const flag = recursive ? '-r' : ''
      const output = execSync(`grep -n ${flag} "${pattern}" "${resolve(path)}" 2>/dev/null || echo "No matches"`, {
        encoding: 'utf-8'
      })
      return { success: true, output }
    } catch {
      return { success: true, output: 'No matches.' }
    }
  }
}

// ── All Tools ────────────────────────────────────────────────────────────────
export const ALL_TOOLS: Tool[] = [bashTool, fileReadTool, fileWriteTool, globTool, grepTool]
