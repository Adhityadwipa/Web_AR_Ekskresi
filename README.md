# ExAR — AR 3D Sistem Ekskresi

Web chatbot dengan **Augmented Reality 3D** tentang sistem ekskresi manusia untuk siswa **SMP & SMA**.
Organ 3D yang detail (paru-paru, ginjal + saluran kemih, nefron, hati, kulit) dapat diputar, dipotong,
dan diketuk per bagian. Chatbotnya **context-aware**: ia tahu objek mana yang sedang diamati, sehingga
pertanyaan seperti *"apa fungsinya?"* langsung dijawab sesuai organ/bagian yang dilihat.

## Fitur

**Model 3D prosedural (Three.js), tanpa file model eksternal**
- **Paru-paru**: 3 lobus kanan & 2 lobus kiri dengan fisura, takik jantung, trakea bercincin C, pohon bronkus–bronkiolus, kantong alveolus, arteri/vena pulmonalis, diafragma, animasi bernapas, dan **perbesaran alveolus** dengan partikel CO₂ keluar / O₂ masuk.
- **Ginjal**: sepasang ginjal dengan **penampang membujur** (kapsul, korteks, piramida medula, kaliks, pelvis, arteri interlobaris–arkuata), kelenjar adrenal, aorta, vena kava, ureter dengan tetesan urine, kandung kemih berisi urine, dan uretra.
- **Nefron**: glomerulus, kapsul Bowman, arteriol aferen/eferen, tubulus proksimal, lengkung Henle, tubulus distal, tubulus kolektivus, kapiler peritubulus, dan aliran filtrat yang warnanya makin pekat (urine primer → sekunder → sesungguhnya).
- **Hati**: lobus kanan/kiri, ligamen falsiformis, kantong & saluran empedu, vena porta, arteri hepatika, vena kava, percabangan pembuluh di dalam hati (mode transparan), dan **perbesaran lobulus hati**.
- **Kulit**: 5 lapisan epidermis, dermis, hipodermis berlemak, folikel & batang rambut, kelenjar minyak, otot penegak rambut, kelenjar keringat bergulung + saluran spiral ke pori, tetes keringat beranimasi, pembuluh darah, saraf, dan reseptor Pacini/Meissner.

**Mode Utuh & Penampang (tanpa transparansi)**
- Tombol **Penampang** membelah organ sungguhan (clipping + tutup irisan dengan stencil): permukaan potongan bertekstur jaringan, dan saluran di dalamnya (bronkus, pembuluh hati, saluran empedu, ureter, tubulus nefron) tampak terbelah.
- Label bagian dalam ditempatkan tepat di bidang irisan dan hanya muncul pada mode penampang. Label memakai garis penanda; klik label untuk menyorot & memperbesar bagian.
- Kamera: seret untuk memutar, klik kanan/dua jari untuk menggeser, scroll/cubit untuk zoom, klik ganda untuk memperbesar bagian, serta tombol Perbesar/Perkecil/Geser.

**Context-aware system**
- Konteks = model yang tampil + bagian yang **diketuk/dipilih** (mode 3D) atau yang **dibidik titik tengah kamera** (mode AR, raycast dari tengah layar).
- Chip *"Sedang diamati"* di panel chat menampilkan konteks secara langsung; setiap jawaban yang disimpulkan dari konteks diberi label *"Berdasarkan objek yang kamu amati: …"*.
- Pertanyaan yang menyebut organ/bagian lain dijawab sesuai yang disebut, lengkap dengan tombol **"Tunjukkan di 3D"** yang berpindah model dan menyorot bagian tersebut.
- Saran pertanyaan berubah sesuai organ/bagian yang diamati.

**Chatbot**
- **Mode offline** (default): mesin tanya-jawab lokal berbasis materi SMP/SMA (fungsi, zat sisa, proses, struktur, letak, penyakit, cara menjaga, fakta, perbandingan, ekskresi vs sekresi vs defekasi) + **kuis** pilihan ganda.
- **Mode AI** (opsional): jika server diberi `ANTHROPIC_API_KEY`, jawaban dihasilkan Claude (streaming) dengan catatan konteks 3D dan materi yang sama sebagai referensi. Bila AI gagal, otomatis kembali ke mode offline.
- Tombol jenjang **SMP / SMA** mengatur kedalaman jawaban. Input suara (Bahasa Indonesia) bila browser mendukung.

**Basis pengetahuan dari buku & modul**
- `src/data/corpus.json` berisi ±175 potongan materi sistem ekskresi yang diekstrak dari modul Sistem Ekskresi pada Manusia, modul Biologi XI KD 3.9, Buku IPA Kelas VIII & VII, dan materi tinjauan pustaka (soal latihan, kata pengantar, dan bagian di luar topik dibuang).
- Mode offline mencari potongan paling relevan (BM25) untuk menambah penjelasan, menjawab istilah khusus (mis. *detoksifikasi*, *ADH*, *hemodialisis*), dan menyebut sumbernya. Mode AI memakai seluruh korpus sebagai rujukan.
- Chatbot mengingat alur percakapan: *"terus?"*, *"contohnya?"*, *"masih bingung"* melanjutkan topik sebelumnya; *"kalau hati?"* memakai jenis pertanyaan sebelumnya untuk organ lain.
- Membangun ulang korpus dari PDF: `python3 tools/build_corpus.py <folder-pdf>` (butuh `pdftotext`).

**AR**
- **WebXR immersive-ar** (Android Chrome, dsb.): deteksi permukaan, ketuk untuk menaruh organ, ubah ukuran, dan chat tetap bisa dibuka di atas tampilan AR.
- **Mode kamera** sebagai cadangan (iPhone/laptop): model 3D di atas video kamera dengan titik bidik context-aware.

## Menjalankan

Butuh Node.js 20+.

```bash
npm install
```

Pengembangan (frontend saja, chatbot mode offline):

```bash
npm run dev
```

Produksi / dengan mode AI — build lalu jalankan server (menyajikan `dist/` + endpoint `/api/chat`):

```bash
npm run build
```

```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Buka `http://localhost:8787`. Kunci API juga bisa ditaruh di file `.env` (`ANTHROPIC_API_KEY=...`). Model default `claude-opus-5-5`; ganti lewat `CLAUDE_MODEL`.
Saat mengembangkan dengan AI, jalankan `npm start` dan `npm run dev` bersamaan — Vite meneruskan `/api` ke port 8787.

### Mencoba AR di ponsel

WebXR dan kamera **wajib HTTPS**. Pilihan:
- `npm run dev:https` lalu buka `https://<IP-komputer>:5173` dari ponsel di jaringan yang sama (terima peringatan sertifikat lokal), atau
- deploy ke hosting ber-HTTPS (Render, Railway, VPS, dsb.) dengan `npm run build && npm start`.

Tautan langsung ke organ tertentu: `?organ=paru|ginjal|nefron|hati|kulit`.

## Struktur

```
index.html              tata letak (stage 3D, dock organ, HUD AR, panel chat)
src/main.js             penghubung UI ↔ viewer ↔ konteks ↔ chat ↔ AR
src/state.js            store konteks (model, organ, bagian, gaze, mode, jenjang)
src/scene/viewer.js     renderer Three.js, label, picking, highlight, gaze raycast
src/scene/helpers.js    material organik, tekstur prosedural, tube, pohon percabangan
src/organs/*.js         model 3D tiap organ
src/ar.js               WebXR hit-test + mode kamera
src/chat/engine.js      mesin jawaban lokal yang sadar konteks + kuis
src/chat/llm.js         catatan konteks & streaming ke /api/chat
src/chat/chat.js        UI chat (markdown, aksi, saran, suara)
src/data/knowledge.js   materi SMP/SMA: organ, bagian, penyakit, kuis
server/index.js         server statis + endpoint Claude (streaming SSE)
```

Menambah materi cukup lewat `src/data/knowledge.js`; mesin lokal dan prompt AI otomatis memakainya.
