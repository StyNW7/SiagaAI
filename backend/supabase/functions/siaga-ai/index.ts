/**
 * Supabase Edge Function — `siaga-ai`
 *
 * Alternative deployment of the SiagaAI AI gateway (same logic as `/api/ai` on
 * Vercel). Secrets are set with:
 *   supabase secrets set GEMINI_API_KEY=... GROQ_API_KEY=...
 * Frontend: set VITE_AI_ENDPOINT=https://<project>.supabase.co/functions/v1/siaga-ai
 */
import { handleAi } from '../../../core/ai-gateway.ts';

Deno.serve((req: Request) => handleAi(req, Deno.env.toObject()));
