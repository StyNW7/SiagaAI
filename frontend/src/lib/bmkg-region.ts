/**
 * BMKG TEWS writes earthquake regions in a compressed, all-caps form, e.g.
 * "43 km BaratLaut MALUKUBRTDAYA" or "130 km BaratDaya MALUKUTENGGARA".
 * This turns them into readable text: "43 km Barat Laut Maluku Barat Daya".
 * Unknown words fall back to plain title case, so nothing is ever lost.
 */

const ABBR: Record<string, string> = {
  BRT: 'Barat',
  TMR: 'Timur',
  TGH: 'Tengah',
  SLT: 'Selatan',
  SEL: 'Selatan',
  UTR: 'Utara',
  KEP: 'Kep.',
  KAB: 'Kab.',
};

const WORDS = `MALUKU SULAWESI NUSA TENGGARA TIMUR BARAT TENGAH SELATAN UTARA DAYA LAUT JAWA PAPUA KALIMANTAN
SUMATERA SUMATRA BENGKULU LAMPUNG ACEH BALI KEPULAUAN PEGUNUNGAN BINTANG MENTAWAI SIMEULUE NIAS HALMAHERA
BURU SERAM TANIMBAR ARU KEI BANDA SANGIHE TALAUD MINAHASA BOLAANG MONGONDOW SULA MOROTAI YAPEN BIAK NABIRE
JAYAPURA MANOKWARI SORONG FLORES SUMBA SUMBAWA LOMBOK ALOR KUPANG BANGGAI LUWU POSO DONGGALA PALU MAMUJU
MAJENE GORONTALO TOLITOLI BUOL KONAWE BUTON MUNA WAKATOBI KOLAKA BOMBANA GARUT CIANJUR SUKABUMI PANGANDARAN
TASIKMALAYA CILACAP PACITAN MALANG JEMBER BANYUWANGI BLITAR TRENGGALEK LUMAJANG KARANGASEM BULELENG JEMBRANA
BANTEN LEBAK PANDEGLANG SELAYAR SINJAI BONE KARO TAPANULI PESISIR MUKOMUKO KAUR SELATAN AMBON TERNATE TIDORE
KOTA PULAU TELUK BINTUNI WONDAMA FAKFAK KAIMANA MIMIKA MERAUKE ASMAT BOVEN DIGOEL MAPPI KEEROM SARMI MAMBERAMO
RAYA ENGGANO SIBERUT SIKAKAP PAGAI SIPORA SABANG BANDA PIDIE SINGKIL BITUNG KOTAMOBAGU TOMOHON MINAHASA
LABUAN BAJO MANGGARAI ENDE SIKKA LEMBATA ROTE NDAO SABU RAIJUA BELU MALAKA BIMA DOMPU`
  .split(/\s+/)
  .filter(Boolean);

const DICT = new Map<string, string>([
  ...WORDS.map((w) => [w, title(w)] as [string, string]),
  ...Object.entries(ABBR),
]);
const MAX_LEN = Math.max(...[...DICT.keys()].map((k) => k.length));

function title(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Split an all-caps run ("MALUKUBRTDAYA") into dictionary words, or null if it can't be fully split. */
function segment(token: string): string[] | null {
  const n = token.length;
  const best: (string[] | null)[] = Array(n + 1).fill(null);
  best[0] = [];
  for (let i = 0; i < n; i++) {
    const prefix = best[i];
    if (!prefix) continue;
    for (let len = Math.min(MAX_LEN, n - i); len >= 2; len--) {
      const word = DICT.get(token.slice(i, i + len));
      if (word && (!best[i + len] || best[i + len]!.length > prefix.length + 1)) {
        best[i + len] = [...prefix, word];
      }
    }
  }
  return best[n];
}

export function prettifyBmkgRegion(raw: string): string {
  if (!raw) return raw;
  return raw
    .trim()
    .split(/\s+/)
    .map((tok) => {
      // CamelCase compass words: "BaratLaut" → "Barat Laut".
      if (/^[A-Z][a-z]+[A-Z][a-z]+$/.test(tok)) return tok.replace(/([a-z])([A-Z])/g, '$1 $2');
      // All-caps place names, optionally with a trailing "-PROVINCE" part.
      if (/^[A-Z][A-Z-]{2,}$/.test(tok)) {
        return tok
          .split('-')
          .map((part) => (part ? (segment(part)?.join(' ') ?? title(part)) : part))
          .join(' - ');
      }
      return tok;
    })
    .join(' ');
}
