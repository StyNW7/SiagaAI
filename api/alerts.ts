/** Vercel Edge Function — GET /api/alerts (BMKG nowcast proxy). Logic: backend/core/alerts.ts */
import { handleAlerts } from "../backend/core/alerts.ts";

export const config = { runtime: "edge" };

export default function handler(req: Request): Promise<Response> {
  return handleAlerts(req);
}
