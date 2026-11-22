/** Vercel Edge Function — GET /api/hotspots?range=7d|24h (NASA FIRMS proxy). Logic: backend/core/hotspots.ts */
import { handleHotspots } from "../backend/core/hotspots.ts";

export const config = { runtime: "edge" };

export default function handler(req: Request): Promise<Response> {
  return handleHotspots(req, process.env);
}
