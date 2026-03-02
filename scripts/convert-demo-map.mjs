import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TMX_MAP_PATH = path.resolve(ROOT, 'public/assets/mazes/default/demo.tmx');
const TSX_TILESET_PATH = path.resolve(ROOT, 'public/assets/mazes/tileset.tsx');
const OUTPUT_MAP_PATH = path.resolve(ROOT, 'public/assets/mazes/default/demo.json');

const GID_MASK = ~(0x80000000 | 0x40000000 | 0x20000000);
const REQUIRED_COLLISION_PROPERTIES = ['collides', 'up', 'down', 'left', 'right', 'penGate', 'portal'];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
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

function parseBooleanLiteral(value, context) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  throw new Error(`${context} must be a boolean literal, received "${value}"`);
}

function parseTsxTiles(source) {
  const tiles = new Map();
  const tileRegex = /<tile\b([^>]*)>([\s\S]*?)<\/tile>/g;
  let tileMatch = tileRegex.exec(source);
  while (tileMatch) {
    const tileAttrs = parseAttributes(tileMatch[1]);
    const id = Number.parseInt(tileAttrs.get('id') ?? '', 10);
    if (!Number.isFinite(id) || id < 0) {
      throw new Error('TSX tile is missing a valid non-negative id');
    }
    if (tiles.has(id)) {
      throw new Error(`Duplicate TSX tile id ${id}`);
    }

    const tileBody = tileMatch[2];
    const imageMatch = tileBody.match(/<image\b([^>]*)\/?>/);
    if (!imageMatch) {
      throw new Error(`TSX tile ${id} is missing an <image> entry`);
    }
    const imageAttrs = parseAttributes(imageMatch[1]);
    const image = imageAttrs.get('source');
    if (!image || image.trim().length === 0) {
      throw new Error(`TSX tile ${id} is missing image source`);
    }

    const properties = new Map();
    const propertiesMatch = tileBody.match(/<properties>([\s\S]*?)<\/properties>/);
    if (propertiesMatch) {
      const propertyRegex = /<property\b([^>]*)\/?>/g;
      let propertyMatch = propertyRegex.exec(propertiesMatch[1]);
      while (propertyMatch) {
        const propertyAttrs = parseAttributes(propertyMatch[1]);
        const name = propertyAttrs.get('name');
        if (name) {
          const type = (propertyAttrs.get('type') ?? '').trim();
          const valueRaw = propertyAttrs.has('value') ? propertyAttrs.get('value') : '';
          const value =
            type === 'bool' ? parseBooleanLiteral(valueRaw, `TSX tile ${id} property "${name}"`) : valueRaw;
          properties.set(name, value);
        }
        propertyMatch = propertyRegex.exec(propertiesMatch[1]);
      }
    }

    tiles.set(id, {
      id,
      image,
      properties,
    });
    tileMatch = tileRegex.exec(source);
  }

  if (tiles.size === 0) {
    throw new Error('No TSX tile definitions found');
  }

  return tiles;
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

function toCollisionProperties(signature) {
  return [
    { name: 'collides', type: 'bool', value: signature.collides },
    { name: 'up', type: 'bool', value: signature.up },
    { name: 'down', type: 'bool', value: signature.down },
    { name: 'left', type: 'bool', value: signature.left },
    { name: 'right', type: 'bool', value: signature.right },
    { name: 'penGate', type: 'bool', value: signature.penGate },
    { name: 'portal', type: 'bool', value: signature.portal },
  ];
}

function normalizeTsxImagePathForOutput(imageSource) {
  const normalized = imageSource.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const withoutParents = normalized.replace(/^(\.\.\/)+/, '');
  if (withoutParents.startsWith('default/')) {
    return withoutParents.slice('default/'.length);
  }

  const sourceTilesIndex = withoutParents.indexOf('source/tiles/');
  if (sourceTilesIndex >= 0) {
    return withoutParents.slice(sourceTilesIndex);
  }

  return withoutParents;
}

function validateTileMetadata(localId, tileMeta) {
  const missing = [];
  const invalid = [];
  REQUIRED_COLLISION_PROPERTIES.forEach((name) => {
    if (!tileMeta.properties.has(name)) {
      missing.push(name);
      return;
    }

    const value = tileMeta.properties.get(name);
    if (typeof value !== 'boolean') {
      invalid.push(name);
    }
  });

  return { localId, missing, invalid };
}

function convert() {
  const tmxText = readText(TMX_MAP_PATH);
  const tsxText = readText(TSX_TILESET_PATH);

  const parsedTmx = parseTmxMap(tmxText);
  const tsxTiles = parseTsxTiles(tsxText);
  const trim = trimBounds(parsedTmx.layers);

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

  const sortedUsedLocalIds = [...usedLocalIds].sort((a, b) => a - b);
  const missingTileIds = sortedUsedLocalIds.filter((localId) => !tsxTiles.has(localId));
  if (missingTileIds.length > 0) {
    throw new Error(`TSX is missing tile definitions for used local IDs: ${missingTileIds.join(', ')}`);
  }

  const metadataIssues = sortedUsedLocalIds
    .map((localId) => validateTileMetadata(localId, tsxTiles.get(localId)))
    .filter(({ missing, invalid }) => missing.length > 0 || invalid.length > 0);
  if (metadataIssues.length > 0) {
    const details = metadataIssues.map(({ localId, missing, invalid }) => {
      const parts = [];
      if (missing.length > 0) {
        parts.push(`missing [${missing.join(', ')}]`);
      }
      if (invalid.length > 0) {
        parts.push(`non-boolean [${invalid.join(', ')}]`);
      }
      return `${localId}: ${parts.join('; ')}`;
    });
    throw new Error(`TSX collision metadata is incomplete for used tile IDs -> ${details.join(' | ')}`);
  }

  const convertedTiles = sortedUsedLocalIds.map((localId) => {
    const tileMeta = tsxTiles.get(localId);
    const imagePath = normalizeTsxImagePathForOutput(tileMeta.image);
    if (!imagePath || imagePath.trim().length === 0) {
      throw new Error(`TSX tile ${localId} resolved to an empty image path`);
    }

    const signature = {
      collides: tileMeta.properties.get('collides'),
      up: tileMeta.properties.get('up'),
      down: tileMeta.properties.get('down'),
      left: tileMeta.properties.get('left'),
      right: tileMeta.properties.get('right'),
      penGate: tileMeta.properties.get('penGate'),
      portal: tileMeta.properties.get('portal'),
    };

    return {
      id: localId,
      image: imagePath,
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
  console.log(`tiles converted: ${convertedTiles.length}`);
}

convert();
