# Aria — AI Coding Agent

An AI coding agent CLI powered by Claude, inspired by Claude Code's architecture.

## Features

- **Agent loop** — Claude + tools in a continuous loop
- **Tools** — bash, file_read, file_write, glob, grep
- **Memory** — persists facts between sessions (`~/.aria/memory.json`)
- **Coordinator mode** — multi-agent orchestration for complex tasks
- **Streaming output** — see responses as they come in

## Setup

```bash
# Install dependencies
bun install

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run
bun run dev
```

## Build

```bash
bun run build
# Then run:
node dist/main.js
```

## Commands

| Command | Description |
|---------|-------------|
| `/memory` | Show what Aria remembers |
| `/remember <fact>` | Add a fact to memory |
| `/coordinator <task>` | Multi-agent mode for complex tasks |
| `/clear` | Clear conversation history |
| `/help` | Show help |
| `/exit` | Quit |

## Architecture

```
src/
├── main.ts          # CLI entry point + REPL loop
├── agent/           # Core agent (Claude API + tool loop)
├── tools/           # bash, file_read, file_write, glob, grep
├── memory/          # Persistent memory between sessions
├── coordinator/     # Multi-agent orchestration
├── utils/           # Colors, formatting
└── types/           # TypeScript types
```

## Extending

Add a new tool in `src/tools/index.ts`:

```typescript
export const myTool: Tool = {
  name: 'my_tool',
  description: 'What it does',
  input_schema: {
    type: 'object',
    properties: {
      input: { type: 'string', description: '...' }
    },
    required: ['input']
  },
  async execute(input) {
    // your logic
    return { success: true, output: 'result' }
  }
}

// Add to ALL_TOOLS array
export const ALL_TOOLS = [...existingTools, myTool]
```
