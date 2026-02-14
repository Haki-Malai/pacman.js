import { describe, expect, it } from 'vitest';
import { readMechanicsRoadmap } from '../helpers/mechanicsSpec';

describe('mechanics roadmap TODO coverage', () => {
  const roadmap = readMechanicsRoadmap();

  it('has the expected roadmap scenario ids', () => {
    const expected = ['RD-GHOST-001', 'RD-SCORE-001', 'RD-LIFE-001', 'RD-LEVEL-001', 'RD-MAP-001'];
    const ids = roadmap.scenarios.map((scenario) => scenario.id).sort();
    expect(ids).toEqual(expected.sort());
  });

  roadmap.scenarios.forEach((scenario) => {
    it.todo(`${scenario.id} ${scenario.title ?? scenario.mechanic}`);
  });
});
