/** Vercel Edge Function — GET /api/health: which integrations are configured (no secrets exposed). */
import { aiStatus } from "../backend/core/ai-gateway.ts";
import { json } from "../backend/core/http.ts";

export const config = { runtime: "edge" };

export default function handler(): Response {
  return json({
    status: "ok",
    service: "siagaai-api",
    ai: aiStatus(process.env),
    firms: process.env.FIRMS_MAP_KEY ? "area-api" : "public-nrt-feeds",
    time: new Date().toISOString(),
  });
}
