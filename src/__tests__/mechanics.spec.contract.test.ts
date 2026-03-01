import { describe, expect, it } from 'vitest';
import { readMechanicsDiagnostics, readMechanicsRoadmap, readMechanicsSpec } from './helpers/mechanicsSpec';

const EXPECTED_IMPLEMENTED_IDS = [
  'MEC-PAC-001',
  'MEC-PAC-002',
  'MEC-PAC-003',
  'MEC-GHO-001',
  'MEC-GHO-002',
  'MEC-GHO-003',
  'MEC-JAIL-001',
  'MEC-JAIL-002',
  'MEC-PORT-001',
  'MEC-PORT-002',
  'MEC-PORT-003',
  'MEC-TIME-001',
  'MEC-TIME-002',
  'MEC-ANI-001',
  'MEC-ANI-002',
  'MEC-PAUSE-003',
  'MEC-POINT-001',
  'MEC-POINT-002',
  'MEC-POINT-003',
  'MEC-LIFE-001',
  'MEC-RUN-001',
];

const EXPECTED_ROADMAP_IDS = ['RD-GHOST-001', 'RD-SCORE-001', 'RD-LEVEL-001', 'RD-MAP-001'];

describe('mechanics specs contract', () => {
  it('contains a valid implemented mechanics scenario catalog with unique ids', () => {
    const spec = readMechanicsSpec();

    expect(spec.schemaVersion).toBe(1);
    expect(spec.scenarios.length).toBeGreaterThan(0);

    const ids = spec.scenarios.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);

    const implemented = spec.scenarios.filter((scenario) => scenario.status === 'implemented').map((scenario) => scenario.id);
    expect(implemented.sort()).toEqual([...EXPECTED_IMPLEMENTED_IDS].sort());

    spec.scenarios.forEach((scenario) => {
      expect(scenario.seed).toBeGreaterThanOrEqual(0);
      expect(scenario.ticks).toBeGreaterThan(0);
      expect(scenario.actions.length).toBeGreaterThan(0);
      expect(scenario.expectations.length).toBeGreaterThan(0);
    });
  });

  it('contains valid invariants with unique ids and check keys', () => {
    const spec = readMechanicsSpec();

    const invariantIds = spec.invariants.map((invariant) => invariant.id);
    expect(new Set(invariantIds).size).toBe(invariantIds.length);

    spec.invariants.forEach((invariant) => {
      expect(invariant.description.length).toBeGreaterThan(0);
      expect(invariant.check.length).toBeGreaterThan(0);
      expect(invariant.appliesTo.length).toBeGreaterThan(0);
    });
  });

  it('contains roadmap ids without overlap and all entries are roadmap status', () => {
    const spec = readMechanicsSpec();
    const roadmap = readMechanicsRoadmap();

    const roadmapIds = roadmap.scenarios.map((scenario) => scenario.id);
    expect(roadmapIds.sort()).toEqual([...EXPECTED_ROADMAP_IDS].sort());

    const implementedIds = new Set(spec.scenarios.map((scenario) => scenario.id));
    roadmap.scenarios.forEach((scenario) => {
      expect(scenario.status).toBe('roadmap');
      expect(implementedIds.has(scenario.id)).toBe(false);
    });
  });

  it('contains diagnostics entries that map only to known ids', () => {
    const spec = readMechanicsSpec();
    const roadmap = readMechanicsRoadmap();
    const diagnostics = readMechanicsDiagnostics();

    const knownIds = new Set([
      ...spec.scenarios.map((scenario) => scenario.id),
      ...spec.invariants.map((invariant) => invariant.id),
      ...roadmap.scenarios.map((scenario) => scenario.id),
    ]);

    diagnostics.entries.forEach((entry) => {
      expect(knownIds.has(entry.id)).toBe(true);
      expect(entry.suspectModules.length).toBeGreaterThan(0);
      expect(entry.fixPlan.length).toBeGreaterThan(0);
    });
  });
});
