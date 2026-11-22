# SiagaAI — Backend

Backend SiagaAI bersifat **serverless**. Logikanya ditulis sekali di `core/` sebagai modul TypeScript yang tidak bergantung pada runtime tertentu (hanya memakai Web `Request`/`Response` + `fetch`). Modul yang sama dijalankan di tiga tempat:

| Runtime | Lokasi | Kegunaan |
|---|---|---|
| Vercel Edge Functions | `../api/*.ts` | Produksi (default) |
| Supabase Edge Functions (Deno) | `supabase/functions/*` | Alternatif gateway |
| Vite dev server | bridge di `frontend/vite.config.ts` | Pengembangan lokal (`npm run dev`) |

## Endpoint

| Endpoint | Handler | Fungsi |
|---|---|---|
| `POST /api/ai` | `core/ai-gateway.ts` | Gateway LLM yang aman: validasi, rate limit, prompt terstruktur, fallback penyedia, validasi skema |
| `GET /api/ai` | `core/ai-gateway.ts` | Status penyedia yang terkonfigurasi (tanpa membuka rahasia) |
| `GET /api/hotspots?range=7d\|24h` | `core/hotspots.ts` | Proxy NASA FIRMS: CSV VIIRS → JSON ringkas, deduplikasi, cache CDN 30 menit |
| `GET /api/alerts` | `core/alerts.ts` | Proxy BMKG Nowcast: RSS → JSON (provinsi, wilayah, jenis bahaya, masa berlaku), cache 10 menit |
| `GET /api/health` | `../api/health.ts` | Status integrasi |

## Database (Supabase)

Skema ada di `supabase/migrations/` (`…_siagaai_schema.sql` + `…_auth_profile_trigger.sql`):

- **Tabel**: `profiles`, `family_members`, `saved_locations`, `risk_snapshots`, `action_plans`, `community_reports`, `ai_conversations`.
- **RLS** aktif di semua tabel. Tabel milik pengguna hanya bisa diakses pemiliknya (`auth.uid() = user_id`).
- **Laporan komunitas**: bisa dibaca publik, insert hanya oleh pemilik dengan status `unverified`, dan konfirmasi lewat fungsi `confirm_report` (`SECURITY DEFINER`).
- **Storage**: bucket `community` (≤ 5 MB, JPEG/PNG/WebP). Unggahan hanya diizinkan ke folder `auth.uid()`.
- **Realtime**: `community_reports` dipublikasikan, sehingga feed komunitas tampil live.
- **Privasi**: koordinat riwayat dibulatkan ±1 km (`numeric(6,2)`), dan tidak ada kolom data medis.
- **Profil otomatis**: trigger `on_auth_user_created` membuat baris `profiles` untuk setiap pengguna baru di server (`SECURITY DEFINER`). Klien tidak pernah mengirim `user_id`.
- **Akun demo**: `supabase/seed.sql` (idempoten) membuat `demo@siagaai.id` di Supabase Auth beserta data contoh.

```bash
supabase link --project-ref <ref>
supabase db push
# akun demo: jalankan supabase/seed.sql di SQL Editor (lokal: supabase db reset)
supabase functions deploy siaga-ai hotspots
supabase secrets set GEMINI_API_KEY=... GROQ_API_KEY=...
```

## Tes

```bash
cd ../frontend && npm run test   # termasuk core/core.test.ts
```
