import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TMX_MAP_PATH = path.resolve(ROOT, 'public/assets/mazes/default/demo.tmx');
const TSX_TILESET_PATH = path.resolve(ROOT, 'public/assets/mazes/tileset.tsx');
const PACMAN_MAP_PATH = path.resolve(ROOT, 'public/assets/mazes/default/pacman.json');
const PRODUCTION_MAP_PATH = path.resolve(ROOT, 'public/assets/mazes/default/maze.json');
const OUTPUT_MAP_PATH = path.resolve(ROOT, 'public/assets/mazes/default/demo.json');

const GID_MASK = ~(0x80000000 | 0x40000000 | 0x20000000);

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseAttributes(raw) {
  const attrs = new Map();
  const regex = /([A-Za-z_][A-Za-z0-9_.:-]*)="([^"]*)"/g;
  let match = regex.exec(raw);
  while (match) {
    attrs.set(match[1], match[2]);
    match = regex.exec(raw);
  }
  return attrs;
}

function parseCsvNumbers(raw) {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid CSV tile gid value: ${value}`);
      }
      return parsed;
    });
}

function parseTmxMap(source) {
  const mapMatch = source.match(/<map\b([^>]*)>/);
  if (!mapMatch) {
    throw new Error('TMX map tag not found');
  }

  const mapAttrs = parseAttributes(mapMatch[1]);
  const tileWidth = Number.parseInt(mapAttrs.get('tilewidth') ?? '', 10);
  const tileHeight = Number.parseInt(mapAttrs.get('tileheight') ?? '', 10);
  const finiteWidth = Number.parseInt(mapAttrs.get('width') ?? '', 10);
  const finiteHeight = Number.parseInt(mapAttrs.get('height') ?? '', 10);
  if (!Number.isFinite(tileWidth) || !Number.isFinite(tileHeight) || tileWidth <= 0 || tileHeight <= 0) {
    throw new Error('TMX map tilewidth/tileheight must be positive numbers');
  }

  const tilesetMatch = source.match(/<tileset\b([^>]*)\/?>/);
  if (!tilesetMatch) {
    throw new Error('TMX tileset reference not found');
  }
  const tilesetAttrs = parseAttributes(tilesetMatch[1]);
  const firstgid = Number.parseInt(tilesetAttrs.get('firstgid') ?? '', 10);
  if (!Number.isFinite(firstgid) || firstgid <= 0) {
    throw new Error('TMX tileset firstgid must be a positive number');
  }

  const layers = [];
  const layerRegex = /<layer\b([^>]*)>([\s\S]*?)<\/layer>/g;
  let layerMatch = layerRegex.exec(source);
  while (layerMatch) {
    const layerAttrs = parseAttributes(layerMatch[1]);
    const layerBody = layerMatch[2];
    const dataMatch = layerBody.match(/<data\b([^>]*)>([\s\S]*?)<\/data>/);
    if (!dataMatch) {
      throw new Error(`TMX layer "${layerAttrs.get('name') ?? '(unnamed)'}" is missing <data>`);
    }
    const dataAttrs = parseAttributes(dataMatch[1]);
    if ((dataAttrs.get('encoding') ?? '').toLowerCase() !== 'csv') {
      throw new Error('TMX layer data encoding must be csv');
    }

    const cells = new Map();
    const chunkRegex = /<chunk\b([^>]*)>([\s\S]*?)<\/chunk>/g;
    let chunkMatch = chunkRegex.exec(dataMatch[2]);
    let hasChunks = false;
    while (chunkMatch) {
      hasChunks = true;
      const chunkAttrs = parseAttributes(chunkMatch[1]);
      const chunkX = Number.parseInt(chunkAttrs.get('x') ?? '', 10);
      const chunkY = Number.parseInt(chunkAttrs.get('y') ?? '', 10);
      const chunkWidth = Number.parseInt(chunkAttrs.get('width') ?? '', 10);
      const chunkHeight = Number.parseInt(chunkAttrs.get('height') ?? '', 10);
      if (!Number.isFinite(chunkX) || !Number.isFinite(chunkY) || !Number.isFinite(chunkWidth) || !Number.isFinite(chunkHeight)) {
        throw new Error('TMX chunk is missing x/y/width/height');
      }

      const values = parseCsvNumbers(chunkMatch[2]);
      const expected = chunkWidth * chunkHeight;
      if (values.length !== expected) {
        throw new Error(`TMX chunk CSV count mismatch: expected ${expected}, got ${values.length}`);
      }

      for (let y = 0; y < chunkHeight; y += 1) {
        for (let x = 0; x < chunkWidth; x += 1) {
          const index = y * chunkWidth + x;
          const globalX = chunkX + x;
          const globalY = chunkY + y;
          cells.set(`${globalX},${globalY}`, values[index]);
        }
      }

      chunkMatch = chunkRegex.exec(dataMatch[2]);
    }

    if (!hasChunks) {
      const layerWidth = Number.parseInt(layerAttrs.get('width') ?? '', 10);
      const layerHeight = Number.parseInt(layerAttrs.get('height') ?? '', 10);
      const width = Number.isFinite(layerWidth) && layerWidth > 0 ? layerWidth : finiteWidth;
      const height = Number.isFinite(layerHeight) && layerHeight > 0 ? layerHeight : finiteHeight;
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw new Error(`TMX layer "${layerAttrs.get('name') ?? '(unnamed)'}" width/height are invalid`);
      }

      const values = parseCsvNumbers(dataMatch[2]);
      const expected = width * height;
      if (values.length !== expected) {
        throw new Error(`TMX layer CSV count mismatch: expected ${expected}, got ${values.length}`);
      }

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          cells.set(`${x},${y}`, values[index]);
        }
      }
    }

    layers.push({
      name: layerAttrs.get('name') ?? 'Layer',
      cells,
    });

    layerMatch = layerRegex.exec(source);
  }

  if (layers.length === 0) {
    throw new Error('TMX map must contain at least one tile layer');
  }

  return {
    tileWidth,
    tileHeight,
    firstgid,
    layers,
  };
}

function readCollisionSignature(properties) {
  const record = new Map();
  if (Array.isArray(properties)) {
    properties.forEach((property) => {
      if (property && typeof property.name === 'string') {
        record.set(property.name, property.value);
      }
    });
  }

  return {
    collides: Boolean(record.get('collides')),
    penGate: Boolean(record.get('penGate')),
    portal: Boolean(record.get('portal')),
    up: Boolean(record.get('up') ?? record.get('blocksUp')),
    down: Boolean(record.get('down') ?? record.get('blocksDown')),
    left: Boolean(record.get('left') ?? record.get('blocksLeft')),
    right: Boolean(record.get('right') ?? record.get('blocksRight')),
  };
}

function toCollisionProperties(signature) {
  const normalized = {
    ...signature,
    // Portal/pen-gate semantics are inferred dynamically at runtime.
    penGate: false,
    portal: false,
  };

  return [
    { name: 'collides', type: 'bool', value: normalized.collides },
    { name: 'up', type: 'bool', value: normalized.up },
    { name: 'down', type: 'bool', value: normalized.down },
    { name: 'left', type: 'bool', value: normalized.left },
    { name: 'right', type: 'bool', value: normalized.right },
    { name: 'penGate', type: 'bool', value: normalized.penGate },
    { name: 'portal', type: 'bool', value: normalized.portal },
  ];
}

function collisionDistance(a, b) {
  let score = 0;
  if (a.collides !== b.collides) score += 100;
  if (a.penGate !== b.penGate) score += 25;
  if (a.portal !== b.portal) score += 25;
  if (a.up !== b.up) score += 1;
  if (a.down !== b.down) score += 1;
  if (a.left !== b.left) score += 1;
  if (a.right !== b.right) score += 1;
  return score;
}

function padTileId(id) {
  return id.toString().padStart(2, '0');
}

function trimBounds(layers) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  layers.forEach((layer) => {
    layer.cells.forEach((rawGid, key) => {
      if (!rawGid) {
        return;
      }
      const [xText, yText] = key.split(',');
      const x = Number.parseInt(xText ?? '', 10);
      const y = Number.parseInt(yText ?? '', 10);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    throw new Error('TMX map has no non-empty tiles to trim');
  }

  return {
    minX,
    minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function parseTsxTileIds(source) {
  const ids = new Set();
  const tileRegex = /<tile\b([^>]*)>/g;
  let match = tileRegex.exec(source);
  while (match) {
    const attrs = parseAttributes(match[1]);
    const id = Number.parseInt(attrs.get('id') ?? '', 10);
    if (Number.isFinite(id) && id >= 0) {
      ids.add(id);
    }
    match = tileRegex.exec(source);
  }
  return ids;
}

function convert() {
  const tmxText = readText(TMX_MAP_PATH);
  const tsxText = readText(TSX_TILESET_PATH);
  const productionMap = readJson(PRODUCTION_MAP_PATH);
  const pacmanMap = readJson(PACMAN_MAP_PATH);

  const parsedTmx = parseTmxMap(tmxText);
  const tsxTileIds = parseTsxTileIds(tsxText);
  const trim = trimBounds(parsedTmx.layers);

  const productionTiles = productionMap.tilesets?.[0]?.tiles ?? [];
  const pacmanTiles = pacmanMap.tilesets?.[0]?.tiles ?? [];
  if (!Array.isArray(productionTiles) || productionTiles.length === 0) {
    throw new Error('Production map tile definitions are required for conversion');
  }

  const productionById = new Map();
  const productionCandidates = [];
  productionTiles.forEach((tile) => {
    if (typeof tile?.id !== 'number' || typeof tile?.image !== 'string') {
      return;
    }
    const signature = readCollisionSignature(tile.properties);
    const entry = {
      id: tile.id,
      image: tile.image,
      signature,
    };
    productionById.set(tile.id, entry);
    productionCandidates.push(entry);
  });
  productionCandidates.sort((a, b) => a.id - b.id);

  const pacmanCollisionById = new Map();
  pacmanTiles.forEach((tile) => {
    if (typeof tile?.id !== 'number') {
      return;
    }
    pacmanCollisionById.set(tile.id, readCollisionSignature(tile.properties));
  });

  const trimmedLayers = parsedTmx.layers.map((layer, index) => {
    const data = [];
    for (let y = 0; y < trim.height; y += 1) {
      for (let x = 0; x < trim.width; x += 1) {
        const rawGid = layer.cells.get(`${trim.minX + x},${trim.minY + y}`) ?? 0;
        data.push(rawGid);
      }
    }

    return {
      id: index + 1,
      name: index === 0 ? 'Maze' : layer.name,
      type: 'tilelayer',
      x: 0,
      y: 0,
      width: trim.width,
      height: trim.height,
      opacity: 1,
      visible: true,
      data,
    };
  });

  const usedLocalIds = new Set();
  trimmedLayers.forEach((layer) => {
    layer.data.forEach((rawGid) => {
      if (!rawGid) {
        return;
      }
      const gid = rawGid & GID_MASK;
      if (gid <= 0) {
        return;
      }
      usedLocalIds.add(gid - parsedTmx.firstgid);
    });
  });

  let exactImageMappings = 0;
  let fallbackImageMappings = 0;
  const convertedTiles = [...usedLocalIds]
    .sort((a, b) => a - b)
    .map((localId) => {
      const canonical = productionById.get(localId);
      const signature = pacmanCollisionById.get(localId) ?? canonical?.signature ?? readCollisionSignature([]);

      let imageSource = canonical;
      if (!tsxTileIds.has(localId) || !canonical) {
        imageSource = productionCandidates.reduce((best, candidate) => {
          if (!best) {
            return candidate;
          }
          const bestDistance = collisionDistance(signature, best.signature);
          const nextDistance = collisionDistance(signature, candidate.signature);
          if (nextDistance < bestDistance) {
            return candidate;
          }
          if (nextDistance === bestDistance && candidate.id < best.id) {
            return candidate;
          }
          return best;
        }, null);
      }

      if (!imageSource) {
        throw new Error(`Unable to map local tile id ${localId} to a production tile image`);
      }

      if (tsxTileIds.has(localId) && canonical) {
        exactImageMappings += 1;
      } else {
        fallbackImageMappings += 1;
      }

      return {
        id: localId,
        image: `source/tiles/tile-${padTileId(imageSource.id)}.png`,
        imagewidth: 16,
        imageheight: 16,
        properties: toCollisionProperties(signature),
      };
    });

  const convertedMap = {
    compressionlevel: -1,
    width: trim.width,
    height: trim.height,
    tilewidth: parsedTmx.tileWidth,
    tileheight: parsedTmx.tileHeight,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    layers: trimmedLayers,
    tilesets: [
      {
        firstgid: parsedTmx.firstgid,
        name: 'demo',
        tilewidth: parsedTmx.tileWidth,
        tileheight: parsedTmx.tileHeight,
        tiles: convertedTiles,
      },
    ],
  };

  writeJson(OUTPUT_MAP_PATH, convertedMap);

  console.log('demo map conversion complete');
  console.log(`input : ${path.relative(ROOT, TMX_MAP_PATH)}`);
  console.log(`tiles : ${path.relative(ROOT, TSX_TILESET_PATH)}`);
  console.log(`output: ${path.relative(ROOT, OUTPUT_MAP_PATH)}`);
  console.log(`trim  : x=${trim.minX} y=${trim.minY} w=${trim.width} h=${trim.height}`);
  console.log(`image mappings: exact=${exactImageMappings} fallback=${fallbackImageMappings}`);
}

convert();
