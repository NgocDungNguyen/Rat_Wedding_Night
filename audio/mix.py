"""Đám cưới Làng Chuột trailer — full sound design + mix + master (48 kHz stereo)."""
import json, os, math
import numpy as np, soundfile as sf
from scipy import signal
from scipy.ndimage import uniform_filter1d, minimum_filter1d

SR = 48000; DUR = 101.0; N = int(SR * DUR)
TL = json.load(open('../timeline.json')); CAM = json.load(open('../camtrack.json')); FPS = TL['fps']
rng = np.random.default_rng(1987)
T = np.arange(N) / SR
SFX = '../sfx'

def S(t): return int(round(t * SR))
def sos(k, f, o=2): return signal.butter(o, f, k, fs=SR, output='sos')
def lp(x, f, o=2): return signal.sosfilt(sos('lowpass', f, o), x, axis=0)
def hp(x, f, o=2): return signal.sosfilt(sos('highpass', f, o), x, axis=0)
def bp(x, a, b, o=2): return signal.sosfilt(sos('bandpass', [a, b], o), x, axis=0)
def pk(x): return x / (np.max(np.abs(x)) + 1e-12)
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
def curve(pts, t=None):
    a = np.array(pts, float); return np.interp(T if t is None else t, a[:, 0], a[:, 1])
def stereo(x, pan=0.):
    if x.ndim == 2: return x
    th = (np.asarray(pan) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], 1) * np.sqrt(2)

import subprocess
os.makedirs('sfx_wav', exist_ok=True)
def load(name, mono=True):
    for ext in ('ogg', 'wav', 'flac', 'mp3', 'oga', 'opus', 'webm'):
        p = f'{SFX}/{name}.{ext}'
        if os.path.exists(p) and os.path.getsize(p) > 1000:
            q = f'sfx_wav/{name}.wav'
            if not os.path.exists(q): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', p, '-ar', str(SR), q], check=True)
            x, sr = sf.read(q, always_2d=True)
            if sr != SR: x = signal.resample_poly(x, SR, sr, axis=0)
            return x.mean(1) if mono else x
    print('  [missing]', name); return None

def pitch(x, f):  # f>1 higher (shorter), f<1 lower (longer)
    return signal.resample_poly(x, 1000, int(round(1000 * f)), axis=0)

BUS = {k: np.zeros((N, 2)) for k in ['amb', 'foley', 'wed', 'score', 'sfx', 'crea']}
SEND = {k: np.zeros((N, 2)) for k in ['room', 'hall', 'far']}
def place(bus, x, t, g=1., pan=0., room=0., hall=0., far=0.):
    if x is None: return
    i = S(t); x = stereo(np.asarray(x, float), pan) * g
    if i < 0: x = x[-i:]; i = 0
    j = min(N, i + len(x)); x = x[:j - i]
    BUS[bus][i:j] += x; SEND['room'][i:j] += x * room; SEND['hall'][i:j] += x * hall; SEND['far'][i:j] += x * far

# ---------------------------------------------------------------- camera-relative spatialisation
cam_t = np.array([c['t'] for c in CAM]); last = None; P = []
for c in CAM:
    if 'pos' in c: last = (c['pos'], c['yaw'])
    P.append(last if last else ([0, 1.6, 106], 0.))
CP = np.array([p[0] for p in P]); CY = np.unwrap(np.array([p[1] for p in P]))
def cam_at(t): return np.array([np.interp(t, cam_t, CP[:, k]) for k in range(3)]), np.interp(t, cam_t, CY)
def spatial(src, t):
    """distance (m) and pan (-1..1) of a world point from the camera at time(s) t"""
    pos, yaw = cam_at(t); d = np.asarray(src)[:, None] - pos if np.ndim(t) else np.asarray(src) - pos
    dx, dz = d[0], d[2]; dist = np.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2)
    right = np.array([np.cos(yaw), -np.sin(yaw)]); fwd = np.array([-np.sin(yaw), -np.cos(yaw)])
    h = np.sqrt(dx ** 2 + dz ** 2) + 1e-6
    return dist, (dx * right[0] + dz * right[1]) / h, (dx * fwd[0] + dz * fwd[1]) / h

def tv_lowpass(x, fc, block=512):
    """time-varying 1-pole-ish lowpass via block biquads; fc per-sample array"""
    out = np.zeros_like(x); zi = np.zeros((1, 2, x.shape[1])) if x.ndim == 2 else np.zeros((1, 2))
    for s in range(0, len(x), block):
        so = sos('lowpass', float(np.clip(fc[s], 60, 20000)), 2)
        y, zi = signal.sosfilt(so, x[s:s + block], axis=0, zi=zi if x.ndim == 1 else zi)
        out[s:s + block] = y
    return out

def render_wav(path, t0=0):
    x, sr = sf.read(path, always_2d=True); x = x.mean(1)
    if sr != SR: x = signal.resample_poly(x, SR, sr)
    out = np.zeros(N); n = min(N, len(x)); out[:n] = x[:n]; return out

# ---------------------------------------------------------------- synth building blocks
def env_ad(n, a=.005, d=.3):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def noise(n): return rng.standard_normal(n)
def boom(dur=4., f0=80, f1=28, size=1.):
    n = S(dur); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / .1); ph = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(ph) * np.exp(-t / (.9 * size)) * np.minimum(1, t / .002)
    crack = lp(noise(n), 3000) * np.exp(-t / .06) * .6
    body = lp(noise(n), 250) * np.exp(-t / .5) * .8
    return pk(np.tanh(1.6 * (sub + crack + body)))
def whoosh(dur=.5, f0=400, f1=3000, rev=False):
    n = S(dur); t = np.arange(n) / SR; x = noise(n)
    e = np.sin(np.pi * t / dur) ** 2
    y = bp(x, 200, 6000) * e * (.3 + .7 * t / dur)
    return pk(y[::-1] if rev else y)
def riser(dur=4., f0=60, oct_=5):
    n = S(dur); t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(oct_):
        p = (k + t / dur * 1.5) % oct_; a = np.exp(-((p - oct_ / 2) / (oct_ / 4)) ** 2)
        y += a * np.sin(2 * np.pi * np.cumsum(f0 * 2 ** p) / SR)
    nz = hp(noise(n), 1500) * (t / dur) ** 3
    return pk(pk(y) + .6 * pk(nz)) * (t / dur) ** 2
def heartbeat(t0, t1, bpm0, bpm1, g=1., muffle=False):
    t = t0
    while t < t1:
        for dt, a in [(0, 1), (.15, .7)]:
            n = S(.3); tt = np.arange(n) / SR
            x = np.sin(2 * np.pi * np.cumsum(48 * (1 + 1.2 * np.exp(-tt / .012))) / SR) * np.exp(-tt / .07) * np.minimum(1, tt / .003)
            place('sfx', x * a, t + dt, g * .9)
        t += 60 / np.interp(t, [t0, t1], [bpm0, bpm1])
def tinnitus(t0, dur, g):
    n = S(dur); tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 6300 * tt) + .4 * np.sin(2 * np.pi * 8900 * tt)) * np.exp(-tt / (dur * .45)) * np.minimum(1, tt / .02)
    place('sfx', x, t0, g)
def buzz(t0, dur, g):
    n = S(dur); tt = np.arange(n) / SR; gate = (rng.random(int(dur * 40) + 2) > .4).repeat(S(1 / 40))[:n]
    x = np.tanh(3 * signal.sawtooth(2 * np.pi * 100 * tt)) * lp(gate.astype(float), 300)
    place('sfx', bp(x, 200, 5000), t0, g, room=.2)
def screech(dur=.8):
    n = S(dur); tt = np.arange(n) / SR; y = np.zeros(n)
    for f in [2100, 2370, 3130, 4400, 5200]:
        y += np.sin(2 * np.pi * np.cumsum(f * (1 + .03 * np.sin(2 * np.pi * 23 * tt) + .2 * tt)) / SR)
    y = y * np.exp(-tt / (dur * .35)) * np.minimum(1, tt / .004) + hp(noise(n), 3000) * np.exp(-tt / .05) * .8
    return pk(np.tanh(2 * y))
def glitch(dur=.15):
    n = S(dur); x = noise(n)
    hold = np.repeat(x[::rng.integers(8, 40)], 40)[:n] if n > 40 else x
    tt = np.arange(n) / SR
    return pk(np.round(hold * 4) / 4 * (signal.square(2 * np.pi * rng.uniform(40, 200) * tt) * .5 + .5)) * .8
def growl_synth(dur, f0=55, k=1.):
    n = S(dur); tt = np.arange(n) / SR
    jit = uniform_filter1d(rng.standard_normal(int(dur * 6) + 3), 1).repeat(S(1 / 6) + 1)[:n]
    ph = 2 * np.pi * np.cumsum(f0 * (1 + .15 * jit)) / SR
    src = signal.sawtooth(ph) * .7 + .5 * signal.sawtooth(ph / 2)
    rough = np.abs(uniform_filter1d(noise(n), S(1 / 35)) * 8)
    x = (src + .8 * pk(lp(noise(n), 1200))) * (.3 + rough)
    y = bp(x, 120, 1000) + .4 * bp(x, 1000, 2600)
    e = np.minimum(1, tt / .2) * np.clip((dur - tt) / .3, 0, 1)
    return pk(np.tanh(2 * k * pk(y) * e))

def ir(dur, t60, bright, dark, seed, pre=.01):
    r = np.random.default_rng(seed); n = S(dur); t = np.arange(n) / SR; out = np.zeros((n, 2))
    for c in range(2):
        x = r.standard_normal(n); w = t / dur
        x = (lp(x, bright) * (1 - w) + lp(x, dark) * w) * np.exp(-6.91 * t / t60)
        x[:S(pre)] = 0; out[:, c] = x
    return out / np.sqrt(np.sum(out ** 2, 0))

# ================================================================= AMBIENCE
print('ambience')
amb_lvl = curve([(0, .0), (.4, .0), (1.6, .8), (15, 1), (18.5, 1), (31, .75), (43, .45), (48.95, .4), (49.0, 0), (89.2, 0), (92.5, .7), (94.35, .7), (94.4, 0)])
wind_lvl = curve([(0, 0), (1.5, .55), (18.5, .6), (20.2, .6), (20.8, 1.1), (22, .6), (31, .45), (43, .25), (49.0, .25), (49.02, .12), (56.6, .2), (57.6, .75), (75.55, .9), (75.6, .35),
                  (78.79, .4), (78.8, 0), (80.5, 0), (80.6, .35), (87, .2), (89, .2), (90.5, .5), (94.35, .5), (94.4, .15), (95.3, .15), (95.31, 0), (95.6, .18), (101, .1)])
w = load('wind')
if w is not None:
    w = hp(w, 60); reps = int(np.ceil(N / len(w))) + 1
    ww = np.concatenate([w if k % 2 == 0 else w[::-1] for k in range(reps)])[:N]
    wl = np.concatenate([w[::-1] if k % 2 == 0 else w for k in range(reps)])[S(1.3):S(1.3) + N]
    wind = np.stack([ww, wl], 1) / rms(w)
else: wind = np.zeros((N, 2))
# synthetic whistle ("gió rít") layer
x = noise(N); fc = 900 + 500 * uniform_filter1d(noise(N // 2400 + 2), 3).repeat(2400)[:N]
whistle = np.zeros(N)
for s in range(0, N, 1024):
    f = float(np.clip(fc[s], 400, 2500)); b, a = signal.iirpeak(f, 25, SR); whistle[s:s + 1024] = signal.lfilter(b, a, x[s:s + 1024])
whistle = whistle / rms(whistle) * curve([(0, .15), (20.8, .6), (23, .15), (57.6, .35), (75.6, .2), (89, .3), (101, .2)])
wind = wind + stereo(whistle * .5, .3)
wind_f = tv_lowpass(wind, curve([(0, 5000), (43, 2500), (49, 1800), (57.6, 6000), (75.6, 6000), (75.65, 700), (78.8, 900), (89, 1200), (92, 4500), (101, 4500)]))
place('amb', wind_f * wind_lvl[:, None], 0, .1)
# insects & frogs
pond = load('pond'); frogs = load('frogs_niger') ; fch = load('frogs_chorus'); cic = load('cicada')
def bed(x, g, seed=0):
    if x is None: return np.zeros((N, 2))
    x = hp(x, 150); reps = int(np.ceil(N / len(x))) + 1
    a = np.concatenate([x] * reps)[:N]; b = np.concatenate([x] * reps)[S(len(x) / SR * .37):][:N]
    if len(b) < N: b = np.pad(b, (0, N - len(b)))
    return np.stack([a, b], 1) / rms(x) * g
insects = bed(pond, .5) + bed(frogs, .35) + bed(fch, .25) + bed(cic, .08)
# synthetic crickets (always available; Vietnamese field "dế")
def cricket(f, cr, pulses, pr):
    cyc = np.cumsum(cr * (1 + .05 * np.sin(T * .3 + f))) / SR; phc = cyc % 1; on = pulses / pr * cr
    pp = (phc / on * pulses) % 1; e = (phc < on) * np.sin(np.pi * pp) ** 2
    ph = 2 * np.pi * f * T; return (np.sin(ph) + .25 * np.sin(2 * ph)) * e
cr = np.zeros((N, 2))
for k, (f, c, p, r_) in enumerate([(3900, 2.1, 4, 32), (4300, 2.6, 3, 28), (4700, 1.7, 5, 36), (5100, 3.0, 3, 30), (4500, 2.3, 4, 34), (3700, 1.4, 6, 40)]):
    cr += stereo(cricket(f, c, p, r_) * rng.uniform(.4, 1), rng.uniform(-.8, .8))
insects = insects + cr * .25
insects_f = tv_lowpass(insects, curve([(0, 9000), (31, 6000), (43, 3500), (49, 3500), (89, 2500), (93, 8000), (101, 8000)]))
place('amb', insects_f * amb_lvl[:, None], 0, .07, room=.1)
# low unease drone
dr = (np.sin(2 * np.pi * 41.2 * T) + np.sin(2 * np.pi * 41.6 * T) + .5 * np.sin(2 * np.pi * 61.8 * T)) / 2.5
place('amb', dr * curve([(0, 0), (31, 0), (43, .3), (49, .6), (56.6, 1), (57.4, 0), (66.9, 0), (67.03, .8), (69.17, .8), (69.3, 0), (75.6, .8), (78.8, .8), (78.81, 0), (81, .5), (87, .3), (89, .3), (95.3, .3), (95.6, .5), (101, 0)]), 0, .12)

# distant animals & village
def far(x, t, g, pan, cut=2500, f=1.):
    if x is None: return
    if f != 1: x = pitch(x, f)
    place('amb', lp(x, cut), t, g, pan, room=.2, far=.8)
dh = load('doghowl'); wolf = load('wolf'); gk = load('gecko'); ro = load('rooster'); owl = load('owl'); fc_ = load('firecrackers'); tb = load('templebell')
far(dh, 8.8, .25, -.7, 2200); far(dh, 38.6, .22, .75, 2600, .94)
far(wolf[:S(9)] if wolf is not None else None, 41.0, .18, -.5, 1800, .82)
if gk is not None: place('amb', hp(gk, 300), 33.4, .35, -.55, room=.3, far=.3)
far(ro, 27.4, .14, .8, 2500, .9); far(owl, 21.4, .16, -.8, 2400)
if fc_ is not None: far(fc_[S(5):S(12)], 25.2, .1, .85, 1600)
far(tb, 18.55, .3, -.3, 3000, .92)

# wind chimes (world-positioned chime on the porch) + lone chimes
ch1 = load('chime1'); ch2 = load('chime2')
if ch1 is not None:
    seg = ch1[S(2):S(10)]
    d, pan, fw = spatial([5.35, 2.75, 3.4], 36.0)
    place('amb', seg * np.hanning(len(seg)) ** .3, 34.6, .22, float(np.clip(pan, -1, 1)), room=.3)
    place('sfx', ch1[S(4):S(10)] * np.exp(-np.arange(S(6)) / SR / 2.5), 49.55, .25, .2, hall=.5)
    place('sfx', ch1[S(4):S(10)] * np.exp(-np.arange(S(6)) / SR / 2.0), 79.2, .2, -.2, hall=.6)
if ch2 is not None: place('amb', ch2[S(1):S(8)], 12.0, .08, .4, room=.3, far=.4)

# ================================================================= FOLEY
print('foley')
def extract_hits(x, n=24, win=.32):
    if x is None: return []
    e = uniform_filter1d(np.abs(hp(x, 120)), S(.01)); thr = np.percentile(e, 97)
    peaks, _ = signal.find_peaks(e, height=thr, distance=S(.35)); hits = []
    for p in peaks[:200]:
        a = max(0, p - S(.03)); seg = x[a:a + S(win)]
        if len(seg) == S(win): hits.append(pk(seg * np.r_[np.ones(S(win) - S(.08)), np.hanning(S(.16))[S(.08):]]))
    rng.shuffle(hits); return hits[:n]
gr = load('grass'); tg = load('tallgrass')
H = extract_hits(gr, 30) or extract_hits(tg, 30); HT = extract_hits(tg, 20)
def synth_step(heavy=1.):
    n = S(.25); t = np.arange(n) / SR; nz = noise(n)
    body = lp(nz * env_ad(n, .003, .05 + .02 * heavy), 900)
    crunch = hp(uniform_filter1d((rng.random(n) < .02) * nz, 30), 2500) * np.exp(-t / .05)
    return pk(pk(body) * .8 + pk(crunch) * .5 + np.sin(2 * np.pi * 70 * t) * np.exp(-t / .03) * .6 * heavy)
for st in TL['steps']:
    t = st['t']; k = st['kind']
    x = H[rng.integers(len(H))] if H else synth_step(1.3 if k == 'run' else 1)
    sy = synth_step(1.4 if k == 'run' else .8); x = x.copy(); x[:len(sy)] = .6 * x[:len(sy)] + .4 * sy[:len(x)]
    if 43 < t < 49: x = lp(x, 2200)                                             # carpet in the tent
    g = {'walk': .32, 'run': .55, 'shuffle': .14}[k] * st['amp'] * rng.uniform(.85, 1.1)
    place('foley', x, t, g, .06 if st['foot'] else -.06, room=.08)
    if k == 'run' and HT: place('foley', HT[rng.integers(len(HT))], t + .01, .18, rng.uniform(-.4, .4))
clk = load('click')
if clk is not None: place('foley', clk, 5.15, .4, .15, room=.1)
br2 = load('breath2'); br3 = load('breath3')
def synth_breath(dur, cyc, inten=1.):
    n = S(dur); tt = np.arange(n) / SR; ph = (tt / cyc) % 1
    e = np.where(ph < .42, np.sin(np.pi * ph / .42) ** 1.5 * .7, np.sin(np.pi * (ph - .42) / .58) ** 1.2)
    nz = noise(n); x = np.where(ph < .42, bp(nz, 900, 4200), bp(nz, 350, 2000) + .6 * bp(nz, 1000, 1500))
    return pk(x * e * inten)
if br3 is None:
    place('foley', synth_breath(4.2, 1.6), 52.4, .1); place('foley', synth_breath(17.5, .55), 57.7, .16)
    place('foley', lp(synth_breath(3, .6), 1600), 75.75, .22); place('foley', lp(synth_breath(3.4, 1.2), 2200), 89.2, .16)
def breath_seg(x, a, b): return None if x is None else x[S(a):S(b)] * np.r_[np.hanning(S(.6))[:S(.3)], np.ones(S(b - a) - S(.6)), np.hanning(S(.6))[S(.3):]][:S(b) - S(a)]
if br3 is not None:
    place('foley', lp(breath_seg(br3, 1, 5.5), 4000), 52.4, .16)                          # nervous held breath while turning
    place('foley', breath_seg(br3, 6, 20), 57.7, .3)                                        # panting while running
    place('foley', lp(breath_seg(br3, 1, 4.5), 1600), 75.75, .38, room=.1)                 # after the fall (muffled)
if br2 is not None:
    place('foley', breath_seg(br2, 3, 16), 61.0, .22)
    place('foley', lp(breath_seg(br2, 1, 4.6), 2200), 89.2, .3)                            # waking up
# fall: thud + grass + flashlight clatter
th = load('thud')
place('foley', boom(1.2, 120, 40, .3), 75.6, .7); place('foley', th, 75.6, .6) if th is not None else None
if HT: place('foley', HT[0], 75.58, .5); place('foley', HT[1 % len(HT)], 75.72, .35)
for i, (dt, g) in enumerate([(.04, .5), (.22, .35), (.41, .25), (.55, .15)]):
    n = S(.25); tt = np.arange(n) / SR
    clink = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / .04) for f in (1830, 2710, 4120, 5600)) * (1 + .3 * i)
    place('foley', pk(clink), 75.6 + dt, g * .5, .4, room=.2)
place('foley', bp(noise(S(.5)), 2000, 8000) * np.hanning(S(.5)), 65.35, .25, .5)            # banyan roots brush

# ================================================================= DIEGETIC WEDDING MUSIC (loudspeaker)
print('wedding')
def loa_chain(tag):
    mix = sum(render_wav(f'stems/{tag}_{p}.wav') * g for p, g in [('ken', 1.0), ('fiddle', .55), ('pluck', .5), ('perc', .75)])
    x = hp(mix, 380, 3); x = lp(x, 4800, 3)
    b, a = signal.iirpeak(1600, 1.2, SR); x = x + .6 * signal.lfilter(b, a, x)
    return np.tanh(3.0 * x / (np.max(np.abs(x)) + 1e-9)) * .7
LOA = [3.7, 6.1, -62.4]
wed = loa_chain('wed')
# tape warble while inside the tent (45 → 49)
warp = curve([(0, 0), (44.5, 0), (46, .004), (49, .012)])
idx = np.arange(N) - warp * SR * np.sin(2 * np.pi * .8 * T) * 1.0
wed = np.interp(idx, np.arange(N), wed)
d, pan, fw = spatial(LOA, T[::480])
d = np.interp(T, T[::480], d); pan = np.interp(T, T[::480], pan); fw = np.interp(T, T[::480], fw)
g = 1 / (1 + d / 7) * (.75 + .25 * (fw > -0.2))
fc = 12000 * np.exp(-d / 45) + 700
wedL = tv_lowpass(stereo(wed, np.clip(pan * .8, -1, 1)), fc)
wedL *= (g * curve([(0, 0), (TL['wed_start'], 0), (TL['wed_start'] + 1.2, 1), (48.995, 1), (49.0, 0), (101, 0)]))[:, None]
place('wed', wedL, 0, 2.2, far=.0)
SEND['far'] += wedL * 2.2 * np.clip(d / 80, .15, .9)[:, None]
SEND['room'] += wedL * 2.2 * .25 * (np.abs(T - 46) < 3.2)[:, None]
st = load('static1')
if st is not None: place('sfx', hp(st[:S(.25)], 500) * np.hanning(S(.25)), 49.0, .25, .3)
wed2 = loa_chain('wed2'); wed2 = lp(wed2, 1500) * curve([(0, 0), (91.6, 0), (92.6, 1), (94.38, 1), (94.4, 0)])
place('wed', stereo(wed2, -.1), 0, .5, far=.9)

# ================================================================= SCORE
print('score')
for nm, g, h in [('ch_ken', 1.7, .25), ('ch_str', 1.7, .35), ('ch_brass', .8, .45), ('ch_drums', 1.2, .3), ('title_box', 1.6, .8)]:
    x = render_wav(f'stems/{nm}.wav')
    if nm == 'ch_ken':                          # insane double: loudspeaker-crushed copy layered
        x = x + .5 * np.tanh(4 * hp(x, 500))
    place('score', x, 0, g, hall=h)
# hard cuts in the score at the fall and after the roar
cut = curve([(0, 1), (75.595, 1), (75.6, 0), (80.45, 0), (80.5, 1), (101, 1)])
BUS['score'] *= cut[:, None]; SEND['hall'][:S(80.45)] *= cut[:S(80.45), None]

# ================================================================= CREATURE
print('creature')
tig = load('tiger')
def tiger_seg(a, b, f=.75):
    if tig is None: return growl_synth(b - a, 52, 1.5)
    x = tig[S(a):S(b)]; x = pitch(x, f); return pk(x * np.r_[np.hanning(S(.1))[:S(.05)], np.ones(len(x) - S(.1)), np.hanning(S(.1))[S(.05):]][:len(x)])
# find loud segments in the tiger recording for roars / growls
ROARS, GROWLS = [], []
if tig is not None:
    e = uniform_filter1d(np.abs(tig), S(.05)); thr = np.percentile(e, 92)
    on = e > thr; edges = np.flatnonzero(np.diff(on.astype(int)))
    segs = [(edges[i] / SR, edges[i + 1] / SR) for i in range(0, len(edges) - 1, 2) if edges[i + 1] - edges[i] > S(.4)]
    segs.sort(key=lambda s: -(s[1] - s[0]))
    ROARS = [(a - .05, min(b + .3, a + 2.5)) for a, b in segs[:4]]
    q = np.percentile(e, 60); on = e > q; edges = np.flatnonzero(np.diff(on.astype(int)))
    GROWLS = [(edges[i] / SR, edges[i + 1] / SR) for i in range(0, len(edges) - 1, 2) if 1.0 < (edges[i + 1] - edges[i]) / SR < 4][:8]
    print('  roars', [(round(a, 1), round(b, 1)) for a, b in ROARS], 'growls', len(GROWLS))
def roar(i=0, f=.72): return tiger_seg(*ROARS[i % len(ROARS)], f) if ROARS else growl_synth(2, 70, 2.5)
def growl(i=0, f=.65, dur=None):
    if not GROWLS: return growl_synth(dur or 2, 50, 1.2)
    a, b = GROWLS[i % len(GROWLS)]; return tiger_seg(a, b if dur is None else min(b, a + dur), f)
def crea(x, t, g, src=None, pan=0., room=.15, hall=.2, low=None):
    if x is None: return
    x = x + .45 * growl_synth(len(x) / SR, 46, 1.3) * np.linspace(1, .6, len(x))     # monstrous sub layer
    if src is not None:
        dd, pn, fw = spatial(src, t + len(x) / SR / 2); pan = float(np.clip(pn, -1, 1)); g = g / (1 + dd / 6)
        if fw < -.3: x = lp(x, 1800)
    if low: x = lp(x, low)
    place('crea', x, t, g, pan, room=room, hall=hall)
crea(growl(0, .6, 1.4), 55.1, .6, [0, 2, -49.2], hall=.4)
crea(roar(0, .78), 56.62, 1.2, pan=0, hall=.5)
crea(roar(1, 1.05)[:S(.6)], 62.31, .8, pan=.3); place('sfx', screech(.5), 62.31, .25, .3, hall=.3)
crea(growl(1, .62, 2.0), 63.6, .5, pan=-.2, low=1500)                 # off-screen behind
for k, t in enumerate([67.05, 67.9, 68.5]): crea(growl(k + 2, .7, .9), t, 1.0, None, pan=0)
crea(growl(3, .62, 1.5), 70.6, .55, pan=.1, low=1800)
for mm in TL['montage']:
    if mm['img'] == 'eyes': crea(roar(rng.integers(4), .9)[:S(.25)], mm['t'], .7)
# gallop thuds while it chases (F4) — synced to its run phase t*2.7
for t in np.arange(67.03, 69.81, 1 / (2.7 * 2)):
    dd, pn, fw = spatial([-30, 0, np.interp(t, [67.03, 69.81], [-40, -21.3])], t)
    place('crea', boom(.4, 90, 45, .15), t, .5 / (1 + dd / 5), float(np.clip(pn, -1, 1)))
for t in np.arange(76.4, 77.95, .4):
    place('crea', lp(boom(.5, 80, 38, .2), 900), t, .18 + .25 * (t - 76.4), -.1)
crea(growl(4, .6, 1.2), 77.4, .9, pan=-.1)
crea(roar(2, .7), 78.56, 1.5, pan=0, hall=.3)
BUS['crea'] *= curve([(0, 1), (78.795, 1), (78.8, 0), (94.9, 0), (94.95, 1), (101, 1)])[:, None]
crea(roar(3, .95)[:S(.35)], 94.98, 1.4)

# ================================================================= HITS, RISERS, TRANSITIONS
print('hits')
gong = load('gong'); thunder = load('thunder'); gb = load('gongbell')
if gong is None: gong = gb
if thunder is None:
    n = S(7); tt = np.arange(n) / SR
    thunder = pk(lp(noise(n), 1800) * np.exp(-tt / .25) * 1.5 + lp(noise(n), 300) * np.exp(-tt / 2.2) * (1 + .5 * np.sin(tt * 9)) + hp(noise(n), 2500) * np.exp(-tt / .03))
for h in TL['hits']:
    t, k, s = h['t'], h['kind'], h['s']
    if k == 'soft': place('sfx', boom(3.5, 60, 30, .8), t, .35 * s / .4, hall=.4)
    elif k == 'taiko': place('sfx', boom(2.5, 70, 35, .6), t, .4, hall=.3)
    elif k in ('braam', 'slam'): place('sfx', boom(4, 90, 25, 1.2), t, .9 * s, hall=.5); place('sfx', glitch(.2), t, .2)
    elif k == 'big': place('sfx', boom(4, 100, 26, 1.1), t, .85, hall=.5); place('sfx', whoosh(.35, 3000, 300), t - .05, .25)
    elif k == 'hit': place('sfx', boom(2.5, 90, 30, .7), t, .55 * s, hall=.4)
    elif k == 'flash': place('sfx', glitch(.2), t, .3)
    elif k == 'title':
        place('sfx', boom(6, 110, 22, 1.6), t, 1.0, hall=.6)
        if thunder is not None: place('sfx', thunder[:S(7)] * np.exp(-np.arange(S(7)) / SR / 2.8), t - .02, .7, hall=.3)
        if gong is not None:
            gi = int(np.argmax(np.abs(gong[:S(4)]))); place('sfx', gong[max(0, gi - S(.02)):gi + S(8)], t, .8, hall=.4)
    elif k == 'sting': place('sfx', screech(1.0), t, .45, hall=.4); place('sfx', boom(3, 120, 30, .9), t, .8, hall=.4)
for t in [57.0, 67.03, 68.95]: place('sfx', whoosh(.4, 300, 4000), t - .05, .35, -.2)
place('sfx', whoosh(.35, 4000, 300), 75.25, .3)
for mm in TL['montage']: place('sfx', glitch(.12), mm['t'], .25, rng.uniform(-.5, .5)); place('sfx', boom(1.2, 110, 40, .3), mm['t'], .35)
place('sfx', riser(2.0), 54.6, .35, hall=.3)
place('sfx', riser(3.0), 72.17, .4, hall=.3)
place('sfx', screech(.6) * np.linspace(0, 1, S(.6)), 78.0, .3)
if gb is not None:
    rev = gb[:S(4)][::-1]; place('sfx', rev * np.linspace(0, 1, len(rev)) ** 2, 80.5 - len(rev) / SR, .5, hall=.5)
buzz(49.0, .45, .12); buzz(56.6, .8, .15)
heartbeat(49.3, 57.3, 58, 104, .55); heartbeat(67.1, 69.2, 140, 150, .6); heartbeat(75.75, 78.75, 150, 160, .55); heartbeat(89.3, 92.5, 72, 64, .4)
tinnitus(75.6, 3.1, .05)
if gong is not None: place('sfx', lp(gong[S(.5):S(6)], 900), 95.7, .2, hall=.6)
if dh is not None: far(dh, 97.6, .2, .6, 2000, .9)
SFXcut = curve([(0, 1), (78.795, 1), (78.8, 0), (79.15, 0), (79.2, 1), (101, 1)])
BUS['sfx'] *= SFXcut[:, None]; BUS['foley'] *= SFXcut[:, None]; BUS['amb'] *= curve([(0, 1), (78.795, 1), (78.8, 0), (80.5, 0), (80.55, 1), (101, 1)])[:, None]

# ================================================================= REVERBS & MASTER
print('reverb + master')
mix = sum(BUS.values())
for k, (imp, g) in {'room': (ir(1.2, .9, 7000, 3000, 1), .5), 'hall': (ir(4.5, 3.8, 6000, 1800, 2), .7), 'far': (ir(5.5, 5.0, 3000, 900, 3), .8)}.items():
    hc = curve([(0, 1), (75.6, 1), (75.75, .08), (77.3, .08), (77.6, 1), (101, 1)]) if k == 'hall' else np.ones(N)
    for c in range(2): mix[:, c] += signal.fftconvolve(SEND[k][:, c], imp[:, c])[:N] * g * hc
mix = hp(mix, 25)
# keep the hard silences truly silent (reverb tails cut too)
hard = curve([(0, 1), (78.8, 1), (78.81, 0), (79.15, 0), (79.2, 1), (95.3, 1), (95.32, .0), (95.55, 0), (95.6, 1), (101, 1)])
mix *= hard[:, None]
# glue compression
env = uniform_filter1d(np.max(np.abs(mix), 1), S(.02)); thr = .25
gain = np.where(env > thr, (thr / env) ** .35, 1.); gain = uniform_filter1d(gain, S(.05)); mix *= gain[:, None]
import pyloudnorm as pyln
meter = pyln.Meter(SR); L = meter.integrated_loudness(mix); mix = pyln.normalize.loudness(mix, L, -14.5)
pkv = np.max(np.abs(mix), 1); g = np.minimum(1, .89 / np.maximum(pkv, 1e-9)); g = minimum_filter1d(g, S(.003) * 2 + 1); g = uniform_filter1d(g, S(.003))
mix = np.tanh(mix * g[:, None] * 1.02)
fade = curve([(0, 0), (.3, 1), (100.3, 1), (101, 0)]); mix *= fade[:, None]
print('LUFS', round(meter.integrated_loudness(mix), 1), 'peak', round(float(np.max(np.abs(mix))), 3))
sf.write('trailer_mix.wav', mix.astype(np.float32), SR, subtype='FLOAT')
for k, v in BUS.items(): print(f'  {k:6s} rms {20 * np.log10(rms(v) + 1e-9):6.1f} dB')
