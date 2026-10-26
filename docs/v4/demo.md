# Moon Meadow World (v4): the playable demo

Built on 25 October 2026 from [spec.md](spec.md) section 9, with one change asked by Tjitse: the demo is one playable level with the learning in it, so Tjitse can see how v4 works, whether Emma likes it and what to improve. It also serves the spec's demo purpose: frame rate and memory on the iPad Air 2 with 14 code-built unicorns, the pond and the slide.

Every call in this document is **(my call)** unless it quotes the spec. The demo keeps no save: every start is the same first day.

## 1. The level: "Emma's first day in Moon Meadow"

About 12 to 15 minutes. One visit from the Play button to goodnight, with a visible end and a reward.

| # | Part | What happens | Checked |
|---|---|---|---|
| 0 | Start | Big Play button (unlocks audio on iOS). The camera sweeps down over the meadow to Princess Emma. 12 baby unicorns and foals graze. | |
| 1 | Welcome | Lumi (her portrait in the moon, top left): "Hello, Emma! I'm Queen Lumi." "This meadow is yours. Will you make it a home for my unicorns?" A crown sparkles onto Princess Emma: "Here is your crown. You are my Nest Keeper now!" Elizabeth: "An egg is waiting." The ghost hand taps the grass: "Tap the grass to walk." | |
| 2 | Egg 1 | She walks to the nest. Warm egg, adding: "This egg needs thirteen warm cups." "Eight cups are warm already." She drags one of three number stones. Totals 11 to 15, at least 6 warm, at least 3 to add. | maths |
| 3 | Hatch | Wobble, cracks, burst. Lumi: "It's hatching!", "A baby unicorn! Hello, little one." | |
| 4 | Naming | Three name bells, she drags the one she likes to the baby, then spells it with letter gems and slides the star. One-syllable decodable names (Pip, Meg, Beth). | spelling |
| 5 | Food wish | The baby's bubble shows a printed food word with sound dots ("plum"). She drags the right food from a basket of three. | reading |
| 6 | Pond play | "Let's go to the pond!" The babies she taps follow her. She drags a unicorn to the top of the slide, or taps the slide to slide down herself. Unicorns slide, splash, swim and climb out by themselves. | |
| 7 | Wild egg | After the first slide (or 45 s at the pond) Lumi sends an egg to the pond shore: "Oh! Another egg!" | |
| 8 | Egg 2 | Snow egg, taking away across ten: "This egg needs nine warm cups." "But thirteen cups are warm!" She drags the snow stone that cools the extra cups. Start 11 to 16, take away 3 to 6, result 7 to 10. | maths |
| 9 | Naming | As 4, new bells. | spelling |
| 10 | Bath wish | The second baby's bubble shows a bath word ("duck"). She gives it from a basket of three bath toys. | reading |
| 11 | Free play | About two minutes: slide, swim, call and carry unicorns, and the food basket (tap a food to hear its name, drag it to any unicorn). | |
| 12 | Bedtime | Dusk. "The sun is going down. Time for bed!" She walks to the stable yard with her babies, the herd comes too. Baby 1 moves in ("Pip!" "Baby number thirteen.", door 13 glows, not checked). Visit: "Pip!" "Off to door nine!" She taps door 9 and that unicorn pokes its head out. Baby 2 moves in at door 14. Roll call: "Door twelve, bedtime!" twice, then "Here comes everyone else!" | maths (door numerals) |
| 13 | Goodnight | Night falls, stars. "Fourteen unicorns!" Lumi: "You did so well today, Emma! Here are new ribbons for your hair." Princess Emma's ribbons change colour and she twirls. Lumi: "Goodnight, Emma." A big moon button plays the level again. | |

Checked moments per play: 2 eggs, 3 door numerals, 2 names, 2 wishes. The demo logs every result to the console and to the test hook, so Tjitse and the flows can see first try, miss or helped.

## 2. The rules that apply

From v3 (spec 2.5, 2.11, 3.3) and v4 (spec 4.3, 4.4), as they apply to this level:

- Elizabeth says every goal once, short. The Lumi portrait (top left) repeats the current goal and never the answer.
- One goal at a time, always shown with a picture: cups, slots, a wish bubble, a glowing door.
- Reading never says the deciding word before she acts. Elizabeth reads it after the act.
- Spelling always says the name first ("Let's write the name on the tag. Listen." "Pip!").
- Hint ladder in every checked moment: 15 s idle (10 s on reading) repeats the goal; one miss or a second idle gives the focused hint (count the cold cups, the sounds slowly, the row glows); two misses bring the ghost hand with the answer (`helped`).
- A mistake is a funny event: steam or frost on the egg, a head shake and a giggle, a sleepy baby in a nightcap ("Not me!"). No buzzer, no red cross.
- The ghost hand shows each new gesture once, on something that is not the answer.
- Maths floor (spec 4.4): no adding or taking away 1 or 2, no egg total under 7. Stones 1 to 9, three to choose from, dots and numerals.
- Words she must read (spec 4.3): one syllable, at most five letters, pictured, with an Elizabeth clip.
- Free play is never checked. Basket items in a checked wish only make a sound until she has acted.
- British English only, no Dutch anywhere. All speech is pre-generated ElevenLabs audio. No browser speech.

## 3. Getting around

As spec 3.3:

- Tap the grass: Princess Emma walks there around obstacles. A second tap on the same spot within a second makes her run.
- Tap a unicorn: it says hello, its name tag shows, Elizabeth says its name, and it follows her. At most three follow. A fourth sends the oldest back to graze.
- Drag a unicorn: it floats on a moonbeam to where she lets go. On the slide top it slides, in the pond it swims.
- Tap the slide: Princess Emma climbs up and slides into the pond, then swims out.
- The goal of the moment has a sparkle beacon in the world. When it is off screen, a glowing picture arrow at the screen edge walks her there when tapped. After 20 s without progress outside a moment, Elizabeth says "The pond is this way." (or nest, egg, stable).
- The world has a visible edge (fence, trees, hedges). Nothing to fall from, nowhere to get stuck.
- The round home button (top right, `shared/home.js` style) goes back to the picture menu.

## 4. Look

- Characters built in code from smooth simple shapes (spec 7.2): soft-toy look, big heads, big eyes with two highlights, rosy cheeks, pastel coats, saturated curly manes, golden horns and hooves.
- Princess Emma: two blonde ponytails that almost reach the ground and swing as she walks, a pink dress, a small gold crown after the welcome, ribbons in her hair.
- Scenery built in code: rolling meadow, flowers, round trees, a white and pink gazebo for Lumi, the nest on a mound, the pond with lily pads, ducks and a candy-striped slide, two stable rows with half doors in a 5 by 2 ten-frame and gold number plaques.
- Light from the top left, no real-time shadows (a soft round shadow under each character), fog for distance. Day turns to a pink sunset and a blue night with stars and lanterns.
- Flat pictures (food, bath toys, Lumi, ghost hand, stones) come from v3's art in the 2D layer.

## 5. Tech

- `games/moon-meadow-world/`: Vite 8, TypeScript 6, three.js 0.186.1 pinned, target `safari15`, base `./`. The 2D layer is plain DOM in TypeScript, not Svelte, because the demo is throwaway (spec 9). Wave A moves to Svelte and the copied v3 UI.
- v3's clips (core, numbers, names, words), letter sounds and pictures are used where they are served, under `games/moon-meadow-home/` next to the demo (spec 6.2), so nothing is duplicated. In `vite dev` they come from `/v3/`.
- New lines are in `public/audio/v4demo/lines.json`. Budget for the demo: at most 4,000 credits (my call; spec 10 leaves the v4 cap to Tjitse, this only covers the demo).
- Budgets as spec 7.3: pixel ratio capped at 1.5, under 80 draw calls, under 100,000 triangles, two lights, no shadow maps. Unicorns are drawn instanced per body part, so the herd costs a fixed number of draw calls.
- `?perf=1` shows frame rate, draw calls and triangles in a corner, so Tjitse can read them on the Air 2.
- The test hook `window.__game` exposes the state, the screen position of every touchable thing, `jump(part)` to start at any part, and the results log. Flows in `flows/` play the whole level with `playwright-cli` at 1180 x 820, 1080 x 810 and 1366 x 1024.

## 6. Out of the demo

The learning engine and ladders, saves, the parent corner, gold-bell free naming, riding, the trails, the chariot, the wardrobe trunk, Lumi's welcome on later visits. Wave A builds them after Emma has played this.
