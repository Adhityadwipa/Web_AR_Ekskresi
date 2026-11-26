// Basis pengetahuan sistem ekskresi manusia (jenjang SMP & SMA).
// Teks bertipe { smp, sma } → SMP ditampilkan untuk semua jenjang, `sma` ditambahkan
// sebagai pendalaman ketika jenjang SMA dipilih.

export const ORGANS = {
  paru: {
    id: 'paru',
    name: 'Paru-paru',
    latin: 'Pulmo',
    color: '#E07A86',
    aliases: ['paru-paru', 'paru paru', 'paru', 'pulmo', 'pulmonalis', 'lungs', 'lung'],
    tagline: 'Mengeluarkan karbon dioksida dan uap air',
    ringkas: {
      smp: 'Paru-paru adalah organ pernapasan yang juga berperan sebagai **alat ekskresi** karena mengeluarkan zat sisa metabolisme berupa **karbon dioksida (CO₂)** dan **uap air (H₂O)** saat kita menghembuskan napas (ekspirasi).',
      sma: 'CO₂ merupakan hasil sisa respirasi sel (oksidasi glukosa: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + energi). CO₂ dibawa darah dari jaringan ke paru-paru, lalu berdifusi dari kapiler ke alveolus dan dikeluarkan melalui ekspirasi.',
    },
    fungsi: {
      smp: 'Fungsi paru-paru sebagai alat ekskresi:\n- Mengeluarkan **karbon dioksida (CO₂)** sisa respirasi sel.\n- Mengeluarkan **uap air (H₂O)** bersama udara yang dihembuskan.\n\nSelain itu paru-paru juga menjadi tempat **pertukaran gas**: O₂ masuk ke darah, CO₂ keluar dari darah.',
      sma: 'Paru-paru juga membantu menjaga **keseimbangan asam-basa (pH) darah**. Jika CO₂ menumpuk, darah menjadi lebih asam (asidosis respiratorik); karena itu laju pernapasan meningkat ketika kadar CO₂ darah naik.',
    },
    zat: {
      smp: 'Zat sisa yang dikeluarkan paru-paru:\n- **Karbon dioksida (CO₂)**\n- **Uap air (H₂O)**\n\nKeduanya merupakan hasil sampingan respirasi sel di seluruh tubuh. Bukti adanya CO₂ pada napas: air kapur (Ca(OH)₂) menjadi **keruh** jika ditiup.',
      sma: 'Reaksi uji air kapur: CO₂ + Ca(OH)₂ → CaCO₃ (endapan putih) + H₂O. Uap air pada napas dapat dibuktikan dengan menghembuskan napas ke cermin/kaca: kaca menjadi berembun.',
    },
    proses: {
      smp: 'Proses pengeluaran CO₂ oleh paru-paru:\n1. Sel tubuh menghasilkan CO₂ dari respirasi sel.\n2. CO₂ diangkut darah melalui vena menuju jantung, lalu ke paru-paru lewat **arteri pulmonalis**.\n3. Di **alveolus**, CO₂ berdifusi dari kapiler darah ke rongga alveolus (dari konsentrasi tinggi ke rendah).\n4. CO₂ dan uap air dikeluarkan lewat bronkiolus → bronkus → trakea → hidung saat **ekspirasi**.',
      sma: 'Pengangkutan CO₂ dalam darah:\n- ±70% sebagai **ion bikarbonat (HCO₃⁻)** dalam plasma.\n- ±23% berikatan dengan hemoglobin sebagai **karbaminohemoglobin (HbCO₂)**.\n- ±7% larut dalam plasma sebagai **asam karbonat (H₂CO₃)**/CO₂ terlarut.\n\nDi eritrosit terjadi reaksi yang dikatalisis enzim **karbonat anhidrase**: CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻. Agar netral, HCO₃⁻ keluar ke plasma dan ion Cl⁻ masuk ke eritrosit (**pertukaran klorida/chloride shift**). Di paru-paru reaksi berbalik sehingga CO₂ dilepaskan ke alveolus.',
    },
    struktur: {
      smp: 'Bagian-bagian paru-paru dan saluran napas:\n- **Trakea** (batang tenggorok) dengan cincin tulang rawan.\n- **Bronkus** kanan dan kiri.\n- **Bronkiolus**, cabang-cabang kecil bronkus.\n- **Alveolus**, gelembung kecil tempat pertukaran gas.\n- Paru-paru kanan memiliki **3 lobus**, paru-paru kiri **2 lobus**.\n- Paru-paru dibungkus selaput **pleura**, dan di bawahnya ada otot **diafragma**.',
      sma: 'Jumlah alveolus sekitar **300–500 juta**, dengan luas permukaan total ±70 m². Dinding alveolus hanya satu lapis sel epitel pipih (±0,2 µm) sehingga difusi gas sangat cepat. Alveolus dilapisi **surfaktan** yang mencegah alveolus kolaps. Paru-paru kiri lebih kecil karena ada **takik jantung (incisura cardiaca)**.',
    },
    letak: {
      smp: 'Paru-paru terletak di **rongga dada**, dilindungi tulang rusuk, di kanan dan kiri jantung. Bagian bawahnya berbatasan dengan **diafragma** yang memisahkan rongga dada dan rongga perut.',
    },
    ukuran: {
      smp: 'Paru-paru orang dewasa beratnya sekitar 1,3 kg (kanan sedikit lebih besar). Kapasitas total paru-paru sekitar **5–6 liter** udara.',
      sma: 'Volume tidal (napas biasa) ±500 mL; kapasitas vital ±4.500 mL; volume residu (udara yang selalu tersisa) ±1.000–1.500 mL.',
    },
    kelainan: [
      { nama: 'Asma', desc: 'Penyempitan saluran napas (bronkus) akibat alergi atau iritasi sehingga sesak napas dan mengi.' },
      { nama: 'Bronkitis', desc: 'Peradangan bronkus, sering karena infeksi atau asap rokok; ditandai batuk berdahak.' },
      { nama: 'Pneumonia', desc: 'Radang paru-paru karena infeksi bakteri/virus sehingga alveolus terisi cairan.' },
      { nama: 'Tuberkulosis (TBC)', desc: 'Infeksi bakteri *Mycobacterium tuberculosis* yang merusak jaringan paru-paru.' },
      { nama: 'Emfisema', desc: 'Kerusakan dinding alveolus sehingga luas permukaan pertukaran gas berkurang; sering akibat merokok.' },
      { nama: 'Kanker paru-paru', desc: 'Pertumbuhan sel tidak terkendali di paru-paru, faktor risiko utamanya merokok.' },
    ],
    menjaga: [
      'Tidak merokok dan menghindari asap rokok.',
      'Menggunakan masker di tempat berdebu atau berpolusi.',
      'Rutin berolahraga agar kapasitas paru-paru meningkat.',
      'Menjaga ventilasi rumah dan memperbanyak tanaman hijau.',
      'Makan makanan bergizi dan cukup istirahat agar daya tahan tubuh baik.',
    ],
    fakta: [
      'Jika semua alveolus dibentangkan, luasnya hampir sebesar lapangan tenis (±70 m²)!',
      'Paru-paru kanan lebih besar dari kiri karena paru-paru kiri harus berbagi ruang dengan jantung.',
      'Setiap hari kita bernapas sekitar 20.000 kali.',
      'Paru-paru adalah satu-satunya organ yang bisa mengapung di air karena berisi udara.',
    ],
    quiz: [
      { q: 'Zat sisa yang dikeluarkan paru-paru adalah…', options: ['Urea dan air', 'CO₂ dan uap air', 'Garam dan urea', 'Bilirubin'], a: 1, why: 'Paru-paru mengeluarkan karbon dioksida dan uap air saat ekspirasi.' },
      { q: 'Pertukaran gas O₂ dan CO₂ terjadi di…', options: ['Trakea', 'Bronkus', 'Alveolus', 'Diafragma'], a: 2, why: 'Alveolus berdinding tipis dan dikelilingi kapiler, sehingga gas mudah berdifusi.' },
      { q: 'Larutan yang digunakan untuk membuktikan adanya CO₂ pada napas adalah…', options: ['Benedict', 'Air kapur', 'Biuret', 'Lugol'], a: 1, why: 'Air kapur Ca(OH)₂ menjadi keruh karena terbentuk endapan CaCO₃.' },
      { q: 'Sebagian besar CO₂ diangkut dalam darah dalam bentuk…', options: ['Karbaminohemoglobin', 'Ion bikarbonat (HCO₃⁻)', 'CO₂ terlarut', 'Oksihemoglobin'], a: 1, why: 'Sekitar 70% CO₂ diangkut sebagai ion bikarbonat dalam plasma.', level: 'sma' },
      { q: 'Enzim yang mempercepat reaksi CO₂ + H₂O ⇌ H₂CO₃ di eritrosit adalah…', options: ['Amilase', 'Karbonat anhidrase', 'Pepsin', 'Lipase'], a: 1, why: 'Karbonat anhidrase di dalam sel darah merah mempercepat pembentukan asam karbonat.', level: 'sma' },
    ],
    suggestions: ['Apa fungsinya sebagai alat ekskresi?', 'Bagaimana CO₂ dikeluarkan?', 'Bagian ini namanya apa?', 'Penyakit apa saja yang bisa menyerang?', 'Beri aku kuis'],
  },

  ginjal: {
    id: 'ginjal',
    name: 'Ginjal',
    latin: 'Ren / Nephros',
    color: '#B5523B',
    aliases: ['ginjal', 'renal', 'nefron', 'nephron', 'kidney', 'urine', 'urin', 'kencing', 'saluran kemih', 'sistem urinaria'],
    tagline: 'Menyaring darah dan membentuk urine',
    ringkas: {
      smp: 'Ginjal adalah sepasang organ berbentuk seperti **kacang merah** yang berfungsi **menyaring darah** dan membuang zat sisa dalam bentuk **urine**. Urine mengalir dari ginjal → **ureter** → **kandung kemih** → **uretra** → keluar tubuh.',
      sma: 'Unit fungsional terkecil ginjal adalah **nefron** (±1 juta per ginjal). Nefron terdiri atas **badan Malpighi** (glomerulus + kapsul Bowman) dan **tubulus** (tubulus kontortus proksimal, lengkung Henle, tubulus kontortus distal) yang bermuara di tubulus kolektivus.',
    },
    fungsi: {
      smp: 'Fungsi ginjal:\n- **Menyaring darah** dari zat sisa metabolisme seperti **urea, asam urat, dan kreatinin**.\n- Membuang kelebihan **air dan garam** sehingga kadar cairan tubuh seimbang.\n- Mengeluarkan zat racun dan sisa obat.\n- Menghasilkan **urine**.',
      sma: 'Ginjal juga berperan dalam **osmoregulasi** (keseimbangan air & elektrolit), menjaga **pH darah** (sekresi H⁺ dan reabsorpsi HCO₃⁻), mengatur **tekanan darah** (sistem renin–angiotensin–aldosteron), serta menghasilkan hormon **eritropoietin** (merangsang pembentukan sel darah merah) dan mengaktifkan **vitamin D** (kalsitriol).',
    },
    zat: {
      smp: 'Zat sisa yang dikeluarkan ginjal dalam bentuk **urine**:\n- **Urea** (sisa perombakan protein)\n- **Asam urat**\n- **Kreatinin**\n- Kelebihan **air** dan **garam mineral** (misalnya NaCl)\n- Zat warna empedu (urobilin) yang memberi warna kuning pada urine.',
      sma: 'Urine normal tidak mengandung **glukosa**, **protein (albumin)**, maupun **sel darah**. Jika ditemukan, ini menandakan gangguan: glukosa → diabetes melitus (glukosuria), albumin → albuminuria (kerusakan glomerulus), darah → hematuria.',
    },
    proses: {
      smp: 'Pembentukan urine terjadi di **nefron** melalui 3 tahap:\n1. **Filtrasi (penyaringan)** di glomerulus → menghasilkan **urine primer**.\n2. **Reabsorpsi (penyerapan kembali)** di tubulus proksimal → zat yang masih berguna (glukosa, asam amino, air) diserap kembali → menghasilkan **urine sekunder**.\n3. **Augmentasi (pengumpulan/penambahan)** di tubulus distal → zat sisa yang tidak diperlukan ditambahkan → menghasilkan **urine sesungguhnya**.\n\nUrine lalu dialirkan ke pelvis renalis → ureter → kandung kemih → uretra.',
      sma: 'Rincian tiap tahap:\n- **Filtrasi**: terjadi karena tekanan darah tinggi di glomerulus. Filtrat (urine primer) berisi air, glukosa, asam amino, garam, urea; tanpa sel darah dan protein besar. Laju filtrasi ±125 mL/menit (±180 L/hari).\n- **Reabsorpsi**: di tubulus kontortus proksimal glukosa & asam amino diserap secara **transpor aktif**, air secara **osmosis**. Di **lengkung Henle** bagian menurun air diserap, bagian naik Na⁺/Cl⁻ dipompa keluar (mekanisme *countercurrent multiplier*). Urine sekunder mengandung urea lebih pekat.\n- **Augmentasi/sekresi**: di tubulus kontortus distal dikeluarkan H⁺, K⁺, NH₃, kreatinin, dan obat-obatan ke dalam tubulus.\n- Di tubulus kolektivus, reabsorpsi air diatur oleh **ADH (hormon antidiuretik)**; reabsorpsi Na⁺ diatur **aldosteron**. Hasil akhir ±1,5 L urine per hari.',
    },
    struktur: {
      smp: 'Bagian-bagian ginjal (penampang membujur):\n- **Kapsul ginjal**: selaput pembungkus terluar.\n- **Korteks** (kulit ginjal): bagian luar, tempat badan Malpighi.\n- **Medula** (sumsum ginjal): bagian tengah berbentuk **piramida ginjal**.\n- **Pelvis renalis** (rongga ginjal): menampung urine sebelum ke ureter.\n- **Arteri renalis** membawa darah kotor masuk; **vena renalis** membawa darah bersih keluar.\n- **Ureter**: saluran urine menuju kandung kemih.',
      sma: 'Di korteks terdapat glomerulus, kapsul Bowman, serta tubulus kontortus proksimal & distal. Di medula terdapat lengkung Henle dan tubulus kolektivus yang tersusun membentuk piramida dengan ujung (papila) bermuara ke **kaliks minor → kaliks mayor → pelvis renalis**. Di antara piramida terdapat **kolumna renalis** (kolom Bertini) yang dilalui arteri interlobaris.',
    },
    letak: {
      smp: 'Ginjal terletak di **rongga perut bagian belakang**, di kiri dan kanan **tulang belakang** setinggi pinggang. Ginjal kanan letaknya sedikit **lebih rendah** daripada ginjal kiri karena terdesak oleh **hati**.',
    },
    ukuran: {
      smp: 'Setiap ginjal panjangnya sekitar **10–12 cm**, sebesar kepalan tangan, dengan berat ±150 gram. Ginjal menerima sekitar **20–25%** darah yang dipompa jantung.',
    },
    kelainan: [
      { nama: 'Batu ginjal', desc: 'Endapan garam kalsium (kalsium oksalat) atau asam urat yang mengeras di rongga ginjal, sering karena kurang minum.' },
      { nama: 'Nefritis', desc: 'Peradangan nefron (terutama glomerulus), biasanya akibat infeksi bakteri *Streptococcus*.' },
      { nama: 'Diabetes insipidus', desc: 'Urine sangat banyak dan encer karena kekurangan hormon ADH.' },
      { nama: 'Diabetes melitus', desc: 'Urine mengandung glukosa karena kekurangan/gangguan hormon insulin.' },
      { nama: 'Albuminuria', desc: 'Urine mengandung albumin (protein) karena kerusakan alat filtrasi.' },
      { nama: 'Gagal ginjal', desc: 'Ginjal tidak mampu menyaring darah; penanganannya dengan **cuci darah (hemodialisis)** atau transplantasi ginjal.' },
      { nama: 'Infeksi saluran kemih (ISK)', desc: 'Infeksi bakteri pada saluran kemih; sering ditandai nyeri saat buang air kecil.' },
    ],
    menjaga: [
      'Minum air putih yang cukup (±8 gelas atau 2 liter sehari).',
      'Tidak menahan buang air kecil.',
      'Mengurangi makanan terlalu asin dan minuman manis/bersoda.',
      'Tidak mengonsumsi obat atau suplemen sembarangan.',
      'Rutin berolahraga dan menjaga tekanan darah.',
    ],
    fakta: [
      'Ginjal menyaring sekitar 180 liter darah setiap hari, tetapi hanya ±1,5 liter yang menjadi urine.',
      'Kita tetap bisa hidup normal dengan satu ginjal yang sehat.',
      'Setiap ginjal memiliki sekitar 1 juta nefron.',
      'Warna kuning urine berasal dari urobilin, hasil perombakan sel darah merah di hati.',
    ],
    quiz: [
      { q: 'Urutan saluran urine yang benar adalah…', options: ['Ginjal → uretra → kandung kemih → ureter', 'Ginjal → ureter → kandung kemih → uretra', 'Ginjal → kandung kemih → ureter → uretra', 'Ureter → ginjal → uretra → kandung kemih'], a: 1, why: 'Urine dari ginjal mengalir lewat ureter, disimpan di kandung kemih, lalu keluar lewat uretra.' },
      { q: 'Proses penyaringan darah di glomerulus disebut…', options: ['Reabsorpsi', 'Augmentasi', 'Filtrasi', 'Defekasi'], a: 2, why: 'Filtrasi terjadi di glomerulus dan menghasilkan urine primer.' },
      { q: 'Urine primer dihasilkan dari tahap…', options: ['Filtrasi', 'Reabsorpsi', 'Augmentasi', 'Ekspirasi'], a: 0, why: 'Filtrasi di glomerulus menghasilkan urine primer (filtrat glomerulus).' },
      { q: 'Hormon yang mengatur penyerapan kembali air di ginjal adalah…', options: ['Insulin', 'ADH (antidiuretik)', 'Adrenalin', 'Tiroksin'], a: 1, why: 'ADH meningkatkan reabsorpsi air di tubulus distal dan tubulus kolektivus.', level: 'sma' },
      { q: 'Jika urine seseorang mengandung glukosa, kemungkinan ia menderita…', options: ['Diabetes insipidus', 'Diabetes melitus', 'Albuminuria', 'Batu ginjal'], a: 1, why: 'Glukosa dalam urine (glukosuria) adalah tanda diabetes melitus.' },
      { q: 'Lengkung Henle terutama berfungsi untuk…', options: ['Filtrasi darah', 'Memekatkan urine dengan reabsorpsi air & garam', 'Menyimpan urine', 'Menghasilkan empedu'], a: 1, why: 'Lengkung Henle membentuk gradien konsentrasi (countercurrent) sehingga urine menjadi pekat.', level: 'sma' },
    ],
    suggestions: ['Bagaimana urine terbentuk?', 'Zat apa saja yang dikeluarkan?', 'Bagian ini fungsinya apa?', 'Kenapa ginjal kanan lebih rendah?', 'Beri aku kuis'],
  },

  hati: {
    id: 'hati',
    name: 'Hati',
    latin: 'Hepar',
    color: '#8A3A30',
    aliases: ['hati', 'hepar', 'hepatik', 'hepatika', 'liver', 'empedu', 'kantong empedu', 'bilirubin'],
    tagline: 'Menghasilkan empedu dan membentuk urea',
    ringkas: {
      smp: 'Hati adalah **kelenjar terbesar** di tubuh (±1,5 kg). Sebagai alat ekskresi, hati mengeluarkan **cairan empedu** yang berisi zat sisa perombakan sel darah merah, serta membentuk **urea** yang kemudian dibuang oleh ginjal.',
      sma: 'Hati tersusun atas unit fungsional **lobulus hati** berbentuk heksagonal, berisi sel-sel hati (**hepatosit**) yang tersusun radial mengelilingi vena sentralis, dengan **triad porta** (cabang vena porta, arteri hepatika, dan duktus empedu) di setiap sudutnya.',
    },
    fungsi: {
      smp: 'Fungsi hati sebagai alat ekskresi:\n- Menghasilkan **cairan empedu** (berisi bilirubin dan biliverdin) dari perombakan sel darah merah yang sudah tua.\n- Membentuk **urea** dari sisa perombakan protein (amonia).\n- **Menetralkan racun** (detoksifikasi) seperti alkohol dan obat.\n\nFungsi lain: menyimpan **glikogen** (cadangan gula), menyimpan vitamin (A, D, E, K, B12) dan zat besi.',
      sma: 'Fungsi lain hati: membentuk protein plasma (**albumin, fibrinogen, protrombin**), membentuk **heparin** (antikoagulan), mengubah provitamin A menjadi vitamin A, mengatur kadar glukosa darah (glikogenesis–glikogenolisis–glukoneogenesis), serta membentuk kolesterol dan lipoprotein.',
    },
    zat: {
      smp: 'Zat sisa yang dihasilkan hati:\n- **Cairan empedu** berwarna kehijauan, mengandung **bilirubin** (kuning) dan **biliverdin** (hijau).\n- **Urea**, dibentuk di hati lalu dibawa darah ke ginjal untuk dibuang bersama urine.\n\nEmpedu disimpan di **kantong empedu** lalu dialirkan ke usus dua belas jari (duodenum).',
      sma: 'Bilirubin di usus diubah bakteri menjadi **urobilinogen**; sebagian menjadi **sterkobilin** yang memberi warna cokelat pada feses, dan sebagian diserap kembali lalu dikeluarkan ginjal sebagai **urobilin** yang memberi warna kuning urine. Empedu juga mengandung **garam empedu** yang mengemulsikan lemak.',
    },
    proses: {
      smp: 'Proses ekskresi pada hati:\n1. **Pembentukan empedu**: sel darah merah tua (umur ±120 hari) dirombak di hati dan limpa. Hemoglobin dipecah menjadi **hemin** dan **globin**. Hemin diubah menjadi **bilirubin & biliverdin** (zat warna empedu), sedangkan zat besinya disimpan untuk membentuk sel darah merah baru.\n2. **Pembentukan urea**: asam amino yang berlebih dirombak menghasilkan **amonia (NH₃)** yang beracun, lalu hati mengubahnya menjadi **urea** yang lebih aman. Urea dibawa darah ke ginjal.',
      sma: 'Pembentukan urea terjadi melalui **siklus ornitin (siklus urea)**: deaminasi asam amino menghasilkan NH₃, kemudian NH₃ + CO₂ bergabung dengan ornitin → sitrulin → arginin; arginin dipecah oleh enzim **arginase** menjadi urea dan ornitin kembali. Persamaan ringkas: 2NH₃ + CO₂ → CO(NH₂)₂ + H₂O.\n\nPada pembentukan empedu, globin dirombak menjadi asam amino, sedangkan Fe disimpan sebagai **feritin**.',
    },
    struktur: {
      smp: 'Bagian-bagian hati:\n- **Lobus kanan** (besar) dan **lobus kiri** (lebih kecil), dipisahkan **ligamen falsiformis**.\n- **Kantong empedu**: tempat menyimpan cairan empedu.\n- **Saluran empedu** menuju usus dua belas jari.\n- **Vena porta hepatika** membawa darah dari usus (kaya sari makanan) ke hati.\n- **Arteri hepatika** membawa darah kaya oksigen ke hati.',
      sma: 'Hati menerima darah ganda: ±75% dari **vena porta hepatika** dan ±25% dari **arteri hepatika**. Darah keluar melalui **vena hepatika** menuju **vena kava inferior**. Secara anatomi hati juga memiliki lobus kaudatus dan lobus kuadratus di sisi bawahnya.',
    },
    letak: {
      smp: 'Hati terletak di **rongga perut sebelah kanan atas**, tepat di bawah **diafragma**, dan sebagian terlindungi tulang rusuk.',
    },
    ukuran: {
      smp: 'Hati adalah kelenjar terbesar dalam tubuh dengan berat sekitar **1,2–1,5 kg** pada orang dewasa.',
    },
    kelainan: [
      { nama: 'Hepatitis', desc: 'Peradangan hati, umumnya karena virus hepatitis (A, B, C, D, E). Hepatitis B dapat dicegah dengan vaksin.' },
      { nama: 'Penyakit kuning (ikterus)', desc: 'Kulit dan bagian putih mata menguning karena bilirubin menumpuk dalam darah, misalnya akibat saluran empedu tersumbat.' },
      { nama: 'Sirosis hati', desc: 'Jaringan hati rusak dan mengeras menjadi jaringan parut, sering karena alkohol atau hepatitis kronis.' },
      { nama: 'Batu empedu', desc: 'Endapan kolesterol/garam empedu yang mengeras di kantong empedu sehingga menyumbat aliran empedu.' },
      { nama: 'Perlemakan hati', desc: 'Penumpukan lemak berlebih di sel hati akibat pola makan tinggi lemak dan gula atau alkohol.' },
    ],
    menjaga: [
      'Tidak mengonsumsi alkohol.',
      'Melakukan vaksinasi hepatitis B.',
      'Mengurangi makanan berlemak, gorengan, dan gula berlebih.',
      'Mencuci tangan dan menjaga kebersihan makanan untuk mencegah hepatitis A.',
      'Tidak meminum obat sembarangan tanpa resep.',
    ],
    fakta: [
      'Hati adalah satu-satunya organ dalam yang mampu beregenerasi: bisa tumbuh kembali meski tinggal ±25% jaringannya.',
      'Hati menjalankan lebih dari 500 fungsi berbeda.',
      'Sekitar 1,4 liter darah melewati hati setiap menit.',
      'Feses berwarna cokelat karena sterkobilin, hasil olahan zat warna empedu.',
    ],
    quiz: [
      { q: 'Zat warna empedu yang dihasilkan hati adalah…', options: ['Urea dan amonia', 'Bilirubin dan biliverdin', 'Glikogen dan glukosa', 'Kreatinin'], a: 1, why: 'Bilirubin dan biliverdin terbentuk dari perombakan hemoglobin sel darah merah tua.' },
      { q: 'Hati mengubah amonia yang beracun menjadi…', options: ['Urea', 'Glikogen', 'Asam urat', 'Empedu'], a: 0, why: 'Amonia diubah menjadi urea yang kurang beracun, lalu dibuang ginjal.' },
      { q: 'Cairan empedu disimpan di…', options: ['Pankreas', 'Kantong empedu', 'Kandung kemih', 'Lambung'], a: 1, why: 'Kantong empedu menyimpan dan memekatkan empedu sebelum dialirkan ke duodenum.' },
      { q: 'Kulit dan mata menguning akibat penumpukan bilirubin disebut…', options: ['Hepatitis', 'Ikterus', 'Sirosis', 'Albuminuria'], a: 1, why: 'Ikterus (penyakit kuning) terjadi saat bilirubin menumpuk dalam darah.' },
      { q: 'Siklus pembentukan urea di hati disebut…', options: ['Siklus Krebs', 'Siklus ornitin', 'Siklus Calvin', 'Siklus Cori'], a: 1, why: 'Urea dibentuk melalui siklus ornitin (siklus urea) dengan enzim arginase.', level: 'sma' },
    ],
    suggestions: ['Apa fungsi hati dalam ekskresi?', 'Bagaimana empedu terbentuk?', 'Bagian ini apa?', 'Apa itu penyakit kuning?', 'Beri aku kuis'],
  },

  kulit: {
    id: 'kulit',
    name: 'Kulit',
    latin: 'Cutis / Integumen',
    color: '#C98B63',
    aliases: ['kulit', 'cutis', 'integumen', 'keringat', 'berkeringat', 'skin', 'epidermis', 'dermis'],
    tagline: 'Mengeluarkan keringat dan mengatur suhu tubuh',
    ringkas: {
      smp: 'Kulit adalah organ **terluas** di tubuh. Sebagai alat ekskresi, kulit mengeluarkan **keringat** melalui **kelenjar keringat**. Keringat berisi air, garam, dan sedikit urea. Pengeluaran keringat juga membantu **mengatur suhu tubuh**.',
      sma: 'Kulit tersusun atas tiga lapisan: **epidermis** (kulit ari), **dermis** (kulit jangat), dan **hipodermis/jaringan subkutan**. Kelenjar keringat (tipe ekrin) berada di dermis dan bermuara ke permukaan kulit melalui **pori-pori**.',
    },
    fungsi: {
      smp: 'Fungsi kulit:\n- **Alat ekskresi**: mengeluarkan keringat.\n- **Pengatur suhu tubuh** (termoregulasi).\n- **Pelindung** tubuh dari kuman, benturan, dan sinar matahari.\n- **Indra peraba**: merasakan sentuhan, tekanan, panas, dingin, dan nyeri.\n- Tempat pembentukan **vitamin D** dengan bantuan sinar matahari.',
      sma: 'Lapisan lemak di hipodermis berfungsi sebagai **insulator** (penahan panas) dan cadangan energi. Melanin yang dihasilkan **melanosit** di stratum basale melindungi dari radiasi UV. Reseptor kulit: **Meissner** (sentuhan halus), **Pacini** (tekanan), **Ruffini** (panas), **Krause** (dingin), dan **ujung saraf bebas** (nyeri).',
    },
    zat: {
      smp: 'Zat sisa yang dikeluarkan kulit berupa **keringat**, yang mengandung:\n- **Air** (±99%)\n- **Garam mineral**, terutama NaCl (itu sebabnya keringat terasa asin)\n- Sedikit **urea**\n- Sedikit **asam laktat** dan zat sisa lain',
      sma: 'Jumlah keringat bervariasi ±0,5–1 L/hari dan dapat meningkat hingga beberapa liter saat berolahraga di udara panas. Bau badan bukan berasal dari keringat itu sendiri, melainkan dari **bakteri** yang menguraikan keringat dari kelenjar apokrin (di ketiak).',
    },
    proses: {
      smp: 'Proses pengeluaran keringat:\n1. Suhu tubuh naik (karena aktivitas atau cuaca panas).\n2. **Hipotalamus** di otak mendeteksi kenaikan suhu.\n3. Hipotalamus memerintahkan **kelenjar keringat** aktif dan **pembuluh darah** di kulit melebar.\n4. Kelenjar keringat menyerap air, garam, dan sedikit urea dari kapiler darah.\n5. Keringat keluar melalui **saluran keringat** ke **pori-pori**.\n6. Keringat menguap dan membawa panas sehingga tubuh menjadi lebih dingin.',
      sma: 'Mekanisme ini merupakan **umpan balik negatif**. Saat panas terjadi **vasodilatasi** (pembuluh darah melebar → lebih banyak panas dilepas lewat radiasi), sedangkan saat dingin terjadi **vasokonstriksi** dan otot penegak rambut berkontraksi (merinding). Penguapan 1 g keringat melepaskan ±2,4 kJ panas. Kelenjar keringat diatur oleh saraf simpatis.',
    },
    struktur: {
      smp: 'Lapisan kulit:\n- **Epidermis (kulit ari)**: lapisan terluar, tidak memiliki pembuluh darah. Terdiri atas lapisan tanduk (stratum korneum) dan lapisan malpighi.\n- **Dermis (kulit jangat)**: berisi **kelenjar keringat**, **kelenjar minyak**, **akar rambut**, **pembuluh darah**, dan **ujung saraf**.\n- **Hipodermis**: jaringan ikat bawah kulit yang banyak mengandung **lemak**.',
      sma: 'Epidermis dari luar ke dalam: **stratum korneum** (sel mati berisi keratin), **stratum lusidum** (hanya pada telapak tangan & kaki), **stratum granulosum** (berbutir keratohialin), **stratum spinosum**, dan **stratum basale/germinativum** (sel aktif membelah, mengandung melanosit). Dermis terdiri atas lapisan papilar dan retikular yang kaya serat kolagen dan elastin.',
    },
    letak: {
      smp: 'Kulit menutupi **seluruh permukaan tubuh** dengan luas sekitar **1,5–2 m²** pada orang dewasa.',
    },
    ukuran: {
      smp: 'Kulit merupakan organ terberat dan terluas, beratnya sekitar **15–16% berat badan**. Ketebalannya bervariasi: paling tipis di kelopak mata (±0,5 mm) dan paling tebal di telapak kaki (±4 mm).',
    },
    kelainan: [
      { nama: 'Biang keringat (miliaria)', desc: 'Bintik kecil gatal karena saluran keringat tersumbat, sering terjadi pada cuaca panas.' },
      { nama: 'Jerawat', desc: 'Peradangan karena pori/kelenjar minyak tersumbat minyak dan sel kulit mati, lalu terinfeksi bakteri.' },
      { nama: 'Panu', desc: 'Infeksi jamur yang menyebabkan bercak putih atau cokelat pada kulit.' },
      { nama: 'Eksim (dermatitis)', desc: 'Peradangan kulit yang menyebabkan kulit kering, kemerahan, dan gatal.' },
      { nama: 'Kanker kulit', desc: 'Pertumbuhan sel kulit tidak normal, salah satu pemicunya paparan sinar UV berlebihan.' },
      { nama: 'Bau badan', desc: 'Terjadi karena bakteri menguraikan keringat, terutama di ketiak.' },
    ],
    menjaga: [
      'Mandi teratur minimal 2 kali sehari dengan sabun.',
      'Menggunakan tabir surya dan menghindari sinar matahari terik terlalu lama.',
      'Minum air putih yang cukup agar kulit tidak dehidrasi.',
      'Memakai pakaian bersih yang menyerap keringat.',
      'Mengonsumsi buah dan sayur yang kaya vitamin A, C, dan E.',
    ],
    fakta: [
      'Kulit adalah organ terbesar tubuh, luasnya ±2 m².',
      'Manusia memiliki 2–4 juta kelenjar keringat.',
      'Setiap menit kita melepaskan sekitar 30.000–40.000 sel kulit mati.',
      'Lapisan epidermis diperbarui seluruhnya kira-kira setiap 4 minggu.',
    ],
    quiz: [
      { q: 'Zat yang dikeluarkan kulit sebagai alat ekskresi adalah…', options: ['Urine', 'Keringat', 'Empedu', 'CO₂'], a: 1, why: 'Kulit mengeluarkan keringat melalui kelenjar keringat dan pori-pori.' },
      { q: 'Kelenjar keringat terletak pada lapisan…', options: ['Epidermis', 'Dermis', 'Stratum korneum', 'Hipodermis saja'], a: 1, why: 'Kelenjar keringat berada di dermis (kulit jangat).' },
      { q: 'Bagian otak yang mengatur suhu tubuh dan merangsang pengeluaran keringat adalah…', options: ['Serebelum', 'Hipotalamus', 'Medula oblongata', 'Serebrum'], a: 1, why: 'Hipotalamus berfungsi sebagai pusat pengatur suhu tubuh (termostat).' },
      { q: 'Keringat terasa asin karena mengandung…', options: ['Urea', 'NaCl (garam dapur)', 'Glukosa', 'Asam lemak'], a: 1, why: 'Keringat mengandung garam mineral, terutama NaCl.' },
      { q: 'Lapisan epidermis yang selnya aktif membelah dan mengandung melanosit adalah…', options: ['Stratum korneum', 'Stratum lusidum', 'Stratum granulosum', 'Stratum basale'], a: 3, why: 'Stratum basale (germinativum) aktif membelah dan berisi melanosit penghasil melanin.', level: 'sma' },
    ],
    suggestions: ['Apa isi keringat?', 'Bagaimana keringat keluar?', 'Lapisan ini namanya apa?', 'Kenapa keringat bisa bau?', 'Beri aku kuis'],
  },
};

// Bagian-bagian (part) yang dapat dipilih pada model 3D.
export const PARTS = {
  // ===== Paru-paru =====
  trakea: { organ: 'paru', name: 'Trakea', latin: 'Trachea', kw: ['trakea', 'batang tenggorok', 'tenggorokan'], desc: 'Saluran udara (batang tenggorok) yang diperkuat **cincin tulang rawan berbentuk C** agar tidak kempis. Dindingnya dilapisi sel bersilia dan lendir untuk menyaring debu.', sma: 'Panjang trakea ±10–12 cm. Silia bergerak ke arah atas (eskalator mukosiliar) mendorong lendir dan partikel keluar.' },
  bronkus: { organ: 'paru', name: 'Bronkus', latin: 'Bronchus', kw: ['bronkus', 'bronchus', 'cabang tenggorok'], desc: 'Cabang trakea yang menuju paru-paru kanan dan kiri. Bronkus kanan lebih pendek, lebar, dan tegak daripada bronkus kiri.', sma: 'Bronkus primer bercabang menjadi bronkus lobaris (3 di kanan, 2 di kiri) lalu bronkus segmental.' },
  bronkiolus: { organ: 'paru', name: 'Bronkiolus', latin: 'Bronchiolus', kw: ['bronkiolus', 'bronkioli', 'bronchiolus'], desc: 'Cabang-cabang kecil bronkus di dalam paru-paru. Dindingnya tidak lagi memiliki tulang rawan, tetapi memiliki otot polos.', sma: 'Ujung bronkiolus (bronkiolus respiratorius) bermuara ke duktus alveolaris dan kantong alveolus.' },
  alveolus: { organ: 'paru', name: 'Alveolus', latin: 'Alveolus pulmonis', kw: ['alveolus', 'alveoli', 'gelembung paru'], desc: 'Gelembung udara kecil berdinding sangat tipis yang dikelilingi kapiler darah. Di sinilah **CO₂ dikeluarkan dari darah** dan O₂ masuk ke darah secara **difusi**.', sma: 'Dinding alveolus terdiri atas sel pneumosit tipe I (pertukaran gas) dan tipe II (penghasil surfaktan). Difusi CO₂ terjadi karena tekanan parsial CO₂ di kapiler (±45 mmHg) lebih tinggi daripada di alveolus (±40 mmHg).' },
  'kapiler-alveolus': { organ: 'paru', name: 'Kapiler alveolus', latin: 'Capillaria pulmonalis', kw: ['kapiler alveolus', 'kapiler paru'], desc: 'Jaring pembuluh darah halus yang membungkus alveolus. Darah datang membawa banyak CO₂ (biru) dan pergi membawa banyak O₂ (merah).', sma: 'CO₂ dilepaskan dari HCO₃⁻ dan karbaminohemoglobin, lalu berdifusi ke alveolus.' },
  'lobus-atas-kanan': { organ: 'paru', name: 'Lobus atas paru kanan', latin: 'Lobus superior dexter', kw: ['lobus atas kanan'], desc: 'Salah satu dari **3 lobus** paru-paru kanan. Dipisahkan dari lobus tengah oleh fisura horizontal.' },
  'lobus-tengah-kanan': { organ: 'paru', name: 'Lobus tengah paru kanan', latin: 'Lobus medius', kw: ['lobus tengah'], desc: 'Lobus tengah hanya dimiliki paru-paru **kanan**. Paru-paru kiri tidak memiliki lobus tengah karena tempatnya digunakan jantung.' },
  'lobus-bawah-kanan': { organ: 'paru', name: 'Lobus bawah paru kanan', latin: 'Lobus inferior dexter', kw: ['lobus bawah kanan'], desc: 'Lobus terbawah paru-paru kanan yang menempel pada diafragma, dipisahkan oleh fisura oblik.' },
  'lobus-atas-kiri': { organ: 'paru', name: 'Lobus atas paru kiri', latin: 'Lobus superior sinister', kw: ['lobus atas kiri'], desc: 'Paru-paru kiri hanya memiliki **2 lobus**. Lobus atasnya memiliki lekukan tempat jantung (takik jantung).' },
  'lobus-bawah-kiri': { organ: 'paru', name: 'Lobus bawah paru kiri', latin: 'Lobus inferior sinister', kw: ['lobus bawah kiri'], desc: 'Lobus bawah paru-paru kiri yang berbatasan dengan diafragma.' },
  'arteri-pulmonalis': { organ: 'paru', name: 'Arteri pulmonalis', latin: 'Arteria pulmonalis', kw: ['arteri pulmonalis', 'arteri paru'], desc: 'Pembuluh yang membawa darah **kaya CO₂** dari jantung ke paru-paru. Satu-satunya arteri yang membawa darah miskin oksigen.' },
  'vena-pulmonalis': { organ: 'paru', name: 'Vena pulmonalis', latin: 'Vena pulmonalis', kw: ['vena pulmonalis', 'vena paru'], desc: 'Pembuluh yang membawa darah **kaya O₂** dari paru-paru kembali ke jantung setelah CO₂ dibuang.' },
  diafragma: { organ: 'paru', name: 'Diafragma', latin: 'Diaphragma', kw: ['diafragma', 'sekat rongga badan'], desc: 'Otot berbentuk kubah yang memisahkan rongga dada dan perut. Saat **ekspirasi** diafragma melemas dan melengkung ke atas sehingga udara berisi CO₂ terdorong keluar.', sma: 'Pernapasan perut: inspirasi = diafragma berkontraksi (mendatar), volume rongga dada membesar, tekanan turun, udara masuk. Ekspirasi = kebalikannya.' },

  // ===== Ginjal =====
  'kapsul-ginjal': { organ: 'ginjal', name: 'Kapsul ginjal', latin: 'Capsula fibrosa', kw: ['kapsul ginjal', 'simpai ginjal', 'selaput ginjal'], desc: 'Selaput jaringan ikat tipis dan kuat yang membungkus ginjal untuk melindunginya dari benturan dan infeksi.' },
  korteks: { organ: 'ginjal', name: 'Korteks ginjal', latin: 'Cortex renalis', kw: ['korteks', 'kulit ginjal', 'cortex'], desc: 'Lapisan **luar** ginjal yang berbintik-bintik. Di sinilah terdapat jutaan **badan Malpighi** (glomerulus + kapsul Bowman) tempat **filtrasi** darah.', sma: 'Korteks juga berisi tubulus kontortus proksimal dan distal. Bagian korteks yang menjorok di antara piramida disebut kolumna renalis.' },
  medula: { organ: 'ginjal', name: 'Medula ginjal (piramida)', latin: 'Medulla renalis', kw: ['medula', 'sumsum ginjal', 'piramida', 'piramid ginjal'], desc: 'Bagian tengah ginjal yang tersusun dari **piramida ginjal** bergaris-garis. Garis-garis itu adalah saluran (lengkung Henle dan tubulus kolektivus) yang mengalirkan urine.', sma: 'Setiap ginjal memiliki 8–18 piramida. Ujung piramida (papila renalis) meneteskan urine ke kaliks minor. Gradien konsentrasi garam di medula memungkinkan urine dipekatkan.' },
  'pelvis-renalis': { organ: 'ginjal', name: 'Pelvis renalis', latin: 'Pelvis renalis', kw: ['pelvis', 'rongga ginjal', 'piala ginjal', 'kaliks', 'calyx'], desc: 'Rongga berbentuk corong yang **menampung urine** dari piramida (melalui kaliks) sebelum dialirkan ke ureter.' },
  'arteri-renalis': { organ: 'ginjal', name: 'Arteri renalis', latin: 'Arteria renalis', kw: ['arteri renalis', 'arteri ginjal', 'nadi ginjal'], desc: 'Pembuluh nadi cabang aorta yang membawa **darah kotor** (banyak zat sisa) masuk ke ginjal untuk disaring.', sma: 'Di dalam ginjal bercabang menjadi arteri interlobaris → arkuata → interlobularis → arteriol aferen → glomerulus.' },
  'vena-renalis': { organ: 'ginjal', name: 'Vena renalis', latin: 'Vena renalis', kw: ['vena renalis', 'vena ginjal', 'balik ginjal'], desc: 'Pembuluh balik yang membawa **darah bersih** (sudah disaring) keluar dari ginjal menuju vena kava inferior.' },
  ureter: { organ: 'ginjal', name: 'Ureter', latin: 'Ureter', kw: ['ureter', 'saluran ginjal'], desc: 'Saluran sepanjang ±25–30 cm yang mengalirkan urine dari ginjal ke **kandung kemih** dengan gerakan peristaltik.' },
  'kandung-kemih': { organ: 'ginjal', name: 'Kandung kemih', latin: 'Vesica urinaria', kw: ['kandung kemih', 'vesika urinaria', 'kantong kemih', 'kantung kemih'], desc: 'Kantong berotot elastis yang **menyimpan urine** sementara. Saat terisi ±300–400 mL, timbul rasa ingin buang air kecil.' },
  uretra: { organ: 'ginjal', name: 'Uretra', latin: 'Urethra', kw: ['uretra', 'saluran kencing'], desc: 'Saluran terakhir yang mengeluarkan urine dari kandung kemih ke **luar tubuh**.' },
  'kelenjar-adrenal': { organ: 'ginjal', name: 'Kelenjar adrenal', latin: 'Glandula suprarenalis', kw: ['adrenal', 'anak ginjal', 'suprarenal'], desc: 'Kelenjar di atas ginjal (**anak ginjal**). Bukan alat ekskresi, melainkan kelenjar hormon yang menghasilkan adrenalin dan **aldosteron** (mengatur penyerapan garam di ginjal).' },
  aorta: { organ: 'ginjal', name: 'Aorta abdominalis', latin: 'Aorta abdominalis', kw: ['aorta'], desc: 'Pembuluh nadi terbesar. Cabangnya (arteri renalis) menyuplai darah ke ginjal.' },
  'vena-kava': { organ: 'ginjal', name: 'Vena kava inferior', latin: 'Vena cava inferior', kw: ['vena kava', 'vena cava'], desc: 'Pembuluh balik besar yang membawa darah dari tubuh bagian bawah, termasuk darah bersih dari ginjal, kembali ke jantung.' },

  // ===== Nefron =====
  glomerulus: { organ: 'ginjal', model: 'nefron', name: 'Glomerulus', latin: 'Glomerulus', kw: ['glomerulus', 'glomeruli'], desc: 'Gulungan kapiler darah di dalam kapsul Bowman. Di sinilah terjadi **filtrasi**: air, glukosa, garam, asam amino, dan urea tersaring keluar dari darah membentuk **urine primer**.', sma: 'Tekanan darah di glomerulus tinggi karena diameter arteriol aferen lebih besar daripada eferen. Sel darah dan protein besar tidak dapat lolos.' },
  'kapsul-bowman': { organ: 'ginjal', model: 'nefron', name: 'Kapsul Bowman', latin: 'Capsula glomerularis', kw: ['bowman', 'kapsul bowman', 'badan malpighi'], desc: 'Mangkuk berdinding ganda yang membungkus glomerulus dan **menampung hasil filtrasi** (urine primer). Glomerulus + kapsul Bowman = **badan Malpighi**.' },
  'tubulus-proksimal': { organ: 'ginjal', model: 'nefron', name: 'Tubulus kontortus proksimal', latin: 'Tubulus contortus proximalis', kw: ['tubulus proksimal', 'tubulus kontortus proksimal', 'proksimal'], desc: 'Saluran berkelok tempat **reabsorpsi** utama: glukosa, asam amino, air, dan garam yang masih berguna diserap kembali ke darah. Hasilnya **urine sekunder**.', sma: 'Sekitar 65% air dan Na⁺ serta ±100% glukosa diserap kembali di sini. Selnya memiliki mikrovili (brush border) dan banyak mitokondria untuk transpor aktif.' },
  'lengkung-henle': { organ: 'ginjal', model: 'nefron', name: 'Lengkung Henle', latin: 'Ansa nephroni', kw: ['henle', 'lengkung henle', 'ansa henle'], desc: 'Saluran berbentuk huruf **U** yang masuk ke medula. Bagian ini menyerap kembali air dan garam sehingga urine menjadi **lebih pekat**.', sma: 'Bagian menurun permeabel terhadap air (air keluar secara osmosis); bagian naik tidak permeabel air tetapi memompa Na⁺/Cl⁻ keluar → mekanisme *countercurrent multiplier*.' },
  'bagian-menurun': { organ: 'ginjal', model: 'nefron', name: 'Lengkung Henle bagian menurun', latin: 'Pars descendens ansae nephroni', kw: ['bagian menurun', 'henle menurun', 'descending'], desc: 'Bagian lengkung Henle yang turun ke medula. Dindingnya mudah dilalui **air**, sehingga air diserap kembali (reabsorpsi) dan filtrat menjadi lebih pekat.' },
  'bagian-menaik': { organ: 'ginjal', model: 'nefron', name: 'Lengkung Henle bagian menaik', latin: 'Pars ascendens ansae nephroni', kw: ['bagian menaik', 'henle menaik', 'ascending'], desc: 'Bagian lengkung Henle yang naik kembali ke korteks (bagian atasnya lebih tebal). Di sini **garam (Na⁺, Cl⁻)** dipompa keluar, tetapi air tidak dapat lewat.' },
  venula: { organ: 'ginjal', model: 'nefron', name: 'Pembuluh balik (venula)', latin: 'Venula', kw: ['venula', 'pembuluh balik nefron'], desc: 'Pembuluh balik yang membawa **darah bersih** dari kapiler di sekitar nefron menuju vena renalis. Darah ini sudah membawa kembali zat-zat berguna hasil reabsorpsi.' },
  'tubulus-distal': { organ: 'ginjal', model: 'nefron', name: 'Tubulus kontortus distal', latin: 'Tubulus contortus distalis', kw: ['tubulus distal', 'tubulus kontortus distal', 'distal'], desc: 'Saluran berkelok tempat **augmentasi**: zat sisa seperti H⁺, K⁺, NH₃, dan kreatinin ditambahkan ke dalam urine. Hasilnya **urine sesungguhnya**.', sma: 'Reabsorpsi Na⁺ di sini diatur oleh hormon aldosteron; reabsorpsi air diatur ADH.' },
  'tubulus-kolektivus': { organ: 'ginjal', model: 'nefron', name: 'Tubulus kolektivus', latin: 'Ductus colligens', kw: ['kolektivus', 'tubulus pengumpul', 'saluran pengumpul', 'duktus kolektivus'], desc: 'Saluran pengumpul yang menampung urine dari banyak nefron dan mengalirkannya ke pelvis renalis.', sma: 'Permeabilitasnya terhadap air diatur ADH melalui kanal **aquaporin**: ADH tinggi → urine sedikit dan pekat.' },
  'arteriol-aferen': { organ: 'ginjal', model: 'nefron', name: 'Arteriol aferen', latin: 'Arteriola glomerularis afferens', kw: ['aferen', 'afferent'], desc: 'Pembuluh darah kecil yang **membawa darah masuk** ke glomerulus untuk disaring.' },
  'arteriol-eferen': { organ: 'ginjal', model: 'nefron', name: 'Arteriol eferen', latin: 'Arteriola glomerularis efferens', kw: ['eferen', 'efferent'], desc: 'Pembuluh darah yang **membawa darah keluar** dari glomerulus. Diameternya lebih kecil sehingga tekanan di glomerulus tinggi.' },
  'kapiler-peritubulus': { organ: 'ginjal', model: 'nefron', name: 'Kapiler peritubulus', latin: 'Capillaria peritubularia', kw: ['peritubulus', 'kapiler peritubular', 'vasa recta'], desc: 'Jaring kapiler yang melilit tubulus. Zat hasil reabsorpsi masuk kembali ke darah melalui kapiler ini, dan zat sisa augmentasi berasal dari sini.' },

  // ===== Hati =====
  'lobus-kanan-hati': { organ: 'hati', name: 'Lobus kanan hati', latin: 'Lobus hepatis dexter', kw: ['lobus kanan hati', 'lobus kanan'], desc: 'Bagian hati yang **paling besar** (sekitar 5/6 bagian hati). Di sisi bawahnya menempel kantong empedu.' },
  'lobus-kiri-hati': { organ: 'hati', name: 'Lobus kiri hati', latin: 'Lobus hepatis sinister', kw: ['lobus kiri hati', 'lobus kiri'], desc: 'Bagian hati yang lebih kecil dan pipih, terletak di sebelah kiri ligamen falsiformis, di atas lambung.' },
  'ligamen-falsiformis': { organ: 'hati', name: 'Ligamen falsiformis', latin: 'Ligamentum falciforme', kw: ['falsiformis', 'ligamen'], desc: 'Lipatan jaringan tipis berbentuk sabit yang memisahkan lobus kanan dan kiri serta menggantung hati pada dinding perut.' },
  'kantong-empedu': { organ: 'hati', name: 'Kantong empedu', latin: 'Vesica biliaris (fellea)', kw: ['kantong empedu', 'kantung empedu', 'vesika felea', 'kandung empedu'], desc: 'Kantong berwarna hijau tempat **menyimpan dan memekatkan cairan empedu** yang dihasilkan hati.', sma: 'Saat makanan berlemak masuk duodenum, hormon kolesistokinin (CCK) membuat kantong empedu berkontraksi mengeluarkan empedu.' },
  'saluran-empedu': { organ: 'hati', name: 'Saluran empedu', latin: 'Ductus choledochus', kw: ['saluran empedu', 'duktus koledokus', 'duktus empedu'], desc: 'Saluran yang mengalirkan empedu dari hati dan kantong empedu ke **usus dua belas jari** (duodenum).' },
  'vena-porta': { organ: 'hati', name: 'Vena porta hepatika', latin: 'Vena portae hepatis', kw: ['vena porta', 'porta hepatika'], desc: 'Pembuluh yang membawa darah **kaya sari makanan dan zat sisa** dari usus dan limpa ke hati untuk diolah dan dinetralkan.' },
  'arteri-hepatika': { organ: 'hati', name: 'Arteri hepatika', latin: 'Arteria hepatica propria', kw: ['arteri hepatika', 'arteri hati'], desc: 'Pembuluh nadi yang membawa **darah kaya oksigen** untuk sel-sel hati.' },
  'vena-kava-hati': { organ: 'hati', name: 'Vena kava inferior', latin: 'Vena cava inferior', kw: ['vena kava inferior'], desc: 'Pembuluh balik besar di belakang hati. Darah yang sudah diolah hati masuk ke sini melalui vena hepatika, lalu kembali ke jantung.' },
  'vena-hepatika': { organ: 'hati', name: 'Vena hepatika', latin: 'Venae hepaticae', kw: ['vena hepatika'], desc: 'Pembuluh balik di dalam hati yang mengalirkan darah yang sudah diolah ke vena kava inferior.' },
  lobulus: { organ: 'hati', name: 'Lobulus hati', latin: 'Lobulus hepatis', kw: ['lobulus', 'hepatosit', 'sel hati'], desc: 'Unit terkecil hati berbentuk **segi enam**. Sel-sel hati (hepatosit) tersusun mengelilingi **vena sentralis**; di tiap sudut ada cabang vena porta, arteri hepatika, dan saluran empedu.', sma: 'Darah mengalir dari triad porta melalui sinusoid menuju vena sentralis, sedangkan empedu mengalir berlawanan arah melalui kanalikuli empedu menuju duktus empedu. Sel Kupffer di sinusoid memakan sel darah merah tua dan kuman.' },

  // ===== Kulit =====
  'stratum-korneum': { organ: 'kulit', name: 'Stratum korneum (lapisan tanduk)', latin: 'Stratum corneum', kw: ['korneum', 'lapisan tanduk', 'corneum'], desc: 'Lapisan epidermis **paling luar**, berisi sel-sel mati yang mengandung **keratin**. Selalu mengelupas dan diganti sel baru.' },
  'stratum-lusidum': { organ: 'kulit', name: 'Stratum lusidum', latin: 'Stratum lucidum', kw: ['lusidum', 'lucidum'], desc: 'Lapisan bening di bawah lapisan tanduk; hanya ada pada kulit tebal seperti **telapak tangan dan kaki**.' },
  'stratum-granulosum': { organ: 'kulit', name: 'Stratum granulosum', latin: 'Stratum granulosum', kw: ['granulosum', 'lapisan berbutir'], desc: 'Lapisan berbutir yang mengandung butiran keratohialin, tempat sel mulai mengeras dan mati.' },
  'stratum-spinosum': { organ: 'kulit', name: 'Stratum spinosum', latin: 'Stratum spinosum', kw: ['spinosum', 'lapisan taju'], desc: 'Lapisan sel bertaju (berduri) yang saling berikatan kuat sehingga kulit lentur dan kokoh.' },
  'stratum-basale': { organ: 'kulit', name: 'Stratum basale (germinativum)', latin: 'Stratum basale', kw: ['basale', 'germinativum', 'lapisan benih', 'melanosit', 'melanin'], desc: 'Lapisan epidermis terdalam yang **selalu membelah** membentuk sel baru. Mengandung **melanosit** penghasil pigmen melanin (warna kulit).' },
  dermis: { organ: 'kulit', name: 'Dermis (kulit jangat)', latin: 'Dermis', kw: ['dermis', 'kulit jangat'], desc: 'Lapisan di bawah epidermis yang tebal dan elastis. Di sini terdapat **kelenjar keringat**, kelenjar minyak, akar rambut, pembuluh darah, dan ujung saraf.', sma: 'Tersusun atas serat kolagen dan elastin. Lapisan papilar membentuk tonjolan (papila dermis) yang menghasilkan sidik jari.' },
  hipodermis: { organ: 'kulit', name: 'Hipodermis (jaringan lemak)', latin: 'Hypodermis / Subcutis', kw: ['hipodermis', 'subkutan', 'jaringan lemak', 'lemak'], desc: 'Lapisan terdalam kulit yang berisi **jaringan lemak**. Berfungsi menahan panas tubuh, cadangan energi, dan peredam benturan.' },
  'kelenjar-keringat': { organ: 'kulit', name: 'Kelenjar keringat', latin: 'Glandula sudorifera', kw: ['kelenjar keringat', 'glandula sudorifera', 'sudorifera', 'ekrin', 'apokrin'], desc: 'Kelenjar berbentuk **tabung bergulung** di dermis. Kelenjar ini menyerap air, garam, dan sedikit urea dari kapiler darah lalu mengeluarkannya sebagai **keringat** melalui saluran keringat.', sma: 'Ada dua tipe: **ekrin** (tersebar di seluruh tubuh, untuk termoregulasi) dan **apokrin** (di ketiak & kelamin, aktif sejak pubertas, menghasilkan keringat kental yang bisa berbau karena bakteri).' },
  pori: { organ: 'kulit', name: 'Pori-pori & saluran keringat', latin: 'Porus sudoriferus', kw: ['pori', 'pori-pori', 'saluran keringat'], desc: 'Lubang kecil di permukaan kulit tempat **keringat keluar**. Saluran keringat berbentuk spiral menembus epidermis.' },
  rambut: { organ: 'kulit', name: 'Batang rambut', latin: 'Scapus pili', kw: ['rambut', 'batang rambut'], desc: 'Bagian rambut yang tampak di luar kulit, tersusun dari sel mati berisi keratin.' },
  'folikel-rambut': { organ: 'kulit', name: 'Folikel / akar rambut', latin: 'Folliculus pili', kw: ['folikel', 'akar rambut', 'kantong rambut'], desc: 'Kantong tempat tumbuhnya rambut. Di dasarnya ada **papila rambut** yang berisi pembuluh darah untuk memberi makan rambut.' },
  'kelenjar-minyak': { organ: 'kulit', name: 'Kelenjar minyak', latin: 'Glandula sebacea', kw: ['kelenjar minyak', 'sebasea', 'sebum'], desc: 'Kelenjar di samping akar rambut yang menghasilkan **minyak (sebum)** agar kulit dan rambut tidak kering. Bukan termasuk alat ekskresi.' },
  'otot-penegak-rambut': { organ: 'kulit', name: 'Otot penegak rambut', latin: 'Musculus arrector pili', kw: ['otot penegak rambut', 'arrector pili', 'merinding'], desc: 'Otot kecil yang menempel pada folikel. Saat dingin atau takut, otot ini berkontraksi sehingga rambut berdiri (**merinding**) untuk menahan panas.' },
  'pembuluh-darah-kulit': { organ: 'kulit', name: 'Pembuluh darah kulit', latin: 'Vasa sanguinea', kw: ['pembuluh darah kulit', 'kapiler kulit'], desc: 'Arteri (merah) dan vena (biru) di dermis. Saat panas pembuluh **melebar** (kulit memerah) untuk melepas panas; saat dingin **menyempit**.' },
  'saraf-kulit': { organ: 'kulit', name: 'Saraf & reseptor', latin: 'Nervi cutanei', kw: ['saraf kulit', 'reseptor', 'pacini', 'meissner', 'ruffini', 'krause'], desc: 'Ujung saraf yang membuat kulit menjadi **indra peraba**: merasakan sentuhan (Meissner), tekanan (Pacini), panas (Ruffini), dingin (Krause), dan nyeri (ujung saraf bebas).' },
};

// Daftar model 3D yang dapat ditampilkan.
export const MODELS = [
  { id: 'paru', organ: 'paru', label: 'Paru-paru', short: 'Paru' },
  { id: 'ginjal', organ: 'ginjal', label: 'Ginjal', short: 'Ginjal' },
  { id: 'nefron', organ: 'ginjal', label: 'Nefron', short: 'Nefron', sub: true },
  { id: 'hati', organ: 'hati', label: 'Hati', short: 'Hati' },
  { id: 'kulit', organ: 'kulit', label: 'Kulit', short: 'Kulit' },
];

export const GENERAL = {
  ekskresi: {
    smp: '**Sistem ekskresi** adalah sistem yang berfungsi **mengeluarkan zat sisa metabolisme** yang tidak berguna lagi bagi tubuh. Organ-organ ekskresi pada manusia:\n- **Ginjal** → urine (urea, asam urat, kreatinin, air, garam)\n- **Paru-paru** → CO₂ dan uap air\n- **Hati** → cairan empedu dan pembentukan urea\n- **Kulit** → keringat (air, garam, sedikit urea)',
    sma: 'Jika zat sisa menumpuk, tubuh dapat keracunan dan homeostasis terganggu (misalnya pH, kadar air, dan elektrolit darah). Karena itu sistem ekskresi berperan penting dalam menjaga **homeostasis**.',
  },
  beda: {
    smp: 'Perbedaan istilah pengeluaran zat:\n- **Ekskresi**: pengeluaran zat sisa metabolisme yang tidak berguna (urine, keringat, CO₂).\n- **Sekresi**: pengeluaran zat yang **masih berguna** bagi tubuh (enzim, hormon, empedu sebagai pengemulsi lemak).\n- **Defekasi**: pengeluaran sisa pencernaan (feses) — **bukan** hasil metabolisme sel.\n- **Egesti**: istilah lain untuk pengeluaran sisa makanan yang tidak tercerna.',
  },
};

export const SUBSTANCES = [
  { kw: ['urea'], text: '**Urea** dibentuk di **hati** (dari amonia sisa perombakan protein), lalu dibuang terutama oleh **ginjal** bersama urine dan sebagian kecil oleh **kulit** bersama keringat.', organs: ['hati', 'ginjal', 'kulit'] },
  { kw: ['karbon dioksida', 'co2', 'co₂'], text: '**Karbon dioksida (CO₂)** dikeluarkan oleh **paru-paru** saat ekspirasi (menghembuskan napas).', organs: ['paru'] },
  { kw: ['uap air'], text: '**Uap air** dikeluarkan oleh **paru-paru** bersama napas. Air dalam bentuk cair juga dikeluarkan ginjal (urine) dan kulit (keringat).', organs: ['paru'] },
  { kw: ['keringat'], text: '**Keringat** dikeluarkan oleh **kelenjar keringat di kulit** melalui pori-pori.', organs: ['kulit'] },
  { kw: ['empedu', 'bilirubin', 'biliverdin'], text: '**Cairan empedu** (bilirubin & biliverdin) dihasilkan oleh **hati**, disimpan di kantong empedu, lalu dialirkan ke usus dua belas jari.', organs: ['hati'] },
  { kw: ['urine', 'urin', 'air kencing', 'air seni'], text: '**Urine** dibentuk oleh **ginjal** di dalam nefron, lalu dialirkan melalui ureter ke kandung kemih dan dikeluarkan lewat uretra.', organs: ['ginjal'] },
  { kw: ['asam urat', 'kreatinin'], text: '**Asam urat** dan **kreatinin** dibuang oleh **ginjal** bersama urine.', organs: ['ginjal'] },
  { kw: ['amonia', 'nh3', 'amoniak'], text: '**Amonia (NH₃)** bersifat racun; **hati** mengubahnya menjadi urea, kemudian **ginjal** membuangnya.', organs: ['hati', 'ginjal'] },
];
