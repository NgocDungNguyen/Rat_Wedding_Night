# Đám cưới Làng Chuột — Rat Village Wedding

A first-person horror web game inspired by the Đông Hồ folk print *Đám cưới chuột* (The Rats' Wedding).
You play a servant mouse sent to steal tributes for the cats on the nights of Tết.

**▶ Play:** https://ngocdungnguyen.github.io/Rat_Wedding_Night/
Desktop only: Chrome or Edge, keyboard + mouse. Chapters 1–3 are playable.

## Controls

| Key | Action |
|---|---|
| W A S D · mouse | Move · look |
| Space | Jump · hold against a wall or object to climb |
| Shift | Sprint (uses stamina) |
| C | Crouch (crawl under gaps, hide) |
| E | Interact (pick up, read) |
| F | Lantern on/off (cats see the light) |
| Esc | Pause |

Keys can be rebound in Settings. Tiếng Việt / English.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

## Deploy

Every push to `main` builds the game and publishes `dist/` to GitHub Pages (`.github/workflows/deploy-game.yml`).
One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

## Project layout

| Path | What |
|---|---|
| `index.html`, `src/main.js` | Entry |
| `src/core/` | Settings, saves, input, audio, localisation, screen manager |
| `src/game/` | Gameplay loop, player (physics, climbing, stamina, health), cats (AI), Rapier physics world |
| `src/levels/` | Level kit and chapters (`ch1.js`, `ch2.js`) |
| `src/ui/` | Menus, HUD, cut-scenes |
| `src/art/`, `src/data/` | Đông Hồ-style cut-scene painter, chapter/cut-scene data, sound credits |
| `src/trailer/` | Scene helpers reused from the trailer |
| `public/` | Sounds and music |
| `docs/` | Game plan and chapter design |

## Credits

three.js (MIT) · Rapier (Apache-2.0) · Vite (MIT) · Cormorant Garamond, Be Vietnam Pro (OFL).
Sounds from Wikimedia Commons; full list in the in-game Credits screen.
