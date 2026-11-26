import { ORGANS, PARTS, MODELS } from '../data/knowledge.js';
import { observedPart } from '../state.js';

export async function checkLLM() {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j.llm ? j : null;
  } catch {
    return null;
  }
}

/** Catatan konteks yang dikirim ke model bersama setiap pertanyaan. */
export function describeContext(c) {
  const model = MODELS.find((m) => m.id === c.model);
  const organ = ORGANS[c.organ];
  const seen = observedPart(c);
  const how = c.mode === 'xr' ? 'mode AR (WebXR) — objek ditempatkan di ruang nyata' : c.mode === 'camera' ? 'mode kamera AR' : 'penampil 3D';
  const lines = [
    'Catatan konteks dari aplikasi (bukan dari siswa):',
    `- Siswa sedang mengamati model 3D: ${model?.label || organ.name} (organ: ${organ.name}) di ${how}.`,
  ];
  if (seen) {
    const via = c.mode !== '3d' && c.gaze === seen ? 'sedang dibidik titik tengah kamera' : 'sedang dipilih/disorot';
    lines.push(`- Bagian yang ${via}: ${PARTS[seen].name}.`);
  } else lines.push('- Belum ada bagian spesifik yang dipilih.');
  const prev = c.trail.slice(1, 4).map((k) => { const [o, p] = k.split(':'); return p ? `${ORGANS[o].name} › ${PARTS[p]?.name}` : ORGANS[o]?.name; }).filter(Boolean);
  if (prev.length) lines.push(`- Sebelumnya mengamati: ${prev.join(', ')}.`);
  lines.push(`- Jenjang siswa: ${c.level.toUpperCase()}.`);
  return lines.join('\n');
}

/** Streaming jawaban dari /api/chat. Memanggil onText untuk setiap potongan. */
export async function streamLLM({ history, context, onText, signal }) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ history, context }),
    signal,
  });
  if (!r.ok || !r.body) throw new Error('http_' + r.status);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '', full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (!line.startsWith('data:')) continue;
      const ev = JSON.parse(line.slice(5));
      if (ev.error) throw new Error(ev.error);
      if (ev.t) { full += ev.t; onText(full); }
    }
  }
  if (!full) throw new Error('empty');
  return full;
}
