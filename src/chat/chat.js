import { ORGANS, PARTS } from '../data/knowledge.js';
import { ctx, observedPart } from '../state.js';
import { LocalEngine, resolve, contextLabel, detectPart, detectOrgans, has, fixQuery } from './engine.js';
import { checkLLM, describeContext, streamLLM } from './llm.js';

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Markdown ringan → HTML (aman: input di-escape lebih dulu). */
export function md(src) {
  const inline = (s) => escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  const out = [];
  let list = null;
  const flush = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const raw of src.split('\n')) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; }
      list.items.push(inline((ul || ol)[1]));
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const h = line.match(/^#{1,4}\s+(.*)/);
    out.push(h ? `<p class="h">${inline(h[1])}</p>` : `<p>${inline(line)}</p>`);
  }
  flush();
  return out.join('');
}

export class Chat {
  constructor(root, { onAction }) {
    this.root = root;
    this.onAction = onAction;
    this.engine = new LocalEngine();
    this.history = [];
    this.llm = null;
    this.busy = false;
    this.$msgs = root.querySelector('#messages');
    this.$suggest = root.querySelector('#suggest');
    this.$form = root.querySelector('#composer');
    this.$input = root.querySelector('#chatInput');
    this.$status = root.querySelector('#aiStatus');
    this.$chip = root.querySelector('#ctxChip');
    this.$form.addEventListener('submit', (e) => { e.preventDefault(); this.send(this.$input.value); });
    this._initMic();
    checkLLM().then((info) => this.setLLM(info));
    this.welcome();
  }

  setLLM(info) {
    this.llm = info;
    this.root.classList.toggle('is-ai', !!info);
    this.$status.textContent = info ? 'AI Claude aktif · sadar konteks' : 'Mode offline · basis pengetahuan';
  }

  welcome() {
    this.add('bot', `Haii! 👋 Aku **ExAR**, teman belajarmu soal sistem ekskresi.\n\nPutar dan ketuk organ 3D di sebelah, terus tanya apa aja ke aku. Nggak perlu sebut nama organnya — aku tahu kok kamu lagi ngamatin yang mana 😉🔍\n\nSalah ketik juga santai, aku ngerti kok 😄`, { meta: false });
  }

  /** Perbarui chip konteks & saran pertanyaan. */
  updateContext(c) {
    const seen = observedPart(c);
    const O = ORGANS[c.organ];
    const label = contextLabel({ organ: c.organ, part: seen });
    const via = c.mode !== '3d' && c.gaze && seen === c.gaze ? 'dibidik' : seen ? 'dipilih' : 'diamati';
    this.$chip.innerHTML = `<span class="ctx-dot" style="background:${O.color}"></span><span class="ctx-text">${escapeHtml(label)}</span><span class="ctx-via">${via}</span>`;
    this.$chip.classList.remove('pulse');
    void this.$chip.offsetWidth;
    this.$chip.classList.add('pulse');
    const key = `${c.organ}|${seen}|${c.model}`;
    if (key !== this._sugKey) { this._sugKey = key; this.renderSuggestions(c); }
  }

  renderSuggestions(c) {
    const O = ORGANS[c.organ];
    const seen = observedPart(c);
    let list = [...O.suggestions];
    if (seen) list = [`Apa fungsi ${PARTS[seen].name.split(' (')[0].toLowerCase()}?`, 'Ini bagian apa?', ...list.filter((s) => !/bagian ini|lapisan ini/i.test(s))];
    if (c.model === 'nefron') list = ['Bagaimana urine terbentuk?', 'Apa itu filtrasi?', ...list];
    this.$suggest.innerHTML = '';
    for (const s of list.slice(0, 5)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sug';
      b.textContent = s;
      b.addEventListener('click', () => this.send(s));
      this.$suggest.appendChild(b);
    }
  }

  add(role, text, { context, actions = [], meta = true, html } = {}) {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    const body = document.createElement('div');
    body.className = 'bubble';
    body.innerHTML = html ?? (role === 'bot' ? md(text) : `<p>${escapeHtml(text)}</p>`);
    if (context?.inferred && meta) {
      const tag = document.createElement('div');
      tag.className = 'ctx-tag';
      tag.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>Berdasarkan objek yang kamu amati: <b>${escapeHtml(context.label)}</b>`;
      el.appendChild(tag);
    }
    el.appendChild(body);
    if (actions.length) el.appendChild(this._actions(actions, el));
    this.$msgs.appendChild(el);
    this._scroll();
    if (role !== 'typing') this.history.push({ role: role === 'user' ? 'user' : 'assistant', text });
    return { el, body };
  }

  _actions(actions, msgEl) {
    const wrap = document.createElement('div');
    wrap.className = 'actions' + (actions.every((a) => a.type === 'answer') ? ' is-quiz' : '');
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'act';
      b.textContent = a.label;
      b.addEventListener('click', () => {
        if (a.type === 'answer') {
          wrap.querySelectorAll('button').forEach((x) => (x.disabled = true));
          b.classList.add('chosen');
          this.send('ABCD'[a.index]);
        } else if (a.type === 'ask') this.send(a.text);
        else this.onAction?.(a);
      });
      wrap.appendChild(b);
    }
    return wrap;
  }

  _scroll() { requestAnimationFrame(() => { this.$msgs.scrollTop = this.$msgs.scrollHeight; }); }

  async send(raw) {
    const text = (raw || '').trim();
    if (!text || this.busy) return;
    this.$input.value = '';
    this.add('user', text);
    const c = { ...ctx, trail: [...ctx.trail] };
    const q = fixQuery(text).text;
    const local = () => this.engine.answer(text, c);
    // Kuis selalu ditangani lokal (butuh state & tombol jawaban)
    const quizLike = this.engine.quiz || /(^|\s)(kuis|quiz|soal|latihan)/.test(q);
    if (!this.llm || quizLike) {
      const typing = this._typing();
      await new Promise((r) => setTimeout(r, 380 + Math.min(500, text.length * 8)));
      typing.remove();
      const r = local();
      this.add('bot', r.text, { context: r.context, actions: r.actions });
      return;
    }
    this.busy = true;
    const r = resolve(q, c);
    const context = { ...r.target, label: contextLabel(r.target) };
    const typing = this._typing();
    let msg = null;
    try {
      const answer = await streamLLM({
        history: this.history.slice(-14),
        context: describeContext(c),
        onText: (full) => {
          if (!msg) { typing.remove(); msg = this.add('bot', '', { context, meta: true }); this.history.pop(); }
          msg.body.innerHTML = md(full);
          this._scroll();
        },
      });
      this.history.push({ role: 'assistant', text: answer });
      const acts = this._suggestActions(text, c);
      if (acts.length && msg) msg.el.appendChild(this._actions(acts, msg.el));
    } catch (err) {
      console.warn('AI tidak tersedia, beralih ke mode offline:', err);
      typing.remove();
      if (msg) msg.el.remove();
      const lr = local();
      this.add('bot', lr.text, { context: lr.context, actions: lr.actions });
      if (/^(http_5|api_4)/.test(String(err.message))) this.setLLM(null); // kunci tidak valid / server mati → tetap offline
    } finally {
      this.busy = false;
    }
  }

  /** Tombol aksi kontekstual untuk jawaban AI (tunjukkan bagian / buka model). */
  _suggestActions(text, c) {
    const q = fixQuery(text).text;
    const part = detectPart(q);
    if (part && PARTS[part]) {
      const mdl = PARTS[part].model || PARTS[part].organ;
      return [{ type: 'focus', model: mdl, part, label: c.model === mdl ? 'Tunjukkan di 3D' : 'Buka & tunjukkan di 3D' }];
    }
    const organs = detectOrgans(q).filter((o) => o !== c.organ);
    if (organs.length && !has(q, 'beda')) return [{ type: 'show', model: organs[0], label: `Lihat model 3D ${ORGANS[organs[0]].name}` }];
    return [];
  }

  _typing() {
    const el = document.createElement('div');
    el.className = 'msg bot typing';
    el.innerHTML = '<div class="bubble"><span></span><span></span><span></span></div>';
    this.$msgs.appendChild(el);
    this._scroll();
    return el;
  }

  _initMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = this.root.querySelector('#micBtn');
    if (!SR || !btn) { btn?.remove(); return; }
    const rec = new SR();
    rec.lang = 'id-ID';
    rec.interimResults = true;
    let on = false;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join('');
      this.$input.value = t;
      if (e.results[e.results.length - 1].isFinal) { rec.stop(); this.send(t); }
    };
    rec.onend = () => { on = false; btn.classList.remove('rec'); };
    btn.addEventListener('click', () => {
      if (on) { rec.stop(); return; }
      try { rec.start(); on = true; btn.classList.add('rec'); } catch { /* sedang berjalan */ }
    });
  }
}
