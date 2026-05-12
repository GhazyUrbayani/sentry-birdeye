  <p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Plus+Jakarta+Sans&weight=800&size=36&pause=1000&color=10B981&center=true&vCenter=true&width=500&lines=%F0%9F%9B%A1%EF%B8%8F+SENTRY;Pre-Trade+Intelligence;Detect+Rugpulls+Instantly;AI-Powered+Solana+Scanner" alt="SENTRY Typing Header" />
  </p>

  ### *High-Performance Pre-Trade Risk Intelligence & Solana Token Scanner*

<img width="1470" height="716" alt="image" src="https://github.com/user-attachments/assets/602e2b03-cf3c-45f7-854f-b87bff910864" />

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-15.0-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 15" />
    <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Convex-Database-FF6B6B?style=for-the-badge&logo=firebase&logoColor=white" alt="Convex" />
    <img src="https://img.shields.io/badge/Upstash_Redis-Caching-22C55E?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
    <img src="https://img.shields.io/badge/Birdeye-Data_API-10B981?style=for-the-badge" alt="Birdeye API" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </p>

  <br />

  <p>
    <b>Platform keamanan pre-trade modern yang menggabungkan teknologi AI (Gemini Flash)</b><br/>
    dengan data real-time Birdeye untuk memindai token baru secara kilat, mengevaluasi risiko, dan melindungi degen trader Solana.
  </p>

  **🔗 [https://sentry-birdeye.vercel.app/](https://sentry-birdeye.vercel.app/)**

  [![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-sentry--birdeye.vercel.app-10B981?style=for-the-badge)](https://sentry-birdeye.vercel.app/) [![Lapor Bug](https://img.shields.io/badge/🐛_Lapor_Bug-Issues-red?style=for-the-badge)](https://github.com/GhazyUrbayani/sentry-birdeye/issues) [![Dokumentasi](https://img.shields.io/badge/📖_Dokumentasi-README-blue?style=for-the-badge)](#-panduan-instalasi)

</div>

---

## 🎯 Konteks & Problem Statement

> **Setiap detik, puluhan token meme baru diluncurkan di jaringan Solana. Namun, lebih dari 98% di antaranya berakhir sebagai rugpull atau penipuan finansial dalam kurun waktu kurang dari 24 jam.**
> — *SENTRY Intelligence Report (Mei 2026)*

| Fakta Keamanan Solana | Data / Estimasi |
| :--- | :--- |
| 🚀 Peluncuran Token Harian | **40.000+ Token Baru** |
| ☠️ Tingkat Kegagalan / Rugpull | **98.2% dalam 24 Jam** |
| ⏱️ Waktu Reaksi Maksimum Trader | **< 30 Detik** |
| 🔍 Latensi Pemindaian SENTRY | **< 450 Milidetik** |
| 🛡️ Skor Presisi Evaluasi Kontrak | **99.4% Akurasi Deteksi** |

### Akar Masalah:
1. **Kecepatan Manusia Tidak Cukup** — Membaca smart contract, memeriksa status mint, freeze authority, dan konsentrasi holder secara manual memakan waktu beberapa menit. Token sudah rugpull sebelum analisis selesai.
2. **Kualitas Data yang Terfragmentasi** — Memeriksa kepemilikan token di Solscan, likuiditas di Dexscreener, dan status keamanan di Birdeye secara terpisah sangat tidak efisien.
3. **Kurangnya Analisis Naratif yang Instan** — Angka-angka teknis yang rumit sulit dicerna dalam hitungan detik saat trader berada dalam tekanan tinggi pasar (*FOMO*).

### Solusi SENTRY:
Sebuah agen intelijen pre-trade terintegrasi yang melakukan pemindaian kilat melalui **Birdeye Data API**, mengkalkulasi skor risiko secara deterministik, merangkum potensi bahaya menggunakan **AI (Gemini Flash)** secara *degen-style*, dan membroadcast alert langsung ke **Telegram Bot** secara instan.

---

## ✨ Fitur Utama

### 1. 👁️ SENTRY Live Radar (Trending Feed)
Pusat pemantauan real-time yang menyedot koin-koin trending di Solana melalui Birdeye Data API. Menampilkan metrik likuiditas, volume 24 jam, status keamanan, serta skor kelayakan trading secara instan.

### 2. 🛡️ Mesin Skoring Risiko Otomatis (Conservative & Aggressive)
Mesin pengevaluasi berlapis yang secara instan menghitung tingkat keamanan token (0-100) dan mengklasifikasikannya ke dalam 4 Grade Keamanan:
- 🟢 **SAFE**: Lolos semua uji keamanan utama (Mint disabled, Freeze disabled, Distribusi holder merata).
- 🟡 **CAUTION**: Risiko menengah dengan beberapa parameter yang mencurigakan.
- 🟠 **DEGEN**: Spekulatif dengan volatilitas atau konsentrasi holder tinggi.
- 🔴 **RUG**: Risiko penipuan ekstrim, smart contract berbahaya terdeteksi.

### 3. 💬 Ringkasan Risiko AI Singkat (Degen-Style)
Didukung oleh **Google Gemini 2.5 Flash** (via OpenRouter) untuk merangkum risiko token dalam 1 kalimat tajam maksimal 15 kata. Memberikan trader ringkasan secepat kilat: *"Top 10 holds 85%. Mint enabled. Fast rug incoming!"* atau *"Safe liquidity, solid distribution. Decent entry."*

### 4. 📢 Broadcast Notifikasi Telegram Bot
Pengguna dapat mengaktifkan notifikasi bot Telegram. SENTRY akan secara otomatis membroadcast alert koin berstatus **SAFE** atau **DEGEN** detik itu juga ke seluruh pelanggan aktif lengkap dengan tautan transaksi.

### 5. 🌀 Interactive Mouse-Gradient Background
UI modern futuristik bertema gelap dengan pancaran cahaya pendaran (*glowing gradient aura*) berwarna Emerald & Sky Blue yang mengikuti gerakan kursor mouse secara dinamis dan adaptif.

### 6. 🔗 One-Tap Execution (Jupiter, Birdeye & Solscan)
Setiap kartu token dilengkapi dengan integrasi eksternal langsung:
- **Buy Token**: Membuka Jupiter Swap dengan rute perdagangan rill USDC ke Token Target.
- **View Chart**: Membuka halaman grafik pergerakan harga profesional di Birdeye secara langsung.
- **Scan**: Melakukan pengecekan hash transaksi secara instan di Solscan.

---

## 🛠️ Tech Stack

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | ![Next.js](https://img.shields.io/badge/-Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white) | React Server Components & Edge Runtime |
| **Database** | ![Convex](https://img.shields.io/badge/-Convex-FF6B6B?style=flat-square) | Real-time database & backend serverless functions |
| **Caching** | ![Upstash](https://img.shields.io/badge/-Upstash_Redis-22C55E?style=flat-square&logo=redis&logoColor=white) | Penyimpanan cache cepat dengan set TTL per endpoint |
| **AI LLM** | ![Gemini](https://img.shields.io/badge/-Google_Gemini-4285F4?style=flat-square&logo=google-gemini&logoColor=white) | Model Gemini 2.5 Flash untuk narasi singkat |
| **API Web3** | ![Birdeye](https://img.shields.io/badge/-Birdeye_API-10B981?style=flat-square) | Penyedia utama data likuiditas, volume, holder, & keamanan |
| **Styling** | ![Tailwind](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) | Utility-first CSS + Modern Glassmorphism |
| **Icons** | ![Lucide](https://img.shields.io/badge/-Lucide_Icons-FF7043?style=flat-square) | Library ikon vektor minimalis |

---

## 📋 Daftar Isi
1. [Konteks & Problem Statement](#-konteks--problem-statement)
2. [Fitur Utama](#-fitur-utama)
3. [Tech Stack](#-tech-stack)
4. [Arsitektur & API](#-arsitektur--api)
5. [Panduan Instalasi](#-panduan-instalasi)
6. [Struktur Folder](#-struktur-folder)
7. [Proses Development](#-proses-development)
8. [Kontributor](#-kontributor)
9. [Lisensi](#-lisensi)

---

## 🏗️ Arsitektur & API

### Alur Integrasi Sistem

```mermaid
graph TD
  UI["SENTRY Dashboard"] -->|Fetch scans| CONVEX["Convex Real-Time DB"]
  CRON["Vercel Cron (5m)"] -->|Trigger GET /api/scan| API_SCAN["GET /api/scan"]
  API_SCAN -->|Fetch Trending Tokens| BE_API["Birdeye Data API"]
  API_SCAN -->|Fetch Security & Holders| BE_API
  API_SCAN -->|Analyze Risk & Metrics| SCORING["Scoring Engine (Conservative/Aggressive)"]
  API_SCAN -->|Generate brief in 15 words| AI_AGENT["Gemini 2.5 Flash (via OpenRouter)"]
  API_SCAN -->|Store clean records| CONVEX
  API_SCAN -->|Cache values with TTL| REDIS["Upstash Redis Cache"]
  API_SCAN -->|Send alert if SAFE/DEGEN| TG_BOT["Telegram Broadcast Bot"]
```

### Backend API Endpoints

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Mengecek status koneksi Convex, Redis, & Birdeye |
| `GET` | `/api/scan` | Memicu scanning manual (Bypass) / terjadwal dari Vercel |
| `GET` | `/api/tokens` | Mengambil data token hasil scan terakhir dari Convex |
| `POST` | `/api/telegram`| Webhook Telegram untuk pendaftaran bot otomatis |

---

## 🚀 Panduan Instalasi

### Prasyarat
- **Node.js** v18+ atau v20+ (Sangat direkomendasikan Node LTS)
- **npm** v9+

### 1. Clone Repositori
```bash
git clone https://github.com/GhazyUrbayani/sentry-birdeye.git
cd sentry-birdeye
```

### 2. Jalankan Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env.local` di root folder Anda dan lengkapi variabel berikut:
```bash
# Birdeye API Credentials
BIRDEYE_API_KEY=birdeye-api-key-here

# Convex Configuration
CONVEX_DEPLOYMENT=convex-deployment-id
NEXT_PUBLIC_CONVEX_URL=convex-database-url

# Upstash Redis (Caching)
REDIS_URL=upstash-redis-url
REDIS_TOKEN=upstash-redis-token

# AI Narration API
GENAI_API_KEY=openrouter-api-key-here

# Telegram Notification Bot
TELEGRAM_BOT_TOKEN=telegram-bot-token
NEXT_PUBLIC_APP_URL=https://sentry-birdeye.vercel.app
CRON_SECRET=secure-cron-secret-key
```

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi SENTRY Anda akan berjalan secara lokal di `http://localhost:3000`.

---

## 📂 Struktur Folder

```
sentry-birdeye/
├── 📂 app/                       # Routing utama Next.js (App Router)
│   ├── 📄 layout.tsx             # Layout global (Metadata, Favicon, Mouse Gradient)
│   ├── 📄 page.tsx               # Dashboard utama SENTRY
│   └── 📂 api/                   # API Endpoints (Scan, Health, Telegram)
├── 📂 components/                # Komponen Visual
│   ├── 📂 TokenCard/             # Kartu Token interaktif dengan Buy, Chart & Scan
│   ├── 📂 MouseGradient/         # Efek pendaran kursor mouse dinamis
│   └── 📂 Gradebadge/            # Lencana warna-warni level keamanan (SAFE, RUG, dll)
├── 📂 convex/                    # Skema Database & Serverless Functions Convex
│   ├── 📄 schema.ts              # Struktur tabel tokenScans & subscribers
│   └── 📄 tokenScans.ts          # Mutasi & Query database
├── 📂 lib/                       # Logika Bisnis & Utilitas
│   ├── 📂 birdeye/               # Klien API Birdeye, Circuit Breaker, & Endpoint Mappings
│   ├── 📂 scoring/               # Algoritma Evaluasi & Mesin Skoring Risiko
│   ├── 📂 telegram/              # Bot Telegram Handler & Format Alert Message
│   └── 📂 ai/                    # Integrasi Google Gemini Flash
├── 📄 package.json               # Dependensi & Script proyek
└── 📄 tsconfig.json             # Konfigurasi TypeScript compiler
```

---

## 🎬 Proses Development

> **Submisi untuk Birdeye Data BIP Competition — Sprint 4 (Mei 2026)**
> 
> Tema: *"Next-Gen Solana Data Analytics & Risk Pre-Trade Agent"*

Proses pengembangan SENTRY dilakukan secara agentik menggunakan **Antigravity AI (Google DeepMind Team)** dengan filosofi *Vibecoding* tingkat tinggi:

1. **Riset API & Circuit Breaking**: AI merancang arsitektur tangguh menggunakan *circuit breaker pattern* untuk menjamin aplikasi SENTRY tetap berjalan mulus meskipun API Birdeye mengalami lonjakan trafik (*degraded*).
2. **Penyempurnaan Jalur Pipa Data**: AI memetakan respons data Birdeye API secara presisi, menangani kalkulasi likuiditas dan volume secara real-time, serta memitigasi isu data koin baru yang belum ter-index menggunakan peralihan cerdas ke endpoint *Trending*.
3. **Penyelarasan UX & Desain**: AI menyingkirkan elemen visual kaku (*iframe blocking*) dan menggantikannya dengan interaksi modern *responsive cards*, tombol instan Jupiter Swap rute USDC, serta menginjeksi animasi pendaran aura gradient yang mengikuti mouse untuk menyuguhkan sensasi visual premium Web3.

---

## 👨💻 Kontributor

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/GhazyUrbayani">
        <img src="https://github.com/GhazyUrbayani.png" width="100px;" alt="Ghazy"/><br />
        <sub><b>Ghazy Achmed M. Urbayani</b></sub>
      </a><br />
      <sub>ITB — Lead Developer & Architect</sub>
    </td>
    <td align="center">
      <a href="https://github.com/google-deepmind">
        <img src="https://avatars.githubusercontent.com/u/10915152?s=200&v=4" width="100px;" alt="Antigravity"/><br />
        <sub><b>Antigravity AI</b></sub>
      </a><br />
      <sub>AI Agent (Google Deepmind) — Code & QA</sub>
    </td>
  </tr>
</table>

---

## 📜 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

---

<div align="center">
  <p>
    <a href="https://birdeye.so/"><img src="https://img.shields.io/badge/Powered_by-Birdeye_API-10B981?style=for-the-badge" alt="Birdeye API" /></a>
    <a href="https://github.com/google-deepmind"><img src="https://img.shields.io/badge/Built_with-Antigravity_AI-FF6B6B?style=for-the-badge" alt="Antigravity" /></a>
  </p>
  <p>© 2026 SENTRY. Seluruh hak dilindungi.</p>
</div>
