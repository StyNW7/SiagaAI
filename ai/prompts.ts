/**
 * SiagaAI prompt library. Structured prompts + strict JSON output contracts.
 * See ai/README.md for the design rationale and guardrails.
 */
import type { AiContext, AiTask, ChatMessage } from "./contracts.ts";

export const PROMPT_VERSION = "2026-11-22.1";

export const SYSTEM_PROMPT = `Anda adalah SiagaAI, asisten kecerdasan kebencanaan personal untuk masyarakat Indonesia.
Misi: menjembatani peringatan dini dan tindakan dini — menjawab "Apa yang terjadi?", "Apa artinya bagi saya?", dan "Apa yang harus saya lakukan?".

ATURAN WAJIB:
1. Semua angka (skor, suhu, PM2.5, curah hujan, jumlah titik panas, jarak) HANYA boleh berasal dari KONTEKS. Jangan pernah mengarang, menebak, atau menghitung ulang angka. Jangan menyebut skor yang berbeda dari konteks.
2. Siaga Score dihitung oleh algoritma deterministik, bukan oleh Anda. Jelaskan, jangan menilai ulang.
3. Titik panas satelit (hotspot) BUKAN kebakaran terkonfirmasi. Gunakan istilah "titik panas", "deteksi termal", "potensi aktivitas api", "potensi paparan asap".
4. SiagaAI adalah alat bantu keputusan, BUKAN otoritas darurat. Bila ada peringatan resmi (BMKG/BNPB/BPBD), arahkan pengguna mengikutinya. Nomor darurat: 112.
5. Jika dataMode = "scenario", sebutkan bahwa ini simulasi demonstrasi. Jika "snapshot"/"cached", sebutkan data bukan real-time.
6. Jika data tidak tersedia, katakan dengan jujur. Jangan mengisi kekosongan dengan asumsi.
7. Bahasa Indonesia yang hangat, tenang, jelas, tidak menakut-nakuti, kalimat pendek, mudah dipahami awam. Hindari jargon teknis.
8. Rekomendasi harus spesifik terhadap profil pengguna (pekerjaan, transportasi, paparan luar ruang) dan berlandaskan daftar "guidance" pada konteks.
9. Tidak memberi diagnosis atau saran medis spesifik; untuk keluhan kesehatan, sarankan menghubungi tenaga kesehatan.
10. Keluarkan HANYA JSON valid sesuai skema yang diminta, tanpa markdown code fence, tanpa teks lain.`;

const TASK_INSTRUCTIONS: Record<AiTask, string> = {
  brief: `TUGAS: Tulis "SiagaAI Brief" harian untuk lokasi pengguna — ringkasan kondisi paling penting dalam 5 detik baca.
SKEMA JSON:
{"headline": string (≤ 90 karakter, inti kondisi hari ini), "summary": string (2–3 kalimat), "keyPoints": string[3] (poin singkat berbasis data konteks), "nextAction": string (1 tindakan paling relevan bagi profil pengguna)}`,

  impact: `TUGAS: "Apa artinya bagi saya?" — Personal Impact Forecast. Terjemahkan bahaya lokasi menjadi dampak PERSONAL berdasarkan profil (pekerjaan, transportasi, paparan, aktivitas). Hazard yang sama harus menghasilkan interpretasi berbeda untuk profil berbeda (mis. mahasiswa bermotor → perjalanan & paparan luar ruang; pekerja luar ruang → paparan berkepanjangan; keluarga → kesiapsiagaan rumah tangga). Jangan sekadar merangkum cuaca.
Sertakan impacts hanya untuk hazard dengan level ≥ low atau yang relevan dengan profil (1–4 item). Gunakan saferOutdoorWindows untuk "timing" bila tersedia.
SKEMA JSON:
{"headline": string, "summary": string (2–3 kalimat personal), "impacts": [{"hazard": "flood"|"fire"|"smoke"|"weather", "impact": string, "advice": string}], "timing": string (kapan waktu yang relatif lebih aman/perlu dihindari), "watchFor": string[2–4] (tanda yang perlu diwaspadai)}`,

  "action-plan": `TUGAS: Buat Rencana Aksi personal yang ringkas, konkret, dapat dicentang. Setiap butir diawali kata kerja, ≤ 110 karakter. Sesuaikan dengan hazard utama, level, dan profil. Jika risiko rendah, fokus pada kesiapsiagaan dasar.
SKEMA JSON:
{"title": string, "summary": string (1–2 kalimat), "rightNow": string[3–5] (lakukan sekarang), "nextHours": string[3–5] (beberapa jam ke depan), "ifWorsens": string[3–5] (jika kondisi memburuk — eskalasi, termasuk mengikuti arahan resmi & 112), "officialNote": string (pengingat untuk memprioritaskan informasi resmi BMKG/BNPB/BPBD)}`,

  "family-plan": `TUGAS: Buat Rencana Aksi Keluarga. Prioritaskan anggota dengan priority "high" (anak, balita, lansia, paparan tinggi). Saran per anggota ringkas (1–3 butir), praktis, tanpa saran medis spesifik.
SKEMA JSON:
{"summary": string (2 kalimat), "members": [{"name": string (sama persis dengan konteks), "advice": string[1–3]}], "household": string[3–5] (persiapan rumah tangga), "ifWorsens": string[2–4]}`,

  region: `TUGAS: Jelaskan kondisi regional (provinsi pada konteks.region) untuk masyarakat awam: aktivitas titik panas & tren, cuaca, peringatan resmi, dan implikasinya. Ingat: titik panas ≠ kebakaran terkonfirmasi.
SKEMA JSON:
{"headline": string, "summary": string (3–4 kalimat), "outlook": string (1–2 kalimat: apa yang perlu dipantau)}`,

  assistant: `TUGAS: Jawab pertanyaan pengguna sebagai asisten kontekstual. Gunakan konteks (lokasi, skor, cuaca, profil, rencana). Jawaban 2–6 kalimat atau daftar poin singkat (gunakan "- " untuk poin, **tebal** untuk penekanan). Jika pertanyaan di luar kebencanaan/lingkungan/kesiapsiagaan, arahkan kembali dengan sopan. Jika ditanya cara perhitungan, jelaskan metode Siaga Score (bobot indikator, pengubah paparan) tanpa mengubah angka.
SKEMA JSON:
{"answer": string, "followUps": string[2–3] (pertanyaan lanjutan singkat yang relevan)}`,
};

/** Builds the user-turn payload: task instructions + compact JSON context. */
export function buildUserPrompt(task: AiTask, context: AiContext): string {
  return `${TASK_INSTRUCTIONS[task]}

KONTEKS (JSON, sumber kebenaran tunggal):
${JSON.stringify(context)}`;
}

export interface PromptMessages {
  system: string;
  messages: ChatMessage[];
}

export function buildPrompt(
  task: AiTask,
  context: AiContext,
  history: ChatMessage[] = [],
): PromptMessages {
  const base = buildUserPrompt(task, context);
  if (task !== "assistant")
    return {
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: base }],
    };
  const trimmed = history.slice(-8);
  const last = trimmed[trimmed.length - 1];
  const prior = trimmed.slice(0, -1);
  return {
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${base}\n\nPercakapan akan dimulai. Balas setiap pertanyaan dengan JSON sesuai skema.`,
      },
      {
        role: "assistant",
        content:
          '{"answer":"Siap. Saya akan menjawab berdasarkan konteks.","followUps":[]}',
      },
      ...prior,
      { role: "user", content: last?.content ?? "" },
    ],
  };
}
