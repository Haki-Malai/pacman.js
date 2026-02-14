import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

const defaultLimit = 350;
const overrides = new Map([
  ['src/game/infrastructure/map/TiledParser.ts', 450],
]);

function walkTsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(absolutePath, files);
      return;
    }

    if (!entry.name.endsWith('.ts')) {
      return;
    }

    files.push(absolutePath);
  });

  return files;
}

function toPosixRelative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

const files = walkTsFiles(srcDir);
const violations = [];

files.forEach((absolutePath) => {
  const relativePath = toPosixRelative(absolutePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const lines = source.split(/\r?\n/).length;
  const limit = overrides.get(relativePath) ?? defaultLimit;

  if (lines > limit) {
    violations.push(`${relativePath}: ${lines} lines (limit ${limit})`);
  }
});

if (violations.length > 0) {
  console.error('Size check failed.');
  violations.forEach((violation) => {
    console.error(`- ${violation}`);
  });
  process.exit(1);
}

console.log('Size check passed.');
