import fs from 'node:fs';
import path from 'node:path';
import { MechanicsDiagnosticsDocument, MechanicsSnapshot, ReproBundle } from './mechanicsTypes';

export interface ReproInput {
  scenarioId: string;
  seed: number;
  tick: number;
  inputTrace: string[];
  snapshotWindow: MechanicsSnapshot[];
  assertion: string;
  diagnostics?: MechanicsDiagnosticsDocument;
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function pickSuspectModules(id: string, diagnostics?: MechanicsDiagnosticsDocument): string[] {
  if (!diagnostics) {
    return [];
  }
  return diagnostics.entries.find((entry) => entry.id === id)?.suspectModules ?? [];
}

function buildReplayCommand(bundle: ReproBundle): string {
  const fuzzSuite = bundle.scenarioId.startsWith('INV-')
    ? 'src/__tests__/mechanics/fuzzInvariants*.mechanics.test.ts'
    : 'src/__tests__/mechanics';

  return `MECHANICS_SCENARIO_ID=${bundle.scenarioId} MECHANICS_SEED=${bundle.seed} pnpm vitest run ${fuzzSuite}`;
}

function nowStamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

export function createReproBundle(input: ReproInput): ReproBundle {
  const bundle: ReproBundle = {
    schemaVersion: 1,
    scenarioId: input.scenarioId,
    seed: input.seed,
    tick: input.tick,
    inputTrace: [...input.inputTrace],
    snapshotWindow: [...input.snapshotWindow],
    assertion: input.assertion,
    suspectModules: pickSuspectModules(input.scenarioId, input.diagnostics),
    replayCommand: '',
  };

  bundle.replayCommand = buildReplayCommand(bundle);
  return bundle;
}

export function writeReproBundle(bundle: ReproBundle): string {
  const outputDir = path.resolve(process.cwd(), 'logs/mechanics');
  fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, `${nowStamp(new Date())}-${sanitizeId(bundle.scenarioId)}.json`);
  fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2));
  return filePath;
}

export function withReproBundle<T>(input: ReproInput, run: () => T): T {
  try {
    return run();
  } catch (error) {
    const bundle = createReproBundle(input);
    const bundlePath = writeReproBundle(bundle);
    if (error instanceof Error) {
      error.message = `${error.message}\nrepro bundle: ${bundlePath}`;
      throw error;
    }
    throw new Error(`mechanics assertion failed\nrepro bundle: ${bundlePath}`);
  }
}
