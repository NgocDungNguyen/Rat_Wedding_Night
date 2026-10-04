"""Master timeline for the Đám cưới Làng Chuột trailer — shared by the video renderer and the audio mixer."""
import json

FPS = 24
DUR = 101.0
BPM_CHASE = 140.0
B0 = 57.6                       # chase downbeat
def b(n): return round(B0 + n * 60 / BPM_CHASE, 4)

WED_BEAT = 14.0 / 24            # wedding tune beat (102.86 BPM), downbeats on 29.0 & 43.0
WED_START = round(29.0 - 28 * WED_BEAT, 4)
WED_STOP = 49.0

shots = [
    ('black', 0.0, 4.0), ('A_dyke', 4.0, 15.0), ('card1', 15.0, 18.5), ('B_gate', 18.5, 29.0),
    ('card2', 29.0, 31.0), ('C_lane', 31.0, 43.0), ('D_tent', 43.0, 57.4), ('black', 57.4, 57.6),
    ('F1_run', 57.6, b(11)), ('F2_roof', b(11), b(11.5)), ('F3_banyan', b(11.5), b(22)),
    ('F4_look', b(22), b(28.5)), ('F5_dyke', b(28.5), b(34)), ('M_montage', b(34), b(41)),
    ('F6_fall', b(41), 78.8), ('black', 78.8, 80.5), ('title', 80.5, 87.0), ('black', 87.0, 89.0),
    ('G_stinger', 89.0, 95.3), ('endcard', 95.3, DUR),
]

# ---- footsteps
steps = []
def walk(t0, t1, iv, kind='walk', amp=1.0, first_foot=0):
    t, k = t0, first_foot
    while t < t1 - 1e-6:
        steps.append(dict(t=round(t, 4), kind=kind, foot=k % 2, amp=amp)); t += iv; k += 1
walk(4.6, 12.4, 0.62); walk(13.7, 15.0, 0.62)
walk(18.6, 23.0, 0.62); walk(24.2, 29.0, 0.66)
walk(31.0, 35.2, 0.6); walk(36.2, 43.0, 0.6)
walk(43.0, 48.7, 0.68, amp=.8)
walk(52.7, 55.2, 0.8, kind='shuffle', amp=.5)
RUN = 60 / BPM_CHASE * 2 / 3    # triplet 8ths
walk(b(0), b(11), RUN, 'run'); walk(b(11.5), b(22), RUN, 'run'); walk(b(22), b(28.5), RUN, 'run')
walk(b(28.5), b(41) + 0.2, RUN, 'run')

# ---- hits (shake/flash on picture, impacts in audio)
hits = [
    dict(t=15.0, kind='soft', s=.4), dict(t=18.5, kind='soft', s=.35), dict(t=29.0, kind='taiko', s=.5),
    dict(t=31.0, kind='soft', s=.3), dict(t=49.0, kind='cut', s=.0), dict(t=56.6, kind='braam', s=1.0),
    dict(t=57.4, kind='slam', s=.9), dict(t=b(0), kind='big', s=1.0), dict(t=b(11), kind='flash', s=.9),
    dict(t=b(11.5), kind='hit', s=.6), dict(t=b(22), kind='big', s=1.0), dict(t=b(27), kind='hit', s=.8),
    dict(t=b(28.5), kind='big', s=1.0), dict(t=b(34), kind='hit', s=.7), dict(t=b(41), kind='hit', s=.8),
    dict(t=75.6, kind='fall', s=1.0), dict(t=78.6, kind='roar', s=1.0), dict(t=80.5, kind='title', s=1.0),
    dict(t=95.0, kind='sting', s=1.0),
]
# montage flash inserts (accelerating, on beats)
montage = []
mb = [34, 35, 36, 37, 37.5, 38, 38.5, 39, 39.25, 39.5, 39.75, 40, 40.25, 40.5, 40.75]
imgs = ['lantern', 'portrait', 'eyes', 'paper', 'loa', 'eyes', 'altar', 'roof', 'portrait', 'eyes', 'lantern', 'eyes', 'portrait', 'eyes', 'eyes']
for n, im in zip(mb, imgs):
    montage.append(dict(t=b(n), dur=round(min(0.16, 60 / BPM_CHASE * .5), 4), img=im))

cards = [
    dict(t0=0.9, t1=3.8, vi='Đồng bằng Bắc Bộ · 1987', en='Northern Vietnam · 1987', style='small'),
    dict(t0=15.25, t1=18.3, vi='Có những ngôi làng\nkhông còn ai sống…', en='Some villages… no one lives in anymore', style='card'),
    dict(t0=29.05, t1=30.9, vi='Nhạc đám cưới… lúc nửa đêm', en='Wedding music… at midnight', style='card'),
    dict(t0=50.0, t1=52.6, vi='Đừng quay đầu lại.', en="Don't look back.", style='overlay'),
    dict(t0=80.5, t1=87.0, vi='Đám cưới Làng Chuột', en='RAT VILLAGE WEDDING', style='title'),
    dict(t0=95.6, t1=101.0, vi='SẮP RA MẮT · 2027', en='COMING 2027', style='end'),
]

tl = dict(fps=FPS, dur=DUR, bpm_chase=BPM_CHASE, b0=B0, wed_beat=WED_BEAT, wed_start=WED_START, wed_stop=WED_STOP,
          shots=[dict(name=n, t0=round(a, 4), t1=round(c, 4)) for n, a, c in shots],
          steps=steps, hits=hits, montage=montage, cards=cards,
          marks=dict(flash_on=5.2, music_hear=12.6, lookup_gate=(23.0, 24.2), turn=(52.5, 55.5), eyes_blink=56.0,
                     crash_zoom=56.6, fall=75.6, lean=78.2, wake=89.0, scare=95.0))
json.dump(tl, open('timeline.json', 'w'), indent=1, ensure_ascii=False)
print(len(steps), 'steps;', 'chase beats', b(0), b(11), b(22), b(28.5), b(34), b(41))
