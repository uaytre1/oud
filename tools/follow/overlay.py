"""Overlay videos from a follow result: the original video with the followed note drawn on top, and
optionally the app's computer oud mixed quietly over the original sound at the followed times.

Drawing: Pillow with raqm (Arabic shaping, direction='rtl'), DejaVu fonts. One transparent PNG per
on-screen state, timed with ffmpeg's concat demuxer and laid over the scaled video.
"""
import json, os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
GOLD, WHITE, DIM, GRAY = (240, 184, 80, 255), (245, 240, 230, 255), (170, 162, 150, 255), (120, 114, 106, 255)
PANEL = (16, 13, 11, 178)


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                          '-show_entries', 'format=duration', '-of', 'json', path], capture_output=True, text=True, check=True)
    j = json.loads(out.stdout)
    return j['streams'][0]['width'], j['streams'][0]['height'], float(j['format']['duration'])


def out_size(w, h, max_w=720):
    if w > max_w:
        h = h * max_w / w; w = max_w
    return int(w) // 2 * 2, int(round(h)) // 2 * 2


def _timeline(result):
    """[(time, (kind, occurrence, current note index, extra))] from the start of the video."""
    occs = [(k, [n for n in o['notes'] if n['played']]) for k, o in enumerate(result['occurrences'])]
    occs = [(k, p) for k, p in occs if p]
    ev = []
    for m, (k, played) in enumerate(occs):
        prev_end = occs[m - 1][1][-1]['t'] if m else -1e9
        next_start = occs[m + 1][1][0]['t'] if m + 1 < len(occs) else 1e9
        ev.append((max(0.0, prev_end + 0.3, played[0]['t'] - 1.2), 0, ('ready', k, None, None)))
        for n in played:
            ev.append((n['t'], 1, ('note', k, n['i'], None)))
        for x in result['occurrences'][k].get('extras', []):
            ev.append((x['t'], 2, ('extra', k, None, x)))
        ev.append((min(played[-1]['t'] + 2.5, next_start - 1.2), 3, ('clear', k, None, None)))
    ev.sort(key=lambda e: (e[0], e[1]))
    out, cur = [(0.0, ('clear', 0, None, None))], None
    for t, _, (kind, occ, i, x) in ev:
        if kind == 'note':
            cur = i; out.append((t, ('note', occ, cur, None)))
        elif kind == 'extra':
            if cur is not None:
                out.append((t, ('note', occ, cur, x)))
        else:
            cur = None; out.append((t, (kind, occ, None, None)))
    return out


class Painter:
    def __init__(self, W, H, result, score, label):
        self.W, self.H, self.result, self.score, self.label = W, H, result, score, label
        s = W / 720.0
        land = W > H
        self.ph = int(H * (0.42 if land else 0.31))
        self.f_big = ImageFont.truetype(FB, int((150 if not land else 120) * s))
        self.f_mid = ImageFont.truetype(FB, int(40 * s))
        self.f_line = ImageFont.truetype(FB, int(34 * s))
        self.f_sm = ImageFont.truetype(FR, int(26 * s))
        self.s = s

    def blank(self):
        return Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))

    def draw(self, kind, occ, extra, cur_note):
        im = self.blank()
        if kind == 'clear':
            return im
        g = ImageDraw.Draw(im)
        W, s = self.W, self.s
        g.rounded_rectangle([int(10 * s), int(10 * s), W - int(10 * s), self.ph], radius=int(22 * s), fill=PANEL)
        title = self.score.get('title', '')
        g.text((W - int(30 * s), int(40 * s)), title, font=self.f_line, fill=WHITE, anchor='rm', direction='rtl')
        g.text((int(30 * s), int(40 * s)), self.label, font=self.f_sm, fill=DIM, anchor='lm')
        if cur_note is None:
            g.text((W / 2, self.ph / 2 + int(10 * s)), 'Get ready…', font=self.f_mid, fill=GOLD, anchor='mm')
            return im
        o = self.result['occurrences'][occ]
        n = o['notes'][cur_note]
        sn = self.score['notes'][cur_note]
        # big note, string and finger
        cy = int(self.ph * 0.42)
        g.text((W / 2 + int(90 * s), cy), n['ar'], font=self.f_big, fill=GOLD, anchor='mm', direction='rtl')
        where = f"String {sn['string']}"
        fing = 'open' if not sn['finger'] else f"finger {sn['finger']}"
        g.text((int(40 * s), cy - int(28 * s)), where, font=self.f_mid, fill=WHITE, anchor='lm')
        g.text((int(40 * s), cy + int(26 * s)), fing, font=self.f_mid, fill=WHITE, anchor='lm')
        tag = f"Line {n['line']}"
        if n['flag'] == 'g':
            tag += ' · extra in the score'
        elif n['flag'] == 'r':
            tag += ' · picked again'
        if n.get('conf') is not None and n['conf'] < 0.5:
            tag += ' · unsure'
        g.text((int(40 * s), cy + int(78 * s)), tag, font=self.f_sm, fill=DIM, anchor='lm')
        # the current line, right to left; current note gold, notes the video skips dim
        line = [m for m in o['notes'] if m['line'] == n['line']]
        y0 = int(self.ph * 0.80)
        items = [(m, g.textlength(m['ar'], font=self.f_line, direction='rtl') + int(18 * s)) for m in line]
        # a window of the line around the current note that fits the panel
        k = next(x for x, (m, _) in enumerate(items) if m['i'] == cur_note)
        lo = hi = k
        room = W - int(60 * s) - items[k][1]
        while True:
            grew = False
            for side in (1, -1):
                j = hi + 1 if side == 1 else lo - 1
                if 0 <= j < len(items) and items[j][1] <= room:
                    room -= items[j][1]; grew = True
                    if side == 1:
                        hi = j
                    else:
                        lo = j
            if not grew:
                break
        shown = items[lo:hi + 1]
        x = W / 2 + sum(w for _, w in shown) / 2
        for m, w in shown:
            col = GOLD if m['i'] == cur_note else (WHITE if m['played'] else GRAY)
            g.text((x - w / 2, y0), m['ar'], font=self.f_line, fill=col, anchor='mm', direction='rtl')
            if not m['played']:
                g.line([x - w + int(10 * s), y0, x - int(10 * s), y0], fill=GRAY, width=max(1, int(2 * s)))
            x -= w
        if lo > 0:
            g.text((W - int(22 * s), y0), '…', font=self.f_line, fill=DIM, anchor='mm')
        if hi < len(items) - 1:
            g.text((int(22 * s), y0), '…', font=self.f_line, fill=DIM, anchor='mm')
        if extra is not None:
            g.text((W - int(30 * s), cy + int(78 * s)), f"+ {extra['ar']}", font=self.f_line, fill=DIM, anchor='rm', direction='rtl')
            g.text((W - int(30 * s), cy + int(112 * s)), 'extra pick', font=self.f_sm, fill=DIM, anchor='rm')
        return im


def make_overlay_frames(result, score, video, workdir, label, max_w=720):
    w0, h0, dur = probe(video)
    W, H = out_size(w0, h0, max_w)
    p = Painter(W, H, result, score, label)
    tl = _timeline(result)
    lst, cache = [], {}
    for k, (t, (kind, occ, cur, x)) in enumerate(tl):
        key = (kind, occ, cur, x['t'] if x else None)
        if key not in cache:
            path = os.path.join(workdir, f'ov{len(cache):04d}.png')
            p.draw(kind, occ, x, cur).save(path)
            cache[key] = path
        t_next = tl[k + 1][0] if k + 1 < len(tl) else dur
        if t_next > t:
            lst.append((cache[key], t_next - t))
    with open(os.path.join(workdir, 'list.txt'), 'w') as fh:
        for path, d in lst:
            fh.write(f"file '{path}'\nduration {d:.4f}\n")
        fh.write(f"file '{lst[-1][0]}'\n")
    return W, H, dur


def synth_notes(result, score):
    """Followed notes as the app's synth input: absolute time, duration to the next note, pitch in the
    recording's own tuning (score pitch + the occurrence's offset)."""
    out = []
    for o in result['occurrences']:
        for n in o['notes']:
            if n['played']:
                out.append({'t': n['t'], 'midi': score['notes'][n['i']]['midi'] + o['offset']})
    out.sort(key=lambda n: n['t'])
    for k, n in enumerate(out):
        nxt = out[k + 1]['t'] if k + 1 < len(out) else n['t'] + 1.2
        n['dur'] = round(float(min(1.6, max(0.12, nxt - n['t']))), 3)
    return out


def render(video, result, score, out_path, label, mix=False, synth_db=-6.0, max_w=720, keep=None):
    """Write the overlay video. mix=True also lays the app's computer oud over the original sound."""
    with tempfile.TemporaryDirectory(dir=keep) as td:
        W, H, dur = make_overlay_frames(result, score, video, td, label, max_w)
        inputs = ['-i', video, '-f', 'concat', '-safe', '0', '-i', os.path.join(td, 'list.txt')]
        fc = f'[0:v]scale={W}:{H},setsar=1[v];[1:v]format=rgba[o];[v][o]overlay=0:0:eof_action=repeat[vo]'
        amap = ['-map', '0:a?']
        if mix:
            notes = synth_notes(result, score)
            nj, sw = os.path.join(td, 'notes.json'), os.path.join(td, 'synth.wav')
            json.dump(notes, open(nj, 'w'))
            subprocess.run(['node', os.path.join(HERE, 'render_synth.js'), nj, sw], check=True, capture_output=True)
            g, post = _mix_gain(video, sw, notes, synth_db)
            inputs += ['-i', sw]
            # no limiter: its look-ahead delays the sound ~5 ms; a fixed scale keeps the sum below clipping
            fc += (f';[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];[2:a]aresample=44100,'
                   f'aformat=channel_layouts=stereo,volume={g:.4f}[a1];'
                   f'[a0][a1]amix=inputs=2:duration=first:normalize=0,volume={post:.4f}[ao]')
            amap = ['-map', '[ao]']
        cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[vo]', *amap,
               '-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '30',
               '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', f'{dur:.3f}', out_path]
        subprocess.run(cmd, check=True)
    return out_path


def _load(path, sr=22050):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def _mix_gain(video, synth_wav, notes, db):
    """Gain for the synth so its level while notes play sits `db` below the original's, and a scale for
    the sum that keeps its peak under 0.9 (1.0 when there is room)."""
    a, b = _load(video), _load(synth_wav)
    t0, t1 = notes[0]['t'], notes[-1]['t'] + 0.5
    sl = slice(int(t0 * 22050), int(t1 * 22050))
    ra = np.sqrt(np.mean(a[sl] ** 2) + 1e-12)
    rb = np.sqrt(np.mean(b[sl] ** 2) + 1e-12) if len(b[sl]) else 1.0
    g = float(ra / rb * 10 ** (db / 20))
    n = min(len(a), len(b))
    peak = float(np.abs(a[:n] + g * b[:n]).max()) if n else 1.0
    peak = max(peak, float(np.abs(a).max()))
    return g, min(1.0, 0.9 / max(peak, 1e-9))     # 0.9: the left or right channel can peak above the mono sum
