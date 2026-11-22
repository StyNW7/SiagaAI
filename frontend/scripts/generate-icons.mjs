/**
 * Generates every brand asset from the official logo (images/SiagaAI-Logo.png):
 *  - transparent, trimmed logo for the UI (white background outside the shield removed
 *    with an edge flood-fill so the white "S" inside the shield is preserved),
 *  - favicon, PWA icons (any + maskable), Apple touch icon and the Open Graph image.
 * Usage: node scripts/generate-icons.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, '..', 'images', 'SiagaAI-Logo.png');
const icons = join(root, 'public', 'icons');
const brand = join(root, 'public', 'brand');
mkdirSync(icons, { recursive: true });
mkdirSync(brand, { recursive: true });

/* ── 1. Remove the outer white background (flood fill from the borders) ── */
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const isWhite = (i) => data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235;
const seen = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const p = stack.pop();
  if (seen[p]) continue;
  seen[p] = 1;
  if (!isWhite(p * 4)) continue;
  data[p * 4 + 3] = 0;
  const x = p % W;
  const y = (p - x) / W;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - W);
  if (y < H - 1) stack.push(p + W);
}
// Soften the anti-aliased fringe: near-white pixels touching transparency become semi-transparent.
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  if (data[i + 3] === 0) continue;
  const x = p % W;
  const near = [p - 1, p + 1, p - W, p + W].some((q) => q >= 0 && q < W * H && Math.abs((q % W) - x) <= 1 && data[q * 4 + 3] === 0);
  if (near) {
    const lightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i + 3] = Math.max(0, Math.min(255, Math.round(255 - (lightness - 150) * 2.4)));
  }
}
const transparent = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
const trimmed = await sharp(transparent).trim({ threshold: 1 }).png().toBuffer();
const meta = await sharp(trimmed).metadata();

/* ── 2. UI logo (transparent, square canvas) ── */
const square = (size, pad = 0, background = { r: 0, g: 0, b: 0, alpha: 0 }) => {
  const inner = Math.round(size * (1 - pad * 2));
  return sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: Math.floor((size - inner) / 2), bottom: Math.ceil((size - inner) / 2), left: Math.floor((size - inner) / 2), right: Math.ceil((size - inner) / 2), background })
    .flatten(background.alpha === 0 ? false : { background })
    .png({ compressionLevel: 9 });
};
await square(256).toFile(join(brand, 'siagaai-logo-256.png'));
await sharp(await square(512).toBuffer()).webp({ quality: 90 }).toFile(join(brand, 'siagaai-logo.webp'));
await square(64).toFile(join(root, 'public', 'favicon.png'));

/* ── 3. PWA icons ── */
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
await square(192, 0.06, WHITE).toFile(join(icons, 'icon-192.png'));
await square(512, 0.06, WHITE).toFile(join(icons, 'icon-512.png'));
await square(512, 0.18, WHITE).toFile(join(icons, 'icon-maskable-512.png')); // safe zone ≥ 80 %
await square(180, 0.1, WHITE).toFile(join(icons, 'apple-touch-icon.png'));

/* ── 4. Open Graph image (1200×630) ── */
const silhouette = readFileSync(join(root, 'src', 'data', 'silhouette.ts'), 'utf8').match(/'(M[^']+)'/)[1];
const og = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FAFAFA"/>
  <g transform="translate(330 250) scale(0.82)" fill="#E9ECEF"><path d="${silhouette}"/></g>
  <rect x="0" y="0" width="1200" height="10" fill="#D71920"/>
  <text x="300" y="175" font-family="Inter, Segoe UI, Arial" font-size="76" font-weight="800" fill="#171717">Siaga<tspan fill="#D71920">AI</tspan></text>
  <text x="300" y="228" font-family="Inter, Segoe UI, Arial" font-size="30" font-weight="600" fill="#6B7280">AI-Powered Personal Disaster Intelligence</text>
  <text x="80" y="520" font-family="Inter, Segoe UI, Arial" font-size="44" font-weight="800" fill="#171717">Kenali Risiko. Pahami Dampaknya.</text>
  <text x="80" y="576" font-family="Inter, Segoe UI, Arial" font-size="44" font-weight="800" fill="#D71920">Ambil Tindakan.</text>
</svg>`);
const ogLogo = await sharp(trimmed).resize(190, 190, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await sharp(og).composite([{ input: ogLogo, left: 80, top: 70 }]).png().toFile(join(icons, 'og-image.png'));

console.log(`brand assets generated from ${meta.width}×${meta.height} trimmed logo`);
