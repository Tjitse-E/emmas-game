# v3 decisions

Tjitse's decisions after the v2 round. These override `brainstorm.md`, the concept files and the research where they conflict.

## 2026-10-12

- **Direction:** Moon Meadow Home with the grafts in `brainstorm.md` section 3. Unicorn Egg Nest grows into a full game with levels.
- **World:** unicorns only, with Queen Lumi. No Fluffles and no Princess Pippa.
- **Play rhythm:** whenever she wants. Every design must work for a 5 minute visit and a 45 minute visit.
- **Saves:** on the iPad and on a server (odin.vendic.cloud).
- **Engine:** not Phaser 4. Svelte 5 + Vite + TypeScript on the DOM, see `research/engine.md`.
- **v2 patch:** patch the v2 demo now so real names are no longer refused, while v3 is built. Keep the save format.
- **Names:** any safe name is accepted. Most names come from a large pre-generated Elizabeth list. A name without a clip is still accepted and goes on the tag: Elizabeth says a kind line such as "What a great name! It's a tricky one for me to say." Unknown names are logged so the generator can add them on a later run. There is no nightly job and no on-demand clip server.
- **Language:** the app is fully British English. No Dutch in the app: no Dutch names spoken the Dutch way, no Dutch name bank, no Dutch text or audio. Emma's Dutch background only shapes which English contrasts get extra practice. A blocklist of rude words may include Dutch words, because she can build them with letters.

## 2026-10-12, answers to the spec questions

- **v2 save backup:** not needed.
- **School:** NOVA, a private English primary school following the British system. Emma is in Year 1. Her homework workbook for the rest of the year is extracted in `../learning-languages/raw/english-homework.md` (90 pages). It is Twinkl-style material at Phase 5 level: ai/ay/a-e, ee/ea, o-e/oa/ow/oe, ur/er/ir, ew/ue, ng, nk, ch/sh, ff/ll/ss, ck, tricky words, plurals (-s, -es), capitals and full stops, question marks, adjectives, "and", -ing/-ed/-er, un-, days of the week. The game's reading and spelling ladder follows this workbook.
- **iPad:** probably an older iPad Air model. Design the performance test for that.
- **Family names:** none. The name list uses simple common names.
- **How she opens v2:** in a Safari tab, for now.

## 2026-10-12, later

- **Plurals now:** Emma is learning plurals at school right now. Plurals (-s and -es, reading and spelling) come early in the game and are in the first playable, not in a later release.
- **No extra spending on art:** pictures come from the image generation tool in Tjitse's Codex subscription, or are drawn as SVG. No paid image API, no OpenRouter, no Gemini prepay. The paid research in `research/image-models.md` is reference only.
- **Art style:** no gouache, watercolour or brush texture. Clean shapes with smooth soft shading.
- **Style locked:** `art/style-reference.png` is the style reference for all v3 art, described in `art/STYLE.md`.

## 2026-10-12, build decisions

The lead's decisions for the build session. The full list with reasons is in `plan.md` sections 2.1 and 2.4.

- **App:** `games/moon-meadow-home/`, served from Tjitse's Mac on port 8765 by one Node script (`server/serve.ts`) that replaces `python3 -m http.server`. v2 and v3 share the origin, so v3 reads Emma's v2 save directly. File import stays as a second route.
- **Plain http at home:** no service worker, `persist()` or `crypto.subtle` is required. odin gets a deploy note only, because agents cannot reach it.
- **Scope:** all of spec 7.1 in three waves. Wave A (items 1 to 13) must be playable before Wave B starts.
- **Checks this session:** speech-to-text checks replace Tjitse's ear check. WebKit iPad emulation replaces the real iPad. Both originals are listed for Tjitse in the game README.
- **Deviations from the spec:** a miss then a right answer stays `miss` (L1); the default profile is `year1` (L2); R12 and R24 to R29 load with 1.2 (L3); unnamed v2 babies are named one per heartbeat after Moving Day (L4); numbers 61 to 100 come last and are cut first if credits run short (L5).

## 2026-10-12, after Emma's first play of Wave A

Emma's feedback: she wants to feed the baby unicorns; she wants to guide them into the stable, put them to bed and feed them there; the maths is too easy because it is always making 10, and she already knows the pairs that make 10. Tjitse's decisions for the next version (release 1.0.1). The plan is `next/plan.md`.

- **Harder maths:** a different total each time, every total at 15 or less. Totals 7, 8, 9, 11, 12, 13, 14 and 15, mixed so no two eggs in a row ask the same total; 10 only now and then as review. Order: totals under 10 first (7, 8, 9), then 11 and 12, then 13 to 15. Within a total: the full pair first ("5 and 3 make 8"), then the missing number ("5 and ? make 8"). Over 10 the egg gets a second nest of cups: 8 and 5 fills the first nest to 10 and puts 3 in the second, so crossing 10 is visible. Stones stay 1 to 9. A short re-probe or a placement change places her above bonds to 10, and her existing save moves up too. Number lines are needed only for 11 to 15 beyond what exists.
- **Feeding in the meadow:** hungry wishes. The first wish sometimes becomes "Pip is hungry!": she reads "peach" or "peaches" (her current reading step and the -s and -es plurals of R19 and S10) and drags the right food from a basket to the baby, which munches. In meadow free play the treat tool becomes a tray of three foods that say their name when tapped and can be fed to any baby. Existing food words, pictures and clips only.
- **Into the stable and to bed:** the lantern walk. Goodnight starts in the meadow at dusk. The lantern shows a name (the existing roll-call pick); she finds that baby and drags it along a glowing path into its stall, where it lies down in the sleep pose. The rest of the herd trots in by itself. She can tap a sleeping baby to tuck it in with a blanket. Name review stays as it is; door numbers stay.
- **Feeding in the stable:** at each manger the baby wants something; she reads it and gives it (the hungry-wish feeding). On some evenings that moment is a counting task instead ("The hay rack needs fifteen bundles. Nine are in.", totals to 15), then free feeding at any manger. Skipped when the visit is already long, so goodnight stays short. The learning stays felt in checked moments, not decoration.
- **Later, not now:** feeding bowls with sharing and halves, labelled food bins, bedtime wishes, and all of Waves B and C.
- **Audio budget:** stay within `tools/audio/budget.json` (cap 24,000, floor 10,007). Defer run 12 (numbers 61 to 100) and the Salon phrases to make room. Elizabeth speaks all learning content, names and numbers; the characters keep their voices from `VOICES.md`.
- **Art:** Codex image generation through the subscription, in the style of `art/STYLE.md`, or SVG. No paid API.
- **Release:** `content/release.json` is set for this version (1.0.1) without loading Wave B content.

The lead's decisions that fill the gaps (N1 to N30 in `next/plan.md` section 2, revised after validation the same day), in short:

- **Placement change, not a re-probe:** a `year1` save whose maths placement ended in M09 to M12, and that never measured the new steps, gets one `learn.override` `set-current` to the new first step (M12A). A parent or test override blocks it. The store's reconcile commits this one non-fact draft; facts still go through `missingFacts`. Emma's real save is checked before release; if she is not lifted, Tjitse sets M12A in the parent corner.
- **New steps:** M12A to M12F after M12 (pairs then missing parts for 7 to 9, 11 and 12, 13 to 15), new item kind `m:gap:<whole>-<part>`, items listed round-robin by total, existing steps and ids unchanged. M12B overlaps M12; that is accepted, and M12 becomes review after the lift. No new egg kind or breed.
- **Totals:** no two eggs in a row with the same total, tracked per visit in the learner fold. After the lift, review and mixed maths come from M09 on, with at most one total of 10 a visit and no one-steps. The veto never moves a learner off her current step or a placement probe.
- **Stone trays:** a two-stone tray is three pairs of the total, so every stone has a partner and no egg can dead-end.
- **No new event type:** feeding, the walk, tucking in and the hay rack use `learn.result`, `care.done` (`treat`, `rollcall`, `nap`) and `learn.override`. One new moment kind, `hay-rack`, on M12, M12B, M12D and M12F.
- **S10 in feeding:** feeding is reading, so it serves R19; S10 stays at the Bath Pond labels.
- **Unicorn foods:** feeding uses an allow-list of foods a baby unicorn eats, with look-alike groups so a basket or tray never holds two pictures that look the same.
- **Goodnight order:** the lantern walk at dusk (a free walk with no name when no name can be asked), the herd walks in, the babies eat awake at their mangers, she taps the moon for bedtime, they lie down in the straw, the door pick, tucking in, then the window and the sky.
- **Goodnight stays short:** one checked manger moment per evening (a manger wish, or the hay rack on about 4 evenings in 10), then free feeding where every baby wants one tray food; skipped from 30 checked moments or 20 minutes in a visit.
- **Hay rack:** she drags a pile of hay (small bundles, or a cart with a numeral), so "bundle" always means one bundle.
- **Art:** eight new pictures (stable at night, stall bed, straw pile, sleep blanket, manger, hay bundle, food tray, nest of cups). Dusk is a tint over the meadow; lying down, sleeping and eating are CSS on the existing unicorns.
