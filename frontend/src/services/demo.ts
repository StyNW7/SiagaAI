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
