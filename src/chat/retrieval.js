// Pencarian materi (BM25) di korpus hasil ekstraksi buku/modul sistem ekskresi.
import corpus from '../data/corpus.json' with { type: 'json' };

const STOP = new Set(('yang dan atau di ke dari pada untuk dengan dalam ini itu adalah ialah merupakan juga akan tidak dapat bisa oleh sebagai secara karena agar supaya maka jika kalau saat ketika yaitu yakni seperti serta lebih sangat ada apa bagaimana kenapa mengapa siapa dimana kapan berapa jelaskan sebutkan coba tolong dong sih kak aku saya kamu kita kalian mereka dia nya ya tahu mau ingin bagian organ tubuh manusia').split(' '));

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, ' ');
/** Stemming ringan bahasa Indonesia (akhiran & awalan umum). */
function stem(w) {
  let x = w;
  x = x.replace(/(nya|lah|kah|pun)$/, '');
  if (x.length > 6) x = x.replace(/(kan|an|i)$/, '');
  if (x.length > 6) x = x.replace(/^(meng|meny|mem|men|me|peng|peny|pem|pen|pe|ber|be|ter|te|di|ke|se)/, '');
  return x;
}
export function tokenize(s) {
  return norm(s).split(/[\s-]+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem);
}

// ---- indeks ----
const docs = corpus.chunks.map((c) => {
  const tf = new Map();
  const add = (w, k) => tf.set(w, (tf.get(w) || 0) + k);
  tokenize(c.t).forEach((w) => add(w, 1));
  tokenize(c.h).forEach((w) => add(w, 2)); // judul bagian lebih berbobot
  const len = [...tf.values()].reduce((a, b) => a + b, 0);
  return { c, tf, len };
});
const N = docs.length;
const avgdl = docs.reduce((a, d) => a + d.len, 0) / N;
const df = new Map();
for (const d of docs) for (const w of d.tf.keys()) df.set(w, (df.get(w) || 0) + 1);
const idf = (w) => Math.log(1 + (N - (df.get(w) || 0) + 0.5) / ((df.get(w) || 0) + 0.5));

/** Kata dalam pertanyaan yang termasuk istilah khusus (jarang) di buku, mis. "detoksifikasi", "ADH". */
export function rareTerms(query, known = new Set(), maxDf = 12) {
  return [...new Set(tokenize(query))].filter((w) => !known.has(w) && (df.get(w) || 0) > 0 && df.get(w) <= maxDf);
}

const byId = new Map(corpus.chunks.map((c, i) => [c.id, i]));
/** Potongan sesudahnya dari sumber yang sama (untuk menyambung daftar). */
export function nextChunk(id) {
  const n = corpus.chunks[byId.get(id) + 1];
  return n && n.src === corpus.chunks[byId.get(id)].src ? n : null;
}

export const SOURCES = Object.fromEntries(corpus.sources.map((s) => [s.id, s]));

/**
 * Cari potongan materi paling relevan.
 * @param {string} query
 * @param {{organ?: string, exclude?: Set<string>, limit?: number, level?: string}} o
 */
export function search(query, { organ, exclude, limit = 2, level } = {}) {
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const k1 = 1.4, b = 0.75;
  const scored = [];
  for (const d of docs) {
    if (exclude?.has(d.c.id)) continue;
    let s = 0, hit = 0;
    for (const w of q) {
      const f = d.tf.get(w);
      if (!f) continue;
      hit++;
      s += idf(w) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avgdl)));
    }
    if (!s) continue;
    s *= 0.7 + 0.3 * (hit / q.length); // lebih banyak kata yang cocok → lebih relevan
    if (organ && d.c.o.includes(organ)) s *= 1.35;
    if (organ && d.c.o.length && !d.c.o.includes(organ)) s *= 0.6;
    if (level === 'smp' && SOURCES[d.c.src]?.level === 'SMP') s *= 1.1;
    scored.push({ ...d.c, score: s, hit });
  }
  return scored.sort((a, b2) => b2.score - a.score).slice(0, limit);
}

/** Ringkas potongan menjadi ±maxWords kata yang berakhir di batas kalimat. */
export function snippet(text, maxWords = 85) {
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  const cut = words.slice(0, maxWords).join(' ');
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '));
  return end > cut.length * 0.5 ? cut.slice(0, end + 1) : `${cut}…`;
}

/** Seluruh korpus dalam bentuk teks (untuk mode AI). */
export function corpusText() {
  return corpus.chunks.map((c) => `[${SOURCES[c.src].title}${c.h ? ' — ' + c.h : ''}] ${c.t}`).join('\n');
}
