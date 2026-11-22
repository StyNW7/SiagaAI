<div align="center">

<img src="images/SiagaAI-Logo.png" alt="SiagaAI" width="120" />

# SiagaAI

### AI-Powered Personal Disaster Intelligence untuk Indonesia

**Kenali Risiko. Pahami Dampaknya. Ambil Tindakan.**
*Know the Risk. Understand the Impact. Take Action.*

IT RUSH 2026 · Web Development · Sub tema **Mitigasi Bencana dan Perubahan Iklim**

`React 19` · `TypeScript` · `Vite` · `Tailwind CSS v4` · `MapLibre GL` · `TanStack Query` · `Supabase` · `Gemini / Groq` · `PWA`

</div>

---

## Daftar isi

1. [Ringkasan](#ringkasan)
2. [Masalah](#masalah)
3. [Solusi: Detect, Understand, Personalize, Act](#solusi-detect-understand-personalize-act)
4. [Fitur](#fitur)
5. [Panduan cepat untuk juri](#panduan-cepat-untuk-juri)
6. [Arsitektur](#arsitektur)
7. [Teknologi](#teknologi)
8. [Struktur repository](#struktur-repository)
9. [Instalasi & menjalankan lokal](#instalasi--menjalankan-lokal)
10. [Variabel lingkungan](#variabel-lingkungan)
11. [Deployment](#deployment)
12. [Sumber data](#sumber-data)
13. [Metodologi Siaga Score](#metodologi-siaga-score)
14. [Integrasi AI & pengungkapan AI](#integrasi-ai--pengungkapan-ai)
15. [Privasi & keamanan](#privasi--keamanan)
16. [Pengujian & kualitas kode](#pengujian--kualitas-kode)
17. [Keterbatasan](#keterbatasan)
18. [Dampak & SDGs](#dampak--sdgs)
19. [Open source & atribusi](#open-source--atribusi)
20. [Tim](#tim)

---

## Ringkasan

**SiagaAI** adalah *Progressive Web App* berbasis AI. Aplikasi ini mengubah data kebencanaan dan lingkungan Indonesia menjadi **informasi risiko yang personal, mudah dipahami, dan dapat langsung ditindaklanjuti**, berdasarkan lokasi dan konteks setiap pengguna.

Sumber datanya meliputi titik panas satelit NASA FIRMS, prakiraan dan peringatan dini BMKG, kualitas udara CAMS, serta debit sungai GloFAS.

> **SiagaAI menjembatani peringatan dini dan tindakan dini.** Sistem informasi biasa hanya menjawab *"Apa yang terjadi?"*. SiagaAI menjawab hingga *"Apa artinya bagi saya?"* dan *"Apa yang harus saya lakukan?"*.

## Masalah

Indonesia tidak kekurangan informasi kebencanaan. Masalahnya ada pada celah **Informasi → Pemahaman → Tindakan**.

Peringatan seperti *"Terdapat 24 titik panas"* atau *"Potensi hujan lebat"*:

- **teknis**: sulit dipahami masyarakat awam;
- **terfragmentasi**: tersebar di BMKG, BNPB, satelit, dan portal daerah;
- **generik**: tidak mempertimbangkan aktivitas individu, misalnya mahasiswa bermotor, pekerja luar ruang, atau keluarga dengan lansia;
- **tidak actionable**: tidak langsung menjawab apa yang harus dilakukan sekarang.

## Solusi: Detect, Understand, Personalize, Act

| Tahap | Pertanyaan | Implementasi |
|---|---|---|
| **01 Detect** | Apa yang sedang terjadi? | Agregasi data live NASA FIRMS, BMKG (prakiraan, nowcast, gempa), CAMS, GloFAS |
| **02 Understand** | Apa arti data ini? | **Siaga Risk Engine** deterministik: skor 0–100 per bahaya, transparan & teruji |
| **03 Personalize** | Apa artinya bagi saya? | Pengubah paparan dari pekerjaan, transportasi, aktivitas & kelompok usia keluarga |
| **04 Act** | Apa yang harus saya lakukan? | AI menyusun brief, dampak personal, rencana aksi & menjawab pertanyaan kontekstual |

Prinsip inti: **Algorithm calculates. AI communicates.** LLM tidak pernah menentukan skor risiko.

## Fitur

| Fitur | Keterangan |
|---|---|
| 🏠 **Siaga Dashboard** | Menjawab dalam 5 detik "Seberapa aman lokasi Anda hari ini?". Berisi Siaga Score (personal/lokasi), 4 kartu bahaya, peta lokal, SiagaAI Brief, grafik cuaca 24 jam, PM2.5, peringatan resmi, dan panel kesegaran data |
| 📍 **Smart Location** | GPS (hanya setelah izin, tidak disimpan), pencarian kota/kabupaten, lokasi tersimpan, dan preset "Jelajahi wilayah" |
| 🗺️ **Siaga Map** | MapLibre WebGL dengan 8 lapisan: titik panas (cluster), heatmap, choropleth provinsi, peringatan BMKG, cuaca kota, PM2.5, gempa, laporan komunitas. Mendukung *fly-to* Indonesia → Provinsi → Kota → GPS |
| 🧭 **Ringkasan regional** | Klik provinsi untuk melihat titik panas 24 jam / 7 hari, tren, grafik harian, cuaca ibu kota, skor risiko, peringatan BMKG, dan penjelasan AI |
| ✨ **Personal Impact Forecast** | "Apa artinya bagi saya?": dampak berbeda per profil, rincian faktor & bobot, indeks jam aman beraktivitas, dan perbandingan 4 persona |
| 📋 **AI Action Plan** | Rencana *Sekarang / Beberapa jam ke depan / Jika memburuk* yang bisa dicentang, dibagikan, dicetak, tersimpan, dan tersedia offline |
| 🎒 **Tas Siaga & nomor darurat** | Checklist Tas Siaga Bencana dan nomor 112/117/113/115/119/110/123 yang bisa langsung ditelepon |
| 👨‍👩‍👧 **Family Siaga** | Ikhtisar risiko per anggota keluarga (balita, anak, lansia, paparan tinggi), status prioritas, dan rencana aksi keluarga |
| 💬 **Asisten SiagaAI** | Tombol mengambang dengan chat kontekstual yang memahami lokasi, skor, cuaca, dan profil, dilengkapi pertanyaan saran dan *follow-up* |
| 📣 **Community Signal** | Laporan warga (jenis kejadian, foto terkompresi tanpa EXIF, GPS, deskripsi). Selalu berlabel **"Belum terverifikasi"**, realtime dengan Supabase |
| 🔔 **Alert Center** | Peringatan dini BMKG, gempa BMKG, dan sinyal indikatif SiagaAI dalam 4 level (Kritis/Peringatan/Waspada/Informasi). Warna selalu disertai ikon dan teks |
| 🧪 **Mode skenario** | Simulasi puncak karhutla (Palangka Raya) dan hujan ekstrem (Jakarta) agar juri bisa menguji kondisi berisiko tinggi kapan saja. Selalu ditandai banner simulasi |
| 📶 **PWA offline-first** | Bisa diinstal, app shell & basemap di-cache, data lama selalu berlabel, dan notifikasi lokal untuk peringatan penting |
| 📚 **Data & Metodologi** | Sumber, bobot (dirender langsung dari kode engine), peran AI, privasi, batasan, dan SDGs |

## Panduan cepat untuk juri

> **Live:** `https://<isi-url-vercel-anda>.vercel.app` · **Akun demo:** `demo@siagaai.id` / `SiagaAI2026!`
> (Login **tidak wajib**. Semua fitur inti berjalan dalam mode tamu.)

Perjalanan 60 detik yang direkomendasikan:

1. Buka beranda, lalu klik **Cek Lokasi Saya** (atau **Jelajahi Siaga Map**).
2. Di Dashboard, lihat Siaga Score, kartu bahaya, peta sekitar, dan **SiagaAI Brief**.
3. Klik **Ubah lokasi**, lalu pilih wilayah di *Jelajahi wilayah* atau **Skenario: Puncak Karhutla**.
4. Buka **Risiko Saya** dan klik **Apa artinya bagi saya?**. Ganti transportasi menjadi *Mobil* dan lihat skornya berubah.
5. Buka **Rencana Aksi** dan klik **Buat Rencana Aksi Saya**.
6. Buka **Siaga Map**, lalu klik provinsi dan pilih **Jelaskan dengan AI**.
7. Klik **Tanya SiagaAI** dan coba *"Saya naik motor ke kampus jam 8 besok. Bagaimana?"*.

## Arsitektur

```text
                         ┌────────────────────────────┐
                         │      SiagaAI React PWA      │
                         │ Router · TanStack Query ·   │
                         │ Zustand · MapLibre · Charts │
                         └──────────────┬─────────────┘
         CORS-enabled langsung          │            Serverless (Vercel Edge / Supabase Edge)
  ┌──────────────────────────────┐      │      ┌───────────────────────────────────────────┐
  │ BMKG prakiraan & gempa        │◄─────┼─────►│ /api/hotspots  → NASA FIRMS (CSV → JSON)  │
  │ Open-Meteo / CAMS / GloFAS    │      │      │ /api/alerts    → BMKG Nowcast (RSS → JSON)│
  │ Nominatim / Open-Meteo Geo    │      │      │ /api/ai        → Gemini │ Groq │ OpenRouter│
  └──────────────────────────────┘      │      └───────────────────────────────────────────┘
                                        ▼
                      ┌──────────────────────────────────┐
                      │ Normalisasi sinyal (signals.ts)  │
                      │ Siaga Risk Engine (hazards.ts)   │  ← deterministik, unit-tested
                      │ Pengubah paparan (exposure.ts)   │
                      └──────────────┬───────────────────┘
                                     │ konteks JSON terstruktur (privasi-minimal)
                                     ▼
                 ┌─────────────────────────────────────────────┐
                 │ AI Gateway → LLM → validasi skema JSON        │
                 │ fallback: SiagaAI Local Reasoner (offline)    │
                 └──────────────┬──────────────────────────────┘
                                ▼
         Brief · Dampak personal · Rencana aksi · Rencana keluarga · Q&A
                                │
                   Supabase (opsional): Auth · Postgres + RLS · Storage · Realtime
```

Penjelasan lengkap ada di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | React 19, Vite 7, TypeScript 5.9 (strict) |
| Styling & UI | Tailwind CSS v4, komponen pola **shadcn/ui** di atas **Radix UI**, Lucide icons, Inter Variable |
| Peta | **MapLibre GL JS** (WebGL), basemap OpenFreeMap / CARTO Positron |
| Grafik | Recharts |
| State | TanStack Query (server state & caching), Zustand (client state, persist) |
| Form & validasi | React Hook Form + Zod |
| Backend | Serverless Edge Functions (Vercel `/api`, alternatif **Supabase Edge Functions**) |
| Database & Auth | **Supabase**: PostgreSQL + Row Level Security, Auth, Storage, Realtime |
| AI | Google **Gemini** (utama), **Groq** / **OpenRouter** (cadangan), Local Reasoner (offline) |
| PWA | vite-plugin-pwa (Workbox) |
| Kualitas | ESLint (typescript-eslint), Prettier, Vitest |

## Struktur repository

```text
.
├── frontend/                 # React PWA
│   ├── public/               # brand/, icons/, data/ (batas provinsi, snapshot FIRMS)
│   ├── scripts/              # generate-icons.mjs (aset brand dari images/)
│   └── src/
│       ├── app/              # router, error boundary
│       ├── components/       # ui/ (shadcn-style), common/ (brand, risk, data-state…)
│       ├── features/         # risk/engine (Siaga Risk Engine + tests), map, ai, alerts,
│       │                     # community, location, profile, charts, auth
│       ├── hooks/            # use-siaga-data, use-ai, use-geolocation, …
│       ├── layouts/          # app-layout (sidebar, bottom nav, topbar)
│       ├── pages/            # landing, dashboard, map, risk, action plan, family, …
│       ├── services/         # weather (BMKG, Open-Meteo), hazards (FIRMS, BMKG),
│       │                     # geo, ai (client, context, local reasoner), supabase
│       ├── stores/           # Zustand stores
│       ├── data/             # kota, skenario, pustaka kesiapsiagaan, siluet Nusantara
│       └── types/            # tipe domain
├── backend/
│   ├── core/                 # handler runtime-agnostic: ai-gateway, hotspots, alerts (+ tests)
│   └── supabase/             # migrations (schema + RLS), Edge Functions, config
├── ai/                       # kontrak AI (skema, validator) & pustaka prompt + README desain AI
├── api/                      # Vercel Edge Functions (wrapper tipis ke backend/core)
├── docs/                     # guidebook, template proposal, METHODOLOGY, ARCHITECTURE,
│                             # PROPOSAL-CONTENT, DEMO-SCRIPT
├── images/                   # logo resmi SiagaAI
└── vercel.json
```

## Instalasi & menjalankan lokal

Prasyarat: **Node.js ≥ 20**.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (frontend + /api serverless lewat bridge Vite)
```

Perintah lain:

```bash
npm run build        # typecheck + build produksi (dist/)
npm run preview      # pratinjau build
npm run test         # Vitest: risk engine + backend parsers + AI guards
npm run lint         # ESLint
node scripts/generate-icons.mjs   # regenerasi logo, favicon, ikon PWA & OG image
```

Tanpa kunci API apa pun, aplikasi **tetap berfungsi penuh**:
- AI memakai Local Reasoner;
- titik panas memakai feed publik FIRMS (atau snapshot berlabel);
- akun memakai mode perangkat.

## Variabel lingkungan

Salin `.env.example` menjadi `.env` di root repository. **Jangan pernah commit `.env`** (sudah diabaikan lewat `.gitignore`).

| Variabel | Lokasi | Keterangan |
|---|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Server | LLM utama. Kunci gratis: [Google AI Studio](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY`, `GROQ_MODEL` | Server | Cadangan. Kunci gratis: [console.groq.com](https://console.groq.com/keys) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Server | Cadangan kedua (model `:free`) |
| `FIRMS_MAP_KEY` | Server | Opsional: NASA FIRMS Area API |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Client | Opsional: Auth, sinkronisasi, realtime (anon key memang publik, dilindungi RLS) |
| `VITE_AI_ENDPOINT` | Client | Opsional: arahkan AI ke Supabase Edge Function |

## Deployment

**Vercel** (direkomendasikan, gratis):

1. Import repository ke Vercel dengan **Root Directory = root repo**. `vercel.json` sudah mengatur install/build/output dan Edge Functions di `api/`.
2. Tambahkan variabel lingkungan di *Project Settings → Environment Variables* (minimal `GEMINI_API_KEY` agar AI memakai LLM).
3. Deploy, lalu buka `/api/health` untuk memastikan integrasi aktif.

**Supabase** (opsional):

```bash
cd backend
supabase link --project-ref <ref>
supabase db push                                   # schema + RLS + storage + realtime
supabase functions deploy siaga-ai hotspots       # gateway alternatif
supabase secrets set GEMINI_API_KEY=...
```

Setelah itu isi `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` di Vercel, lalu buat akun demo `demo@siagaai.id` di *Authentication → Users*.

Akun demo tetap bisa masuk walaupun belum dibuat di Supabase. Dalam kondisi itu, aplikasi otomatis memakai sesi perangkat.

## Sumber data

| Sumber | Data | Akses |
|---|---|---|
| **BMKG** Prakiraan Cuaca (adm4) | Suhu, RH, angin, kondisi, per 3 jam | Langsung (CORS) |
| **BMKG** Peringatan Dini Cuaca (Nowcast/CAP) | Peringatan per provinsi + masa berlaku | `/api/alerts` |
| **BMKG** TEWS | Gempa terbaru & M5+ terkini | Langsung |
| **NASA FIRMS** VIIRS NRT (NOAA-20/21, S-NPP) | Titik panas 7 hari, keyakinan, FRP | `/api/hotspots` + snapshot berlabel |
| **Open-Meteo** Forecast | Hujan & peluang per jam, hembusan, jarak pandang | Langsung |
| **CAMS** via Open-Meteo | PM2.5, PM10, US AQI (model) | Langsung |
| **GloFAS** via Open-Meteo | Debit sungai 30 hari + prakiraan 7 hari | Langsung |
| Batas provinsi (ans-4175, MIT) | 34 provinsi, disederhanakan (Douglas–Peucker) | Statis |

Data BMKG mewajibkan atribusi **"Sumber: BMKG"**, dan atribusi ini ditampilkan di aplikasi. Kode `adm4` BMKG untuk 42 kota telah diverifikasi langsung ke API BMKG.

## Metodologi Siaga Score

Skor dihitung dalam enam langkah:

1. **Skor per bahaya (0–100)**: Σ (indikator ternormalisasi × bobot).
   - **Karhutla**: kedekatan & kepadatan titik panas 30%, kebaruan 20%, kekeringan 15%, angin 15%, PM2.5 20%.
   - **Asap**: PM2.5 50%, titik panas searah angin 30%, jarak pandang 20%.
   - **Banjir**: hujan 24 jam 35% (kelas BMKG), intensitas puncak 25%, anomali debit GloFAS 20%, peringatan BMKG 20%.
   - **Cuaca ekstrem**: petir 35%, hembusan 25%, peluang hujan 20%, panas 20%.
2. **Data tidak tersedia ≠ nol.** Bobotnya dialihkan secara proporsional dan tingkat keyakinan diturunkan. Bila cakupan data < 40%, bahaya tidak dinilai.
3. **Skor lokasi** = 85% bahaya dominan + 15% bahaya kedua.
4. **Skor personal** = skor bahaya × pengubah paparan (dibatasi **0,8–1,3**), dihitung spesifik per bahaya.
5. **Kategori**: 0–20 Aman · 21–40 Rendah · 41–60 Sedang · 61–80 Tinggi · 81–100 Kritis.
6. Ditampilkan sebagai **Indicative Siaga Score**: alat bantu keputusan, **bukan peringatan resmi**.

Detail lengkap ada di [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) dan di halaman *Data & Metodologi* (yang dirender langsung dari konstanta engine).

## Integrasi AI & pengungkapan AI

**AI di dalam produk** (lihat [`ai/README.md`](ai/README.md)):

- **Tugas AI**: SiagaAI Brief, Personal Impact Forecast, AI Action Plan, Family Action Plan, penjelasan regional, dan asisten kontekstual.
- **Alur keamanan**: PWA → gateway serverless → LLM. Kunci API hanya tersimpan di server.
- **Pengaman**: validasi request, batas ukuran payload, rate limit per IP, prompt terstruktur, output JSON yang divalidasi skema, sanitasi output, dan fallback antar-penyedia.
- **Konteks minimal**: hanya konteks terstruktur yang dikirim, dengan koordinat dibulatkan sekitar 1 km dan tanpa identitas pengguna.
- **Grounding**: rekomendasi berlandaskan pustaka aksi kesiapsiagaan yang mengacu panduan BNPB/BMKG.
- **Local Reasoner**: generator bahasa deterministik sebagai cadangan, supaya fitur AI tetap berfungsi tanpa kunci atau saat offline. Penyedia selalu ditampilkan pada setiap respons.

**AI coding assistant**: sesuai ketentuan IT RUSH 2026, pengembangan repository ini dibantu **Claude Code (Anthropic)** untuk penulisan kode, dokumentasi, dan pengujian. Seluruh keputusan produk, review, dan pengujian menjadi tanggung jawab tim.

## Privasi & keamanan

- GPS hanya diakses setelah izin dan **tidak disimpan** kecuali pengguna memilih *Simpan lokasi*.
- Riwayat dan laporan menyimpan koordinat yang dibulatkan.
- Tidak ada data medis yang diminta. Profil keluarga hanya berisi kelompok usia dan paparan.
- Foto laporan dikompres dan metadata EXIF/GPS-nya dihapus di perangkat. Teks laporan disanitasi.
- Supabase memakai **Row Level Security** di semua tabel milik pengguna. Unggahan dibatasi ke folder milik pengguna, dan konfirmasi laporan dilakukan lewat fungsi `SECURITY DEFINER`.
- Header keamanan (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`) diatur di `vercel.json`.

## Pengujian & kualitas kode

```bash
cd frontend
npm run test     # 23 tes: kurva & kategori, redistribusi bobot, skenario karhutla/banjir,
                 # batas pengubah, kedekatan & arah angin titik panas, pencocokan provinsi,
                 # parser RSS BMKG & CSV FIRMS, validasi request/skema AI, rate limit
npm run lint && npm run typecheck
```

Pengujian manual yang sudah dilakukan:
- seluruh halaman pada lebar 285–1440 px, tanpa overflow horizontal;
- semua state data (loading, sukses, error, snapshot, offline, simulasi);
- aksesibilitas: *skip link*, fokus terlihat, ARIA, dan risiko selalu ditampilkan dengan warna + ikon + teks.

## Keterbatasan

- Titik panas adalah **deteksi termal**, bukan kebakaran terkonfirmasi. Sumbernya bisa juga *flare* industri atau pembakaran terkendali.
- PM2.5 berasal dari **model** CAMS (resolusi sekitar 40 km), bukan sensor lokal.
- GloFAS beresolusi sekitar 5 km. Model banjir tidak mencakup drainase kota maupun rob.
- Peta memakai 34 batas provinsi (pra-pemekaran Papua 2022). Provinsi baru dipetakan ke provinsi induknya.
- Bobot dan ambang skor adalah **heuristik produk terdokumentasi** yang belum dikalibrasi dengan data kejadian historis.
- Rate limiting gateway bersifat per-instance. Untuk produksi skala besar perlu *store* bersama.

## Dampak & SDGs

| SDG | Kontribusi |
|---|---|
| **13.1** Penanganan Perubahan Iklim | Ketahanan & kapasitas adaptasi terhadap karhutla, banjir, dan cuaca ekstrem |
| **11.5** Kota Berkelanjutan | Mengurangi dampak bencana melalui tindakan dini yang personal |
| **3.9 & 3.d** Kesehatan | Mengurangi paparan asap/polusi dan memperkuat peringatan dini risiko kesehatan |
| **15** Ekosistem Daratan | Pemantauan titik panas & pelaporan dini karhutla |

Juga selaras dengan **Kerangka Sendai** (Prioritas 1 & 4) dan inisiatif PBB **Early Warnings for All**.

## Open source & atribusi

React, React Router, Vite, TypeScript, Tailwind CSS, Radix UI, shadcn/ui (pola komponen), Lucide, MapLibre GL JS, Recharts, TanStack Query, Zustand, React Hook Form, Zod, Sonner, vite-plugin-pwa/Workbox, Supabase JS, @fontsource Inter, class-variance-authority, clsx, tailwind-merge, sharp, Vitest, ESLint, Prettier.

Data: **BMKG**, **NASA FIRMS**, **Open-Meteo** (CC BY 4.0) dengan **Copernicus CAMS & GloFAS**, **© OpenStreetMap contributors**, OpenFreeMap/CARTO, ans-4175/peta-indonesia-geojson (MIT), Nominatim, BigDataCloud.

## Tim

| Peran | Nama | Universitas |
|---|---|---|
| Ketua | _isi nama_ | _isi kampus_ |
| Anggota | _isi nama_ | _isi kampus_ |

---

<div align="center">
<sub>SiagaAI adalah platform pendukung keputusan dan <b>tidak menggantikan peringatan atau instruksi resmi</b> dari BMKG, BNPB, BPBD, dan aparat berwenang. Dalam keadaan darurat, hubungi <b>112</b>.</sub>
</div>
