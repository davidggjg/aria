import { execSync, spawnSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, unlinkSync, copyFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import type { Tool, ToolResult } from '../types/index.js'

function run(cmd: string, timeout = 60000): ToolResult {
  try {
    // On Windows use PowerShell
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', cmd], {
      timeout,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    })
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    return { success: result.status === 0, output: output || '(no output)' }
  } catch (err) {
    return { success: false, output: '', error: String(err) }
  }
}

// ── PowerShell Tool ──────────────────────────────────────────────────────────
export const powershellTool: Tool = {
  name: 'powershell',
  description: 'Run a PowerShell command on Windows. Use for anything: file ops, installing software, running programs, network, registry, etc.',
  input_schema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'PowerShell command to run' },
      timeout: { type: 'number', description: 'Timeout ms (default 60000)' }
    },
    required: ['command']
  },
  async execute(input): Promise<ToolResult> {
    const { command, timeout = 60000 } = input as { command: string; timeout?: number }
    return run(command, timeout)
  }
}

// ── CMD Tool ─────────────────────────────────────────────────────────────────
export const cmdTool: Tool = {
  name: 'cmd',
  description: 'Run a Windows CMD command (use for legacy commands, batch scripts, etc.)',
  input_schema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'CMD command to run' }
    },
    required: ['command']
  },
  async execute(input): Promise<ToolResult> {
    const { command } = input as { command: string }
    try {
      const result = spawnSync('cmd.exe', ['/c', command], {
        timeout: 60000,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      })
      const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
      return { success: result.status === 0, output: output || '(no output)' }
    } catch (err) {
      return { success: false, output: '', error: String(err) }
    }
  }
}

// ── File Read Tool ───────────────────────────────────────────────────────────
export const fileReadTool: Tool = {
  name: 'file_read',
  description: 'Read the contents of any file on the computer.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Full or relative path to the file' }
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
  description: 'Write or create a file anywhere on the computer.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to write to' },
      content: { type: 'string', description: 'Content to write' },
      append: { type: 'boolean', description: 'Append instead of overwrite (default false)' }
    },
    required: ['path', 'content']
  },
  async execute(input): Promise<ToolResult> {
    const { path, content, append = false } = input as { path: string; content: string; append?: boolean }
    try {
      const fullPath = resolve(path)
      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, { flag: append ? 'a' : 'w', encoding: 'utf-8' })
      return { success: true, output: `${append ? 'Appended to' : 'Written to'} ${fullPath}` }
    } catch (err) {
      return { success: false, output: '', error: String(err) }
    }
  }
}

// ── File Delete Tool ─────────────────────────────────────────────────────────
export const fileDeleteTool: Tool = {
  name: 'file_delete',
  description: 'Delete a file.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to delete' }
    },
    required: ['path']
  },
  async execute(input): Promise<ToolResult> {
    const { path } = input as { path: string }
    try {
      unlinkSync(resolve(path))
      return { success: true, output: `Deleted ${path}` }
    } catch (err) {
      return { success: false, output: '', error: String(err) }
    }
  }
}

// ── File Copy Tool ───────────────────────────────────────────────────────────
export const fileCopyTool: Tool = {
  name: 'file_copy',
  description: 'Copy a file from one location to another.',
  input_schema: {
    type: 'object',
    properties: {
      src: { type: 'string', description: 'Source path' },
      dest: { type: 'string', description: 'Destination path' }
    },
    required: ['src', 'dest']
  },
  async execute(input): Promise<ToolResult> {
    const { src, dest } = input as { src: string; dest: string }
    try {
      copyFileSync(resolve(src), resolve(dest))
      return { success: true, output: `Copied ${src} → ${dest}` }
    } catch (err) {
      return { success: false, output: '', error: String(err) }
    }
  }
}

// ── List Directory Tool ──────────────────────────────────────────────────────
export const listDirTool: Tool = {
  name: 'list_dir',
  description: 'List files and folders in a directory.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path (default: current)' },
      recursive: { type: 'boolean', description: 'List recursively (default false)' }
    }
  },
  async execute(input): Promise<ToolResult> {
    const { path = '.', recursive = false } = input as { path?: string; recursive?: boolean }
    try {
      const results: string[] = []
      function walk(d: string, depth = 0) {
        const entries = readdirSync(d)
        for (const e of entries) {
          if (e === 'node_modules' || e === '.git') continue
          const full = join(d, e)
          const stat = statSync(full)
          results.push('  '.repeat(depth) + (stat.isDirectory() ? `📁 ${e}/` : `📄 ${e}`))
          if (recursive && stat.isDirectory() && depth < 4) walk(full, depth + 1)
        }
      }
      walk(resolve(path))
      return { success: true, output: results.join('\n') || '(empty)' }
    } catch (err) {
      return { success: false, output: '', error: String(err) }
    }
  }
}

// ── Glob Tool ────────────────────────────────────────────────────────────────
export const globTool: Tool = {
  name: 'glob',
  description: 'Find files matching a pattern (e.g. .ts, .py, .json).',
  input_schema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Pattern to match (e.g. .ts, config)' },
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
          if (f === 'node_modules' || f === '.git') continue
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
  description: 'Search for text inside files.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Text or regex to search for' },
      path: { type: 'string', description: 'File or directory to search in' },
      recursive: { type: 'boolean', description: 'Search recursively (default true)' }
    },
    required: ['pattern', 'path']
  },
  async execute(input): Promise<ToolResult> {
    const { pattern, path, recursive = true } = input as { pattern: string; path: string; recursive?: boolean }
    return run(`Select-String -Pattern "${pattern}" -Path "${resolve(path)}"${recursive ? ' -Recurse' : ''} | Select-Object -First 50`)
  }
}

// ── Web Fetch Tool ───────────────────────────────────────────────────────────
export const webFetchTool: Tool = {
  name: 'web_fetch',
  description: 'Fetch the content of a URL (download a page, file, API response).',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to fetch' },
      save_to: { type: 'string', description: 'Optional: save response to this file path' }
    },
    required: ['url']
  },
  async execute(input): Promise<ToolResult> {
    const { url, save_to } = input as { url: string; save_to?: string }
    if (save_to) {
      return run(`Invoke-WebRequest -Uri "${url}" -OutFile "${resolve(save_to)}"`)
    }
    return run(`(Invoke-WebRequest -Uri "${url}").Content | Select-String -Pattern "." | Select-Object -First 100`)
  }
}

// ── Install Tool ─────────────────────────────────────────────────────────────
export const installTool: Tool = {
  name: 'install',
  description: 'Install software or packages. Supports winget, npm, pip, choco.',
  input_schema: {
    type: 'object',
    properties: {
      package: { type: 'string', description: 'Package name to install' },
      manager: {
        type: 'string',
        description: 'Package manager: winget, npm, pip, choco, npm-global (default: auto-detect)'
      }
    },
    required: ['package']
  },
  async execute(input): Promise<ToolResult> {
    const { package: pkg, manager = 'auto' } = input as { package: string; manager?: string }

    const commands: Record<string, string> = {
      winget: `winget install --silent "${pkg}"`,
      npm: `npm install "${pkg}"`,
      'npm-global': `npm install -g "${pkg}"`,
      pip: `pip install "${pkg}"`,
      choco: `choco install "${pkg}" -y`
    }

    if (manager !== 'auto') {
      return run(commands[manager] ?? `winget install "${pkg}"`, 120000)
    }

    // Auto-detect
    if (pkg.startsWith('@') || pkg.includes('/')) return run(commands.npm, 120000)
    if (pkg.endsWith('.py') || ['numpy', 'pandas', 'requests', 'flask', 'django'].includes(pkg)) return run(commands.pip, 120000)
    return run(commands.winget, 120000)
  }
}

// ── Process List Tool ─────────────────────────────────────────────────────────
export const processesTool: Tool = {
  name: 'processes',
  description: 'List or kill running processes.',
  input_schema: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'list or kill' },
      name: { type: 'string', description: 'Process name (for kill)' }
    },
    required: ['action']
  },
  async execute(input): Promise<ToolResult> {
    const { action, name } = input as { action: string; name?: string }
    if (action === 'kill' && name) {
      return run(`Stop-Process -Name "${name}" -Force`)
    }
    return run(`Get-Process | Sort-Object CPU -Descending | Select-Object -First 30 | Format-Table Name, CPU, WorkingSet -AutoSize`)
  }
}

// ── System Info Tool ──────────────────────────────────────────────────────────
export const systemInfoTool: Tool = {
  name: 'system_info',
  description: 'Get system information: OS, CPU, RAM, disk, network, etc.',
  input_schema: {
    type: 'object',
    properties: {
      what: { type: 'string', description: 'What to check: all, cpu, ram, disk, network, os' }
    }
  },
  async execute(input): Promise<ToolResult> {
    const { what = 'all' } = input as { what?: string }
    const cmds: Record<string, string> = {
      os: `Get-ComputerInfo | Select-Object OsName, OsVersion, OsArchitecture`,
      cpu: `Get-WmiObject Win32_Processor | Select-Object Name, NumberOfCores, MaxClockSpeed`,
      ram: `Get-WmiObject Win32_PhysicalMemory | Measure-Object Capacity -Sum | Select-Object Sum`,
      disk: `Get-PSDrive -PSProvider FileSystem | Format-Table Name, Used, Free -AutoSize`,
      network: `Get-NetIPAddress | Where-Object AddressFamily -eq 'IPv4' | Format-Table InterfaceAlias, IPAddress`,
      all: `$os = (Get-WmiObject Win32_OperatingSystem); $cpu = (Get-WmiObject Win32_Processor | Select-Object -First 1); Write-Host "OS: $($os.Caption)"; Write-Host "CPU: $($cpu.Name)"; Write-Host "RAM: $([math]::Round($os.TotalVisibleMemorySize/1MB, 1)) GB"`
    }
    return run(cmds[what] ?? cmds.all)
  }
}

// ── Screenshot Tool ───────────────────────────────────────────────────────────
export const screenshotTool: Tool = {
  name: 'screenshot',
  description: 'Take a screenshot and save it to a file.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Where to save the screenshot (default: Desktop\\aria-screenshot.png)' }
    }
  },
  async execute(input): Promise<ToolResult> {
    const { path = '%USERPROFILE%\\Desktop\\aria-screenshot.png' } = input as { path?: string }
    return run(`Add-Type -AssemblyName System.Windows.Forms; $screen = [System.Windows.Forms.Screen]::PrimaryScreen; $bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size); $bmp.Save("${path}"); Write-Host "Screenshot saved to ${path}"`)
  }
}

// ── All Tools ─────────────────────────────────────────────────────────────────
export const ALL_TOOLS: Tool[] = [
  powershellTool,
  cmdTool,
  fileReadTool,
  fileWriteTool,
  fileDeleteTool,
  fileCopyTool,
  listDirTool,
  globTool,
  grepTool,
  webFetchTool,
  installTool,
  processesTool,
  systemInfoTool,
  screenshotTool
]
