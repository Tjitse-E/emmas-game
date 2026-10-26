# Moon Meadow World (v4): design

Draft for Tjitse's review, 25 October 2026. Interview notes: [briefing.md](briefing.md). An implementation plan follows after review.

v4 rebuilds Moon Meadow Home (v3, [games/moon-meadow-home](../../games/moon-meadow-home/), spec [docs/v3/spec.md](../v3/spec.md)) as a 3D world in three.js. Emma plays as Princess Emma, walks through the meadow with her unicorns, plays with them, rides them and later drives a unicorn chariot. Reading and maths stay the way to make progress.

This document says what changes from v3. Everything it does not mention works as the v3 spec and [docs/v3/decisions.md](../v3/decisions.md) say: the learning engine, the ladders, help levels, item memory, naming, the clarity rules and the "never" list (v3 spec sections 2.8, 2.11 and 3).

Calls marked **(my call)** were made by Claude without asking Tjitse or Emma. Check those first.

## 1. Why and what success looks like

Emma chose Moon Meadow Home as the best game. She wants more of it: more unicorns, a character to play as, things to do with her unicorns in the world, and harder maths. Tjitse wants reading English and maths to stay the most important part.

v4 succeeds when:

- Emma asks to play it by herself (Tjitse watches for 2 play weeks). v3 stays in the menu, so she can choose either.
- She spends real time in free play with her unicorns (the slide, riding, the chariot), and still meets the same number of checked moments per visit as in v3 (about one per strand per 3 minutes of heartbeat).
- She calls the maths hard but doable. First-try accuracy per strand stays between 70 and 90 percent (v3 criterion L1).
- No wish word makes her stop because it is too long or too hard (Tjitse notes each one).
- She does not need help to get around the 3D world: she can walk, call a unicorn, use the slide and get to bed without Tjitse showing her.

### Goals

- A small 3D world she walks around as Princess Emma.
- A herd that grows much bigger than in v3, mostly through eggs she finds in the world.
- Free play that works: the pond slide, splashing, feeding, brushing, riding.
- Things to earn, in this order: a saddle (riding), the meadow trails, the unicorn chariot, then new places further away.
- Harder maths and easier wish words than v3 1.0.1.

### Non-goals

- No new learning engine. v4 reuses v3's ladders, planner, item memory and naming.
- No fighting, racing against the clock, villains, lives or losing. Nothing in v3's "never" list (spec 2.11) changes.
- No free camera, joystick or virtual buttons for movement.
- No physics engine.
- No new Dutch content of any kind. The app stays fully British English.

### Anti-goals (a failure even if it works)

- The 3D world turns into a playground with the learning on the side. Every earned thing and most of the herd growth must still pass through reading or maths.
- It stutters or reloads on the iPad Air 2.
- She gets lost or stuck in the world and needs a grown-up to get back.
- v3 breaks, or her v3 save is touched.

## 2. Constraints

- **iPad Air 2** (A8X, 2 GB memory, Safari 15 on iPadOS 15), in a Safari tab, touch only, landscape (Tjitse, 25 October 2026). Every budget in section 7 is sized for it.
- Everything Emma must understand is spoken by Elizabeth and shown with pictures. She cannot read instructions.
- Speech is pre-generated ElevenLabs audio. Elizabeth is the only voice for letter sounds, words, names and numbers. Voices as in [VOICES.md](../../VOICES.md).
- No extra spending on art. No paid image or 3D model APIs.
- Own characters only. No trademarked characters or look-alikes.
- Port 8765 and `dist-emma` belong to Emma's live server. Agents never touch them.

## 3. The world

### 3.1 Princess Emma

Emma plays as Princess Emma (Emma, 25 October 2026): two blonde ponytails that almost reach the ground and a pretty pink dress. The ponytails swing when she walks and fly out when she runs or rides. She has a small crown. Later she earns more crowns, dresses and ribbons (section 5.4).

Princess Emma has no voice. She is Emma. She waves, giggles (no words) and claps when something good happens. Elizabeth narrates as in v3. Queen Lumi stays as the queen in the moon with her story lines (Posh voice). **(my call: keep Lumi, because the v3 story, the moon and the eggs depend on her)**

### 3.2 One connected world

The meadow, the nest, the stable, the pond and the camp are one place she walks around (Tjitse, 25 October 2026). Walking from one place to another replaces the menu buttons of v3. The world opens up over time (section 5):

| Area | Opens | What is there |
|---|---|---|
| Home meadow | Start | The nest, the care stations, the food tray, Lumi's gazebo, the camp tents |
| Stable yard | Start | The stable rows from v3, the mangers, the hay rack, the saddle shed (locked) |
| Bath pond | Start (built in v3) | The water, the slide, ducks, boats, shells |
| Meadow trails | With the saddle | Paths through flowers and trees to three clearings, with signposts and wild eggs |
| Chariot road | With the chariot | A loop road from the stable yard past the trails to a lookout over the valley |
| Castle hill and the rainbow bridge | Later release | v3's castle plans, reached by chariot |

The home meadow, stable yard and pond fit in one view from a raised camera. She never needs to walk more than about 10 seconds to get between them. The trails and the road are further out and are meant to be travelled by unicorn or chariot. Moon mist covers areas that are not open yet, with a picture sign of what waits there.

### 3.3 Getting around

**(my call, all of it)**

- **Tap to walk.** She taps the ground and Princess Emma walks there along a simple route around obstacles. A long tap or a second tap at the same spot makes her run.
- **Camera.** A raised camera behind and above her, at a fixed angle, follows her. She does not turn or zoom it. Places she cannot see from the meadow have a glowing picture arrow at the screen edge that walks her there when tapped (the v3 meadow edges, now as a walk).
- **Tap a unicorn** to call it. It trots to her and follows her. Up to three unicorns follow her at a time (v3 spec 2.5, rule 8). A fourth tap sends the oldest follower back to graze.
- **Drag a unicorn** to carry it a short way: it floats on a moonbeam to where she lets go. This is how she puts a unicorn on the slide, into the water, into a stall or in front of the chariot.
- **Home button.** A moon button in the corner walks Princess Emma back to the nest from anywhere in the world. A tap on Lumi in the sky repeats the current goal, as v3's replay button does.
- **She cannot get lost.** The world has a visible edge (a fence, water, trees). There is no fall, no dead end and no place she can get stuck behind something.

### 3.4 Her unicorns in 3D

- Every unicorn is an individual as in v3: name, colours, breed, traits, hearts, stall, pins and outfit. In 3D the breeds differ in coat pattern, mane style and horn colour, as in v3.
- Babies, foals and (later) young unicorns are sized by growth stage. A baby is about knee high to Princess Emma, a foal about waist high. **(my call)**
- The unicorns near her are alive: they idle, graze, follow, play with each other and react to her. The rest rest in the stables or graze far away (section 7).
- At most 12 unicorns stand in the meadow at once, as in v3: her favourites, the newest and her followers. Any unicorn can be called out of its stall.

## 4. Play

### 4.1 The heartbeat stays

The v3 heartbeat (spec 2.2) stays the core loop: egg (maths), hatch, name (spelling), first wish (reading), moving in (numbers). It takes place in the 3D world: the egg is in the nest, the newborn walks to its stall, and the door visit is a walk to the door. The flat tools stay flat: number stones, gem slots, print with sound dots and the item basket are a 2D layer over the 3D world, reused from v3 (`src/ui/`).

### 4.2 Free play

Free play is never checked (v3 spec 2.5, rule 1). It is where Emma's role play lives.

| Thing | What happens |
|---|---|
| The slide | Emma's own ask: "When I take the unicorns to the pond, there is a small slide, but I can't get the unicorns to go onto the slide in the water." In v4 the slide always works. She drags a unicorn to the top of the slide, or walks to the slide with followers, and they slide down one by one into the water with a splash. Princess Emma slides too when she taps the slide. Unicorns in the water swim, splash and climb out by themselves. |
| Splashing | Unicorns in the water splash each other. Bath items from v3 (ducks, boats, shells) float. |
| Feeding | The food tray (v3 1.0.1) is a basket Princess Emma carries. She drags a food to any unicorn, which munches. The foods say their names when tapped. |
| Brushing, hats, the nap cushion, the swing | As the v3 care stations, now as objects in the meadow. |
| Playing together | Followers play when she stops walking: chase, hop, roll in the grass. **(my call)** |
| Riding | Once she has the saddle (section 5.2). |
| The chariot | Once she has it (section 5.3). |

### 4.3 Wishes with easier words

Wishes work as in v3 (spec 2.5): a printed word in a speech bubble over the unicorn, a basket of pictured items, the funny mistake and the hint ladder. The words change.

Emma said some words are too hard, for example "beetroot" (it is in `content/words/phase3-4.json`). New rule for every wish, sign, card and label word in v4 that she must read **(my call)**:

1. One syllable only. Two-syllable words such as "carrot", "apple" and "beetroot" may appear as a picture and a spoken word, never as a word she must read to act.
2. At most five letters.
3. Built only from graphemes of passed, placed or current reading steps, as in v3.
4. Each word gets Emma's picture check (v3 spec 5.5, step 4): she must know what the picture shows.

Plurals of those words keep v3's rules (spec 3.10), so "hats" and "foxes" stay allowed, even at six letters.

The rule covers single words she reads to act: wishes, food words, signposts and labels. It does not cover **(my call)**:

- Reading steps that teach longer words or sentences (R18 compound words, R24 endings, R26 two-syllable words, R27 to R29 phrases and sentences, R35, R37, R40, R49). They keep v3's rules and places, such as Building Day cards. Many are her school topics, and blocking them would stop her reading ladder.
- Unicorn names. Names follow v3's naming rules.
- Words in a sentence card that Elizabeth reads after the act, as in v3. Only the deciding word must meet the rule where the card's step allows it.

The builder makes a v4 word list from the v3 word packs with this filter and shows it to Tjitse as a contact sheet before audio and pictures are made. Foods for unicorns keep v3's allow-list and look-alike groups.

v4 runs its own placement (section 6.3). If a word still turns out too hard for her, Tjitse moves her reading step down in the v4 parent corner.

### 4.4 Harder maths

Emma said "5 + 1 = 6" is too easy. v3 1.0.1 already asks egg totals from 7 to 15 (steps M12A to M12F), so the easy sums probably come from her v3 save missing the 1.0.1 lift (the v3 README's "First check for Tjitse") or from review. In v3 Tjitse can check the Overrides screen. v4 avoids it with the floor below and its own placement.

For v4 **(my call)**:

1. **A floor.** No maths moment in v4 adds or takes away 1 or 2, or asks a total under 7, except numeral reading (door numbers) and the first maths moments of a brand new player. This applies to review and mixed picks too.
2. **Further up the ladder.** v4 loads the next White Rose steps from [docs/v3/research/curriculum.md](../v3/research/curriculum.md) after M12F: M13 (add by counting on), M14 (take away within 10), M18 (teens as ten and some more), M21 (add by making 10, such as 8 + 5), M22 (take away across 10, such as 13 - 5) and M23 (doubles to 10 + 10). Each gets the egg kind or world moment the v3 spec and curriculum name for it, or one from the list below.
   - These steps ship in Wave A, so Wave A brings harder maths. **(my call)**
   - The floor applies to the parts of an addition and the start of a take-away: at least 3 added, at least 7 to start from. A take-away result may be under 7 (13 - 8 = 5 is fine). M13 uses counting on by 3 to 6.
   - M14 and M22 need a take-away form. They use v3's snow egg (M14: the egg is too warm, the snow stone cools the extra cups), extended over 10 with the second nest.
   - M15 to M17 and M19 are postponed, not dropped. M20 (the 13 and 30 contrast) loads before M22 and is served by door numbers and wild eggs, because v3 never shows 13 and 30 as wrong choices before M20 is passed.
3. **Maths in the world.** New moments use the same stones and the same "too many, too few" fun as eggs:
   - Wild eggs (section 5.2): warmed on the spot with stones, at her current step.
   - The saddle and the chariot are built with parts to fill: "The saddle needs twelve stars. Seven are on."
   - Loading the chariot: "The chariot needs fourteen carrots. Eight are in."
   - Stable rows (v3, every 10 babies): planks to fill, at her current step instead of v3's fixed "fill ten".

The v3 rules stay: no two moments in a row with the same total, stones 1 to 9, a second nest over 10, Elizabeth says every number.

## 5. Things to earn

The order is Claude's proposal (Tjitse, 25 October 2026: "do a suggestion based on the info you have"). Each opening is announced once, one per visit, through v3's opening queue (spec 2.9). **(my call: the order and the triggers below)**

### 5.1 What drives openings

v3 has two sources of openings: jewels from passed ladder steps and herd size. v4 keeps both:

- **Herd size** opens the saddle, the trails and new stable rows. It rewards playing, so she is never stuck.
- **Jewels** (a passed reading, spelling or maths step) open the chariot and Princess Emma's things. They reward learning.
- Every opening is a short build with checked moments at her current steps (v3's Building Day, spec 2.4): parts to fill (maths), a name sign to spell (spelling), and an instruction card to read.

### 5.2 The saddle and the meadow trails

- **Opens:** at herd size 5. The saddle shed in the stable yard shows a saddle under a cover from visit 1, as the visible goal.
- **Building Day:** stars on the saddle (maths), the saddle's name tag with her unicorn's name (spelling), a card "Put the saddle on Pip." (reading).
- **Riding:** she taps the saddle icon on any foal-sized or older unicorn. Princess Emma climbs on and they move at twice her walking speed. Tap to ride, as tap to walk. Followers trot behind.
- **The trails** open with the saddle. Three clearings along the trails (my naming: the flower clearing, the pine clearing, the stone clearing). Each visit hides 2 or 3 wild eggs in the clearings. She finds one, warms it on the spot with stones, it hatches, she names it, and it walks home with her. Wild eggs are the main way the herd grows faster than in v3. **(my call)**
- **Herd pace (my call).** At most 3 wild eggs a visit, so a visit does not turn into naming only. The herd target is no number: it grows with play, about twice v3's pace. Each egg brings its full heartbeat (maths, naming, wish). Stable rows keep v3's rule (a new row every 10 babies) and are built as a short build from row 6 on, as in v3. The stable yard grows away from the meadow in a line, and the newest row is always next to the gate, so the walk stays short. Names: the gold bell accepts any safe name, so the 324-name list is no limit. New list names are added with later audio runs.
- **v3 herd milestones.** The places v3 opens at herd 15, 20 and 40 (Post Box, Letter Lane, Parade Field) move to later releases (section 5.5). The pond is open from the start, with no Building Day.
- **Signposts.** At each fork a signpost shows two or three printed one-syllable place words ("pond", "hill", "pines"). A unicorn says where it wants to go in Elizabeth's voice ("Bella wants to go to the hill."), and Emma picks the road by reading the signs. This is a reading moment (the spoken target, printed choices, as v3's door visit for numbers). The places look different, so a wrong road ends at a funny dead end with a sign the unicorn shakes its head at, and the road home glows.

### 5.3 The unicorn chariot

Emma's own wish: "a unicorn chariot with Princess Emma on the back".

- **Opens:** with a jewel after the trails are open. The chariot shed (next to the saddle shed) shows a chariot under a cover once the trails open.
- **Building Day:** wheels and boards to fill (maths), the chariot's name to spell (she names her chariot), a card to read.
- **Driving:** she picks two unicorns to pull it (drags them to the front), climbs on the back and taps the road to drive. The chariot keeps to the chariot road. Up to four more unicorns ride in it. **(my call)**
- **Chariot jobs:** a unicorn at the lookout or a clearing wants something. Elizabeth says what and where. She loads the chariot (maths: fill to the number), reads the signposts on the way (reading) and delivers. The job has a visible end: the unicorn cheers and gives a pin.
- Free driving with any unicorns is always allowed.

### 5.4 Princess Emma's things

Each fresh jewel also gives Princess Emma one new thing: a ribbon colour for her ponytails, a crown, a dress, a sash, a cape. They show in a wardrobe trunk in Lumi's gazebo, where she dresses her. This replaces v3's decoration plots as the "every jewel has a target" rule. Because jewels arrive from the first visit, the wardrobe trunk ships in Wave A. **(my call)**

### 5.5 Later releases

Castle hill and the rainbow bridge (reached by chariot), the v3 places from its later releases (Post Box, Salon, Kitchen, Story Nook, Parade Field) as places in the world, flying unicorns. Each gets its own short spec after Emma's feedback.

## 6. Reuse from v3

### 6.1 Where v4 lives

- `games/moon-meadow-world/` with its own `package.json`, tests and README, as the repo rules ask. IDEAS.md gets a row with status `building`. **(my call: the slug and the name "Moon Meadow World")**
- v3 and v4 are two different games, and both stay in Emma's menu (Tjitse, 25 October 2026). v3 stays where it is and keeps working. It gets no new features from this work.

### 6.2 What is copied

At the start of the build the builder copies, not links, these from v3 into v4. **(my call: copy, so v4 can change them without breaking v3's 1,214 tests)**

- `src/core/` (100 of its 101 files do not depend on Svelte; the builder checks the one that does).
- `content/` (ladders, word bank, name bank, foods, breeds), with v4's word filter (section 4.3) and maths floor (section 4.4) applied.
- `src/ui/` 2D interaction parts (stones, gem slots, print with dots, basket, ghost hand, bubbles), `src/audio/`, `src/save/`, `src/parent/`.
- The audio packs and word pictures. They are referenced from the v3 build where possible, so they are not duplicated on disk or on the server.

What is new: the 3D world, Princess Emma, the 3D unicorns, movement, the slide, riding, the chariot, wild eggs, signposts and the glue between the 3D world and the 2D layer.

### 6.3 Own save and own start

v4 is a separate game (Tjitse, 25 October 2026). It does not read or import the v3 save. It has its own IndexedDB database, and v3's database is never opened.

- Emma starts v4 as a new player with Lumi's welcome and her first egg (v3 spec 2.9, "A new player"), without Moving Day.
- Her learning start uses v3's `year1` profile and hidden placement, so she does not repeat Phase 2 work. The maths probe starts at M12A, not M01, because she finds the low steps too easy. **(my call)**
- The parent corner keeps export and import, as in v3.

## 7. Tech

### 7.1 Stack

Confirmed by Tjitse on 25 October 2026.

| Part | Choice |
|---|---|
| 3D | three.js, the current release at build time, exact version pinned |
| Build | Vite + TypeScript, the versions v3 uses, target `safari15` |
| 2D layer | Svelte 5, as v3, over the WebGL canvas |
| Save | idb, as v3, own database name |
| Tests | Vitest, `playwright-cli` WebKit flows, as v3 |
| Audio | `shared/audio.js` with v3's `addPack` |
| Server | v3's `server/serve.ts` serves v4 too. The menu card and `scripts/deploy.sh` get a line |
| Audio budget | v4 gets its own `tools/audio/budget.json` with a new cap (Tjitse confirmed extra budget, 25 October 2026). Tjitse sets the number before the first generation run |

If the demo (section 9) shows the Air 2 cannot reach the budget even with lower settings, the build stops and Tjitse decides. The plan does not build a 2D fallback in advance (Tjitse, 25 October 2026).

No physics engine. Movement, the slide, the swim, riding and the chariot follow set paths and simple rules.

### 7.2 Art

- **Characters built in code.** Princess Emma and the unicorns are made from smooth simple shapes (spheres, capsules, rounded boxes) with code animation: a soft toy look with v3's colours, big heads and big eyes. Colours per unicorn are material settings, so every baby looks like its v3 self at no art cost. The ponytails are short chains that swing. **(my call: this is free, small in memory, easy to colour per unicorn and fits the Air 2)**
- **Scenery** from CC0 low-poly packs (for example Kenney and Quaternius), recoloured to v3's palette, or built in code. Every pack's licence is checked and recorded.
- **Style.** The v3 style rules in [docs/v3/art/STYLE.md](../v3/art/STYLE.md) carried into 3D: clean shapes, smooth soft shading, light from the top left, pastel bases with saturated accents only on things to tap or collect.
- **Flat pictures** (word pictures, food, items, pins) stay v3's 2D pictures in the 2D layer.

### 7.3 Budget for the iPad Air 2

Starting estimates. The demo (section 9) confirms or lowers them.

| Limit | Value |
|---|---|
| Frame rate | 60 fps target. Never below 30 for more than a moment |
| Render size | Device pixel ratio capped at 1.5 |
| Triangles on screen | Under 100,000 |
| Draw calls | Under 80. Grass, flowers and trees instanced |
| Lights | One sky light and one sun. No real-time shadows: a soft round shadow under each character |
| Animated unicorns | At most 8 fully animated near Princess Emma. Others use a cheap idle or stand still |
| Memory | Whole page under 300 MB in the Web Inspector memory timeline |
| Reload | No page reload after 20 minutes of play |

### 7.4 3D and the 2D layer

- The 2D layer owns every learning moment. When a moment opens, the camera eases to frame it and the 3D world keeps moving softly behind the layer.
- Speech bubbles and wish words are 2D, placed over the unicorn's head on screen.
- Dragging a 2D item (food, a hat) onto a 3D unicorn uses a ray from the touch point. A unicorn is a large target: at least 64 by 64 px on screen at the camera's distance.
- Every touchable 3D object has an entry in the test hook (`window.__game`) with a name and screen position, so flows can tap it.

## 8. Testing

As v3 (spec 6): Vitest for the core, `playwright-cli` WebKit flows at three iPad sizes on a free port, never 8765. Flows check the game state through the test hook, not pixels, because WebGL in emulated WebKit is not the real iPad. A stress page, as v3's `stress.html`, measures frame rate and memory on the real Air 2. Tjitse runs it, because agents cannot.

## 9. Order of work

Following the v3 approach: ship a wave, watch Emma play, then plan the next.

1. **Demo (throwaway).** A plain three.js page with the meadow, Princess Emma, 12 code-built unicorns, the pond and the slide. Tjitse runs it on the iPad Air 2 and reports frame rate and memory. Emma tries walking, calling unicorns and the slide. If it is too slow, the budgets go down before anything else is built. The demo is not kept. Wave A starts only when Tjitse says the demo works.
2. **Wave A.** The world (home meadow, stable yard, pond), Princess Emma, movement, the v3 heartbeat in 3D, Lumi's welcome, free play with the working slide, the new word filter, the maths floor and the new maths steps (section 4.4), the wardrobe trunk, the lantern walk at bedtime, the menu card. Then Emma's feedback.
3. **Wave B.** The saddle, riding, the trails, wild eggs, signposts. Then Emma's feedback.
4. **Wave C.** The chariot, the chariot road, chariot jobs. Then Emma's feedback.

## 10. Open for Tjitse

- The cap for the v4 audio budget.

## 11. Left to the builder

The route finding, the exact camera angle and speeds, the shapes of the code-built characters within the style rules, the layout of the world within section 3.2, which CC0 packs to use, the new audio lines and their wording (within v3's line rules and the audio budget), the test hook shape, and how the copied v3 code is trimmed.
