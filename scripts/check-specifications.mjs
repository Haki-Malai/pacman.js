import { spawnSync } from 'node:child_process';

const result = spawnSync('openspec', ['validate', '--all', '--strict', '--no-interactive'], {
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  const message = result.error instanceof Error ? result.error.message : String(result.error);
  console.error(`OpenSpec validation failed to start: ${message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
