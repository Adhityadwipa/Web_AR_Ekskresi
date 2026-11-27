"""Ekstrak materi sistem ekskresi dari PDF → src/data/corpus.json (basis pengetahuan chatbot).

Pemakaian: python3 tools/build_corpus.py <folder-pdf>
Butuh `pdftotext` (poppler-utils).
"""
import json, re, subprocess, sys
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'corpus.json'

DOCS = [
    # (pola nama file, id, judul tampil, jenjang, (halaman awal, akhir) atau None, (baris mulai regex, baris akhir regex))
    ('*SISTEM_EKSKRESI_PADA_MANUSIA*.pdf', 'modul', 'Modul Sistem Ekskresi pada Manusia', 'SMA', None, (r'^SISTEM EKSKRESI PADA\s*$', r'^DAFTAR PUSTAKA\s*$')),
    ('*XI_Biologi_KD-3.9*.pdf', 'bio11', 'Modul Biologi Kelas XI KD 3.9', 'SMA', None, (r'^STRUKTUR DAN FUNGSI ORGAN EKSKRESI', r'^EVALUASI\s*$|^DAFTAR PUSTAKA\s*$')),
    ('*BUKU_PAKET_IPA_KLS_8*.pdf', 'ipa8', 'Buku IPA Kelas VIII', 'SMP', (90, 97), None),
    ('*BUKU_PAKET_IPA_VII*.pdf', 'ipa7', 'Buku IPA Kelas VII', 'SMP', (152, 153), None),
    ('*MATERI_EKSKRESI_PROPOSAL*.pdf', 'tinjauan', 'Materi Sistem Ekskresi (Tinjauan Pustaka)', 'SMP', None, (r'^TINJAUAN PUSTAKA\s*$', r'^\d+\.\s*Requirement Analysis|^METODE')),
]

# blok yang dibuang (latihan, penugasan, kunci, dll.)
SKIP_START = re.compile(r'^([A-Z]\.\s*)?(Latihan Soal|Penugasan Mandiri|Penilaian Diri|EVALUASI|Evaluasi|KUNCI JAWABAN|Kunci Jawaban|Pembahasan Latihan|Petunjuk Penggunaan|Identitas Modul|KATA PENGANTAR|DAFTAR ISI|Ayo, Kita Selesaikan|Ayo Kita Lakukan|Ayo, Kita Lakukan|PRAKTIKUM|Kegiatan Praktikum|LEMBAR KERJA)', re.I)
SKIP_END = re.compile(r'^([A-Z]\.\s*)?(Tujuan Pembelajaran|Uraian Materi|Rangkuman|RANGKUMAN|GLOSARIUM|Glosarium)\b|^KEGIATAN PEMBELAJARAN|^[0-9]+\.\s+[A-Z][A-Z-]{3,}', re.I)
NOISE = re.compile(r'^(MODUL|SISTEM EKSKRESI PADA MANUSIA|SISTEM EKSKRESI|BIOLOGI KELAS XI|Modul Biologi.*|@\d{4}.*|Kelas VIII SMP/MTs.*|Kelas VII SMP/MTs.*|Ilmu Pengetahuan Alam.*|Semester \d.*|\d{1,3}|Sumber:.*|http\S+|.*www\.\S+.*|Bab \d .*|HALAMAN INI SENGAJA DIKOSONGKAN)\s*$', re.I)
HEADING = re.compile(r'^(([0-9]{1,2}|[a-hA-H])[.)]\s+[A-Z][\w ()/,-]{2,60}|[A-Z][A-Z ,/()-]{5,60})$')
KEY = re.compile(r'ekskresi|ginjal|nefron|urin|glomerulus|bowman|tubulus|henle|kandung kemih|ureter|uretra|hati\b|hepar|empedu|bilirubin|urea|amonia|kulit|keringat|epidermis|dermis|sebasea|sudorifera|paru|alveolus|bronk|karbon dioksida|co2|filtrasi|reabsorpsi|reabsorbsi|augmentasi|ADH|hormon antidiuretik|hemodialisis|cuci darah|batu ginjal|nefritis|diabetes|albuminuria|hepatitis|sirosis|ikterus|jerawat|biang keringat|asma|tbc|pneumonia|emfisema|metabolisme|homeostasis', re.I)
ORG = {
    'ginjal': r'ginjal|nefron|urin|glomerulus|bowman|tubulus|henle|kandung kemih|ureter|uretra|filtrasi|reabsorp|reabsorb|augmentasi|hemodialisis|nefritis|ADH',
    'hati': r'\bhati\b|hepar|empedu|bilirubin|biliverdin|hepatitis|sirosis|ikterus|kuning|ornitin|urea',
    'kulit': r'kulit|keringat|epidermis|dermis|sebasea|sudorifera|stratum|pori|jerawat|panu|eksim',
    'paru': r'paru|alveolus|bronk|trakea|karbon dioksida|co2|ekspirasi|inspirasi|asma|tbc|pneumonia|emfisema',
}

def pdftext(path, pages):
    args = ['pdftotext']
    if pages: args += ['-f', str(pages[0]), '-l', str(pages[1])]
    return subprocess.run(args + [str(path), '-'], capture_output=True, text=True).stdout

def paragraphs(text, bounds):
    lines = [l.rstrip() for l in text.replace('\f', '\n').split('\n')]
    if bounds:
        a = next((i for i, l in enumerate(lines) if re.search(bounds[0], l.strip())), 0)
        b = next((i for i, l in enumerate(lines) if i > a and re.search(bounds[1], l.strip())), len(lines))
        lines = lines[a:b]
    out, buf, heading, skipping = [], [], '', False
    def flush():
        if buf:
            t = ' '.join(buf)
            # gabungkan kata terpotong di akhir baris; kata ulang (paru-paru, sel-sel) tetap pakai tanda hubung
            t = re.sub(r'(\w+)- (\w+)', lambda m: f'{m[1]}-{m[2]}' if m[2].lower().startswith(m[1].lower()[:4]) and len(m[1]) >= 3 else m[1] + m[2], t)
            t = re.sub(r'\s+', ' ', t).strip()
            t = re.sub(r'(?:\b\d{1,2}\.\s+){2,}', '', t)  # nomor daftar yang terlepas dari isinya
            if len(t.split()) >= 6 and not re.search(r'\.{5,}', t): out.append((heading, t))
        buf.clear()
    for raw in lines:
        l = raw.strip()
        if not l:
            flush(); continue
        if NOISE.match(l) or re.match(r'^Gambar\s+\d', l) and len(l.split()) < 16:
            continue
        if SKIP_START.match(l):
            flush(); skipping = True; continue
        if skipping:
            if SKIP_END.match(l): skipping = False
            else: continue
        if HEADING.match(l) and len(l.split()) <= 8:
            flush(); heading = re.sub(r'^([0-9]{1,2}|[a-hA-H])[.)]\s+', '', l).strip().title(); continue
        buf.append(l)
    flush()
    return out

def chunks(paras, lo=70, hi=170):
    res, cur, cur_h = [], [], None
    for h, t in paras:
        if cur and (h != cur_h or sum(len(x.split()) for x in cur) >= lo):
            res.append((cur_h, ' '.join(cur))); cur = []
        cur_h = h
        words = t.split()
        while len(words) > hi:  # pecah paragraf panjang di batas kalimat
            part = ' '.join(words[:hi]); cut = part.rfind('. ')
            cut = cut + 1 if cut > 200 else len(part)
            res.append((h, part[:cut].strip())); words = part[cut:].split() + words[hi:]
        cur.append(' '.join(words))
    if cur: res.append((cur_h, ' '.join(cur)))
    return res

sources, out = [], []
for pattern, sid, title, level, pages, bounds in DOCS:
    files = sorted(SRC.glob(pattern))
    if not files: print('lewati (tidak ada file):', pattern); continue
    sources.append({'id': sid, 'title': title, 'level': level})
    for i, (h, t) in enumerate(chunks(paragraphs(pdftext(files[0], pages), bounds))):
        if not KEY.search(t + ' ' + (h or '')): continue
        if re.search(r'\bA\.\s.{1,120}\bB\.\s.{1,120}\bC\.\s', t) or re.search(r'\.\.\.\.|…\s*A\.', t): continue  # soal pilihan ganda
        if t.count('?') >= 2:  # pertanyaan tugas/latihan menempel di akhir → potong
            m = re.search(r'[^.!]*\?', t); t = t[:m.start()].strip() if m else t
            if len(t.split()) < 12: continue
        # judul hanya dipakai bila memang dibahas di potongan itu
        if h and not any(w.lower()[:5] in t.lower() for w in re.findall(r'[A-Za-z]{4,}', h)): h = ''
        n = len(t.split())
        org = [o for o, rx in ORG.items() if len(re.findall(rx, t, re.I)) >= (1 if n < 60 else 2) or re.search(rx, h or '', re.I)]
        out.append({'id': f'{sid}-{i}', 'src': sid, 'h': h or '', 't': t, 'o': org})
OUT.write_text(json.dumps({'sources': sources, 'chunks': out}, ensure_ascii=False, indent=0))
print(len(out), 'potongan →', OUT, f'({OUT.stat().st_size // 1024} KB)')
for s in sources: print(' ', s['id'], sum(1 for c in out if c['src'] == s['id']))
