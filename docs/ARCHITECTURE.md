# Arsitektur Sistem & User Flow

## 1. Arsitektur tingkat tinggi

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SiagaAI React PWA (Vite)                           │
│  pages/ ─ features/ ─ components/ui (shadcn-style, Radix) ─ MapLibre ─ Charts │
│  TanStack Query (cache, retry, offline-first) · Zustand (persist, privasi)    │
│  Service Worker (Workbox): app shell, basemap cache, live data NetworkFirst   │
└───────┬───────────────────────────┬───────────────────────────┬──────────────┘
        │ langsung (CORS)           │ /api/* (Edge)             │ supabase-js
        ▼                           ▼                           ▼
 BMKG prakiraan adm4        hotspots → NASA FIRMS        Auth · Postgres (RLS)
 BMKG TEWS gempa            alerts   → BMKG Nowcast RSS  Storage · Realtime
 Open-Meteo / CAMS / GloFAS ai       → Gemini│Groq│OpenRouter
 Nominatim / Open-Meteo Geo health
```

## 2. Alur data → risiko → AI

```text
services/weather   ─┐
services/hazards   ─┼─► features/risk/engine/signals.ts   (normalisasi & proximity, arah angin, PIP provinsi)
services/geo       ─┘            │
                                 ▼
                     hazards.ts (4 skor bahaya, redistribusi bobot, confidence)
                                 │
                     assess.ts (komposit lokasi) ── exposure.ts (pengubah personal)
                                 │                         │
                     timing.ts (indeks per jam)   family.ts (risiko per anggota)
                                 │
                     services/ai/context.ts  →  AiContext (JSON minimal-privasi + guidance)
                                 │
                     services/ai/client.ts   →  /api/ai (LLM)  ⟶  validateOutput()
                                 └──────────────► local-reasoner.ts (fallback deterministik)
```

## 3. Strategi ketahanan (graceful degradation)

| Kegagalan | Perilaku |
|---|---|
| BMKG adm4 tidak ada / gagal | Open-Meteo dipakai, dan atribusi sumber berubah |
| Open-Meteo gagal, BMKG berhasil | Seri per jam diturunkan dari slot 3 jam BMKG |
| Proxy FIRMS gagal | Snapshot FIRMS asli dibundel dan berlabel **Snapshot** + waktu ambil |
| Nowcast BMKG gagal | Faktor peringatan "tidak tersedia", bobot dialihkan, dan banner error tampil di Alert Center |
| CAMS / GloFAS gagal | Indikator "tidak tersedia", tingkat keyakinan turun |
| LLM tanpa kunci / error / skema invalid | Local Reasoner mengambil alih dengan alasan yang ditampilkan |
| Offline | Data cache berlabel "Offline", rencana aksi & tas siaga tetap tersedia |
| WebGL tidak tersedia | Pesan ramah, sementara data risiko tetap tersedia di dashboard |

## 4. User flow

```text
Landing ──► "Cek Lokasi Saya" (GPS, izin) ──► Dashboard
   │                 └─ ditolak → cari kota manual / Jelajahi wilayah / Skenario
   └──► "Jelajahi Siaga Map" ──► klik provinsi ──► Ringkasan regional ──► Jelaskan dengan AI
                                                                    └──► Analisis ibu kota
Dashboard ──► Kartu bahaya ──► Risiko Saya (faktor & bobot, ubah profil)
          ──► "Apa artinya bagi saya?" ──► Dampak personal (AI) ──► Rencana Aksi (AI, checklist, offline)
          ──► Tanya SiagaAI (asisten kontekstual)
          ──► Keluarga ──► Rencana keluarga (AI)
          ──► Komunitas (login) ──► Laporan berlabel "belum terverifikasi"
          ──► Pusat peringatan (BMKG + indikatif)
```

## 5. Navigasi responsif

| Perangkat | Pola |
|---|---|
| Desktop ≥ 1200 px | Sidebar 260 px, dashboard multi-kolom, panel provinsi di samping peta |
| Tablet 768–1199 px | Sidebar otomatis terciut (ikon + tooltip) dan bisa diperluas |
| Mobile < 768 px | Bottom navigation (Beranda, Peta, Risiko, Aksi, Profil), kartu satu kolom, panel provinsi sebagai *bottom sheet*, target sentuh ≥ 44 px |
