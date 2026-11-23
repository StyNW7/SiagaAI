# Metodologi Siaga Risk Engine

> Implementasi: `frontend/src/features/risk/engine/` · Tes: `engine.test.ts`
> Halaman *Data & Metodologi* di aplikasi merender bobot langsung dari konstanta kode, sehingga dokumentasi tidak dapat menyimpang dari implementasi.

## Prinsip

1. **Algorithm calculates, AI communicates.** Skor 100% deterministik, sedangkan LLM hanya menjelaskan.
2. **Data tidak tersedia ≠ nol.** Bobot indikator yang hilang dialihkan secara proporsional ke indikator yang tersedia. *Coverage* dicatat dan tingkat keyakinan diturunkan:
   - tinggi: ≥ 85%;
   - sedang: ≥ 60%;
   - rendah: di bawah itu.

   Bahaya tidak dinilai bila coverage < 40%.
3. **Tidak mengklaim kepastian ilmiah.** Hasilnya disebut *Indicative Siaga Score*, bukan peringatan resmi.

## Normalisasi indikator (kurva titik-patah)

| Indikator | Titik patah (nilai → skor) | Rujukan |
|---|---|---|
| Jarak titik panas terdekat (km) | 0–5→100, 25→70, 50→40, 100→10, 150→0 | Heuristik paparan asap lokal |
| Jumlah titik panas ≤ 50 km | 0→0, 3→30, 10→60, 30→90, 60→100 | Kepadatan kluster |
| Kebaruan deteksi (jam) | ≤6→100, 24→65, 48→30, 96→0 | Siklus lintasan VIIRS |
| Kelembapan relatif (%) | 30→100, 45→80, 60→45, 75→15, 90→0 | Kekeringan bahan bakar |
| Kecepatan angin (km/jam) | 0→0, 5→10, 15→45, 25→80, 35→100 | Penyebaran api/asap |
| PM2.5 (µg/m³) | 0→0, 15→5, 35→30, 55→55, 150→90, 250→100 | Ambang WHO / ISPU |
| Titik panas searah angin ≤150 km | 0→0, 2→30, 10→65, 30→90, 60→100 | Transport asap |
| Jarak pandang (m) | 0→100, 1000→85, 3000→55, 5000→30, 10000→0 | Indikasi asap/kabut |
| Hujan 24 jam (mm) | 0→0, 5→5, 20→35, 50→65, 100→90, 150→100 | Kelas hujan harian BMKG |
| Intensitas puncak (mm/jam) | 0→0, 5→15, 10→45, 20→75, 30→95, 40→100 | Kelas hujan per jam BMKG |
| Rasio debit sungai | ≤1→0, 1,5→30, 2→55, 3→85, 4→100 | Anomali vs rerata 30 hari (GloFAS) |
| Jam badai petir (24 jam) | 0→0, 1→55, 3→80, 6→100 | Kode WMO 95–99 |
| Hembusan angin (km/jam) | 20→10, 40→45, 60→80, 75→100 | Skala Beaufort |
| Peluang hujan maks (%) | 40→15, 70→55, 90→85, 100→100 | — |
| Suhu maksimum (°C) | ≤31→0, 33→30, 35→60, 37→85, 40→100 | Stres panas |

## Bobot per bahaya

| Bahaya | Indikator (bobot) |
|---|---|
| 🔥 Karhutla | Kedekatan & kepadatan 30% · Kebaruan 20% · Kekeringan 15% · Angin 15% · PM2.5 20% |
| 💨 Asap | PM2.5 50% · Titik panas searah angin 30% · Jarak pandang 20% |
| 🌊 Banjir | Hujan 24 jam 35% · Intensitas puncak 25% · Debit sungai 20% · Peringatan BMKG 20% |
| ⛈️ Cuaca ekstrem | Badai petir 35% · Hembusan 25% · Peluang hujan 20% · Panas 20% |

Aturan khusus karhutla:

- **Kedekatan** = 65% skor jarak + 35% skor kepadatan.
- **Kebaruan** diskalakan dengan kepadatan, yaitu `0,3 + 0,7 × min(1, n≤50km / 5)`. Akibatnya, satu deteksi terisolasi (mungkin sumber panas industri) tidak dihitung setara dengan kluster api.
- **Kekeringan** diredam oleh hujan, yaitu `× 1 / (1 + hujan24j / 5)`.
- **Tanpa deteksi termal dalam 100 km**, skor karhutla dibatasi maksimal **35**, karena cuaca kering saja bukan kebakaran.

Arah angin: titik panas dianggap *searah angin* bila bearing dari pengguna ke titik panas berada dalam ±45° dari arah datangnya angin (konvensi meteorologi). Artinya, asap dari titik tersebut dapat terbawa angin ke arah pengguna.

## Komposit lokasi

`Skor lokasi = 0,85 × bahaya dominan + 0,15 × bahaya kedua`

Bahaya dominan menentukan kategori, sedangkan bahaya kedua memberi efek kumulatif yang kecil.

## Pengubah paparan personal

`Skor personal (per bahaya) = skor bahaya × pengubah`. Pengubah dibatasi pada rentang **[0,80; 1,30]**.

| Faktor | Karhutla | Asap | Banjir | Cuaca |
|---|---|---|---|---|
| Pelajar/mahasiswa | +3% | +4% | +4% | +4% |
| Pekerja kantor | −3% | −4% | −2% | −4% |
| Pekerja luar ruang | +8% | +12% | +6% | +10% |
| Pedagang | +3% | +6% | +5% | +5% |
| Sepeda motor | +3% | +8% | +8% | +8% |
| Jalan kaki | +2% | +6% | +6% | +6% |
| Mobil | −2% | −3% | +2% | −3% |
| Transportasi umum | 0 | +3% | +4% | +3% |
| Paparan tinggi / rendah | +4% / −3% | +8% / −6% | +4% / −3% | +6% / −5% |
| Aktivitas luar / dalam ruang | +3% / −2% | +5% / −5% | +3% / −2% | +5% / −4% |
| Balita | +5% | +18% | +10% | +8% |
| Anak | +4% | +12% | +8% | +6% |
| Lansia | +5% | +15% | +10% | +10% |

Ketentuan Family Siaga:

- **Prioritas tinggi**: skor ≥ 61, **atau** termasuk kelompok rentan (balita/anak/lansia) dengan skor ≥ 41.
- **Pantau**: skor ≥ 41, atau kelompok rentan dengan skor ≥ 25.

## Kategori

| Skor | Kategori | Makna |
|---|---|---|
| 0–20 | Aman | Tidak ada sinyal bahaya berarti |
| 21–40 | Rendah | Kewaspadaan dasar |
| 41–60 | Sedang | Siapkan rencana, pantau perkembangan |
| 61–80 | Tinggi | Sesuaikan aktivitas, siapkan perlindungan |
| 81–100 | Kritis | Utamakan keselamatan, ikuti arahan resmi |

Risiko selalu ditampilkan sebagai **warna + ikon + teks**, tidak pernah dengan warna saja.

## Indeks aktivitas luar ruang (per jam)

`indeks = maks(hujan, petir, panas, PM2.5)`, masing-masing 0–100.

Jendela aman adalah rentang 2–3 jam berurutan antara 05.00–21.00 WIB dengan rerata indeks terendah. Dipilih maksimal dua jendela yang tidak saling tumpang-tindih.

## Kesegaran data

| Status | Umum | Titik panas | Debit sungai |
|---|---|---|---|
| Terkini | < 1 jam | < 6 jam | < 12 jam |
| Menua | < 6 jam | < 24 jam | < 48 jam |
| Usang | ≥ 6 jam | ≥ 24 jam | ≥ 48 jam |

Data snapshot dan offline maksimal berstatus *Menua* dan selalu diberi label. Mode skenario menampilkan banner simulasi permanen.

## Rencana validasi

Bobot dan ambang di atas adalah heuristik produk. Tahap berikutnya:

- kalibrasi terhadap data kejadian historis (DIBI BNPB, arsip FIRMS & ISPU);
- uji pakar bersama BPBD dan akademisi kebencanaan;
- uji usabilitas dengan persona target.
