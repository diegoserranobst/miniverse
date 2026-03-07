/**
 * fal.ai API wrapper for Nano Banana Pro image generation.
 */

import { fal } from '@fal-ai/client';

export interface GenerateOptions {
  prompt: string;
  refImage?: string; // URL or local path for nano-banana-pro-edit
}

export interface GenerateResult {
  imageUrl: string;
}

export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, refImage } = options;

  if (refImage) {
    // Use edit model with reference image
    const result = await fal.subscribe('fal-ai/nano-banana-pro-edit', {
      input: {
        prompt,
        image_url: refImage,
      },
    });

    const data = result.data as { images: { url: string }[] };
    return { imageUrl: data.images[0].url };
  }

  // Use create model
  const result = await fal.subscribe('fal-ai/nano-banana-pro', {
    input: {
      prompt,
    },
  });

  const data = result.data as { images: { url: string }[] };
  return { imageUrl: data.images[0].url };
}

/**
 * Download an image from a URL to a buffer.
 */
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
