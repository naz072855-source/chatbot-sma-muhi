# Chatbot SMA Muhammadiyah 1 — terintegrasi

## Persyaratan
- Node.js 20 atau lebih baru
- API key Google Gemini yang valid

## Menjalankan
1. Ekstrak folder proyek.
2. Buka terminal di folder proyek.
3. Jalankan `npm install`.
4. Salin `.env.example` menjadi `.env`.
   - Windows CMD: `copy .env.example .env`
   - PowerShell: `Copy-Item .env.example .env`
5. Isi `GEMINI_API_KEY` di `.env` dengan API key milikmu.
6. Jalankan `npm start`.
7. Buka `http://localhost:3000` di browser.

Jangan buka `public/index.html` langsung melalui `file://`; buka melalui server di atas agar permintaan `/tanya-ai` berjalan.

## Pemeriksaan
- `http://localhost:3000/health` menampilkan status server dan apakah API key terkonfigurasi.
- Chat widget mengirim pertanyaan ke endpoint `/tanya-ai`.
- Jika AI tidak tersedia, widget menggunakan basis pengetahuan lokal yang sudah ada sebagai fallback.
- Endpoint tambahan: `/analisis-gambar`, `/analisis-dokumen`, `/buat-gambar`.

## Keamanan
Jangan membagikan file `.env` atau mengunggahnya ke Git. API key yang pernah dibagikan sebaiknya dicabut/dirotasi dan diganti dengan key baru.
