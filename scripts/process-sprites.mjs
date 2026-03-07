#!/usr/bin/env node
/**
 * Process raw AI-generated sprite sheets into clean, grid-aligned assets.
 *
 * Strategy:
 * 1. Convert white/near-white background to transparent
 * 2. Trim the entire image to its content bounds
 * 3. Divide trimmed image into a 4x4 grid
 * 4. Extract each cell, trim individually, scale to fill 64x64
 * 5. Assemble into clean 256x256 sprite sheet
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, '..', 'assets', 'raw');
const OUT = path.join(__dirname, '..', 'assets', 'processed');

const FRAME_SIZE = 64;
const COLS = 4;
const ROWS = 4;

async function processWalkSheet(inputFile, outputFile) {
  const inputPath = path.join(RAW, inputFile);
  const meta = await sharp(inputPath).metadata();
  console.log(`Input: ${inputFile} — ${meta.width}x${meta.height}`);

  // Step 1: Convert white/near-white to transparent
  // Read raw pixel data
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const threshold = 240; // pixels with R,G,B all above this become transparent

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (r > threshold && g > threshold && b > threshold) {
      pixels[i + 3] = 0; // set alpha to 0
    }
  }

  const cleanImage = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();

  // Step 2: Trim the whole image to content bounds
  const trimmed = await sharp(cleanImage).trim().toBuffer();
  const trimMeta = await sharp(trimmed).metadata();
  console.log(`After trim: ${trimMeta.width}x${trimMeta.height}`);

  // Step 3: Divide into 4x4 grid
  const cellW = Math.floor(trimMeta.width / COLS);
  const cellH = Math.floor(trimMeta.height / ROWS);
  console.log(`Cell size: ${cellW}x${cellH}`);

  const frames = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const left = col * cellW;
      const top = row * cellH;
      const extractW = Math.min(cellW, trimMeta.width - left);
      const extractH = Math.min(cellH, trimMeta.height - top);

      // Extract cell
      let cell = await sharp(trimmed)
        .extract({ left, top, width: extractW, height: extractH })
        .png()
        .toBuffer();

      // Trim individual cell to character bounds
      try {
        cell = await sharp(cell).trim().png().toBuffer();
      } catch (e) {
        // empty cell, skip trim
      }

      const cellMeta = await sharp(cell).metadata();

      // Scale to fill FRAME_SIZE height, then center-crop width if needed
      const scale = FRAME_SIZE / cellMeta.height;
      const scaledW = Math.round(cellMeta.width * scale);
      const scaledH = FRAME_SIZE;

      let resized = await sharp(cell)
        .resize(scaledW, scaledH, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();

      let offsetX = 0;
      let finalW = scaledW;
      if (scaledW > FRAME_SIZE) {
        const cropLeft = Math.floor((scaledW - FRAME_SIZE) / 2);
        resized = await sharp(resized)
          .extract({ left: cropLeft, top: 0, width: FRAME_SIZE, height: FRAME_SIZE })
          .png()
          .toBuffer();
        finalW = FRAME_SIZE;
      } else {
        offsetX = Math.floor((FRAME_SIZE - scaledW) / 2);
      }

      frames.push({ buffer: resized, col, row, offsetX, offsetY: 0 });
      console.log(`  [${row},${col}] trimmed=${cellMeta.width}x${cellMeta.height} -> scaled=${finalW}x${scaledH}`);
    }
  }

  // Step 5: Composite onto clean sheet
  const composites = frames.map(f => ({
    input: f.buffer,
    left: f.col * FRAME_SIZE + f.offsetX,
    top: f.row * FRAME_SIZE + f.offsetY,
  }));

  await sharp({
    create: {
      width: COLS * FRAME_SIZE,
      height: ROWS * FRAME_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(OUT, outputFile));

  console.log(`Output: ${outputFile} — ${COLS * FRAME_SIZE}x${ROWS * FRAME_SIZE}`);
}

const walkSheets = [
  ['morty-walk.png', 'morty_walk.png'],
];

for (const [input, output] of walkSheets) {
  try {
    await processWalkSheet(input, output);
  } catch (err) {
    console.error(`Failed to process ${input}:`, err.message);
  }
}

console.log('\nDone!');
