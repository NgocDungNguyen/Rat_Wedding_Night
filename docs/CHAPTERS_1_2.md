# Chapters 1–2 design

Decisions (2026-10-04): Ch2 tribute = **boiled chicken from the Tết altar** (heavy) · Ch1 = calm tutorial + **one cat scout** before the shrine · **new area per chapter** · cut-scenes = **text + Đông Hồ-style stills** (voice slots for later).

Placeholder names (TODO confirm): player **Tý** (servant) · bride **cô Út** · groom **cậu Cả nhà Thử** · elder **ông Trưởng làng** (bride's father) · ritual-teller **Thầy Cúng**.

## Shared systems

| System | Rule |
|---|---|
| Scale | Mouse eye 7 cm, radius 3 cm. Walk 0.55 m/s, sprint 1.4, crouch 0.25, carrying 0.35 (no sprint) |
| Physics | Rapier: houses, walls, furniture are solid; cups, plates, fruit, pebbles, sandals are dynamic (push them, they fall, impacts make noise). Low gaps (door bottoms) need crouch |
| Jump / climb | Space = ~12 cm hop. Hold Space facing a wall or object = climb straight up, pull over the top. Glazed jars are too slippery |
| Stamina | Sprint 20/s, climb 15/s, jump 12. Empty = exhausted (no sprint/climb) until 30 |
| Health | 100. Cat swipe −34, falls above ~0.5 m hurt. Regen after 7 s out of danger; rice crumbs +30. 0 = retry from checkpoint |
| Lantern (F) | Lights your way; cats see you twice as far |
| Hiding | Crouch inside grass, straw, baskets or under carts = hidden unless a cat is very close |
| Noise | Sprint > walk > crouch. Carrying, landing from a fall and knocking things are loud |
| Cat scouts | Patrol → Suspicious (turns, meows) → Chase (hiss, chase music) → Search → Patrol. Sleeping cats wake on noise. Cats can't fit through gaps a mouse can |
| Caught | Cats swipe (damage) instead of instant capture. Health 0 → Retry from the last checkpoint |
| Notes | Optional lore pages (E to read), 2 per chapter: what happened to the human village |
| Cut-scenes | Paper-and-ink panels, click/Space to advance, Esc to skip |

## Chapter 1 · Mùng 1 · Lời hứa hôn / The Betrothal

| Part | Area | Beat / gameplay |
|---|---|---|
| Intro | Cut-scene (5 panels) | Dead human village, rat village under the banyan; Tý loves cô Út; betrothal to cậu Cả; tribute task; go to the shrine |
| 1 | Burrow under the back step | Move/look. Leave the burrow |
| 2 | Back yard (jars, firewood, basket) | Pick up the lantern (E, F). Sprint. Note 1 |
| 3 | Yard gate | Crouch under the gate gap. **Checkpoint** |
| 4 | Bamboo lane | **One cat scout** patrols. Hide in grass, under the cart, in straw. Lantern-lit incense pole = danger. Note 2 |
| 5 | Shrine plaza (safe: cats avoid the incense) | Meet Thầy Cúng → end cut-scene: the four tributes; "take the chicken from the Lý family altar" |

## Chapter 2 · Mùng 3 · Con gà trống / The Rooster

| Part | Area | Beat / gameplay |
|---|---|---|
| Intro | Cut-scene (4 panels) | The Lý house; the altar still has its Tết feast; who lit the candles? |
| 1 | Front yard (drain hole start, well, haystack, chicken coop) | **Two cat scouts** patrol. Ramps up to the raised veranda |
| 2 | Veranda → center door | Crouch under the door gap. **Checkpoint** |
| 3 | Main room | A cat **sleeps** by the altar (purring). Climb: plank → low table → broom → altar. Candles = light danger. Note 1–2 inside |
| 4 | Altar | Take the chicken (heavy). Plate clatters → house cat wakes and searches. **Checkpoint** |
| 5 | Escape | Down the curtain or broom, under the door, past the yard cats, back to the drain → end cut-scene: red thread on the chicken, "the first tribute" |

## Audio

| Use | Source |
|---|---|
| Cat meow, hiss, growl, purr; heartbeat | Wikimedia Commons (CC0 / PD / CC BY / CC BY-SA), credits in `game/public/sfx-game/credits.json` |
| Chase music, distant wedding tune | TODO placeholder loops cut from the trailer mix |
| Footsteps | Synthesised patter (Web Audio) |
