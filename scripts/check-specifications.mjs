import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const specPath = path.resolve(rootDir, 'SPECIFICATIONS.md');
const mechanicsSpecPath = path.resolve(rootDir, 'tests/specs/mechanics.spec.json');
const mechanicsRoadmapPath = path.resolve(rootDir, 'tests/specs/mechanics.roadmap.json');

const REQUIRED_HEADINGS = [
  '# Specifications',
  '## Audience',
  '## Product Goal',
  '## Scope and Status',
  '## Current Experience (Implemented)',
  '## Player Controls',
  '## Character Behaviors',
  '## Session Flow and States',
  '## Presentation and UI',
  '## Level and Content Rules',
  '## Quality Guarantees',
  '## Implemented Mechanics Catalog',
  '## Invariants Catalog',
  '## Roadmap (Not Implemented)',
  '## Change Control',
  '## Verification Commands',
];

const ID_PATTERN = /\b(?:MEC|INV|RD)-[A-Z]+-\d{3}\b/g;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const filtered = values.filter((value) => typeof value === 'string');
  return [...new Set(filtered)];
}

function headingExists(specText, heading) {
  return specText
    .split(/\r?\n/)
    .some((line) => line.trim() === heading);
}

function collectIds(specText, prefix) {
  const ids = specText.match(ID_PATTERN) ?? [];
  return uniqueStrings(ids.filter((id) => id.startsWith(prefix)));
}

function compareSet(label, expected, actual, errors) {
  const expectedSet = new Set(uniqueStrings(expected));
  const actualSet = new Set(uniqueStrings(actual));

  const missing = [...expectedSet].filter((id) => !actualSet.has(id));
  const extra = [...actualSet].filter((id) => !expectedSet.has(id));

  if (missing.length > 0) {
    errors.push(`[id-mismatch:${label}] missing: ${missing.join(', ')}`);
  }

  if (extra.length > 0) {
    errors.push(`[id-mismatch:${label}] extra: ${extra.join(', ')}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateRoadmapStatusRows(specText, roadmapIds, errors) {
  roadmapIds.forEach((id) => {
    const pattern = new RegExp(`\\|\\s*${escapeRegExp(id)}\\s*\\|[^\\n]*\\|\\s*roadmap\\s*\\|`, 'i');
    if (!pattern.test(specText)) {
      errors.push(`[invalid-roadmap-status] ${id} must appear in a table row with status 'roadmap'`);
    }
  });
}

const errors = [];

if (!fs.existsSync(specPath)) {
  errors.push('[missing-file] SPECIFICATIONS.md not found');
} else {
  const specText = fs.readFileSync(specPath, 'utf8');

  const missingHeadings = REQUIRED_HEADINGS.filter((heading) => !headingExists(specText, heading));
  if (missingHeadings.length > 0) {
    errors.push(`[missing-headings] ${missingHeadings.join(' | ')}`);
  }

  if (!/not implemented/i.test(specText)) {
    errors.push("[missing-content] specification must explicitly state that roadmap behavior is 'not implemented'");
  }

  if (!/Proposed Behavior Delta/.test(specText)) {
    errors.push("[missing-content] specification must include 'Proposed Behavior Delta' in change-control guidance");
  }

  let mechanicsSpec;
  let mechanicsRoadmap;

  try {
    mechanicsSpec = readJson(mechanicsSpecPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown read error';
    errors.push(`[read-error] unable to read ${path.relative(rootDir, mechanicsSpecPath)} (${message})`);
  }

  try {
    mechanicsRoadmap = readJson(mechanicsRoadmapPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown read error';
    errors.push(`[read-error] unable to read ${path.relative(rootDir, mechanicsRoadmapPath)} (${message})`);
  }

  if (mechanicsSpec && mechanicsRoadmap) {
    const expectedMec = Array.isArray(mechanicsSpec.scenarios)
      ? mechanicsSpec.scenarios
          .filter((scenario) => scenario?.status === 'implemented' && typeof scenario?.id === 'string')
          .map((scenario) => scenario.id)
      : [];

    const expectedInv = Array.isArray(mechanicsSpec.invariants)
      ? mechanicsSpec.invariants.filter((invariant) => typeof invariant?.id === 'string').map((invariant) => invariant.id)
      : [];

    const expectedRd = Array.isArray(mechanicsRoadmap.scenarios)
      ? mechanicsRoadmap.scenarios.filter((scenario) => typeof scenario?.id === 'string').map((scenario) => scenario.id)
      : [];

    compareSet('implemented', expectedMec, collectIds(specText, 'MEC-'), errors);
    compareSet('invariants', expectedInv, collectIds(specText, 'INV-'), errors);
    compareSet('roadmap', expectedRd, collectIds(specText, 'RD-'), errors);
    validateRoadmapStatusRows(specText, expectedRd, errors);
  }
}

if (errors.length > 0) {
  console.error('SPECIFICATIONS check failed.');
  errors.forEach((error) => {
    console.error(`- ${error}`);
  });
  process.exit(1);
}

console.log('SPECIFICATIONS check passed.');
