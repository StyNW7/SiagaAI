import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import type { AiContext, AiTask } from '@ai/contracts';
import { SCENARIOS } from '@/data/scenarios';
import { assessFamily } from '@/features/risk/engine/family';
import { buildAiContext } from '@/services/ai/context';
import { requestAi, type AiResult } from '@/services/ai/client';
import { useFamilyStore, useProfileStore } from '@/stores';
import { haversineKm } from '@/lib/geo';
import { useRiskAssessment, type RiskView } from './use-siaga-data';

/** Structured AI context for the active location/profile (null until the assessment is ready). */
export function useAiContext(view?: RiskView, extra?: Partial<AiContext>): AiContext | null {
  const own = useRiskAssessment();
  const v = view ?? own;
  const profile = useProfileStore((s) => s.profile);
  const members = useFamilyStore((s) => s.members);

  return useMemo(() => {
    if (!v.assessment) return null;
    const family = assessFamily(v.assessment.hazards, profile, members, v.assessment.personal);
    const quakes = v.earthquakes.data?.significant ?? [];
    const nearestQuake = [...quakes, ...(v.earthquakes.data?.latest ? [v.earthquakes.data.latest] : [])]
      .filter((q) => Date.now() - new Date(q.time).getTime() < 3 * 86_400_000)
      .sort((a, b) => haversineKm(v.location, a) - haversineKm(v.location, b))[0];
    return {
      ...buildAiContext({
        location: v.location,
        assessment: v.assessment,
        profile,
        weather: v.weather.data,
        dataMode: v.dataMode,
        scenarioName: v.scenario ? SCENARIOS[v.scenario].title : undefined,
        earthquake: nearestQuake ?? null,
        warningTitles: (v.localWarnings ?? []).map((w) => w.title),
        windows: v.windows ?? [],
        family: members.length ? family : undefined,
        hotspotSource: v.hotspots.data?.provenance.source,
      }),
      ...extra,
    };
  }, [
    v.assessment,
    v.location,
    v.weather.data,
    v.dataMode,
    v.scenario,
    v.earthquakes.data,
    v.localWarnings,
    v.windows,
    v.hotspots.data,
    profile,
    members,
    extra,
  ]);
}

/** Auto-generated AI content (e.g. the daily brief). */
export function useAiQuery<T extends AiTask>(task: T, context: AiContext | null, enabled = true) {
  // Set by `refresh()` so a user-requested regeneration bypasses the response cache.
  const bypassCache = useRef(false);
  const query = useQuery<AiResult<T>>({
    queryKey: [
      'ai',
      task,
      context?.language,
      context?.location.name,
      context?.risk.personal.score,
      context?.risk.location.score,
      context?.dataMode,
      context?.profile,
    ],
    queryFn: ({ signal }) => {
      const skipCache = bypassCache.current;
      bypassCache.current = false;
      return requestAi(task, context!, { signal, skipCache });
    },
    enabled: enabled && !!context,
    staleTime: 30 * 60_000,
    retry: 0,
  });
  const refresh = useCallback(() => {
    bypassCache.current = true;
    return query.refetch();
  }, [query]);
  return { query, refresh };
}

/** User-triggered AI generation (action plan, impact forecast, family plan…). */
export function useAiMutation<T extends AiTask>(task: T) {
  return useMutation<AiResult<T>, Error, { context: AiContext; fresh?: boolean }>({
    mutationFn: ({ context, fresh }) => requestAi(task, context, { skipCache: fresh }),
  });
}
