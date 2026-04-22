/* ===== TERMINAL COMPONENT ===== */

import { YEET } from '../config.js';
import { formatDuration } from '../utils/helpers.js';

export function initTerminal() {
  const input = document.getElementById('terminal-input');
  const output = document.getElementById('terminal-output');
  if (!input || !output) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (!cmd) return;

      appendToTerminal(`$ ${cmd}`, 'command');
      executeCommand(cmd);
      input.value = '';
    }
  });

  appendToTerminal('Welcome to Yeet Terminal', 'info');
  appendToTerminal('Type "help" for available commands', 'info');
}

export function appendToTerminal(text, type = 'output') {
  const output = document.getElementById('terminal-output');
  if (!output) return;

  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

export function executeCommand(cmd) {
  const commands = {
    help: () => {
      appendToTerminal('Available commands:', 'info');
      appendToTerminal('  status    - Show system status', 'output');
      appendToTerminal('  projects  - List all projects', 'output');
      appendToTerminal('  clear     - Clear terminal', 'output');
      appendToTerminal('  whoami    - Show current user', 'output');
      appendToTerminal('  date      - Show current date/time', 'output');
    },
    status: () => {
      appendToTerminal(`System: ${YEET.state.platform}`, 'output');
      appendToTerminal(`Hostname: ${YEET.state.hostname}`, 'output');
      appendToTerminal(`Uptime: ${formatDuration(performance.now())}`, 'output');
    },
    projects: () => {
      YEET.config.projects.forEach(p => {
        appendToTerminal(`  ${p.name} - ${p.status || 'unknown'}`, 'output');
      });
    },
    clear: () => {
      const output = document.getElementById('terminal-output');
      if (output) output.innerHTML = '';
    },
    whoami: () => appendToTerminal(YEET.config.userName || 'Yigit', 'output'),
    date: () => appendToTerminal(new Date().toLocaleString('tr-TR'), 'output')
  };

  const cmdFn = commands[cmd.toLowerCase()];
  if (cmdFn) {
    cmdFn();
  } else {
    appendToTerminal(`Command not found: ${cmd}`, 'error');
    appendToTerminal('Type "help" for available commands', 'info');
  }
}
