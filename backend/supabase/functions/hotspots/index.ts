/**
 * Supabase Edge Function — `hotspots` (NASA FIRMS proxy, same logic as `/api/hotspots`).
 * Optional secret: supabase secrets set FIRMS_MAP_KEY=...
 */
import { handleHotspots } from '../../../core/hotspots.ts';

Deno.serve((req: Request) => handleHotspots(req, Deno.env.toObject()));
