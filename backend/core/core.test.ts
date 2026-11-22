import { describe, expect, it } from "vitest";
import { validateOutput, validateRequest } from "../../ai/contracts.ts";
import { buildPrompt, SYSTEM_PROMPT } from "../../ai/prompts.ts";
import { extractJson } from "./ai-gateway.ts";
import { parseIndoDate, parseNowcastRss } from "./alerts.ts";
import { parseFirmsCsv } from "./hotspots.ts";
import { rateLimit } from "./http.ts";

describe("BMKG nowcast parser", () => {
  const rss = `<?xml version="1.0"?><rss><channel><lastBuildDate>Sun, 22 Nov 2026 02:30:21 +0000</lastBuildDate>
    <item><title>Hujan Lebat disertai Petir di Sumatera Utara</title>
    <link>https://www.bmkg.go.id/alerts/nowcast/id/CSU20261122001_alert.xml</link>
    <description>Hujan lebat disertai petir akan terjadi pada 22 November 2026, 09:40 WIB di sebagian wilayah Sumatera Utara, khususnya di AEK KUASAN, AIR BATU dan MEDANG DERAS. Kondisi ini berpotensi menimbulkan banjir lokal.
    Kondisi diperkirakan dapat berlangsung hingga 22 November 2026, 12:40 WIB.</description>
    <pubDate>Sun, 22 Nov 2026 02:30:00 +0000</pubDate></item></channel></rss>`;

  it("extracts province, areas, hazard and validity", () => {
    const { warnings, publishedAt } = parseNowcastRss(rss);
    expect(publishedAt).toBe("2026-11-22T02:30:21.000Z");
    expect(warnings).toHaveLength(1);
    const w = warnings[0];
    expect(w.id).toBe("CSU20261122001");
    expect(w.province).toBe("Sumatera Utara");
    expect(w.hazard).toBe("storm");
    expect(w.areas).toContain("AIR BATU");
    expect(w.expiresAt).toBe("2026-11-22T05:40:00.000Z");
  });

  it("parses Indonesian dates in WIB/WITA/WIT", () => {
    expect(parseIndoDate("22 November 2026, 12:40 WIB")).toBe(
      "2026-11-22T05:40:00.000Z",
    );
    expect(parseIndoDate("1 Desember 2026, 08:00 WITA")).toBe(
      "2026-12-01T00:00:00.000Z",
    );
    expect(parseIndoDate("tanggal tidak valid")).toBeNull();
  });
});

describe("NASA FIRMS CSV parser", () => {
  it("keeps only detections inside the Indonesian bounding box", () => {
    const csv = [
      "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight",
      "-2.5,114.1,340,0.4,0.4,2026-11-21,0545,N20,nominal,2.0NRT,300,12.34,D",
      "14.5,121.0,330,0.4,0.4,2026-11-21,0545,N20,high,2.0NRT,300,5,D",
    ].join("\n");
    const rows = parseFirmsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual([
      -2.5,
      114.1,
      "2026-11-21T05:45",
      "N20",
      "n",
      12.3,
      "D",
      null,
    ]);
  });
});

describe("AI gateway guards", () => {
  it("extracts JSON even when wrapped in code fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson("no json here")).toBeNull();
  });

  it("rejects malformed requests and unknown tasks", () => {
    expect(validateRequest({ task: "hack", context: {} }).ok).toBe(false);
    expect(validateRequest({ task: "brief", context: {} }).ok).toBe(false);
    const ctx = {
      location: { name: "Bengkulu", lat: -3.8, lon: 102.3 },
      risk: {},
    };
    expect(validateRequest({ task: "assistant", context: ctx }).ok).toBe(false);
    expect(
      validateRequest({
        task: "assistant",
        context: ctx,
        messages: [{ role: "user", content: "Halo" }],
      }).ok,
    ).toBe(true);
  });

  it("validates model output against the task schema", () => {
    expect(validateOutput("brief", { headline: "x" })).toBeNull();
    expect(
      validateOutput("action-plan", {
        title: "Rencana",
        summary: "Ringkas",
        rightNow: ["a", "b"],
        nextHours: ["c", "d"],
        ifWorsens: ["e", "f"],
        officialNote: "Ikuti BMKG",
      }),
    ).not.toBeNull();
  });

  it("keeps the no-fabrication rule in the system prompt and puts context last", () => {
    expect(SYSTEM_PROMPT).toMatch(/Jangan pernah mengarang/);
    const p = buildPrompt("assistant", { location: { name: "X" } } as never, [
      { role: "user", content: "Kenapa?" },
    ]);
    expect(p.messages.at(-1)).toEqual({ role: "user", content: "Kenapa?" });
  });

  it("rate-limits bursts per key", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
  });
});
