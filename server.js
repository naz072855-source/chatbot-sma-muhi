import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/png', 'image/jpeg', 'image/webp',
      'application/pdf', 'text/plain'
    ];
    cb(allowed.includes(file.mimetype) ? null : new Error('Format berkas tidak didukung.'), allowed.includes(file.mimetype));
  }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const apiKey = process.env.GEMINI_API_KEY;
const gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', aiConfigured: Boolean(gemini) });
});

app.post('/tanya-ai', async (req, res) => {
  const pertanyaan = typeof req.body?.pertanyaan === 'string' ? req.body.pertanyaan.trim() : '';
  if (!pertanyaan) return res.status(400).json({ error: 'Pertanyaan wajib diisi!' });
  if (pertanyaan.length > 4000) return res.status(413).json({ error: 'Pertanyaan maksimal 4000 karakter.' });
  if (!gemini) return res.status(503).json({ error: 'GEMINI_API_KEY belum diatur di file .env.' });

  try {
    const response = await gemini.models.generateContent({
      model: MODEL_NAME,
      contents: `Kamu adalah asisten informasi SMA Muhammadiyah 1. Jawab dalam bahasa Indonesia dengan sopan dan ringkas. Jangan mengarang informasi resmi sekolah yang tidak diketahui; arahkan pengguna ke Humas untuk data yang belum pasti. Pertanyaan: ${pertanyaan}`
    });
    const jawaban = response.text?.trim();
    if (!jawaban) return res.status(502).json({ error: 'AI tidak memberikan jawaban. Coba lagi.' });
    res.json({ jawaban });
  } catch (error) {
    console.error('Gemini API error:', error?.message || error);
    res.status(502).json({ error: 'Gagal menghubungi Gemini. Periksa API key, kuota, dan koneksi.' });
  }
});

app.post('/analisis-gambar', upload.single('gambar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Berkas gambar wajib diunggah!' });
  if (!req.file.mimetype.startsWith('image/')) return res.status(415).json({ error: 'Berkas harus berupa gambar.' });
  if (!gemini) return res.status(503).json({ error: 'GEMINI_API_KEY belum diatur di file .env.' });
  try {
    const response = await gemini.models.generateContent({
      model: MODEL_NAME,
      contents: [
        req.body?.instruksi || 'Jelaskan gambar ini',
        { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } }
      ]
    });
    res.json({ analisis: response.text || '' });
  } catch (error) {
    console.error('Image analysis error:', error?.message || error);
    res.status(502).json({ error: 'Gagal menganalisis gambar. Periksa konfigurasi Gemini.' });
  }
});

app.post('/analisis-dokumen', upload.single('dokumen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Berkas dokumen wajib diunggah!' });
  if (!['application/pdf', 'text/plain'].includes(req.file.mimetype)) {
    return res.status(415).json({ error: 'Dokumen yang didukung: PDF atau TXT.' });
  }
  if (!gemini) return res.status(503).json({ error: 'GEMINI_API_KEY belum diatur di file .env.' });
  try {
    const response = await gemini.models.generateContent({
      model: MODEL_NAME,
      contents: [
        req.body?.instruksi || 'Ringkas dokumen ini',
        { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } }
      ]
    });
    res.json({ analisis_dokumen: response.text || '' });
  } catch (error) {
    console.error('Document analysis error:', error?.message || error);
    res.status(502).json({ error: 'Gagal menganalisis dokumen. Periksa konfigurasi Gemini.' });
  }
});

app.post('/buat-gambar', async (req, res) => {
  const deskripsi = typeof req.body?.deskripsi === 'string' ? req.body.deskripsi.trim() : '';
  if (!deskripsi) return res.status(400).json({ error: 'Field deskripsi wajib diisi!' });
  if (!gemini) return res.status(503).json({ error: 'GEMINI_API_KEY belum diatur di file .env.' });
  try {
    const response = await gemini.models.generateContent({
      model: MODEL_NAME,
      contents: `Buat panduan konsep visual yang mendetail berdasarkan deskripsi ini. Jelaskan komposisi, pencahayaan, rasio aspek, dan gaya. Ini berupa arahan teks, bukan file gambar. Deskripsi: ${deskripsi}`
    });
    res.json({ status: 'Sukses', pesan: 'Konsep visual berhasil dibuat.', detail_resep_ai: response.text || '' });
  } catch (error) {
    console.error('Visual concept error:', error?.message || error);
    res.status(502).json({ error: 'Gagal memproses permintaan Gemini.' });
  }
});

app.use((err, _req, res, _next) => {
  console.error('Request error:', err?.message || err);
  const status = err?.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  res.status(status).json({ error: err?.message || 'Permintaan tidak valid.' });
});

app.listen(PORT, () => {
  console.log(`Chatbot berjalan di http://localhost:${PORT}`);
  if (!gemini) console.warn('GEMINI_API_KEY belum tersedia; endpoint AI akan mengembalikan 503.');
});
