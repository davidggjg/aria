import chalk from 'chalk'

export const colors = {
  user: chalk.cyan.bold,
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
`))
  console.log(chalk.dim('   AI Agent · Full Windows Access · Powered by Claude\n'))
  console.log(chalk.dim('   Type /help for commands\n'))
}

export function printSystem(text: string) {
  console.log(colors.system(text))
}
