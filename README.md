# Aria — AI Agent for Windows

AI agent with full Windows access, persistent memory, and dream-based learning.

## Setup

```powershell
# Install Bun (if not installed)
irm bun.sh/install.ps1 | iex

# Install dependencies
bun install

# Set API key (add to your PowerShell profile to make permanent)
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# Run
bun run dev
```

## What Aria can do

| Tool | Description |
|------|-------------|
| `powershell` | Run any PowerShell command |
| `cmd` | Run CMD commands |
| `file_read` | Read any file |
| `file_write` | Write/create any file |
| `file_delete` | Delete files |
| `file_copy` | Copy files |
| `list_dir` | List directory contents |
| `glob` | Find files by pattern |
| `grep` | Search text in files |
| `web_fetch` | Download pages/files from internet |
| `install` | Install software (winget/npm/pip/choco) |
| `processes` | List or kill processes |
| `system_info` | CPU, RAM, disk, network info |
| `screenshot` | Take a screenshot |

## Commands

| Command | Description |
|---------|-------------|
| `/memory` | Show everything Aria remembers about you |
| `/history` | Recent conversation history |
| `/remember <fact>` | Manually add a memory |
| `/dream` | Consolidate memory now |
| `/coordinator <task>` | Multi-agent mode for complex tasks |
| `/clear` | Clear current conversation |
| `/help` | Show help |
| `/exit` | Quit |

## Memory & Dream System

Aria remembers facts between sessions in `~/.aria/memory.json`.

The **dream system** automatically runs after several sessions to consolidate conversation history into lasting facts — similar to how sleep consolidates human memory.

Conversation history is stored in `~/.aria/history.jsonl`.

## Architecture

```
src/
├── main.ts              # CLI entry + REPL loop
├── agent/               # Claude API + tool execution loop
├── tools/               # 14 Windows tools
├── memory/
│   ├── index.ts         # Memory + history persistence
│   └── dream.ts         # Dream consolidation system
├── coordinator/         # Multi-agent orchestration
├── utils/               # Colors, formatting
└── types/               # TypeScript types
```
