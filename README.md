# Đám cưới Làng Chuột — Rat Wedding Night

**▶ Play the game (desktop, Chrome/Edge, keyboard + mouse):** https://ngocdungnguyen.github.io/Rat_Wedding_Night/

| Folder | What |
|---|---|
| `game/` | The web game (three.js + Rapier + Vite). Run locally: `cd game && npm install && npm run dev` |
| `web/`, `audio/`, `sfx/`, `render.mjs` | The trailer source (below) |

Every push to `main` rebuilds the game and publishes it to GitHub Pages (`.github/workflows/deploy-game.yml`).

---

## Trailer source

A procedural three.js trailer, rendered frame by frame in Chrome and encoded with ffmpeg.
The finished audio mix is included (`audio/trailer_mix.flac`), so you only need to re-render the picture to change the text.

## 1. One-time setup

| Install                                                                                                      | Check it works           |
| ------------------------------------------------------------------------------------------------------------ | ------------------------ |
| [Node.js 18+](https://nodejs.org)                                                                             | `node -v`              |
| [Google Chrome](https://www.google.com/chrome/)                                                               | already on most machines |
| [ffmpeg](https://ffmpeg.org/download.html) (Windows: `winget install ffmpeg`, Mac: `brew install ffmpeg`) | `ffmpeg -version`      |
| Python 3 (only if you edit`gen_timeline.py`)                                                               | `python --version`     |

Then in this folder:

```bash
npm install
```

## 2. Edit the text

| What                                                      | File                | Where                                                 |
| --------------------------------------------------------- | ------------------- | ----------------------------------------------------- |
| Story cards (Vietnamese + English sub, timing in seconds) | `gen_timeline.py` | `cards = [...]` (lines ~55–61). `\n` = new line  |
| Big title "LÀNG MA" / "GHOST VILLAGE"                    | `web/main.js`     | search`fillText('LÀNG MA'` and `'GHOST VILLAGE'` |
| End card "SẮP RA MẮT · 2027" / "COMING 2027"           | `web/main.js`     | search`SẮP RA MẮT`                                |
| Wedding sign "LỄ THÀNH HÔN"                            | `web/world.js`    | search`LỄ THÀNH HÔN`                             |
| 囍 symbol                                                 | `web/world.js`    | search`囍`                                          |

After editing `gen_timeline.py`, rebuild the timeline:

```bash
npm run timeline
```

(No Python? You can edit the `"cards"` block in `timeline.json` directly instead.)

Keep card timings roughly the same. The music and sound are fixed to the current cut.

## 3. Render

```bash
npm run preview      # fast 960px check -> out/LANG_MA_preview.mp4
npm run render       # final 1080p      -> out/LANG_MA_Trailer.mp4
```

Only re-render the part you changed (frames are cached in `frames/`). The trailer runs at 24 fps, so frame = seconds × 24:

```bash
node render.mjs --from 1920 --to 2100   # e.g. title section 80–87.5 s
```

| Section                    | Seconds     | Frames     |
| -------------------------- | ----------- | ---------- |
| Location card              | 0.9–3.8    | 21–92     |
| "Có những ngôi làng…" | 15.25–18.3 | 366–440   |
| "Nhạc đám cưới…"     | 29.05–30.9 | 697–742   |
| "Đừng quay đầu lại."  | 50.0–52.6  | 1200–1263 |
| Title                      | 80.5–87.0  | 1932–2088 |
| End card                   | 95.6–101.0 | 2294–2424 |

The first full render must cover every frame. After that, re-render only the changed ranges, then run `npm run encode`.

Chrome not found? Set `CHROME_PATH` to your Chrome/Chromium executable.

## Files

| Path                                      | What                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `web/`                                  | three.js scene:`world.js` (village), `creature.js`, `main.js` (cameras, post FX, text) |
| `gen_timeline.py` → `timeline.json`  | master clock: shots, cards, beats                                                            |
| `camtrack.json`                         | camera path (used by the audio mix)                                                          |
| `audio/music.py`, `audio/stems/*.mid` | music generator (needs FluidSynth + FluidR3_GM soundfont)                                    |
| `audio/mix.py`, `sfx/`                | sound design + master →`audio/trailer_mix.wav`                                            |
| `sfx/credits*.json`                     | Wikimedia Commons sound credits (keep these if you publish)                                  |
