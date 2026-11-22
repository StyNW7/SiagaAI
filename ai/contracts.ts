/**
 * SiagaAI — AI contracts shared by the frontend, the serverless gateway and the
 * Supabase Edge Function. Zero dependencies so it runs in browsers, Node, Vercel
 * Edge and Deno alike.
 *
 * Core principle: "Algorithm calculates. AI communicates."
 * The context below already contains every number (computed by the deterministic
 * Siaga Risk Engine from real data). The model only explains and recommends.
 */

export const AI_TASKS = [
  "brief",
  "impact",
  "action-plan",
  "family-plan",
  "region",
  "assistant",
] as const;
export type AiTask = (typeof AI_TASKS)[number];

export type Level = "safe" | "low" | "moderate" | "high" | "critical";
export type Hazard = "flood" | "fire" | "smoke" | "weather";

export interface AiHazardContext {
  score: number;
  level: Level;
  personalScore: number;
  headline: string;
  available: boolean;
  topFactors: { label: string; value: string }[];
}

export interface AiContext {
  location: { name: string; region?: string; lat: number; lon: number };
  dataMode: "live" | "snapshot" | "scenario" | "cached";
  scenarioName?: string;
  generatedAt: string;
  risk: {
    location: { score: number; level: Level; primaryHazard: Hazard };
    personal: {
      score: number;
      level: Level;
      primaryHazard: Hazard;
      modifier: number;
    };
    hazards: Record<Hazard, AiHazardContext>;
  };
  weather?: {
    description: string;
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    windFrom: string | null;
    rain24hMm: number;
    rainPeakMmPerHour: number;
    rainProbabilityMax: number;
    thunderstormHours: number;
    source: string;
  } | null;
  airQuality?: { pm25: number | null; usAqi: number | null } | null;
  hotspots?: {
    nearestKm: number | null;
    within50km: number;
    upwind: number;
    latestHoursAgo: number | null;
    source: string;
  } | null;
  officialWarnings: string[];
  earthquake?: {
    magnitude: number;
    region: string;
    time: string;
    distanceKm: number;
  } | null;
  profile: {
    occupation: string;
    transport: string;
    exposure: string;
    activity: string;
  };
  family?: {
    name: string;
    relation: string;
    ageGroup: string;
    level: Level;
    priority: "high" | "watch" | "normal";
  }[];
  saferOutdoorWindows: string[];
  /** Curated preparedness actions (BNPB-aligned) the model should ground recommendations on. */
  guidance: string[];
  region?: {
    name: string;
    hotspots24h: number;
    hotspots7d: number;
    trend: string;
    warnings: number;
  } | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiRequest {
  task: AiTask;
  context: AiContext;
  messages?: ChatMessage[];
}

/* ── Output schemas ─────────────────────────────────────────────────────── */

export interface BriefOutput {
  headline: string;
  summary: string;
  keyPoints: string[];
  nextAction: string;
}

export interface ImpactOutput {
  headline: string;
  summary: string;
  impacts: { hazard: Hazard; impact: string; advice: string }[];
  timing: string;
  watchFor: string[];
}

export interface ActionPlanOutput {
  title: string;
  summary: string;
  rightNow: string[];
  nextHours: string[];
  ifWorsens: string[];
  officialNote: string;
}

export interface FamilyPlanOutput {
  summary: string;
  members: { name: string; advice: string[] }[];
  household: string[];
  ifWorsens: string[];
}

export interface RegionOutput {
  headline: string;
  summary: string;
  outlook: string;
}

export interface AssistantOutput {
  answer: string;
  followUps: string[];
}

export interface AiOutputMap {
  brief: BriefOutput;
  impact: ImpactOutput;
  "action-plan": ActionPlanOutput;
  "family-plan": FamilyPlanOutput;
  region: RegionOutput;
  assistant: AssistantOutput;
}

export interface AiResponse<T extends AiTask = AiTask> {
  task: T;
  output: AiOutputMap[T];
  provider: string;
  model: string;
  generatedAt: string;
}

/* ── Validation (no deps) ───────────────────────────────────────────────── */

const isStr = (v: unknown, max = 1200): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const strArr = (v: unknown, min = 1, max = 8, len = 400): v is string[] =>
  Array.isArray(v) &&
  v.length >= min &&
  v.length <= max &&
  v.every((x) => isStr(x, len));
const HAZARDS: Hazard[] = ["flood", "fire", "smoke", "weather"];

/** Returns a cleaned output or null when the model response does not match the schema. */
export function validateOutput<T extends AiTask>(
  task: T,
  raw: unknown,
): AiOutputMap[T] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  switch (task) {
    case "brief":
      return isStr(o.headline, 200) &&
        isStr(o.summary) &&
        strArr(o.keyPoints, 1, 5) &&
        isStr(o.nextAction, 300)
        ? (o as unknown as AiOutputMap[T])
        : null;
    case "impact": {
      const impacts = Array.isArray(o.impacts)
        ? o.impacts.filter(
            (i): i is ImpactOutput["impacts"][number] =>
              !!i &&
              HAZARDS.includes((i as { hazard: Hazard }).hazard) &&
              isStr((i as { impact: string }).impact) &&
              isStr((i as { advice: string }).advice),
          )
        : [];
      return isStr(o.headline, 200) &&
        isStr(o.summary) &&
        impacts.length > 0 &&
        isStr(o.timing, 500) &&
        strArr(o.watchFor, 1, 5)
        ? ({ ...o, impacts } as unknown as AiOutputMap[T])
        : null;
    }
    case "action-plan":
      return isStr(o.title, 160) &&
        isStr(o.summary) &&
        strArr(o.rightNow, 2, 6) &&
        strArr(o.nextHours, 2, 6) &&
        strArr(o.ifWorsens, 2, 6) &&
        isStr(o.officialNote, 400)
        ? (o as unknown as AiOutputMap[T])
        : null;
    case "family-plan": {
      const members = Array.isArray(o.members)
        ? o.members.filter(
            (m): m is FamilyPlanOutput["members"][number] =>
              !!m &&
              isStr((m as { name: string }).name, 80) &&
              strArr((m as { advice: string[] }).advice, 1, 4),
          )
        : [];
      return isStr(o.summary) &&
        members.length > 0 &&
        strArr(o.household, 1, 6) &&
        strArr(o.ifWorsens, 1, 5)
        ? ({ ...o, members } as unknown as AiOutputMap[T])
        : null;
    }
    case "region":
      return isStr(o.headline, 200) && isStr(o.summary) && isStr(o.outlook, 600)
        ? (o as unknown as AiOutputMap[T])
        : null;
    case "assistant":
      return isStr(o.answer, 2400) && Array.isArray(o.followUps)
        ? ({
            answer: o.answer,
            followUps: (o.followUps as unknown[])
              .filter((f): f is string => isStr(f, 120))
              .slice(0, 3),
          } as AiOutputMap[T])
        : null;
    default:
      return null;
  }
}

/** Request validation used server-side (defence in depth — never trust the client). */
export function validateRequest(
  body: unknown,
): { ok: true; value: AiRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object")
    return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;
  if (!AI_TASKS.includes(b.task as AiTask))
    return { ok: false, error: "invalid_task" };
  const ctx = b.context as AiContext | undefined;
  if (
    !ctx ||
    typeof ctx !== "object" ||
    !ctx.location ||
    !ctx.risk ||
    !isStr(ctx.location.name, 120)
  )
    return { ok: false, error: "invalid_context" };
  if (b.messages != null) {
    if (!Array.isArray(b.messages) || b.messages.length > 12)
      return { ok: false, error: "invalid_messages" };
    for (const m of b.messages as ChatMessage[]) {
      if (
        !m ||
        (m.role !== "user" && m.role !== "assistant") ||
        !isStr(m.content, 1500)
      )
        return { ok: false, error: "invalid_message" };
    }
  }
  if (
    b.task === "assistant" &&
    !(b.messages as ChatMessage[] | undefined)?.some((m) => m.role === "user")
  )
    return { ok: false, error: "missing_question" };
  return { ok: true, value: b as unknown as AiRequest };
}
