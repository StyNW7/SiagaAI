/**
 * SiagaAI Local Reasoner — deterministic natural-language generator used when
 * the LLM gateway is not configured, offline, rate-limited or returns an
 * invalid answer. It consumes exactly the same AiContext as the LLM and returns
 * the same schemas, so the UI is identical and the app never breaks.
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

const LEVEL: Record<Level, string> = {
  safe: 'Aman',
  low: 'Rendah',
  moderate: 'Sedang',
  high: 'Tinggi',
  critical: 'Kritis',
};
const HZ: Record<Hazard, string> = {
  flood: 'potensi banjir',
  fire: 'aktivitas titik panas',
  smoke: 'potensi paparan asap',
  weather: 'cuaca ekstrem',
};
const HZ_TITLE: Record<Hazard, string> = {
  flood: 'Banjir',
  fire: 'Karhutla',
  smoke: 'Asap',
  weather: 'Cuaca ekstrem',
};
const RANK: Record<Level, number> = { safe: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const HAZARDS: Hazard[] = ['flood', 'fire', 'smoke', 'weather'];

const levels = (c: AiContext) =>
  Object.fromEntries(HAZARDS.map((h) => [h, levelOf(c.risk.hazards[h].personalScore)])) as Record<
    Hazard,
    Level
  >;
const levelOf = (s: number): Level =>
  s <= 20 ? 'safe' : s <= 40 ? 'low' : s <= 60 ? 'moderate' : s <= 80 ? 'high' : 'critical';

function modeNote(c: AiContext): string {
  if (c.dataMode === 'scenario')
    return ` (Mode skenario: ${c.scenarioName ?? 'simulasi'} — bukan kondisi aktual.)`;
  if (c.dataMode === 'snapshot' || c.dataMode === 'cached')
    return ' (Sebagian data berasal dari snapshot, bukan real-time.)';
  return '';
}

function personaPhrase(c: AiContext) {
  return `${c.profile.occupation.toLowerCase()} yang ${c.profile.transport === 'Mobil' ? 'bermobil' : `menggunakan ${c.profile.transport.toLowerCase()}`}`;
}

function weatherSentence(c: AiContext): string {
  const w = c.weather;
  if (!w) return 'Data cuaca sedang tidak tersedia.';
  const t = w.temperature != null ? `${Math.round(w.temperature)}°C` : '';
  const rh = w.humidity != null ? `, kelembapan ${Math.round(w.humidity)}%` : '';
  const rain =
    w.rain24hMm >= 1
      ? ` Hujan diperkirakan ${w.rain24hMm.toFixed(1)} mm dalam 24 jam.`
      : ' Hujan berarti tidak diperkirakan dalam 24 jam.';
  return `Cuaca ${w.description.toLowerCase()} ${t}${rh}.${rain}`;
}

function hotspotSentence(c: AiContext): string {
  const h = c.hotspots;
  const aq = c.airQuality;
  const parts: string[] = [];
  if (h) {
    if (h.nearestKm == null) parts.push('Tidak ada titik panas satelit dalam radius 150 km');
    else
      parts.push(
        `${h.within50km} titik panas satelit dalam 50 km (terdekat ±${h.nearestKm} km${h.upwind ? `, ${h.upwind} searah angin` : ''})`,
      );
  } else parts.push('Data titik panas tidak tersedia');
  if (aq?.pm25 != null) parts.push(`PM2.5 sekitar ${Math.round(aq.pm25)} µg/m³`);
  return `${parts.join('; ')}.`;
}

function tagsFrom(c: AiContext): ActionTag[] {
  const p = c.profile;
  const t: ActionTag[] = [];
  if (/motor/i.test(p.transport)) t.push('motorcycle');
  if (/jalan/i.test(p.transport)) t.push('walking');
  if (/mobil/i.test(p.transport)) t.push('car');
  if (/umum/i.test(p.transport)) t.push('public');
  if (/luar ruang/i.test(p.occupation) || /tinggi/i.test(p.exposure) || /dominan luar/i.test(p.activity))
    t.push('outdoor');
  if (/pelajar|mahasiswa/i.test(p.occupation)) t.push('student');
  if (/pedagang/i.test(p.occupation)) t.push('merchant');
  if (/kantor/i.test(p.occupation)) t.push('office');
  if ((c.family?.length ?? 0) > 1) t.push('family');
  return t;
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
    ? `Kondisi relatif tenang di ${c.location.name} hari ini`
    : `Waspada ${HZ[primary]} di ${c.location.name}`;
  const summary =
    `Siaga Score lokasi ${loc.score}/100 (${LEVEL[loc.level]}), dipicu terutama oleh ${HZ[primary]}: ${c.risk.hazards[primary].headline} ` +
    `Untuk profil Anda sebagai ${personaPhrase(c)}, skor personal ${per.score}/100 (${LEVEL[per.level]}).${modeNote(c)}`;
  const keyPoints = [weatherSentence(c), hotspotSentence(c)];
  keyPoints.push(
    c.officialWarnings.length
      ? `Peringatan resmi BMKG aktif: ${c.officialWarnings[0]}.`
      : c.earthquake
        ? `Gempa M${c.earthquake.magnitude} tercatat ±${c.earthquake.distanceKm} km dari lokasi (${c.earthquake.region}).`
        : 'Tidak ada peringatan dini cuaca BMKG untuk provinsi Anda saat ini.',
  );
  const next = pickText(c, 'now', 1)[0] ?? 'Pantau pembaruan resmi BMKG & BPBD setempat';
  return { headline, summary, keyPoints, nextAction: next };
}

const IMPACT_TEXT: Record<Hazard, (c: AiContext, tags: ActionTag[]) => string> = {
  smoke: (c, t) =>
    t.includes('motorcycle') || t.includes('walking')
      ? `Perjalanan ${t.includes('motorcycle') ? 'bermotor' : 'berjalan kaki'} membuat Anda terpapar udara luar secara langsung; ${c.airQuality?.pm25 != null ? `PM2.5 ±${Math.round(c.airQuality.pm25)} µg/m³` : 'kualitas udara'} dapat mengiritasi mata & saluran napas, dan jarak pandang bisa menurun.`
      : t.includes('outdoor')
        ? 'Paparan asap berjam-jam saat bekerja di luar ruang meningkatkan beban pernapasan dan kelelahan.'
        : 'Asap dapat masuk ke dalam ruangan bila ventilasi terbuka; kelompok rentan di rumah perlu diperhatikan.',
  fire: (c) =>
    c.hotspots?.nearestKm != null
      ? `Titik panas terdeteksi ±${c.hotspots.nearestKm} km dari lokasi. Ini deteksi termal satelit, bukan konfirmasi kebakaran, namun menandakan potensi aktivitas api dan asap di sekitar.`
      : 'Tidak ada titik panas dekat; risiko langsung kebakaran rendah, tetap hindari pembakaran terbuka.',
  flood: (c, t) => {
    const rain = c.weather?.rain24hMm ?? 0;
    const commute =
      t.includes('motorcycle') || t.includes('car') || t.includes('public') || t.includes('walking');
    if (rain < 20 && !c.officialWarnings.length)
      return commute
        ? `Hujan ringan (±${rain.toFixed(0)} mm/24 jam) kecil kemungkinan memicu banjir, tetapi jalan bisa licin dan genangan kecil dapat muncul di titik rendah rute Anda.`
        : 'Hujan ringan kecil kemungkinan memicu banjir; tetap pastikan saluran air di sekitar rumah lancar.';
    return commute
      ? `Hujan ±${rain.toFixed(0)} mm/24 jam berpotensi menimbulkan genangan di rute perjalanan, memperlambat lalu lintas, dan membahayakan pengendara di jalan rendah.`
      : 'Genangan dapat muncul di area rendah sekitar rumah dan mengganggu aktivitas harian.';
  },
  weather: (c, t) =>
    (c.weather?.thunderstormHours ?? 0) > 0
      ? `Potensi petir ${c.weather!.thunderstormHours} jam ke depan berbahaya bagi aktivitas di area terbuka${t.includes('motorcycle') ? ' dan saat berkendara motor' : ''}.`
      : 'Kondisi cuaca dapat berubah cepat; angin kencang & hujan lokal bisa mengganggu aktivitas luar ruang.',
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
        Number(!!b.tags?.some((t) => tags.includes(t))) - Number(!!a.tags?.some((t) => tags.includes(t))),
    )[0];
    return {
      hazard: h,
      impact: IMPACT_TEXT[h](c, tags),
      advice: advice?.text ?? 'Pantau perkembangan kondisi dari sumber resmi.',
    };
  });
  const per = c.risk.personal;
  const mod = per.modifier;
  return {
    headline:
      RANK[per.level] >= 3
        ? `Dampak personal ${LEVEL[per.level].toLowerCase()}: sesuaikan aktivitas hari ini`
        : RANK[per.level] === 2
          ? 'Perlu penyesuaian kecil pada aktivitas Anda'
          : 'Dampak personal rendah untuk aktivitas Anda',
    summary:
      `Sebagai ${personaPhrase(c)}, paparan Anda ${mod > 1.02 ? `±${Math.round((mod - 1) * 100)}% lebih tinggi` : mod < 0.98 ? `±${Math.round((1 - mod) * 100)}% lebih rendah` : 'setara'} dibanding rata-rata penduduk di lokasi yang sama. ` +
      `Skor personal Anda ${per.score}/100 (${LEVEL[per.level]}) dengan faktor utama ${HZ[per.primaryHazard]}.${modeNote(c)}`,
    impacts,
    timing: c.saferOutdoorWindows.length
      ? `Waktu yang relatif lebih aman untuk aktivitas luar ruang: ${c.saferOutdoorWindows.join(' dan ')} WIB. Hindari jam dengan hujan lebat, petir, atau asap pekat.`
      : 'Belum ada jendela waktu yang jelas lebih aman; batasi aktivitas luar ruang seperlunya.',
    watchFor: [
      ...(lv.smoke !== 'safe' ? ['Bau asap menyengat, mata perih, atau jarak pandang turun'] : []),
      ...(lv.flood !== 'safe' ? ['Air naik di saluran/jalan dan hujan deras >1 jam'] : []),
      ...(lv.weather !== 'safe' ? ['Awan gelap, kilat, dan angin kencang mendadak'] : []),
      'Pembaruan peringatan dini dari BMKG/BPBD',
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
        ? `Rencana aksi: ${HZ_TITLE[p.primaryHazard]} — ${c.location.name}`
        : `Rencana kesiapsiagaan harian — ${c.location.name}`,
    summary: `Disusun untuk ${personaPhrase(c)} dengan skor personal ${p.score}/100 (${LEVEL[p.level]}).${modeNote(c)}`,
    rightNow: ensure(now, [
      'Pantau pembaruan resmi BMKG & BPBD setempat',
      'Simpan nomor darurat 112 di ponsel',
    ]),
    nextHours: ensure(hours, [
      'Cek kembali SiagaAI dalam 3 jam untuk pembaruan kondisi',
      'Periksa kesiapan Tas Siaga Bencana',
    ]),
    ifWorsens: ensure(worsen, [
      'Ikuti arahan resmi BPBD/aparat; hubungi 112 bila dalam bahaya',
      'Utamakan keselamatan anggota keluarga yang rentan',
    ]),
    officialNote:
      'SiagaAI adalah alat bantu keputusan. Selalu utamakan informasi & instruksi resmi BMKG, BNPB, dan BPBD setempat.',
  };
}

function familyPlan(c: AiContext): FamilyPlanOutput {
  const lv = levels(c);
  const primary = c.risk.location.primaryHazard;
  const members = (c.family ?? []).map((m) => {
    const advice: string[] = [];
    if (m.ageGroup === 'balita' || m.ageGroup === 'anak') {
      if (RANK[lv.smoke] >= 2)
        advice.push('Batasi bermain di luar; tetap di ruangan tertutup saat asap pekat');
      if (RANK[lv.flood] >= 2)
        advice.push('Pastikan selalu dalam pengawasan; jauhkan dari genangan & saluran air');
      advice.push('Siapkan kebutuhan khusus anak (susu, popok, obat) di Tas Siaga');
    } else if (m.ageGroup === 'lansia') {
      if (RANK[lv.smoke] >= 1) advice.push('Kurangi aktivitas luar & sediakan masker yang nyaman');
      if (RANK[lv.weather] >= 2) advice.push('Pastikan cukup minum dan hindari terik siang');
      advice.push('Siapkan obat rutin & rencana pendampingan saat evakuasi');
    } else {
      if (m.priority !== 'normal') advice.push(`Waspadai ${HZ[primary]} saat beraktivitas di luar`);
      advice.push('Bantu memantau informasi resmi & kondisi anggota keluarga lain');
    }
    return { name: m.name, advice: advice.slice(0, 3) };
  });
  const high = (c.family ?? []).filter((m) => m.priority === 'high').map((m) => m.name);
  return {
    summary: `${high.length ? `Prioritaskan ${high.join(', ')} karena lebih rentan pada kondisi saat ini.` : 'Tidak ada anggota keluarga dengan prioritas tinggi saat ini.'} Bahaya utama di ${c.location.name}: ${HZ[primary]}.${modeNote(c)}`,
    members: members.length
      ? members
      : [{ name: 'Anda', advice: ['Tambahkan anggota keluarga untuk rencana yang lebih personal'] }],
    household: [
      ...selectActions(lv, ['family'], 'now', 2).map((a) => a.text),
      'Sepakati titik kumpul & cara saling mengabari dengan keluarga',
      'Periksa kesiapan Tas Siaga Bencana (dokumen, obat, air, senter)',
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5),
    ifWorsens: [
      'Evakuasi lebih awal bersama anak, lansia & penyandang disabilitas',
      'Ikuti arahan resmi BPBD/aparat; hubungi 112 bila dalam bahaya',
    ],
  };
}

function region(c: AiContext): RegionOutput {
  const r = c.region;
  if (!r)
    return {
      headline: 'Data regional tidak tersedia',
      summary: 'Pilih provinsi pada peta untuk melihat ringkasan.',
      outlook: 'Pantau informasi resmi BMKG.',
    };
  const trend =
    r.trend === 'increasing' ? 'meningkat' : r.trend === 'decreasing' ? 'menurun' : 'relatif stabil';
  return {
    headline:
      r.hotspots24h > 20
        ? `Aktivitas titik panas tinggi di ${r.name}`
        : r.warnings > 0
          ? `Peringatan cuaca aktif di ${r.name}`
          : `Kondisi ${r.name} relatif terkendali`,
    summary:
      `Dalam 24 jam terakhir tercatat ${r.hotspots24h} titik panas satelit (${r.hotspots7d} dalam 7 hari), tren ${trend}. ` +
      `Titik panas adalah deteksi termal satelit dan tidak selalu berarti kebakaran hutan. ${weatherSentence(c)} ` +
      `${r.warnings ? `Ada ${r.warnings} peringatan dini cuaca BMKG aktif di provinsi ini.` : 'Tidak ada peringatan dini cuaca BMKG aktif.'}${modeNote(c)}`,
    outlook:
      r.trend === 'increasing'
        ? 'Pantau perkembangan titik panas & kualitas udara, terutama di wilayah searah angin.'
        : 'Tetap pantau pembaruan BMKG; kondisi dapat berubah seiring cuaca.',
  };
}

const FOLLOW_UPS = [
  'Kenapa skor saya seperti ini?',
  'Apa yang perlu saya siapkan?',
  'Bagaimana skor dihitung?',
  'Kapan waktu aman keluar rumah?',
  'Perlu pakai masker?',
];

function assistant(c: AiContext, messages: ChatMessage[] = []): AssistantOutput {
  const q = (messages.filter((m) => m.role === 'user').at(-1)?.content ?? '').toLowerCase();
  const p = c.risk.personal;
  const primary = c.risk.hazards[p.primaryHazard];
  const pick = (exclude: string) => FOLLOW_UPS.filter((f) => f !== exclude).slice(0, 3);

  if (/hitung|rumus|metod|cara kerja|algoritm|bobot/.test(q)) {
    const w = WEIGHTS;
    return {
      answer:
        `Siaga Score dihitung oleh **algoritma deterministik**, bukan oleh AI:\n` +
        `- Setiap bahaya dinilai 0–100 dari indikator data nyata. Contoh karhutla: kedekatan titik panas ${w.fire.proximity * 100}%, kebaruan ${w.fire.recency * 100}%, kekeringan ${w.fire.dryness * 100}%, angin ${w.fire.wind * 100}%, PM2.5 ${w.fire.airQuality * 100}%.\n` +
        `- Skor lokasi = 85% bahaya dominan + 15% bahaya kedua.\n` +
        `- Skor personal = skor bahaya × pengubah paparan (0,8–1,3) dari pekerjaan, transportasi & aktivitas Anda. Pengubah Anda rata-rata **${p.modifier.toFixed(2)}×**.\n` +
        `Data yang tidak tersedia tidak dianggap nol — bobotnya dialihkan dan tingkat keyakinan diturunkan. Detail lengkap ada di halaman **Data & Metodologi**.`,
      followUps: pick('Bagaimana skor dihitung?'),
    };
  }
  if (/kenapa|mengapa|why|tinggi|kok/.test(q) && /skor|score|nilai|risiko/.test(q)) {
    const factors = primary.topFactors.map((f) => `${f.label} (${f.value})`).join(' dan ');
    return {
      answer:
        `Skor personal Anda **${p.score}/100 (${LEVEL[p.level]})**. Penyumbang terbesar adalah **${HZ[p.primaryHazard]}** — ${primary.headline}` +
        `${factors ? ` Faktor utamanya: ${factors}.` : ''} Profil Anda sebagai ${personaPhrase(c)} memberi pengubah paparan **${p.modifier.toFixed(2)}×** terhadap skor lokasi ${c.risk.location.score}.${modeNote(c)}`,
      followUps: pick('Kenapa skor saya seperti ini?'),
    };
  }
  if (/motor|berangkat|kampus|perjalanan|jalan|commut|kerja besok|pergi/.test(q)) {
    const tips = pickText(c, 'now', 3);
    return {
      answer:
        `Untuk perjalanan Anda di ${c.location.name}: ${weatherSentence(c)} ${hotspotSentence(c)}\n` +
        `${c.saferOutdoorWindows.length ? `Waktu yang relatif lebih aman: **${c.saferOutdoorWindows.join(' atau ')} WIB**.\n` : ''}` +
        tips.map((t) => `- ${t}`).join('\n'),
      followUps: pick(''),
    };
  }
  if (/masker|asap|napas|udara|pm2/.test(q)) {
    const pm = c.airQuality?.pm25;
    const need = pm != null && pm > 35;
    return {
      answer:
        pm == null
          ? 'Data kualitas udara sedang tidak tersedia, jadi saya tidak bisa menilainya. Bila tercium asap atau mata perih, gunakan masker rapat (N95/KN95) dan kurangi aktivitas luar.'
          : `PM2.5 di sekitar Anda ±**${Math.round(pm)} µg/m³** (model CAMS). ${need ? 'Itu di atas batas sehat; **gunakan masker rapat (N95/KN95)** saat di luar dan tutup ventilasi saat asap pekat.' : 'Masih dalam rentang yang relatif baik; masker belum wajib, tetapi bawa untuk berjaga-jaga.'} Kelompok rentan (anak, lansia, penderita gangguan pernapasan) sebaiknya lebih berhati-hati.`,
      followUps: pick('Perlu pakai masker?'),
    };
  }
  if (/siap|persiap|bawa|tas|bekal|perlu apa/.test(q)) {
    return {
      answer: `Yang perlu Anda siapkan sekarang:\n${pickText(c, 'now', 3)
        .map((t) => `- ${t}`)
        .join('\n')}\nUntuk beberapa jam ke depan:\n${pickText(c, 'hours', 2)
        .map((t) => `- ${t}`)
        .join('\n')}\nBuat versi lengkap yang bisa dicentang di menu **Rencana Aksi**.`,
      followUps: pick('Apa yang perlu saya siapkan?'),
    };
  }
  if (/kapan|nanti|cek lagi|jam berapa|waktu aman/.test(q)) {
    return {
      answer: `${c.saferOutdoorWindows.length ? `Jendela waktu yang relatif lebih aman hari ini: **${c.saferOutdoorWindows.join(' dan ')} WIB**.` : 'Belum terlihat jendela waktu yang jelas lebih aman.'} Data cuaca diperbarui per jam, titik panas satelit beberapa kali sehari, dan peringatan BMKG bisa terbit kapan saja — cek kembali dalam **2–3 jam** atau saat kondisi berubah.`,
      followUps: pick('Kapan waktu aman keluar rumah?'),
    };
  }
  if (/anak|lansia|keluarga|orang tua|nenek|kakek|bayi/.test(q)) {
    return {
      answer: `Anak-anak dan lansia lebih rentan terhadap asap, panas, dan banjir. Saat ini bahaya utama adalah **${HZ[c.risk.location.primaryHazard]}**.\n${selectActions(
        levels(c),
        ['family', 'child', 'elderly'],
        undefined,
        3,
      )
        .map((a) => `- ${a.text}`)
        .join(
          '\n',
        )}\nTambahkan anggota keluarga di menu **Keluarga** untuk mendapat ringkasan risiko masing-masing.`,
      followUps: pick(''),
    };
  }
  if (/banjir|hujan|genang/.test(q)) {
    const f = c.risk.hazards.flood;
    return {
      answer: `Potensi banjir: **${f.score}/100 (${LEVEL[f.level]})** — ${f.headline}${c.officialWarnings.length ? ` Peringatan BMKG aktif: ${c.officialWarnings[0]}.` : ''}\n${pickText(
        c,
        'now',
        2,
      )
        .map((t) => `- ${t}`)
        .join('\n')}`,
      followUps: pick(''),
    };
  }
  if (/titik panas|hotspot|karhutla|kebakar|api/.test(q)) {
    return {
      answer: `${hotspotSentence(c)} Ingat: **titik panas adalah deteksi termal satelit (NASA FIRMS), bukan konfirmasi kebakaran** — bisa juga berasal dari pembakaran terkendali atau sumber panas industri. Jika melihat api atau asap baru, laporkan ke Damkar **113** atau BPBD.`,
      followUps: pick(''),
    };
  }
  if (/gempa|tsunami/.test(q)) {
    return {
      answer: c.earthquake
        ? `Gempa terbaru terdekat: **M${c.earthquake.magnitude}** di ${c.earthquake.region}, ±${c.earthquake.distanceKm} km dari lokasi Anda (sumber BMKG). SiagaAI menampilkan informasi gempa tetapi tidak memprediksinya. Saat gempa: **lindungi kepala, jauhi kaca, keluar ke area terbuka** setelah guncangan berhenti.`
        : 'Tidak ada gempa signifikan dalam radius 500 km dari data BMKG terbaru. Gempa tidak dapat diprediksi; kenali jalur evakuasi dan titik kumpul di sekitar Anda.',
      followUps: pick(''),
    };
  }
  if (/darurat|nomor|telepon|hubungi|tolong/.test(q)) {
    return {
      answer: `Nomor darurat penting:\n${EMERGENCY_CONTACTS.slice(0, 5)
        .map((e) => `- **${e.number}** — ${e.label}`)
        .join('\n')}\nDalam keadaan darurat, hubungi **112** (gratis, 24 jam).`,
      followUps: pick(''),
    };
  }
  return {
    answer: `Ringkasan untuk ${c.location.name}: skor personal **${p.score}/100 (${LEVEL[p.level]})**, bahaya utama ${HZ[p.primaryHazard]}. ${weatherSentence(c)} ${hotspotSentence(c)}${modeNote(c)}\nSaya bisa menjelaskan skor, waktu aman beraktivitas, persiapan, atau kondisi keluarga Anda.`,
    followUps: FOLLOW_UPS.slice(0, 3),
  };
}

export function localReason<T extends AiTask>(
  task: T,
  context: AiContext,
  messages?: ChatMessage[],
): AiOutputMap[T] {
  const map: { [K in AiTask]: () => AiOutputMap[K] } = {
    brief: () => brief(context),
    impact: () => impact(context),
    'action-plan': () => actionPlan(context),
    'family-plan': () => familyPlan(context),
    region: () => region(context),
    assistant: () => assistant(context, messages),
  };
  return map[task]() as AiOutputMap[T];
}
