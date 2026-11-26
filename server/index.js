// Server kecil: menyajikan hasil build (dist/) dan endpoint chatbot AI.
// Tanpa kredensial Anthropic, /api/health melaporkan llm:false dan
// frontend otomatis memakai mesin pengetahuan lokal (offline).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { ORGANS, PARTS, GENERAL } from '../src/data/knowledge.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, '../dist');
const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;

// ---------- Prompt sistem (stabil → dapat di-cache) ----------
const flat = (x) => (typeof x === 'string' ? x : [x?.smp, x?.sma && `[SMA] ${x.sma}`].filter(Boolean).join('\n'));
function knowledgeDigest() {
  const organs = Object.values(ORGANS).map((o) => [
    `## ${o.name} (${o.latin})`,
    flat(o.ringkas), flat(o.fungsi), flat(o.zat), flat(o.proses), flat(o.struktur), flat(o.letak), flat(o.ukuran),
    'Kelainan: ' + o.kelainan.map((k) => `${k.nama} — ${k.desc}`).join('; '),
    'Menjaga: ' + o.menjaga.join('; '),
  ].join('\n')).join('\n\n');
  const parts = Object.entries(PARTS).map(([id, p]) => `- [${id}] ${p.name} (${ORGANS[p.organ].name}${p.model ? ', model nefron' : ''}): ${p.desc}${p.sma ? ` [SMA] ${p.sma}` : ''}`).join('\n');
  return `${organs}\n\n## Bagian model 3D\n${parts}\n\n## Umum\n${flat(GENERAL.ekskresi)}\n${flat(GENERAL.beda)}`;
}

const SYSTEM = `Kamu adalah "Asisten Ekskresi", tutor biologi yang ramah di aplikasi web AR 3D tentang sistem ekskresi manusia untuk siswa SMP dan SMA di Indonesia.

Cara menjawab:
- Selalu gunakan Bahasa Indonesia yang jelas, hangat, dan sesuai kurikulum.
- Sesuaikan kedalaman dengan jenjang yang disebutkan di catatan konteks: SMP = sederhana dan konkret; SMA = boleh memakai istilah ilmiah, reaksi kimia, hormon, dan mekanisme rinci.
- Jawaban ringkas: biasanya 2–6 kalimat atau daftar poin pendek. Gunakan **tebal** untuk istilah penting. Jangan memakai heading besar atau tabel.
- Aplikasi ini context-aware: sebelum setiap pertanyaan ada catatan konteks berisi organ/bagian 3D yang sedang diamati siswa. Jika pertanyaan tidak menyebut organ atau memakai kata seperti "ini", "itu", "-nya", anggap pertanyaan itu merujuk ke objek yang sedang diamati, dan sebutkan nama objeknya secara singkat dalam jawaban. Jika siswa menyebut organ lain secara eksplisit, jawab tentang organ yang disebut.
- Jika ada bagian yang tidak diketahui siswa, sarankan untuk mengetuk bagian itu pada model 3D.
- Utamakan fakta dari referensi di bawah; boleh menambah penjelasan biologi umum yang akurat. Jangan mengarang angka.
- Jika pertanyaan di luar topik sistem ekskresi/biologi tubuh manusia, tolak dengan sopan dan arahkan kembali ke topik.
- Untuk pertanyaan kesehatan pribadi, beri informasi umum dan sarankan berkonsultasi dengan tenaga kesehatan.

# Referensi materi
${knowledgeDigest()}`;

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const msgs = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .slice(-14)
    .map((m) => ({ role: m.role, content: m.text.slice(0, 4000) }));
  // pesan harus diawali user dan berselang-seling
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const out = [];
  for (const m of msgs) {
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n\n' + m.content;
    else out.push(m);
  }
  return out;
}

async function handleChat(req, res) {
  if (!client) { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'llm_unavailable' })); return; }
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { res.writeHead(400); res.end(); return; }
  const messages = sanitizeHistory(body.history);
  if (!messages.length || messages[messages.length - 1].role !== 'user') { res.writeHead(400); res.end(); return; }
  const context = String(body.context || '').slice(0, 1200);
  // Catatan konteks dikirim sebagai pesan sistem di tengah percakapan: prefix tetap ter-cache.
  if (context) messages.push({ role: 'system', content: context });

  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages,
    }, { signal: ac.signal });
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') send({ t: ev.delta.text });
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') send({ t: '\n\nMaaf, aku tidak bisa membantu pertanyaan itu. Yuk kembali membahas sistem ekskresi!' });
    send({ done: true });
  } catch (err) {
    if (!ac.signal.aborted) {
      console.error('[chat]', err?.status || '', err?.message || err);
      send({ error: err instanceof Anthropic.APIError ? `api_${err.status}` : 'server_error' });
    }
  }
  res.end();
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('Jalankan "npm run build" terlebih dahulu.'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ llm: !!client, model: client ? MODEL : null }));
  } else if (req.url === '/api/chat' && req.method === 'POST') {
    handleChat(req, res);
  } else serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`Ekskresia AR berjalan di http://localhost:${PORT} — mode AI: ${client ? MODEL : 'nonaktif (offline)'}`);
});
