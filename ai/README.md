# SiagaAI — Desain Integrasi AI

Folder ini berisi **kontrak AI bersama** yang dipakai oleh frontend, gateway serverless (Vercel Edge), dan Supabase Edge Function. Kontrak ini tanpa dependensi.

| File           | Isi                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `contracts.ts` | Daftar tugas AI, bentuk konteks (`AiContext`), skema output per tugas, validator request & output |
| `prompts.ts`   | System prompt (aturan anti-fabrikasi), instruksi per tugas + skema JSON, builder pesan            |

## Prinsip: _Algorithm calculates. AI communicates._

LLM **tidak pernah** diminta menilai risiko. Siaga Risk Engine menghitung semua angka dari data nyata, kemudian AI menerima **konteks JSON terstruktur** dan hanya bertugas menjelaskan, mempersonalisasi bahasa, dan menyusun rekomendasi.

```text
Data (BMKG, FIRMS, CAMS, GloFAS) → Siaga Risk Engine → AiContext (JSON)
      → Gateway (/api/ai) → LLM (Gemini → Groq → OpenRouter) → validasi skema → UI
      ↘ gagal / tanpa kunci / offline → SiagaAI Local Reasoner (deterministik)
```

## Tugas AI

| Tugas         | Dipakai di                            | Output                                                             |
| ------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `brief`       | Dashboard: SiagaAI Brief              | headline, summary, keyPoints[3], nextAction                        |
| `impact`      | Risiko Saya: "Apa artinya bagi saya?" | headline, summary, impacts[] per bahaya, timing, watchFor[]        |
| `action-plan` | Rencana Aksi                          | title, summary, rightNow[], nextHours[], ifWorsens[], officialNote |
| `family-plan` | Keluarga                              | summary, members[] (saran per anggota), household[], ifWorsens[]   |
| `region`      | Siaga Map: panel provinsi             | headline, summary, outlook                                         |
| `assistant`   | Tanya SiagaAI                         | answer (markdown ringan), followUps[]                              |

## Guardrails

1. **Anti-fabrikasi**: semua angka hanya boleh berasal dari konteks. Dilarang menyebut skor yang berbeda.
2. **Terminologi**: "titik panas / deteksi termal", **bukan** "kebakaran terkonfirmasi".
3. **Bukan otoritas**: arahkan ke BMKG/BNPB/BPBD dan nomor 112. Tanpa saran medis spesifik.
4. **Transparansi mode data**: simulasi dan snapshot wajib disebutkan.
5. **Grounding**: konteks menyertakan `guidance`, yaitu hingga 12 aksi kesiapsiagaan relevan dari pustaka kurasi (`frontend/src/data/preparedness.ts`), dipilih berdasarkan level bahaya & profil.
6. **Output terstruktur**: format JSON (`responseMimeType` / `response_format`) divalidasi oleh `validateOutput()`. Jawaban yang tidak lolos validasi dibuang, lalu penyedia berikutnya dicoba.
7. **Keamanan gateway**:
   - validasi request (`validateRequest`);
   - payload ≤ 32 KB;
   - rate limit 24 req/menit/IP;
   - sanitasi HTML & tautan `javascript:` pada output;
   - kunci API hanya tersimpan di server.
8. **Privasi**: koordinat dibulatkan ±1 km. Tidak ada nama, email, atau data medis.

## Penyedia (gratis)

| Penyedia         | Variabel             | Model default (lalu kandidat cadangan)                                  |
| ---------------- | -------------------- | ----------------------------------------------------------------------- |
| Google Gemini    | `GEMINI_API_KEY`     | `gemini-3.5-flash` → `gemini-flash-latest` → `gemini-3.5-flash-lite`     |
| Groq             | `GROQ_API_KEY`       | `openai/gpt-oss-120b` → `qwen/qwen3.8-27b` → `openai/gpt-oss-20b`        |
| OpenRouter       | `OPENROUTER_API_KEY` | `meta-llama/llama-3.3-70b-instruct:free` → `openrouter/free`             |
| _Local Reasoner_ | —                    | `rules-v1`, berjalan di browser dan offline                             |

Variabel `*_MODEL` (opsional) selalu dicoba lebih dulu. Model yang dipensiunkan penyedia (HTTP 404) atau sedang penuh (429/503) otomatis dilewati ke kandidat berikutnya. Semua percobaan berbagi satu tenggat 22 detik (batas Vercel Edge 25 detik), dan setiap penyedia cadangan selalu mendapat jatah waktu minimal 7 detik, sehingga Gemini yang lambat tidak menghabiskan waktu Groq.

Setiap respons menampilkan nama penyedianya. Bila memakai mode cadangan, alasannya ikut ditampilkan, misalnya "Kunci LLM belum dikonfigurasi".

## Evaluasi

Uji otomatis ada di `backend/core/core.test.ts` (validator request/skema, ekstraksi JSON, rate limit, isi system prompt).

Rubrik uji manual untuk setiap prompt:

- angka sesuai konteks;
- persona yang berbeda menghasilkan saran yang berbeda;
- titik panas tidak disebut sebagai "kebakaran";
- skenario simulasi disebutkan;
- ada rujukan ke otoritas resmi.
