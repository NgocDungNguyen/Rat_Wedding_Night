# CLAUDE.md — Đám cưới Làng Chuột / Rat Wedding Night

Handoff from a previous Claude (Cowork) session, so a new session can continue without the chat history.

## The user

- **Albert.** RMIT University student in Hanoi. Fluent in Vietnamese and English.
- **How he likes answers:** brief and direct, concise tables, short reasons, small steps at a time.
- **Ask before:** starting big builds or rewrites. He wants to plan clearly before building.

## Project status

| Item                                                                                | Status                                                                |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Cinematic POV trailer "LÀNG" (≈101 s, 1080p, Vietnamese text + English subtitles) | **Done.** Albert is happy with it ("pretty good")               |
| This repo: trailer source + local render pipeline                                   | Delivered. Albert edits the text and re-renders locally               |
| Turning it into a real game (Slenderman-style first-person horror)                  | **Chapters 1–2 playable** (v0.1). Plan `docs/GAME_PLAN.md`, Ch1–2 design `docs/CHAPTERS_1_2.md`, code in `game/` |

## Game decisions log

| Date       | Decision                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-10-04 | Engine: **web**, desktop only (Chrome/Edge, keyboard + mouse). three.js 0.169 + Vite, plain JS + JSDoc |
| 2026-10-04 | Game lives in `game/` (own `package.json`). Trailer files (`web/`, `audio/`, `sfx/`) are **read-only**; the game imports `web/*.js` through the Vite alias `@trailer` |
| 2026-10-04 | Placeholder gameplay level = trailer village (`buildWorld()`) at mouse scale                               |
| 2026-10-04 | Language picker on first boot (vi/en); Quit = "Hẹn gặp lại" farewell screen (web can't close the tab)    |
| 2026-10-04 | Save: localStorage keys `lcc.settings.v1`, `lcc.save.v1`, `lcc.meta.v1`; one autosave slot + Continue      |
| 2026-10-04 | Ch1+Ch2 build: Ch2 tribute = boiled chicken from the Tết altar; Ch1 = tutorial + one cat scout; new area per chapter; cut-scenes = text + Đông Hồ-style stills. Design: `docs/CHAPTERS_1_2.md` |
| 2026-10-04 | **Albert's rules for this and all further levels:** Space = jump; hold Space against a wall/object = climb it vertically; all houses/walls/furniture are real physics colliders, small props are dynamic (push, fall, noise); **stamina** (sprint/climb/jump) and **health** (cat swipes, falls; regen + food) |
| 2026-10-04 | Physics engine: **Rapier** (`@dimforge/rapier3d-compat`), `lengthUnit = 0.1` for mouse scale |
| 2026-10-04 | Rules: build only what Albert asks for. Commit after each working step       |

### Game shell (Phase 0B, done 2026-10-04)

Run: `cd game && npm install && npm run dev` → http://localhost:5173 (Chrome/Edge). `predev` copies the used trailer sounds into `game/public/` (gitignored).

| Where | What |
| --- | --- |
| `game/src/core/` | settings, save, i18n, input (pointer lock, rebinding), audio buses, screen stack (`state.js`) |
| `game/src/ui/screens/` | one file per screen (story cards share `cards.js`; HUD + pause in `hud.js`) |
| `game/src/data/` | `chapters.js` (6 chapters as data), `defaults.js` (settings, keys, quality presets) |
| `game/src/game/` | `gameplay.js` (loop, level sessions, script API, stealth, HUD values), `player.js` (physics mouse: jump/climb/stamina/health/lantern/carry), `cat.js` (cat model + AI), `world.js` (Rapier world, zones, rays), `placeholderLevel.js` (menu village) |
| `game/src/levels/` | `kit.js` (real-scale materials + prop builders), `ch1.js`, `ch2.js`, `index.js` (registry; Ch3–6 use a placeholder) |
| `game/src/art/dongho.js`, `data/cutscenes.js` | Đông Hồ-style cut-scene painter and the Ch1/Ch2 panels (voice slots TODO) |
| Debug | F7 fast move, F8 complete chapter, F9 die; `window.__lcc` in the console (`await __lcc.quick(2, 'chicken')` jumps to a chapter/checkpoint; `__lcc.game.debugStep(n)` advances physics without the browser frame rate); `input.debugForceLock()` because automation browsers refuse pointer lock |

### Building new levels (pattern)

| Step | How |
|---|---|
| Geometry | `k.box/cyl/ramp/wall/gate/hedge/table/chair…` (mesh + static collider). Real metres; mouse eye 7 cm. `climb:false` for slippery things (glazed jars) |
| Small props | `k.dyn(...)` / `k.cup/orange/pebble/sandal` — dynamic; impacts become noise for cats |
| Zones | `k.hide`, `k.shadow`, `k.safe`, light zones via `k.light(..., zoneR)`; `k.bound` = invisible world edge |
| Cats | `cats: [{id, pos, waypoints, area, sleep?}]` in the level's return value |
| Script | `start(checkpointId)` + `update(dt, t)` using `api.objective/hint/note/checkpoint/complete/interact/noise` |
| Register | add to `levels/index.js`, set `level`, `cutIn`, `cutOut` in `data/chapters.js` |

Still open: ending type, which twists are canon, final tribute items, studio name, final on-screen title (see `docs/GAME_PLAN.md` §11).

---

## 1. Game concept (agreed with Albert)

| Element          | Decision                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inspiration      | "Đám cưới chuột" (The Rats' Wedding), the Đông Hồ folk woodblock print and its ritual                                                                                                          |
| Genre            | Slenderman-style: first-person, collect-and-flee horror, stealth, hiding                                                                                                                               |
| **Player** | **A servant mouse**, first-person POV. Albert chose this over playing a human                                                                                                                    |
| Love story       | The servant loves**the bride rat**. Family forces her to marry **the groom rat**. Tragic, Romeo and Juliet style                                                                           |
| Yearly tradition | Every year the rat community holds its wedding and must give**tribute items to the cats** so the cats leave the wedding alone                                                                    |
| Player's task    | He is assigned to**find the tribute items** for the cats                                                                                                                                         |
| Structure        | **Chapters follow the folk-tale timeline**: the nights of Tết leading up to the wedding night (the 10th of the 1st lunar month). Each chapter is one night, dusk to dawn                        |
| Final boss       | **The cat demon (Ông Mèo)**                                                                                                                                                                    |
| Boss backstory   | Humans killed his daughter. He became a demon and slaughtered the whole human village (which is why the village is empty)                                                                              |
| Boss plan        | A**ritual-teller rat** told him of a ritual that **sacrifices a virgin rat couple (bride and groom) to revive the dead**. He set up this year's wedding as the trap to revive his daughter |
| Twist            | The tribute and the wedding are secretly the sacrifice ritual                                                                                                                                          |
| Player goal      | Uncover the scheme through the chapters, save his love, kill the cat demon                                                                                                                             |
| Cut-scenes       | The story beats ("what you learn") become**voiced cut-scenes, added later**                                                                                                                      |

### Draft chapter table (Claude's proposal, to refine with Albert)

| Ch. | Night    | Beat                                                       | Gameplay                                                        |
| --- | -------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Mùng 1  | Prologue: the betrothal, the servant gets the tribute task | Tutorial, sneaking through the dead human village               |
| 2   | Mùng 3  | First tribute: rooster (gà)                               | Collect-and-flee, cat scouts on patrol                          |
| 3   | Mùng 5  | Second tribute: fish (cá)                                 | Flooded rice-field stealth                                      |
| 4   | Mùng 7  | Last tributes: betel and wine                              | The cat starts hunting; overhear the ritual                     |
| 5   | Mùng 9  | Betray the family, sabotage the wedding                    | Rescue run through the cat's court                              |
| 6   | Mùng 10 | Wedding procession, boss fight                             | Multi-phase boss at the altar; tribute items as bait or weapons |

### Open decisions (ask Albert)

1. **Ending:** one fixed tragic ending, or several endings based on choices?
2. **Optional additions** Claude suggested. These are not confirmed:
   - The collected tribute items are secretly the ritual ingredients, so the player has been helping the villain.
   - The groom's family is working with the cat.
   - Ghost humans as an extra danger.
   - Which tribute items to use (rooster, fish, betel, wine, based on the print).
3. ~~**Engine:**~~ Decided 2026-10-04: web (three.js + Vite).
4. **Next deliverable:** the full game design plan (core loop, Ông Mèo AI, levels, art direction, engine). Write it only after Albert answers the questions above.

### Research notes (Đám cưới chuột)

| Topic                       | Notes                                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The print                   | Đông Hồ (also a Hàng Trống version). Top row: rats give a**fish and a bird** to a huge cat. Bottom row: the procession, with the groom on a horse and the bride in a palanquin                                                   |
| Funeral horns               | Rats play funeral horns (kèn đám ma) at the wedding. A hint of sacrifice, which fits the twist                                                                                                                                           |
| Inscription                 | "Thử bối nghinh ngư chí chí chí / Miêu nhi thủ lễ mưu mưu mưu". "Mưu" means both meow and scheming, which fits the cat's plot                                                                                                  |
| Meaning                     | The cat stands for corrupt landlords and mandarins, the rats for peasants paying tribute. It is also a lucky Tết print (abundance)                                                                                                         |
| Customs (mostly from China) | Wedding night between the 23rd of the 12th lunar month and early Tết, some say the 10th of the 1st month. People put out lamps, keep quiet, use no knives, draw no well water, and hide shoes and clothes. These can become gameplay rules |
| Folk tale                   | The rat mother seeks the strongest husband: sun, cloud, wind, wall, then the cat. In one version the cat eats the family                                                                                                                    |
| Caveat                      | Sources for a living Vietnamese ritual are thin. Present the taboos as in-story custom and credit Đông Hồ                                                                                                                                |
| Sources                     | tiasang.com.vn/tranh-dong-ho-goc-tich-dam-cuoi-chuot-4972726.html · tapchimythuat.vn/giai-ma-cac-buc-tranh-dan-gian-dam-cuoi-chuot/ · vov.gov.vn/tan-man-ve-dam-cuoi-chuot-dtnew-144593 · e.vnexpress.net (rat race / rat's wedding)     |

---

## 2. Trailer: how it works

The trailer is a procedural three.js scene (r169), rendered frame by frame in Chrome by Playwright, then encoded by ffmpeg with a pre-mixed audio track.

| Path                                      | Role                                                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gen_timeline.py` → `timeline.json`  | Master clock: 24 fps, ~101 s (2424 frames). Holds shots, footsteps, hits, montage,**text cards**, wedding-music start/stop                                               |
| `web/index.html`                        | Loads fonts (from`node_modules/@fontsource`) and an import map for three                                                                                                     |
| `web/lib.js`                            | Seeded RNG, noise, keyframe tracks, procedural canvas textures,`textTex()`                                                                                                   |
| `web/world.js`                          | Sky/moon, rice fields, tombs, bamboo, village gate, houses, banyan and shrine, wedding tent (lanterns, 囍, altar, "LỄ THÀNH HÔN" sign), fog                                 |
| `web/creature.js`                       | Hunched wolf-like creature with a red wedding sash; poses`idle/run/lean/crouch`. For the game it would become the cat demon (swap the head)                                  |
| `web/main.js`                           | Renderer, lights, post FX (bloom, afterimage, grade shader with chromatic aberration, glitch, grain, vignette), per-shot cameras, 2D text compositor,`window.renderFrame(i)` |
| `render.mjs`                            | Local one-command renderer (static server + Chrome + ffmpeg)                                                                                                                   |
| `camtrack.json`                         | Camera path, used by the audio mix for spatial sound                                                                                                                           |
| `audio/trailer_mix.flac`                | **Final mastered mix** (-14.7 LUFS). The video encode uses this                                                                                                          |
| `audio/music.py`, `audio/stems/*.mid` | Music generator: wedding tune (kèn, nhị, plucked part, mõ), chase score, brass, taiko, music-box title. Rendered with FluidSynth + FluidR3_GM                               |
| `audio/mix.py`, `sfx/`                | Sound design and master. Run from inside`audio/`. Converts `sfx/*.ogg` into `audio/sfx_wav/`                                                                             |
| `sfx/credits*.json`                     | Wikimedia Commons sound credits. Keep them if the trailer is published                                                                                                         |

### Text locations

| Text                                                                             | File                | Find                                                            |
| -------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------- |
| Story cards (vi + en,`t0`/`t1` seconds, styles small/card/overlay/title/end) | `gen_timeline.py` | `cards = [` (~line 55)                                        |
| Card drawing code                                                                | `web/main.js`     | ~lines 300–315 (`c.vi`, `c.en`)                            |
| Title "LÀNG M" / "GHOST VILLAGE" (**hard-coded**)                         | `web/main.js`     | ~lines 336, 342                                                 |
| End card "SẮP RA MẮT · 2027" / "COMING 2027" (**hard-coded**)           | `web/main.js`     | ~lines 348–351                                                 |
| Tent sign "LỄ THÀNH HÔN"                                                      | `web/world.js`    | ~line 386                                                       |
| 囍                                                                               | `web/world.js`    | ~line 323 (uses system font "Noto Serif CJK SC"; may fall back) |

The title and end text are hard-coded in `main.js` as well as listed in `cards`. Change both places.

### Local render (Albert's machine)

Prerequisites: Node 18+, Google Chrome (or `CHROME_PATH=...`), ffmpeg on PATH. Python 3 is needed only for `gen_timeline.py`.

```bash
npm install
npm run timeline                         # after editing gen_timeline.py
npm run preview                          # 960px -> oàng LANG_MA_preview.mp4
npm run render                           # 1080p -> out/LANG_MA_Trailer.mp4
node render.mjs --from 1932 --to 2089    # re-render one range (frame = sec × 24)
npm run encode                           # rebuild MP4 from cached frames/
```

- Frames cache in `frames/`. Encoding runs only once every frame exists.
- Card frame ranges:

| Card            | Frames     |
| --------------- | ---------- |
| Location        | 21–92     |
| Village         | 366–440   |
| Wedding music   | 697–742   |
| Don't look back | 1200–1263 |
| Title           | 1932–2088 |
| End             | 2294–2424 |

- Keep card timings close to the originals. The audio is fixed to the current cut; changing timing needs `audio/mix.py` re-run (FluidSynth + numpy/scipy/pyloudnorm).
- Render speed on a machine with no GPU was very slow (hours). With a GPU, expect minutes. This is not yet confirmed on Albert's machine.

### Original deliverables (made in the old session; not in the repo)

- 1080p trailer MP4 (26.5 MB)
- Audio MP3
- Credits TXT
- An HTML player
- A 2-minute "Nightmare Countryside" loop MP3 (an earlier sound-only piece Albert didn't like: "not intense enough, needs real music, too synthetic")
- A private claude.ai artifact page, "Đám cưới Làng Chuột Screening"

## 3. Next steps

1. Albert playtests Ch1–Ch2 and gives feedback (difficulty, lighting, controls).
2. Open decisions still pending (ending, canon twists, tribute items, studio name, title).
3. Next chapters (3: fish in the flooded field) or Ông Mèo boss AI, when Albert asks.
