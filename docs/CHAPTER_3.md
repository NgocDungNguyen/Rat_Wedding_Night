# Chapter 3 · Mùng 5 · Con cá / The Fish

Decisions (2026-10-05): **swimming** (cats won't follow into water) · **live fish in a trap** (flops = noise) · new threats: **heron (cò)** in the water + **ma trơi** ghost lights.

## New systems (available to all later levels)

| System | Rule |
|---|---|
| Water | `k.water(...)` zones with a surface height. Swim speed 0.32 m/s (Shift 0.55), stamina −5/s (−18/s fast). Stamina 0 = drowning, −9 health/s. Leave by mud banks (ramps) or climb a dyke edge (not while carrying) |
| Cats & water | Cats refuse to step into water |
| Heron (`src/game/heron.js`) | Wades waypoints. Sees **only movement** (range 2.6 m, wide view); still = invisible. Alert → wind-up 0.45 s → lunge, −40 health. Splashes draw it |
| Ma trơi (`src/game/wisp.js`) | Drifting ghost light = moving light zone (you are exposed to cats inside). Drawn to a lit lantern |
| Carried fish | Flops every 3.5–7.5 s: splash, noise (1.6 m, 2.2 m in water), camera jolt |

## Level

| Part | Area | Gameplay |
|---|---|---|
| Intro | Cut-scene (4 panels) | Flooded fields; the fisherman's trap; herons and green fires; cô Út: "don't pass the white cat's grave" |
| 1 | Road embankment (safe) | Start. Cat A patrols the main and cross dykes |
| 2 | Paddies + dykes | Swim (heron L / R), rice hides you, basket boat and planks to rest, hut on stilts (note, food). **Checkpoint** past the cross dyke |
| 3 | Right dyke → channel | Cat B guards the right dyke. The trap is in the shallow channel at its end |
| 4 | Fish | Open the trap → live fish. **Checkpoint** |
| 5 | Return | Back to the road along dykes or through water (mud banks only; no climbing with the fish) |
| Lore | Scarecrow charm, fisherman's log (hut), child's note at the kitten's grave (far bank) | The white kitten was buried by this channel; the trap fills with yellow-eyed fish |
| Outro | Cut-scene (4 panels) | Yellow-eyed fish; "the second offering"; cô Út gives Tý a wedding betel quid; something follows Tý home |

## Audio

Splash (PD), grey heron call (CC BY-SA 4.0), night frog chorus (CC BY-SA 4.0), wind chime from the trailer for ghost lights. Credits in `src/data/`.
