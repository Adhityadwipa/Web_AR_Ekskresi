// Mesin tanya-jawab lokal yang sadar konteks (context-aware).
// Jika pertanyaan tidak menyebut organ/bagian, jawaban diarahkan ke objek 3D
// yang sedang diamati pengguna (dipilih, atau dibidik kamera di mode AR).
import { ORGANS, PARTS, MODELS, GENERAL, SUBSTANCES } from '../data/knowledge.js';
import { observedPart } from '../state.js';

export const norm = (s) =>
  s.toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[?!.,;:()"'`*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const reCache = new Map();
/** Cocok jika kata kunci muncul di awal kata (agar "fungsinya" cocok dengan "fungsi"). */
export function has(q, kw) {
  let re = reCache.get(kw);
  if (!re) { re = new RegExp(`(^|[\\s-])${esc(kw)}`); reCache.set(kw, re); }
  return re.test(q);
}

const INTENTS = {
  fungsi: ['fungsi', 'kegunaan', 'guna', 'peran', 'berperan', 'tugas', 'manfaat', 'untuk apa', 'buat apa', 'kerjanya', 'berfungsi'],
  zat: ['zat', 'dikeluarkan', 'mengeluarkan', 'dibuang', 'membuang', 'menghasilkan', 'dihasilkan', 'sisa', 'hasil ekskresi', 'keluarkan', 'kandungan', 'mengandung', 'isi', 'komposisi'],
  proses: ['proses', 'bagaimana', 'gimana', 'cara kerja', 'mekanisme', 'tahap', 'terbentuk', 'pembentukan', 'terjadi', 'alur', 'urutan', 'jalannya', 'bisa keluar', 'mengapa', 'kenapa'],
  struktur: ['bagian', 'struktur', 'terdiri', 'anatomi', 'lapisan', 'susunan', 'komponen', 'tersusun'],
  kelainan: ['bau', 'penyakit', 'kelainan', 'gangguan', 'sakit', 'gejala', 'masalah', 'kerusakan', 'rusak'],
  menjaga: ['menjaga', 'merawat', 'jaga', 'rawat', 'sehat', 'kesehatan', 'pencegahan', 'mencegah', 'tips', 'agar tetap', 'supaya tetap'],
  letak: ['lebih rendah', 'lebih tinggi', 'letak', 'terletak', 'dimana', 'di mana', 'posisi', 'lokasi', 'berada', 'letaknya'],
  ukuran: ['berat', 'ukuran', 'besar', 'panjang', 'seberapa', 'berapa', 'luas', 'jumlah'],
  fakta: ['fakta', 'menarik', 'unik', 'tahukah', 'trivia', 'keren'],
  definisi: ['apa itu', 'pengertian', 'definisi', 'jelaskan', 'apa sih', 'maksud', 'artinya', 'ceritakan', 'tentang', 'apa yang dimaksud', 'terangkan'],
  quiz: ['kuis', 'quiz', 'soal', 'latihan', 'uji aku', 'uji saya', 'tes aku', 'tes saya', 'tebak'],
  beda: ['beda', 'perbedaan', 'bedanya', 'membedakan', 'bandingkan', 'dibandingkan', 'vs', 'versus'],
  nama: ['bagian apa', 'lapisan apa', 'namanya apa', 'nama bagian', 'apa nama', 'ini apa', 'apa ini', 'ini namanya', 'nama organ', 'organ apa ini', 'sedang aku lihat', 'sedang kulihat', 'sedang saya lihat', 'yang aku amati', 'yang kuamati', 'sedang diamati'],
};
// kata tanya umum: bobot rendah agar kata kunci spesifik lebih menentukan
const WEAK = new Set(['bagaimana', 'gimana', 'kenapa', 'mengapa', 'berapa', 'besar', 'isi', 'tentang', 'jelaskan']);
const GREET = ['halo', 'hai', 'hi', 'hello', 'hey', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'assalamualaikum', 'pagi kak', 'permisi'];
const THANKS = ['terima kasih', 'makasih', 'thanks', 'thank you', 'thx', 'trims', 'mantap', 'oke paham', 'siap paham'];
const DEICTIC = ['ini', 'itu', 'tersebut', 'yang ini', 'bagian ini', 'organ ini', 'yang dipilih', 'yang sedang', 'yang aku lihat', 'yang kulihat', 'yang diamati', 'sini', 'tadi'];
const TOPIC = ['ekskresi', 'ekskretori', 'organ', 'tubuh', 'metabolisme', 'homeostasis', 'darah', 'zat sisa', 'racun', 'buang air', 'napas', 'nafas', 'suhu'];

const organAliases = Object.values(ORGANS).flatMap((o) => o.aliases.map((a) => ({ id: o.id, kw: norm(a) })))
  .sort((a, b) => b.kw.length - a.kw.length);
const partKeys = Object.entries(PARTS).flatMap(([id, p]) => [...p.kw, p.name].map((k) => ({ id, kw: norm(k.split('(')[0]) })))
  .sort((a, b) => b.kw.length - a.kw.length);

export function detectOrgans(q) {
  const found = [];
  for (const { id, kw } of organAliases) if (has(q, kw) && !found.includes(id)) found.push(id);
  return found;
}
export function detectPart(q) {
  for (const { id, kw } of partKeys) if (kw.length > 2 && has(q, kw)) return id;
  return null;
}
function scoreIntents(q) {
  const scores = {};
  for (const [k, kws] of Object.entries(INTENTS)) {
    const s = kws.reduce((n, kw) => n + (has(q, kw) ? (WEAK.has(kw) ? 0.5 : 1 + kw.length / 20) : 0), 0);
    if (s) scores[k] = s;
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}
const isDeictic = (q) => DEICTIC.some((d) => has(q, d)) || /\w+nya(\s|$)/.test(q);

const lv = (x, level) => {
  if (!x) return '';
  if (typeof x === 'string') return x;
  return level === 'sma' && x.sma ? `${x.smp}\n\n**Pendalaman SMA:** ${x.sma}` : x.smp;
};
const modelOf = (organ, part) => (part && PARTS[part]?.model) || organ;
export const modelLabel = (id) => MODELS.find((m) => m.id === id)?.label || id;

/**
 * Tentukan target pertanyaan + apakah target disimpulkan dari konteks.
 * Dipakai juga untuk mode AI agar UI dapat menampilkan label konteks.
 */
export function resolve(question, c) {
  const q = norm(question);
  const intents = scoreIntents(q);
  const organs = detectOrgans(q);
  const part = detectPart(q);
  const seen = observedPart(c);
  let target = { organ: c.organ, part: null, inferred: true };
  if (part) target = { organ: PARTS[part].organ, part, inferred: false };
  else if (organs.length) target = { organ: organs[0], part: null, inferred: false };
  else if (seen) {
    const partish = !intents.length || isDeictic(q) || ['fungsi', 'definisi', 'nama', 'letak'].includes(intents[0]);
    const organWide = intents.some((i) => ['kelainan', 'menjaga', 'quiz', 'beda'].includes(i));
    target = { organ: c.organ, part: partish && !organWide ? seen : null, inferred: true };
  }
  return { q, intents, organs, part, target };
}

export function contextLabel(t) {
  const o = ORGANS[t.organ]?.name || '';
  return t.part ? `${o} › ${PARTS[t.part].name}` : o;
}


// ---------- Gaya bicara & pemahaman typo ----------
const EMO = { paru: '🫁', ginjal: '💧', hati: '🟤', kulit: '💦' };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// singkatan / bahasa gaul yang umum dipakai siswa
const SLANG = {
  gmn: 'bagaimana', gmana: 'bagaimana', bgmn: 'bagaimana', gimana: 'bagaimana', gmna: 'bagaimana',
  knp: 'kenapa', napa: 'kenapa', knapa: 'kenapa', yg: 'yang', dmn: 'dimana', dmana: 'dimana', brp: 'berapa',
  ap: 'apa', apaan: 'apa', aj: 'saja', bs: 'bisa', bsa: 'bisa', sy: 'saya', ak: 'aku', km: 'kamu', kmu: 'kamu', jg: 'juga', klo: 'kalau', kalo: 'kalau', udh: 'sudah', blm: 'belum', bgt: 'banget', tp: 'tapi', apasih: 'apa sih', dgn: 'dengan', dg: 'dengan', utk: 'untuk', untk: 'untuk', bwt: 'buat',
  gk: 'tidak', ga: 'tidak', gak: 'tidak', nggak: 'tidak', ngga: 'tidak', tdk: 'tidak', aja: 'saja', sm: 'sama', sma2: 'sama-sama',
  jelasin: 'jelaskan', jlsin: 'jelaskan', jelasn: 'jelaskan', terangin: 'terangkan', kasitau: 'jelaskan', tau: 'tahu',
  makasi: 'makasih', mksh: 'makasih', mks: 'makasih', trimakasih: 'terima kasih', tq: 'thanks', ty: 'thanks',
  hlo: 'halo', hallo: 'halo', hy: 'hai', hay: 'hai', haii: 'hai', haiii: 'hai', woi: 'hai',
  paruparu: 'paru-paru', pp: 'paru-paru', ginjel: 'ginjal', gnjl: 'ginjal', kringat: 'keringat', krgt: 'keringat',
  fungsiny: 'fungsinya', fngsi: 'fungsi', fgsi: 'fungsi', pnyakit: 'penyakit', pnykt: 'penyakit', bgian: 'bagian', bgn: 'bagian',
  kuiz: 'kuis', quis: 'kuis', qius: 'kuis', soalnya: 'soal',
};
const STOP = new Set('yang dan atau apa itu ini dengan untuk dari ke di pada saja bisa ada tidak kalau jadi juga sih dong kak aku saya kamu mau tolong coba gitu lagi tahu banget kok deh sama lebih paling cara kita kami mereka dia sudah udah belum masih harus boleh punya buat bikin kayak seperti contoh terus tapi namun karena sebab akibat agar supaya biar'.split(' '));

let VOCAB = null;
function vocab() {
  if (VOCAB) return VOCAB;
  const words = new Set();
  const addPhrase = (t) => norm(t).split(/[\s-]+/).forEach((w) => w.length >= 3 && words.add(w));
  Object.values(INTENTS).flat().forEach(addPhrase);
  [...GREET, ...THANKS, ...DEICTIC, ...TOPIC].forEach(addPhrase);
  Object.values(ORGANS).forEach((o) => { o.aliases.forEach(addPhrase); addPhrase(o.name); });
  Object.values(PARTS).forEach((p) => { p.kw.forEach(addPhrase); addPhrase(p.name.split('(')[0]); });
  SUBSTANCES.forEach((x) => x.kw.forEach(addPhrase));
  ['urine', 'urea', 'empedu', 'filtrasi', 'reabsorpsi', 'augmentasi', 'nefron', 'glomerulus', 'ekskresi', 'sistem', 'organ', 'jelaskan', 'apa', 'bagaimana', 'kenapa', 'mengapa', 'fungsinya', 'prosesnya', 'gimana', 'kuis', 'soal'].forEach((w) => words.add(w));
  VOCAB = [...words];
  return VOCAB;
}

// jarak Damerau-Levenshtein (dengan transposisi huruf bersebelahan)
function dist(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}

/** Perbaiki typo & singkatan → teks pertanyaan yang lebih mudah dipahami mesin. */
export function fixQuery(question) {
  const words = norm(question).replace(/(\w+)2\b/g, '$1-$1').split(' ').filter(Boolean);
  const V = vocab();
  const fixes = [];
  const out = words.map((w) => {
    if (SLANG[w]) return SLANG[w];
    if (w.length < 4 || STOP.has(w) || V.includes(w) || /\d/.test(w)) return w;
    if (V.some((v) => w.startsWith(v) && v.length >= 4)) return w; // kata berimbuhan, mis. "fungsinya"
    const suffix = w.match(/(nya|lah|kah)$/)?.[1] || '';
    const base = suffix ? w.slice(0, -suffix.length) : w;
    const max = base.length >= 7 ? 2 : 1;
    let best = null, bd = 9;
    for (const v of V) {
      if (base.length < 7 && v[0] !== base[0]) continue;
      const dd = dist(base, v);
      if (dd < bd || (dd === bd && best && Math.abs(v.length - base.length) < Math.abs(best.length - base.length))) { bd = dd; best = v; }
    }
    if (best && bd <= max) { fixes.push([w, best + suffix]); return best + suffix; }
    return w;
  });
  return { text: out.join(' '), fixes };
}

const OPEN = {
  part: ['Oke, ini dia! 😄', 'Siap, kita bahas bagian ini ya 👇', 'Nah, bagian ini menarik nih ✨', 'Yuk kenalan sama bagian ini 🔍'],
  nama: ['Oh, itu yang lagi kamu lihat! 👀', 'Ketebak! 😄'],
  'organ:kelainan': ['Ini penting buat diwaspadai ⚠️', 'Oke, soal penyakitnya ya 🩺'],
  'organ:menjaga': ['Ini tips biar tetap sehat 💪', 'Gampang kok dilakuin sehari-hari 😊'],
  'organ:fakta': ['Siap-siap kagum ya 🤩'],
  organ: ['Pertanyaan bagus! 👍', 'Oke, jadi gini…', 'Siap! Yuk kita bahas 🙌', 'Gampangnya begini 😊', 'Sip, aku jelasin ya ✍️'],
  substance: ['Oke, soal zat ini ya 🧪'],
  compare: ['Biar kebayang, kita bandingin ya ⚖️'],
  general: ['Oke, kita mulai dari gambaran besarnya ya 🧠'],
};
const CLOSE = [
  'Masih ada yang bikin penasaran? Tanya aja 😉',
  'Gimana, udah kebayang? Kalau belum, tanya lagi ya!',
  'Mau coba kuis biar makin nempel? Ketik **kuis** 😆',
  'Coba ketuk bagian lain di model 3D-nya, nanti aku jelasin juga 👀',
  'Semangat belajarnya! 💪',
];

function friendly(r, fixed, c) {
  const kind = r.kind || '';
  let text = r.text;
  const opens = OPEN[kind] || (kind.startsWith('organ:') ? OPEN.organ : null);
  if (opens) {
    let o = pick(opens);
    if (kind.startsWith('organ:') && r.organ && Math.random() < 0.5) o += ` ${EMO[r.organ] || ''}`;
    text = `${o}\n\n${text}`;
  }
  if (['part', 'organ', 'substance', 'compare', 'general'].some((k) => kind.startsWith(k)) && Math.random() < 0.55) text += `\n\n${pick(CLOSE)}`;
  if (fixed.fixes.length && !['grade', 'greet', 'thanks'].includes(kind)) {
    const f = fixed.fixes.slice(0, 2).map(([, b]) => `“${b}”`).join(', ');
    text = `*(Aku anggap maksudmu ${f} ya 😉)*\n\n${text}`;
  }
  return { ...r, text };
}

export class LocalEngine {
  constructor() { this.quiz = null; this.asked = new Set(); }

  /** Jawaban + gaya bicara santai ala teman belajar (+ pemahaman typo/singkatan). */
  answer(question, c) {
    const fixed = fixQuery(question);
    const r = this._answer(fixed.text, c);
    return friendly(r, fixed, c);
  }

  _answer(question, c) {
    const level = c.level;
    const r = resolve(question, c);
    const { q, intents, organs } = r;
    const res = (text, extra = {}) => ({ text, actions: [], ...extra });

    // --- Jawaban kuis yang sedang berjalan ---
    if (this.quiz) {
      const m = q.match(/^(?:jawaban(?:nya)?\s*)?([abcd])$/) || q.match(/^(?:jawab(?:an)?(?:ku|nya)?\s+)([abcd])\b/);
      if (m) return this.grade('abcd'.indexOf(m[1]), level);
    }

    const onlySmall = q.split(' ').length <= 3;
    if (GREET.some((g) => has(q, g)) && onlySmall) {
      const seen = observedPart(c);
      return res(`Haii! 👋 Aku **ExAR**, teman belajarmu soal sistem ekskresi. Sekarang kamu lagi ngamatin **${contextLabel({ organ: c.organ, part: seen })}** nih ${EMO[c.organ] || ''}\n\nTanya aja langsung, nggak usah sebut nama organnya — misalnya *"fungsinya apa?"* atau *"prosesnya gimana?"*. Aku udah tahu kok kamu lagi lihat yang mana 😉`, { suggest: true, kind: 'greet' });
    }
    if (THANKS.some((g) => has(q, g)) && onlySmall) return res(pick(['Sama-sama! 😄 Senang bisa bantu.', 'Sip, sama-sama! 🙌', 'Siap, kapan aja! 😊']) + ' Coba ketuk bagian lain di model 3D, atau ketik **kuis** buat ngetes pemahamanmu 🎯', { kind: 'thanks' });

    // --- Pertanyaan umum ---
    if ((has(q, 'sekresi') || has(q, 'defekasi') || has(q, 'egesti')) && (has(q, 'ekskresi') || intents.includes('beda'))) return res(lv(GENERAL.beda, level), { kind: 'general' });
    if (has(q, 'sistem ekskresi') || has(q, 'alat ekskresi') || has(q, 'organ ekskresi') || (has(q, 'ekskresi') && !organs.length && !r.part && (intents.includes('definisi') || !intents.length))) {
      return res(lv(GENERAL.ekskresi, level), { kind: 'general', actions: MODELS.filter((m) => !m.sub && m.id !== c.model).map((m) => ({ type: 'show', model: m.id, label: `Lihat ${m.label}` })) });
    }

    // --- Perbandingan antar organ ---
    if (intents[0] === 'beda' || (intents.includes('beda') && organs.length >= 2)) {
      const ids = organs.length >= 2 ? organs : [...new Set([c.organ, ...organs])];
      if (ids.length >= 2) {
        const rows = ids.map((id) => `- **${ORGANS[id].name}**: ${ORGANS[id].tagline.toLowerCase()}.`).join('\n');
        return res(`Perbandingan organ ekskresi:\n${rows}\n\nIngin rincian salah satunya? Tanyakan misalnya *"zat apa yang dikeluarkan ${ORGANS[ids[1]].name.toLowerCase()}?"*`, { kind: 'compare' });
      }
    }

    // --- Zat → organ ---
    const sub = SUBSTANCES.find((s) => s.kw.some((k) => has(q, norm(k))));
    const asksWho = ['organ apa', 'siapa', 'mana', 'oleh apa', 'dikeluarkan oleh', 'dihasilkan oleh', 'dibuang oleh', 'dibentuk'].some((k) => has(q, k));
    if (sub && (asksWho || (!organs.length && !r.part && !intents.length))) {
      return res(sub.text, { kind: 'substance', actions: sub.organs.filter((o) => o !== c.organ).slice(0, 2).map((o) => ({ type: 'show', model: o, label: `Lihat ${ORGANS[o].name}` })) });
    }

    // --- Kuis ---
    if (intents.includes('quiz')) return this.newQuiz(r.target.organ, level, r.target.inferred);

    // --- Di luar topik ---
    if (!intents.length && !organs.length && !r.part && !sub && !isDeictic(q) && !TOPIC.some((t) => has(q, t)) && q.split(' ').length > 2) {
      return res(`Hehe, kayaknya itu di luar materi aku deh 😅 Aku khusus nemenin kamu belajar **sistem ekskresi manusia** (paru-paru, ginjal, hati, dan kulit).\n\nKamu lagi ngamatin **${contextLabel({ organ: c.organ, part: observedPart(c) })}** — coba tanya fungsinya, prosesnya, atau penyakitnya yuk! 🙌`, { suggest: true, kind: 'offtopic' });
    }

    const t = r.target;
    const O = ORGANS[t.organ];
    const extra = { context: { ...t, label: contextLabel(t) }, actions: [] };

    // --- "Ini apa?" ---
    if (intents[0] === 'nama') {
      if (t.part) {
        const P = PARTS[t.part];
        return res(`Yang sedang kamu amati adalah **${P.name}**${P.latin ? ` (*${P.latin}*)` : ''}, bagian dari **${ORGANS[P.organ].name}**.\n\n${P.desc}${level === 'sma' && P.sma ? `\n\n**Pendalaman SMA:** ${P.sma}` : ''}`, { ...extra, kind: 'nama' });
      }
      const names = Object.values(PARTS).filter((p) => p.organ === t.organ && (c.model === 'nefron') === (p.model === 'nefron')).map((p) => p.name);
      return res(`Kamu sedang mengamati model **${modelLabel(c.model)}** (${O.latin}). ${O.tagline}.\n\nUntuk menanyakan bagian tertentu, **ketuk salah satu bagian** pada model 3D${c.mode !== '3d' ? ' atau **arahkan titik bidik** di tengah layar ke bagian tersebut' : ''}. Bagian yang tersedia: ${names.slice(0, 12).join(', ')}.`, { ...extra, kind: 'nama-organ' });
    }

    // --- Pertanyaan tentang bagian ---
    if (t.part) {
      const P = PARTS[t.part];
      let text = `**${P.name}**${P.latin ? ` · *${P.latin}*` : ''}\n\n${P.desc}`;
      if (level === 'sma' && P.sma) text += `\n\n**Pendalaman SMA:** ${P.sma}`;
      text += `\n\nBagian ini termasuk organ **${ORGANS[P.organ].name}**.`;
      if (intents.length && !['fungsi', 'definisi', 'letak', 'struktur'].includes(intents[0]) && ORGANS[P.organ][intents[0]]) {
        text += `\n\n${this.organSection(ORGANS[P.organ], intents[0], level)}`;
      }
      const mdl = modelOf(P.organ, t.part);
      if (!t.inferred) extra.actions.push({ type: 'focus', model: mdl, part: t.part, label: c.model === mdl ? 'Tunjukkan di 3D' : `Buka ${modelLabel(mdl)} & tunjukkan` });
      return res(text, { ...extra, kind: 'part' });
    }

    // --- Pertanyaan tentang organ ---
    let picks = intents.filter((i) => O[i] || i === 'definisi');
    if (picks.some((i) => ['menjaga', 'kelainan', 'fakta', 'letak'].includes(i))) picks = picks.filter((i) => i !== 'proses');
    picks = picks.slice(0, 2);
    let text;
    if (!picks.length || picks[0] === 'definisi') {
      text = `**${O.name}** (*${O.latin}*)\n\n${lv(O.ringkas, level)}`;
      if (!picks.length && intents.length === 0 && !t.inferred) text += `\n\n${lv(O.fungsi, level)}`;
    } else {
      text = picks.map((i) => this.organSection(O, i, level)).join('\n\n');
    }
    if (c.model === 'nefron' && t.inferred && picks[0] === 'proses') text += '\n\n👀 Perhatikan butiran kuning yang mengalir di model nefron: warnanya makin pekat dari urine primer → sekunder → sesungguhnya.';
    if (!t.inferred && modelOf(t.organ) !== c.model && !(t.organ === 'ginjal' && c.model === 'nefron')) {
      extra.actions.push({ type: 'show', model: t.organ, label: `Lihat model 3D ${O.name}` });
    }
    if (t.organ === 'ginjal' && picks[0] === 'proses' && c.model !== 'nefron') extra.actions.push({ type: 'show', model: 'nefron', label: 'Lihat nefron 3D' });
    return res(text, { ...extra, kind: `organ:${picks[0] || 'ringkas'}`, organ: t.organ });
  }

  organSection(O, intent, level) {
    switch (intent) {
      case 'kelainan':
        return `Gangguan/penyakit pada **${O.name.toLowerCase()}**:\n${O.kelainan.map((k) => `- **${k.nama}**: ${k.desc}`).join('\n')}`;
      case 'menjaga':
        return `Cara menjaga kesehatan **${O.name.toLowerCase()}**:\n${O.menjaga.map((m) => `- ${m}`).join('\n')}`;
      case 'fakta': {
        const pool = O.fakta.filter((f) => !this.asked.has(f));
        const f = (pool.length ? pool : O.fakta)[Math.floor(Math.random() * (pool.length || O.fakta.length))];
        this.asked.add(f);
        return `💡 **Tahukah kamu?** ${f}`;
      }
      default:
        return lv(O[intent], level) || lv(O.ringkas, level);
    }
  }

  newQuiz(organId, level, inferred) {
    const O = ORGANS[organId];
    const pool = O.quiz.filter((x) => level === 'sma' || x.level !== 'sma');
    const fresh = pool.filter((x) => !this.asked.has(x.q));
    const item = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
    this.asked.add(item.q);
    this.quiz = { organ: organId, item };
    const opts = item.options.map((o, i) => `**${'ABCD'[i]}.** ${o}`).join('\n');
    return {
      text: `📝 **Kuis ${O.name}**${inferred ? ' (sesuai yang lagi kamu amati)' : ''} — ${pick(['siap? 😆', 'yuk tes dikit! 💪', 'gampang kok 😉'])}\n\n${item.q}\n\n${opts}\n\nKetuk jawabanmu atau ketik huruf A–D ya.`,
      actions: item.options.map((o, i) => ({ type: 'answer', index: i, label: 'ABCD'[i] })),
      context: inferred ? { organ: organId, part: null, inferred, label: O.name } : undefined,
      quiz: true,
      kind: 'quiz',
    };
  }

  grade(index, level) {
    const { organ, item } = this.quiz;
    this.quiz = null;
    const ok = index === item.a;
    const text = ok
      ? `✅ ${pick(['**Yeay, benar!** 🎉', '**Mantap, tepat sekali!** 🥳', '**Benar!** Keren 👏'])} ${item.why}`
      : `❌ ${pick(['**Hampir!**', '**Belum tepat nih.**', '**Ups, kurang tepat.**'])} Jawaban yang benar **${'ABCD'[item.a]}. ${item.options[item.a]}**.\n\n${item.why}\n\nGapapa, salah itu bagian dari belajar 😉`;
    return { text, actions: [{ type: 'ask', text: `kuis ${ORGANS[organ].name.toLowerCase()}`, label: 'Soal berikutnya →' }], correct: ok, level, kind: 'grade' };
  }
}
