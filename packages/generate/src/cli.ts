#!/usr/bin/env node

import { generateCharacter, generateFurniture, generateObject, processExistingImage } from './pipeline.js';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function printUsage() {
  console.log(`
miniverse-generate — AI sprite generator for Miniverse

Usage:
  miniverse-generate character --prompt "description" [options]
  miniverse-generate object --prompt "description" --output path
  miniverse-generate furniture --prompt "description" [options]
  miniverse-generate process --input file.png --type character|furniture --output path

Commands:
  character   Generate a character walk/action sprite sheet
  object      Generate a single object/furniture piece
  furniture   Generate furniture pieces (multi-item set)
  process     Process an existing raw image (skip generation)

Options:
  --prompt      Character or furniture description (required for generate)
  --image       Reference image URL or path (for fal edit mode)
  --type        Sheet type: 'walk' or 'action' (default: walk)
  --output      Output file path (character) or directory (furniture)
  --input       Input image path (for process command)
  --skip-bg     Skip background removal
  --help        Show this help

Environment:
  FAL_KEY       fal.ai API key (required for generation)

Examples:
  miniverse-generate character \\
    --prompt "young female, pink hair, yellow cardigan" \\
    --output sprites/nova_walk.png

  miniverse-generate character \\
    --prompt "male developer, red hoodie" \\
    --image reference.png \\
    --output sprites/morty_walk.png

  miniverse-generate furniture \\
    --prompt "cozy cafe furniture set" \\
    --output sprites/cafe/

  miniverse-generate process \\
    --input raw_sprite.png \\
    --type character \\
    --output clean_sprite.png
  `);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  if (command === 'process') {
    const input = getFlag('input');
    const type = getFlag('type') as 'character' | 'furniture';
    const output = getFlag('output');
    if (!input || !type || !output) {
      console.error('Error: --input, --type, and --output are required for process command');
      process.exit(1);
    }
    await processExistingImage(input, type, output, { skipBgRemoval: hasFlag('skip-bg') });
    return;
  }

  const prompt = getFlag('prompt');
  if (!prompt) {
    console.error('Error: --prompt is required');
    process.exit(1);
  }

  if (!process.env.FAL_KEY) {
    console.error('Error: FAL_KEY environment variable is required');
    console.error('Get your key at https://fal.ai/dashboard/keys');
    process.exit(1);
  }

  if (command === 'character') {
    const output = getFlag('output') ?? 'character_walk.png';
    await generateCharacter({
      prompt,
      refImage: getFlag('image'),
      type: (getFlag('type') as 'walk' | 'action') ?? 'walk',
      output,
      skipBgRemoval: hasFlag('skip-bg'),
    });
  } else if (command === 'object') {
    const output = getFlag('output') ?? 'object.png';
    await generateObject({
      prompt,
      refImage: getFlag('image'),
      output,
      skipBgRemoval: hasFlag('skip-bg'),
    });
  } else if (command === 'furniture') {
    const output = getFlag('output') ?? 'furniture/';
    await generateFurniture({
      prompt,
      refImage: getFlag('image'),
      output,
      skipBgRemoval: hasFlag('skip-bg'),
    });
  } else {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  console.log('Done!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
