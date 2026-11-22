/**
 * SiagaAI Local Reasoner — deterministic natural-language generator used when
 * the LLM gateway is not configured, offline, rate-limited or returns an
 * invalid answer. It consumes exactly the same AiContext as the LLM and returns
 * the same schemas, so the UI is identical and the app never breaks.
 *
 * Bilingual: every sentence is produced in Bahasa Indonesia or English
 * (context.language, falling back to the active UI language) with the same meaning.
 */
import type {
  ActionPlanOutput,
  AiContext,
  AiOutputMap,
  AiTask,
  AssistantOutput,
  BriefOutput,
  ChatMessage,
  FamilyPlanOutput,
  Hazard,
  ImpactOutput,
  Level,
  RegionOutput,
} from '@ai/contracts';
import { ACTIONS, EMERGENCY_CONTACTS, selectActions, type ActionTag } from '@/data/preparedness';
import { WEIGHTS } from '@/features/risk/engine/hazards';
import { getLang, setRuntimeLang, type Lang } from '@/lib/i18n';

/** Language for the current generation (set per call in `localReason`). */
let L: Lang = 'id';
const t = (id: string, en: string) => (L === 'en' ? en : id);

const LEVEL = (l: Level) =>
  ({
    safe: t('Aman', 'Safe'),
    low: t('Rendah', 'Low'),
    moderate: t('Sedang', 'Moderate'),
    high: t('Tinggi', 'High'),
    critical: t('Kritis', 'Critical'),
  })[l];
const HZ = (h: Hazard) =>
  ({
    flood: t('potensi banjir', 'flood potential'),
    fire: t('aktivitas titik panas', 'hotspot activity'),
    smoke: t('potensi paparan asap', 'potential smoke exposure'),
    weather: t('cuaca ekstrem', 'extreme weather'),
  })[h];
const HZ_TITLE = (h: Hazard) =>
  ({
    flood: t('Banjir', 'Flood'),
    fire: t('Karhutla', 'Wildfire'),
    smoke: t('Asap', 'Smoke'),
    weather: t('Cuaca ekstrem', 'Extreme weather'),
  })[h];
const RANK: Record<Level, number> = { safe: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const HAZARDS: Hazard[] = ['flood', 'fire', 'smoke', 'weather'];
const and = () => t(' dan ', ' and ');
const or = () => t(' atau ', ' or ');

const levels = (c: AiContext) =>
  Object.fromEntries(HAZARDS.map((h) => [h, levelOf(c.risk.hazards[h].personalScore)])) as Record<
    Hazard,
    Level
  >;
const levelOf = (s: number): Level =>
  s <= 20 ? 'safe' : s <= 40 ? 'low' : s <= 60 ? 'moderate' : s <= 80 ? 'high' : 'critical';

function modeNote(c: AiContext): string {
  if (c.dataMode === 'scenario')
    return t(
      ` (Mode skenario: ${c.scenarioName ?? 'simulasi'} — bukan kondisi aktual.)`,
      ` (Scenario mode: ${c.scenarioName ?? 'simulation'} — not actual conditions.)`,
    );
  if (c.dataMode === 'snapshot' || c.dataMode === 'cached')
    return t(
      ' (Sebagian data berasal dari snapshot, bukan real-time.)',
      ' (Some data comes from a snapshot, not real time.)',
    );
  return '';
}

const isCar = (s: string) => /^(mobil|car)$/i.test(s);

function personaPhrase(c: AiContext) {
  const occ = c.profile.occupation.toLowerCase();
  const tr = c.profile.transport.toLowerCase();
  return t(
    `${occ} yang ${isCar(c.profile.transport) ? 'bermobil' : `menggunakan ${tr}`}`,
    `${occ} who ${isCar(c.profile.transport) ? 'drives a car' : /walk/i.test(tr) ? 'travels on foot' : `uses ${tr}`}`,
  );
}

function weatherSentence(c: AiContext): string {
  const w = c.weather;
  if (!w) return t('Data cuaca sedang tidak tersedia.', 'Weather data is currently unavailable.');
  const temp = w.temperature != null ? `${Math.round(w.temperature)}°C` : '';
  const rh = w.humidity != null ? t(`, kelembapan ${Math.round(w.humidity)}%`, `, humidity ${Math.round(w.humidity)}%`) : '';
  const rain =
    w.rain24hMm >= 1
      ? t(
          ` Hujan diperkirakan ${w.rain24hMm.toFixed(1)} mm dalam 24 jam.`,
          ` Rain of ${w.rain24hMm.toFixed(1)} mm is expected over 24 hours.`,
        )
      : t(' Hujan berarti tidak diperkirakan dalam 24 jam.', ' No significant rain is expected in 24 hours.');
  return t(
    `Cuaca ${w.description.toLowerCase()} ${temp}${rh}.${rain}`,
    `Weather: ${w.description.toLowerCase()} ${temp}${rh}.${rain}`,
  );
}

function hotspotSentence(c: AiContext): string {
  const h = c.hotspots;
  const aq = c.airQuality;
  const parts: string[] = [];
  if (h) {
    if (h.nearestKm == null)
      parts.push(t('Tidak ada titik panas satelit dalam radius 150 km', 'No satellite hotspots within 150 km'));
    else
      parts.push(
        t(
          `${h.within50km} titik panas satelit dalam 50 km (terdekat ±${h.nearestKm} km${h.upwind ? `, ${h.upwind} searah angin` : ''})`,
          `${h.within50km} satellite hotspot${h.within50km === 1 ? '' : 's'} within 50 km (nearest ±${h.nearestKm} km${h.upwind ? `, ${h.upwind} upwind` : ''})`,
        ),
      );
  } else parts.push(t('Data titik panas tidak tersedia', 'Hotspot data unavailable'));
  if (aq?.pm25 != null) parts.push(t(`PM2.5 sekitar ${Math.round(aq.pm25)} µg/m³`, `PM2.5 around ${Math.round(aq.pm25)} µg/m³`));
  return `${parts.join('; ')}.`;
}

/** Profile labels arrive in either language — match both. */
function tagsFrom(c: AiContext): ActionTag[] {
  const p = c.profile;
  const tags: ActionTag[] = [];
  if (/motor/i.test(p.transport)) tags.push('motorcycle');
  if (/jalan|walk/i.test(p.transport)) tags.push('walking');
  if (/mobil|^car$/i.test(p.transport)) tags.push('car');
  if (/umum|public/i.test(p.transport)) tags.push('public');
  if (
    /luar ruang|outdoor worker/i.test(p.occupation) ||
    /tinggi|high/i.test(p.exposure) ||
    /dominan luar|mostly outdoor/i.test(p.activity)
  )
    tags.push('outdoor');
  if (/pelajar|mahasiswa|student/i.test(p.occupation)) tags.push('student');
  if (/pedagang|trader|vendor/i.test(p.occupation)) tags.push('merchant');
  if (/kantor|office/i.test(p.occupation)) tags.push('office');
  if ((c.family?.length ?? 0) > 1) tags.push('family');
  return tags;
}

const pickText = (c: AiContext, phase: 'now' | 'hours' | 'worsen', n: number) =>
  selectActions(levels(c), tagsFrom(c), phase, n).map((a) => a.text);

/* ── Tasks ───────────────────────────────────────────────────────────────── */

function brief(c: AiContext): BriefOutput {
  const loc = c.risk.location;
  const per = c.risk.personal;
  const primary = loc.primaryHazard;
  const calm = RANK[loc.level] <= 1;
  const headline = calm
    ? t(`Kondisi relatif tenang di ${c.location.name} hari ini`, `Relatively calm conditions in ${c.location.name} today`)
    : t(`Waspada ${HZ(primary)} di ${c.location.name}`, `Watch out for ${HZ(primary)} in ${c.location.name}`);
  const summary = t(
    `Siaga Score lokasi ${loc.score}/100 (${LEVEL(loc.level)}), dipicu terutama oleh ${HZ(primary)}: ${c.risk.hazards[primary].headline} ` +
      `Untuk profil Anda sebagai ${personaPhrase(c)}, skor personal ${per.score}/100 (${LEVEL(per.level)}).${modeNote(c)}`,
    `Location Siaga Score ${loc.score}/100 (${LEVEL(loc.level)}), driven mainly by ${HZ(primary)}: ${c.risk.hazards[primary].headline} ` +
      `For your profile as a ${personaPhrase(c)}, your personal score is ${per.score}/100 (${LEVEL(per.level)}).${modeNote(c)}`,
  );
  const keyPoints = [weatherSentence(c), hotspotSentence(c)];
  keyPoints.push(
    c.officialWarnings.length
      ? t(`Peringatan resmi BMKG aktif: ${c.officialWarnings[0]}.`, `Active official BMKG warning: ${c.officialWarnings[0]}.`)
      : c.earthquake
        ? t(
            `Gempa M${c.earthquake.magnitude} tercatat ±${c.earthquake.distanceKm} km dari lokasi (${c.earthquake.region}).`,
            `An M${c.earthquake.magnitude} earthquake was recorded ±${c.earthquake.distanceKm} km from the location (${c.earthquake.region}).`,
          )
        : t(
            'Tidak ada peringatan dini cuaca BMKG untuk provinsi Anda saat ini.',
            'There is no BMKG weather early warning for your province right now.',
          ),
  );
  const next =
    pickText(c, 'now', 1)[0] ??
    t('Pantau pembaruan resmi BMKG & BPBD setempat', 'Monitor official BMKG & local BPBD updates');
  return { headline, summary, keyPoints, nextAction: next };
}

const IMPACT_TEXT: Record<Hazard, (c: AiContext, tags: ActionTag[]) => string> = {
  smoke: (c, tg) =>
    tg.includes('motorcycle') || tg.includes('walking')
      ? t(
          `Perjalanan ${tg.includes('motorcycle') ? 'bermotor' : 'berjalan kaki'} membuat Anda terpapar udara luar secara langsung; ${c.airQuality?.pm25 != null ? `PM2.5 ±${Math.round(c.airQuality.pm25)} µg/m³` : 'kualitas udara'} dapat mengiritasi mata & saluran napas, dan jarak pandang bisa menurun.`,
          `Travelling ${tg.includes('motorcycle') ? 'by motorcycle' : 'on foot'} exposes you directly to outdoor air; ${c.airQuality?.pm25 != null ? `PM2.5 of ±${Math.round(c.airQuality.pm25)} µg/m³` : 'the air quality'} can irritate your eyes & airways, and visibility may drop.`,
        )
      : tg.includes('outdoor')
        ? t(
            'Paparan asap berjam-jam saat bekerja di luar ruang meningkatkan beban pernapasan dan kelelahan.',
            'Hours of smoke exposure while working outdoors increases breathing strain and fatigue.',
          )
        : t(
            'Asap dapat masuk ke dalam ruangan bila ventilasi terbuka; kelompok rentan di rumah perlu diperhatikan.',
            'Smoke can get indoors if vents are open; vulnerable people at home need extra attention.',
          ),
  fire: (c) =>
    c.hotspots?.nearestKm != null
      ? t(
          `Titik panas terdeteksi ±${c.hotspots.nearestKm} km dari lokasi. Ini deteksi termal satelit, bukan konfirmasi kebakaran, namun menandakan potensi aktivitas api dan asap di sekitar.`,
          `A hotspot was detected ±${c.hotspots.nearestKm} km from the location. This is a satellite thermal detection, not a confirmed fire, but it signals potential fire activity and smoke nearby.`,
        )
      : t(
          'Tidak ada titik panas dekat; risiko langsung kebakaran rendah, tetap hindari pembakaran terbuka.',
          'No nearby hotspots; direct fire risk is low, but still avoid open burning.',
        ),
  flood: (c, tg) => {
    const rain = c.weather?.rain24hMm ?? 0;
    const commute =
      tg.includes('motorcycle') || tg.includes('car') || tg.includes('public') || tg.includes('walking');
    if (rain < 20 && !c.officialWarnings.length)
      return commute
        ? t(
            `Hujan ringan (±${rain.toFixed(0)} mm/24 jam) kecil kemungkinan memicu banjir, tetapi jalan bisa licin dan genangan kecil dapat muncul di titik rendah rute Anda.`,
            `Light rain (±${rain.toFixed(0)} mm/24 h) is unlikely to cause flooding, but roads may be slippery and small puddles can form at low points on your route.`,
          )
        : t(
            'Hujan ringan kecil kemungkinan memicu banjir; tetap pastikan saluran air di sekitar rumah lancar.',
            'Light rain is unlikely to cause flooding; still make sure the drains around your home are clear.',
          );
    return commute
      ? t(
          `Hujan ±${rain.toFixed(0)} mm/24 jam berpotensi menimbulkan genangan di rute perjalanan, memperlambat lalu lintas, dan membahayakan pengendara di jalan rendah.`,
          `Rain of ±${rain.toFixed(0)} mm/24 h may cause waterlogging along your route, slow traffic, and endanger riders on low-lying roads.`,
        )
      : t(
          'Genangan dapat muncul di area rendah sekitar rumah dan mengganggu aktivitas harian.',
          'Waterlogging may appear in low areas around your home and disrupt daily activities.',
        );
  },
  weather: (c, tg) =>
    (c.weather?.thunderstormHours ?? 0) > 0
      ? t(
          `Potensi petir ${c.weather!.thunderstormHours} jam ke depan berbahaya bagi aktivitas di area terbuka${tg.includes('motorcycle') ? ' dan saat berkendara motor' : ''}.`,
          `Possible lightning over the next ${c.weather!.thunderstormHours} h is dangerous for activities in open areas${tg.includes('motorcycle') ? ' and while riding a motorcycle' : ''}.`,
        )
      : t(
          'Kondisi cuaca dapat berubah cepat; angin kencang & hujan lokal bisa mengganggu aktivitas luar ruang.',
          'Weather can change quickly; strong winds & local showers may disrupt outdoor activities.',
        ),
};

function impact(c: AiContext): ImpactOutput {
  const tags = tagsFrom(c);
  const lv = levels(c);
  const ranked = [...HAZARDS].sort(
    (a, b) => c.risk.hazards[b].personalScore - c.risk.hazards[a].personalScore,
  );
  const relevant = ranked.filter((h) => RANK[lv[h]] >= 1 && c.risk.hazards[h].available).slice(0, 3);
  const list = relevant.length ? relevant : ranked.slice(0, 1);
  const impacts = list.map((h) => {
    const advice = ACTIONS.filter((a) => a.hazard === h && RANK[lv[h]] >= RANK[a.minLevel]).sort(
      (a, b) =>
        Number(!!b.tags?.some((tag) => tags.includes(tag))) - Number(!!a.tags?.some((tag) => tags.includes(tag))),
    )[0];
    return {
      hazard: h,
      impact: IMPACT_TEXT[h](c, tags),
      advice:
        advice?.text ??
        t('Pantau perkembangan kondisi dari sumber resmi.', 'Monitor developments from official sources.'),
    };
  });
  const per = c.risk.personal;
  const mod = per.modifier;
  const rel =
    mod > 1.02
      ? t(`±${Math.round((mod - 1) * 100)}% lebih tinggi`, `±${Math.round((mod - 1) * 100)}% higher`)
      : mod < 0.98
        ? t(`±${Math.round((1 - mod) * 100)}% lebih rendah`, `±${Math.round((1 - mod) * 100)}% lower`)
        : t('setara', 'about the same');
  return {
    headline:
      RANK[per.level] >= 3
        ? t(
            `Dampak personal ${LEVEL(per.level).toLowerCase()}: sesuaikan aktivitas hari ini`,
            `${LEVEL(per.level)} personal impact: adjust today's activities`,
          )
        : RANK[per.level] === 2
          ? t('Perlu penyesuaian kecil pada aktivitas Anda', 'Your activities need small adjustments')
          : t('Dampak personal rendah untuk aktivitas Anda', 'Low personal impact on your activities'),
    summary: t(
      `Sebagai ${personaPhrase(c)}, paparan Anda ${rel} dibanding rata-rata penduduk di lokasi yang sama. ` +
        `Skor personal Anda ${per.score}/100 (${LEVEL(per.level)}) dengan faktor utama ${HZ(per.primaryHazard)}.${modeNote(c)}`,
      `As a ${personaPhrase(c)}, your exposure is ${rel} compared with the average resident at the same location. ` +
        `Your personal score is ${per.score}/100 (${LEVEL(per.level)}), driven mainly by ${HZ(per.primaryHazard)}.${modeNote(c)}`,
    ),
    impacts,
    timing: c.saferOutdoorWindows.length
      ? t(
          `Waktu yang relatif lebih aman untuk aktivitas luar ruang: ${c.saferOutdoorWindows.join(and())} WIB. Hindari jam dengan hujan lebat, petir, atau asap pekat.`,
          `Relatively safer times for outdoor activities: ${c.saferOutdoorWindows.join(and())} WIB. Avoid hours with heavy rain, lightning, or thick smoke.`,
        )
      : t(
          'Belum ada jendela waktu yang jelas lebih aman; batasi aktivitas luar ruang seperlunya.',
          'There is no clearly safer time window yet; limit outdoor activities to what is necessary.',
        ),
    watchFor: [
      ...(lv.smoke !== 'safe'
        ? [t('Bau asap menyengat, mata perih, atau jarak pandang turun', 'Strong smoke smell, stinging eyes, or dropping visibility')]
        : []),
      ...(lv.flood !== 'safe'
        ? [t('Air naik di saluran/jalan dan hujan deras >1 jam', 'Water rising in drains/roads and heavy rain lasting >1 hour')]
        : []),
      ...(lv.weather !== 'safe'
        ? [t('Awan gelap, kilat, dan angin kencang mendadak', 'Dark clouds, lightning, and sudden strong winds')]
        : []),
      t('Pembaruan peringatan dini dari BMKG/BPBD', 'Early-warning updates from BMKG/BPBD'),
    ].slice(0, 4),
  };
}

function actionPlan(c: AiContext): ActionPlanOutput {
  const p = c.risk.personal;
  const now = pickText(c, 'now', 4);
  const hours = pickText(c, 'hours', 4);
  const worsen = pickText(c, 'worsen', 4);
  // Top up to at least two steps from the fallback list, never repeating a step.
  const ensure = (arr: string[], fallback: string[]) => {
    const unique = [...new Set(arr)];
    if (unique.length >= 2) return unique;
    return [...new Set([...unique, ...fallback])].slice(0, 2);
  };
  return {
    title:
      RANK[p.level] >= 2
        ? t(
            `Rencana aksi: ${HZ_TITLE(p.primaryHazard)} — ${c.location.name}`,
            `Action plan: ${HZ_TITLE(p.primaryHazard)} — ${c.location.name}`,
          )
        : t(`Rencana kesiapsiagaan harian — ${c.location.name}`, `Daily preparedness plan — ${c.location.name}`),
    summary: t(
      `Disusun untuk ${personaPhrase(c)} dengan skor personal ${p.score}/100 (${LEVEL(p.level)}).${modeNote(c)}`,
      `Prepared for a ${personaPhrase(c)} with a personal score of ${p.score}/100 (${LEVEL(p.level)}).${modeNote(c)}`,
    ),
    rightNow: ensure(now, [
      t('Pantau pembaruan resmi BMKG & BPBD setempat', 'Monitor official BMKG & local BPBD updates'),
      t('Simpan nomor darurat 112 di ponsel', 'Save the emergency number 112 on your phone'),
    ]),
    nextHours: ensure(hours, [
      t('Cek kembali SiagaAI dalam 3 jam untuk pembaruan kondisi', 'Check SiagaAI again within 3 hours for updated conditions'),
      t('Periksa kesiapan Tas Siaga Bencana', 'Check that your Disaster Go-Bag is ready'),
    ]),
    ifWorsens: ensure(worsen, [
      t('Ikuti arahan resmi BPBD/aparat; hubungi 112 bila dalam bahaya', 'Follow official BPBD/authority instructions; call 112 if in danger'),
      t('Utamakan keselamatan anggota keluarga yang rentan', 'Prioritise the safety of vulnerable family members'),
    ]),
    officialNote: t(
      'SiagaAI adalah alat bantu keputusan. Selalu utamakan informasi & instruksi resmi BMKG, BNPB, dan BPBD setempat.',
      'SiagaAI is a decision-support tool. Always prioritise official information & instructions from BMKG, BNPB, and your local BPBD.',
    ),
  };
}

const isKid = (age: string) => /^(balita|anak|toddler|child)$/i.test(age);
const isElder = (age: string) => /^(lansia|older adult|elderly)$/i.test(age);

function familyPlan(c: AiContext): FamilyPlanOutput {
  const lv = levels(c);
  const primary = c.risk.location.primaryHazard;
  const members = (c.family ?? []).map((m) => {
    const advice: string[] = [];
    if (isKid(m.ageGroup)) {
      if (RANK[lv.smoke] >= 2)
        advice.push(
          t(
            'Batasi bermain di luar; tetap di ruangan tertutup saat asap pekat',
            'Limit outdoor play; stay in closed rooms when smoke is thick',
          ),
        );
      if (RANK[lv.flood] >= 2)
        advice.push(
          t(
            'Pastikan selalu dalam pengawasan; jauhkan dari genangan & saluran air',
            'Keep them supervised at all times; away from floodwater & drains',
          ),
        );
      advice.push(
        t(
          'Siapkan kebutuhan khusus anak (susu, popok, obat) di Tas Siaga',
          "Pack the child's special needs (milk, diapers, medicine) in the Go-Bag",
        ),
      );
    } else if (isElder(m.ageGroup)) {
      if (RANK[lv.smoke] >= 1)
        advice.push(
          t('Kurangi aktivitas luar & sediakan masker yang nyaman', 'Reduce outdoor activity & provide a comfortable mask'),
        );
      if (RANK[lv.weather] >= 2)
        advice.push(t('Pastikan cukup minum dan hindari terik siang', 'Make sure they drink enough and avoid the midday sun'));
      advice.push(
        t(
          'Siapkan obat rutin & rencana pendampingan saat evakuasi',
          'Prepare routine medication & an escort plan for evacuation',
        ),
      );
    } else {
      if (m.priority !== 'normal')
        advice.push(t(`Waspadai ${HZ(primary)} saat beraktivitas di luar`, `Watch out for ${HZ(primary)} when outdoors`));
      advice.push(
        t(
          'Bantu memantau informasi resmi & kondisi anggota keluarga lain',
          'Help monitor official information & other family members',
        ),
      );
    }
    return { name: m.name, advice: advice.slice(0, 3) };
  });
  const high = (c.family ?? []).filter((m) => m.priority === 'high').map((m) => m.name);
  return {
    summary: t(
      `${high.length ? `Prioritaskan ${high.join(', ')} karena lebih rentan pada kondisi saat ini.` : 'Tidak ada anggota keluarga dengan prioritas tinggi saat ini.'} Bahaya utama di ${c.location.name}: ${HZ(primary)}.${modeNote(c)}`,
      `${high.length ? `Prioritise ${high.join(', ')} as they are more vulnerable in current conditions.` : 'No family member is high priority right now.'} Main hazard in ${c.location.name}: ${HZ(primary)}.${modeNote(c)}`,
    ),
    members: members.length
      ? members
      : [
          {
            name: t('Anda', 'You'),
            advice: [t('Tambahkan anggota keluarga untuk rencana yang lebih personal', 'Add family members for a more personal plan')],
          },
        ],
    household: [
      ...selectActions(lv, ['family'], 'now', 2).map((a) => a.text),
      t('Sepakati titik kumpul & cara saling mengabari dengan keluarga', 'Agree on a meeting point & how to keep in touch with your family'),
      t(
        'Periksa kesiapan Tas Siaga Bencana (dokumen, obat, air, senter)',
        'Check your Disaster Go-Bag is ready (documents, medicine, water, flashlight)',
      ),
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5),
    ifWorsens: [
      t('Evakuasi lebih awal bersama anak, lansia & penyandang disabilitas', 'Evacuate early with children, older adults & people with disabilities'),
      t('Ikuti arahan resmi BPBD/aparat; hubungi 112 bila dalam bahaya', 'Follow official BPBD/authority instructions; call 112 if in danger'),
    ],
  };
}

function region(c: AiContext): RegionOutput {
  const r = c.region;
  if (!r)
    return {
      headline: t('Data regional tidak tersedia', 'Regional data unavailable'),
      summary: t('Pilih provinsi pada peta untuk melihat ringkasan.', 'Select a province on the map to see a summary.'),
      outlook: t('Pantau informasi resmi BMKG.', 'Monitor official BMKG information.'),
    };
  const trend =
    r.trend === 'increasing'
      ? t('meningkat', 'increasing')
      : r.trend === 'decreasing'
        ? t('menurun', 'decreasing')
        : t('relatif stabil', 'relatively stable');
  return {
    headline:
      r.hotspots24h > 20
        ? t(`Aktivitas titik panas tinggi di ${r.name}`, `High hotspot activity in ${r.name}`)
        : r.warnings > 0
          ? t(`Peringatan cuaca aktif di ${r.name}`, `Active weather warning in ${r.name}`)
          : t(`Kondisi ${r.name} relatif terkendali`, `Conditions in ${r.name} are relatively under control`),
    summary: t(
      `Dalam 24 jam terakhir tercatat ${r.hotspots24h} titik panas satelit (${r.hotspots7d} dalam 7 hari), tren ${trend}. ` +
        `Titik panas adalah deteksi termal satelit dan tidak selalu berarti kebakaran hutan. ${weatherSentence(c)} ` +
        `${r.warnings ? `Ada ${r.warnings} peringatan dini cuaca BMKG aktif di provinsi ini.` : 'Tidak ada peringatan dini cuaca BMKG aktif.'}${modeNote(c)}`,
      `In the last 24 hours there were ${r.hotspots24h} satellite hotspots (${r.hotspots7d} in 7 days), trend ${trend}. ` +
        `Hotspots are satellite thermal detections and do not always mean forest fires. ${weatherSentence(c)} ` +
        `${r.warnings ? `There are ${r.warnings} active BMKG weather early warnings in this province.` : 'There are no active BMKG weather early warnings.'}${modeNote(c)}`,
    ),
    outlook:
      r.trend === 'increasing'
        ? t(
            'Pantau perkembangan titik panas & kualitas udara, terutama di wilayah searah angin.',
            'Monitor hotspot developments & air quality, especially in downwind areas.',
          )
        : t(
            'Tetap pantau pembaruan BMKG; kondisi dapat berubah seiring cuaca.',
            'Keep monitoring BMKG updates; conditions can change with the weather.',
          ),
  };
}

const FOLLOW_UPS = () => [
  t('Kenapa skor saya seperti ini?', 'Why is my score like this?'),
  t('Apa yang perlu saya siapkan?', 'What should I prepare?'),
  t('Bagaimana skor dihitung?', 'How is the score calculated?'),
  t('Kapan waktu aman keluar rumah?', 'When is it safe to go out?'),
  t('Perlu pakai masker?', 'Do I need a mask?'),
];

function assistant(c: AiContext, messages: ChatMessage[] = []): AssistantOutput {
  const q = (messages.filter((m) => m.role === 'user').at(-1)?.content ?? '').toLowerCase();
  const p = c.risk.personal;
  const primary = c.risk.hazards[p.primaryHazard];
  const F = FOLLOW_UPS();
  const pick = (exclude: number) => F.filter((_, i) => i !== exclude).slice(0, 3);
  const bullets = (items: string[]) => items.map((x) => `- ${x}`).join('\n');

  if (/hitung|rumus|metod|cara kerja|algoritm|bobot|calculat|formula|method|how .*work|weight/.test(q)) {
    const w = WEIGHTS;
    return {
      answer: t(
        `Siaga Score dihitung oleh **algoritma deterministik**, bukan oleh AI:\n` +
          `- Setiap bahaya dinilai 0–100 dari indikator data nyata. Contoh karhutla: kedekatan titik panas ${w.fire.proximity * 100}%, kebaruan ${w.fire.recency * 100}%, kekeringan ${w.fire.dryness * 100}%, angin ${w.fire.wind * 100}%, PM2.5 ${w.fire.airQuality * 100}%.\n` +
          `- Skor lokasi = 85% bahaya dominan + 15% bahaya kedua.\n` +
          `- Skor personal = skor bahaya × pengubah paparan (0,8–1,3) dari pekerjaan, transportasi & aktivitas Anda. Pengubah Anda rata-rata **${p.modifier.toFixed(2)}×**.\n` +
          `Data yang tidak tersedia tidak dianggap nol — bobotnya dialihkan dan tingkat keyakinan diturunkan. Detail lengkap ada di halaman **Data & Metodologi**.`,
        `The Siaga Score is calculated by a **deterministic algorithm**, not by AI:\n` +
          `- Each hazard is scored 0–100 from real data indicators. Wildfire example: hotspot proximity ${w.fire.proximity * 100}%, recency ${w.fire.recency * 100}%, dryness ${w.fire.dryness * 100}%, wind ${w.fire.wind * 100}%, PM2.5 ${w.fire.airQuality * 100}%.\n` +
          `- Location score = 85% dominant hazard + 15% second hazard.\n` +
          `- Personal score = hazard score × exposure modifier (0.8–1.3) from your occupation, transport & activity. Your average modifier is **${p.modifier.toFixed(2)}×**.\n` +
          `Unavailable data is never treated as zero — its weight is redistributed and confidence is lowered. Full details are on the **Data & Methodology** page.`,
      ),
      followUps: pick(2),
    };
  }
  if (/kenapa|mengapa|why|tinggi|kok|high/.test(q) && /skor|score|nilai|risiko|risk/.test(q)) {
    const factors = primary.topFactors.map((f) => `${f.label} (${f.value})`).join(and());
    return {
      answer: t(
        `Skor personal Anda **${p.score}/100 (${LEVEL(p.level)})**. Penyumbang terbesar adalah **${HZ(p.primaryHazard)}** — ${primary.headline}` +
          `${factors ? ` Faktor utamanya: ${factors}.` : ''} Profil Anda sebagai ${personaPhrase(c)} memberi pengubah paparan **${p.modifier.toFixed(2)}×** terhadap skor lokasi ${c.risk.location.score}.${modeNote(c)}`,
        `Your personal score is **${p.score}/100 (${LEVEL(p.level)})**. The biggest contributor is **${HZ(p.primaryHazard)}** — ${primary.headline}` +
          `${factors ? ` Main factors: ${factors}.` : ''} Your profile as a ${personaPhrase(c)} applies an exposure modifier of **${p.modifier.toFixed(2)}×** to the location score of ${c.risk.location.score}.${modeNote(c)}`,
      ),
      followUps: pick(0),
    };
  }
  if (/motor|berangkat|kampus|perjalanan|jalan|commut|kerja besok|pergi|trip|travel|campus|ride|drive|go out/.test(q)) {
    const tips = pickText(c, 'now', 3);
    const win = c.saferOutdoorWindows.length
      ? t(
          `Waktu yang relatif lebih aman: **${c.saferOutdoorWindows.join(or())} WIB**.\n`,
          `Relatively safer times: **${c.saferOutdoorWindows.join(or())} WIB**.\n`,
        )
      : '';
    return {
      answer:
        t(`Untuk perjalanan Anda di ${c.location.name}: `, `For your trip in ${c.location.name}: `) +
        `${weatherSentence(c)} ${hotspotSentence(c)}\n${win}${bullets(tips)}`,
      followUps: pick(-1),
    };
  }
  if (/masker|asap|napas|udara|pm2|mask|smoke|breath|air/.test(q)) {
    const pm = c.airQuality?.pm25;
    const need = pm != null && pm > 35;
    return {
      answer:
        pm == null
          ? t(
              'Data kualitas udara sedang tidak tersedia, jadi saya tidak bisa menilainya. Bila tercium asap atau mata perih, gunakan masker rapat (N95/KN95) dan kurangi aktivitas luar.',
              "Air-quality data is currently unavailable, so I can't assess it. If you smell smoke or your eyes sting, wear a well-fitting mask (N95/KN95) and reduce outdoor activity.",
            )
          : t(
              `PM2.5 di sekitar Anda ±**${Math.round(pm)} µg/m³** (model CAMS). ${need ? 'Itu di atas batas sehat; **gunakan masker rapat (N95/KN95)** saat di luar dan tutup ventilasi saat asap pekat.' : 'Masih dalam rentang yang relatif baik; masker belum wajib, tetapi bawa untuk berjaga-jaga.'} Kelompok rentan (anak, lansia, penderita gangguan pernapasan) sebaiknya lebih berhati-hati.`,
              `PM2.5 around you is ±**${Math.round(pm)} µg/m³** (CAMS model). ${need ? 'That is above the healthy limit; **wear a well-fitting mask (N95/KN95)** outdoors and close vents when smoke is thick.' : "It's still in a relatively good range; a mask isn't required yet, but bring one just in case."} Vulnerable groups (children, older adults, people with respiratory conditions) should take extra care.`,
            ),
      followUps: pick(4),
    };
  }
  if (/siap|persiap|bawa|tas|bekal|perlu apa|prepar|bring|bag|pack|need/.test(q)) {
    return {
      answer: t(
        `Yang perlu Anda siapkan sekarang:\n${bullets(pickText(c, 'now', 3))}\nUntuk beberapa jam ke depan:\n${bullets(pickText(c, 'hours', 2))}\nBuat versi lengkap yang bisa dicentang di menu **Rencana Aksi**.`,
        `What to prepare right now:\n${bullets(pickText(c, 'now', 3))}\nFor the next few hours:\n${bullets(pickText(c, 'hours', 2))}\nCreate a full checkable version in the **Action Plan** menu.`,
      ),
      followUps: pick(1),
    };
  }
  if (/kapan|nanti|cek lagi|jam berapa|waktu aman|when|what time|safe time|check again/.test(q)) {
    return {
      answer: t(
        `${c.saferOutdoorWindows.length ? `Jendela waktu yang relatif lebih aman hari ini: **${c.saferOutdoorWindows.join(and())} WIB**.` : 'Belum terlihat jendela waktu yang jelas lebih aman.'} Data cuaca diperbarui per jam, titik panas satelit beberapa kali sehari, dan peringatan BMKG bisa terbit kapan saja — cek kembali dalam **2–3 jam** atau saat kondisi berubah.`,
        `${c.saferOutdoorWindows.length ? `Relatively safer time windows today: **${c.saferOutdoorWindows.join(and())} WIB**.` : 'No clearly safer time window is visible yet.'} Weather data updates hourly, satellite hotspots several times a day, and BMKG warnings can be issued at any time — check again in **2–3 hours** or when conditions change.`,
      ),
      followUps: pick(3),
    };
  }
  if (/anak|lansia|keluarga|orang tua|nenek|kakek|bayi|child|kid|elder|family|parent|baby|grand/.test(q)) {
    const list = bullets(selectActions(levels(c), ['family', 'child', 'elderly'], undefined, 3).map((a) => a.text));
    return {
      answer: t(
        `Anak-anak dan lansia lebih rentan terhadap asap, panas, dan banjir. Saat ini bahaya utama adalah **${HZ(c.risk.location.primaryHazard)}**.\n${list}\nTambahkan anggota keluarga di menu **Keluarga** untuk mendapat ringkasan risiko masing-masing.`,
        `Children and older adults are more vulnerable to smoke, heat, and floods. The main hazard right now is **${HZ(c.risk.location.primaryHazard)}**.\n${list}\nAdd family members in the **Family** menu to get each person's risk summary.`,
      ),
      followUps: pick(-1),
    };
  }
  if (/banjir|hujan|genang|flood|rain/.test(q)) {
    const f = c.risk.hazards.flood;
    return {
      answer:
        t(`Potensi banjir: **${f.score}/100 (${LEVEL(f.level)})** — `, `Flood potential: **${f.score}/100 (${LEVEL(f.level)})** — `) +
        `${f.headline}${c.officialWarnings.length ? t(` Peringatan BMKG aktif: ${c.officialWarnings[0]}.`, ` Active BMKG warning: ${c.officialWarnings[0]}.`) : ''}\n${bullets(pickText(c, 'now', 2))}`,
      followUps: pick(-1),
    };
  }
  if (/titik panas|hotspot|karhutla|kebakar|api|fire|wildfire/.test(q)) {
    return {
      answer: t(
        `${hotspotSentence(c)} Ingat: **titik panas adalah deteksi termal satelit (NASA FIRMS), bukan konfirmasi kebakaran** — bisa juga berasal dari pembakaran terkendali atau sumber panas industri. Jika melihat api atau asap baru, laporkan ke Damkar **113** atau BPBD.`,
        `${hotspotSentence(c)} Remember: **a hotspot is a satellite thermal detection (NASA FIRMS), not a confirmed fire** — it may also come from controlled burning or industrial heat sources. If you see new fire or smoke, report it to the Fire Department **113** or BPBD.`,
      ),
      followUps: pick(-1),
    };
  }
  if (/gempa|tsunami|earthquake|quake/.test(q)) {
    return {
      answer: c.earthquake
        ? t(
            `Gempa terbaru terdekat: **M${c.earthquake.magnitude}** di ${c.earthquake.region}, ±${c.earthquake.distanceKm} km dari lokasi Anda (sumber BMKG). SiagaAI menampilkan informasi gempa tetapi tidak memprediksinya. Saat gempa: **lindungi kepala, jauhi kaca, keluar ke area terbuka** setelah guncangan berhenti.`,
            `Nearest recent earthquake: **M${c.earthquake.magnitude}** in ${c.earthquake.region}, ±${c.earthquake.distanceKm} km from you (source: BMKG). SiagaAI shows earthquake information but does not predict them. During a quake: **protect your head, stay away from glass, move to an open area** once the shaking stops.`,
          )
        : t(
            'Tidak ada gempa signifikan dalam radius 500 km dari data BMKG terbaru. Gempa tidak dapat diprediksi; kenali jalur evakuasi dan titik kumpul di sekitar Anda.',
            'No significant earthquake within 500 km in the latest BMKG data. Earthquakes cannot be predicted; know the evacuation routes and meeting points around you.',
          ),
      followUps: pick(-1),
    };
  }
  if (/darurat|nomor|telepon|hubungi|tolong|emergency|number|phone|call|help/.test(q)) {
    const list = EMERGENCY_CONTACTS.slice(0, 5)
      .map((e) => `- **${e.number}** — ${e.label}`)
      .join('\n');
    return {
      answer: t(
        `Nomor darurat penting:\n${list}\nDalam keadaan darurat, hubungi **112** (gratis, 24 jam).`,
        `Important emergency numbers:\n${list}\nIn an emergency, call **112** (free, 24 hours).`,
      ),
      followUps: pick(-1),
    };
  }
  return {
    answer: t(
      `Ringkasan untuk ${c.location.name}: skor personal **${p.score}/100 (${LEVEL(p.level)})**, bahaya utama ${HZ(p.primaryHazard)}. ${weatherSentence(c)} ${hotspotSentence(c)}${modeNote(c)}\nSaya bisa menjelaskan skor, waktu aman beraktivitas, persiapan, atau kondisi keluarga Anda.`,
      `Summary for ${c.location.name}: personal score **${p.score}/100 (${LEVEL(p.level)})**, main hazard ${HZ(p.primaryHazard)}. ${weatherSentence(c)} ${hotspotSentence(c)}${modeNote(c)}\nI can explain your score, safe times for activities, preparations, or your family's situation.`,
    ),
    followUps: F.slice(0, 3),
  };
}

export function localReason<T extends AiTask>(
  task: T,
  context: AiContext,
  messages?: ChatMessage[],
): AiOutputMap[T] {
  L = context.language ?? getLang();
  // Shared data modules (preparedness actions, contacts) resolve via the global runtime.
  const ui = getLang();
  if (ui !== L) setRuntimeLang(L);
  try {
    const map: { [K in AiTask]: () => AiOutputMap[K] } = {
      brief: () => brief(context),
      impact: () => impact(context),
      'action-plan': () => actionPlan(context),
      'family-plan': () => familyPlan(context),
      region: () => region(context),
      assistant: () => assistant(context, messages),
    };
    return map[task]() as AiOutputMap[T];
  } finally {
    if (ui !== L) setRuntimeLang(ui);
  }
}
