import fs from 'node:fs';
import path from 'node:path';

const coveragePath = path.resolve(process.cwd(), 'coverage/coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error(`Coverage summary not found: ${coveragePath}`);
  console.error('Run `pnpm run test:mechanics:coverage` first.');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

const thresholds = {
  'src/game/domain/services/MovementRules.ts': { lines: 98, branches: 95 },
  'src/game/domain/services/PortalService.ts': { lines: 98, branches: 95 },
  'src/game/domain/services/GhostDecisionService.ts': { lines: 95, branches: 92 },
  'src/game/domain/services/GhostJailService.ts': { lines: 95, branches: 90 },
  'src/game/systems/PacmanMovementSystem.ts': { lines: 95, branches: 90 },
  'src/game/systems/GhostMovementSystem.ts': { lines: 95, branches: 90 },
  'src/game/systems/GhostReleaseSystem.ts': { lines: 95, branches: 90 },
  'src/game/systems/AnimationSystem.ts': { lines: 95, branches: 90 },
  'src/game/app/GameRuntime.ts': { lines: 95, branches: 90 },
};

function findFileCoverage(target) {
  if (summary[target]) {
    return summary[target];
  }

  const normalizedTarget = target.split(path.sep).join('/');
  const foundKey = Object.keys(summary).find((key) => key.endsWith(normalizedTarget));
  return foundKey ? summary[foundKey] : null;
}

const failures = [];

Object.entries(thresholds).forEach(([filePath, threshold]) => {
  const coverage = findFileCoverage(filePath);
  if (!coverage) {
    failures.push(`${filePath}: missing from coverage summary`);
    return;
  }

  const linePct = Number(coverage.lines?.pct ?? 0);
  const branchPct = Number(coverage.branches?.pct ?? 0);

  if (linePct < threshold.lines) {
    failures.push(`${filePath}: lines ${linePct.toFixed(2)}% < ${threshold.lines}%`);
  }

  if (branchPct < threshold.branches) {
    failures.push(`${filePath}: branches ${branchPct.toFixed(2)}% < ${threshold.branches}%`);
  }
});

if (failures.length > 0) {
  console.error('Mechanics coverage check failed.');
  failures.forEach((failure) => {
    console.error(`- ${failure}`);
  });
  process.exit(1);
}

console.log('Mechanics coverage check passed.');
