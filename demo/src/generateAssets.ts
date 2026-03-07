/**
 * Procedurally generates placeholder pixel art assets so the demo
 * runs without any external image files.
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
 * Generate a 16x16 tileset with at least 2 tiles:
 * tile 0 = floor, tile 1 = wall
 */
export async function generateTileset(): Promise<string> {
  const tileSize = 16;
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
  // Add subtle plank lines
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, 7, 16, 1);
  ctx.fillRect(0, 15, 16, 1);

  // Tile 1: Wall - dark blue-gray
  const wallX = tileSize;
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const noise = Math.random() * 8;
      ctx.fillStyle = `rgb(${50 + noise},${55 + noise},${70 + noise})`;
      ctx.fillRect(wallX + x, y, 1, 1);
    }
  }
  // Wall detail - brick pattern
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(wallX, 4, 16, 1);
  ctx.fillRect(wallX, 8, 16, 1);
  ctx.fillRect(wallX, 12, 16, 1);
  ctx.fillRect(wallX + 4, 0, 1, 4);
  ctx.fillRect(wallX + 12, 4, 1, 4);
  ctx.fillRect(wallX + 8, 8, 1, 4);
  ctx.fillRect(wallX + 4, 12, 1, 4);

  return canvasToBlob(canvas);
}

/**
 * Generate a character sprite sheet.
 * 4 rows x 4 frames = 16 frames
 * Row 0: facing down (idle/walk), Row 1: facing up
 * Row 2: facing left, Row 3: facing right
 * Frame size: 16x24
 */
export async function generateCharacterSprite(
  bodyColor: string,
  hairColor: string,
  shirtColor: string,
): Promise<string> {
  const fw = 16;
  const fh = 24;
  const frames = 4;
  const rows = 4;
  const [canvas, ctx] = createCanvas(fw * frames, fh * rows);

  const directions: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];

  for (let row = 0; row < rows; row++) {
    const dir = directions[row];
    for (let frame = 0; frame < frames; frame++) {
      const ox = frame * fw;
      const oy = row * fh;
      const bobY = frame % 2 === 0 ? 0 : -1;

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
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(ox + 4, oy + 21, 8, 3);

  // Legs
  ctx.fillStyle = '#3b3b5c';
  const legOffset = frame % 2 === 0 ? 0 : 1;
  ctx.fillRect(ox + 5, oy + 17, 2, 4 + legOffset);
  ctx.fillRect(ox + 9, oy + 17, 2, 4 - legOffset + 1);

  // Shoes
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(ox + 4, oy + 20 + legOffset, 3, 2);
  ctx.fillRect(ox + 9, oy + 21 - legOffset, 3, 2);

  // Body / shirt
  ctx.fillStyle = shirtColor;
  ctx.fillRect(ox + 4, oy + 11, 8, 7);

  // Arms
  const armBob = frame % 2 === 0 ? 0 : 1;
  ctx.fillStyle = bodyColor;
  if (dir === 'left') {
    ctx.fillRect(ox + 3, oy + 12, 2, 5 + armBob);
  } else if (dir === 'right') {
    ctx.fillRect(ox + 11, oy + 12, 2, 5 + armBob);
  } else {
    ctx.fillRect(ox + 3, oy + 12, 2, 4 + armBob);
    ctx.fillRect(ox + 11, oy + 12, 2, 4 - armBob + 1);
  }

  // Head
  ctx.fillStyle = bodyColor;
  ctx.fillRect(ox + 5, oy + 4, 6, 7);

  // Hair
  ctx.fillStyle = hairColor;
  if (dir === 'down') {
    ctx.fillRect(ox + 4, oy + 2, 8, 4);
    ctx.fillRect(ox + 4, oy + 5, 2, 2);
    ctx.fillRect(ox + 10, oy + 5, 2, 2);
  } else if (dir === 'up') {
    ctx.fillRect(ox + 4, oy + 2, 8, 5);
  } else if (dir === 'left') {
    ctx.fillRect(ox + 4, oy + 2, 8, 4);
    ctx.fillRect(ox + 4, oy + 5, 2, 4);
  } else {
    ctx.fillRect(ox + 4, oy + 2, 8, 4);
    ctx.fillRect(ox + 10, oy + 5, 2, 4);
  }

  // Eyes
  if (dir === 'down') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + 6, oy + 7, 2, 2);
    ctx.fillRect(ox + 9, oy + 7, 2, 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(ox + 7, oy + 7, 1, 2);
    ctx.fillRect(ox + 10, oy + 7, 1, 2);
  } else if (dir === 'left') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + 5, oy + 7, 2, 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(ox + 5, oy + 7, 1, 2);
  } else if (dir === 'right') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + 9, oy + 7, 2, 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(ox + 10, oy + 7, 1, 2);
  }
}
