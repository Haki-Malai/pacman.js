import type { Direction } from '../../game/domain/valueObjects/Direction';

export type MechanicsLayer = 'domain' | 'systems' | 'runtime' | 'infrastructure';

export type MechanicsScenarioStatus = 'implemented' | 'roadmap';

export interface MechanicsScenario {
  id: string;
  status: MechanicsScenarioStatus;
  layer: MechanicsLayer;
  mechanic: string;
  seed: number;
  ticks: number;
  fixture: string;
  actions: string[];
  expectations: string[];
  title?: string;
}

export interface MechanicsInvariant {
  id: string;
  description: string;
  appliesTo: MechanicsLayer[];
  check: string;
}

export interface MechanicsEntitySnapshot {
  tile: { x: number; y: number };
  moved: { x: number; y: number };
  world: { x: number; y: number };
  direction?: Direction;
  speed?: number;
  free?: boolean;
}

export interface MechanicsSnapshot {
  tick: number;
  pacman: MechanicsEntitySnapshot;
  ghosts: MechanicsEntitySnapshot[];
  worldFlags: {
    isMoving: boolean;
    collisionDebugEnabled: boolean;
    ghostsExitingJail: number;
  };
  schedulerState: {
    paused: boolean;
  };
}

export interface ReproBundle {
  schemaVersion: 1;
  scenarioId: string;
  seed: number;
  tick: number;
  inputTrace: string[];
  snapshotWindow: MechanicsSnapshot[];
  assertion: string;
  suspectModules: string[];
  replayCommand: string;
}

export interface MechanicsSpecDocument {
  schemaVersion: number;
  scenarios: MechanicsScenario[];
  invariants: MechanicsInvariant[];
}

export interface MechanicsRoadmapDocument {
  schemaVersion: number;
  scenarios: MechanicsScenario[];
}

export interface MechanicsDiagnosticEntry {
  id: string;
  suspectModules: string[];
  fixPlan: string[];
}

export interface MechanicsDiagnosticsDocument {
  schemaVersion: number;
  entries: MechanicsDiagnosticEntry[];
}
