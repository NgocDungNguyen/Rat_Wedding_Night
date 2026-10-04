"""Generate MIDI stems for Đám cưới Làng Chuột (wedding tune + trailer score) and render with FluidSynth (FluidR3 GM)."""
import json, math, random, subprocess, os
import mido

random.seed(7)
TL = json.load(open('../timeline.json'))
SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
SR = 48000
TPB = 960; BPM = 120                       # absolute-time MIDI: 1 s = 1920 ticks
def tk(s): return int(round(s * TPB * BPM / 60))
os.makedirs('stems', exist_ok=True)

class Track:
    def __init__(s): s.ev = []           # (time_s, priority, msg)
    def prog(s, ch, p, t=0): s.ev.append((t, 0, mido.Message('program_change', channel=ch, program=p)))
    def cc(s, ch, c, v, t=0): s.ev.append((t, 0, mido.Message('control_change', channel=ch, control=c, value=int(max(0, min(127, v))))))
    def note(s, ch, n, t, d, v=100):
        if n is None: return
        s.ev.append((t, 2, mido.Message('note_on', channel=ch, note=int(n), velocity=int(max(1, min(127, v))))))
        s.ev.append((t + d, 1, mido.Message('note_off', channel=ch, note=int(n), velocity=0)))
    def bend(s, ch, t, semis):
        s.ev.append((t, 0, mido.Message('pitchwheel', channel=ch, pitch=int(max(-8191, min(8191, semis / 2 * 8191))))))
    def save(s, fn):
        mid = mido.MidiFile(ticks_per_beat=TPB); tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(BPM)))
        last = 0
        for t, _, m in sorted(s.ev, key=lambda e: (e[0], e[1])):
            k = tk(max(0, t)); m.time = k - last; last = k; tr.append(m)
        mid.save(fn)

def render(mid, wav, gain=.5):
    subprocess.run(['fluidsynth', '-ni', '-q', '-F', wav, '-r', str(SR), '-g', str(gain), '-R', '0', '-C', '0', SF, mid], check=True)

# ---------------------------------------------------------------- wedding tune (original, D-pentatonic → transposed to G)
NN = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def m(n): return None if n == 'r' else 12 * (int(n[-1]) + 1) + NN[n[0]] + (1 if '#' in n else -1 if n[1:2] == 'b' else 0)
A = "A4:4 B4:2 A4:2 G4:2 E4:2 G4:4 A4:2 B4:2 D5:2 E5:2 D5:6 B4:2 A4:2 B4:2 A4:2 G4:2 E4:4 D4:2 E4:2 G4:2 A4:2 E4:2 G4:2 D4:8"
A2 = "D5:4 E5:2 D5:2 B4:2 A4:2 B4:4 D5:2 E5:2 G5:2 E5:2 D5:6 E5:1 D5:1 B4:2 A4:2 G4:2 A4:2 B4:4 A4:2 G4:2 E4:2 G4:2 A4:2 B4:2 A4:8"
Bp = "E5:1 D5:1 B4:1 D5:1 E5:2 G5:2 E5:1 D5:1 B4:2 A4:4 B4:1 A4:1 G4:1 A4:1 B4:2 D5:2 B4:1 A4:1 G4:2 E4:4 G4:2 A4:2 B4:2 D5:2 E5:2 D5:2 B4:4 A4:2 G4:2 E4:2 G4:2 D4:8"
def parse(s, tr=5): return [(m(a) + tr, int(b)) for a, b in (x.split(':') for x in s.split())]
SONG = parse(A) + parse(A2) + parse(Bp)        # 24 bars of 2/4 (8 sixteenths/bar)

def kèn(T, ch, notes, t0, sx, vib=.28, slide_p=.45, detune=0., warp=None, vel=100, t_end=1e9):
    """expressive shawm line: slides, vibrato, grace notes. notes: [(midi, sixteenths)]; sx = seconds per 16th"""
    t = t0; prev = None
    for n, d in notes:
        dur = d * sx
        if t >= t_end: break
        dur = min(dur, t_end - t)
        if n is not None:
            if dur > 3 * sx and random.random() < .5:            # upper-neighbour grace
                T.note(ch, n + 2, t, .045, vel - 10); t_n = t + .045
            else: t_n = t
            T.note(ch, n, t_n, max(.03, dur - (t_n - t) - .01), vel + random.randint(-8, 8))
            base = detune
            if prev is not None and (abs(n - prev) >= 3 or random.random() < slide_p):
                for k in range(6): T.bend(ch, t_n + k * .012, base - (1 - k / 5) * 1.0)
            else: T.bend(ch, t_n, base)
            k = 0
            while t_n + .07 + k * .015 < t + dur - .02:
                tt = .07 + k * .015; amp = vib * min(1, max(0, (tt - .1) / .15))
                w = warp(t_n + tt) if warp else 0
                T.bend(ch, t_n + tt, base + w + amp * math.sin(2 * math.pi * 5.6 * tt)); k += 1
            prev = n
        t += d * sx
    return t

def wedding(t0, t1, bpm, tag, insane=False, transpose=0, octave_lift_from=None):
    sx = 60 / bpm / 4; bar = 8 * sx
    T1, T2, T3, T4 = Track(), Track(), Track(), Track()
    T1.prog(0, 111); T1.cc(0, 7, 110); T1.cc(0, 91, 20)
    T2.prog(1, 110); T2.cc(1, 7, 85)
    T3.prog(2, 107); T3.cc(2, 7, 90); T3.prog(3, 116); T3.cc(3, 7, 100)
    if insane: T1.prog(4, 111); T1.cc(4, 7, 95)
    song = [(n + transpose if n else n, d) for n, d in SONG]
    t = t0
    while t < t1:
        warp = (lambda tt: -1.2 * max(0, math.sin(tt * 1.7)) ** 8) if insane else None
        kèn(T1, 0, song, t, sx, vib=.35 if insane else .28, warp=warp, t_end=t1)
        if insane: kèn(T1, 4, [(n + 12 if n else n, d) for n, d in song], t + .012, sx, vib=.45, detune=.42, t_end=t1, vel=90)
        # fiddle heterophony: one held note per beat, octave down
        tt = t; acc = 0
        for n, d in song:
            if acc % 4 == 0 and tt < t1:
                T2.note(1, n - 12, tt, min(4 * sx * .95, t1 - tt), 80 + random.randint(-6, 6))
            acc += d; tt += d * sx
        t += sum(d for _, d in song) * sx
    # pluck & percussion grid
    nb = int((t1 - t0) / (2 * sx)) + 1
    root = 55 + transpose
    for i in range(nb):
        tt = t0 + i * 2 * sx
        if tt >= t1: break
        bi = i // 4; beat8 = i % 4                      # 8th index in bar
        T3.note(2, root + (7 if beat8 % 2 else 0) + (12 if beat8 == 2 else 0), tt, sx * 1.8, 70 + (15 if beat8 == 0 else 0))
        tt += random.uniform(-.008, .008)
        T4.note(9, 77, tt, .05, 92 if beat8 % 2 == 0 else 70)          # mõ
        T4.note(9, 76, tt + sx, .05, 55 + random.randint(0, 15))        # "cắc"
        T4.note(9, 54, tt, .05, 45)                                      # tambourine
        if beat8 == 2: T4.note(9, 52, tt, .3, 78 if not insane else 100)  # chũm chọe
        if beat8 == 0: T4.note(9, 36, tt, .1, 95); T3.note(3, 50, tt, .2, 95)
        if beat8 == 3: T3.note(3, 50, tt + sx, .15, 70)
        if bi % 8 == 0 and beat8 == 0: T4.note(9, 49, tt, .6, 90)
        if bi % 8 == 7 and beat8 >= 2:
            for k in range(2): T4.note(9, 38, tt + k * sx, .05, 70 + k * 10)
    for T, nm in [(T1, 'ken'), (T2, 'fiddle'), (T3, 'pluck'), (T4, 'perc')]:
        T.save(f'stems/{tag}_{nm}.mid'); render(f'stems/{tag}_{nm}.mid', f'stems/{tag}_{nm}.wav', .55)

# diegetic wedding music (loudspeaker): 102.86 BPM, downbeats on 29.0 and 43.0
WS = TL['wed_start']
wedding(WS, TL['wed_stop'] + .05, 60 / TL['wed_beat'], 'wed')
# distant loa again in the stinger (92 → 94.4)
wedding(91.0, 94.45, 60 / TL['wed_beat'], 'wed2')

# ---------------------------------------------------------------- chase score (140 BPM)
B0, BPMc = TL['b0'], TL['bpm_chase']; bt = 60 / BPMc
def b(n): return B0 + n * bt
FALL = 75.6
# insane wedding melody
Tm = Track(); Tm.prog(0, 111); Tm.cc(0, 7, 115); Tm.prog(4, 111); Tm.cc(4, 7, 100); Tm.prog(5, 110); Tm.cc(5, 7, 90)
sx = bt / 4
warp = lambda tt: -1.6 * max(0, math.sin(tt * 2.3)) ** 10
Bn, A2n = parse(Bp), parse(A2)
kèn(Tm, 0, Bn + A2n, b(0), sx, vib=.4, warp=warp, t_end=b(22))
kèn(Tm, 4, [(n + 12, d) for n, d in Bn + A2n], b(0) + .01, sx, vib=.5, detune=.45, warp=warp, t_end=b(22), vel=88)
# hold: one wailing note sliding down
Tm.note(0, m('D6') + 5 - 12, b(23), bt * 3.6, 100)
for k in range(60): Tm.bend(0, b(23) + k * bt * 3.6 / 60, -2 * (k / 59) ** 2 + .3 * math.sin(k * .9))
Tm.bend(0, b(26.8), 0)
kèn(Tm, 0, [(n + 12, d) for n, d in Bn + Bn], b(29), sx, vib=.45, warp=warp, t_end=FALL)
kèn(Tm, 4, [(n, d) for n, d in Bn + Bn], b(29) + .01, sx, vib=.5, detune=-.4, warp=warp, t_end=FALL, vel=95)
t = b(29)
for n, d in Bn + Bn:
    if t < FALL: Tm.note(5, n - 12, t, min(d * sx, FALL - t), 85)
    t += d * sx
Tm.save('stems/ch_ken.mid'); render('stems/ch_ken.mid', 'stems/ch_ken.wav', .55)

# strings ostinato + contrabass + tremolo hold
Ts = Track(); Ts.prog(0, 48); Ts.cc(0, 7, 115); Ts.prog(1, 43); Ts.cc(1, 7, 110); Ts.prog(2, 44); Ts.cc(2, 7, 100); Ts.prog(3, 45); Ts.cc(3, 7, 100)
pat = [0, 0, 12, 0, 1, 0, 12, 0, 0, 0, 12, 0, 3, 1, 0, 12]    # G with b2 (Ab) & b3 (Bb)
def ostinato(ta, tb, root=43):
    i = 0; t = ta
    while t < tb - 1e-6:
        Ts.note(0, root + pat[i % 16], t, sx * .8, 88 + (20 if i % 4 == 0 else 0)); Ts.note(3, root + 12 + pat[i % 16], t, sx * .5, 70)
        if i % 2 == 0: Ts.note(1, root - 12 + (1 if pat[i % 16] == 1 else 0), t, sx * 1.6, 100)
        i += 1; t += sx
ostinato(b(0), b(22)); ostinato(b(28.5), FALL)
for n in [79, 80, 86, 87]: Ts.note(2, n, b(22), b(27) - b(22), 90)
for n in [31, 38, 43, 44]: Ts.note(1, n, 52.5, 56.55 - 52.5, 85)          # pre-chase drone
Ts.save('stems/ch_str.mid'); render('stems/ch_str.mid', 'stems/ch_str.wav', .55)

# brass stabs & braams, choir, orchestra hits
Tb = Track(); Tb.prog(0, 61); Tb.cc(0, 7, 120); Tb.prog(1, 57); Tb.cc(1, 7, 120); Tb.prog(2, 58); Tb.cc(2, 7, 120)
Tb.prog(3, 52); Tb.cc(3, 7, 110); Tb.prog(4, 55); Tb.cc(4, 7, 115); Tb.prog(5, 53); Tb.cc(5, 7, 100)
def braam(t, d, notes=(31, 43, 50, 56), v=120):
    for n in notes: Tb.note(0, n + 12, t, d, v); Tb.note(1, n, t, d, v); Tb.note(2, n - 12, t, d, v)
braam(56.6, 1.6); braam(57.4, .5, v=110); braam(b(0), .9); braam(b(11), .3, (44, 50, 56)); braam(b(22), .6); braam(b(27), .3, (43, 50, 55)); braam(b(28.5), 2.2, (31, 43, 50, 56, 58))
braam(b(34), .4); braam(b(41), .5, (44, 51, 56)); braam(80.5, 3.5, (31, 38, 43, 50, 55, 62))
for n in [55, 62, 68]: Tb.note(5, n, 52.5, 56.6 - 52.5, 60)                                 # whisper choir (oohs)
for n in [55, 62, 68]: Tb.note(3, n, b(0), b(22) - b(0), 85)
for n in [67, 70, 74, 75, 79]: Tb.note(3, n, b(28.5), FALL - b(28.5), 100)
for mm in TL['montage']: Tb.note(4, 55, mm['t'], .25, 120); Tb.note(4, 43, mm['t'], .25, 120)
for n in [55, 62, 67, 70, 74]: Tb.note(3, n, 80.5, 5.5, 105)
Tb.save('stems/ch_brass.mid'); render('stems/ch_brass.mid', 'stems/ch_brass.wav', .32)

# drums: taiko, timpani, toms, cymbals
Td = Track(); Td.prog(0, 116); Td.cc(0, 7, 127); Td.prog(1, 47); Td.cc(1, 7, 120)
def taiko_bar(t, fill=False):
    for k, v in ([0, 125], [3, 95], [4, 115], [6, 100]) if not fill else ([i, 90 + i * 4] for i in range(8)):
        Td.note(0, 45 if k % 4 == 0 else 50, t + k * sx, .3, v)
    Td.note(1, 43, t, .5, 110)
def drums(ta, tb):
    t = ta; i = 0
    while t < tb - 1e-6:
        taiko_bar(t, fill=(abs(t + 2 * bt - b(22)) < .01 or abs(t + 2 * bt - b(34)) < .01))
        Td.note(9, 52 if i % 2 else 49, t + bt, .4, 100); Td.note(9, 42, t + 2 * sx, .05, 60); Td.note(9, 42, t + 6 * sx, .05, 60)
        for k in range(4): Td.note(9, 77 if k % 2 == 0 else 76, t + k * 2 * sx + random.uniform(-.006, .006), .05, 100 if k == 0 else 80)   # mõ / cắc
        Td.note(9, 52, t + 6 * sx, .3, 85)                                                                                     # chũm chọe offbeat
        t += 2 * bt; i += 1
drums(b(0), b(22)); drums(b(28.5), b(41))
for k in range(5): Td.note(0, 45, b(22) + k * bt, .4, 100 - k * 8)                         # hold pulses
for k in range(8): Td.note(0, 45 + k % 2 * 5, b(41) + k * sx * .5, .2, 80 + k * 6)        # stumble fill
for t in [56.6, 57.4, b(0), b(22), b(28.5), b(34), 80.5]: Td.note(9, 49, t, 1.0, 127); Td.note(9, 57, t, 1.0, 120); Td.note(1, 31, t, 1.2, 127)
Td.save('stems/ch_drums.mid'); render('stems/ch_drums.mid', 'stems/ch_drums.wav', .6)

# title / end: music box motif, slow and slightly detuned
Tx = Track(); Tx.prog(0, 10); Tx.cc(0, 7, 110); Tx.bend(0, 81.0, -.3)
t = 81.6
for n, d in parse(A)[:12]:
    Tx.note(0, n + 12, t, d * .17, 80); t += d * .17
t = 96.4
for n, d in parse(A)[-6:]:
    Tx.note(0, n + 12, t, d * .2, 70); t += d * .2
Tx.save('stems/title_box.mid'); render('stems/title_box.mid', 'stems/title_box.wav', .5)
print('music stems done')
