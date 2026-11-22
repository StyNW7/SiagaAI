# Rekap SiagaAI · 22 November 2026

Ringkasan kondisi SiagaAI saat ini, perbaikan yang sudah dilakukan, dan hal yang masih perlu kamu kerjakan.

---

## 1. Status singkat

| Area | Status |
|---|---|
| Typecheck · Lint · Build produksi | ✅ Lulus |
| Unit test | ✅ 28/28 lulus (sebelumnya 23, ditambah 5 tes baru) |
| Semua halaman (desktop + mobile 390 px) | ✅ Dicek satu per satu di browser |
| Mode gelap / terang · ID / EN | ✅ Berfungsi |
| AI (Brief, Dampak Personal, Rencana Aksi, Tanya Ara) | ✅ Berfungsi, **tetapi masih memakai Local Reasoner** karena belum ada API key (lihat bagian 3) |
| Data live (BMKG, NASA FIRMS, CAMS, GloFAS) | ✅ Live, tanpa perlu key |

**Kesimpulan:** desainnya sudah rapi, modern, dan konsisten (dark-first, maskot Ara, animasi halus). Fitur inti juga sudah bekerja. Yang masih kurang hanya **API key AI** supaya jawaban AI memakai LLM sungguhan, plus beberapa isian administratif di README.

---

## 2. Yang sudah diperbaiki dalam evaluasi ini

### Bug fungsional
| # | Masalah | Perbaikan |
|---|---|---|
| 1 | **Tombol "Tanya Ara" membuat halaman crash** ("Halaman gagal dimuat"). Penyebabnya: `scrollTo()` di Chrome terbaru mengembalikan Promise, dan Promise itu ikut di-`return` dari `useEffect` | Effect tidak lagi me-`return` hasil `scrollTo`. Asisten kembali bisa dibuka dan dipakai |
| 2 | Rencana Aksi menampilkan rencana **lokasi lama** (Jakarta Pusat) padahal lokasi aktif sudah Jakarta Utara | Muncul banner *"Rencana ini untuk X"* dengan tombol **Buat untuk [lokasi sekarang]**. Banner juga muncul untuk rencana yang berumur lebih dari 12 jam |
| 3 | Jam aman tampil terpecah: "07:00–10:00 · 10:00–13:00" | Jendela waktu yang bersambung digabung menjadi "07:00–13:00". Pengecekan tumpang-tindih kini membandingkan waktu, bukan teks ISO yang formatnya berbeda |
| 4 | Nama wilayah gempa BMKG mentah: "MALUKUBRTDAYA", "BaratLaut" | Ditambah formatter → "43 km Barat Laut Maluku Barat Daya" |
| 5 | Ara (mode offline) menyarankan "Pindahkan barang ke tempat tinggi" untuk pertanyaan perjalanan motor | Pertanyaan perjalanan kini hanya diberi tips perjalanan (rute, hujan/petir, masker) |

### Desain & UX
| # | Masalah | Perbaikan |
|---|---|---|
| 6 | Tombol mengambang "Tanya Ara" **menutupi konten**, misalnya tombol *Kirim laporan* dan teks kartu, serta **dobel** dengan kartu Tanya Ara di sidebar | Di desktop tombol disembunyikan bila kartu sidebar sudah terlihat. Di layar lain tombol **otomatis menyingkir saat scroll ke bawah** dan muncul lagi saat scroll ke atas |
| 7 | Badge "BARU SAJA" / "1 MENIT LALU" pecah jadi 2 baris | Badge kesegaran data selalu 1 baris |
| 8 | Bagian *Eksplorasi* di dashboard menyisakan area kosong besar | Dijadikan kartu: chip **Wilayah rawan** dan **Simulasi** dipisah, ditambah ilustrasi Ara "explore" |
| 9 | Teks "Bahaya 50 × pengubah 1.12" menabrak ujung busur gauge | Teks dipindah ke bawah gauge |
| 10 | Peta mobile: Indonesia terlalu kecil dan terlalu ke bawah | Padding kamera mobile disesuaikan dengan panel dan toolbar |
| 11 | Label kartu laporan warga di mobile pecah 2 baris | Di mobile cukup "Belum terverifikasi", label lengkap di layar besar |
| 12 | Tombol "Simpan Jakarta Utara…" terpotong | Diganti menjadi "Simpan lokasi ini" |

File yang diubah: `assistant.tsx`, `app-layout.tsx`, `use-misc.ts`, `timing.ts`, `action-plan-page.tsx`, `dashboard-page.tsx`, `map-page.tsx`, `community-page.tsx`, `profile-page.tsx`, `risk.tsx`, `data-state.tsx`, `local-reasoner.ts`, `bmkg-alerts.ts`. File baru: `lib/bmkg-region.ts` dan `lib/format-helpers.test.ts`.
> Catatan: Prettier juga merapikan format di beberapa file tersebut, jadi diff-nya terlihat lebih besar dari perubahan logikanya.

---

## 3. Yang perlu KAMU lakukan

### ⭐ WAJIB: API key Gemini (agar AI memakai LLM sungguhan)

Saat ini `/api/health` menampilkan `"ai": []`, artinya belum ada key. Semua fitur AI tetap jalan lewat **SiagaAI Local Reasoner** (berbasis template). Untuk lomba, jauh lebih meyakinkan kalau label penyedia di jawaban AI menunjukkan **Gemini**.

**Cara mendapatkan key (gratis):**
1. Buka **https://aistudio.google.com/apikey** dan login dengan akun Google.
2. Klik **Create API key**. Jika diminta, pilih atau buat project Google Cloud (cukup pakai default).
3. Salin key-nya (biasanya diawali `AIza…`). **Jangan dibagikan atau di-commit.**

**Pasang di lokal:**
1. Di **root repository** (folder yang berisi `vercel.json`), salin `.env.example` menjadi `.env`.
2. Isi baris ini:
   ```env
   GEMINI_API_KEY=AIza...key-kamu...
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. Hentikan dev server (Ctrl+C), lalu jalankan lagi `cd frontend && npm run dev`.
4. Buka `http://localhost:5173/api/health`. Pastikan isinya `"ai":["gemini"]`.
5. Buka Dashboard, lalu klik ikon refresh di **SiagaAI Brief**. Label di bawahnya harus berubah dari *Local Reasoner* menjadi Gemini.

**Pasang di Vercel (website live):**
1. Buka vercel.com, pilih project SiagaAI, lalu **Settings → Environment Variables**.
2. Tambahkan `GEMINI_API_KEY` (dan `GEMINI_MODEL=gemini-2.5-flash`), centang **Production** dan **Preview**.
3. Buka **Deployments → ⋯ → Redeploy**. Env var baru hanya terbaca setelah redeploy.
4. Buka `https://<url-kamu>.vercel.app/api/health` dan pastikan ada `"gemini"`.

> Kalau muncul error kuota (429) atau model tidak ditemukan, ganti `GEMINI_MODEL` ke model Flash terbaru yang tersedia di AI Studio. Aplikasi otomatis jatuh ke cadangan (Groq/OpenRouter/Local Reasoner), jadi tidak akan rusak.

### Disarankan: key cadangan (gratis, 5 menit)
Kalau Gemini kena limit saat juri mencoba, cadangan ini otomatis dipakai.
- **Groq:** https://console.groq.com/keys → login → **Create API Key** → isi `GROQ_API_KEY=` (model default `llama-3.3-70b-versatile`).
- **OpenRouter** (opsional): https://openrouter.ai/keys → **Create Key** → isi `OPENROUTER_API_KEY=`.

Tambahkan juga di Vercel seperti langkah Gemini, lalu redeploy.

### Opsional: NASA FIRMS MAP_KEY
Tanpa key pun titik panas sudah live (memakai feed publik). Key ini hanya membuat query per-area lebih presisi.
1. Buka https://firms.modaps.eosdis.nasa.gov/api/map_key/, masukkan email, lalu cek inbox.
2. Isi `FIRMS_MAP_KEY=` di `.env` dan di Vercel.

### Opsional: Supabase (login sungguhan, sinkron antar perangkat, laporan realtime)
Tanpa Supabase, akun disimpan di perangkat ("Akun perangkat") dan laporan warga tersimpan lokal. Untuk demo lomba ini **sudah cukup**. Kalau ingin versi penuh:
1. Buka https://supabase.com, klik **New project**, lalu catat password database.
2. Buka **Project Settings → API** dan salin **Project URL** serta **anon / publishable key**.
3. Buka **SQL Editor** dan jalankan isi file berikut **berurutan**:
   1. `backend/supabase/migrations/20261122000000_siagaai_schema.sql`
   2. `backend/supabase/migrations/20261122010000_auth_profile_trigger.sql`
   3. `backend/supabase/seed.sql` (membuat akun demo `demo@siagaai.id`)
4. Isi di `.env` dan di Vercel:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Redeploy Vercel, lalu coba **Masuk → Gunakan akun demo**.

### Wajib sebelum submit
- [ ] Isi **URL live Vercel** di README (`https://<isi-url-vercel-anda>.vercel.app`).
- [ ] Isi **nama tim & kampus** di bagian *Tim* README.
- [ ] Review lalu **commit** perubahan evaluasi ini (belum di-commit). Jangan ikut meng-commit file `.env`.
- [ ] Coba di **HP sungguhan**: buka URL live, lalu *Add to Home Screen* (PWA), cek GPS, dan cek mode offline.
- [ ] Latih alur demo 60 detik (ada di README → *Panduan cepat untuk juri*).

---

## 4. SiagaAI sekarang: gambaran lengkap

**Konsep:** *Algorithm calculates, AI communicates.* Skor risiko dihitung algoritma deterministik yang teruji. AI hanya menjelaskan dan menyusun rencana aksi.

| Halaman | Fungsi |
|---|---|
| **Beranda (landing)** | Hero + maskot Ara, peta titik panas Indonesia live, cara kerja 4 langkah, fitur, persona, SDGs, CTA |
| **Dashboard** | Siaga Score personal/lokasi, SiagaAI Brief, peta sekitar, 4 kartu bahaya, grafik cuaca 24 jam, jam aman, PM2.5, peringatan resmi, kesegaran data, eksplorasi wilayah & simulasi |
| **Siaga Map** | MapLibre: cluster titik panas, heatmap, provinsi, peringatan BMKG, cuaca, PM2.5, gempa, laporan warga; klik provinsi untuk ringkasan + penjelasan AI |
| **Risiko Saya** | "Apa artinya bagi saya?": ubah profil lalu skor berubah, rincian faktor, indeks jam aman, perbandingan 4 persona |
| **Peringatan** | Peringatan BMKG + gempa + sinyal indikatif SiagaAI dalam 4 level |
| **Rencana Aksi** | Rencana Sekarang / Beberapa jam / Jika memburuk yang bisa dicentang, dibagikan, dan dicetak; Tas Siaga; nomor darurat |
| **Keluarga** | Anggota keluarga (balita/anak/lansia), status prioritas, rencana keluarga |
| **Laporan Warga** | Lapor kejadian (foto tanpa EXIF, GPS opsional), selalu berlabel "Belum terverifikasi" |
| **Profil / Pengaturan / Metodologi** | Konteks personal, riwayat skor, tema, bahasa, ukuran teks, notifikasi, mode skenario, sumber data & bobot |
| **Tanya Ara** | Asisten chat kontekstual (paham lokasi, skor, cuaca, profil) dengan saran pertanyaan |

**Teknologi:** React 19 · TypeScript · Vite · Tailwind v4 · MapLibre · TanStack Query · Zustand · Vercel Edge Functions · Gemini/Groq/OpenRouter · Supabase (opsional) · PWA.

---

## 5. Ide lanjutan (opsional, kalau masih ada waktu)

- **Notifikasi push** sungguhan (Web Push + Supabase cron) untuk peringatan saat app tertutup.
- **Moderasi laporan warga**: tombol "laporkan spam" dan auto-hide jika banyak sanggahan.
- **Kalibrasi skor** memakai data kejadian historis (BNPB DIBI) agar bobot tidak lagi sekadar heuristik.
- **Rate limit bersama** (Upstash/Supabase) untuk `/api/ai`, karena saat ini rate limit masih per-instance.
- Rekam **video demo 60 detik** sebagai cadangan jika internet di lokasi lomba lambat.
