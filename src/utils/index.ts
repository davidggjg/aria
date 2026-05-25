import chalk from 'chalk'

export const colors = {
  user: chalk.cyan,
  assistant: chalk.white,
  tool: chalk.yellow,
  system: chalk.gray,
  error: chalk.red,
  success: chalk.green,
  dim: chalk.dim
}

export function printBanner() {
  console.log(chalk.bold.magenta(`
  ▄████████    ▄████████  ▄█     ▄████████ 
  ███    ███   ███    ███ ███    ███    ███ 
  ███    ███   ███    ███ ███▌   ███    ███ 
  ███    ███  ▄███▄▄▄▄██▀ ███▌   ███    ███ 
▀███████████ ▀▀███▀▀▀▀▀   ███▌ ▀███████████ 
  ███    ███ ▀███████████ ███    ███    ███ 
  ███    ███   ███    ███ ███    ███    ███ 
  ███    █▀    ███    ███ █▀     ███    █▀  
               ███    ███                   
`))
  console.log(chalk.dim('  AI coding agent · powered by Claude\n'))
  console.log(chalk.dim('  Commands: /memory  /coordinator  /clear  /exit\n'))
}

export function printUser(text: string) {
  process.stdout.write(colors.user('\nYou: ') + text + '\n\n')
  process.stdout.write(colors.assistant('Aria: '))
}

export function printSystem(text: string) {
  console.log(colors.system(text))
}
