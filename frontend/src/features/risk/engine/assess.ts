import { levelFromScore } from '@/lib/risk-levels';
import { clamp, round } from '@/lib/utils';
import { computeModifier } from './exposure';
import { scoreAllHazards } from './hazards';
import type {
  CompositeScore,
  HazardScore,
  HazardSignals,
  HazardType,
  PersonalContext,
  PersonalHazardScore,
  RiskAssessment,
} from './types';

const HAZARD_KEYS: HazardType[] = ['flood', 'fire', 'smoke', 'weather'];

/** Composite weighting: the dominant hazard drives the score; a second hazard compounds it slightly. */
export const COMPOSITE_WEIGHTS = { primary: 0.85, secondary: 0.15 } as const;

export function composite(scores: Partial<Record<HazardType, number>>): CompositeScore {
  const ranked = HAZARD_KEYS.filter((k) => scores[k] != null)
    .map((k) => ({ k, s: scores[k] as number }))
    .sort((a, b) => b.s - a.s);
  if (ranked.length === 0)
    return { score: 0, level: 'safe', primaryHazard: 'weather', secondaryHazard: null };
  const [first, second] = ranked;
  const score = Math.round(
    clamp(first.s * COMPOSITE_WEIGHTS.primary + (second?.s ?? first.s) * COMPOSITE_WEIGHTS.secondary),
  );
  return {
    score,
    level: levelFromScore(score),
    primaryHazard: first.k,
    secondaryHazard: second && second.s >= 21 ? second.k : null,
  };
}

export function personalize(
  hazards: Record<HazardType, HazardScore>,
  ctx: PersonalContext,
): RiskAssessment['personal'] {
  const personal = {} as Record<HazardType, PersonalHazardScore>;
  for (const k of HAZARD_KEYS) {
    const h = hazards[k];
    const modifier = computeModifier(k, ctx);
    const score = h.available ? Math.round(clamp(h.score * modifier.value)) : 0;
    personal[k] = { hazard: k, hazardScore: h.score, score, level: levelFromScore(score), modifier };
  }
  const available = HAZARD_KEYS.filter((k) => hazards[k].available);
  const comp = composite(Object.fromEntries(available.map((k) => [k, personal[k].score])));
  const modifierAvg = available.length
    ? round(available.reduce((s, k) => s + personal[k].modifier.value, 0) / available.length, 2)
    : 1;
  return { ...comp, hazards: personal, modifierAvg };
}

/** Full deterministic assessment: signals → hazard scores → location composite → personal composite. */
export function assessRisk(signals: HazardSignals, ctx: PersonalContext, now = new Date()): RiskAssessment {
  const hazards = scoreAllHazards(signals);
  const available = HAZARD_KEYS.filter((k) => hazards[k].available);
  const location = composite(Object.fromEntries(available.map((k) => [k, hazards[k].score])));
  return {
    computedAt: now.toISOString(),
    hazards,
    location,
    personal: personalize(hazards, ctx),
    signals,
  };
}

/** Top contributing factors across hazards — used for "Why is my score high?". */
export function topDrivers(assessment: RiskAssessment, limit = 4) {
  return HAZARD_KEYS.flatMap((k) =>
    assessment.hazards[k].factors
      .filter((f) => f.available && f.contribution > 0)
      .map((f) => ({
        hazard: k,
        ...f,
        weighted: f.contribution * (assessment.hazards[k].score / 100 + 0.5),
      })),
  )
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, limit);
}
