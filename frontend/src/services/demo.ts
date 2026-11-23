/**
 * Demo workspace for the competition account (mirrors backend/supabase/seed.sql).
 * Applied once on demo sign-in so judges immediately see a realistic profile:
 * Palangka Raya, student on a motorcycle, three family members.
 * Never overwrites data the user already entered on this device.
 */
import { CITY_BY_SLUG } from '@/data/cities';
import { useFamilyStore, useLocationStore, useProfileStore, useSettings } from '@/stores';

export function seedDemoWorkspace() {
  const profile = useProfileStore.getState();
  if (!profile.customized) {
    profile.update({
      displayName: 'Demo User',
      occupation: 'student',
      transport: 'motorcycle',
      exposure: 'moderate',
      activity: 'mixed',
    });
  }

  const family = useFamilyStore.getState();
  if (family.members.length === 0) {
    family.add({
      name: 'Nenek Sri',
      relation: 'Nenek',
      ageGroup: 'elderly',
      activity: 'indoor',
      exposure: 'low',
    });
    family.add({
      name: 'Adik Rafa',
      relation: 'Saudara',
      ageGroup: 'child',
      activity: 'mixed',
      exposure: 'moderate',
    });
    family.add({ name: 'Ayah', relation: 'Ayah', ageGroup: 'adult', activity: 'outdoor', exposure: 'high' });
  }

  const loc = useLocationStore.getState();
  const city = CITY_BY_SLUG['palangka-raya'];
  if (city && loc.saved.length === 0) {
    const point = {
      id: `preset-${city.slug}`,
      name: city.name,
      region: city.province,
      provinceCode: city.provinceCode,
      lat: city.lat,
      lon: city.lon,
      source: 'preset' as const,
    };
    const saved = loc.saveLocation(point);
    useSettings.getState().setScenario(null);
    loc.setCurrent({ ...point, id: saved.id, source: 'saved' });
  }
}

/**
 * "Open as Ara" — used by the About page's live feature buttons.
 * Ara is the story persona: a student in Palangka Raya who rides a motorbike to campus
 * and lives with her grandmother and little brother. Like `seedDemoWorkspace`, it never
 * overwrites a profile or family the user already set up on this device.
 */
export function loadAraPersona() {
  const profile = useProfileStore.getState();
  if (!profile.customized) {
    profile.update({
      displayName: 'Ara',
      occupation: 'student',
      transport: 'motorcycle',
      exposure: 'moderate',
      activity: 'mixed',
    });
  }

  const family = useFamilyStore.getState();
  if (family.members.length === 0) {
    family.add({ name: 'Nenek Sri', relation: 'Nenek', ageGroup: 'elderly', activity: 'indoor', exposure: 'low' });
    family.add({ name: 'Adik Rafa', relation: 'Saudara', ageGroup: 'child', activity: 'mixed', exposure: 'moderate' });
  }

  // Ara lives in Palangka Raya — show that city with LIVE data (scenario mode is retired).
  const city = CITY_BY_SLUG['palangka-raya'];
  if (city) {
    useSettings.getState().setScenario(null);
    useLocationStore.getState().setCurrent({
      id: `preset-${city.slug}`,
      name: city.name,
      region: city.province,
      provinceCode: city.provinceCode,
      lat: city.lat,
      lon: city.lon,
      source: 'preset',
    });
  }

  // The persona is already "onboarded" — don't interrupt the demo with the setup dialog
  // (same keys as markOnboarded() in features/onboarding, without pulling that module in).
  try {
    localStorage.setItem('siaga.onboarded', '1');
    localStorage.removeItem('siaga.onboarding.request');
  } catch {
    // storage unavailable — onboarding may show, which is harmless
  }
}
