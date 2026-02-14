import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

function isTestFile(filePath) {
  return (
    filePath.includes(`${path.sep}__tests__${path.sep}`) ||
    filePath.endsWith('.test.ts') ||
    filePath.endsWith('.spec.ts')
  );
}

function walkTsFiles(dir, result = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(absolutePath, result);
      return;
    }

    if (!entry.name.endsWith('.ts')) {
      return;
    }

    if (isTestFile(absolutePath)) {
      return;
    }

    result.push(absolutePath);
  });
  return result;
}

function toPosixRelative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function parseImports(code) {
  const imports = [];
  const importRegex = /^\s*import\s+(?:type\s+)?[^'"\n]*from\s+['"]([^'"]+)['"]/gm;
  const exportRegex = /^\s*export\s+[^'"\n]*from\s+['"]([^'"]+)['"]/gm;

  let match = importRegex.exec(code);
  while (match) {
    imports.push(match[1]);
    match = importRegex.exec(code);
  }

  match = exportRegex.exec(code);
  while (match) {
    imports.push(match[1]);
    match = exportRegex.exec(code);
  }

  return imports;
}

function resolveLocalImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const fromDir = path.dirname(fromFile);
  const base = path.resolve(fromDir, specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    if (!candidate.startsWith(srcDir)) {
      return null;
    }

    return toPosixRelative(candidate);
  }

  return null;
}

function buildGraph(files) {
  const graph = new Map();
  files.forEach((filePath) => {
    const relative = toPosixRelative(filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const dependencies = parseImports(source)
      .map((specifier) => resolveLocalImport(filePath, specifier))
      .filter((value) => value !== null);
    graph.set(relative, dependencies);
  });
  return graph;
}

function findCycles(graph) {
  const color = new Map();
  const stack = [];
  const cycles = [];

  function dfs(node) {
    color.set(node, 'gray');
    stack.push(node);

    const deps = graph.get(node) ?? [];
    deps.forEach((dep) => {
      const depColor = color.get(dep) ?? 'white';
      if (depColor === 'white') {
        dfs(dep);
        return;
      }

      if (depColor === 'gray') {
        const startIndex = stack.indexOf(dep);
        const cycle = [...stack.slice(startIndex), dep];
        const key = cycle.join(' -> ');
        if (!cycles.some((existing) => existing.join(' -> ') === key)) {
          cycles.push(cycle);
        }
      }
    });

    stack.pop();
    color.set(node, 'black');
  }

  graph.forEach((_deps, node) => {
    if ((color.get(node) ?? 'white') === 'white') {
      dfs(node);
    }
  });

  return cycles;
}

function getLayer(filePath) {
  if (!filePath.startsWith('src/game/')) {
    return null;
  }

  const parts = filePath.split('/');
  return parts[2] ?? null;
}

function validateLayerDependencies(graph) {
  const allowedByLayer = {
    app: new Set(['app', 'systems', 'domain', 'infrastructure', 'shared']),
    systems: new Set(['systems', 'domain', 'infrastructure', 'shared']),
    domain: new Set(['domain', 'shared']),
    infrastructure: new Set(['infrastructure', 'domain', 'shared']),
    shared: new Set(['shared']),
  };

  const violations = [];

  graph.forEach((deps, fromFile) => {
    const fromLayer = getLayer(fromFile);
    if (!fromLayer || !(fromLayer in allowedByLayer)) {
      return;
    }

    deps.forEach((toFile) => {
      const toLayer = getLayer(toFile);
      if (!toLayer) {
        return;
      }

      if (!allowedByLayer[fromLayer].has(toLayer)) {
        violations.push(`${fromFile} -> ${toFile} (disallowed layer: ${fromLayer} -> ${toLayer})`);
        return;
      }

      if (fromLayer === 'systems' && toLayer === 'infrastructure') {
        const allowedInfraPrefixes = [
          'src/game/infrastructure/adapters/',
          'src/game/infrastructure/assets/',
        ];

        const isAllowedInfraImport = allowedInfraPrefixes.some((prefix) => toFile.startsWith(prefix));
        if (!isAllowedInfraImport) {
          violations.push(`${fromFile} -> ${toFile} (systems may only import infrastructure adapters/assets)`);
        }
      }
    });
  });

  return violations;
}

const files = walkTsFiles(srcDir);
const graph = buildGraph(files);

const cycleViolations = findCycles(graph);
const layerViolations = validateLayerDependencies(graph);

if (cycleViolations.length > 0 || layerViolations.length > 0) {
  console.error('Architecture check failed.');

  if (cycleViolations.length > 0) {
    console.error('\nCircular dependencies:');
    cycleViolations.forEach((cycle) => {
      console.error(`- ${cycle.join(' -> ')}`);
    });
  }

  if (layerViolations.length > 0) {
    console.error('\nLayer violations:');
    layerViolations.forEach((violation) => {
      console.error(`- ${violation}`);
    });
  }

  process.exit(1);
}

console.log('Architecture check passed.');
