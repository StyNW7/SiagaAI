/** Vercel Edge Function — POST /api/ai (secure AI gateway). Logic: backend/core/ai-gateway.ts */
import { handleAi } from "../backend/core/ai-gateway.ts";

export const config = { runtime: "edge" };

export default function handler(req: Request): Promise<Response> {
  return handleAi(req, process.env);
}
