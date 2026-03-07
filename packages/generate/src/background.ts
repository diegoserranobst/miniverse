/**
 * Background removal using fal.ai's Bria RMBG 2.0 model.
 * Removes checker pattern / colored backgrounds from AI-generated sprites.
 */

import { fal } from '@fal-ai/client';

/**
 * Remove background from an image URL using fal.ai Bria RMBG 2.0.
 * Returns the URL of the processed image with transparent background.
 */
export async function removeBgUrl(imageUrl: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/bria/background/remove', {
    input: {
      image_url: imageUrl,
    },
  });

  const data = result.data as { image: { url: string } };
  return data.image.url;
}

/**
 * Remove background from an image buffer.
 * Uploads to fal storage first, then runs bg removal.
 */
export async function removeBg(imageBuffer: Buffer): Promise<Buffer> {
  // Upload buffer to fal storage to get a URL
  const file = new File([imageBuffer], 'image.png', { type: 'image/png' });
  const uploadedUrl = await fal.storage.upload(file);

  const resultUrl = await removeBgUrl(uploadedUrl);

  // Download the result
  const response = await fetch(resultUrl);
  if (!response.ok) throw new Error(`Failed to download bg-removed image: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
