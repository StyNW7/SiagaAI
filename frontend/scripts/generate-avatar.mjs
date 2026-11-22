/**
 * Builds the round assistant avatar (public/mascot/ara-avatar.webp) from the waving hero pose:
 * a head-and-shoulders square crop with breathing room so the helmet is never clipped by the circle.
 * Usage: node scripts/generate-avatar.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const mascot = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'mascot');
const clear = { r: 0, g: 0, b: 0, alpha: 0 };

const crop = await sharp(join(mascot, 'ara-hero-wave.webp'))
  .extract({ left: 10, top: 0, width: 370, height: 372 })
  .extend({ top: 40, left: 20, right: 20, bottom: 0, background: clear })
  .png()
  .toBuffer();

await sharp(crop)
  .resize(256, 256, { fit: 'cover', position: 'top' })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(join(mascot, 'ara-avatar.webp'));

console.log('✓ public/mascot/ara-avatar.webp');
