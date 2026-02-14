import fs from 'node:fs';
import path from 'node:path';

const logsDir = path.resolve(process.cwd(), 'logs/mechanics');
const diagnosticsPath = path.resolve(process.cwd(), 'tests/specs/mechanics.diagnostics.json');

function listBundles() {
  if (!fs.existsSync(logsDir)) {
    return [];
  }
  return fs
    .readdirSync(logsDir)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => ({
      name: entry,
      absolutePath: path.join(logsDir, entry),
      modifiedMs: fs.statSync(path.join(logsDir, entry)).mtimeMs,
    }))
    .sort((a, b) => b.modifiedMs - a.modifiedMs);
}

function resolveBundlePath(argumentPath) {
  if (argumentPath) {
    return path.resolve(process.cwd(), argumentPath);
  }

  const latest = listBundles()[0];
  if (!latest) {
    throw new Error('No mechanics repro bundles found. Provide a file path argument.');
  }

  return latest.absolutePath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [];
}

function loadDiagnostics() {
  if (!fs.existsSync(diagnosticsPath)) {
    return [];
  }

  const diagnostics = readJson(diagnosticsPath);
  const entries = Array.isArray(diagnostics.entries) ? diagnostics.entries : [];

  return entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
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
    .filter((entry) => entry !== null);
}

try {
  const bundlePath = resolveBundlePath(process.argv[2]);
  const bundle = readJson(bundlePath);
  const diagnostics = loadDiagnostics();
  const diagEntry = diagnostics.find((entry) => entry.id === bundle.scenarioId);

  const suspectModules = diagEntry?.suspectModules?.length ? diagEntry.suspectModules : toStringArray(bundle.suspectModules);
  const fixPlan = diagEntry?.fixPlan ?? [];

  const report = {
    bundlePath,
    scenarioId: bundle.scenarioId,
    seed: bundle.seed,
    tick: bundle.tick,
    assertion: bundle.assertion,
    replayCommand: bundle.replayCommand,
    suspectModules,
    fixPlan,
    sampleTrace: toStringArray(bundle.inputTrace).slice(0, 12),
  };

  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown triage error';
  console.error(`mechanics triage failed: ${message}`);
  process.exit(1);
}
