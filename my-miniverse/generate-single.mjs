#!/usr/bin/env node
/**
 * Genera una sola imagen con fal.ai
 * Uso: node generate-single.mjs "prompt" output.png
 */
import { readFileSync, existsSync } from 'fs';
import { generateObject } from '@miniverse/generate';

if (!process.env.FAL_KEY && existsSync('.env.development')) {
  for (const line of readFileSync('.env.development', 'utf-8').split('\n')) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) process.env[match[1]] = match[2];
  }
}

const prompt = process.argv[2];
const output = process.argv[3];

if (!prompt || !output) {
  console.error('Uso: node generate-single.mjs "prompt" output.png');
  process.exit(1);
}

console.log(`Generando: ${prompt.slice(0, 80)}...`);
console.log(`Output: ${output}`);

await generateObject({ prompt, output });
console.log('Listo!');
