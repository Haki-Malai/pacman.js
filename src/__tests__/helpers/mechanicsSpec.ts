import fs from 'node:fs';
import path from 'node:path';
import {
  MechanicsDiagnosticsDocument,
  MechanicsRoadmapDocument,
  MechanicsScenario,
  MechanicsSpecDocument,
} from './mechanicsTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function toScenario(raw: unknown): MechanicsScenario | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = typeof raw.id === 'string' ? raw.id : null;
  const status = raw.status === 'implemented' || raw.status === 'roadmap' ? raw.status : null;
  const layer =
    raw.layer === 'domain' || raw.layer === 'systems' || raw.layer === 'runtime' || raw.layer === 'infrastructure'
      ? raw.layer
      : null;
  const mechanic = typeof raw.mechanic === 'string' ? raw.mechanic : null;
  const seed = typeof raw.seed === 'number' ? raw.seed : null;
  const ticks = typeof raw.ticks === 'number' ? raw.ticks : null;
  const fixture = typeof raw.fixture === 'string' ? raw.fixture : null;

  if (!id || !status || !layer || !mechanic || seed === null || ticks === null || !fixture) {
    return null;
  }

  const scenario: MechanicsScenario = {
    id,
    status,
    layer,
    mechanic,
    seed,
    ticks,
    fixture,
    actions: toStringArray(raw.actions),
    expectations: toStringArray(raw.expectations),
  };

  if (typeof raw.title === 'string') {
    scenario.title = raw.title;
  }

  return scenario;
}

function toInvariant(raw: unknown): MechanicsSpecDocument['invariants'][number] | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = typeof raw.id === 'string' ? raw.id : null;
  const description = typeof raw.description === 'string' ? raw.description : null;
  const check = typeof raw.check === 'string' ? raw.check : null;
  const appliesToRaw = Array.isArray(raw.appliesTo) ? raw.appliesTo : [];
  const appliesTo = appliesToRaw.filter(
    (entry): entry is 'domain' | 'systems' | 'runtime' | 'infrastructure' =>
      entry === 'domain' || entry === 'systems' || entry === 'runtime' || entry === 'infrastructure',
  );

  if (!id || !description || !check || appliesTo.length === 0) {
    return null;
  }

  return {
    id,
    description,
    appliesTo,
    check,
  };
}

function toDiagnostics(raw: unknown): MechanicsDiagnosticsDocument {
  if (!isRecord(raw)) {
    throw new Error('Invalid mechanics diagnostics document');
  }

  const schemaVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  const entriesRaw = Array.isArray(raw.entries) ? raw.entries : [];
  const entries = entriesRaw
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const id = typeof entry.id === 'string' ? entry.id : null;
      if (!id) {
        return null;
      }

      return {
        id,
        suspectModules: toStringArray(entry.suspectModules),
        fixPlan: toStringArray(entry.fixPlan),
      };
    })
    .filter((entry): entry is MechanicsDiagnosticsDocument['entries'][number] => entry !== null);

  return {
    schemaVersion,
    entries,
  };
}

function parseSpec(raw: unknown): MechanicsSpecDocument {
  if (!isRecord(raw)) {
    throw new Error('Invalid mechanics spec document');
  }

  const schemaVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  const scenarios = (Array.isArray(raw.scenarios) ? raw.scenarios : [])
    .map((entry) => toScenario(entry))
    .filter((entry): entry is MechanicsScenario => entry !== null);

  const invariants = (Array.isArray(raw.invariants) ? raw.invariants : [])
    .map((entry) => toInvariant(entry))
    .filter((entry): entry is MechanicsSpecDocument['invariants'][number] => entry !== null);

  return {
    schemaVersion,
    scenarios,
    invariants,
  };
}

function parseRoadmap(raw: unknown): MechanicsRoadmapDocument {
  if (!isRecord(raw)) {
    throw new Error('Invalid mechanics roadmap document');
  }

  const schemaVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  const scenarios = (Array.isArray(raw.scenarios) ? raw.scenarios : [])
    .map((entry) => toScenario(entry))
    .filter((entry): entry is MechanicsScenario => entry !== null);

  return {
    schemaVersion,
    scenarios,
  };
}

function repoPath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

export function readMechanicsSpec(): MechanicsSpecDocument {
  return parseSpec(readJson(repoPath('tests/specs/mechanics.spec.json')));
}

export function readMechanicsRoadmap(): MechanicsRoadmapDocument {
  return parseRoadmap(readJson(repoPath('tests/specs/mechanics.roadmap.json')));
}

export function readMechanicsDiagnostics(): MechanicsDiagnosticsDocument {
  return toDiagnostics(readJson(repoPath('tests/specs/mechanics.diagnostics.json')));
}

export function getScenarioOrThrow(id: string): MechanicsScenario {
  const spec = readMechanicsSpec();
  const scenario = spec.scenarios.find((entry) => entry.id === id);
  if (!scenario) {
    throw new Error(`Mechanics scenario not found: ${id}`);
  }
  return scenario;
}
