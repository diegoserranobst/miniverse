#!/usr/bin/env node
/**
 * Genera las imágenes de un mundo desde un plan.json existente.
 * Salta el paso de LLM — solo llama a fal.ai para texturas y props.
 *
 * Uso:
 *   node generate-world.mjs [world-id]
 *
 * Lee FAL_KEY desde .env.development automáticamente.
 * Costo estimado: ~$4-6 USD para un mundo completo.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { generateTexture, generateObject } from '@miniverse/generate';

// Cargar .env.development
if (!process.env.FAL_KEY && existsSync('.env.development')) {
  for (const line of readFileSync('.env.development', 'utf-8').split('\n')) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) process.env[match[1]] = match[2];
  }
}

const worldId = process.argv[2] || 'redcumbre-nexus';
const worldDir = path.join('public', 'worlds', worldId);
const planPath = path.join(worldDir, 'plan.json');

if (!existsSync(planPath)) {
  console.error(`No existe ${planPath}`);
  process.exit(1);
}

if (!process.env.FAL_KEY) {
  console.error('Falta FAL_KEY. Uso: FAL_KEY=tu-key node generate-world.mjs');
  process.exit(1);
}

const plan = JSON.parse(readFileSync(planPath, 'utf-8'));
const tilesDir = path.join(worldDir, 'world_assets', 'tiles');
const propsDir = path.join(worldDir, 'world_assets', 'props');
mkdirSync(tilesDir, { recursive: true });
mkdirSync(propsDir, { recursive: true });

console.log(`\n🌃 Generando mundo: ${plan.name || worldId}`);
console.log(`   ${plan.textures.length} texturas + ${plan.props.length} props`);
console.log(`   Costo estimado: ~$${(plan.textures.length * 0.15 + plan.props.length * 0.168).toFixed(2)} USD\n`);

// --- Generar texturas ---
console.log('=== Texturas ===');
for (let i = 0; i < plan.textures.length; i++) {
  const tex = plan.textures[i];
  const outPath = path.join(tilesDir, `${tex.id}.png`);
  if (existsSync(outPath)) {
    console.log(`  [${i}] ${tex.id} — ya existe, saltando`);
    continue;
  }
  console.log(`  [${i}] ${tex.id}...`);
  try {
    await generateTexture({ prompt: tex.prompt, output: outPath, size: 32 });
  } catch (err) {
    console.error(`  ERROR en ${tex.id}:`, err.message);
  }
}

// --- Generar props ---
console.log('\n=== Props ===');
for (let i = 0; i < plan.props.length; i++) {
  const prop = plan.props[i];
  const outPath = path.join(propsDir, `prop_${i}_${prop.id}.png`);
  if (existsSync(outPath)) {
    console.log(`  [${i}] ${prop.id} — ya existe, saltando`);
    continue;
  }
  console.log(`  [${i}] ${prop.id}...`);
  try {
    await generateObject({ prompt: prop.prompt, output: outPath });
  } catch (err) {
    console.error(`  ERROR en ${prop.id}:`, err.message);
  }
}

// --- Generar world.json ---
console.log('\n=== Ensamblando world.json ===');

// Convertir floor numérico a strings si es necesario
const textureIds = plan.textures.map(t => t.id);
const floor = plan.layout.floor.map(row =>
  row.map(cell => {
    if (typeof cell === 'string') return cell;
    return textureIds[cell] || '';
  })
);

const props = [];
let pieceIndex = 0;
for (const placement of plan.layout.placements) {
  const prop = plan.props[placement.propsIndex];
  if (!prop) continue;

  const piece = {
    id: prop.id,
    x: placement.x,
    y: placement.y,
    w: prop.w,
    h: prop.h,
    layer: prop.layer,
  };

  if (prop.anchorType) {
    const anchorName = `${prop.id}_${pieceIndex}_0`;
    piece.anchors = [{
      name: anchorName,
      ox: prop.anchorType === 'work' ? 1 : prop.w / 2,
      oy: prop.anchorType === 'work' ? 2 : prop.h,
      type: prop.anchorType,
    }];
  }

  props.push(piece);
  pieceIndex++;
}

const propImages = {};
for (let i = 0; i < plan.props.length; i++) {
  propImages[plan.props[i].id] = `world_assets/props/prop_${i}_${plan.props[i].id}.png`;
}

const tiles = {};
for (const tex of plan.textures) {
  tiles[tex.id] = `world_assets/tiles/${tex.id}.png`;
}

const worldJson = {
  gridCols: plan.gridCols,
  gridRows: plan.gridRows,
  floor,
  props,
  wanderPoints: plan.layout.wanderPoints,
  propImages,
  tiles,
};

writeFileSync(path.join(worldDir, 'world.json'), JSON.stringify(worldJson, null, 2) + '\n');
console.log(`\nworld.json generado en ${worldDir}/world.json`);
console.log(`\nPara activar: cambiar WORLD_ID = '${worldId}' en src/main.ts`);
console.log('Luego: systemctl --user restart miniverse');
