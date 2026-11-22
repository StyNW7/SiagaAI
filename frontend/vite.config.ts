/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const repoRoot = path.resolve(__dirname, '..');

/**
 * Dev-only bridge that serves the serverless handlers in `/api/*` (the same
 * files Vercel deploys) through the Vite dev server, so the whole stack —
 * frontend, BFF proxy and AI gateway — runs locally with a single command.
 */
function serverlessApiBridge(env: Record<string, string>): Plugin {
  return {
    name: 'siagaai-serverless-api-bridge',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      Object.assign(process.env, env);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const route = req.url.split('?')[0].replace(/^\/api\//, '').replace(/\/$/, '');
        if (!/^[a-z-]+$/.test(route)) return next();
        try {
          const mod = await server.ssrLoadModule(path.join(repoRoot, 'api', `${route}.ts`));
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          });
          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          server.config.logger.error(`[api/${route}] ${(error as Error).message}`);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'internal_error' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load *server-side* secrets (no VITE_ prefix) from the repo root .env for the dev bridge only.
  const serverEnv = loadEnv(mode, repoRoot, '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      serverlessApiBridge(serverEnv),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'brand/*', 'icons/apple-touch-icon.png', 'robots.txt'],
        manifest: {
          name: 'SiagaAI — Personal Disaster Intelligence',
          short_name: 'SiagaAI',
          description:
            'PWA berbasis AI yang mengubah data kebencanaan & lingkungan Indonesia menjadi informasi risiko yang personal dan dapat ditindaklanjuti.',
          lang: 'id',
          start_url: '/app',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#D71920',
          background_color: '#FAFAFA',
          categories: ['weather', 'utilities', 'health'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Dashboard', url: '/app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
            { name: 'Siaga Map', url: '/app/map', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
            { name: 'Rencana Aksi', url: '/app/action-plan', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,geojson}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Basemap tiles & styles: cache-first so the map still renders offline.
              urlPattern: /^https:\/\/(tiles\.openfreemap\.org|tiles\.basemaps\.cartocdn\.com|basemaps\.cartocdn\.com)\//,
              handler: 'CacheFirst',
              options: { cacheName: 'basemap', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 14 } },
            },
            {
              // Live data: network-first. Cached copies are only shown with an explicit "offline" label.
              urlPattern: /^https:\/\/(api\.open-meteo\.com|air-quality-api\.open-meteo\.com|flood-api\.open-meteo\.com|api\.bmkg\.go\.id|data\.bmkg\.go\.id)\//,
              handler: 'NetworkFirst',
              options: { cacheName: 'live-data', networkTimeoutSeconds: 8, expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 } },
            },
            {
              urlPattern: /\/data\/hotspots-snapshot\.json$/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'snapshots' },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    envDir: repoRoot,
    resolve: { alias: { '@ai': path.resolve(repoRoot, 'ai'), '@': path.resolve(__dirname, 'src') } },
    server: { port: 5173, fs: { allow: [repoRoot] } },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            maplibre: ['maplibre-gl'],
            charts: ['recharts'],
            react: ['react', 'react-dom', 'react-router'],
          },
        },
      },
    },
    test: { environment: 'node', dir: repoRoot, include: ['frontend/src/**/*.test.ts', 'backend/**/*.test.ts'] },
  };
});
