/**
 * NASA FIRMS proxy — normalises VIIRS active-fire detections over Indonesia.
 *
 * FIRMS public NRT CSV feeds do not send CORS headers, so the browser cannot
 * read them directly. This handler fetches them server-side, filters the
 * Indonesian bounding box, de-duplicates and returns a compact payload with
 * CDN caching (30 min). Province assignment (point-in-polygon) happens client-side.
 *
 * With FIRMS_MAP_KEY set, the official Area API is used instead.
 */
import { fetchWithTimeout, json, preflight, type Env } from "./http.ts";

const BBOX = { minLat: -11.5, maxLat: 6.5, minLon: 94.5, maxLon: 141.5 };
const BASE = "https://firms.modaps.eosdis.nasa.gov";

const PUBLIC_FEEDS = [
  "noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia",
  "noaa-21-viirs-c2/csv/J2_VIIRS_C2_SouthEast_Asia",
  "suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia",
];
const AREA_SOURCES = ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT"];

export type CompactRow = [
  number,
  number,
  string,
  string,
  string,
  number,
  string,
  null,
];

export function parseFirmsCsv(csv: string): CompactRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  const col = (name: string) => header.indexOf(name);
  const iLat = col("latitude");
  const iLon = col("longitude");
  const iDate = col("acq_date");
  const iTime = col("acq_time");
  const iSat = col("satellite");
  const iConf = col("confidence");
  const iFrp = col("frp");
  const iDn = col("daynight");
  const rows: CompactRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    const lat = Number(c[iLat]);
    const lon = Number(c[iLon]);
    if (!(
      lat > BBOX.minLat &&
      lat < BBOX.maxLat &&
      lon > BBOX.minLon &&
      lon < BBOX.maxLon
    ))
      continue;
    const t = (c[iTime] ?? "").padStart(4, "0");
    rows.push([
      Math.round(lat * 1e4) / 1e4,
      Math.round(lon * 1e4) / 1e4,
      `${c[iDate]}T${t.slice(0, 2)}:${t.slice(2)}`,
      c[iSat] ?? "",
      (c[iConf] ?? "n").charAt(0).toLowerCase(),
      Math.round(Number(c[iFrp] ?? 0) * 10) / 10,
      c[iDn] ?? "D",
      null,
    ]);
  }
  return rows;
}

export async function handleHotspots(
  req: Request,
  env: Env,
): Promise<Response> {
  if (req.method === "OPTIONS") return preflight();
  const range =
    new URL(req.url).searchParams.get("range") === "24h" ? "24h" : "7d";
  const key = env.FIRMS_MAP_KEY;

  const urls = key
    ? AREA_SOURCES.map(
        (s) =>
          `${BASE}/api/area/csv/${key}/${s}/${BBOX.minLon},${BBOX.minLat},${BBOX.maxLon},${BBOX.maxLat}/${range === "24h" ? 1 : 7}`,
      )
    : PUBLIC_FEEDS.map((f) => `${BASE}/data/active_fire/${f}_${range}.csv`);

  const results = await Promise.allSettled(
    urls.map((u) =>
      fetchWithTimeout(u, {}, 25_000).then((r) =>
        r.ok ? r.text() : Promise.reject(r.status),
      ),
    ),
  );
  const ok = results.filter(
    (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
  );
  if (ok.length === 0) return json({ error: "firms_unavailable" }, 502);

  const seen = new Set<string>();
  const rows: CompactRow[] = [];
  for (const r of ok)
    for (const row of parseFirmsCsv(r.value)) {
      const id = `${row[0]},${row[1]},${row[2]}`;
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(row);
    }
  rows.sort((a, b) => a[2].localeCompare(b[2]));

  return json(
    {
      source: `NASA FIRMS VIIRS NRT (NOAA-20, NOAA-21, S-NPP)${key ? " — Area API" : ""}, ${range}`,
      fetchedAt: new Date().toISOString(),
      feeds: ok.length,
      fields: [
        "lat",
        "lon",
        "acquiredUtc",
        "satellite",
        "confidence",
        "frpMW",
        "dayNight",
        "provinceCode",
      ],
      rows,
    },
    200,
    { "cache-control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  );
}
