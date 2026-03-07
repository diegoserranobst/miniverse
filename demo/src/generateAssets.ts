/**
 * Procedurally generates placeholder pixel art assets so the demo
 * runs without any external image files.
 *
 * Tiles: 32x32, Characters: 64x64
 */

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(URL.createObjectURL(blob!));
    });
  });
}

/**
 * Generate a 32x32 tileset with at least 2 tiles:
 * tile 0 = floor, tile 1 = wall
 */
export async function generateTileset(): Promise<string> {
  const tileSize = 32;
  const cols = 16;
  const rows = 4;
  const [canvas, ctx] = createCanvas(cols * tileSize, rows * tileSize);

  // Tile 0: Floor - warm wood
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const noise = Math.random() * 15;
      const r = 180 + noise;
      const g = 140 + noise;
      const b = 100 + noise * 0.5;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Plank lines
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, 10, tileSize, 1);
  ctx.fillRect(0, 21, tileSize, 1);
  ctx.fillRect(0, 31, tileSize, 1);
  // Subtle highlight on top edge of planks
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 0, tileSize, 1);
  ctx.fillRect(0, 11, tileSize, 1);
  ctx.fillRect(0, 22, tileSize, 1);

  // Tile 1: Wall - dark blue-gray
  const wallX = tileSize;
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const noise = Math.random() * 8;
      ctx.fillStyle = `rgb(${50 + noise},${55 + noise},${70 + noise})`;
      ctx.fillRect(wallX + x, y, 1, 1);
    }
  }
  // Brick pattern
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(wallX, 7, tileSize, 1);
  ctx.fillRect(wallX, 15, tileSize, 1);
  ctx.fillRect(wallX, 23, tileSize, 1);
  ctx.fillRect(wallX, 31, tileSize, 1);
  ctx.fillRect(wallX + 8, 0, 1, 7);
  ctx.fillRect(wallX + 24, 7, 1, 8);
  ctx.fillRect(wallX + 16, 15, 1, 8);
  ctx.fillRect(wallX + 8, 23, 1, 8);

  return canvasToBlob(canvas);
}

/**
 * Generate a character sprite sheet.
 * 4 rows x 4 frames = 16 frames
 * Row 0: facing down, Row 1: facing up
 * Row 2: facing left, Row 3: facing right
 * Frame size: 64x64
 */
export async function generateCharacterSprite(
  bodyColor: string,
  hairColor: string,
  shirtColor: string,
): Promise<string> {
  const fw = 64;
  const fh = 64;
  const frames = 4;
  const rows = 4;
  const [canvas, ctx] = createCanvas(fw * frames, fh * rows);

  const directions: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];

  for (let row = 0; row < rows; row++) {
    const dir = directions[row];
    for (let frame = 0; frame < frames; frame++) {
      const ox = frame * fw;
      const oy = row * fh;
      const bobY = frame % 2 === 0 ? 0 : -2;

      drawCharacter(ctx, ox, oy + bobY, dir, bodyColor, hairColor, shirtColor, frame);
    }
  }

  return canvasToBlob(canvas);
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  dir: 'down' | 'up' | 'left' | 'right',
  bodyColor: string,
  hairColor: string,
  shirtColor: string,
  frame: number,
) {
  // All coordinates are ~4x the old 16x24 layout, centered in 64x64
  const cx = ox + 16; // character offset within frame

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(cx + 6, oy + 56, 20, 6);

  // Legs
  ctx.fillStyle = '#3b3b5c';
  const legOffset = frame % 2 === 0 ? 0 : 2;
  ctx.fillRect(cx + 8, oy + 42, 6, 12 + legOffset);
  ctx.fillRect(cx + 18, oy + 42, 6, 12 - legOffset + 2);

  // Shoes
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(cx + 6, oy + 53 + legOffset, 9, 4);
  ctx.fillRect(cx + 17, oy + 55 - legOffset, 9, 4);

  // Body / shirt
  ctx.fillStyle = shirtColor;
  ctx.fillRect(cx + 5, oy + 26, 22, 18);
  // Shirt shading
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(cx + 5, oy + 38, 22, 6);

  // Arms
  const armBob = frame % 2 === 0 ? 0 : 2;
  ctx.fillStyle = bodyColor;
  if (dir === 'left') {
    ctx.fillRect(cx + 2, oy + 28, 5, 14 + armBob);
  } else if (dir === 'right') {
    ctx.fillRect(cx + 25, oy + 28, 5, 14 + armBob);
  } else {
    ctx.fillRect(cx + 2, oy + 28, 5, 12 + armBob);
    ctx.fillRect(cx + 25, oy + 28, 5, 12 - armBob + 2);
  }

  // Head
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx + 8, oy + 10, 16, 17);
  // Head highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(cx + 8, oy + 10, 16, 4);

  // Hair
  ctx.fillStyle = hairColor;
  if (dir === 'down') {
    ctx.fillRect(cx + 6, oy + 5, 20, 10);
    ctx.fillRect(cx + 6, oy + 13, 5, 6);
    ctx.fillRect(cx + 21, oy + 13, 5, 6);
  } else if (dir === 'up') {
    ctx.fillRect(cx + 6, oy + 5, 20, 14);
  } else if (dir === 'left') {
    ctx.fillRect(cx + 6, oy + 5, 20, 10);
    ctx.fillRect(cx + 6, oy + 13, 5, 10);
  } else {
    ctx.fillRect(cx + 6, oy + 5, 20, 10);
    ctx.fillRect(cx + 21, oy + 13, 5, 10);
  }

  // Eyes
  if (dir === 'down') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 10, oy + 18, 5, 5);
    ctx.fillRect(cx + 18, oy + 18, 5, 5);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(cx + 13, oy + 18, 2, 5);
    ctx.fillRect(cx + 21, oy + 18, 2, 5);
  } else if (dir === 'left') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 8, oy + 18, 5, 5);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(cx + 8, oy + 18, 2, 5);
  } else if (dir === 'right') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 19, oy + 18, 5, 5);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(cx + 22, oy + 18, 2, 5);
  }
}
