# Game Plan — Đám cưới Làng Chuột / Rat Village Wedding

Phase 0 plan. Desktop web game (Chrome/Edge, keyboard + mouse, first-person). Approved 2026-10-04.

Decisions: plain JS + JSDoc · placeholder level = trailer village at mouse scale · language picker on first boot · Quit → farewell screen · engine = web (three.js + Vite).

### 1. Tech stack
| Part | Choice | Why |
|---|---|---|
| 3D | three.js **0.169** (same as trailer) | Trailer modules import as-is |
| Build/dev | **Vite** | `npm run dev`, hot reload, simple |
| Language | Plain JS (ES modules) + JSDoc | Matches trailer, no compile step |
| UI | HTML/CSS overlay over the canvas | Easy menus, crisp text, Vietnamese diacritics |
| Audio | Web Audio API (own small manager) | Buses + volume control, no library needed |
| Save | `localStorage` (versioned JSON) | No server |

**Reuse from trailer (imported via Vite alias `@trailer` → `../web`, not copied):**
| Asset | Use in game |
|---|---|
| `web/lib.js` | RNG, noise, procedural textures (`plasterTex`, `woodTex`, `fabricTex`, `textTex`…) |
| `web/world.js` `buildWorld()` | Placeholder level (village at mouse scale); later chapter 1 base |
| `web/creature.js` | Base for Ông Mèo (swap head) — M2 |
| `web/main.js` post-FX | Copy grade shader (grain, vignette, CA) + bloom into `game/src/render/post.js` (main.js is not a module we can import) |
| Fonts | Cormorant Garamond (titles), Be Vietnam Pro (UI) via `@fontsource` |
| `sfx/*.ogg` | UI click, wind/gecko ambience, temple bell, thud (copied to `game/public/sfx/` by a script; credits kept) |
| `audio/trailer_mix.flac` | Placeholder menu music (TODO: real menu theme) |

### 2. Folder structure
```
game/
  package.json  vite.config.js  index.html
  public/sfx/ (copied trailer sfx)  public/music/
  scripts/copy-assets.mjs
  src/
    main.js              boot: load fonts, settings, save → state machine
    core/  state.js (screen/state manager) · input.js (keys, rebinding, pointer lock)
           audio.js (buses) · settings.js · save.js · i18n.js · events.js
    i18n/  vi.js · en.js
    data/  chapters.js · defaults.js (settings + keybinds)
    ui/    ui.css · components.js (button, slider, toggle, select, keybind)
           screens/ boot, langpick, opening, menu, chapters, settings, credits,
                    farewell, chapterIntro, hud, pause, chapterComplete, gameOver
    game/  gameplay.js (scene lifecycle) · player.js (FP controller) · placeholderLevel.js
    render/ renderer.js · post.js
```

### 3. Screen flow
```
Boot/Loading → [first run] Language pick → Opening (logo+intro, skippable)
→ Main Menu ─ New Game → Chapter intro → Gameplay ⇄ Pause (Esc)
            ├ Continue  → Chapter intro (saved chapter) → Gameplay
            ├ Chapters  → (unlocked only) Chapter intro → Gameplay
            ├ Settings / Credits → back
            └ Quit      → Farewell → click → Main Menu
Gameplay → Chapter complete → next Chapter intro / Menu
Gameplay → Game over → Retry (Chapter intro) / Menu
Pause → Resume / Settings / Restart chapter / Main Menu
```
Shell has debug keys to trigger **F8 = complete chapter**, **F9 = game over** (placeholders for real triggers).

### 4. Screens
| Screen | Purpose | Contents | Buttons | Transitions | Sound |
|---|---|---|---|---|---|
| Boot | Load fonts, settings, save, sfx | Ink-blot spinner, % bar | — | Auto → Lang pick (first run) / Opening | Silent (audio unlocks on first click) |
| Language pick | First-run only | "Tiếng Việt" / "English" | 2 big buttons | → Opening | Click |
| Opening | Mood + logo | Studio card → title "Đám cưới Làng Chuột" on paper/ink, 1-line intro | Any key = skip | Fade → Menu | Wind + bell sting |
| Main Menu | Hub | Title, Đông Hồ paper bg, slow 3D/fog bg, red lanterns | New Game, Continue (disabled if no save), Chapters, Settings, Credits, Quit | Fades | Menu music, hover tick, click |
| New Game confirm | Guard overwriting save | "Overwrite progress?" | Yes / No | → Ch.1 intro | Click |
| Chapters | Chapter select | 6 cards: night, title vi/en, objective, lock icon | Card (if unlocked), Back | → Chapter intro | Locked = dull thud |
| Settings | Options | Tabs: Graphics, Controls, Audio, Language/Access. | Apply live, Reset defaults, Back | Back → caller (menu or pause) | Slider ticks; test sound per bus |
| Credits | Credit sources | Team, fonts, Wikimedia sfx credits, Đông Hồ credit | Back | → Menu | Music |
| Farewell | "Quit" on web | "Hẹn gặp lại" / "See you again" | Click → Menu | Fade | Bell |
| Chapter intro | Set the night | "Chương 1 · Mùng 1", title, objective; skippable | Any key | → Gameplay (pointer lock on click) | Gong |
| Gameplay (HUD) | Play | Minimal: objective line (fades), crosshair dot, subtitles area | Esc = pause | → Pause / Complete / Game over | Ambience bus |
| Pause | Halt game | Dim + paper panel | Resume, Settings, Restart chapter, Main Menu | Esc toggles; releases pointer lock | Muffle (low-pass) game buses |
| Chapter complete | Reward | "Bình minh" / "Dawn", chapter name, next unlocked | Next chapter, Main Menu | Autosave first | Rooster crow |
| Game over | Fail | Red-ink "Bị bắt" / "Caught" | Retry, Main Menu | — | Thud + drone |

### 5. Settings (saved, applied live)
| Group | Setting | Range / default |
|---|---|---|
| Graphics | Quality preset | Low / Medium / **High** (shadows, bloom, pixel ratio) |
| | Resolution scale | 50–100 %, **100** |
| | Brightness / gamma | 0.5–1.5, **1.0** (with calibration image) |
| | FOV | 60–100, **75** |
| | Motion blur | **On**/Off (afterimage pass) |
| | Camera shake | **On**/Off |
| Controls | Mouse sensitivity | 0.1–3.0, **1.0** |
| | Invert Y | **Off** |
| | Key rebinding | Forward W, Back S, Left A, Right D, Sprint Shift, Crouch C/Ctrl, Interact E, Lantern F, Pause Esc (fixed) |
| Audio | Master / Music / SFX / Voice | 0–100, **80/70/80/100** |
| Access./Lang | Subtitles | **On** |
| | Language | Tiếng Việt / English |

### 6. Chapter system (`src/data/chapters.js`)
| id | Night | Title vi / en | Objective (placeholder) | Unlock |
|---|---|---|---|---|
| 1 | Mùng 1 | Lời hứa hôn / The Betrothal | Reach the village shrine | Open |
| 2 | Mùng 3 | Con gà trống / The Rooster | Bring back the rooster | After 1 |
| 3 | Mùng 5 | Con cá / The Fish | Take a fish from the flooded field | After 2 |
| 4 | Mùng 7 | Trầu và rượu / Betel and Wine | Gather betel and wine | After 3 |
| 5 | Mùng 9 | Phản bội / Betrayal | Sabotage the wedding | After 4 |
| 6 | Mùng 10 | Đêm cưới / The Wedding Night | Face Ông Mèo | After 5 |
Fields: `id, night, title{vi,en}, objective{vi,en}, intro{vi,en}, level (module id), requires`. Titles are TODO until the story is final.

### 7. Save system
| Key | Content |
|---|---|
| `lcc.settings.v1` | All settings + keybinds |
| `lcc.save.v1` | `{version, currentChapter, completed[], unlocked[], checkpoint:null, playtime, updatedAt}` (one autosave slot) |
| `lcc.meta.v1` | `{langChosen, openingSeen}` |
Autosave on: chapter start, chapter complete (later: checkpoints). Continue = load `currentChapter`. Corrupt/old version → safe defaults, never crash.

### 8. Core systems (stubbed in 0B)
| System | Responsibility |
|---|---|
| State manager | Stack of screens (`push/pop/replace`), enter/exit hooks, fades |
| Input | Key state by action, rebinding, pointer lock, mouse delta, Esc handling |
| Audio | Buses: master → music / sfx / ambience / voice; load, play, loop, crossfade, pause muffle |
| UI layer | DOM overlay, reusable components, focus + keyboard nav |
| i18n | `t('menu.newGame')`, live switch re-renders screen |
| Settings store | get/set/subscribe, persists, applies to renderer/audio/input |
| Save store | load/save/unlock/complete, versioned |
| Gameplay | Builds scene, runs loop only when not paused, disposes on exit |

### 9. UI art direction
| Element | Direction |
|---|---|
| Mood | Dark horror, quiet; paper and ink, not neon |
| Palette | Ink black `#0b0a09`, rice paper `#e9dfc8`, wedding red `#9a0e16`, gold `#c9a040`, lantern orange `#ff5a20` |
| Texture | Đông Hồ "giấy dó" paper grain + woodblock-print edges (procedural canvas, like trailer `lib.js`) |
| Type | Titles: Cormorant Garamond 600/700. UI/body: Be Vietnam Pro 300/500 |
| Motifs | Red seal stamp on hover/selected, 囍 fades, lanterns, ink-bleed transitions |
| Screen FX | Trailer grain + vignette behind menus |

### 10. Roadmap after Phase 0 (you choose order)
| M | Content |
|---|---|
| M1 | Mouse movement feel (scale, run, crouch, climb, lantern) + chapter 1 greybox |
| M2 | Ông Mèo: model from creature.js + stalking AI (sense, chase, lose track) |
| M3 | Collect-and-flee loop: tribute item, carry, return, fail states, checkpoints |
| M4 | Hiding + taboo rules (no light, silence, noise meter) |
| M5 | Chapter 1 art pass + audio pass |
| M6 | Cut-scene/voice/subtitle system |
| M7 | Chapters 2–6 levels |
| M8 | Boss fight (multi-phase) |
| M9 | Polish, performance, release build (web host / Electron) |

### 11. Open questions for Albert
1. Ending: one tragic ending or multiple endings?
2. Which suggested twists are canon (items = ritual ingredients, groom's family with cat, ghost humans)?
3. Tribute items: rooster, fish, betel, wine — final?
4. Studio/credit name for the opening card?
5. Game title on screen: "Đám cưới Làng Chuột" + "Rat Village Wedding" — final?
