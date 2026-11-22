import type { FamilyMember, PersonalProfile } from '@/types/domain';
import { personalize } from './assess';
import type { HazardScore, HazardType, RiskAssessment, RiskLevel } from './types';

export interface FamilyMemberRisk {
  member: FamilyMember | { id: 'self'; name: string; relation: string; ageGroup: 'adult' };
  score: number;
  level: RiskLevel;
  primaryHazard: HazardType;
  priority: 'high' | 'watch' | 'normal';
  reasons: string[];
}

const SENSITIVE = new Set(['infant', 'child', 'elderly']);

/** Deterministic family overview: each member gets their own personal composite + priority flag. */
export function assessFamily(
  hazards: Record<HazardType, HazardScore>,
  self: PersonalProfile,
  members: FamilyMember[],
  selfPersonal: RiskAssessment['personal'],
): FamilyMemberRisk[] {
  const rows: FamilyMemberRisk[] = [
    {
      member: { id: 'self', name: self.displayName || 'Anda', relation: 'Anda', ageGroup: 'adult' },
      score: selfPersonal.score,
      level: selfPersonal.level,
      primaryHazard: selfPersonal.primaryHazard,
      priority: selfPersonal.score >= 61 ? 'high' : selfPersonal.score >= 41 ? 'watch' : 'normal',
      reasons: [],
    },
  ];

  for (const m of members) {
    const p = personalize(hazards, {
      occupation: m.activity === 'outdoor' ? 'outdoor' : 'other',
      transport: 'public',
      exposure: m.exposure,
      activity: m.activity,
      ageGroup: m.ageGroup,
    });
    const sensitive = SENSITIVE.has(m.ageGroup);
    const reasons: string[] = [];
    if (sensitive)
      reasons.push(
        m.ageGroup === 'elderly'
          ? 'Lansia lebih rentan terhadap asap & panas'
          : 'Anak lebih rentan terhadap paparan asap',
      );
    if (m.exposure === 'high') reasons.push('Paparan luar ruang tinggi');
    const priority: FamilyMemberRisk['priority'] =
      p.score >= 61 || (sensitive && p.score >= 41)
        ? 'high'
        : p.score >= 41 || (sensitive && p.score >= 25)
          ? 'watch'
          : 'normal';
    rows.push({
      member: m,
      score: p.score,
      level: p.level,
      primaryHazard: p.primaryHazard,
      priority,
      reasons,
    });
  }
  return rows;
}
