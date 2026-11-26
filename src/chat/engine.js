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

export class LocalEngine {
  constructor() { this.quiz = null; this.asked = new Set(); }

  answer(question, c) {
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
      return res(`Hai! 👋 Aku asisten sistem ekskresi. Kamu sedang mengamati **${contextLabel({ organ: c.organ, part: seen })}**.\n\nKamu bisa langsung bertanya tanpa menyebut nama organ, misalnya *"apa fungsinya?"* atau *"bagaimana prosesnya?"* — aku akan menjawab berdasarkan objek 3D yang sedang kamu amati.`, { suggest: true });
    }
    if (THANKS.some((g) => has(q, g)) && onlySmall) return res('Sama-sama! 😊 Coba ketuk bagian lain pada model 3D, atau ketik **"kuis"** untuk menguji pemahamanmu.');

    // --- Pertanyaan umum ---
    if ((has(q, 'sekresi') || has(q, 'defekasi') || has(q, 'egesti')) && (has(q, 'ekskresi') || intents.includes('beda'))) return res(lv(GENERAL.beda, level));
    if (has(q, 'sistem ekskresi') || has(q, 'alat ekskresi') || has(q, 'organ ekskresi') || (has(q, 'ekskresi') && !organs.length && !r.part && (intents.includes('definisi') || !intents.length))) {
      return res(lv(GENERAL.ekskresi, level), { actions: MODELS.filter((m) => !m.sub && m.id !== c.model).map((m) => ({ type: 'show', model: m.id, label: `Lihat ${m.label}` })) });
    }

    // --- Perbandingan antar organ ---
    if (intents[0] === 'beda' || (intents.includes('beda') && organs.length >= 2)) {
      const ids = organs.length >= 2 ? organs : [...new Set([c.organ, ...organs])];
      if (ids.length >= 2) {
        const rows = ids.map((id) => `- **${ORGANS[id].name}**: ${ORGANS[id].tagline.toLowerCase()}.`).join('\n');
        return res(`Perbandingan organ ekskresi:\n${rows}\n\nIngin rincian salah satunya? Tanyakan misalnya *"zat apa yang dikeluarkan ${ORGANS[ids[1]].name.toLowerCase()}?"*`);
      }
    }

    // --- Zat → organ ---
    const sub = SUBSTANCES.find((s) => s.kw.some((k) => has(q, norm(k))));
    const asksWho = ['organ apa', 'siapa', 'mana', 'oleh apa', 'dikeluarkan oleh', 'dihasilkan oleh', 'dibuang oleh', 'dibentuk'].some((k) => has(q, k));
    if (sub && (asksWho || (!organs.length && !r.part && !intents.length))) {
      return res(sub.text, { actions: sub.organs.filter((o) => o !== c.organ).slice(0, 2).map((o) => ({ type: 'show', model: o, label: `Lihat ${ORGANS[o].name}` })) });
    }

    // --- Kuis ---
    if (intents.includes('quiz')) return this.newQuiz(r.target.organ, level, r.target.inferred);

    // --- Di luar topik ---
    if (!intents.length && !organs.length && !r.part && !sub && !isDeictic(q) && !TOPIC.some((t) => has(q, t)) && q.split(' ').length > 2) {
      return res(`Maaf, aku khusus membahas **sistem ekskresi manusia** (paru-paru, ginjal, hati, dan kulit). 🙏\n\nSaat ini kamu sedang mengamati **${contextLabel({ organ: c.organ, part: observedPart(c) })}** — coba tanyakan fungsi, proses, atau penyakitnya.`, { suggest: true });
    }

    const t = r.target;
    const O = ORGANS[t.organ];
    const extra = { context: { ...t, label: contextLabel(t) }, actions: [] };

    // --- "Ini apa?" ---
    if (intents[0] === 'nama') {
      if (t.part) {
        const P = PARTS[t.part];
        return res(`Yang sedang kamu amati adalah **${P.name}**${P.latin ? ` (*${P.latin}*)` : ''}, bagian dari **${ORGANS[P.organ].name}**.\n\n${P.desc}${level === 'sma' && P.sma ? `\n\n**Pendalaman SMA:** ${P.sma}` : ''}`, extra);
      }
      const names = Object.values(PARTS).filter((p) => p.organ === t.organ && (c.model === 'nefron') === (p.model === 'nefron')).map((p) => p.name);
      return res(`Kamu sedang mengamati model **${modelLabel(c.model)}** (${O.latin}). ${O.tagline}.\n\nUntuk menanyakan bagian tertentu, **ketuk salah satu bagian** pada model 3D${c.mode !== '3d' ? ' atau **arahkan titik bidik** di tengah layar ke bagian tersebut' : ''}. Bagian yang tersedia: ${names.slice(0, 12).join(', ')}.`, extra);
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
      return res(text, extra);
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
    return res(text, extra);
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
      text: `📝 **Kuis ${O.name}**${inferred ? ' (sesuai organ yang kamu amati)' : ''}\n\n${item.q}\n\n${opts}\n\nKetuk jawabanmu atau ketik huruf A–D.`,
      actions: item.options.map((o, i) => ({ type: 'answer', index: i, label: 'ABCD'[i] })),
      context: inferred ? { organ: organId, part: null, inferred, label: O.name } : undefined,
      quiz: true,
    };
  }

  grade(index, level) {
    const { organ, item } = this.quiz;
    this.quiz = null;
    const ok = index === item.a;
    const text = ok
      ? `✅ **Benar!** ${item.why}`
      : `❌ **Belum tepat.** Jawaban yang benar adalah **${'ABCD'[item.a]}. ${item.options[item.a]}**.\n\n${item.why}`;
    return { text, actions: [{ type: 'ask', text: `kuis ${ORGANS[organ].name.toLowerCase()}`, label: 'Soal berikutnya →' }], correct: ok, level };
  }
}
