/**
 * BMKG Peringatan Dini Cuaca (nowcast) proxy.
 * Source: https://www.bmkg.go.id/alerts/nowcast/id/rss.xml (public domain, CAP-based).
 * Parsed server-side because the feed does not allow cross-origin reads.
 */
import { fetchWithTimeout, json, preflight } from "./http.ts";

export interface ParsedWarning {
  id: string;
  title: string;
  description: string;
  province: string | null;
  areas: string[];
  link: string;
  publishedAt: string;
  expiresAt: string | null;
  hazard: "rain" | "wind" | "storm" | "other";
}

const MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

const tag = (block: string, name: string) => {
  const m = block.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"),
  );
  return m ? decode(m[1]) : "";
};

/** "22 November 2026, 12:40 WIB" → ISO */
export function parseIndoDate(text: string): string | null {
  const m = text.match(
    /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2})[:.](\d{2})\s*(WIB|WITA|WIT)?/,
  );
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month == null) return null;
  const offset = m[6] === "WITA" ? 8 : m[6] === "WIT" ? 9 : 7;
  const utc = Date.UTC(
    Number(m[3]),
    month,
    Number(m[1]),
    Number(m[4]) - offset,
    Number(m[5]),
  );
  return new Date(utc).toISOString();
}

export function parseNowcastRss(xml: string): {
  publishedAt: string | null;
  warnings: ParsedWarning[];
} {
  const channelDate = tag(xml, "lastBuildDate") || tag(xml, "pubDate");
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const warnings = items.map((item, i): ParsedWarning => {
    const title = tag(item, "title");
    const description = tag(item, "description").replace(/\s+\n/g, "\n");
    const link = tag(item, "link");
    const pub = tag(item, "pubDate");
    const province = title.match(/\bdi\s+(.+)$/i)?.[1]?.trim() ?? null;
    const areaText =
      description.match(/khususnya di\s+([\s\S]*?)\.\s/i)?.[1] ?? "";
    const areas = areaText
      .split(/,\s*|\s+dan\s+/)
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 60);
    const until = description.match(
      /hingga\s+(\d{1,2}\s+\w+\s+\d{4},?\s+\d{1,2}[:.]\d{2}\s*(?:WIB|WITA|WIT)?)/i,
    )?.[1];
    const lower = `${title} ${description}`.toLowerCase();
    const hazard = /petir|badai/.test(lower)
      ? "storm"
      : /angin kencang/.test(lower) && !/hujan/.test(title.toLowerCase())
        ? "wind"
        : /hujan/.test(lower)
          ? "rain"
          : "other";
    return {
      id: link.match(/\/([A-Z0-9_]+)_alert\.xml/)?.[1] ?? `bmkg-${i}`,
      title,
      description,
      province,
      areas,
      link,
      publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      expiresAt: until ? parseIndoDate(until) : null,
      hazard,
    };
  });
  return {
    publishedAt: channelDate ? new Date(channelDate).toISOString() : null,
    warnings,
  };
}

export async function handleAlerts(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return preflight();
  try {
    const res = await fetchWithTimeout(
      "https://www.bmkg.go.id/alerts/nowcast/id/rss.xml",
      { headers: { accept: "application/rss+xml, application/xml" } },
      15_000,
    );
    if (!res.ok)
      return json({ error: "bmkg_unavailable", status: res.status }, 502);
    const { publishedAt, warnings } = parseNowcastRss(await res.text());
    return json(
      {
        source: "BMKG Peringatan Dini Cuaca (Nowcast)",
        fetchedAt: new Date().toISOString(),
        publishedAt,
        warnings,
      },
      200,
      { "cache-control": "public, s-maxage=600, stale-while-revalidate=1200" },
    );
  } catch {
    return json({ error: "bmkg_unavailable" }, 502);
  }
}
