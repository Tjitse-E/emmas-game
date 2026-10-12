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
