# Moon Meadow Home: art workstream implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every picture the v3 first playable and releases 1.1 to 1.3 show (word pictures, items, stations, eggs, pins, outfits, decorations, buildings, UI pictures, backgrounds, Queen Lumi and 9 unicorn breeds in 2 growth stages with free colour variants), made with Codex image generation, cut out and checked by local scripts, listed in one manifest, drawn by three Svelte components, and proven by a meadow stress test at 40 or more unicorns.

**Architecture:** Python scripts (Pillow and numpy only, both already installed) drive `codex exec` for sheets of objects, cut them into single WebP pictures, check them, and write a manifest. Unicorns use the "whole sprite" rig by default: one generated picture per breed and stage, split by colour into greyscale shade layers (body, mane, mane2) that the browser colours with `background-blend-mode: multiply` plus a CSS mask, a fixed colour layer, a separate tail part that swishes and an eyelid part that blinks. A timed spike tries real layer cutting; the manifest format is the same for both modes, so the app does not change if the spike succeeds. The app reads `public/art/manifest.json` through `src/art/manifest.ts` and draws with `Picture.svelte`, `Heap.svelte`, `Unicorn.svelte`, `Egg.svelte` and `Lumi.svelte`.

**Tech Stack:** Python 3.14.6 with Pillow 12.3.0 and numpy 2.5.1 (system install, no new packages), Swift 6.3.3 (Apple Vision, for text detection and a second-opinion cut-out mask), ImageMagick `magick` (SVG fallback rendering), Codex CLI 0.162.1 (`codex exec`, image generation in Tjitse's subscription), TypeScript 6.0.3, Svelte 5.57.2, Vite 8.3.4, Vitest 5.0.3, `playwright-cli` 0.1.8 (WebKit, iPad emulation).

**Spec:** `docs/v3/spec.md` (sections 2.6, 2.7, 3.10, 5.2, 5.4, 5.5, 7.1), `docs/v3/decisions.md` (wins on conflicts), `docs/v3/art/STYLE.md`, `docs/v3/research/curriculum.md` (ladders and workbook words), `docs/v3/research/image-models-pipeline.md` (sections 4.2 to 4.4, reference only).

## Global Constraints

- Style: clean picture-book look, clean shapes, smooth soft shading, light from the top left, a warm outline in a darker shade of each fill. No paint, gouache, watercolour, brush or paper texture (STYLE.md).
- Every generation attaches `docs/v3/art/style-reference.png`. The prompt comes before `-i`, because `-i` takes every argument after it as a file.
- Codex runs outside the Claude Code sandbox, at most 4 processes at a time. No paid image API, no OpenRouter, no Gemini, no fal (decisions.md).
- Plain white background for everything that gets cut out. No text, letters or numbers in any picture.
- Unicorns only. Our own characters, no look-alikes of trademarked characters. Every animal word picture is a toy (plush toy, rubber bath toy or wooden toy). No people, no vehicles except toys, nothing sad, sick, hurt, scary or on fire.
- The app is fully British English. No Dutch word in any id, description, file name or picture.
- Rendering (spec 5.2): animate only `transform` and `opacity`. No animated filters, shadows or SVG filters. At most three full backgrounds decoded at once.
- Memory budget for the meadow (spec 5.4): decoded images under 150 MB, the whole page under 300 MB. Sized for the iPad Air 2 (Safari 15.4, 1024 x 768 points).
- Safari 15.4 features only: write both `-webkit-mask-*` and `mask-*`.
- Stage is 1180 x 820 CSS pixels. Art is made at 2x its largest display size.
- Agents never read, print, source or copy `.env`.
- Small commits with plain English messages and no AI attribution.
- Paths in this plan are relative to `games/moon-meadow-home/` unless they start with `docs/`, `shared/` or `/`.

## Review Focus

1. **Codex draws the objects of a sheet in a different order than asked.** Emma would read "hat" and the basket would show a cup. Expected: no picture reaches the manifest before an agent has looked at it and marked it `ok`, and a wrong order can be fixed with a `swap:` verdict. Pinned by `test_unreviewed_pictures_are_left_out` and `test_swap_verdict_moves_picture` in Task A5.
2. **Pale objects (snow, sheep, egg shells, white socks, a white unicorn) lose parts to background removal**, also when the outline has a small gap. Expected: white inside an outline stays opaque. Pinned by `test_white_inside_outline_is_kept` and `test_gap_in_outline_does_not_eat_object` in Task A1.
3. **A colour from an old v2 save, a sync from another device or a typo is not a valid hex colour, or is so dark that multiply turns the unicorn into a black blob.** Expected: invalid colours fall back to defaults and every palette colour is light enough to keep the shading visible. Pinned by `resolveColours replaces invalid colours` and `palette colours are light enough` in Task A6.
4. **A breed or outfit picture that is not generated yet is asked for** (a Sparkle foal arrives by sync before Wave C art exists, or a save names an outfit id that was renamed). Expected: the unicorn still draws, as the Moon breed, and the outfit is skipped. Pinned by `unicornEntry falls back to moon` (Task A6) and `outfitPlacement returns null for a missing picture` (Task A9).
5. **Small unicorns pick the large rendition on a 2x screen**, so 40 meadow babies decode 720 px layers and the Air 2 reloads the page. Expected: the small rendition up to 110 percent of its pixel height, and the stress test fails on decoded memory over budget. Pinned by `chooses sm for meadow sizes` (Task A9) and `verdict fails on decoded memory` (Task A10).

---

## Decisions this plan makes

These are made for this session. The integrator reconciles them with the other workstreams.

| Topic | Spec says | This plan | Why |
|---|---|---|---|
| Atlases | WebP atlases per area | One WebP file per picture, grouped by `pack` in the manifest | An atlas decodes whole even when one picture shows, which costs memory on the Air 2. Per-file pictures let the planner check one picture at a time. The `pack` field still lets the service worker cache per area |
| Background size | 2360 x 1640 | 1770 x 1230 (1.5x), WebP quality 82 | Codex returns about 1.5 megapixels, so a 2360 wide file adds no detail and costs 44 percent more decoded memory |
| Unicorn rig | Layers per part from a cut-up baby | Whole sprite per breed and stage (tail part, blink lids, colour layers) by default. Task A12 tries layer cutting in a time box and upgrades only if it passes | The lead's decision for this session. Breathe, blink, tail swish, hop, walk bob, happy and drag all work on a whole sprite |
| Breed horn colour | CSS colour | Baked into the fixed layer per breed (gold, bronze, silver, pearl) | Keeps colour classification to four classes |
| Word pictures | About 500 | 273 seed words for the loaded reading steps (Task A2) plus top-ups requested by the content workstream (Task B5) | The seed covers every loaded step with a picturable noun, all 35 plural words and every twin pair. Abstract words, body parts and duplicates are left out |
| Heaps | Drawn by code | `heapLayout` and `jarLayout` in `src/art/heap.ts`, drawn by `Heap.svelte` | As the spec |

## File map

Python tools (owned by this workstream):

| Path | Responsibility |
|---|---|
| `tools/art/__init__.py` | Marks the package. Empty |
| `tools/art/.gitignore` | Ignores `.bin/` and `__pycache__/` |
| `tools/art/paths.py` | Folder constants and id rules |
| `tools/art/imageops.py` | White background removal, connected components, dilation, trim, fit, WebP save |
| `tools/art/lists.py` | Parses the text lists in `art-src/lists/` into entries |
| `tools/art/prompts.py` | Prompt text for sheets, sprites, foals, backgrounds and Lumi |
| `tools/art/codex_gen.py` | Runs `codex exec` jobs in parallel with retries, resume and a ledger |
| `tools/art/sheets.py` | Plans sheets from a list and cuts a generated sheet into single objects |
| `tools/art/checks.py` | Automatic picture checks |
| `tools/art/vision.swift` | Apple Vision command line: `text <png>` and `mask <png> <out>` |
| `tools/art/vision.py` | Compiles and calls `vision.swift` |
| `tools/art/review.py` | Review files (verdict per picture) and the redo list |
| `tools/art/contact.py` | PNG contact sheets for agent review, HTML contact page at real size |
| `tools/art/manifest.py` | Merges meta files into `public/art/manifest.json` |
| `tools/art/regions.py` | Unicorn colour classes, shade layers, recolour simulation, horn colour |
| `tools/art/rig.py` | Builds a sprite-mode unicorn entry: parts, anchors, renditions, silhouette |
| `tools/art/derive.py` | Derived pictures: speckle pattern, sky unicorn, silhouettes, Lumi mouth |
| `tools/art/placeholder.py` | Placeholder unicorn art with 12 layers for the first stress run |
| `tools/art/stress_report.py` | Parses stress flow output into `art-src/stress-results.json` |
| `tools/art/pipeline.py` | The command line: `plan-sheets`, `gen`, `cut`, `review`, `redo`, `svg`, `sprite`, `backgrounds`, `derive`, `manifest`, `check-all`, `contact-html`, `status` |
| `tools/art/tests/test_*.py` | unittest suites, one per module |

Art sources and data (owned by this workstream):

| Path | Responsibility |
|---|---|
| `art-src/.gitignore` | Ignores `raw/` and `work/` |
| `art-src/README.md` | How to run the pipeline, for the next agent or Tjitse |
| `art-src/lists/words.txt` | Seed word pictures per reading step |
| `art-src/lists/notes.txt` | Visual description per word picture |
| `art-src/lists/tint.txt` | Tintable word pictures and their default colour |
| `art-src/lists/items.txt` | Every non-word picture with kind, wave, pack, size, tint, slot and description |
| `art-src/lists/breeds.txt` | The 9 breeds, their wave, horn colour and what changes from the reference |
| `art-src/lists/backgrounds.txt` | The 11 backgrounds with wave, pack and description |
| `art-src/lists/calibration.json` | Grid and output size measured in Task A3 |
| `art-src/lists/anchor-overrides.json` | Hand-set unicorn anchors after the visual check |
| `art-src/lists/rig-mode.json` | `{"mode": "sprite" or "layers", "why": "..."}` from Task A12 |
| `art-src/lists/sheets/<batch>.json` | Planned sheets per batch |
| `art-src/sources/<sheet or key>.webp` | Lossless copy of every accepted Codex output (committed, so nothing must be regenerated) |
| `art-src/raw/` | Codex PNG output (ignored) |
| `art-src/work/` | Codex working folders, cuts, PNG contact sheets (ignored) |
| `art-src/jobs/<batch>.jsonl` | Ledger of Codex runs |
| `art-src/meta/<batch>.json` | Manifest entries written by each batch |
| `art-src/review/<batch>.json` | Verdict per picture |
| `art-src/svg/<id>.svg` | Hand-drawn SVG fallbacks |
| `art-src/contact/index.html` | Contact page at real size for the iPad |
| `art-src/stress-results.json` | Stress test numbers per run |
| `art-src/missing.json` | Ids in the lists that are not in the manifest |

App code (owned by this workstream):

| Path | Responsibility |
|---|---|
| `src/art/manifest.ts` | Manifest types, loader and lookups |
| `src/art/palette.ts` | Coat and mane palettes, named colours, colour validation |
| `src/art/tint.ts` | CSS for tinted, plain and pattern layers |
| `src/art/heap.ts` | Heap and jar layouts, seeded random |
| `src/art/unicornParts.ts` | Pure layout of a unicorn: rendition, parts, anchors, outfits, head crop, animation delays |
| `src/art/unicorn.css` | Keyframes and classes for unicorn poses |
| `src/art/Picture.svelte` | One picture, tinted when the picture is tintable |
| `src/art/Heap.svelte` | A heap of copies of one picture |
| `src/art/Unicorn.svelte` | A unicorn with colours, traits, pose, facing, outfit, head-only mode |
| `src/art/Egg.svelte` | An egg with skin, cracks and wobble |
| `src/art/Lumi.svelte` | Queen Lumi in the moon with a talking mouth |
| `src/stress/frameStats.ts` | Frame time statistics and the stress verdict |
| `src/stress/Stress.svelte` | The meadow stress scene |
| `src/stress/main.ts` | Mounts the stress scene from URL parameters |
| `stress.html` | Entry page of the stress test |
| `flows/art-stress.sh` | playwright-cli run of the stress page at the iPad sizes |
| `tests/art/fixture.ts` | A small manifest for tests |
| `tests/art/*.test.ts` | Vitest suites |
| `public/art/**` | Output pictures and `manifest.json` |

## Contracts I need

The integrator checks each of these against the other workstreams' plans.

1. **Project skeleton.** `games/moon-meadow-home/package.json` has Vitest, Svelte and Vite as in spec 5.1. `vite.config.ts` lists `stress.html` next to `index.html` in `build.rollupOptions.input`, so `vite build` writes `stress.html` next to `index.html` in the output folder the repo server serves (this plan assumes `dist/`, reached at `/games/moon-meadow-home/dist/`; Task C4 step 2 uses that address and changes with it). It sets `base` so that `import.meta.env.BASE_URL + 'art/manifest.json'` serves `public/art/manifest.json`. Vitest picks up `tests/**/*.test.ts` in the `node` environment. Optional npm aliases: `"art": "PYTHONPATH=tools python3 -m art.pipeline"`, `"art:test": "PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -v"`.
2. **App start.** `src/main.ts` awaits `loadArtManifest()` before it mounts the first scene, and shows the Play button only after it resolves.
3. **Content workstream.** Every word in the word bank names its picture in a field `picture: string`, which is an id from `art-src/lists/words.txt` (Task A2 commits it early). Words that need a picture not in the seed go into `art-src/lists/requests.txt`, one line `id | step | description`, which the content workstream owns and Task B5 reads. Breed ids are exactly `moon`, `nestling`, `pebble`, `cosy`, `berry`, `snow`, `bubble`, `post`, `sparkle`. Egg kind ids use the same names (the egg kind is named after the breed it brings). Adjective colour words are the keys of `NAMED_COLOURS` in `src/art/palette.ts`.
4. **Core and save.** A baby stores `colours: { body: string; mane: string; mane2: string }` (hex `#rrggbb`, the same shape as v2 `c`, so the v2 import copies it as is) and `traits: { shiny: boolean; speckled: boolean; golden: boolean; founder: boolean }`. If core declares `BreedId` and `Stage` itself, the values match `src/art/manifest.ts` and one file re-exports the other.
5. **Planner.** Calls `hasPicture(id)` from `src/art/manifest.ts` before it serves a word, and never serves an item whose picture is missing (spec 3.6 and 4.7).
6. **Content validator.** `tools/validate-content.ts` reads `public/art/manifest.json` to check that every word's `picture` exists.
7. **Scenes and UI parts.** Draw pictures only through `Picture`, `Heap`, `Unicorn`, `Egg` and `Lumi`, and backgrounds with `artUrl(background(id)!.src)`. Set `talking` on `Lumi` while a Lumi clip plays. Gem letters, slots, stones' dots, word cards, bubbles, the moonbeam and the mist gradient are drawn by the UI workstream in code. Art supplies their base pictures (`ui-gem`, `ui-gem-crescent`, `ui-stone`, `ui-stone-snow`, `ui-star`, `ui-sparkle`).
8. **Meadow scene owner.** Reads `art-src/stress-results.json` to choose DOM or PixiJS. A PixiJS meadow reads the same manifest: each tinted layer is a sprite with `tint` set to the colour (PixiJS tint multiplies, as the CSS does).
9. **Local server.** The repo server on port 8765 serves `.webp` as `image/webp`, `.json` as `application/json` and `.svg` as `image/svg+xml`.
10. **Service worker (when present).** Precaches `art/manifest.json`, every picture with `pack` `core`, `words` or `meadow`, and the other packs when their area opens.

---

## Wave A: first playable

### Task A1: Art toolkit image operations

**Files:**
- Create: `tools/art/__init__.py`, `tools/art/.gitignore`, `tools/art/paths.py`, `tools/art/imageops.py`, `art-src/.gitignore`
- Test: `tools/art/tests/__init__.py`, `tools/art/tests/test_imageops.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `paths.GAME: Path`, `paths.REPO: Path`, `paths.STYLE_REF: Path`, `paths.SRC`, `paths.LISTS`, `paths.RAW`, `paths.SOURCES`, `paths.META`, `paths.REVIEW`, `paths.SVG`, `paths.WORK`, `paths.JOBS`, `paths.CONTACT`, `paths.PUBLIC_ART`
  - `paths.is_valid_id(s: str) -> bool`, `paths.is_word_id(s: str) -> bool`, `paths.PREFIXES: tuple[str, ...]`
  - `imageops.unmatte_white(im: Image.Image, tol: float = 18.0) -> Image.Image` (RGBA)
  - `imageops.label_components(mask: np.ndarray) -> tuple[np.ndarray, int]` (8-connected, labels 1..n, 0 is empty)
  - `imageops.dilate(mask: np.ndarray, r: int) -> np.ndarray`
  - `imageops.trim(im: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]` (box is x, y, w, h)
  - `imageops.fit_square(im: Image.Image, size: int, pad: float = 0.1) -> Image.Image`
  - `imageops.fit_long(im: Image.Image, long_side: int, pad: float = 0.04) -> Image.Image`
  - `imageops.save_webp(im: Image.Image, path: Path, quality: int = 88, lossless: bool = False) -> int` (bytes written)

- [ ] **Step 1: Write the failing test**

```python
# tools/art/tests/test_imageops.py
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from art import imageops, paths


def disc_on_white(size=200, r=60, fill=(200, 120, 220), outline=(120, 60, 140), bg=(255, 255, 255)):
    im = Image.new('RGB', (size, size), bg)
    d = ImageDraw.Draw(im)
    c = size // 2
    d.ellipse([c - r, c - r, c + r, c + r], fill=fill, outline=outline, width=4)
    return im


class PathsTest(unittest.TestCase):
    def test_ids(self):
        self.assertTrue(paths.is_valid_id('toy-castle'))
        self.assertFalse(paths.is_valid_id('Toy castle'))
        self.assertFalse(paths.is_valid_id('hat--x'))
        self.assertTrue(paths.is_word_id('hat'))
        self.assertFalse(paths.is_word_id('item-nest'))
        self.assertTrue(paths.STYLE_REF.exists())


class UnmatteTest(unittest.TestCase):
    def test_background_becomes_transparent_and_object_opaque(self):
        a = np.asarray(imageops.unmatte_white(disc_on_white()))[..., 3]
        self.assertEqual(a[0, 0], 0)
        self.assertEqual(a[5, 195], 0)
        self.assertEqual(a[100, 100], 255)

    def test_off_white_background_is_removed(self):
        im = Image.new('RGB', (100, 100), (250, 249, 246))
        ImageDraw.Draw(im).rectangle([30, 30, 70, 70], fill=(90, 160, 200), outline=(40, 90, 130), width=3)
        a = np.asarray(imageops.unmatte_white(im))[..., 3]
        self.assertEqual(a[2, 2], 0)
        self.assertEqual(a[50, 50], 255)

    def test_white_inside_outline_is_kept(self):
        a = np.asarray(imageops.unmatte_white(disc_on_white(fill=(255, 255, 255))))[..., 3]
        self.assertEqual(a[100, 100], 255)

    def test_gap_in_outline_does_not_eat_object(self):
        im = disc_on_white(fill=(255, 255, 255))
        ImageDraw.Draw(im).rectangle([98, 36, 99, 46], fill=(255, 255, 255))  # 2 px gap in the top of the outline
        a = np.asarray(imageops.unmatte_white(im))[..., 3]
        self.assertEqual(a[100, 100], 255)
        self.assertEqual(a[120, 80], 255)

    def test_edge_pixels_are_decontaminated(self):
        im = disc_on_white().resize((100, 100), Image.LANCZOS)
        arr = np.asarray(imageops.unmatte_white(im)).astype(int)
        edge = (arr[..., 3] > 0) & (arr[..., 3] < 255)
        self.assertTrue(edge.any())
        self.assertLess(arr[edge][:, :3].min(axis=1).mean(), 235)


class ComponentsTest(unittest.TestCase):
    def test_labels_separate_blobs(self):
        m = np.zeros((50, 50), bool)
        m[5:10, 5:10] = True
        m[8, 8:12] = True
        m[30:40, 30:45] = True
        labels, n = imageops.label_components(m)
        self.assertEqual(n, 2)
        self.assertEqual(labels[5, 5], labels[8, 11])
        self.assertNotEqual(labels[5, 5], labels[35, 35])
        self.assertEqual(labels[0, 0], 0)

    def test_diagonal_pixels_connect(self):
        m = np.zeros((5, 5), bool)
        m[0, 0] = m[1, 1] = m[2, 2] = True
        self.assertEqual(imageops.label_components(m)[1], 1)

    def test_large_mask_is_fast_enough(self):
        m = np.random.default_rng(1).random((1200, 1300)) > 0.5
        import time
        t = time.time()
        imageops.label_components(m)
        self.assertLess(time.time() - t, 20)


class FitTest(unittest.TestCase):
    def test_trim_to_alpha_bbox(self):
        im = Image.new('RGBA', (100, 100), (0, 0, 0, 0))
        im.paste((255, 0, 0, 255), (20, 30, 60, 50))
        t, box = imageops.trim(im)
        self.assertEqual(box, (20, 30, 40, 20))
        self.assertEqual(t.size, (40, 20))

    def test_fit_square_centres_and_pads(self):
        im = Image.new('RGBA', (100, 50), (10, 20, 30, 255))
        out = imageops.fit_square(im, 320, pad=0.1)
        self.assertEqual(out.size, (320, 320))
        ys, xs = np.nonzero(np.asarray(out)[..., 3])
        self.assertEqual(xs.min(), 32)
        self.assertEqual(xs.max(), 287)
        self.assertAlmostEqual((ys.min() + ys.max()) / 2, 159.5, delta=1)

    def test_fit_long_keeps_aspect(self):
        im = Image.new('RGBA', (400, 100), (10, 20, 30, 255))
        out = imageops.fit_long(im, 800, pad=0.04)
        self.assertEqual(out.size, (800, 248))  # margin 32 px, object 736 x 184

    def test_save_webp_keeps_alpha(self):
        im = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        im.paste((255, 0, 0, 255), (16, 16, 48, 48))
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'x.webp'
            n = imageops.save_webp(im, p)
            self.assertGreater(n, 0)
            back = Image.open(p)
            self.assertEqual(back.mode, 'RGBA')
            self.assertEqual(back.getpixel((0, 0))[3], 0)


if __name__ == '__main__':
    unittest.main()
```

`tools/art/tests/__init__.py` is empty.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: FAIL with `cannot import name 'imageops'` (with `PYTHONPATH=tools` and `-t tools`, the package imports as `art` and the tests as `art.tests.test_imageops`).

- [ ] **Step 3: Write the implementation**

`tools/art/.gitignore`:

```
.bin/
__pycache__/
```

`art-src/.gitignore`:

```
raw/
work/
```

`tools/art/paths.py`:

```python
import re
from pathlib import Path

GAME = Path(__file__).resolve().parents[2]
REPO = GAME.parents[1]
STYLE_REF = REPO / 'docs/v3/art/style-reference.png'
SRC = GAME / 'art-src'
LISTS = SRC / 'lists'
RAW = SRC / 'raw'
SOURCES = SRC / 'sources'
META = SRC / 'meta'
REVIEW = SRC / 'review'
SVG = SRC / 'svg'
WORK = SRC / 'work'
JOBS = SRC / 'jobs'
CONTACT = SRC / 'contact'
PUBLIC_ART = GAME / 'public/art'

ID_RE = re.compile(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
PREFIXES = ('item-', 'station-', 'prop-', 'outfit-', 'pin-', 'decor-', 'ui-', 'egg-', 'building-', 'bg-', 'lumi-')


def is_valid_id(s: str) -> bool:
    return bool(ID_RE.match(s))


def is_word_id(s: str) -> bool:
    return is_valid_id(s) and not s.startswith(PREFIXES)
```

`tools/art/imageops.py`:

```python
from pathlib import Path

import numpy as np
from PIL import Image


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(r):
        p = np.pad(out, 1)
        grown = out.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                grown |= p[1 + dy:1 + dy + out.shape[0], 1 + dx:1 + dx + out.shape[1]]
        out = grown
    return out


def label_components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """8-connected labelling over row runs. Pure Python over runs, numpy per row."""
    h, w = mask.shape
    parent = [0]

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    rows: list[list[tuple[int, int, int]]] = []
    prev: list[tuple[int, int, int]] = []
    for y in range(h):
        d = np.diff(np.concatenate(([0], mask[y].astype(np.int8), [0])))
        starts = np.flatnonzero(d == 1).tolist()
        ends = np.flatnonzero(d == -1).tolist()
        cur = []
        j = 0
        for s, e in zip(starts, ends):
            # runs are sorted, so skip previous runs that end before this one starts (8-connected overlap:
            # ps <= e and pe >= s, with pe and e exclusive ends)
            while j < len(prev) and prev[j][1] < s:
                j += 1
            lab = 0
            k = j
            while k < len(prev) and prev[k][0] <= e:
                root = find(prev[k][2])
                if lab == 0:
                    lab = root
                elif root != lab:
                    lo, hi = min(root, lab), max(root, lab)
                    parent[hi] = lo
                    lab = lo
                k += 1
            if lab == 0:
                lab = len(parent)
                parent.append(lab)
            cur.append((s, e, lab))
        rows.append(cur)
        prev = cur
    remap: dict[int, int] = {}
    labels = np.zeros((h, w), np.int32)
    for y, cur in enumerate(rows):
        for s, e, lab in cur:
            root = find(lab)
            if root not in remap:
                remap[root] = len(remap) + 1
            labels[y, s:e] = remap[root]
    return labels, len(remap)


def _local_max(v: np.ndarray, r: int) -> np.ndarray:
    out = v.copy()
    p = np.pad(v, r, mode='edge')
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out = np.maximum(out, p[r + dy:r + dy + v.shape[0], r + dx:r + dx + v.shape[1]])
    return out


def unmatte_white(im: Image.Image, tol: float = 18.0) -> Image.Image:
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    near = dist <= tol
    solid = dilate(~near, 1)                      # closes gaps of up to 2 px in an outline
    labels, _ = label_components(~solid)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bgmask = np.isin(labels, edge[edge > 0])
    bgmask = dilate(bgmask, 1) & near             # give back the pixel the closing took
    alpha = np.where(bgmask, 0.0, 1.0)
    band = dilate(bgmask, 2) & ~bgmask
    ref = np.maximum(_local_max(dist, 3), 60.0)
    alpha[band] = np.clip(dist[band] / ref[band], 0.0, 1.0)
    a3 = alpha[..., None]
    fg = np.where(a3 > 0.02, (rgb - (1 - a3) * bg) / np.maximum(a3, 0.02), 0)
    out = np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def trim(im: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    x0, y0, x1, y1 = im.getchannel('A').getbbox()
    return im.crop((x0, y0, x1, y1)), (x0, y0, x1 - x0, y1 - y0)


def _place(im: Image.Image, w: int, h: int, inner_w: int, inner_h: int) -> Image.Image:
    t, _ = trim(im)
    k = min(inner_w / t.width, inner_h / t.height)
    t = t.resize((max(1, round(t.width * k)), max(1, round(t.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(t, ((w - t.width) // 2, (h - t.height) // 2))
    return out


def fit_square(im: Image.Image, size: int, pad: float = 0.1) -> Image.Image:
    inner = round(size * (1 - 2 * pad))
    return _place(im, size, size, inner, inner)


def fit_long(im: Image.Image, long_side: int, pad: float = 0.04) -> Image.Image:
    t, _ = trim(im)
    m = round(long_side * pad)
    k = (long_side - 2 * m) / max(t.width, t.height)
    ow, oh = round(t.width * k), round(t.height * k)
    return _place(im, ow + 2 * m, oh + 2 * m, ow, oh)


def save_webp(im: Image.Image, path: Path, quality: int = 88, lossless: bool = False) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=quality, lossless=lossless, method=6, exact=False)
    return path.stat().st_size
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/tools/art games/moon-meadow-home/art-src/.gitignore
git commit -m "Add art toolkit image operations"
```

### Task A2: Asset lists

**Files:**
- Create: `art-src/lists/words.txt`, `art-src/lists/notes.txt`, `art-src/lists/tint.txt`, `art-src/lists/items.txt`, `art-src/lists/breeds.txt`, `art-src/lists/backgrounds.txt`, `tools/art/lists.py`
- Test: `tools/art/tests/test_lists.py`

**Interfaces:**
- Consumes: `paths.LISTS`, `paths.is_valid_id`, `paths.is_word_id` (Task A1).
- Produces:
  - `lists.Entry` dataclass: `id: str; kind: str; wave: str; pack: str; size: int; desc: str; tint: str | None; slot: str | None; step: str | None; priority: int` (1 is first)
  - `lists.load_words() -> list[Entry]` (sorted by priority, then step order, then file order)
  - `lists.load_items() -> list[Entry]`
  - `lists.load_breeds() -> list[dict]` with keys `id, wave, horn, change`
  - `lists.load_backgrounds() -> list[Entry]` (kind `bg`)
  - `lists.load_requests() -> list[Entry]` (reads `requests.txt` if present, else `[]`)
  - `lists.KINDS = ('word', 'item', 'station', 'prop', 'outfit', 'pin', 'decor', 'ui', 'egg', 'building', 'bg')`
  - `lists.SLOTS = ('head', 'neck', 'back', 'mane', 'flank')`

- [ ] **Step 1: Write the failing test**

```python
# tools/art/tests/test_lists.py
import re
import unittest

from art import lists, paths

PLURAL_ONES = ['hat', 'pin', 'cup', 'mug', 'ring', 'bell', 'duck', 'boat', 'shell', 'bow', 'bead', 'cape', 'cake',
               'kite', 'bike', 'chair', 'key', 'carrot', 'apple', 'pancake', 'plank', 'brick', 'castle', 'horse',
               'fox', 'box', 'dress', 'glass', 'brush', 'bush', 'peach', 'bench', 'branch', 'sash', 'mouse']
TWINS = [('pan', 'pen'), ('hat', 'hut'), ('cap', 'cup'), ('peg', 'pig'), ('net', 'nut'), ('bed', 'bud'),
         ('boot', 'boat'), ('sheep', 'ship'), ('pie', 'pea'), ('cap', 'cape'), ('cub', 'cube'), ('tap', 'tape'),
         ('pin', 'pine'), ('can', 'cane')]
ANIMALS = ['pig', 'dog', 'cat', 'pup', 'hen', 'cub', 'fox', 'chick', 'fish', 'bee', 'sheep', 'goat', 'toad', 'cow',
           'owl', 'starfish', 'frog', 'crab', 'swan', 'rabbit', 'kitten', 'whale', 'seal', 'bird', 'crow', 'mouse',
           'horse', 'duck']
TINTABLE = {'bow', 'hat', 'cape', 'bead', 'ball', 'cup', 'sock', 'dress', 'shirt', 'kite', 'ribbon', 'scarf', 'coat',
            'bag', 'mug', 'balloon', 'skirt', 'jeans'}
LOADED_STEPS = {'R01', 'R02', 'R03', 'R04', 'R05', 'R07', 'R08', 'R09', 'R10', 'R11', 'R13', 'R14', 'R15', 'R16',
                'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R26', 'R27', 'R30', 'R32', 'R34', 'R36', 'R38',
                'R39', 'R41'}
HEX = re.compile(r'^#[0-9a-f]{6}$')


class WordsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words = lists.load_words()
        cls.ids = [w.id for w in cls.words]

    def test_seed_size_and_unique_ids(self):
        self.assertEqual(len(self.ids), 273)
        self.assertEqual(len(set(self.ids)), 273)
        for i in self.ids:
            self.assertTrue(paths.is_word_id(i), i)

    def test_plural_one_words_present(self):
        for w in PLURAL_ONES:
            self.assertIn(w, self.ids)

    def test_twin_pairs_present(self):
        for a, b in TWINS:
            self.assertIn(a, self.ids)
            self.assertIn(b, self.ids)

    def test_steps_are_loaded_steps(self):
        for w in self.words:
            self.assertIn(w.step, LOADED_STEPS, w.id)

    def test_every_word_has_a_plain_description(self):
        for w in self.words:
            self.assertTrue(w.desc.startswith(('a ', 'an ', 'one ')), w.id)
            self.assertNotRegex(w.desc, r'\d', w.id)

    def test_animals_are_toys(self):
        by_id = {w.id: w for w in self.words}
        for a in ANIMALS:
            self.assertIn('toy', by_id[a].desc, a)

    def test_tintables(self):
        tinted = {w.id: w.tint for w in self.words if w.tint}
        self.assertEqual(set(tinted), TINTABLE)
        for hexv in tinted.values():
            self.assertRegex(hexv, HEX)

    def test_no_body_parts_or_people(self):
        for bad in ['leg', 'ear', 'nose', 'hand', 'foot', 'feet', 'toe', 'chin', 'hair', 'man', 'doll', 'girl']:
            self.assertNotIn(bad, self.ids)

    def test_priority_order(self):
        pr = [w.priority for w in self.words]
        self.assertEqual(pr, sorted(pr))
        self.assertEqual(self.words[0].priority, 1)
        p1 = {w.id for w in self.words if w.priority == 1}
        self.assertTrue(set(PLURAL_ONES) <= p1)


class ItemsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = lists.load_items()

    def test_ids_kinds_waves(self):
        ids = [i.id for i in self.items]
        self.assertEqual(len(ids), len(set(ids)))
        word_ids = {w.id for w in lists.load_words()}
        for i in self.items:
            self.assertTrue(paths.is_valid_id(i.id) and not paths.is_word_id(i.id), i.id)
            self.assertNotIn(i.id, word_ids)
            self.assertIn(i.kind, lists.KINDS)
            self.assertIn(i.wave, ('A', 'B', 'C'))
            self.assertGreaterEqual(i.size, 96)
            if i.tint:
                self.assertRegex(i.tint, HEX)
            if i.kind == 'outfit':
                self.assertIn(i.slot, lists.SLOTS, i.id)

    def test_counts_per_wave(self):
        count = {w: sum(1 for i in self.items if i.wave == w) for w in 'ABC'}
        self.assertEqual(count, {'A': 67, 'B': 91, 'C': 30})

    def test_pin_sets(self):
        pins = [i.id for i in self.items if i.kind == 'pin']
        for s in ('flower', 'sweet', 'sea', 'moon'):
            self.assertEqual(sum(1 for p in pins if p.startswith(f'pin-{s}-')), 10, s)


class BreedsAndBackgroundsTest(unittest.TestCase):
    def test_breeds(self):
        b = lists.load_breeds()
        self.assertEqual([x['id'] for x in b],
                         ['moon', 'nestling', 'pebble', 'cosy', 'bubble', 'berry', 'snow', 'post', 'sparkle'])
        self.assertEqual([x['wave'] for x in b], ['A'] * 5 + ['B'] * 3 + ['C'])
        for x in b:
            self.assertIn(x['horn'], ('gold', 'bronze', 'silver', 'pearl'))

    def test_backgrounds(self):
        bgs = lists.load_backgrounds()
        self.assertEqual(len(bgs), 11)
        self.assertEqual(sum(1 for b in bgs if b.wave == 'A'), 6)
        for b in bgs:
            self.assertTrue(b.id.startswith('bg-'))


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_lists.py' -v`
Expected: FAIL with `cannot import name 'lists'`.

- [ ] **Step 3: Write the lists and the parser**

`art-src/lists/words.txt` (format `STEP | ids separated by spaces`; lines starting `#` are comments):

```
# Seed word pictures per reading step. Ids are the singular word. Animals are always toys.
R01 | tap
R02 | pin pan map mat tin pad
R03 | pot pig dog cot cap cat can top mop pod tag
R04 | duck sock rock sack bed net pen peg cup mug nut sun rug pup
R05 | hat bun bag log lid fan fig hen hut bib cub tub bud bat
R07 | bell ball dress hill muff moss puff
R08 | jam jug web wig box fox well
R09 | zip yam
R10 | chip ship shell ring sink chick dish fish bath path ink
R11 | bin lock
R13 | rain nail pail bee tree sheep seed light night sail chain weed
R14 | boat coat goat soap toast road toad moon spoon boot pool hoop roof broom stool book hook wood wool
R15 | star jar card harp cart scarf fork horn corn cork
R16 | cow owl crown gown towel flower coin foil soil tower
R17 | chair stairs hammer ladder letter butter dinner slipper pepper
R18 | rainbow sunset teapot toolbox starfish popcorn windmill sandpit
R19 | bow bead cape cake kite bike key carrot apple pancake plank brick castle horse glass brush bush peach bench branch sash mouse
R20 | pie pea tile
R21 | nest milk tent belt desk lamp pond mask gift vest bulb mint sand quilt raft
R22 | frog crab drum flag sled plum pram clip clock block twig grass swan
R23 | trunk stamp plant
R26 | train rabbit garden picnic basket button kitten napkin magnet jacket pumpkin muffin ribbon lemon melon pillow teacup sweet sheet blanket balloon
R27 | blanket-fluffy pillow-fluffy hat-fluffy scarf-fluffy coat-fluffy slipper-fluffy
R30 | tray crayon spade whale gate plate vase skate paint
R32 | seal leaf beach cream bean wheel jeans
R34 | tie lime pine tights hive slide
R36 | shirt bird skirt turnip purse fern
R38 | cube tape cane
R39 | home rose globe snow cone rope hose bowl window snowman crow
R41 | jewel stew glue statue screw
```

`art-src/lists/notes.txt` (format `id: description`; every word has a line):

```
tap: a shiny kitchen water tap
pin: a sewing pin with a round pink head
pan: a small cooking pan with a handle
map: a folded paper treasure map
mat: a small striped doormat
tin: a round metal tin with a lid
pad: a small notepad with a spiral top
pot: a terracotta flower pot
pig: a pink plush toy pig
dog: a soft plush toy dog
cot: a small wooden baby cot
cap: a baseball cap
cat: a soft plush toy cat
can: a closed metal can with a plain label
top: a spinning top toy
mop: a mop with a wooden handle
pod: an open green pea pod
tag: a gift tag on a string
duck: a yellow rubber bath duck toy
sock: one striped sock
rock: a grey rock
sack: a cloth sack tied at the top
bed: a small bed with a pillow and a quilt
net: a butterfly net
pen: a pen
peg: a wooden clothes peg
cup: a cup with a handle
mug: a big mug
nut: a hazelnut
sun: a smiling round sun
rug: a round woven rug
pup: a soft plush toy puppy
hat: a round sun hat with a brim
bun: a round bread bun
bag: a shoulder bag
log: a wooden log
lid: a round pot lid with a knob
fan: a folding paper hand fan
fig: a purple fig fruit
hen: a soft plush toy hen
hut: a small wooden hut with a straw roof
bib: a baby bib
cub: a soft plush toy bear cub
tub: a small wooden wash tub
bud: a closed pink flower bud on a stem
bat: a wooden cricket bat
bell: a small golden bell
ball: a round ball
dress: a party dress
hill: a small round green hill
muff: a fluffy hand muff
moss: a clump of green moss
puff: a round powder puff
jam: a jar of strawberry jam
jug: a water jug
web: a round spider web with no spider
wig: a curly wig on a stand
box: a closed cardboard box
fox: an orange plush toy fox
well: a small stone wishing well
zip: a zip
yam: a yam
chip: one golden chip
ship: a big toy ship
shell: a seashell
ring: a gold ring with a pink gem
sink: a small sink with a tap
chick: a yellow plush toy chick
dish: a round shallow dish
fish: a blue toy fish
bath: a bath tub full of bubbles
path: a short winding stone path
ink: an ink pot with a feather pen
bin: a small rubbish bin
lock: a padlock
rain: a grey cloud with rain drops
nail: a metal nail
pail: a metal pail
bee: a striped plush toy bee
tree: a round leafy tree
sheep: a fluffy plush toy sheep
seed: a big sunflower seed
light: a ceiling light glowing yellow
night: a round window showing a night sky with a moon and stars
sail: a white sail on a short mast
chain: a metal chain
weed: a dandelion weed
boat: a small toy sailing boat
coat: a winter coat
goat: a soft plush toy goat
soap: a bar of soap
toast: a slice of toast
road: a short piece of road
toad: a green plush toy toad
moon: a crescent moon
spoon: a spoon
boot: one rain boot
pool: a round paddling pool
hoop: a hula hoop
roof: a small red house roof
broom: a broom
stool: a wooden stool
book: a closed book
hook: a coat hook
wood: a stack of firewood
wool: a ball of wool with knitting needles
star: a five-pointed star
jar: a glass jar of sweets
card: a folded greeting card with a heart
harp: a small golden harp
cart: a wooden hand cart
scarf: a long knitted scarf
fork: a fork
horn: a brass toy horn
corn: a corn cob
cork: a cork
cow: a soft plush toy cow
owl: a soft plush toy owl
crown: a golden crown
gown: a ball gown on a hanger
towel: a folded towel
flower: a flower
coin: a gold coin
foil: a roll of shiny foil
soil: a small sack of soil
tower: a toy block tower
chair: a wooden chair
stairs: a short flight of wooden stairs
hammer: a hammer
ladder: a wooden ladder
letter: a letter in an envelope
butter: a block of butter on a dish
dinner: a plate of dinner with vegetables
slipper: one fluffy slipper
pepper: a red pepper
rainbow: a rainbow
sunset: a round picture of a sunset over hills
teapot: a teapot
toolbox: a toolbox
starfish: an orange plush toy starfish
popcorn: a striped box of popcorn
windmill: a toy windmill
sandpit: a small sandpit with a spade
bow: a ribbon bow
bead: one big round bead
cape: a short cape with a collar
cake: a birthday cake
kite: a diamond kite with a tail
bike: a small bicycle
key: a golden key
carrot: a carrot
apple: a red apple
pancake: a pancake on a plate
plank: one wooden plank
brick: one red brick
castle: a small toy castle
horse: a wooden rocking horse toy
glass: a drinking glass
brush: a soft grooming brush
bush: a round green bush
peach: a peach
bench: a wooden garden bench
branch: a leafy tree branch
sash: a ribbon sash folded in a loop
mouse: a small grey plush toy mouse
pie: a fruit pie
pea: one green pea
tile: a square floor tile with a flower pattern
nest: a bird nest with no bird
milk: a glass bottle of milk
tent: a small camping tent
belt: a belt with a buckle
desk: a small wooden desk
lamp: a table lamp
pond: a small round pond
mask: a party eye mask
gift: a wrapped present with a bow
vest: a knitted vest
bulb: a light bulb
mint: a round mint sweet
sand: a pile of sand
quilt: a patchwork quilt
raft: a small wooden raft
frog: a green plush toy frog
crab: a red plush toy crab
drum: a toy drum with sticks
flag: a flag on a pole
sled: a wooden sled
plum: a plum
pram: a doll's pram
clip: a hair clip
clock: a round alarm clock
block: a wooden toy block
twig: a twig
grass: a tuft of grass
swan: a white plush toy swan
trunk: a treasure trunk
stamp: a postage stamp with a flower picture
plant: a potted plant
train: a wooden toy train
rabbit: a soft plush toy rabbit
garden: a small garden bed with flowers
picnic: a picnic blanket with a basket and food
basket: an empty woven basket
button: a big round button
kitten: a soft plush toy kitten
napkin: a folded napkin
magnet: a horseshoe magnet
jacket: a jacket
pumpkin: a pumpkin
muffin: a muffin
ribbon: a curled ribbon
lemon: a lemon
melon: a slice of watermelon
pillow: a pillow
teacup: a teacup on a saucer
sweet: a wrapped sweet
sheet: a folded bed sheet
blanket: a folded blanket
balloon: a balloon on a string
blanket-fluffy: a very fluffy soft blanket
pillow-fluffy: a very fluffy soft pillow
hat-fluffy: a very fluffy soft winter hat
scarf-fluffy: a very fluffy soft scarf
coat-fluffy: a very fluffy soft coat
slipper-fluffy: one very fluffy soft slipper
tray: a serving tray
crayon: a crayon
spade: a garden spade
whale: a blue plush toy whale
gate: a small wooden garden gate
plate: an empty plate
vase: a vase with flowers
skate: one roller skate
paint: a pot of paint with a brush
seal: a grey plush toy seal
leaf: a green leaf
beach: a little beach with sand and a bucket
cream: a pot of cream
bean: a broad bean
wheel: a wooden wheel
jeans: a pair of jeans
tie: a tie
lime: a lime
pine: a pine tree
tights: a pair of tights
hive: a beehive with no bees
slide: a playground slide
shirt: a shirt with buttons
bird: a soft plush toy bird
skirt: a skirt
turnip: a turnip
purse: a small purse
fern: a fern
cube: a colourful puzzle cube
tape: a roll of sticky tape
cane: a candy cane
home: a small cottage with a door and windows
rose: a rose
globe: a globe on a stand
snow: a pile of snow
cone: a pine cone
rope: a coil of rope
hose: a coiled garden hose
bowl: a bowl
window: a window with curtains
snowman: a snowman with a scarf
crow: a black plush toy crow
jewel: a sparkling jewel
stew: a bowl of stew
glue: a glue bottle
statue: a small garden statue of a star
screw: a screw
```

`art-src/lists/tint.txt` (format `id #hex`; the picture is drawn in light grey and coloured in the browser):

```
bow #ff6fa8
hat #6c8fe0
cape #b07ce0
bead #ff9f43
ball #e8505b
cup #5aa9e6
sock #6cc070
dress #f48fb1
shirt #f9d65c
kite #e8505b
ribbon #ff6fa8
scarf #6cc070
coat #a77bd6
bag #a8754f
mug #5aa9e6
balloon #e8505b
skirt #a77bd6
jeans #5a7fc0
```

`art-src/lists/items.txt` (format `id | kind | wave | pack | size | tint | slot | description`; `-` means none; size is the long side in pixels):

```
# Wave A
station-hay-rack | station | A | meadow | 480 | - | - | a small wooden hay rack on legs, filled with golden hay
station-brush-stand | station | A | meadow | 480 | - | - | a little wooden stand holding three soft grooming brushes
station-hat-box | station | A | meadow | 480 | - | - | a round striped hat box with its lid slightly open
station-nap-cushion | station | A | meadow | 480 | - | - | a big round soft cushion with a folded blanket on it
station-swing | station | A | meadow | 480 | - | - | a wooden swing seat hanging from a small wooden frame with ropes
item-nest | item | A | meadow | 640 | - | - | a big round cosy nest of twigs lined with soft moss
egg-moon | egg | A | core | 512 | - | - | a pale lilac egg with tiny silver crescent moons
egg-nestling | egg | A | core | 512 | - | - | a cream egg with a soft twig pattern
egg-pebble | egg | A | core | 512 | - | - | a pale grey-blue egg with smooth pebble spots
egg-cosy | egg | A | core | 512 | - | - | a peach egg with a knitted blanket pattern
egg-berry | egg | A | core | 512 | - | - | a pink egg with little red berry dots
egg-snow | egg | A | core | 512 | - | - | a white and pale blue egg with snowflakes
egg-bubble | egg | A | core | 512 | - | - | a pale aqua egg with bubble circles
egg-post | egg | A | core | 512 | - | - | a pale yellow egg with a tiny envelope pattern
egg-sparkle | egg | A | core | 512 | - | - | a lilac egg with gold sparkles
egg-golden | egg | A | core | 512 | - | - | a shining golden egg
egg-speckled | egg | A | core | 512 | - | - | a cream egg with soft brown speckles
egg-shell-top | egg | A | core | 512 | - | - | the top half of a cracked open pale egg shell, jagged edge at the bottom
egg-shell-bottom | egg | A | core | 512 | - | - | the bottom half of a cracked open pale egg shell, jagged edge at the top
item-moon-cup | item | A | core | 256 | - | - | a small round pale cup glowing with warm moonlight
item-berry-bowl | item | A | core | 320 | - | - | a small empty wooden bowl
item-berry | item | A | core | 160 | - | - | one round pink moonberry with a tiny leaf
item-name-bell | item | A | core | 320 | - | - | a small golden bell with a ribbon loop at the top
item-gold-bell | item | A | core | 400 | - | - | a large shiny golden bell with a star on it
item-name-tree | item | A | core | 640 | - | - | a small round tree with little golden bells hanging from its branches
item-name-tag | item | A | core | 400 | - | - | a blank rounded wooden name tag with a little ribbon
item-wish-basket | item | A | meadow | 640 | - | - | a big empty woven picnic basket with a handle
item-toy-shelf | item | A | meadow | 800 | - | - | a wide empty wooden toy shelf with two shelves
item-jar | item | A | meadow | 320 | - | - | an empty clear glass jar with a cork lid
item-jar-label | item | A | meadow | 320 | - | - | a blank cream paper label with a scalloped edge
item-mice-jar | item | A | meadow | 320 | - | - | a clear glass jar holding five small grey plush toy mice
item-crown-emma | item | A | core | 256 | - | - | a small golden princess crown with a pink gem
item-camp-tent | item | A | stables | 480 | - | - | a small cosy striped tent with the door flaps closed
item-camp-tent-open | item | A | stables | 480 | - | - | a small cosy striped tent with the door flaps open, dark inside
item-lantern | item | A | stables | 256 | - | - | a small unlit hanging lantern
item-lantern-lit | item | A | stables | 256 | - | - | a small hanging lantern glowing warm yellow
item-plaque | item | A | stables | 256 | - | - | a blank small brass door plaque
item-flower-box | item | A | stables | 320 | - | - | a wooden window flower box with pink flowers
item-stall-door | item | A | stables | 400 | #b98ad8 | - | a rounded wooden stable door, closed, with a top and a bottom half
item-stall-door-open | item | A | stables | 400 | #b98ad8 | - | a rounded wooden stable door frame with only the top half open, dark inside
building-stall-row | building | A | stables | 1400 | - | - | a long low stable building front with ten empty arched doorways in two rows of five, no doors in them
outfit-nightcap | outfit | A | stables | 320 | - | head | a soft striped nightcap with a pom-pom
outfit-hardhat | outfit | A | building | 320 | - | head | a small yellow builder's hard hat
item-wheelbarrow | item | A | building | 480 | - | - | a small wooden wheelbarrow
item-scissors | item | A | building | 320 | - | - | a pair of big round-tipped golden scissors
item-sign-board | item | A | building | 640 | - | - | a blank wooden sign board on two posts
item-trim-tile | item | A | building | 160 | #f2a6c7 | - | one square decorative tile with a flower shape
item-plot | item | A | meadow | 640 | - | - | an empty square plot of soft earth with a small blank picture sign on a post
item-plot-stone | item | A | meadow | 256 | #ffd86b | - | a round flat glowing stepping stone
building-bath-pond | building | A | meadow | 1024 | - | - | a small round bath pond with blue water, a little slide and stones around it
building-stable-gate | building | A | meadow | 640 | - | - | a small arched wooden gate with a lantern
item-moonbeam-bridge | item | A | core | 1024 | - | - | a soft glowing arched bridge made of pale moonlight
pin-founder-star | pin | A | core | 160 | - | - | a golden star pin badge
item-blanket-cover | item | A | core | 512 | - | - | a small knitted blanket folded into a dome shape
ui-icon-envelope | ui | A | core | 192 | - | - | a small sealed envelope with a heart seal
ui-icon-hammer | ui | A | core | 192 | - | - | a small wooden hammer
ui-icon-jewel | ui | A | core | 192 | - | - | a sparkling pink jewel
ui-icon-jar | ui | A | core | 192 | - | - | a small jar with a blank label
ui-icon-moon | ui | A | core | 192 | - | - | a smiling sleepy crescent moon
ui-stone | ui | A | core | 256 | #cfd6e6 | - | one smooth round flat river stone, plain
ui-gem | ui | A | core | 256 | #ff8fc4 | - | a round faceted gem button seen from the front, plain
ui-gem-crescent | ui | A | core | 256 | #ffd36b | - | a crescent moon shaped faceted gem, plain
ui-star | ui | A | core | 128 | - | - | a small glowing five-pointed star
ui-sparkle | ui | A | core | 128 | - | - | a four-pointed white and gold sparkle
decor-moonflower | decor | A | meadow | 192 | - | - | a single small glowing pale blue moonflower with a short stem and two leaves
decor-moonflower-patch-3 | decor | A | meadow | 320 | - | - | a small patch of three glowing pale blue moonflowers
decor-moonflower-patch-7 | decor | A | meadow | 480 | - | - | a patch of seven glowing pale blue moonflowers
# Wave B
ui-stone-snow | ui | B | core | 256 | - | - | a smooth flat pale blue stone with a frosty snowflake pattern
building-post-box | building | B | post | 1024 | - | - | a little post office stand with a round red post box and a pin board
item-envelope | item | B | post | 320 | - | - | a closed cream envelope with a heart seal
item-envelope-open | item | B | post | 320 | - | - | an open cream envelope, empty
item-parcel | item | B | post | 400 | - | - | a parcel box tied with string, open at the top, empty
item-pin-pot | item | B | post | 400 | - | - | a round pot full of little golden star pins
item-sash | item | B | post | 800 | #f48fb1 | - | a wide ribbon sash laid flat in a gentle curve
item-note-paper | item | B | post | 640 | - | - | a blank sheet of cream note paper with a scalloped edge
pin-star | pin | B | post | 160 | - | - | a plain golden star pin badge with a small shine
pin-flower-1 | pin | B | post | 160 | - | - | a daisy pin badge
pin-flower-2 | pin | B | post | 160 | - | - | a rose pin badge
pin-flower-3 | pin | B | post | 160 | - | - | a tulip pin badge
pin-flower-4 | pin | B | post | 160 | - | - | a sunflower pin badge
pin-flower-5 | pin | B | post | 160 | - | - | a bluebell pin badge
pin-flower-6 | pin | B | post | 160 | - | - | a poppy pin badge
pin-flower-7 | pin | B | post | 160 | - | - | a lily pin badge
pin-flower-8 | pin | B | post | 160 | - | - | a lavender sprig pin badge
pin-flower-9 | pin | B | post | 160 | - | - | a four-leaf clover pin badge
pin-flower-10 | pin | B | post | 160 | - | - | a cherry blossom pin badge
pin-sweet-1 | pin | B | post | 160 | - | - | a round lollipop pin badge
pin-sweet-2 | pin | B | post | 160 | - | - | a cupcake pin badge
pin-sweet-3 | pin | B | post | 160 | - | - | a cookie pin badge
pin-sweet-4 | pin | B | post | 160 | - | - | a wrapped sweet pin badge
pin-sweet-5 | pin | B | post | 160 | - | - | an ice lolly pin badge
pin-sweet-6 | pin | B | post | 160 | - | - | a jelly pin badge
pin-sweet-7 | pin | B | post | 160 | - | - | a doughnut pin badge
pin-sweet-8 | pin | B | post | 160 | - | - | a candy cane pin badge
pin-sweet-9 | pin | B | post | 160 | - | - | a macaron pin badge
pin-sweet-10 | pin | B | post | 160 | - | - | a strawberry pin badge
pin-sea-1 | pin | B | post | 160 | - | - | a seashell pin badge
pin-sea-2 | pin | B | post | 160 | - | - | a starfish pin badge
pin-sea-3 | pin | B | post | 160 | - | - | a pearl pin badge
pin-sea-4 | pin | B | post | 160 | - | - | a coral pin badge
pin-sea-5 | pin | B | post | 160 | - | - | an anchor pin badge
pin-sea-6 | pin | B | post | 160 | - | - | a sailing boat pin badge
pin-sea-7 | pin | B | post | 160 | - | - | a wave pin badge
pin-sea-8 | pin | B | post | 160 | - | - | a sandcastle pin badge
pin-sea-9 | pin | B | post | 160 | - | - | a bucket and spade pin badge
pin-sea-10 | pin | B | post | 160 | - | - | a beach ball pin badge
pin-moon-1 | pin | B | post | 160 | - | - | a crescent moon pin badge
pin-moon-2 | pin | B | post | 160 | - | - | a full moon pin badge
pin-moon-3 | pin | B | post | 160 | - | - | a twinkling star pin badge
pin-moon-4 | pin | B | post | 160 | - | - | a comet pin badge
pin-moon-5 | pin | B | post | 160 | - | - | a ringed planet pin badge
pin-moon-6 | pin | B | post | 160 | - | - | a fluffy cloud pin badge
pin-moon-7 | pin | B | post | 160 | - | - | a rainbow pin badge
pin-moon-8 | pin | B | post | 160 | - | - | a sun pin badge
pin-moon-9 | pin | B | post | 160 | - | - | a shooting star pin badge
pin-moon-10 | pin | B | post | 160 | - | - | a little lantern pin badge
pin-first-bath | pin | B | post | 160 | - | - | a pin badge with a rubber duck in bubbles
pin-tenth-baby | pin | B | post | 160 | - | - | a pin badge with a golden horseshoe
pin-first-building | pin | B | post | 160 | - | - | a pin badge with a tiny house
pin-moving-day | pin | B | post | 160 | - | - | a pin badge with a moonbeam bridge
outfit-crown-gold | outfit | B | dressing | 320 | - | head | a small golden crown
outfit-crown-silver | outfit | B | dressing | 320 | - | head | a small silver crown with blue gems
outfit-crown-flower | outfit | B | dressing | 320 | - | head | a crown of small flowers
outfit-tiara | outfit | B | dressing | 320 | - | head | a sparkling tiara
outfit-hat-party | outfit | B | dressing | 320 | - | head | a striped party hat with a pom-pom
outfit-hat-sun | outfit | B | dressing | 320 | - | head | a straw sun hat with a ribbon
outfit-hat-top | outfit | B | dressing | 320 | - | head | a small top hat with a flower
outfit-cape | outfit | B | dressing | 480 | #b07ce0 | back | a short flowing cape seen from the side
outfit-cape-star | outfit | B | dressing | 480 | #5b7fd6 | back | a short flowing cape with little stars, seen from the side
outfit-garland-daisy | outfit | B | dressing | 400 | - | neck | a round garland of daisies
outfit-garland-rose | outfit | B | dressing | 400 | - | neck | a round garland of pink roses
outfit-garland-leaf | outfit | B | dressing | 400 | - | neck | a round garland of green leaves and berries
outfit-bow | outfit | B | dressing | 256 | #ff6fa8 | mane | a ribbon bow for a mane
outfit-necklace-pearl | outfit | B | dressing | 400 | - | neck | a pearl necklace in a loop
item-jewel-box | item | B | core | 480 | - | - | a small jewel box with the lid open, lined with velvet
item-jewel-letter | item | B | core | 256 | #ff8fc4 | - | a large faceted gem, plain, seen from the front
item-jewel-number | item | B | core | 256 | - | - | a round glowing moonstone, plain
decor-fountain | decor | B | meadow | 640 | - | - | a small stone fountain with water
decor-lantern-arch | decor | B | meadow | 640 | - | - | an arch hung with little lanterns
decor-flower-bridge | decor | B | meadow | 640 | - | - | a small wooden bridge covered in flowers
decor-star-bench | decor | B | meadow | 640 | - | - | a garden bench with a star carved in its back
decor-rainbow-arch | decor | B | meadow | 640 | - | - | a small arch painted like a rainbow
decor-moon-gate | decor | B | meadow | 640 | - | - | a round garden gate shaped like a crescent moon
decor-crystal-tree | decor | B | meadow | 640 | - | - | a small tree with sparkling crystal leaves
decor-bell-arch | decor | B | meadow | 640 | - | - | an arch with three little bells
decor-flower-clock | decor | B | meadow | 640 | - | - | a round flower bed shaped like a clock face with no numbers
decor-wishing-well | decor | B | meadow | 640 | - | - | a wishing well with a little roof and flowers
decor-swing-seat | decor | B | meadow | 640 | - | - | a garden swing seat with cushions
decor-sundial | decor | B | meadow | 640 | - | - | a stone sundial with no numbers
decor-mushroom-ring | decor | B | meadow | 640 | - | - | a ring of red spotted toadstools
item-home-book | item | B | home | 480 | - | - | a big closed storybook with a gold unicorn horn on the cover
ui-tab-herd | ui | B | home | 192 | - | - | a tiny unicorn horseshoe
ui-tab-pins | ui | B | home | 192 | - | - | a golden star pin
ui-tab-breeds | ui | B | home | 192 | - | - | a small egg with a star
ui-tab-album | ui | B | home | 192 | - | - | a small photo with a heart
ui-tab-home | ui | B | home | 192 | - | - | a tiny house with a heart
ui-tab-sky | ui | B | home | 192 | - | - | a crescent moon with two stars
item-photo-frame | item | B | home | 480 | - | - | an empty golden photo frame
# Wave C
building-salon | building | C | salon | 1024 | - | - | a pretty little hair salon with a striped awning
item-salon-brush | item | C | salon | 320 | - | - | a round hairbrush
item-sparkle-mist | item | C | salon | 320 | - | - | a spray bottle of sparkle mist
item-mirror | item | C | salon | 480 | - | - | a hand mirror with a golden frame
item-comb | item | C | salon | 320 | - | - | a wide comb
item-hair-clip | item | C | salon | 256 | - | - | a hair clip with a star
item-camera | item | C | salon | 320 | - | - | a toy camera
building-icon-bath-pond | building | C | valley | 320 | - | - | a tiny round pond with a slide, seen from above at an angle
building-icon-post-box | building | C | valley | 320 | - | - | a tiny post box stand, seen from above at an angle
building-icon-letter-lane | building | C | valley | 320 | - | - | a tiny row of stone arches, seen from above at an angle
building-icon-salon | building | C | valley | 320 | - | - | a tiny salon with a striped awning, seen from above at an angle
building-icon-stables | building | C | valley | 320 | - | - | a tiny stable building, seen from above at an angle
building-icon-castle | building | C | valley | 320 | - | - | a tiny old castle on a hill, seen from above at an angle
ui-map-scroll | ui | C | valley | 192 | - | - | a rolled map scroll with a ribbon
ui-mist | ui | C | valley | 640 | - | - | a soft white cloud of mist with fuzzy edges
item-letter-arch | item | C | letters | 480 | - | - | a stone arch with a blank round panel at the top
item-title-ribbon | item | C | core | 256 | #f6c445 | - | a rosette ribbon with two tails
item-herd-banner | item | C | meadow | 640 | - | - | a royal banner on a pole with a unicorn horn on it
item-hundred-flag | item | C | meadow | 480 | - | - | a big festive flag on a tall pole
outfit-come-along | outfit | C | core | 256 | #ff9f43 | neck | a ribbon tied around the neck with a small bow
prop-basket-packed | prop | C | meadow | 400 | - | - | a picnic basket with the lid closed and full
prop-basket-open | prop | C | meadow | 400 | - | - | a picnic basket with the lid open and food beside it
prop-bow-tied | prop | C | meadow | 256 | - | - | a neatly tied ribbon bow
prop-bow-loose | prop | C | meadow | 256 | - | - | an untied ribbon lying loose
prop-gate-locked | prop | C | meadow | 480 | - | - | a small wooden gate with a closed padlock
prop-gate-open | prop | C | meadow | 480 | - | - | a small wooden gate standing open with an open padlock
prop-bag-zipped | prop | C | meadow | 320 | - | - | a small bag with the zip closed
prop-bag-unzipped | prop | C | meadow | 320 | - | - | a small bag with the zip open
prop-box-packed | prop | C | meadow | 400 | - | - | a cardboard box with toys packed inside, flaps folded
prop-box-unpacked | prop | C | meadow | 400 | - | - | an empty open cardboard box with toys next to it
```

`art-src/lists/breeds.txt` (format `id | wave | horn | change`):

```
moon | A | gold | none, this is the reference baby itself
nestling | A | bronze | a short fluffy tufted mane and tail like soft feathers, and small cream feather tufts on the chest and above each hoof
pebble | A | silver | a smooth straight mane cut in a neat bob and a short straight tail, and round cream pebble-shaped spots on the back and rump
cosy | A | pearl | a thick wavy mane in two soft braids and a bushy tail, and a cream patch on the back shaped like a little blanket with a stitched edge
bubble | A | pearl | round puffy bubble-like tufts of mane and tail, and small cream circle spots like bubbles on the body
berry | B | gold | bouncy ringlet curls in the mane and tail, and small cream heart-shaped spots on the rump
snow | B | silver | a long straight flowing mane and tail, cream snowflake marks on the rump and cream socks on all four legs
post | B | bronze | a neat single braid in the mane and a braided tail, a cream star blaze on the forehead and cream socks on the front legs
sparkle | C | gold | a long sweeping mane and tail with extra curls at the ends, and tiny cream star sparkles scattered over the coat
```

`art-src/lists/backgrounds.txt` (format `id | wave | pack | description`):

```
bg-meadow | A | meadow | a wide sunny meadow at the foot of a soft green hill, a few flowers along the edges, little wooden stable roofs far away on the left, a pale blue sky with a pale daytime moon. The lower two thirds is open soft grass with nothing on it
bg-nest | A | core | a cosy night-time corner of the meadow under a deep blue and violet sky with stars and a big glowing moon, warm lantern light on soft grass. The centre is an open grassy area with nothing on it
bg-stable-yard | A | stables | a sunny stable yard with a cobbled path and soft grass, flower pots and a water trough at the far edges. The middle is open and empty
bg-building-yard | A | building | a sunny building site in a meadow, a flat cleared plot of soft earth in the centre, tidy stacks of planks and bricks at the far edges
bg-bath-pond | A | bath | a close view of a big round bath pond with clear blue water and stepping stones, reeds and flowers around it, a little wooden slide at one side. The water in the centre is open
bg-sky | A | core | a calm deep blue and violet night sky over a dark meadow horizon, a big glowing crescent moon in the upper right. The rest of the sky is open for stars
bg-post-box | B | post | a sunny corner of the stable yard with a little post office stand and a pin board at the left. Open ground in the middle
bg-dressing-corner | B | dressing | a pretty open gazebo dressing corner with a tall mirror, hooks and a small wardrobe at the sides. Open floor in the centre
bg-salon | C | salon | a bright cosy hair salon for unicorns with a big mirror on the left and shelves of brushes and bows. Open floor in the centre
bg-valley-map | C | valley | a painted map of a small valley seen from above at an angle: a meadow at the bottom, a stable yard, a village lane, a hill with an old castle, and sky at the top, soft paths between them and empty plots of grass
bg-letter-lane | C | letters | a little lane in the stable yard with a path and soft grass. The lane centre is open
```

`tools/art/lists.py`:

```python
import json
from dataclasses import dataclass, field
from pathlib import Path

from . import paths

KINDS = ('word', 'item', 'station', 'prop', 'outfit', 'pin', 'decor', 'ui', 'egg', 'building', 'bg')
SLOTS = ('head', 'neck', 'back', 'mane', 'flank')
TWIN_IDS = {'pan', 'pen', 'hat', 'hut', 'cap', 'cup', 'peg', 'pig', 'net', 'nut', 'bed', 'bud', 'boot', 'boat',
            'sheep', 'ship', 'pie', 'pea', 'cape', 'cub', 'cube', 'tap', 'tape', 'pin', 'pine', 'can', 'cane'}
PLURAL_IDS = {'hat', 'pin', 'cup', 'mug', 'ring', 'bell', 'duck', 'boat', 'shell', 'bow', 'bead', 'cape', 'cake',
              'kite', 'bike', 'chair', 'key', 'carrot', 'apple', 'pancake', 'plank', 'brick', 'castle', 'horse',
              'fox', 'box', 'dress', 'glass', 'brush', 'bush', 'peach', 'bench', 'branch', 'sash', 'mouse'}


@dataclass
class Entry:
    id: str
    kind: str
    wave: str
    pack: str
    size: int
    desc: str
    tint: str | None = None
    slot: str | None = None
    step: str | None = None
    priority: int = 2


def _lines(name: str, root: Path | None = None) -> list[str]:
    p = (root or paths.LISTS) / name
    if not p.exists():
        return []
    return [ln.strip() for ln in p.read_text().splitlines() if ln.strip() and not ln.startswith('#')]


def _step_no(step: str) -> int:
    return int(step[1:3])


def load_words(root: Path | None = None) -> list[Entry]:
    notes = dict(ln.split(': ', 1) for ln in _lines('notes.txt', root))
    tints = dict(ln.split() for ln in _lines('tint.txt', root))
    out: list[Entry] = []
    for ln in _lines('words.txt', root):
        step, ids = [s.strip() for s in ln.split('|')]
        for wid in ids.split():
            if not paths.is_word_id(wid):
                raise ValueError(f'bad word id {wid}')
            if wid not in notes:
                raise ValueError(f'no note for {wid}')
            n = _step_no(step)
            first = step == 'R19' or wid in PLURAL_IDS or wid in TWIN_IDS or wid in tints
            pr = 1 if first else (2 if 13 <= n <= 30 else 3)
            out.append(Entry(wid, 'word', 'A', 'words', 320, notes[wid], tints.get(wid), None, step, pr))
    order = {e.id: i for i, e in enumerate(out)}
    return sorted(out, key=lambda e: (e.priority, _step_no(e.step), order[e.id]))


def load_items(root: Path | None = None) -> list[Entry]:
    out = []
    for ln in _lines('items.txt', root):
        iid, kind, wave, pack, size, tint, slot, desc = [s.strip() for s in ln.split('|')]
        out.append(Entry(iid, kind, wave, pack, int(size), desc, None if tint == '-' else tint,
                         None if slot == '-' else slot))
    return out


def load_breeds(root: Path | None = None) -> list[dict]:
    out = []
    for ln in _lines('breeds.txt', root):
        bid, wave, horn, change = [s.strip() for s in ln.split('|')]
        out.append({'id': bid, 'wave': wave, 'horn': horn, 'change': change})
    return out


def load_backgrounds(root: Path | None = None) -> list[Entry]:
    out = []
    for ln in _lines('backgrounds.txt', root):
        bid, wave, pack, desc = [s.strip() for s in ln.split('|')]
        out.append(Entry(bid, 'bg', wave, pack, 1770, desc))
    return out


def load_requests(root: Path | None = None) -> list[Entry]:
    out = []
    for ln in _lines('requests.txt', root):
        wid, step, desc = [s.strip() for s in ln.split('|')]
        out.append(Entry(wid, 'word', 'B', 'words', 320, desc, None, None, step, 2))
    return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_lists.py' -v`
Expected: PASS, 15 tests. If the item counts differ, fix the list, not the test: the counts are A 67, B 91, C 30.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/art-src/lists games/moon-meadow-home/tools/art/lists.py games/moon-meadow-home/tools/art/tests/test_lists.py
git commit -m "Add the art asset lists for words, items, breeds and backgrounds"
```

### Task A3: Codex runner, prompts and calibration

**Files:**
- Create: `tools/art/prompts.py`, `tools/art/codex_gen.py`, `art-src/lists/calibration.json`
- Test: `tools/art/tests/test_prompts.py`, `tools/art/tests/test_codex_gen.py`

**Interfaces:**
- Consumes: `paths.WORK`, `paths.JOBS`, `paths.STYLE_REF`, `lists.Entry` (Tasks A1, A2).
- Produces:
  - `prompts.sheet_prompt(descs: list[str], cols: int, rows: int, stem: str, grey: bool = False) -> str`
  - `prompts.breed_prompt(change: str, stem: str) -> str`
  - `prompts.foal_prompt(stem: str) -> str`
  - `prompts.background_prompt(desc: str, stem: str) -> str`
  - `prompts.lumi_prompt(stem: str) -> str`, `prompts.lumi_mouth_prompt(stem: str) -> str`
  - `codex_gen.Job(id: str, prompt: str, refs: list[Path], out: Path)`
  - `codex_gen.JobResult(id: str, ok: bool, out: Path | None, attempts: int, seconds: float, error: str = '')`
  - `codex_gen.build_command(job: Job, codex_bin: str = 'codex') -> list[str]`
  - `codex_gen.extract_generated_path(stdout: str) -> Path | None`
  - `codex_gen.run_jobs(jobs: list[Job], *, parallel: int = 4, retries: int = 2, timeout: int = 900, codex_bin: str = 'codex', work_dir: Path = paths.WORK, ledger: Path | None = None) -> list[JobResult]`
  - `calibration.json`: `{"cols": int, "rows": int, "sheet_px": [int, int], "background_px": [int, int], "seconds_per_sheet": float, "measured": "YYYY-MM-DD"}`

- [ ] **Step 1: Write the failing tests**

```python
# tools/art/tests/test_prompts.py
import unittest

from art import prompts


class PromptsTest(unittest.TestCase):
    def test_sheet_prompt_lists_objects_in_reading_order(self):
        p = prompts.sheet_prompt(['a red apple', 'a carrot', 'a toy fox'], 2, 2, 'words-a-01')
        self.assertIn('2 columns and 2 rows', p)
        self.assertLess(p.index('1. a red apple'), p.index('2. a carrot'))
        self.assertIn('3. a toy fox', p)
        self.assertIn('plain white background', p)
        self.assertIn('No text', p)
        self.assertIn('plush toys', p)
        self.assertTrue(p.rstrip().endswith('Save it as words-a-01.png in the current working directory.'))
        self.assertNotIn('light grey only', p)

    def test_grey_sheet_asks_for_grey(self):
        p = prompts.sheet_prompt(['a bow'], 1, 1, 'tint-01', grey=True)
        self.assertIn('light grey only', p)

    def test_breed_prompt_keeps_colours_and_pose(self):
        p = prompts.breed_prompt('a short fluffy mane', 'nestling-baby')
        for s in ('same style, pose, size, camera angle', 'lilac body', 'pink mane', 'mint green streaks',
                  'gold horn and hooves', 'a short fluffy mane', 'Save it as nestling-baby.png'):
            self.assertIn(s, p)

    def test_background_prompt_has_no_characters(self):
        p = prompts.background_prompt('a meadow', 'bg-meadow')
        self.assertIn('No characters, no unicorns, no people', p)
        self.assertIn('landscape', p)


if __name__ == '__main__':
    unittest.main()
```

```python
# tools/art/tests/test_codex_gen.py
import json
import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from art import codex_gen

STUB = r'''#!/usr/bin/env python3
import os, re, sys
from pathlib import Path
from PIL import Image
args = sys.argv[1:]
assert args[:4] == ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write'], args
prompt = args[4]
refs = args[6:] if len(args) > 5 and args[5] == '-i' else []
for r in refs:
    assert Path(r).exists(), r
stem = re.search(r'Save it as (\S+)\.png', prompt).group(1)
d = Path(os.environ['STUB_DIR'])
marker = d / (stem + '.tried')
if os.environ.get('STUB_FAIL_FIRST') and not marker.exists():
    marker.write_text('x')
    sys.exit(1)
img = Image.new('RGB', (64, 64), (200, 100, 50))
if os.environ.get('STUB_ELSEWHERE'):
    p = d / 'generated_images' / 'sess' / (stem + '-ig.png')
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p)
    print(f'Saved image to {p}')
else:
    img.save(stem + '.png')
'''


class CodexGenTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.bin = self.d / 'codex-stub'
        self.bin.write_text(STUB)
        self.bin.chmod(self.bin.stat().st_mode | stat.S_IEXEC)
        self.ref = self.d / 'style-reference.png'
        Image.new('RGB', (8, 8)).save(self.ref)
        self.env = mock.patch.dict(os.environ, {'STUB_DIR': str(self.d)})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def job(self, i):
        return codex_gen.Job(f'j{i}', f'Draw. Save it as j{i}.png in the current working directory.', [self.ref],
                             self.d / 'out' / f'j{i}.png')

    def run_jobs(self, jobs, **kw):
        return codex_gen.run_jobs(jobs, codex_bin=str(self.bin), work_dir=self.d / 'work',
                                  ledger=self.d / 'ledger.jsonl', **kw)

    def test_command_puts_prompt_before_images(self):
        cmd = codex_gen.build_command(self.job(1), 'codex')
        self.assertEqual(cmd[:5], ['codex', 'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write'])
        self.assertTrue(cmd[5].startswith('Draw.'))
        self.assertEqual(cmd[6:], ['-i', 'style-reference.png'])

    def test_runs_jobs_in_parallel_and_writes_outputs(self):
        res = self.run_jobs([self.job(i) for i in range(3)], parallel=2)
        self.assertTrue(all(r.ok for r in res))
        for i in range(3):
            self.assertEqual(Image.open(self.d / 'out' / f'j{i}.png').size, (64, 64))

    def test_retries_after_failure(self):
        with mock.patch.dict(os.environ, {'STUB_FAIL_FIRST': '1'}):
            (r,) = self.run_jobs([self.job(1)], retries=2)
        self.assertTrue(r.ok)
        self.assertEqual(r.attempts, 2)

    def test_picks_up_image_saved_elsewhere(self):
        with mock.patch.dict(os.environ, {'STUB_ELSEWHERE': '1'}):
            (r,) = self.run_jobs([self.job(2)])
        self.assertTrue(r.ok)
        self.assertTrue((self.d / 'out' / 'j2.png').exists())

    def test_skips_jobs_with_existing_output(self):
        out = self.d / 'out' / 'j3.png'
        out.parent.mkdir(parents=True)
        Image.new('RGB', (8, 8)).save(out)
        (r,) = self.run_jobs([self.job(3)])
        self.assertTrue(r.ok)
        self.assertEqual(r.attempts, 0)

    def test_writes_ledger(self):
        self.run_jobs([self.job(4)])
        rows = [json.loads(x) for x in (self.d / 'ledger.jsonl').read_text().splitlines()]
        self.assertEqual(rows[-1]['id'], 'j4')
        self.assertTrue(rows[-1]['ok'])

    def test_extract_generated_path(self):
        p = codex_gen.extract_generated_path('done\nSaved image to /Users/x/.codex/generated_images/a/b.png\n')
        self.assertEqual(p, Path('/Users/x/.codex/generated_images/a/b.png'))
        self.assertIsNone(codex_gen.extract_generated_path('nothing here'))


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_[pc]*.py' -v`
Expected: FAIL with `cannot import name 'prompts'` and `cannot import name 'codex_gen'`.

- [ ] **Step 3: Write the implementation**

`tools/art/prompts.py`:

```python
STYLE = ('in exactly the style of the attached picture: clean shapes, smooth soft shading, a warm outline in a '
         'darker shade of each fill, light from the top left, no paint, gouache, watercolour or brush texture')
SAVE = 'Save it as {stem}.png in the current working directory.'


def sheet_prompt(descs: list[str], cols: int, rows: int, stem: str, grey: bool = False) -> str:
    items = '\n'.join(f'{i + 1}. {d}' for i, d in enumerate(descs))
    grey_line = (' Draw every object in plain light grey only, with no other colour, the same soft shading and a '
                 'darker grey outline, so it can be coloured later.') if grey else ''
    return (f'Use your image generation tool to draw one square picture: a sheet of {len(descs)} separate objects '
            f'arranged in a grid of {cols} columns and {rows} rows on a plain white background, {STYLE}. Each object '
            'is drawn alone and whole, centred in its own grid cell, filling about 70 percent of the cell, with wide '
            'empty white gutters between the cells. Objects never touch or overlap each other or the picture edge. '
            'No text, letters, numbers, labels, grid lines, frames, ground shadows or people. Animals are always soft '
            f'plush toys. Leave unused cells empty.{grey_line} Reading order is left to right, top to bottom:\n'
            f'{items}\n' + SAVE.format(stem=stem))


def breed_prompt(change: str, stem: str) -> str:
    return ('Use your image generation tool to redraw the attached baby unicorn as a new breed, in exactly the '
            'same style, pose, size, camera angle and position on the canvas. Keep exactly these colours: lilac body, '
            'pink mane and tail with mint green streaks, gold horn and hooves, cream markings, the same eyes and rosy '
            f'cheeks. Change only this: {change}. The whole body is visible with white space around it, all four '
            'hooves on one level, the tail clear of the body. Plain white background, no ground shadow, no text. '
            + SAVE.format(stem=stem))


def foal_prompt(stem: str) -> str:
    return ('Use your image generation tool to draw the attached baby unicorn one stage older, as a foal: the same '
            'breed, the same colours and markings, the same style, facing the same way, with slightly longer legs and '
            'neck, a slightly longer mane and tail and a slightly smaller head for its body, still young, round and '
            'cute. The whole body is visible with white space around it, all four hooves on one level, the tail '
            'clear of the body. Plain white background, no ground shadow, no text. ' + SAVE.format(stem=stem))


def background_prompt(desc: str, stem: str) -> str:
    return (f'Use your image generation tool to draw a wide landscape picture in a 3:2 shape, as large as you can, '
            f'{STYLE}. The scene: {desc}. Keep a large calm open area free of objects for characters and word '
            'panels. No characters, no unicorns, no people, no animals, no text. ' + SAVE.format(stem=stem))


def lumi_prompt(stem: str) -> str:
    return ('Use your image generation tool to draw Queen Lumi, a kind grown-up unicorn queen, as a head and '
            f'neck portrait looking at the viewer, {STYLE}. She is white with a soft lilac glow, a long silver-blue '
            'mane, a golden horn and a small golden crown behind the horn, gentle eyes and a closed smiling mouth. '
            'She is framed inside a glowing pale yellow crescent moon. Plain white background, no text. '
            + SAVE.format(stem=stem))


def lumi_mouth_prompt(stem: str) -> str:
    return ('Use your image generation tool to redraw the attached picture exactly the same, with every line, '
            'colour and position unchanged, except that her mouth is open a little as if she is talking. '
            + SAVE.format(stem=stem))
```

`tools/art/codex_gen.py`:

```python
import json
import re
import shutil
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

from . import paths

_ledger_lock = threading.Lock()
_GEN_RE = re.compile(r'(/[^\s\'"]*generated_images/[^\s\'"]+\.png)')


@dataclass
class Job:
    id: str
    prompt: str
    refs: list[Path]
    out: Path


@dataclass
class JobResult:
    id: str
    ok: bool
    out: Path | None
    attempts: int
    seconds: float
    error: str = ''


def build_command(job: Job, codex_bin: str = 'codex') -> list[str]:
    cmd = [codex_bin, 'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', job.prompt]
    if job.refs:
        cmd += ['-i', *[r.name for r in job.refs]]
    return cmd


def extract_generated_path(stdout: str) -> Path | None:
    found = _GEN_RE.findall(stdout)
    return Path(found[-1]) if found else None


def _run_one(job: Job, retries: int, timeout: int, codex_bin: str, work_dir: Path) -> JobResult:
    t0 = time.time()
    if job.out.exists():
        return JobResult(job.id, True, job.out, 0, 0.0)
    err = ''
    for attempt in range(1, retries + 2):
        wd = work_dir / job.id
        shutil.rmtree(wd, ignore_errors=True)
        wd.mkdir(parents=True)
        for r in job.refs:
            shutil.copy(r, wd / r.name)
        try:
            p = subprocess.run(build_command(job, codex_bin), cwd=wd, capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            err = 'timeout'
            continue
        made = wd / f'{job.id}.png'
        if not made.exists():
            elsewhere = extract_generated_path(p.stdout + p.stderr)
            if elsewhere and elsewhere.exists():
                made = elsewhere
        if p.returncode == 0 and made.exists():
            job.out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(made, job.out)
            return JobResult(job.id, True, job.out, attempt, time.time() - t0)
        err = f'exit {p.returncode}: {(p.stderr or p.stdout)[-300:]}'
    return JobResult(job.id, False, None, retries + 1, time.time() - t0, err)


def run_jobs(jobs: list[Job], *, parallel: int = 4, retries: int = 2, timeout: int = 900, codex_bin: str = 'codex',
             work_dir: Path = paths.WORK, ledger: Path | None = None) -> list[JobResult]:
    parallel = max(1, min(parallel, 4))

    def task(job: Job) -> JobResult:
        r = _run_one(job, retries, timeout, codex_bin, work_dir)
        if ledger:
            with _ledger_lock:
                ledger.parent.mkdir(parents=True, exist_ok=True)
                with ledger.open('a') as f:
                    f.write(json.dumps({'id': r.id, 'ok': r.ok, 'attempts': r.attempts,
                                        'seconds': round(r.seconds, 1), 'error': r.error,
                                        'at': time.strftime('%Y-%m-%dT%H:%M:%S')}) + '\n')
        return r

    with ThreadPoolExecutor(max_workers=parallel) as ex:
        return list(ex.map(task, jobs))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: PASS for all suites so far.

- [ ] **Step 5: Calibrate on real Codex (outside the sandbox)**

Write a throwaway calibration script in the scratchpad (not in the repo) that builds two sheet jobs with `prompts.sheet_prompt` from the first 16 and the first 9 P1 words (`lists.load_words()[:16]` and `[:9]`), stems `cal-4x4` and `cal-3x3`, refs `[paths.STYLE_REF]`, outputs in `art-src/raw/`, plus one background job for `bg-meadow` with stem `cal-bg`. Run it with `run_jobs(..., parallel=3, ledger=paths.JOBS / 'calibration.jsonl')`. This command calls Codex, so run it with the sandbox disabled.

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 "$SCRATCH/calibrate.py"`
Expected: three PNG files in `art-src/raw/`. Open each with the Read tool and look at it. Measure sizes with `python3 -c "from PIL import Image; ..."`.

Decide the grid:
- If the 4x4 sheet has 16 separate objects in the right order and each object's long side is at least 220 px, use `cols 4, rows 4`.
- Otherwise, if the 3x3 sheet passes the same check, use `cols 3, rows 3`.
- If neither passes, use `cols 3, rows 2` with the prompt shape unchanged.

Write `art-src/lists/calibration.json`, for example:

```json
{"cols": 4, "rows": 4, "sheet_px": [1254, 1254], "background_px": [1536, 1024], "seconds_per_sheet": 95.0, "measured": "2026-10-12"}
```

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/tools/art/prompts.py games/moon-meadow-home/tools/art/codex_gen.py games/moon-meadow-home/tools/art/tests/test_prompts.py games/moon-meadow-home/tools/art/tests/test_codex_gen.py games/moon-meadow-home/art-src/lists/calibration.json games/moon-meadow-home/art-src/jobs/calibration.jsonl
git commit -m "Add the Codex image runner, prompts and grid calibration"
```

### Task A4: Sheet planning, cutting, automatic checks and Apple Vision

**Files:**
- Create: `tools/art/sheets.py`, `tools/art/checks.py`, `tools/art/vision.swift`, `tools/art/vision.py`
- Test: `tools/art/tests/test_sheets.py`, `tools/art/tests/test_checks.py`

**Interfaces:**
- Consumes: `imageops.*` (A1), `lists.Entry` (A2), `calibration.json` (A3).
- Produces:
  - `sheets.SheetSpec(id: str, cols: int, rows: int, ids: list[str], descs: list[str], grey: bool)`
  - `sheets.plan_sheets(batch: str, entries: list[Entry], cols: int, rows: int) -> list[SheetSpec]` (grey entries get their own sheets; sheet ids `<batch>-01`, `<batch>-02`, ...)
  - `sheets.Cut(id: str, image: Image.Image | None, box: tuple[int, int, int, int] | None, source_long_side: int, issues: list[str])`
  - `sheets.cut_sheet(im: Image.Image, spec: SheetSpec, min_area_frac: float = 0.002) -> list[Cut]`
  - `checks.check_picture(im: Image.Image, *, source_long_side: int, grey: bool = False) -> list[str]` (issue codes: `no-alpha`, `touches-edge`, `low-res`, `sparse`, `halo`, `no-colour`, `not-grey`)
  - `checks.check_file(path: Path, max_bytes: int) -> list[str]` (`heavy`)
  - `checks.max_bytes_for(kind: str, size: int) -> int`
  - `vision.available() -> bool`, `vision.detect_text(path: Path) -> list[str]`, `vision.foreground_mask(path: Path, out: Path) -> bool`

- [ ] **Step 1: Write the failing tests**

```python
# tools/art/tests/test_sheets.py
import unittest

import numpy as np
from PIL import Image, ImageDraw

from art import lists, sheets


def make_sheet(cols=4, rows=4, cell=150, skip=(), split=(), jitter=0):
    im = Image.new('RGB', (cols * cell, rows * cell), (252, 252, 250))
    d = ImageDraw.Draw(im)
    for i in range(cols * rows):
        if i in skip:
            continue
        cx = (i % cols) * cell + cell // 2 + (jitter if i % 2 else -jitter)
        cy = (i // cols) * cell + cell // 2
        col = (40 + 10 * i, 120, 200 - 8 * i)
        if i in split:
            d.ellipse([cx - 50, cy - 20, cx - 10, cy + 20], fill=col, outline=(20, 20, 60), width=3)
            d.ellipse([cx + 10, cy - 20, cx + 50, cy + 20], fill=col, outline=(20, 20, 60), width=3)
        else:
            d.ellipse([cx - 45, cy - 45, cx + 45, cy + 45], fill=col, outline=(20, 20, 60), width=3)
    d.point([(3, 3)], fill=(0, 0, 0))  # a speck that must be ignored
    return im


class CutSheetTest(unittest.TestCase):
    def spec(self, n=16):
        return sheets.SheetSpec('t-01', 4, 4, [f'w{i}' for i in range(n)], [''] * n, False)

    def test_cuts_in_reading_order_with_colours(self):
        cuts = sheets.cut_sheet(make_sheet(jitter=20), self.spec())
        self.assertEqual([c.id for c in cuts], [f'w{i}' for i in range(16)])
        for i in (0, 3, 15):
            a = np.asarray(cuts[i].image)
            px = a[a.shape[0] // 2, a.shape[1] // 2]
            self.assertEqual(tuple(int(v) for v in px[:3]), (40 + 10 * i, 120, 200 - 8 * i))
            self.assertEqual(cuts[i].issues, [])
            self.assertGreaterEqual(cuts[i].source_long_side, 90)

    def test_missing_cell_is_reported(self):
        cuts = sheets.cut_sheet(make_sheet(skip={5}), self.spec())
        self.assertEqual(cuts[5].issues, ['missing'])
        self.assertIsNone(cuts[5].image)

    def test_parts_in_one_cell_are_one_object(self):
        cuts = sheets.cut_sheet(make_sheet(split={9}), self.spec())
        self.assertEqual(cuts[9].issues, [])
        self.assertGreaterEqual(cuts[9].image.width, 100)

    def test_spare_cells_are_ignored(self):
        cuts = sheets.cut_sheet(make_sheet(), self.spec(14))
        self.assertEqual(len(cuts), 14)


class PlanSheetsTest(unittest.TestCase):
    def test_grey_entries_get_their_own_sheets(self):
        words = lists.load_words()
        plan = sheets.plan_sheets('words-a', words, 4, 4)
        self.assertEqual(sum(len(s.ids) for s in plan), len(words))
        for s in plan:
            self.assertLessEqual(len(s.ids), 16)
            self.assertEqual(len(set(w.tint is not None for w in words if w.id in s.ids)), 1)
            self.assertEqual(s.grey, all(w.tint for w in words if w.id in s.ids))
        self.assertEqual(plan[0].id, 'words-a-01')


if __name__ == '__main__':
    unittest.main()
```

```python
# tools/art/tests/test_checks.py
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from art import checks, imageops, vision


def good(fill=(240, 140, 160, 255)):
    im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse([40, 40, 280, 280], fill=fill, outline=(170, 80, 100, 255), width=5)
    return im


class ChecksTest(unittest.TestCase):
    def test_good_picture_has_no_issues(self):
        self.assertEqual(checks.check_picture(good(), source_long_side=250), [])

    def test_opaque_picture(self):
        self.assertIn('no-alpha', checks.check_picture(Image.new('RGBA', (320, 320), (255, 255, 255, 255)),
                                                       source_long_side=250))

    def test_cut_off_object(self):
        im = good()
        ImageDraw.Draw(im).rectangle([0, 100, 20, 200], fill=(240, 140, 160, 255))
        self.assertIn('touches-edge', checks.check_picture(im, source_long_side=250))

    def test_low_source_resolution(self):
        self.assertIn('low-res', checks.check_picture(good(), source_long_side=150))

    def test_sparse_specks(self):
        im = Image.new('RGBA', (320, 320), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for x in range(40, 280, 40):
            d.ellipse([x, x, x + 6, x + 6], fill=(200, 40, 40, 255))
        self.assertIn('sparse', checks.check_picture(im, source_long_side=250))

    def test_white_halo(self):
        im = good()
        ImageDraw.Draw(im).ellipse([36, 36, 284, 284], outline=(253, 253, 253, 128), width=4)
        self.assertIn('halo', checks.check_picture(im, source_long_side=250))

    def test_grey_rules(self):
        grey = good(fill=(210, 210, 210, 255))
        self.assertIn('no-colour', checks.check_picture(grey, source_long_side=250))
        self.assertEqual(checks.check_picture(grey, source_long_side=250, grey=True), [])
        self.assertIn('not-grey', checks.check_picture(good(), source_long_side=250, grey=True))

    def test_heavy_file(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'x.webp'
            imageops.save_webp(good(), p)
            self.assertEqual(checks.check_file(p, 10_000_000), [])
            self.assertEqual(checks.check_file(p, 10), ['heavy'])

    def test_max_bytes(self):
        self.assertEqual(checks.max_bytes_for('word', 320), 46_080)
        self.assertEqual(checks.max_bytes_for('bg', 1770), 450_000)


@unittest.skipUnless(vision.available(), 'Apple Vision helper not built')
class VisionTest(unittest.TestCase):
    def test_finds_text(self):
        from PIL import ImageFont
        im = Image.new('RGB', (600, 200), 'white')
        ImageDraw.Draw(im).text((40, 40), 'HAT', fill='black', font=ImageFont.load_default(size=110))
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 't.png'
            im.save(p)
            self.assertIn('HAT', ' '.join(vision.detect_text(p)).upper())
            p2 = Path(d) / 'g.png'
            good().save(p2)
            self.assertEqual(vision.detect_text(p2), [])


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_[sc]*.py' -v`
Expected: FAIL with `cannot import name 'sheets'`.

- [ ] **Step 3: Write the implementation**

`tools/art/sheets.py`:

```python
from dataclasses import dataclass

import numpy as np
from PIL import Image

from .imageops import label_components, unmatte_white
from .lists import Entry


@dataclass
class SheetSpec:
    id: str
    cols: int
    rows: int
    ids: list[str]
    descs: list[str]
    grey: bool


@dataclass
class Cut:
    id: str
    image: Image.Image | None
    box: tuple[int, int, int, int] | None
    source_long_side: int
    issues: list[str]


def plan_sheets(batch: str, entries: list[Entry], cols: int, rows: int) -> list[SheetSpec]:
    n = cols * rows
    out: list[SheetSpec] = []
    for grey in (False, True):
        group = [e for e in entries if bool(e.tint) == grey]
        for i in range(0, len(group), n):
            chunk = group[i:i + n]
            out.append(SheetSpec('', cols, rows, [e.id for e in chunk], [e.desc for e in chunk], grey))
    for k, s in enumerate(out, 1):
        s.id = f'{batch}-{k:02d}'
    return out


def cut_sheet(im: Image.Image, spec: SheetSpec, min_area_frac: float = 0.002) -> list[Cut]:
    rgba = unmatte_white(im)
    arr = np.asarray(rgba)
    mask = arr[..., 3] > 0
    labels, n = label_components(mask)
    H, W = mask.shape
    cw, ch = W / spec.cols, H / spec.rows
    areas = np.bincount(labels.ravel(), minlength=n + 1)
    keep = [k for k in range(1, n + 1) if areas[k] >= min_area_frac * W * H]
    cells: dict[int, list[int]] = {}
    for k in keep:
        ys, xs = np.nonzero(labels == k)
        col = min(int(xs.mean() // cw), spec.cols - 1)
        row = min(int(ys.mean() // ch), spec.rows - 1)
        cells.setdefault(row * spec.cols + col, []).append(k)
    cuts = []
    for idx, cid in enumerate(spec.ids):
        comps = cells.get(idx, [])
        if not comps:
            cuts.append(Cut(cid, None, None, 0, ['missing']))
            continue
        m = np.isin(labels, comps)
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        piece = arr[y0:y1, x0:x1].copy()
        piece[..., 3] = np.where(m[y0:y1, x0:x1], piece[..., 3], 0)
        issues = []
        if (x1 - x0) > 1.15 * cw or (y1 - y0) > 1.15 * ch:
            issues.append('overlaps-cell')
        cuts.append(Cut(cid, Image.fromarray(piece, 'RGBA'), (int(x0), int(y0), int(x1 - x0), int(y1 - y0)),
                        int(max(x1 - x0, y1 - y0)), issues))
    return cuts
```

`tools/art/checks.py`:

```python
from pathlib import Path

import numpy as np
from PIL import Image

from .imageops import label_components


def max_bytes_for(kind: str, size: int) -> int:
    if kind == 'bg':
        return 450_000
    return int(size * size * 0.45)


def check_picture(im: Image.Image, *, source_long_side: int, grey: bool = False) -> list[str]:
    a = np.asarray(im.convert('RGBA')).astype(int)
    alpha = a[..., 3]
    issues: list[str] = []
    if (alpha == 0).sum() < 0.02 * alpha.size:
        return ['no-alpha']
    edge = np.concatenate([alpha[:2].ravel(), alpha[-2:].ravel(), alpha[:, :2].ravel(), alpha[:, -2:].ravel()])
    if (edge > 0).any():
        issues.append('touches-edge')
    if source_long_side < 200:
        issues.append('low-res')
    solid = alpha > 0
    ys, xs = np.nonzero(solid)
    bbox_area = (xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1)
    _, n = label_components(solid)
    if solid.sum() / bbox_area < 0.12 or n > 12:
        issues.append('sparse')
    semi = (alpha > 0) & (alpha < 255)
    if semi.sum() > 20 and (a[semi][:, :3].min(axis=1) > 235).mean() > 0.3:
        issues.append('halo')
    opaque = a[alpha > 200][:, :3]
    chroma = (opaque.max(axis=1) - opaque.min(axis=1)).mean() if len(opaque) else 0
    if not grey and chroma < 12:
        issues.append('no-colour')
    if grey and chroma > 25:
        issues.append('not-grey')
    return issues


def check_file(path: Path, max_bytes: int) -> list[str]:
    return ['heavy'] if path.stat().st_size > max_bytes else []
```

`tools/art/vision.swift`:

```swift
import AppKit
import CoreImage
import Foundation
import Vision

func cgImage(_ path: String) -> CGImage {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!); exit(2)
    }
    return cg
}

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: vision text <png> | vision mask <png> <out.png>"); exit(2) }
let handler = VNImageRequestHandler(cgImage: cgImage(args[2]))
switch args[1] {
case "text":
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    try handler.perform([req])
    for obs in req.results ?? [] {
        if let top = obs.topCandidates(1).first, top.confidence >= 0.5 { print(top.string) }
    }
case "mask":
    let req = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([req])
    guard let res = req.results?.first else { exit(1) }
    let buf = try res.generateScaledMaskForImage(forInstances: res.allInstances, from: handler)
    let ci = CIImage(cvPixelBuffer: buf)
    let rep = NSBitmapImageRep(ciImage: ci)
    try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[3]))
default:
    exit(2)
}
```

`tools/art/vision.py`:

```python
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
BIN = HERE / '.bin' / 'vision'


def _build() -> bool:
    if BIN.exists() and BIN.stat().st_mtime >= (HERE / 'vision.swift').stat().st_mtime:
        return True
    BIN.parent.mkdir(exist_ok=True)
    r = subprocess.run(['swiftc', '-O', str(HERE / 'vision.swift'), '-o', str(BIN)], capture_output=True)
    return r.returncode == 0


def available() -> bool:
    try:
        return _build()
    except OSError:
        return False


def detect_text(path: Path) -> list[str]:
    if not available():
        return []
    r = subprocess.run([str(BIN), 'text', str(path)], capture_output=True, text=True, timeout=60)
    return [ln for ln in r.stdout.splitlines() if ln.strip()]


def foreground_mask(path: Path, out: Path) -> bool:
    if not available():
        return False
    r = subprocess.run([str(BIN), 'mask', str(path), str(out)], capture_output=True, timeout=120)
    return r.returncode == 0 and out.exists()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: PASS. The Vision test runs only when `swiftc` builds the helper; if Swift cannot compile inside the sandbox, rerun once with the sandbox disabled to build `tools/art/.bin/vision`, then rerun the tests in the sandbox.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/tools/art/sheets.py games/moon-meadow-home/tools/art/checks.py games/moon-meadow-home/tools/art/vision.swift games/moon-meadow-home/tools/art/vision.py games/moon-meadow-home/tools/art/tests/test_sheets.py games/moon-meadow-home/tools/art/tests/test_checks.py
git commit -m "Add sheet cutting, picture checks and an Apple Vision helper"
```

### Task A5: Review files, contact sheets, manifest builder and the pipeline command

**Files:**
- Create: `tools/art/review.py`, `tools/art/contact.py`, `tools/art/manifest.py`, `tools/art/pipeline.py`, `art-src/README.md`
- Test: `tools/art/tests/test_review.py`, `tools/art/tests/test_manifest.py`, `tools/art/tests/test_contact.py`

**Interfaces:**
- Consumes: everything from A1 to A4.
- Produces:
  - Meta file shape `art-src/meta/<batch>.json`: `{"pictures": {id: PictureEntry}, "backgrounds": {id: BackgroundEntry}, "unicorns": {key: UnicornEntry}, "lumi": LumiEntry | null, "patterns": {"speckle": src} | null}` where the entry shapes are exactly the TypeScript types in Task A6.
  - Review file shape `art-src/review/<batch>.json`: `{id: "pending" | "ok" | "redo" | "svg" | "swap:<other id>"}`
  - `review.load(batch: str, root: Path = paths.REVIEW) -> dict[str, str]`, `review.init(batch: str, ids: list[str], root: Path = paths.REVIEW) -> Path` (keeps existing verdicts), `review.redo_ids(batch: str, root: Path = paths.REVIEW) -> list[str]`, `review.apply_swaps(meta: dict, verdicts: dict[str, str]) -> dict`
  - `contact.contact_png(items: list[tuple[str, Path]], out: Path, cols: int = 6, cell: int = 220) -> Path`
  - `contact.contact_html(manifest: dict, out: Path) -> Path`
  - `manifest.ManifestError(Exception)`
  - `manifest.build(meta_dir: Path, review_dir: Path, public_art: Path, rig_mode: str, strict: bool = False) -> tuple[dict, list[str]]` (the manifest and the left-out ids)
  - `manifest.write(public_art: Path, data: dict) -> Path`
  - CLI: `PYTHONPATH=tools python3 -m art.pipeline <command>` with commands listed in the file map. Pictures of kind `word`, `pin` and `ui` go through `fit_square(size, pad=0.1)`, all others through `fit_long(size, pad=0.04)`. Output folders: word `words/`, pin `pins/`, outfit `outfits/`, ui `ui/`, everything else `items/`, backgrounds `bg/`, unicorns `unicorns/`, Lumi `lumi/`.

- [ ] **Step 1: Write the failing tests**

```python
# tools/art/tests/test_review.py
import json
import tempfile
import unittest
from pathlib import Path

from art import review


class ReviewTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_init_keeps_existing_verdicts(self):
        review.init('b', ['hat', 'cup'], self.root)
        (self.root / 'b.json').write_text(json.dumps({'hat': 'ok', 'cup': 'pending'}))
        review.init('b', ['hat', 'cup', 'bow'], self.root)
        self.assertEqual(review.load('b', self.root), {'hat': 'ok', 'cup': 'pending', 'bow': 'pending'})

    def test_redo_ids(self):
        (self.root / 'b.json').write_text(json.dumps({'hat': 'ok', 'cup': 'redo', 'bow': 'svg', 'pin': 'redo'}))
        self.assertEqual(review.redo_ids('b', self.root), ['cup', 'pin'])

    def test_swap_verdict_moves_picture(self):
        meta = {'pictures': {'hat': {'src': 'words/hat.webp'}, 'cup': {'src': 'words/cup.webp'}}}
        out = review.apply_swaps(meta, {'hat': 'swap:cup', 'cup': 'swap:hat'})
        self.assertEqual(out['pictures']['hat']['src'], 'words/cup.webp')
        self.assertEqual(out['pictures']['cup']['src'], 'words/hat.webp')


if __name__ == '__main__':
    unittest.main()
```

```python
# tools/art/tests/test_manifest.py
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from art import manifest


def pic(src, kind='word', pack='words'):
    return {'src': src, 'w': 320, 'h': 320, 'kind': kind, 'pack': pack, 'source': 'codex'}


class ManifestTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        self.meta, self.rev, self.pub = d / 'meta', d / 'review', d / 'public'
        for p in (self.meta, self.rev, self.pub / 'words'):
            p.mkdir(parents=True)
        for n in ('hat', 'cup'):
            Image.new('RGBA', (320, 320)).save(self.pub / 'words' / f'{n}.webp')
        (self.meta / 'w.json').write_text(json.dumps({'pictures': {'hat': pic('words/hat.webp'),
                                                                   'cup': pic('words/cup.webp')}}))

    def tearDown(self):
        self.tmp.cleanup()

    def test_unreviewed_pictures_are_left_out(self):
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'pending'}))
        data, missing = manifest.build(self.meta, self.rev, self.pub, 'sprite')
        self.assertEqual(list(data['pictures']), ['hat'])
        self.assertEqual(missing, ['cup'])
        self.assertEqual(data['v'], 1)
        self.assertEqual(data['rigMode'], 'sprite')

    def test_strict_mode_raises_on_left_out(self):
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'redo'}))
        with self.assertRaises(manifest.ManifestError):
            manifest.build(self.meta, self.rev, self.pub, 'sprite', strict=True)

    def test_missing_file_is_an_error(self):
        (self.pub / 'words' / 'cup.webp').unlink()
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'ok'}))
        with self.assertRaises(manifest.ManifestError):
            manifest.build(self.meta, self.rev, self.pub, 'sprite')

    def test_derived_and_svg_need_no_review(self):
        Image.new('RGBA', (8, 8)).save(self.pub / 'words' / 'bow.webp')
        e = pic('words/bow.webp')
        e['source'] = 'svg'
        (self.meta / 's.json').write_text(json.dumps({'pictures': {'bow': e}}))
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'ok'}))
        data, _ = manifest.build(self.meta, self.rev, self.pub, 'sprite')
        self.assertIn('bow', data['pictures'])

    def test_conflicting_duplicate_is_an_error(self):
        (self.meta / 'x.json').write_text(json.dumps({'pictures': {'hat': pic('words/cup.webp')}}))
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'ok'}))
        (self.rev / 'x.json').write_text(json.dumps({'hat': 'ok'}))
        with self.assertRaises(manifest.ManifestError):
            manifest.build(self.meta, self.rev, self.pub, 'sprite')

    def test_write_sorts_keys(self):
        (self.rev / 'w.json').write_text(json.dumps({'hat': 'ok', 'cup': 'ok'}))
        data, _ = manifest.build(self.meta, self.rev, self.pub, 'sprite')
        p = manifest.write(self.pub, data)
        self.assertEqual(list(json.loads(p.read_text())['pictures']), ['cup', 'hat'])


if __name__ == '__main__':
    unittest.main()
```

```python
# tools/art/tests/test_contact.py
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from art import contact


class ContactTest(unittest.TestCase):
    def test_png_grid_size(self):
        with tempfile.TemporaryDirectory() as d:
            items = []
            for i in range(7):
                p = Path(d) / f'p{i}.png'
                Image.new('RGBA', (100, 60), (200, 50, 50, 255)).save(p)
                items.append((f'id{i}', p))
            out = contact.contact_png(items, Path(d) / 'c.png', cols=3, cell=200)
            self.assertEqual(Image.open(out).size, (600, 3 * 230))

    def test_html_lists_every_picture_at_real_size(self):
        with tempfile.TemporaryDirectory() as d:
            m = {'pictures': {'hat': {'src': 'words/hat.webp', 'w': 320, 'h': 320, 'kind': 'word'}},
                 'backgrounds': {}, 'unicorns': {}}
            out = contact.contact_html(m, Path(d) / 'index.html')
            html = out.read_text()
            self.assertIn('hat', html)
            self.assertIn('../../public/art/words/hat.webp', html)
            self.assertIn('width="160"', html)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: FAIL with `cannot import name 'review'`, `'manifest'`, `'contact'`.

- [ ] **Step 3: Write the implementation**

`tools/art/review.py`:

```python
import json
from pathlib import Path

from . import paths


def load(batch: str, root: Path = paths.REVIEW) -> dict[str, str]:
    p = root / f'{batch}.json'
    return json.loads(p.read_text()) if p.exists() else {}


def init(batch: str, ids: list[str], root: Path = paths.REVIEW) -> Path:
    cur = load(batch, root)
    for i in ids:
        cur.setdefault(i, 'pending')
    root.mkdir(parents=True, exist_ok=True)
    p = root / f'{batch}.json'
    p.write_text(json.dumps(cur, indent=1) + '\n')
    return p


def redo_ids(batch: str, root: Path = paths.REVIEW) -> list[str]:
    return [i for i, v in load(batch, root).items() if v == 'redo']


def apply_swaps(meta: dict, verdicts: dict[str, str]) -> dict:
    pics = meta.get('pictures', {})
    orig = {k: dict(v) for k, v in pics.items()}
    for i, v in verdicts.items():
        if v.startswith('swap:') and i in pics:
            other = v.split(':', 1)[1]
            pics[i]['src'] = orig[other]['src']
    return meta
```

`tools/art/manifest.py`:

```python
import json
import time
from pathlib import Path

from . import review


class ManifestError(Exception):
    pass


SECTIONS = ('pictures', 'backgrounds', 'unicorns')


def _files_of(entry: dict) -> list[str]:
    out = [entry['src']] if 'src' in entry else []
    if 'sil' in entry:
        out.append(entry['sil'])
    for r in entry.get('renditions', {}).values():
        for part in r['parts']:
            out += [layer['src'] for layer in part['layers']]
    return out


def build(meta_dir: Path, review_dir: Path, public_art: Path, rig_mode: str, strict: bool = False):
    data = {'v': 1, 'built': time.strftime('%Y-%m-%dT%H:%M:%S'), 'rigMode': rig_mode,
            'pictures': {}, 'backgrounds': {}, 'unicorns': {}, 'lumi': None, 'patterns': None}
    missing: list[str] = []
    for mf in sorted(meta_dir.glob('*.json')):
        batch = mf.stem
        meta = json.loads(mf.read_text())
        verdicts = review.load(batch, review_dir)
        meta = review.apply_swaps(meta, verdicts)
        for section in SECTIONS:
            for key, entry in meta.get(section, {}).items():
                needs_review = entry.get('source', 'codex') == 'codex'
                if needs_review and not (verdicts.get(key) == 'ok' or verdicts.get(key, '').startswith('swap:')):
                    missing.append(key)
                    continue
                for f in _files_of(entry):
                    if not (public_art / f).exists():
                        raise ManifestError(f'{batch}: {key}: file {f} does not exist')
                prev = data[section].get(key)
                if prev is not None and prev != entry:
                    raise ManifestError(f'{key} differs between batches')
                data[section][key] = entry
        for single in ('lumi', 'patterns'):
            if meta.get(single):
                data[single] = meta[single]
    if strict and missing:
        raise ManifestError('left out: ' + ', '.join(missing))
    for section in SECTIONS:
        data[section] = dict(sorted(data[section].items()))
    return data, sorted(set(missing))


def write(public_art: Path, data: dict) -> Path:
    p = public_art / 'manifest.json'
    p.write_text(json.dumps(data, indent=1, sort_keys=False) + '\n')
    return p
```

`tools/art/contact.py`:

```python
import html
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def contact_png(items: list[tuple[str, Path]], out: Path, cols: int = 6, cell: int = 220) -> Path:
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 30)), (40, 36, 52))
    font = ImageFont.load_default(size=18)
    d = ImageDraw.Draw(sheet)
    for i, (label, path) in enumerate(items):
        x, y = (i % cols) * cell, (i // cols) * (cell + 30)
        bg = Image.new('RGB', (cell - 10, cell - 10), (255, 255, 255))
        for cy in range(0, cell - 10, 20):                       # checkerboard shows halos and holes
            for cx in range((cy // 20) % 2 * 20, cell - 10, 40):
                bg.paste((222, 222, 230), (cx, cy, cx + 20, cy + 20))
        im = Image.open(path).convert('RGBA')
        im.thumbnail((cell - 20, cell - 20))
        bg.paste(im, ((cell - 10 - im.width) // 2, (cell - 10 - im.height) // 2), im)
        sheet.paste(bg, (x + 5, y + 5))
        d.text((x + 8, y + cell - 2), label, fill=(255, 255, 255), font=font)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def contact_html(manifest: dict, out: Path) -> Path:
    rows = []
    for key, e in manifest.get('pictures', {}).items():
        w = e['w'] // 2
        rows.append(f'<figure><img src="../../public/art/{e["src"]}" width="{w}" alt="">'
                    f'<figcaption>{html.escape(key)}</figcaption></figure>')
    for key, e in manifest.get('backgrounds', {}).items():
        rows.append(f'<figure class="bg"><img src="../../public/art/{e["src"]}" width="1180" alt="">'
                    f'<figcaption>{html.escape(key)}</figcaption></figure>')
    for key, u in manifest.get('unicorns', {}).items():
        rows.append(f'<figure><img src="../../public/art/{u["sil"]}" width="{u["w"] // 4}" alt="">'
                    f'<figcaption>{html.escape(key)}</figcaption></figure>')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
                   '<title>Art contact sheet</title><style>body{background:#f4f1ea;font:14px sans-serif;margin:16px}'
                   'figure{display:inline-block;margin:8px;text-align:center;vertical-align:top}'
                   'figure img{background:repeating-conic-gradient(#e4e4ec 0 25%,#fff 0 50%) 0 0/20px 20px}'
                   '</style>' + '\n'.join(rows) + '\n')
    return out
```

`tools/art/pipeline.py` implements the commands below with `argparse`. Each command prints one line per id it touched and ends with a count line.

| Command | What it does |
|---|---|
| `plan-sheets --batch B --source words\|items\|requests [--wave A] [--kinds k1,k2] [--packs p1,p2]` | Filters the list by wave, kind and pack, leaves out entries whose description starts with `svg:` (they get verdict `svg` at once), skips ids that already have an `ok` verdict in any batch, calls `plan_sheets` with `calibration.json`, writes `art-src/lists/sheets/B.json` |
| `gen --batch B [--parallel 4] [--only sheet ids]` | Builds one `Job` per sheet with `sheet_prompt` and refs `[STYLE_REF]`, out `art-src/raw/<sheet>.png`, ledger `art-src/jobs/B.jsonl`, then saves a lossless copy to `art-src/sources/<sheet>.webp` |
| `cut --batch B` | For each sheet: `cut_sheet`, `fit_square` or `fit_long` by kind and size, `save_webp` to its folder, `check_picture`, `check_file` with `max_bytes_for`, `vision.detect_text` (any text adds the issue `text`), a PNG contact sheet per sheet in `art-src/work/contact/`, meta to `art-src/meta/B.json` (grey pictures get `tint: {"default": hex}`, outfits get `slot` and `attach`), then `review.init`. Issues go to `art-src/work/cuts/B.json` and are printed |
| `review --batch B` | Prints the contact sheet PNG paths and the ids still `pending` |
| `redo --batch B` | Collects ids with verdict `redo` or with a `missing` issue, plans sheets as batch `B-r1` (then `B-r2`). An id that already failed in `B-r2` gets verdict `svg` in `B`'s review file |
| `svg --batch B` | For each id with verdict `svg`, renders `art-src/svg/<id>.svg` with `magick -background none -density 384 in.svg out.png`, fits and saves it, writes meta with `source: "svg"` to `art-src/meta/B-svg.json` |
| `sprite --breed X --stage baby\|foal [--source path]` | Task A8 |
| `backgrounds --batch B [--wave A]` | Generates the backgrounds with `background_prompt`, resizes to 1770 x 1230 (cover crop, LANCZOS), saves WebP quality 82 to `bg/`, writes meta with the `dominant` colour (median of the bottom 10 rows), contact PNG, `review.init` |
| `derive` | Task A8 |
| `manifest [--strict]` | `manifest.build` with `rig-mode.json`, `manifest.write`, writes `art-src/missing.json` |
| `check-all` | Re-runs `check_picture` and `check_file` on every manifest file, and fails when any word in `words.txt` is missing |
| `contact-html` | Writes `art-src/contact/index.html` |
| `status` | Prints counts per batch: planned, generated, cut, ok, redo, svg, pending |

Attach defaults for outfits (fractions of the picture's width and height): head `(0.5, 0.92)`, neck `(0.5, 0.5)`, back `(0.5, 0.35)`, mane `(0.5, 0.5)`, flank `(0.5, 0.5)`, multiplied by the file size to give pixel points.

`art-src/README.md` lists the commands above in run order, says that `gen` and `backgrounds` run outside the sandbox, that every cut picture is looked at before its verdict is set, and that `art-src/raw/` is not committed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: PASS.

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline status`
Expected: prints `0 batches`.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/tools/art games/moon-meadow-home/art-src/README.md
git commit -m "Add art review files, contact sheets, manifest builder and pipeline command"
```

### Task A6: App-side manifest, palette, tint and heaps

**Files:**
- Create: `src/art/manifest.ts`, `src/art/palette.ts`, `src/art/tint.ts`, `src/art/heap.ts`, `src/art/Picture.svelte`, `src/art/Heap.svelte`, `tests/art/fixture.ts`
- Test: `tests/art/manifest.test.ts`, `tests/art/palette.test.ts`, `tests/art/tint.test.ts`, `tests/art/heap.test.ts`

**Interfaces:**
- Consumes: the manifest shape written by Task A5.
- Produces (exact):

```ts
// src/art/manifest.ts
export type BreedId = 'moon' | 'nestling' | 'pebble' | 'cosy' | 'berry' | 'snow' | 'bubble' | 'post' | 'sparkle';
export type Stage = 'baby' | 'foal';
export type ArtPack = 'core' | 'words' | 'meadow' | 'stables' | 'building' | 'bath' | 'post' | 'dressing' | 'home'
  | 'salon' | 'valley' | 'letters';
export type PictureKind = 'word' | 'item' | 'station' | 'prop' | 'outfit' | 'pin' | 'decor' | 'ui' | 'egg' | 'building';
export type OutfitSlot = 'head' | 'neck' | 'back' | 'mane' | 'flank';
export type Rect = [x: number, y: number, w: number, h: number];
export type Point = [x: number, y: number];
export interface PictureEntry {
  src: string; w: number; h: number; kind: PictureKind; pack: ArtPack; source: 'codex' | 'svg' | 'derived';
  tint?: { default: string }; slot?: OutfitSlot; attach?: Point; sil?: string;
}
export interface BackgroundEntry { src: string; w: number; h: number; pack: ArtPack; dominant: string; source: 'codex' | 'svg' }
export type Tint = 'body' | 'mane' | 'mane2' | 'none';
export type PartId = 'tail' | 'body' | 'lids' | 'head' | 'mane' | 'legFL' | 'legFR' | 'legBL' | 'legBR' | 'horn' | 'wings';
export type PartAnim = 'none' | 'tail' | 'blink' | 'head' | 'leg' | 'mane';
export interface UnicornLayer { src: string; tint: Tint; box: Rect }
export interface UnicornPart { id: PartId; box: Rect; pivot: Point; anim: PartAnim; hidden?: boolean; layers: UnicornLayer[] }
export type AnchorName = 'head' | 'hornBase' | 'eye' | 'neck' | 'back' | 'mane' | 'flank' | 'tailRoot' | 'feet';
export interface UnicornRendition { scale: number; parts: UnicornPart[] }
export interface UnicornEntry {
  breed: BreedId; stage: Stage; mode: 'sprite' | 'layers'; w: number; h: number;
  anchors: Record<AnchorName, Point>; headBox: Rect;
  renditions: { sm: UnicornRendition; lg: UnicornRendition }; sil: string; source: 'codex' | 'placeholder' | 'svg';
}
export interface LumiEntry { face: string; mouth: string; w: number; h: number; mouthBox: Rect }
export interface ArtManifest {
  v: 1; built: string; rigMode: 'sprite' | 'layers';
  pictures: Record<string, PictureEntry>; backgrounds: Record<string, BackgroundEntry>;
  unicorns: Record<string, UnicornEntry>; lumi: LumiEntry | null; patterns: { speckle: string } | null;
}
export function loadArtManifest(base?: string, file?: string): Promise<ArtManifest>;
export function setArtManifest(m: ArtManifest, base: string): void;
export function artManifest(): ArtManifest;
export function artUrl(src: string): string;
export function hasPicture(id: string): boolean;
export function picture(id: string): PictureEntry | undefined;
export function pictureIds(kind?: PictureKind): string[];
export function background(id: string): BackgroundEntry | undefined;
export function unicornEntry(breed: BreedId, stage: Stage): UnicornEntry;
```

```ts
// src/art/palette.ts
export type Colours = { body: string; mane: string; mane2: string };
export type Traits = { shiny?: boolean; speckled?: boolean; golden?: boolean; founder?: boolean };
export const BODY_COLOURS: readonly string[];
export const MANE_COLOURS: readonly string[];
export const GOLDEN_BODY: string;
export const DEFAULT_COLOURS: Colours;
export const NAMED_COLOURS: Record<ColourWord, string>;
export type ColourWord = 'red' | 'pink' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'brown' | 'black' | 'white' | 'grey' | 'gold' | 'silver';
export function randomColours(rng: () => number): Colours;
export function resolveColours(c: Partial<Colours> | undefined | null, traits?: Traits): Colours;
export function luminance(hex: string): number;
```

```ts
// src/art/tint.ts
export function tintLayerStyle(url: string, colour: string): string;
export function plainLayerStyle(url: string): string;
export function patternLayerStyle(maskUrl: string, patternUrl: string, opacity: number): string;
export function colourForTint(tint: Tint, colours: Colours): string | null;
```

```ts
// src/art/heap.ts
export type Placement = { x: number; y: number; scale: number; rot: number; z: number };
export function mulberry32(seed: number): () => number;
export function heapLayout(count: number, seed: number): Placement[];   // count 3 to 5
export function jarLayout(count: number, seed: number): Placement[];    // count 1 to 5
```

Components: `<Picture id size tint? label? silhouette? />` and `<Heap id count size seed tint? label? />`, where `size` is the long side in CSS pixels.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/art/fixture.ts
import type { ArtManifest, UnicornEntry } from '../../src/art/manifest';

export function unicornFixture(breed: UnicornEntry['breed'] = 'moon', stage: UnicornEntry['stage'] = 'baby'): UnicornEntry {
  const parts = (r: 'sm' | 'lg') => [
    { id: 'tail' as const, box: [0, 100, 120, 120] as [number, number, number, number], pivot: [110, 160] as [number, number], anim: 'tail' as const,
      layers: [{ src: `unicorns/${breed}.${stage}.${r}.tail-mane.webp`, tint: 'mane' as const, box: [0, 100, 120, 120] as [number, number, number, number] }] },
    { id: 'body' as const, box: [80, 0, 320, 300] as [number, number, number, number], pivot: [240, 300] as [number, number], anim: 'none' as const,
      layers: [
        { src: `unicorns/${breed}.${stage}.${r}.body.webp`, tint: 'body' as const, box: [80, 40, 320, 260] as [number, number, number, number] },
        { src: `unicorns/${breed}.${stage}.${r}.mane.webp`, tint: 'mane' as const, box: [180, 10, 80, 140] as [number, number, number, number] },
        { src: `unicorns/${breed}.${stage}.${r}.fixed.webp`, tint: 'none' as const, box: [80, 0, 320, 300] as [number, number, number, number] },
      ] },
    { id: 'lids' as const, box: [270, 70, 40, 30] as [number, number, number, number], pivot: [290, 85] as [number, number], anim: 'blink' as const, hidden: true,
      layers: [{ src: `unicorns/${breed}.${stage}.${r}.lids.webp`, tint: 'body' as const, box: [270, 70, 40, 30] as [number, number, number, number] }] },
  ];
  return {
    breed, stage, mode: 'sprite', w: 400, h: 300,
    anchors: { head: [300, 20], hornBase: [310, 30], eye: [290, 85], neck: [250, 140], back: [200, 110], mane: [220, 80],
      flank: [180, 200], tailRoot: [110, 160], feet: [230, 300] },
    headBox: [230, 0, 170, 170],
    renditions: { sm: { scale: 0.5, parts: parts('sm') }, lg: { scale: 1, parts: parts('lg') } },
    sil: `unicorns/${breed}.${stage}.sil.webp`, source: 'codex',
  };
}

export function manifestFixture(): ArtManifest {
  return {
    v: 1, built: '2026-10-12T20:00:00', rigMode: 'sprite',
    pictures: {
      hat: { src: 'words/hat.webp', w: 320, h: 320, kind: 'word', pack: 'words', source: 'codex', tint: { default: '#6c8fe0' } },
      cup: { src: 'words/cup.webp', w: 320, h: 320, kind: 'word', pack: 'words', source: 'codex' },
      'item-nest': { src: 'items/item-nest.webp', w: 640, h: 420, kind: 'item', pack: 'meadow', source: 'codex' },
      'outfit-crown-gold': { src: 'outfits/outfit-crown-gold.webp', w: 320, h: 220, kind: 'outfit', pack: 'dressing', source: 'codex', slot: 'head', attach: [160, 202] },
    },
    backgrounds: { 'bg-meadow': { src: 'bg/bg-meadow.webp', w: 1770, h: 1230, pack: 'meadow', dominant: '#9fd38a', source: 'codex' } },
    unicorns: { 'moon.baby': unicornFixture('moon', 'baby'), 'moon.foal': unicornFixture('moon', 'foal'), 'pebble.baby': unicornFixture('pebble', 'baby') },
    lumi: { face: 'lumi/lumi.webp', mouth: 'lumi/lumi-mouth.webp', w: 600, h: 600, mouthBox: [280, 380, 60, 30] },
    patterns: { speckle: 'ui/speckle.webp' },
  };
}
```

```ts
// tests/art/manifest.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { artUrl, background, hasPicture, picture, pictureIds, setArtManifest, unicornEntry } from '../../src/art/manifest';
import { manifestFixture } from './fixture';

describe('art manifest', () => {
  beforeEach(() => setArtManifest(manifestFixture(), '/games/moon-meadow-home'));

  it('joins urls under the base', () => {
    expect(artUrl('words/hat.webp')).toBe('/games/moon-meadow-home/art/words/hat.webp');
  });

  it('answers picture questions', () => {
    expect(hasPicture('hat')).toBe(true);
    expect(hasPicture('kite')).toBe(false);
    expect(picture('hat')?.tint?.default).toBe('#6c8fe0');
    expect(pictureIds('word')).toEqual(['cup', 'hat']);
    expect(background('bg-meadow')?.dominant).toBe('#9fd38a');
  });

  it('unicornEntry falls back to moon', () => {
    expect(unicornEntry('pebble', 'baby').breed).toBe('pebble');
    expect(unicornEntry('sparkle', 'foal').breed).toBe('moon');
    expect(unicornEntry('sparkle', 'foal').stage).toBe('foal');
    const m = manifestFixture();
    delete m.unicorns['moon.foal'];
    setArtManifest(m, '/');
    expect(unicornEntry('pebble', 'foal').stage).toBe('baby');
  });

  it('throws when moon.baby is missing too', () => {
    const m = manifestFixture();
    m.unicorns = {};
    setArtManifest(m, '/');
    expect(() => unicornEntry('moon', 'baby')).toThrow(/no unicorn art/);
  });
});
```

```ts
// tests/art/palette.test.ts
import { describe, expect, it } from 'vitest';
import { BODY_COLOURS, DEFAULT_COLOURS, GOLDEN_BODY, MANE_COLOURS, NAMED_COLOURS, luminance, randomColours, resolveColours } from '../../src/art/palette';
import { mulberry32 } from '../../src/art/heap';

describe('palette', () => {
  it('randomColours follows the v2 rules', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const c = randomColours(rng);
      expect(BODY_COLOURS).toContain(c.body);
      expect(MANE_COLOURS).toContain(c.mane);
      expect(MANE_COLOURS).toContain(c.mane2);
      expect(c.mane2).not.toBe(c.mane);
    }
    expect(randomColours(mulberry32(7))).toEqual(randomColours(mulberry32(7)));
  });

  it('resolveColours replaces invalid colours', () => {
    expect(resolveColours({ body: 'red?', mane: '#FF7FBF', mane2: '' })).toEqual({ body: DEFAULT_COLOURS.body, mane: '#ff7fbf', mane2: DEFAULT_COLOURS.mane2 });
    expect(resolveColours(undefined)).toEqual(DEFAULT_COLOURS);
    expect(resolveColours(null)).toEqual(DEFAULT_COLOURS);
  });

  it('golden replaces the body colour only', () => {
    const c = resolveColours({ body: '#ffe0ef', mane: '#9d7bff', mane2: '#4fc3ff' }, { golden: true });
    expect(c).toEqual({ body: GOLDEN_BODY, mane: '#9d7bff', mane2: '#4fc3ff' });
  });

  it('palette colours are light enough', () => {
    for (const b of BODY_COLOURS) expect(luminance(b)).toBeGreaterThanOrEqual(0.55);
    for (const m of MANE_COLOURS) expect(luminance(m)).toBeGreaterThanOrEqual(0.25);
    expect(luminance('#ffffff')).toBeCloseTo(1, 3);
    expect(luminance('#000000')).toBeCloseTo(0, 3);
  });

  it('names the adjective colours', () => {
    expect(Object.keys(NAMED_COLOURS).sort()).toEqual(['black', 'blue', 'brown', 'gold', 'green', 'grey', 'orange', 'pink', 'purple', 'red', 'silver', 'white', 'yellow']);
  });
});
```

```ts
// tests/art/tint.test.ts
import { describe, expect, it } from 'vitest';
import { colourForTint, patternLayerStyle, plainLayerStyle, tintLayerStyle } from '../../src/art/tint';

describe('tint styles', () => {
  it('tints with multiply and masks with the same picture, prefixed and unprefixed', () => {
    const s = tintLayerStyle('/a/b.webp', '#ff0000');
    for (const part of ['background-image:url("/a/b.webp")', 'background-size:100% 100%', 'background-color:#ff0000',
      'background-blend-mode:multiply', '-webkit-mask-image:url("/a/b.webp")', 'mask-image:url("/a/b.webp")',
      '-webkit-mask-size:100% 100%', 'mask-size:100% 100%']) expect(s).toContain(part);
  });

  it('plain layers have no blend or mask', () => {
    const s = plainLayerStyle('/a/f.webp');
    expect(s).toContain('background-image:url("/a/f.webp")');
    expect(s).not.toContain('mask');
    expect(s).not.toContain('blend');
  });

  it('pattern layers mask a repeating pattern', () => {
    const s = patternLayerStyle('/a/body.webp', '/a/speckle.webp', 0.5);
    expect(s).toContain('background-repeat:repeat');
    expect(s).toContain('mask-image:url("/a/body.webp")');
    expect(s).toContain('opacity:0.5');
  });

  it('maps tints to colours', () => {
    const c = { body: '#111111', mane: '#222222', mane2: '#333333' };
    expect(colourForTint('body', c)).toBe('#111111');
    expect(colourForTint('mane2', c)).toBe('#333333');
    expect(colourForTint('none', c)).toBeNull();
  });
});
```

```ts
// tests/art/heap.test.ts
import { describe, expect, it } from 'vitest';
import { heapLayout, jarLayout, mulberry32 } from '../../src/art/heap';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('heaps', () => {
  it('mulberry32 is deterministic and in [0, 1)', () => {
    const a = mulberry32(5), b = mulberry32(5);
    for (let i = 0; i < 100; i++) { const v = a(); expect(v).toBe(b()); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });

  it('heapLayout gives count copies inside the box, back to front', () => {
    for (const n of [3, 4, 5]) {
      const h = heapLayout(n, 11);
      expect(h).toHaveLength(n);
      for (const p of h) {
        expect(p.x).toBeGreaterThanOrEqual(0.1); expect(p.x).toBeLessThanOrEqual(0.9);
        expect(p.y).toBeGreaterThanOrEqual(0.1); expect(p.y).toBeLessThanOrEqual(0.9);
        expect(p.scale).toBeGreaterThanOrEqual(0.5); expect(p.scale).toBeLessThanOrEqual(0.62);
        expect(Math.abs(p.rot)).toBeLessThanOrEqual(18);
      }
      const z = h.map((p) => p.z);
      expect(new Set(z).size).toBe(n);
      expect(heapLayout(n, 11)).toEqual(h);
    }
  });

  it('heapLayout refuses counts outside 3 to 5', () => {
    expect(() => heapLayout(2, 1)).toThrow(RangeError);
    expect(() => heapLayout(6, 1)).toThrow(RangeError);
  });

  it('jarLayout keeps every thing countable', () => {
    for (let n = 1; n <= 5; n++) {
      for (let seed = 0; seed < 20; seed++) {
        const j = jarLayout(n, seed);
        expect(j).toHaveLength(n);
        for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) expect(dist(j[a], j[b])).toBeGreaterThanOrEqual(0.22);
      }
    }
    expect(() => jarLayout(0, 1)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd games/moon-meadow-home && npx vitest run tests/art`
Expected: FAIL with `Failed to resolve import "../../src/art/manifest"`.

- [ ] **Step 3: Write the implementation**

`src/art/manifest.ts` (types exactly as in Interfaces, then):

```ts
let current: { m: ArtManifest; base: string } | null = null;

export async function loadArtManifest(base: string = import.meta.env.BASE_URL, file = 'art/manifest.json'): Promise<ArtManifest> {
  const b = base.endsWith('/') ? base : `${base}/`;
  const res = await fetch(`${b}${file}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`art manifest: HTTP ${res.status}`);
  const m = (await res.json()) as ArtManifest;
  if (m.v !== 1) throw new Error(`art manifest: version ${m.v}`);
  setArtManifest(m, b);
  return m;
}

export function setArtManifest(m: ArtManifest, base: string): void {
  current = { m, base: base.endsWith('/') ? base : `${base}/` };
}

function need() {
  if (!current) throw new Error('art manifest not loaded');
  return current;
}

export const artManifest = (): ArtManifest => need().m;
export const artUrl = (src: string): string => `${need().base}art/${src}`;
export const hasPicture = (id: string): boolean => !!current && Object.hasOwn(current.m.pictures, id);
export const picture = (id: string): PictureEntry | undefined => current?.m.pictures[id];
export const background = (id: string): BackgroundEntry | undefined => current?.m.backgrounds[id];

export function pictureIds(kind?: PictureKind): string[] {
  const all = Object.entries(need().m.pictures);
  return all.filter(([, e]) => !kind || e.kind === kind).map(([k]) => k).sort();
}

export function unicornEntry(breed: BreedId, stage: Stage): UnicornEntry {
  const u = need().m.unicorns;
  const e = u[`${breed}.${stage}`] ?? u[`moon.${stage}`] ?? u['moon.baby'];
  if (!e) throw new Error('no unicorn art in the manifest');
  return e;
}
```

`src/art/palette.ts`:

```ts
export type Colours = { body: string; mane: string; mane2: string };
export type Traits = { shiny?: boolean; speckled?: boolean; golden?: boolean; founder?: boolean };
export type ColourWord = 'red' | 'pink' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'brown' | 'black' | 'white' | 'grey' | 'gold' | 'silver';

export const BODY_COLOURS = ['#ffe0ef', '#e6dcff', '#d6f1ff', '#fff3c4', '#dcffe8', '#ffe2cf', '#ffffff', '#f5d9ff'] as const;
export const MANE_COLOURS = ['#ff7fbf', '#9d7bff', '#4fc3ff', '#ffbf3f', '#3fd69a', '#ff8f6b', '#c46bff', '#ff5f8f'] as const;
export const GOLDEN_BODY = '#f7d77c';
export const DEFAULT_COLOURS: Colours = { body: '#e6dcff', mane: '#ff7fbf', mane2: '#3fd69a' };
export const NAMED_COLOURS: Record<ColourWord, string> = {
  red: '#e8505b', pink: '#f48fb1', orange: '#f6a04d', yellow: '#f9d65c', green: '#6cc070', blue: '#5aa9e6',
  purple: '#a77bd6', brown: '#a8754f', black: '#4a4a55', white: '#f7f7f7', grey: '#a7a9b4', gold: '#e8c15a', silver: '#c9ccd6',
};

const HEX = /^#[0-9a-f]{6}$/i;
const pick = <T,>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

export function randomColours(rng: () => number): Colours {
  const body = pick(rng, BODY_COLOURS);
  const mane = pick(rng, MANE_COLOURS);
  let mane2 = pick(rng, MANE_COLOURS);
  if (mane2 === mane) mane2 = MANE_COLOURS[(MANE_COLOURS.indexOf(mane) + 3) % MANE_COLOURS.length];
  return { body, mane, mane2 };
}

export function resolveColours(c: Partial<Colours> | undefined | null, traits: Traits = {}): Colours {
  const ok = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d);
  const out = { body: ok(c?.body, DEFAULT_COLOURS.body), mane: ok(c?.mane, DEFAULT_COLOURS.mane), mane2: ok(c?.mane2, DEFAULT_COLOURS.mane2) };
  if (traits.golden) out.body = GOLDEN_BODY;
  return out;
}

export function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
```

The darkest v2 mane colours are `#9d7bff` (luminance about 0.29) and `#c46bff` (about 0.29), so the mane threshold of 0.25 holds for every v2 colour.

`src/art/tint.ts`:

```ts
import type { Tint } from './manifest';
import type { Colours } from './palette';

const u = (url: string) => `url("${url}")`;

export function tintLayerStyle(url: string, colour: string): string {
  return [`background-image:${u(url)}`, 'background-size:100% 100%', `background-color:${colour}`,
    'background-blend-mode:multiply', `-webkit-mask-image:${u(url)}`, `mask-image:${u(url)}`,
    '-webkit-mask-size:100% 100%', 'mask-size:100% 100%', '-webkit-mask-repeat:no-repeat', 'mask-repeat:no-repeat'].join(';');
}

export function plainLayerStyle(url: string): string {
  return `background-image:${u(url)};background-size:100% 100%;background-repeat:no-repeat`;
}

export function patternLayerStyle(maskUrl: string, patternUrl: string, opacity: number): string {
  return [`background-image:${u(patternUrl)}`, 'background-repeat:repeat', 'background-size:64px 64px',
    `-webkit-mask-image:${u(maskUrl)}`, `mask-image:${u(maskUrl)}`, '-webkit-mask-size:100% 100%', 'mask-size:100% 100%',
    `opacity:${opacity}`].join(';');
}

export function colourForTint(tint: Tint, c: Colours): string | null {
  return tint === 'none' ? null : c[tint];
}
```

`src/art/heap.ts`:

```ts
export type Placement = { x: number; y: number; scale: number; rot: number; z: number };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEAP: Record<number, [number, number][]> = {
  3: [[0.32, 0.66], [0.68, 0.66], [0.5, 0.4]],
  4: [[0.3, 0.68], [0.7, 0.68], [0.38, 0.4], [0.64, 0.42]],
  5: [[0.24, 0.7], [0.5, 0.72], [0.76, 0.7], [0.37, 0.42], [0.63, 0.42]],
};
const JAR: Record<number, [number, number][]> = {
  1: [[0.5, 0.6]],
  2: [[0.33, 0.6], [0.67, 0.6]],
  3: [[0.27, 0.68], [0.73, 0.68], [0.5, 0.36]],
  4: [[0.3, 0.7], [0.7, 0.7], [0.3, 0.36], [0.7, 0.36]],
  5: [[0.25, 0.72], [0.5, 0.72], [0.75, 0.72], [0.37, 0.38], [0.63, 0.38]],
};

function place(t: [number, number][], seed: number, jitter: number, scale: [number, number], rot: number): Placement[] {
  const r = mulberry32(seed);
  const ps = t.map(([x, y]) => ({ x: x + (r() * 2 - 1) * jitter, y: y + (r() * 2 - 1) * jitter,
    scale: scale[0] + r() * (scale[1] - scale[0]), rot: (r() * 2 - 1) * rot, z: 0 }));
  [...ps].sort((a, b) => a.y - b.y).forEach((p, i) => { p.z = i; });
  return ps;
}

export function heapLayout(count: number, seed: number): Placement[] {
  if (!HEAP[count]) throw new RangeError(`heap of ${count}`);
  return place(HEAP[count], seed, 0.04, [0.5, 0.62], 18);
}

export function jarLayout(count: number, seed: number): Placement[] {
  if (!JAR[count]) throw new RangeError(`jar of ${count}`);
  return place(JAR[count], seed, 0.01, count >= 4 ? [0.26, 0.26] : [0.3, 0.3], 10);
}
```

`src/art/Picture.svelte`:

```svelte
<script lang="ts">
  import { artUrl, picture } from './manifest';
  import { tintLayerStyle } from './tint';

  let { id, size, tint = undefined, label = undefined, silhouette = false }:
    { id: string; size: number; tint?: string; label?: string; silhouette?: boolean } = $props();

  const e = $derived(picture(id));
  const k = $derived(e ? size / Math.max(e.w, e.h) : 0);
  const src = $derived(e ? artUrl(silhouette && e.sil ? e.sil : e.src) : '');
</script>

{#if e}
  {#if e.tint && !silhouette}
    <div class="pic" role="img" aria-label={label ?? id}
      style="width:{e.w * k}px;height:{e.h * k}px;{tintLayerStyle(src, tint ?? e.tint.default)}"></div>
  {:else}
    <img class="pic" src={src} alt={label ?? id} width={e.w * k} height={e.h * k} draggable="false" />
  {/if}
{/if}

<style>
  .pic { display: block; pointer-events: none; user-select: none; -webkit-user-drag: none; }
</style>
```

`src/art/Heap.svelte`:

```svelte
<script lang="ts">
  import Picture from './Picture.svelte';
  import { heapLayout, jarLayout } from './heap';

  let { id, count, size, seed = 1, tint = undefined, label = undefined, mode = 'heap' }:
    { id: string; count: number; size: number; seed?: number; tint?: string; label?: string; mode?: 'heap' | 'jar' } = $props();

  const places = $derived(mode === 'jar' ? jarLayout(count, seed) : heapLayout(count, seed));
</script>

<div class="heap" role="img" aria-label={label ?? `${count} ${id}`} style="width:{size}px;height:{size}px">
  {#each places as p, i (i)}
    <div class="copy" style="left:{p.x * size}px;top:{p.y * size}px;z-index:{p.z};transform:translate(-50%,-50%) rotate({p.rot}deg)">
      <Picture {id} size={p.scale * size} {tint} label="" />
    </div>
  {/each}
</div>

<style>
  .heap { position: relative; pointer-events: none; }
  .copy { position: absolute; }
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd games/moon-meadow-home && npx vitest run tests/art && npx svelte-check --threshold error`
Expected: PASS, and `svelte-check` reports 0 errors.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/art games/moon-meadow-home/tests/art
git commit -m "Add the art manifest loader, palette, tint styles and heap layouts"
```

### Task A7: Unicorn colour classes and shade layers

**Files:**
- Create: `tools/art/regions.py`
- Test: `tools/art/tests/test_regions.py`

**Interfaces:**
- Consumes: `imageops.unmatte_white`, `imageops.label_components`, `imageops.dilate` (A1).
- Produces:
  - `regions.BG, BODY, MANE, MANE2, FIXED = 0, 1, 2, 3, 4`
  - `regions.classify(rgba: Image.Image) -> np.ndarray` (uint8 class per pixel)
  - `regions.class_shares(classes: np.ndarray) -> dict[str, float]` (keys `body`, `mane`, `mane2`, `fixed`, shares of the foreground)
  - `regions.extract_layers(rgba: Image.Image, classes: np.ndarray) -> dict[str, Image.Image]` (keys `body`, `mane`, `mane2` are greyscale shade RGBA, `fixed` is colour RGBA, all full frame)
  - `regions.recolour(layers: dict[str, Image.Image], colours: dict[str, tuple[int, int, int]]) -> Image.Image` (Python copy of the browser's multiply, for checks and contact sheets)
  - `regions.horn_variant(fixed: Image.Image, classes: np.ndarray, horn: str) -> Image.Image` (`gold` keeps it; `bronze`, `silver`, `pearl` change the highest gold component)
  - `regions.CANON = {'body': (217, 198, 240), 'mane': (244, 163, 193), 'mane2': (143, 211, 191)}`

Classification, in order:
1. Foreground is `alpha > 0` after `unmatte_white`.
2. HSV per pixel. Confident classes: BODY for hue 245 to 305 degrees with saturation 0.06 to 0.5 and value at least 0.62. MANE for hue 315 to 360 or 0 to 15 with saturation at least 0.22 and value at least 0.62. MANE2 for hue 135 to 195 with saturation at least 0.18 and value at least 0.55. Everything else with value at least 0.62 is FIXED (gold, cream, peach, white).
3. Eyes: components of pixels with value below 0.35 and an area of at least 40 pixels, dilated by 2 pixels, are FIXED.
4. Small MANE or MANE2 components (below 1.5 percent of all mane pixels: cheeks, inner ears) become FIXED.
5. Every remaining unclassified foreground pixel (outlines, anti-aliasing) takes the class of the nearest classified pixel, by repeated 3 x 3 dilation of each class map, at most 12 rounds; what is still left becomes FIXED.

Shade for a tinted class: `L / p95(L in class)` clipped to 0..1, where `L` is the mean of R, G and B, written as grey RGB with the class mask times the original alpha as alpha.

- [ ] **Step 1: Write the failing test**

```python
# tools/art/tests/test_regions.py
import unittest

import numpy as np
from PIL import Image, ImageDraw

from art import regions
from art.imageops import unmatte_white

C = regions.CANON
GOLD = (226, 178, 80)


def toy_unicorn():
    im = Image.new('RGB', (400, 300), (255, 255, 255))
    d = ImageDraw.Draw(im)
    d.ellipse([20, 120, 120, 220], fill=C['mane'], outline=(200, 100, 140), width=4)   # tail
    d.ellipse([100, 100, 300, 240], fill=C['body'], outline=(150, 120, 180), width=5)  # body
    d.ellipse([230, 40, 330, 140], fill=C['body'], outline=(150, 120, 180), width=5)   # head
    d.rectangle([200, 60, 240, 130], fill=C['mane'], outline=(200, 100, 140), width=3)  # mane
    d.rectangle([205, 70, 235, 90], fill=C['mane2'])                                    # streak
    d.polygon([(285, 45), (300, 2), (312, 45)], fill=GOLD, outline=(170, 120, 40))      # horn
    d.ellipse([280, 80, 296, 96], fill=(40, 20, 60))                                     # eye
    d.ellipse([300, 105, 312, 113], fill=(240, 170, 190))                                # cheek
    for x in (130, 170, 230, 260):
        d.rectangle([x, 232, x + 16, 262], fill=GOLD, outline=(170, 120, 40))           # hooves
    return unmatte_white(im)


class RegionsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rgba = toy_unicorn()
        cls.cls = regions.classify(cls.rgba)

    def at(self, x, y):
        return int(self.cls[y, x])

    def test_classes(self):
        self.assertEqual(self.at(180, 170), regions.BODY)
        self.assertEqual(self.at(220, 115), regions.MANE)
        self.assertEqual(self.at(220, 80), regions.MANE2)
        self.assertEqual(self.at(298, 30), regions.FIXED)   # horn
        self.assertEqual(self.at(288, 88), regions.FIXED)   # eye
        self.assertEqual(self.at(306, 109), regions.FIXED)  # cheek, a small pink blob
        self.assertEqual(self.at(60, 170), regions.MANE)    # tail
        self.assertEqual(self.at(0, 0), regions.BG)

    def test_outlines_follow_their_fill(self):
        self.assertEqual(self.at(102, 170), regions.BODY)
        self.assertEqual(self.at(22, 170), regions.MANE)

    def test_shares(self):
        s = regions.class_shares(self.cls)
        self.assertGreater(s['body'], 0.4)
        self.assertGreater(s['mane'], 0.1)
        self.assertAlmostEqual(sum(s.values()), 1.0, places=5)

    def test_shade_is_light_inside_and_dark_on_the_outline(self):
        layers = regions.extract_layers(self.rgba, self.cls)
        body = np.asarray(layers['body'])
        self.assertGreater(body[170, 180, 0], 235)
        self.assertLess(body[170, 102, 0], 200)
        self.assertEqual(body[30, 298, 3], 0)                    # horn is not in the body layer
        self.assertEqual(np.asarray(layers['fixed'])[30, 298, 3], 255)

    def test_recolour_round_trip(self):
        layers = regions.extract_layers(self.rgba, self.cls)
        back = np.asarray(regions.recolour(layers, C)).astype(int)
        orig = np.asarray(self.rgba).astype(int)
        m = self.cls == regions.BODY
        self.assertLess(np.abs(back[m][:, :3] - orig[m][:, :3]).mean(), 12)

    def test_recolour_changes_mane(self):
        layers = regions.extract_layers(self.rgba, self.cls)
        blue = regions.recolour(layers, {**C, 'mane': (79, 195, 255)})
        r, g, b, a = blue.getpixel((220, 115))
        self.assertGreater(b, r)

    def test_horn_variant(self):
        layers = regions.extract_layers(self.rgba, self.cls)
        silver = regions.horn_variant(layers['fixed'], self.cls, 'silver')
        r, g, b, _ = silver.getpixel((298, 30))
        self.assertLess(max(r, g, b) - min(r, g, b), 30)
        hoof = silver.getpixel((138, 250))
        self.assertEqual(hoof, layers['fixed'].getpixel((138, 250)))  # hooves keep their gold


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_regions.py' -v`
Expected: FAIL with `cannot import name 'regions'`.

- [ ] **Step 3: Write the implementation**

`tools/art/regions.py`:

```python
import numpy as np
from PIL import Image

from .imageops import dilate, label_components

BG, BODY, MANE, MANE2, FIXED = 0, 1, 2, 3, 4
NAMES = {BODY: 'body', MANE: 'mane', MANE2: 'mane2', FIXED: 'fixed'}
CANON = {'body': (217, 198, 240), 'mane': (244, 163, 193), 'mane2': (143, 211, 191)}
HORN = {'bronze': (196, 132, 82), 'silver': (205, 208, 216), 'pearl': (242, 236, 228)}


def _hsv(rgb: np.ndarray):
    r, g, b = [rgb[..., i] / 255.0 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    v, d = mx, mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(v)
    nz = d > 1e-6
    rc = np.where(nz, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(nz, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(nz, (mx - b) / np.maximum(d, 1e-6), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2 + rc - bc, 4 + gc - rc))
    h = np.where(nz, (h / 6.0) % 1.0, 0) * 360
    return h, s, v


def classify(rgba: Image.Image) -> np.ndarray:
    a = np.asarray(rgba.convert('RGBA'))
    fg = a[..., 3] > 0
    h, s, v = _hsv(a[..., :3].astype(np.float32))
    cls = np.zeros(fg.shape, np.uint8)
    body = fg & (h >= 245) & (h <= 305) & (s >= 0.06) & (s <= 0.5) & (v >= 0.62)
    mane = fg & ((h >= 315) | (h <= 15)) & (s >= 0.22) & (v >= 0.62)
    mane2 = fg & (h >= 135) & (h <= 195) & (s >= 0.18) & (v >= 0.55)
    cls[body], cls[mane], cls[mane2] = BODY, MANE, MANE2
    rest = fg & (cls == 0) & (v >= 0.62)
    cls[rest] = FIXED
    dark = fg & (v < 0.35)
    lab, n = label_components(dark)
    areas = np.bincount(lab.ravel(), minlength=n + 1)
    eyes = np.isin(lab, [k for k in range(1, n + 1) if areas[k] >= 40])
    cls[dilate(eyes, 2) & fg] = FIXED
    for c in (MANE, MANE2):
        total = (cls == MANE).sum() + (cls == MANE2).sum()
        lab, n = label_components(cls == c)
        areas = np.bincount(lab.ravel(), minlength=n + 1)
        small = [k for k in range(1, n + 1) if areas[k] < 0.015 * total]
        cls[np.isin(lab, small)] = FIXED
    unknown = fg & (cls == 0)
    for _ in range(12):
        if not unknown.any():
            break
        for c in (BODY, MANE, MANE2, FIXED):
            grow = dilate(cls == c, 1) & unknown
            cls[grow] = c
            unknown &= ~grow
    cls[unknown] = FIXED
    return cls


def class_shares(classes: np.ndarray) -> dict[str, float]:
    total = max(1, int((classes > 0).sum()))
    return {name: float((classes == k).sum()) / total for k, name in NAMES.items()}


def extract_layers(rgba: Image.Image, classes: np.ndarray) -> dict[str, Image.Image]:
    a = np.asarray(rgba.convert('RGBA')).astype(np.float32)
    lum = a[..., :3].mean(-1)
    out = {}
    for k in (BODY, MANE, MANE2):
        m = classes == k
        ref = np.percentile(lum[m], 95) if m.any() else 255.0
        shade = np.clip(lum / max(ref, 1.0), 0, 1) * 255
        layer = np.zeros(a.shape, np.uint8)
        layer[..., 0] = layer[..., 1] = layer[..., 2] = shade.astype(np.uint8)
        layer[..., 3] = np.where(m, a[..., 3], 0).astype(np.uint8)
        out[NAMES[k]] = Image.fromarray(layer, 'RGBA')
    fixed = a.copy()
    fixed[..., 3] = np.where(classes == FIXED, a[..., 3], 0)
    out['fixed'] = Image.fromarray(fixed.astype(np.uint8), 'RGBA')
    return out


def recolour(layers: dict[str, Image.Image], colours: dict[str, tuple[int, int, int]]) -> Image.Image:
    base = layers['fixed']
    out = Image.new('RGBA', base.size, (0, 0, 0, 0))
    for name in ('body', 'mane', 'mane2'):
        s = np.asarray(layers[name]).astype(np.float32)
        col = np.array(colours[name], np.float32)
        rgb = s[..., :3] / 255.0 * col
        tinted = np.dstack([rgb, s[..., 3]]).astype(np.uint8)
        out.alpha_composite(Image.fromarray(tinted, 'RGBA'))
    out.alpha_composite(base)
    return out


def horn_variant(fixed: Image.Image, classes: np.ndarray, horn: str) -> Image.Image:
    if horn == 'gold':
        return fixed
    a = np.asarray(fixed).astype(np.float32)
    h, s, v = _hsv(a[..., :3])
    gold = (a[..., 3] > 0) & (h >= 25) & (h <= 60) & (s >= 0.25)
    lab, n = label_components(gold)
    if n == 0:
        return fixed
    tops = {k: np.nonzero(lab == k)[0].min() for k in range(1, n + 1)}
    horn_mask = lab == min(tops, key=tops.get)
    lum = a[..., :3].mean(-1)
    ref = np.percentile(lum[horn_mask], 95)
    target = np.array(HORN[horn], np.float32)
    shade = np.clip(lum / max(ref, 1.0), 0, 1)[..., None]
    a[..., :3] = np.where(horn_mask[..., None], shade * target, a[..., :3])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_regions.py' -v`
Expected: PASS, 7 tests.

- [ ] **Step 5: Check it on the real reference baby**

Write a scratchpad script that runs `classify` on `unmatte_white(Image.open(paths.STYLE_REF))`, prints `class_shares`, writes a false-colour class map PNG (body blue, mane red, mane2 green, fixed yellow) and `recolour` with four palettes: canonical; `#ffffff / #4fc3ff / #ffbf3f`; `#d6f1ff / #9d7bff / #ff8f6b`; `#fff3c4 / #3fd69a / #ff5f8f`, into `$TMPDIR/regions/`. Open each PNG with the Read tool.
Expected: shares near body 0.45 to 0.6, mane 0.2 to 0.35, mane2 0.05 to 0.15, fixed 0.05 to 0.15. The class map shows eyes, horn, hooves, muzzle, cheeks and inner ears as fixed, and no body outline painted in mane colour. If a class leaks, tune only the HSV bounds in step 2 of the classification and add the failing pixel as an assertion in `test_classes` before changing the code.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/tools/art/regions.py games/moon-meadow-home/tools/art/tests/test_regions.py
git commit -m "Add unicorn colour classes and shade layers"
```

### Task A8: Sprite rig builder, derived pictures and placeholders

**Files:**
- Create: `tools/art/rig.py`, `tools/art/derive.py`, `tools/art/placeholder.py`, `art-src/lists/anchor-overrides.json` (starts as `{}`), `art-src/lists/rig-mode.json` (starts as `{"mode": "sprite", "why": "default until the layer spike passes"}`)
- Modify: `tools/art/pipeline.py` (commands `sprite` and `derive`, and `placeholder`)
- Test: `tools/art/tests/test_rig.py`, `tools/art/tests/test_derive.py`

**Interfaces:**
- Consumes: `regions.*` (A7), `imageops.*` (A1), manifest shapes (A5, A6).
- Produces:
  - `rig.LG_H = 720`, `rig.SM_H = 300`, `rig.DriftError(Exception)`
  - `rig.build_sprite(rgba: Image.Image, breed: str, stage: str, horn: str, out_dir: Path, overrides: dict | None = None) -> dict` (a `UnicornEntry` as JSON, files written to `out_dir` with names `<breed>.<stage>.<sm|lg>.<layer>.webp` and `<breed>.<stage>.sil.webp`; `src` values are relative to `public/art`, starting with `unicorns/`)
  - `rig.find_anchors(classes: np.ndarray, rgba: Image.Image) -> dict[str, tuple[int, int]]`
  - `derive.speckle_pattern(out: Path) -> Path` (128 x 128 tile)
  - `derive.sky_unicorn(sil: Image.Image, out: Path) -> Path`
  - `derive.silhouette(im: Image.Image, colour: tuple[int, int, int] = (108, 90, 142)) -> Image.Image`
  - `derive.lumi_mouth(closed: Image.Image, open_: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]] | None` (overlay and its box, or `None` when the two pictures do not line up)
  - `placeholder.build(out_dir: Path) -> dict` (a manifest with `moon.baby`, `moon.foal` and `pebble.baby` placeholders, 12 layers each, `source: "placeholder"`, written to `public/art/placeholder/manifest.json` with files in `public/art/placeholder/`)

Sprite rules:
- Frame: the trimmed unicorn plus 2 percent padding. The lg frame is the frame scaled by `min(1, LG_H / frame height)`; `w` and `h` are its size and every box, pivot and anchor in the entry is in lg frame pixels, as lists of ints. `renditions.lg.scale` is 1 and `renditions.sm.scale` is `min(1, SM_H / h)`: file pixels per lg frame pixel.
- Parts in draw order: `tail` (anim `tail`, pivot at the tail root, layers `tail-mane` and `tail-mane2` when present), `body` (anim `none`, pivot at `feet`, layers `body`, `mane`, `mane2`, `fixed`, each cropped to its own bounding box), `lids` (anim `blink`, `hidden: true`, one layer `lids` with tint `body`).
- Tail: the connected component of MANE or MANE2 pixels (taken together) with the smallest centroid x, if that x is left of the BODY class centroid. The tail root is the tail pixel nearest the BODY centroid.
- Lids: for each eye (dark components from the classification, largest first, a second one only if it is at least 15 percent of the first), an ellipse 15 percent larger than the eye box, filled with the median body shade in a 6 px ring around the eye, with a dark lash line (shade 40) along its lower third.
- Anchors: `eye` centre of the largest eye; `hornBase` bottom centre of the highest gold component; `head` = `hornBase` moved left by 6 percent of the frame width; `feet` = (centre x of the gold components in the lowest 15 percent, bottom y of the alpha); `tailRoot` = the tail pivot; `flank` = the BODY centroid; `back` = the highest BODY pixel in the BODY centroid column; `mane` = the centroid of the largest non-tail mane component; `neck` = the point 40 percent of the way from `eye` to `flank`. Values in `anchor-overrides.json` (`{"<breed>.<stage>": {"neck": [x, y]}}`, lg frame pixels) replace computed ones.
- `headBox`: a square centred on `eye` moved left by 4 percent of the frame width, with side 55 percent of the frame height, clipped to the frame.

- [ ] **Step 1: Write the failing tests**

```python
# tools/art/tests/test_rig.py
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from art import rig
from art.tests.test_regions import toy_unicorn


class RigTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name) / 'unicorns'
        cls.entry = rig.build_sprite(toy_unicorn(), 'moon', 'baby', 'gold', cls.out)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_entry_shape(self):
        e = self.entry
        self.assertEqual((e['breed'], e['stage'], e['mode']), ('moon', 'baby', 'sprite'))
        self.assertEqual(json.loads(json.dumps(e)), e)
        lg = e['renditions']['lg']
        self.assertEqual([p['id'] for p in lg['parts']], ['tail', 'body', 'lids'])
        self.assertEqual([l['tint'] for l in lg['parts'][1]['layers']], ['body', 'mane', 'mane2', 'none'])
        self.assertTrue(lg['parts'][2]['hidden'])
        self.assertEqual(lg['parts'][2]['anim'], 'blink')

    def test_never_upscales_and_sm_is_smaller(self):
        r = self.entry['renditions']
        self.assertLessEqual(r['sm']['scale'], r['lg']['scale'])
        self.assertLessEqual(r['lg']['scale'], 1)

    def test_files_exist_and_match_boxes(self):
        for name in ('sm', 'lg'):
            r = self.entry['renditions'][name]
            for part in r['parts']:
                for layer in part['layers']:
                    p = self.out.parent / layer['src']
                    self.assertTrue(p.exists(), p)
                    w, h = Image.open(p).size
                    self.assertAlmostEqual(w, layer['box'][2] * r['scale'], delta=2)
                    self.assertAlmostEqual(h, layer['box'][3] * r['scale'], delta=2)
        self.assertTrue((self.out.parent / self.entry['sil']).exists())

    def test_layers_sit_inside_their_part(self):
        for part in self.entry['renditions']['lg']['parts']:
            px, py, pw, ph = part['box']
            for layer in part['layers']:
                x, y, w, h = layer['box']
                self.assertGreaterEqual(x, px)
                self.assertGreaterEqual(y, py)
                self.assertLessEqual(x + w, px + pw)
                self.assertLessEqual(y + h, py + ph)

    def test_anchors(self):
        a = self.entry['anchors']
        self.assertLess(a['tailRoot'][0], a['flank'][0])
        self.assertLess(a['hornBase'][1], a['eye'][1])
        self.assertGreater(a['feet'][1], a['flank'][1])
        self.assertAlmostEqual(a['feet'][1], self.entry['h'], delta=12)
        tail = self.entry['renditions']['lg']['parts'][0]
        self.assertEqual(tuple(tail['pivot']), tuple(a['tailRoot']))

    def test_overrides_win(self):
        with tempfile.TemporaryDirectory() as d:
            e = rig.build_sprite(toy_unicorn(), 'moon', 'baby', 'gold', Path(d) / 'unicorns',
                                 overrides={'moon.baby': {'neck': [10, 20]}})
            self.assertEqual(e['anchors']['neck'], [10, 20])


if __name__ == '__main__':
    unittest.main()
```

```python
# tools/art/tests/test_derive.py
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from art import derive, placeholder


class DeriveTest(unittest.TestCase):
    def test_silhouette_keeps_alpha_and_flattens_colour(self):
        im = Image.new('RGBA', (50, 50), (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse([10, 10, 40, 40], fill=(250, 100, 100, 255))
        s = np.asarray(derive.silhouette(im))
        self.assertEqual(tuple(s[25, 25]), (108, 90, 142, 255))
        self.assertEqual(s[0, 0, 3], 0)

    def test_speckle_tile(self):
        with tempfile.TemporaryDirectory() as d:
            p = derive.speckle_pattern(Path(d) / 'speckle.webp')
            im = Image.open(p)
            self.assertEqual(im.size, (128, 128))
            a = np.asarray(im.convert('RGBA'))[..., 3]
            self.assertTrue(0.05 < (a > 0).mean() < 0.3)

    def test_lumi_mouth_overlay_only_covers_the_change(self):
        closed = Image.new('RGBA', (200, 200), (240, 230, 250, 255))
        open_ = closed.copy()
        ImageDraw.Draw(open_).ellipse([90, 140, 110, 155], fill=(120, 40, 60, 255))
        overlay, box = derive.lumi_mouth(closed, open_)
        x, y, w, h = box
        self.assertTrue(80 <= x <= 92 and 130 <= y <= 142 and w <= 40 and h <= 35)
        self.assertEqual(overlay.size, (w, h))

    def test_lumi_mouth_refuses_drifted_pictures(self):
        closed = Image.new('RGBA', (200, 200), (240, 230, 250, 255))
        ImageDraw.Draw(closed).rectangle([20, 20, 180, 60], fill=(30, 30, 30, 255))
        moved = Image.new('RGBA', (200, 200), (240, 230, 250, 255))
        ImageDraw.Draw(moved).rectangle([20, 100, 180, 140], fill=(30, 30, 30, 255))
        self.assertIsNone(derive.lumi_mouth(closed, moved))


class PlaceholderTest(unittest.TestCase):
    def test_placeholder_manifest_has_twelve_layers(self):
        with tempfile.TemporaryDirectory() as d:
            m = placeholder.build(Path(d))
            u = m['unicorns']['moon.baby']
            self.assertEqual(u['source'], 'placeholder')
            n = sum(len(p['layers']) for p in u['renditions']['sm']['parts'])
            self.assertEqual(n, 12)
            for p in u['renditions']['sm']['parts']:
                for l in p['layers']:
                    self.assertTrue((Path(d) / l['src'].removeprefix('placeholder/')).exists())


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_[rd]*.py' -v`
Expected: FAIL with `cannot import name 'rig'`.

- [ ] **Step 3: Write the implementation**

`tools/art/rig.py`:

```python
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import regions
from .derive import silhouette
from .imageops import label_components, save_webp, trim

LG_H, SM_H = 720, 300


class DriftError(Exception):
    pass


def _frame(rgba: Image.Image) -> Image.Image:
    t, _ = trim(rgba)
    pad = round(0.02 * max(t.size))
    f = Image.new('RGBA', (t.width + 2 * pad, t.height + 2 * pad), (0, 0, 0, 0))
    f.alpha_composite(t, (pad, pad))
    return f


def _comps(mask: np.ndarray, min_area: int = 1):
    lab, n = label_components(mask)
    out = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(xs) >= min_area:
            out.append((xs, ys))
    return out


def _eyes(a: np.ndarray):
    v = a[..., :3].max(-1) / 255.0
    comps = sorted(_comps((a[..., 3] > 0) & (v < 0.35), 40), key=lambda c: -len(c[0]))
    if not comps:
        return []
    keep = [comps[0]]
    if len(comps) > 1 and len(comps[1][0]) >= 0.15 * len(comps[0][0]):
        keep.append(comps[1])
    return keep


def _gold(a: np.ndarray) -> np.ndarray:
    h, s, _ = regions._hsv(a[..., :3].astype(np.float32))
    return (a[..., 3] > 0) & (h >= 25) & (h <= 60) & (s >= 0.25)


def _tail(classes: np.ndarray):
    """Returns (tail mask or None, tail root or None, the other mane components)."""
    comps = _comps((classes == regions.MANE) | (classes == regions.MANE2), 50)
    by, bx = np.nonzero(classes == regions.BODY)
    cx, cy = bx.mean(), by.mean()
    if not comps:
        return None, None, []
    c = min(comps, key=lambda c: c[0].mean())
    if c[0].mean() >= cx:
        return None, None, comps
    i = int(np.argmin((c[0] - cx) ** 2 + (c[1] - cy) ** 2))
    m = np.zeros(classes.shape, bool)
    m[c[1], c[0]] = True
    return m, (int(c[0][i]), int(c[1][i])), [x for x in comps if x is not c]


def find_anchors(classes: np.ndarray, rgba: Image.Image) -> dict[str, tuple[int, int]]:
    a = np.asarray(rgba.convert('RGBA'))
    H, W = classes.shape
    eyes = _eyes(a)
    eye = (int(eyes[0][0].mean()), int(eyes[0][1].mean())) if eyes else (int(W * 0.75), int(H * 0.3))
    golds = _comps(_gold(a), 20)
    top = min(golds, key=lambda c: c[1].min()) if golds else None
    horn = (int(top[0].mean()), int(top[1].max())) if top else (eye[0], int(H * 0.1))
    bottom = int(np.nonzero(a[..., 3] > 0)[0].max())
    low = [c for c in golds if c[1].mean() > 0.85 * H]
    feet = (int(np.mean([c[0].mean() for c in low])) if low else W // 2, bottom)
    by, bx = np.nonzero(classes == regions.BODY)
    flank = (int(bx.mean()), int(by.mean()))
    col = by[bx == flank[0]]
    back = (flank[0], int(col.min()) if len(col) else flank[1])
    _, root, others = _tail(classes)
    tail_root = root or (int(bx.min()), flank[1])
    big = max(others, key=lambda c: len(c[0])) if others else None
    mane = (int(big[0].mean()), int(big[1].mean())) if big is not None else horn
    neck = (round(eye[0] + 0.4 * (flank[0] - eye[0])), round(eye[1] + 0.4 * (flank[1] - eye[1])))
    head = (round(horn[0] - 0.06 * W), horn[1])
    return {'head': head, 'hornBase': horn, 'eye': eye, 'neck': neck, 'back': back, 'mane': mane,
            'flank': flank, 'tailRoot': tail_root, 'feet': feet}


def _lids(a: np.ndarray, body_shade: Image.Image) -> Image.Image | None:
    eyes = _eyes(a)
    if not eyes:
        return None
    H, W = a.shape[:2]
    shade = np.asarray(body_shade)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for xs, ys in eyes:
        cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        rx, ry = (xs.max() - xs.min()) / 2 * 1.15 + 1, (ys.max() - ys.min()) / 2 * 1.15 + 1
        y0, y1 = max(0, int(cy - ry - 6)), min(H, int(cy + ry + 7))
        x0, x1 = max(0, int(cx - rx - 6)), min(W, int(cx + rx + 7))
        patch = shade[y0:y1, x0:x1]
        vals = patch[patch[..., 3] > 0][:, 0]
        g = int(np.median(vals)) if len(vals) else 220
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(g, g, g, 255))
        d.arc([cx - rx, cy - ry * 0.4, cx + rx, cy + ry * 1.1], 20, 160, fill=(40, 40, 40, 255),
              width=max(2, int(ry * 0.25)))
    return img


def _box(img: Image.Image):
    b = img.getchannel('A').getbbox()
    return None if b is None else (b[0], b[1], b[2] - b[0], b[3] - b[1])


def _scaled(p, k):
    return [round(v * k) for v in p]


def build_sprite(rgba: Image.Image, breed: str, stage: str, horn: str, out_dir: Path,
                 overrides: dict | None = None) -> dict:
    frame = _frame(rgba)
    cls = regions.classify(frame)
    sh = regions.class_shares(cls)
    if sh['body'] < 0.3 or sh['mane'] + sh['mane2'] < 0.15:
        raise DriftError(f'{breed}.{stage}: colour shares {sh}')
    layers = regions.extract_layers(frame, cls)
    layers['fixed'] = regions.horn_variant(layers['fixed'], cls, horn)
    a = np.asarray(frame)
    H, W = cls.shape
    tail_mask, root, _ = _tail(cls)
    body_layers, tail_layers = [], []
    for name, tint in (('body', 'body'), ('mane', 'mane'), ('mane2', 'mane2'), ('fixed', 'none')):
        arr = np.asarray(layers[name]).copy()
        if tail_mask is not None and name in ('mane', 'mane2'):
            t = arr.copy()
            t[..., 3] = np.where(tail_mask, arr[..., 3], 0)
            arr[..., 3] = np.where(tail_mask, 0, arr[..., 3])
            if t[..., 3].any():
                tail_layers.append((f'tail-{name}', Image.fromarray(t, 'RGBA'), name))
        if arr[..., 3].any():
            body_layers.append((name, Image.fromarray(arr, 'RGBA'), tint))
    lids = _lids(a, layers['body'])
    anchors = find_anchors(cls, frame)
    lg = min(1.0, LG_H / H)
    w, h = round(W * lg), round(H * lg)
    sm = min(1.0, SM_H / h)
    plan = []
    if tail_layers:
        plan.append(('tail', 'tail', False, anchors['tailRoot'], tail_layers))
    plan.append(('body', 'none', False, anchors['feet'], body_layers))
    if lids is not None:
        plan.append(('lids', 'blink', True, anchors['eye'], [('lids', lids, 'body')]))
    out_dir.mkdir(parents=True, exist_ok=True)
    renditions = {}
    for rname, k in (('sm', sm), ('lg', 1.0)):
        parts = []
        for pid, anim, hidden, pivot, lays in plan:
            out_layers = []
            for name, img, tint in lays:
                x, y, bw, bh = _box(img)
                box = _scaled((x, y, bw, bh), lg)
                size = (max(1, round(box[2] * k)), max(1, round(box[3] * k)))
                fname = f'{breed}.{stage}.{rname}.{name}.webp'
                save_webp(img.crop((x, y, x + bw, y + bh)).resize(size, Image.LANCZOS), out_dir / fname, quality=90)
                out_layers.append({'src': f'unicorns/{fname}', 'tint': tint, 'box': box})
            xs = [l['box'][0] for l in out_layers] + [l['box'][0] + l['box'][2] for l in out_layers]
            ys = [l['box'][1] for l in out_layers] + [l['box'][1] + l['box'][3] for l in out_layers]
            part = {'id': pid, 'box': [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)],
                    'pivot': _scaled(pivot, lg), 'anim': anim, 'layers': out_layers}
            if hidden:
                part['hidden'] = True
            parts.append(part)
        renditions[rname] = {'scale': round(k, 4), 'parts': parts}
    union = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    union.putalpha(frame.getchannel('A'))
    sil = silhouette(union).resize((max(1, round(w * sm)), max(1, round(h * sm))), Image.LANCZOS)
    save_webp(sil, out_dir / f'{breed}.{stage}.sil.webp', quality=85)
    anch = {k2: _scaled(v, lg) for k2, v in anchors.items()}
    for k2, v in ((overrides or {}).get(f'{breed}.{stage}', {})).items():
        anch[k2] = list(v)
    side = round(0.55 * h)
    hx = min(max(0, round(anch['eye'][0] - 0.04 * w - side / 2)), max(0, w - side))
    hy = min(max(0, round(anch['eye'][1] - side / 2)), max(0, h - side))
    return {'breed': breed, 'stage': stage, 'mode': 'sprite', 'w': w, 'h': h, 'anchors': anch,
            'headBox': [hx, hy, side, side], 'renditions': renditions,
            'sil': f'unicorns/{breed}.{stage}.sil.webp', 'source': 'codex'}
```

With this code `DriftError` exists from the start; Task A11 step 1 then only adds its test.

`tools/art/derive.py`:

```python
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .imageops import save_webp


def silhouette(im: Image.Image, colour=(108, 90, 142)) -> Image.Image:
    a = np.asarray(im.convert('RGBA'))[..., 3]
    out = np.zeros((*a.shape, 4), np.uint8)
    out[..., :3] = colour
    out[..., 3] = a
    return Image.fromarray(out, 'RGBA')


def speckle_pattern(out: Path) -> Path:
    rng = np.random.default_rng(3)
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for _ in range(26):
        x, y, r = rng.integers(0, 128), rng.integers(0, 128), rng.integers(3, 7)
        for dx in (-128, 0, 128):          # wrap so the tile repeats without seams
            for dy in (-128, 0, 128):
                d.ellipse([x + dx - r, y + dy - r, x + dx + r, y + dy + r], fill=(150, 110, 80, 200))
    save_webp(im, out, quality=90)
    return out


def sky_unicorn(sil: Image.Image, out: Path) -> Path:
    a = sil.getchannel('A')
    glow = a.filter(ImageFilter.GaussianBlur(8))
    core = Image.new('RGBA', sil.size, (207, 227, 255, 0))
    core.putalpha(Image.eval(a, lambda v: v * 0.55))
    halo = Image.new('RGBA', sil.size, (160, 200, 255, 0))
    halo.putalpha(glow)
    halo.alpha_composite(core)
    save_webp(halo, out, quality=88)
    return out


def lumi_mouth(closed: Image.Image, open_: Image.Image):
    a = np.asarray(closed.convert('RGBA')).astype(int)
    b = np.asarray(open_.convert('RGBA').resize(closed.size)).astype(int)
    diff = np.abs(a[..., :3] - b[..., :3]).sum(-1) > 60
    if diff.mean() > 0.05:
        return None
    ys, xs = np.nonzero(diff)
    if len(xs) == 0:
        return None
    pad = 8
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
    x1, y1 = min(a.shape[1], xs.max() + pad + 1), min(a.shape[0], ys.max() + pad + 1)
    box = (int(x0), int(y0), int(x1 - x0), int(y1 - y0))
    return open_.convert('RGBA').resize(closed.size).crop((x0, y0, x1, y1)), box
```

`tools/art/placeholder.py` draws, with Pillow, greyscale ellipses for 12 layers at a 400 x 330 frame (sm scale 0.75, lg scale 1): parts `tail` (layers `tail-mane`, `tail-mane2`), `legBL`, `legBR`, `legFL`, `legFR` (one `body` layer each, anim `leg`), `body` (layers `body`, `mane`, `mane2`, `fixed`), `lids` (one), `horn` (one `none` layer). That is 2 + 4 + 4 + 1 + 1 = 12. It writes the files and returns a manifest dict with `pictures` holding `decor-moonflower` (a blue circle) and `backgrounds` holding `bg-meadow` (a green gradient, 1770 x 1230), so the stress page runs before any Codex art exists. `src` values start with `placeholder/`.

Pipeline commands:
- `sprite --breed X --stage baby|foal [--source path]`: loads the source (for `moon.baby` without `--source`: `paths.STYLE_REF`; otherwise `art-src/raw/<breed>-<stage>.png`), `unmatte_white`, checks `class_shares` (body at least 0.3, mane plus mane2 at least 0.15, else exit 1 with "colours drifted, regenerate"), `build_sprite` with the horn from `breeds.txt`, writes `art-src/meta/unicorn-<breed>-<stage>.json` as `{"unicorns": {key: entry}}`, a lossless source copy to `art-src/sources/<breed>-<stage>.webp`, a recolour contact PNG with the four palettes of Task A7 and an anchor debug PNG (dots and labels on the lg frame) to `art-src/work/contact/`, and `review.init('unicorn-<breed>-<stage>', [key])`.
- `derive`: `speckle_pattern` to `public/art/ui/speckle.webp`, `sky_unicorn` from the `moon.baby` silhouette to `public/art/ui/sky-unicorn.webp`, a silhouette `-sil.webp` next to every pin picture, and meta `art-src/meta/derived.json` with `patterns.speckle`, the picture `ui-sky-unicorn` (`kind: ui`, `pack: core`, `source: derived`) and `sil` fields for pins.
- `placeholder`: `placeholder.build(paths.PUBLIC_ART / 'placeholder')`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: PASS for every suite.

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline placeholder && PYTHONPATH=tools python3 -m art.pipeline sprite --breed moon --stage baby`
Expected: `public/art/placeholder/manifest.json` exists; `public/art/unicorns/moon.baby.*.webp` exist. Open the recolour and anchor PNGs in `art-src/work/contact/` with the Read tool. The four recolours look like the same baby in other colours with outlines in a darker shade of each colour, the tail is one clean piece, the lids sit on the eyes, and every anchor dot is where its name says. Fix wrong anchors in `anchor-overrides.json`, then run `sprite` again. Set the verdict `ok` in `art-src/review/unicorn-moon-baby.json`.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/tools/art games/moon-meadow-home/art-src/lists/anchor-overrides.json games/moon-meadow-home/art-src/lists/rig-mode.json games/moon-meadow-home/art-src/meta games/moon-meadow-home/art-src/review games/moon-meadow-home/art-src/sources games/moon-meadow-home/public/art/unicorns games/moon-meadow-home/public/art/placeholder
git commit -m "Add the sprite unicorn rig builder, derived pictures and placeholder art"
```

### Task A9: Unicorn, Egg and Lumi components

**Files:**
- Create: `src/art/unicornParts.ts`, `src/art/unicorn.css`, `src/art/Unicorn.svelte`, `src/art/Egg.svelte`, `src/art/Lumi.svelte`
- Test: `tests/art/unicornParts.test.ts`

**Interfaces:**
- Consumes: `manifest.ts`, `palette.ts`, `tint.ts`, `heap.ts` (A6); `tests/art/fixture.ts`.
- Produces:

```ts
// src/art/unicornParts.ts
export type LayerLayout = { src: string; tint: Tint; left: number; top: number; width: number; height: number };
export type PartLayout = { id: PartId; left: number; top: number; width: number; height: number; originX: number; originY: number; anim: PartAnim; hidden: boolean; layers: LayerLayout[] };
export type UnicornLayout = { rendition: 'sm' | 'lg'; k: number; width: number; height: number; parts: PartLayout[] };
export type Box = { left: number; top: number; width: number; height: number };
export type AnimName = PartAnim | 'breath' | 'bob';
export const SLOT_WIDTH: Record<OutfitSlot, number>;   // share of the frame width
export const SLOT_ANCHOR: Record<OutfitSlot, AnchorName>;
export const ANIM_PERIOD: Record<AnimName, number>;    // seconds
export function chooseRendition(entry: UnicornEntry, heightCss: number, dpr: number): 'sm' | 'lg';
export function layoutUnicorn(entry: UnicornEntry, heightCss: number, dpr: number): UnicornLayout;
export function anchorCss(entry: UnicornEntry, name: AnchorName, heightCss: number): { x: number; y: number };
export function outfitPlacement(entry: UnicornEntry, pic: PictureEntry | undefined, slot: OutfitSlot, heightCss: number): Box | null;
export function headCrop(entry: UnicornEntry, heightCss: number): Box & { size: number };
export function animDelay(seed: number, anim: AnimName): number;
```

Components:
- `<Unicorn breed stage colours traits? height pose? facing? outfit? headOnly? seed? label? />` with `pose: 'idle' | 'walk' | 'hop' | 'happy' | 'sleep' | 'still' | 'drag'` (default `idle`), `facing: 'left' | 'right'` (default `right`), `outfit: Partial<Record<OutfitSlot, string>>` (picture ids), `headOnly` draws only `headBox` scaled so the box is `height` tall.
- `<Egg kind skin? cracks? wobble? size label? />` with `kind: BreedId`, `skin: 'golden' | 'speckled' | null`, `cracks: 0 | 1 | 2 | 3`. Picture id is `egg-<skin>` when a skin is set, else `egg-<kind>`.
- `<Lumi size talking? label? />`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/art/unicornParts.test.ts
import { describe, expect, it } from 'vitest';
import { ANIM_PERIOD, anchorCss, animDelay, chooseRendition, headCrop, layoutUnicorn, outfitPlacement } from '../../src/art/unicornParts';
import { manifestFixture, unicornFixture } from './fixture';

const e = unicornFixture();

describe('unicorn layout', () => {
  it('chooses sm for meadow sizes', () => {
    expect(chooseRendition(e, 75, 2)).toBe('sm');      // 150 device px, sm is 150 px tall
    expect(chooseRendition(e, 82, 2)).toBe('sm');      // within 110 percent
    expect(chooseRendition(e, 90, 2)).toBe('lg');
    expect(chooseRendition(e, 150, 1)).toBe('sm');
  });

  it('scales parts and keeps layers relative to their part', () => {
    const l = layoutUnicorn(e, 150, 2);
    expect(l.k).toBe(0.5);
    expect(l.width).toBe(200);
    expect(l.height).toBe(150);
    const tail = l.parts[0];
    expect([tail.left, tail.top, tail.width, tail.height]).toEqual([0, 50, 60, 60]);
    expect([tail.originX, tail.originY]).toEqual([55, 30]);
    const body = l.parts[1];
    expect(body.layers[0]).toMatchObject({ left: 0, top: 20, width: 160, height: 130, tint: 'body' });
    expect(body.layers[1]).toMatchObject({ left: 50, top: 5, tint: 'mane' });
    expect(l.parts[2].hidden).toBe(true);
    expect(l.rendition).toBe('lg');
    expect(body.layers[0].src).toContain('.lg.');
    expect(layoutUnicorn(e, 75, 2).parts[1].layers[0].src).toContain('.sm.');
  });

  it('places anchors', () => {
    expect(anchorCss(e, 'flank', 150)).toEqual({ x: 90, y: 100 });
  });

  it('places an outfit so its attach point lands on the anchor', () => {
    const m = manifestFixture();
    const crown = m.pictures['outfit-crown-gold'];
    const b = outfitPlacement(e, crown, 'head', 150)!;
    expect(b.width).toBeCloseTo(200 * 0.34, 5);
    const k = b.width / crown.w;
    expect(b.left + crown.attach![0] * k).toBeCloseTo(150, 5);   // head anchor x 300 * 0.5
    expect(b.top + crown.attach![1] * k).toBeCloseTo(10, 5);     // head anchor y 20 * 0.5
  });

  it('outfitPlacement returns null for a missing picture', () => {
    expect(outfitPlacement(e, undefined, 'head', 150)).toBeNull();
  });

  it('crops the head as a square', () => {
    // head box side 170 frame px shown at 85 CSS px: k = 0.5, so the whole unicorn is 200 x 150, shifted left by 230 * 0.5
    expect(headCrop(e, 85)).toEqual({ left: -115, top: 0, width: 200, height: 150, size: 85 });
  });

  it('desyncs animations within one period', () => {
    for (let s = 0; s < 50; s++) {
      const d = animDelay(s, 'tail');
      expect(d).toBeLessThanOrEqual(0);
      expect(d).toBeGreaterThan(-ANIM_PERIOD.tail);
    }
    expect(animDelay(3, 'blink')).toBe(animDelay(3, 'blink'));
    expect(animDelay(3, 'none')).toBe(0);
  });
});
```

`headCrop` returns the whole unicorn's box (`left`, `top`, `width`, `height` of the full unicorn in CSS pixels) shifted so the head box starts at 0,0, plus `size`, the visible square side. The component wraps the unicorn in a `size` by `size` box with `overflow: hidden`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd games/moon-meadow-home && npx vitest run tests/art/unicornParts.test.ts`
Expected: FAIL with `Failed to resolve import "../../src/art/unicornParts"`.

- [ ] **Step 3: Write the implementation**

`src/art/unicornParts.ts`:

```ts
import type { AnchorName, OutfitSlot, PartAnim, PartId, PictureEntry, Tint, UnicornEntry } from './manifest';

export type LayerLayout = { src: string; tint: Tint; left: number; top: number; width: number; height: number };
export type PartLayout = { id: PartId; left: number; top: number; width: number; height: number; originX: number; originY: number; anim: PartAnim; hidden: boolean; layers: LayerLayout[] };
export type UnicornLayout = { rendition: 'sm' | 'lg'; k: number; width: number; height: number; parts: PartLayout[] };
export type Box = { left: number; top: number; width: number; height: number };
export type AnimName = PartAnim | 'breath' | 'bob';

export const SLOT_WIDTH: Record<OutfitSlot, number> = { head: 0.34, neck: 0.3, back: 0.46, mane: 0.2, flank: 0.12 };
export const SLOT_ANCHOR: Record<OutfitSlot, AnchorName> = { head: 'head', neck: 'neck', back: 'back', mane: 'mane', flank: 'flank' };
export const ANIM_PERIOD: Record<AnimName, number> = { none: 0, tail: 2.4, blink: 5.2, head: 4, leg: 0.7, mane: 3, breath: 3.2, bob: 0.7 };

export function chooseRendition(entry: UnicornEntry, heightCss: number, dpr: number): 'sm' | 'lg' {
  const smPx = entry.h * entry.renditions.sm.scale;
  return heightCss * dpr <= smPx * 1.1 ? 'sm' : 'lg';
}

export function layoutUnicorn(entry: UnicornEntry, heightCss: number, dpr: number): UnicornLayout {
  const rendition = chooseRendition(entry, heightCss, dpr);
  const k = heightCss / entry.h;
  const parts = entry.renditions[rendition].parts.map((p) => ({
    id: p.id, left: p.box[0] * k, top: p.box[1] * k, width: p.box[2] * k, height: p.box[3] * k,
    originX: (p.pivot[0] - p.box[0]) * k, originY: (p.pivot[1] - p.box[1]) * k, anim: p.anim, hidden: !!p.hidden,
    layers: p.layers.map((l) => ({ src: l.src, tint: l.tint, left: (l.box[0] - p.box[0]) * k, top: (l.box[1] - p.box[1]) * k,
      width: l.box[2] * k, height: l.box[3] * k })),
  }));
  return { rendition, k, width: entry.w * k, height: heightCss, parts };
}

export function anchorCss(entry: UnicornEntry, name: AnchorName, heightCss: number) {
  const k = heightCss / entry.h;
  const [x, y] = entry.anchors[name];
  return { x: x * k, y: y * k };
}

export function outfitPlacement(entry: UnicornEntry, pic: PictureEntry | undefined, slot: OutfitSlot, heightCss: number): Box | null {
  if (!pic) return null;
  const k = heightCss / entry.h;
  const width = entry.w * k * SLOT_WIDTH[slot];
  const s = width / pic.w;
  const attach = pic.attach ?? [pic.w / 2, pic.h / 2];
  const a = anchorCss(entry, SLOT_ANCHOR[slot], heightCss);
  return { left: a.x - attach[0] * s, top: a.y - attach[1] * s, width, height: pic.h * s };
}

export function headCrop(entry: UnicornEntry, heightCss: number) {
  const [x, y, , h] = entry.headBox;
  const k = heightCss / h;
  return { left: 0 - x * k, top: 0 - y * k, width: entry.w * k, height: entry.h * k, size: heightCss }; // 0 - n avoids -0
}

export function animDelay(seed: number, anim: AnimName): number {
  const p = ANIM_PERIOD[anim];
  if (!p) return 0;
  const t = Math.sin((seed + 1) * 12.9898 + p * 78.233) * 43758.5453;
  return -Number(((t - Math.floor(t)) * p).toFixed(3));
}
```

`src/art/unicorn.css`:

```css
.uni { position: relative; pointer-events: none; contain: layout; }
.uni .flip, .uni .bob, .uni .breath { position: absolute; inset: 0; transform-origin: 50% 100%; }
.uni.left .flip { transform: scaleX(-1); }
.uni .breath { will-change: transform; }
.uni .part { position: absolute; }
.uni .part.anim-tail, .uni .part.anim-blink { will-change: transform, opacity; }
.uni .layer { position: absolute; }
.uni .part.hidden { opacity: 0; }
.uni .outfit { position: absolute; }
.uni .sparkle { position: absolute; width: 18%; opacity: 0; animation: uni-twinkle 1.6s ease-in-out infinite; }

.uni.pose-idle .breath, .uni.pose-walk .breath, .uni.pose-happy .breath, .uni.pose-drag .breath { animation: uni-breath 3.2s ease-in-out infinite; }
.uni.pose-sleep .breath { animation: uni-breath 4.8s ease-in-out infinite; }
.uni:is(.pose-idle, .pose-walk, .pose-hop, .pose-drag) .anim-tail { animation: uni-tail 2.4s ease-in-out infinite; }
.uni.pose-happy .anim-tail { animation: uni-tail 0.8s ease-in-out infinite; }
.uni:is(.pose-idle, .pose-walk, .pose-happy, .pose-drag) .anim-blink { animation: uni-blink 5.2s linear infinite; }
.uni.pose-sleep .anim-blink { opacity: 1; }
.uni.pose-walk .bob { animation: uni-bob 0.7s ease-in-out infinite; }
.uni.pose-hop .bob { animation: uni-hop 0.9s ease-out 1; }
.uni.pose-happy .bob { animation: uni-hop 0.7s ease-out 2; }
.uni.pose-drag .bob { animation: uni-wiggle 0.5s ease-in-out infinite; }

@keyframes uni-breath { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.012, 1.025); } }
@keyframes uni-tail { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(6deg); } }
@keyframes uni-blink { 0%, 94% { opacity: 0; } 95%, 98% { opacity: 1; } 99%, 100% { opacity: 0; } }
@keyframes uni-bob { 0%, 50%, 100% { transform: translateY(0) rotate(0); } 25% { transform: translateY(-4%) rotate(-2deg); } 75% { transform: translateY(-4%) rotate(2deg); } }
@keyframes uni-hop { 0%, 100% { transform: translateY(0) scale(1, 1); } 15% { transform: translateY(0) scale(1.06, 0.92); } 45% { transform: translateY(-22%) scale(0.96, 1.05); } 80% { transform: translateY(0) scale(1.04, 0.95); } }
@keyframes uni-wiggle { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@keyframes uni-twinkle { 0%, 100% { opacity: 0; transform: scale(0.6); } 50% { opacity: 1; transform: scale(1); } }
```

`src/art/Unicorn.svelte`:

```svelte
<script lang="ts">
  import './unicorn.css';
  import { artManifest, artUrl, picture, unicornEntry, type BreedId, type OutfitSlot, type Stage } from './manifest';
  import { resolveColours, type Colours, type Traits } from './palette';
  import { colourForTint, patternLayerStyle, plainLayerStyle, tintLayerStyle } from './tint';
  import { anchorCss, animDelay, headCrop, layoutUnicorn, outfitPlacement } from './unicornParts';

  type Pose = 'idle' | 'walk' | 'hop' | 'happy' | 'sleep' | 'still' | 'drag';
  let { breed, stage, colours, traits = {}, height, pose = 'idle', facing = 'right', outfit = {}, headOnly = false, seed = 0, label = 'unicorn' }:
    { breed: BreedId; stage: Stage; colours: Partial<Colours> | null | undefined; traits?: Traits; height: number; pose?: Pose;
      facing?: 'left' | 'right'; outfit?: Partial<Record<OutfitSlot, string>>; headOnly?: boolean; seed?: number; label?: string } = $props();

  const dpr = typeof devicePixelRatio === 'number' ? Math.min(Math.max(devicePixelRatio, 1), 2) : 2;
  const entry = $derived(unicornEntry(breed, stage));
  const crop = $derived(headOnly ? headCrop(entry, height) : null);
  const drawH = $derived(crop ? crop.height : height);
  const lay = $derived(layoutUnicorn(entry, drawH, dpr));
  const c = $derived(resolveColours(colours, traits));
  const speckle = $derived(traits.speckled ? artManifest().patterns?.speckle : undefined);
  const slots = $derived((Object.entries(outfit) as [OutfitSlot, string][])
    .map(([slot, id]) => ({ id, box: outfitPlacement(entry, picture(id), slot, drawH) }))
    .filter((o) => o.box));
  const star = $derived(traits.founder ? outfitPlacement(entry, picture('pin-founder-star'), 'flank', drawH) : null);
  const flank = $derived(anchorCss(entry, 'flank', drawH));
</script>

<div class="uni-wrap" role="img" aria-label={label}
  style="width:{crop ? crop.size : lay.width}px;height:{crop ? crop.size : lay.height}px;{crop ? 'overflow:hidden;position:relative' : ''}">
  <div class="uni pose-{pose}" class:left={facing === 'left'}
    style="width:{lay.width}px;height:{lay.height}px;{crop ? `position:absolute;left:${crop.left}px;top:${crop.top}px` : ''}">
    <div class="flip"><div class="bob"><div class="breath" style="animation-delay:{animDelay(seed, 'breath')}s">
      {#each lay.parts as p (p.id)}
        <div class="part anim-{p.anim}" class:hidden={p.hidden}
          style="left:{p.left}px;top:{p.top}px;width:{p.width}px;height:{p.height}px;transform-origin:{p.originX}px {p.originY}px;animation-delay:{animDelay(seed, p.anim)}s">
          {#each p.layers as l (l.src)}
            {@const url = artUrl(l.src)}
            <div class="layer" style="left:{l.left}px;top:{l.top}px;width:{l.width}px;height:{l.height}px;{l.tint === 'none' ? plainLayerStyle(url) : tintLayerStyle(url, colourForTint(l.tint, c)!)}"></div>
            {#if speckle && l.tint === 'body' && p.id === 'body'}
              <div class="layer" style="left:{l.left}px;top:{l.top}px;width:{l.width}px;height:{l.height}px;{patternLayerStyle(url, artUrl(speckle), 0.55)}"></div>
            {/if}
          {/each}
        </div>
      {/each}
      {#each slots as o (o.id)}
        {@const pic = picture(o.id)!}
        <div class="outfit" style="left:{o.box!.left}px;top:{o.box!.top}px;width:{o.box!.width}px;height:{o.box!.height}px;{pic.tint ? tintLayerStyle(artUrl(pic.src), pic.tint.default) : plainLayerStyle(artUrl(pic.src))}"></div>
      {/each}
      {#if star}
        <div class="outfit" style="left:{star.left}px;top:{star.top}px;width:{star.width}px;height:{star.height}px;{plainLayerStyle(artUrl(picture('pin-founder-star')!.src))}"></div>
      {/if}
      {#if traits.shiny && picture('ui-sparkle')}
        {#each [0, 1, 2] as i (i)}
          <img class="sparkle" alt="" src={artUrl(picture('ui-sparkle')!.src)}
            style="left:{flank.x + (i - 1) * lay.width * 0.22}px;top:{flank.y - lay.height * (0.35 + 0.12 * i)}px;animation-delay:{-i * 0.5}s" />
        {/each}
      {/if}
    </div></div></div>
  </div>
</div>
```

`src/art/Egg.svelte`:

```svelte
<script lang="ts">
  import Picture from './Picture.svelte';
  import type { BreedId } from './manifest';

  let { kind, skin = null, cracks = 0, wobble = false, size, label = 'egg' }:
    { kind: BreedId; skin?: 'golden' | 'speckled' | null; cracks?: 0 | 1 | 2 | 3; wobble?: boolean; size: number; label?: string } = $props();
  const id = $derived(skin ? `egg-${skin}` : `egg-${kind}`);
</script>

<div class="egg" class:wobble role="img" aria-label={label} style="width:{size}px;height:{size}px">
  <Picture {id} {size} label="" />
  <svg viewBox="0 0 190 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <g fill="none" stroke="#7a4c78" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
      {#if cracks >= 1}<path d="M70 52 L86 70 L76 84 L94 98" />{/if}
      {#if cracks >= 2}<path d="M150 96 L134 106 L142 120 L124 128" />{/if}
      {#if cracks >= 3}<path d="M20 120 L40 112 L46 128 L66 118 L80 126" />{/if}
    </g>
  </svg>
</div>

<style>
  .egg { position: relative; }
  .egg svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .wobble { animation: egg-wobble 1.2s ease-in-out infinite; transform-origin: 50% 90%; }
  @keyframes egg-wobble { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-6deg); } 40% { transform: rotate(5deg); } 60% { transform: rotate(-3deg); } 80% { transform: rotate(2deg); } }
</style>
```

`src/art/Lumi.svelte`:

```svelte
<script lang="ts">
  import { artManifest, artUrl } from './manifest';

  let { size, talking = false, label = 'Queen Lumi' }: { size: number; talking?: boolean; label?: string } = $props();
  const l = $derived(artManifest().lumi);
  const k = $derived(l ? size / Math.max(l.w, l.h) : 0);
</script>

{#if l}
  <div class="lumi" role="img" aria-label={label} style="width:{l.w * k}px;height:{l.h * k}px">
    <img src={artUrl(l.face)} alt="" width={l.w * k} height={l.h * k} draggable="false" />
    <img class="mouth" class:talking src={artUrl(l.mouth)} alt="" draggable="false"
      style="left:{l.mouthBox[0] * k}px;top:{l.mouthBox[1] * k}px;width:{l.mouthBox[2] * k}px;height:{l.mouthBox[3] * k}px" />
  </div>
{/if}

<style>
  .lumi { position: relative; pointer-events: none; }
  .lumi img { position: absolute; left: 0; top: 0; }
  .mouth { opacity: 0; }
  .mouth.talking { animation: lumi-talk 0.28s steps(1, end) infinite; }
  @keyframes lumi-talk { 0% { opacity: 1; } 50% { opacity: 0; } }
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd games/moon-meadow-home && npx vitest run tests/art && npx svelte-check --threshold error`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/art games/moon-meadow-home/tests/art/unicornParts.test.ts
git commit -m "Add the Unicorn, Egg and Lumi components"
```

### Task A10: Meadow stress test, first run on placeholder art

**Files:**
- Create: `src/stress/frameStats.ts`, `src/stress/Stress.svelte`, `src/stress/main.ts`, `stress.html`, `flows/art-stress.sh`, `tools/art/stress_report.py`
- Test: `tests/art/frameStats.test.ts`, `tools/art/tests/test_stress_report.py`

**Interfaces:**
- Consumes: `loadArtManifest`, `Unicorn`, `Picture` (A6, A9), the placeholder manifest (A8).
- Produces:

```ts
// src/stress/frameStats.ts
export type FrameStats = { frames: number; fps: number; p50: number; p95: number; dropPct: number };
export type StressResult = FrameStats & { decodedMB: number; unicorns: number; elements: number; viewport: string; art: string; ok: boolean };
export const FRAME_MS = 1000 / 60;
export function summarise(deltas: number[]): FrameStats;
export function decodedBytes(images: { url: string; w: number; h: number }[]): number;
export function verdict(s: FrameStats, decodedMB: number, budget?: { p95: number; dropPct: number; decodedMB: number }): boolean;
```

- `stress.html?n=44&walk=4&heads=11&flowers=60&art=real|placeholder&duration=30`: `n` is the total number of unicorns drawn: `n - walk - heads - 1` idle, `walk` walking, 1 dragged along a path by `requestAnimationFrame`, `heads` as static stall-door heads. At the end it sets `window.__stress: StressResult` and logs `[stress] ` plus the JSON.
- `art-src/stress-results.json`: `{"runs": [StressResult & {"at": string}], "decision": "dom" | "pixi", "why": string}`.

Pass on the Mac WebKit run: p95 frame time at most 20 ms, dropped frames at most 5 percent, decoded images at most 150 MB, at 1180 x 820, 1080 x 810 and 1024 x 768. The iPad check is the same page on Emma's iPad: Tjitse opens `http://<mac>.local:8765/games/moon-meadow-home/dist/stress.html` and reads the green or red verdict in the corner. The Mac numbers are a lower bound, not proof for the Air 2.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/art/frameStats.test.ts
import { describe, expect, it } from 'vitest';
import { FRAME_MS, decodedBytes, summarise, verdict } from '../../src/stress/frameStats';

describe('frame stats', () => {
  it('summarises a smooth run', () => {
    const s = summarise(Array(120).fill(FRAME_MS));
    expect(s.p50).toBeCloseTo(16.67, 1);
    expect(s.p95).toBeCloseTo(16.67, 1);
    expect(s.dropPct).toBe(0);
    expect(s.fps).toBeCloseTo(60, 0);
  });

  it('counts missed frames from long frames', () => {
    const s = summarise([...Array(90).fill(FRAME_MS), ...Array(10).fill(50)]);
    expect(s.dropPct).toBeCloseTo(16.7, 0);   // 20 missed of 120 expected
    expect(s.p95).toBe(50);
  });

  it('counts each decoded image once', () => {
    const b = decodedBytes([{ url: 'a', w: 100, h: 100 }, { url: 'a', w: 100, h: 100 }, { url: 'b', w: 10, h: 10 }]);
    expect(b).toBe(100 * 100 * 4 + 10 * 10 * 4);
  });

  it('verdict fails on decoded memory', () => {
    const smooth = summarise(Array(120).fill(FRAME_MS));
    expect(verdict(smooth, 120)).toBe(true);
    expect(verdict(smooth, 151)).toBe(false);
    expect(verdict(summarise(Array(120).fill(30)), 50)).toBe(false);
  });
});
```

```python
# tools/art/tests/test_stress_report.py
import json
import tempfile
import unittest
from pathlib import Path

from art import stress_report

OUT = 'Result:\n"{\\"frames\\":1800,\\"fps\\":59.8,\\"p50\\":16.7,\\"p95\\":18.2,\\"dropPct\\":1.1,\\"decodedMB\\":64.2,\\"unicorns\\":44,\\"elements\\":610,\\"viewport\\":\\"1180x820\\",\\"art\\":\\"real\\",\\"ok\\":true}"\n'


class StressReportTest(unittest.TestCase):
    def test_parses_playwright_eval_output(self):
        r = stress_report.parse(OUT)
        self.assertEqual(r['viewport'], '1180x820')
        self.assertTrue(r['ok'])

    def test_decision_needs_every_run_to_pass(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'stress-results.json'
            runs = [stress_report.parse(OUT), {**stress_report.parse(OUT), 'viewport': '1024x768', 'ok': False}]
            stress_report.record(p, runs)
            data = json.loads(p.read_text())
            self.assertEqual(data['decision'], 'pixi')
            stress_report.record(p, [stress_report.parse(OUT)])
            self.assertEqual(json.loads(p.read_text())['decision'], 'dom')
            self.assertEqual(len(json.loads(p.read_text())['runs']), 3)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd games/moon-meadow-home && npx vitest run tests/art/frameStats.test.ts; PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_stress_report.py' -v`
Expected: both FAIL on the missing modules.

- [ ] **Step 3: Write the implementation**

`src/stress/frameStats.ts`:

```ts
export type FrameStats = { frames: number; fps: number; p50: number; p95: number; dropPct: number };
export type StressResult = FrameStats & { decodedMB: number; unicorns: number; elements: number; viewport: string; art: string; ok: boolean };
export const FRAME_MS = 1000 / 60;

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

export function summarise(deltas: number[]): FrameStats {
  const s = [...deltas].sort((a, b) => a - b);
  const total = deltas.reduce((a, b) => a + b, 0);
  const expected = total / FRAME_MS;
  const missed = deltas.filter((d) => d > 1.5 * FRAME_MS).reduce((a, d) => a + Math.round(d / FRAME_MS) - 1, 0);
  return { frames: deltas.length, fps: (deltas.length * 1000) / total, p50: pct(s, 0.5), p95: pct(s, 0.95), dropPct: (missed / expected) * 100 };
}

export function decodedBytes(images: { url: string; w: number; h: number }[]): number {
  const seen = new Map<string, number>();
  for (const i of images) seen.set(i.url, i.w * i.h * 4);
  return [...seen.values()].reduce((a, b) => a + b, 0);
}

export function verdict(s: FrameStats, decodedMB: number, budget = { p95: 20, dropPct: 5, decodedMB: 150 }): boolean {
  return s.p95 <= budget.p95 && s.dropPct <= budget.dropPct && decodedMB <= budget.decodedMB;
}
```

`stress.html`:

```html
<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Meadow stress test</title>
  <style>html,body{margin:0;height:100%;background:#9fd38a;overflow:hidden;touch-action:none}</style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/stress/main.ts"></script>
</body>
</html>
```

`src/stress/main.ts`:

```ts
import { mount } from 'svelte';
import { loadArtManifest } from '../art/manifest';
import Stress from './Stress.svelte';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => Number(q.get(k) ?? d);
const art = q.get('art') === 'placeholder' ? 'placeholder' : 'real';
await loadArtManifest(import.meta.env.BASE_URL, art === 'placeholder' ? 'art/placeholder/manifest.json' : 'art/manifest.json');
mount(Stress, {
  target: document.getElementById('app')!,
  props: { n: num('n', 44), walk: num('walk', 4), heads: num('heads', 11), flowers: num('flowers', 60), duration: num('duration', 30), art },
});
```

Placeholder `src` values start with `placeholder/`, so `artUrl` resolves them under `art/` as for real art.

`src/stress/Stress.svelte` (idle unicorns in a jittered grid, walkers, one dragged unicorn moved every frame, static door heads, moonflowers, three pulsing bubbles, and a HUD that turns green or red):

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Picture from '../art/Picture.svelte';
  import Unicorn from '../art/Unicorn.svelte';
  import { mulberry32 } from '../art/heap';
  import { artManifest, artUrl, background, type BreedId, type Stage } from '../art/manifest';
  import { randomColours } from '../art/palette';
  import { decodedBytes, summarise, verdict, type StressResult } from './frameStats';

  let { n, walk, heads, flowers, duration, art }:
    { n: number; walk: number; heads: number; flowers: number; duration: number; art: string } = $props();

  const keys = Object.keys(artManifest().unicorns).map((k) => k.split('.') as [BreedId, Stage]);
  const rng = mulberry32(99);
  const babies = Array.from({ length: n }, (_, i) => {
    const [breed, stage] = keys[i % keys.length];
    return { i, breed, stage, colours: randomColours(mulberry32(i + 1)),
      traits: { speckled: i % 3 === 0, shiny: i % 8 === 0, founder: i % 5 === 0 } };
  });
  const idleCount = Math.max(0, n - walk - heads - 1);
  const idle = babies.slice(0, idleCount).map((b, k) => ({ ...b, x: 40 + (k % 6) * 185 + rng() * 30, y: 250 + Math.floor(k / 6) * 100 + rng() * 20 }));
  const walkers = babies.slice(idleCount, idleCount + walk).map((b, k) => ({ ...b, y: 280 + k * 110, delay: -k * 3 }));
  const dragged = babies[idleCount + walk];
  const doorHeads = babies.slice(idleCount + walk + 1);
  const spots = Array.from({ length: flowers }, () => ({ x: rng() * 1130, y: 300 + rng() * 480 }));
  const bg = background('bg-meadow');
  const scale = Math.min(innerWidth / 1180, innerHeight / 820);

  let hud = $state('warming up');
  let ok = $state<boolean | null>(null);
  let dragEl: HTMLDivElement | undefined = $state();

  async function finish(deltas: number[]) {
    const urls = new Set<string>();
    for (const el of document.querySelectorAll<HTMLElement>('*')) {
      if (el instanceof HTMLImageElement) urls.add(el.currentSrc || el.src);
      for (const m of getComputedStyle(el).backgroundImage.matchAll(/url\("?([^")]+)"?\)/g)) urls.add(m[1]);
    }
    const sizes = await Promise.all([...urls].map((url) => new Promise<{ url: string; w: number; h: number }>((res) => {
      const im = new Image();
      im.onload = () => res({ url, w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => res({ url, w: 0, h: 0 });
      im.src = url;
    })));
    const decodedMB = decodedBytes(sizes) / 1048576;
    const s = summarise(deltas);
    ok = verdict(s, decodedMB);
    const result: StressResult = { ...s, decodedMB: Number(decodedMB.toFixed(1)), unicorns: n,
      elements: document.querySelectorAll('*').length, viewport: `${innerWidth}x${innerHeight}`, art, ok };
    (window as unknown as { __stress: StressResult }).__stress = result;
    console.log('[stress] ' + JSON.stringify(result));
    hud = `${ok ? 'PASS' : 'FAIL'} · p95 ${s.p95.toFixed(1)} ms · drop ${s.dropPct.toFixed(1)}% · ${decodedMB.toFixed(0)} MB · ${n} unicorns`;
  }

  onMount(() => {
    const deltas: number[] = [];
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      if (dragEl) dragEl.style.transform = `translate(${590 + 380 * Math.sin(t / 1.3)}px, ${420 + 120 * Math.sin(t / 0.9)}px)`;
      if (t > 3) deltas.push(now - last);
      last = now;
      if (deltas.length > 0 && deltas.length % 30 === 0) {
        const s = summarise(deltas);
        hud = `${summarise(deltas.slice(-60)).fps.toFixed(0)} fps · p95 ${s.p95.toFixed(1)} ms · drop ${s.dropPct.toFixed(1)}%`;
      }
      if (t < duration + 3) raf = requestAnimationFrame(tick);
      else void finish(deltas);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div class="stage" style="transform:scale({scale})">
  {#if bg}<img class="bg" src={artUrl(bg.src)} alt="" width="1180" height="820" />{/if}
  {#each spots as f, i (i)}<div class="abs" style="left:{f.x}px;top:{f.y}px"><Picture id="decor-moonflower" size={48} /></div>{/each}
  {#each doorHeads as b, k (b.i)}
    <div class="door" style="left:{620 + (k % 6) * 92}px;top:{20 + Math.floor(k / 6) * 100}px">
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={84} pose="still" headOnly seed={b.i} />
    </div>
  {/each}
  {#each idle as b (b.i)}
    <div class="abs" style="left:{b.x}px;top:{b.y}px">
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={150} seed={b.i} facing={b.i % 2 ? 'left' : 'right'} />
    </div>
  {/each}
  {#each walkers as b (b.i)}
    <div class="walker" style="top:{b.y}px;animation-delay:{b.delay}s">
      <Unicorn breed={b.breed} stage={b.stage} colours={b.colours} traits={b.traits} height={150} pose="walk" seed={b.i} />
    </div>
  {/each}
  {#if dragged}
    <div class="abs drag" bind:this={dragEl}>
      <Unicorn breed={dragged.breed} stage={dragged.stage} colours={dragged.colours} traits={dragged.traits} height={150} pose="drag" seed={dragged.i} />
    </div>
  {/if}
  {#each [0, 1, 2] as k (k)}<div class="bubble" style="left:{180 + k * 320}px;animation-delay:{-k * 0.4}s"></div>{/each}
  <div class="hud" class:pass={ok === true} class:fail={ok === false}>{hud}</div>
</div>

<style>
  .stage { position: absolute; left: 0; top: 0; width: 1180px; height: 820px; transform-origin: 0 0; overflow: hidden; }
  .bg { position: absolute; inset: 0; }
  .abs, .door { position: absolute; }
  .drag { left: 0; top: 0; will-change: transform; }
  .walker { position: absolute; left: 0; animation: stress-walk 12s linear infinite alternate; will-change: transform; }
  .bubble { position: absolute; top: 90px; width: 120px; height: 120px; border-radius: 50%; background: #fff; animation: stress-pulse 1.4s ease-in-out infinite; }
  .hud { position: absolute; left: 12px; top: 12px; padding: 8px 12px; font: 14px/1.3 ui-monospace, monospace; color: #fff; background: rgba(30, 24, 48, 0.8); border-radius: 8px; }
  .hud.pass { background: #1f7a3a; }
  .hud.fail { background: #a3242f; }
  @keyframes stress-walk { from { transform: translateX(0); } to { transform: translateX(900px); } }
  @keyframes stress-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
</style>
```

`flows/art-stress.sh`:

```sh
#!/bin/sh
# Runs the meadow stress page in WebKit at the iPad sizes. Run it outside the Claude Code sandbox.
# Usage: flows/art-stress.sh [base url] (default: the Vite dev server on 127.0.0.1:5174)
set -eu
BASE=${1:-http://127.0.0.1:5174}
ART=${ART:-real}
N=${N:-44}
OUT=${TMPDIR:-/tmp}/art-stress
mkdir -p "$OUT"
WAIT='() => new Promise(r => { const t = setInterval(() => { if (window.__stress) { clearInterval(t); r(JSON.stringify(window.__stress)); } }, 500); })'
playwright-cli -s=stress open "$BASE/stress.html?n=$N&duration=30&art=$ART"
for size in 1180x820 1080x810 1024x768; do
  w=${size%x*}; h=${size#*x}
  playwright-cli -s=stress resize "$w" "$h"
  playwright-cli -s=stress goto "$BASE/stress.html?n=$N&duration=30&art=$ART"
  playwright-cli -s=stress eval "$WAIT" > "$OUT/stress-$ART-$size.txt"
  playwright-cli -s=stress screenshot
done
playwright-cli -s=stress resize 820 1180
playwright-cli -s=stress screenshot
playwright-cli -s=stress close
mv .playwright-cli/*.png "$OUT"/ 2>/dev/null || true
cd "$(dirname "$0")/.."
PYTHONPATH=tools python3 -m art.stress_report "$OUT"/stress-"$ART"-*.txt
```

`tools/art/stress_report.py`:

```python
import json
import re
import sys
import time
from pathlib import Path

from . import paths

_JSON = re.compile(r'\{\\?"frames\\?".*?\}', re.S)


def parse(text: str) -> dict:
    m = _JSON.search(text)
    if not m:
        raise ValueError('no stress result in output')
    return json.loads(m.group(0).replace('\\"', '"'))


def record(path: Path, runs: list[dict]) -> dict:
    data = json.loads(path.read_text()) if path.exists() else {'runs': []}
    stamp = time.strftime('%Y-%m-%dT%H:%M:%S')
    data['runs'] += [{**r, 'at': stamp} for r in runs]
    ok = all(r['ok'] for r in runs)
    data['decision'] = 'dom' if ok else 'pixi'
    data['why'] = (f'latest run of {len(runs)} sizes ' + ('passed' if ok else 'failed: ' +
                   ', '.join(r['viewport'] for r in runs if not r['ok'])))
    path.write_text(json.dumps(data, indent=1) + '\n')
    return data


if __name__ == '__main__':
    runs = [parse(Path(p).read_text()) for p in sys.argv[1:]]
    d = record(paths.SRC / 'stress-results.json', runs)
    print(d['decision'], '-', d['why'])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd games/moon-meadow-home && npx vitest run tests/art && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: PASS.

- [ ] **Step 5: Run the stress test on placeholder art (outside the sandbox)**

Run the dev server in the background: `cd games/moon-meadow-home && npx vite --host 127.0.0.1 --port 5174 --strictPort`.
Run: `cd games/moon-meadow-home && ART=placeholder sh flows/art-stress.sh`
Expected: three result files, `art-src/stress-results.json` written, the last line is `dom - latest run of 3 sizes passed` or names the failing sizes. Look at the screenshots in `$TMPDIR/art-stress/` with the Read tool: 44 placeholder unicorns, walkers, heads and flowers are drawn and the HUD shows numbers. If it fails, tell the meadow scene owner now: that is the PixiJS signal of spec 5.4, and Task A11 step 5 runs the same test on real art.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/src/stress games/moon-meadow-home/stress.html games/moon-meadow-home/flows/art-stress.sh games/moon-meadow-home/tools/art/stress_report.py games/moon-meadow-home/tools/art/tests/test_stress_report.py games/moon-meadow-home/tests/art/frameStats.test.ts games/moon-meadow-home/art-src/stress-results.json
git commit -m "Add the meadow stress test and run it on placeholder art"
```

### Task A11: Wave A unicorns, Lumi and the second stress run

**Files:**
- Create: sources, meta, review and output files for `moon`, `nestling`, `pebble`, `cosy`, `bubble` at `baby` and `foal`, and for Lumi.
- Modify: `art-src/lists/anchor-overrides.json`, `tools/art/pipeline.py` (command `lumi`)
- Test: `tools/art/tests/test_rig.py` (one added test)

**Interfaces:**
- Consumes: `prompts.breed_prompt`, `prompts.foal_prompt`, `prompts.lumi_prompt`, `prompts.lumi_mouth_prompt` (A3), `pipeline sprite` (A8), `derive.lumi_mouth` (A8), the stress flow (A10).
- Produces: manifest keys `moon.baby`, `moon.foal`, `nestling.baby`, `nestling.foal`, `pebble.baby`, `pebble.foal`, `cosy.baby`, `cosy.foal`, `bubble.baby`, `bubble.foal`; `lumi` with `face`, `mouth`, `mouthBox`; `ui-sky-unicorn`; `patterns.speckle`.

- [ ] **Step 1: Add the test for a drifted generation**

```python
    # add to RigTest in tools/art/tests/test_rig.py
    def test_rejects_a_picture_whose_colours_drifted(self):
        from PIL import ImageDraw
        im = Image.new('RGBA', (300, 300), (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse([20, 20, 280, 280], fill=(120, 200, 90, 255))  # a green blob, no lilac body
        with tempfile.TemporaryDirectory() as d, self.assertRaises(rig.DriftError):
            rig.build_sprite(im, 'nestling', 'baby', 'bronze', Path(d) / 'unicorns')
```

`rig.DriftError(Exception)` is raised by `build_sprite` when `class_shares` gives body below 0.3 or mane plus mane2 below 0.15 (written in Task A8).

- [ ] **Step 2: Run it**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_rig.py' -v`
Expected: PASS. If it fails, the share check in `build_sprite` is missing or runs after the classification has been changed; fix `build_sprite`, not the test.

- [ ] **Step 3: Generate the Wave A breeds (outside the sandbox)**

Write a scratchpad script that builds `codex_gen.Job`s:
- Babies for `nestling`, `pebble`, `cosy`, `bubble`: `breed_prompt(change, '<breed>-baby')`, refs `[paths.STYLE_REF]`, out `art-src/raw/<breed>-baby.png`.
- Foals for all five breeds after their baby exists: `foal_prompt('<breed>-foal')`, refs `[the baby source PNG]` (for `moon`, `paths.STYLE_REF`), out `art-src/raw/<breed>-foal.png`.
- Lumi: `lumi_prompt('lumi')`, refs `[paths.STYLE_REF]`, then `lumi_mouth_prompt('lumi-mouth')` with refs `[art-src/raw/lumi.png]`.

Run them with `run_jobs(parallel=4, ledger=paths.JOBS / 'unicorns-a.jsonl')`. Then for each of the 10 keys run:

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline sprite --breed <breed> --stage <stage>`
Expected: exit 0. Exit 1 with "colours drifted" means regenerate that one picture (delete its raw PNG, run its job again, at most 2 retries). After 2 failed retries for a breed, use the moon picture of the same stage as its source and record the breed in `art-src/missing.json` under `"breeds"`; the game then shows that breed as a Moon foal (Contract: `unicornEntry` fallback).

Lumi: the `lumi` command fits `lumi.png` to 600 px on its long side (`fit_long`), saves `public/art/lumi/lumi.webp`, calls `derive.lumi_mouth` on the fitted closed and open pictures, and saves the overlay as `public/art/lumi/lumi-mouth.webp`. When `lumi_mouth` returns `None`, it draws the overlay instead: a dark rose ellipse (`#8a3a55`) 9 percent of the width wide and 4 percent high, at the mouth point Claude reads from the picture and writes into `anchor-overrides.json` under `"lumi": {"mouth": [x, y]}`. Meta goes to `art-src/meta/lumi.json` as `{"lumi": {...}}`, review batch `lumi`.

- [ ] **Step 4: Look at every unicorn**

For each key, open the recolour PNG and the anchor PNG from `art-src/work/contact/` with the Read tool. Check: same pose and facing as the reference, the breed change is visible, outlines take a darker shade of the new colours, no lilac left in the mane layer, no pink in the body layer, horn colour as listed, tail is one piece, lids on the eyes, anchors in place. Set each verdict in `art-src/review/unicorn-<breed>-<stage>.json`. Then:

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline derive && PYTHONPATH=tools python3 -m art.pipeline manifest`
Expected: `public/art/manifest.json` lists 10 unicorns, `lumi`, `patterns.speckle` and `ui-sky-unicorn`.

- [ ] **Step 5: Stress test on the real sprites (outside the sandbox)**

Run (with the Vite dev server from Task A10 running): `cd games/moon-meadow-home && ART=real sh flows/art-stress.sh`
Expected: `dom - latest run of 3 sizes passed`. Look at the 1024 x 768 screenshot with the Read tool: real unicorns in many colours, speckles on some, sparkles on shiny ones, heads in the doors. If the run fails on decoded memory, lower `rig.SM_H` to 260, rebuild the sprites and run again before reporting a PixiJS need.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/tools/art games/moon-meadow-home/art-src/sources games/moon-meadow-home/art-src/meta games/moon-meadow-home/art-src/review games/moon-meadow-home/art-src/jobs games/moon-meadow-home/art-src/lists/anchor-overrides.json games/moon-meadow-home/art-src/stress-results.json games/moon-meadow-home/public/art
git commit -m "Add the five Wave A unicorn breeds, Queen Lumi and the real stress run"
```

### Task A12: Layer rig spike (time box 60 minutes, at most 6 Codex runs)

Start this task only after Tasks A13 and A14 are done or running in parallel, because Wave A does not depend on it.

**Files:**
- Create: `tools/art/peel.py`
- Modify: `art-src/lists/rig-mode.json`
- Test: `tools/art/tests/test_peel.py`

**Interfaces:**
- Consumes: `regions.classify`, `imageops.dilate` (A1, A7), `codex_gen.run_jobs` (A3).
- Produces:
  - `peel.paste_back(original: Image.Image, edited: Image.Image, mask: np.ndarray, grow: int = 6) -> Image.Image` (edited pixels only inside the dilated mask, original pixels everywhere else)
  - `peel.seam_error(original: Image.Image, result: Image.Image, mask: np.ndarray, grow: int = 6) -> float` (mean RGB difference between the result and the original in the 3 px ring just inside the edge of the dilated mask, where the removed part has ended and the edit should match the original)
  - On success, `rig-mode.json` becomes `{"mode": "layers", "why": "..."}` and `moon.baby` gets parts `tail`, `legBL`, `legBR`, `body`, `legFL`, `legFR`, `mane`, `lids` in that draw order with anim `leg` on the legs and `mane` on the mane.

- [ ] **Step 1: Write the failing test**

```python
# tools/art/tests/test_peel.py
import unittest

import numpy as np
from PIL import Image, ImageDraw

from art import peel


class PeelTest(unittest.TestCase):
    def test_paste_back_changes_only_the_masked_area(self):
        orig = Image.new('RGBA', (100, 100), (200, 180, 240, 255))
        ImageDraw.Draw(orig).rectangle([40, 40, 60, 60], fill=(240, 160, 190, 255))  # the part to peel
        edited = Image.new('RGBA', (100, 100), (190, 175, 235, 255))                  # drifted everywhere
        mask = np.zeros((100, 100), bool)
        mask[40:61, 40:61] = True
        out = np.asarray(peel.paste_back(orig, edited, mask, grow=2))
        self.assertEqual(tuple(out[5, 5]), (200, 180, 240, 255))
        self.assertEqual(tuple(out[50, 50]), (190, 175, 235, 255))

    def test_seam_error_is_small_when_the_fill_matches(self):
        orig = Image.new('RGBA', (100, 100), (200, 180, 240, 255))
        mask = np.zeros((100, 100), bool)
        mask[40:61, 40:61] = True
        same = peel.paste_back(orig, orig, mask)
        self.assertLess(peel.seam_error(orig, same, mask), 1)
        wrong = peel.paste_back(orig, Image.new('RGBA', (100, 100), (20, 20, 20, 255)), mask)
        self.assertGreater(peel.seam_error(orig, wrong, mask), 100)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run it to see it fail, implement `peel.py`, run it to see it pass**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_peel.py' -v`
Expected first: FAIL on the import; after implementing (paste with `np.where(dilate(mask, grow)[..., None], edited, original)`; the seam ring is `dilate(mask, grow) & ~dilate(mask, max(0, grow - 3))`, and the error is the mean absolute RGB difference between result and original there), PASS.

- [ ] **Step 3: Try the peel on `moon.baby` (outside the sandbox)**

Run three Codex edits on `docs/v3/art/style-reference.png`, each with the reference attached and the prompt "Use your image generation tool to redraw the attached picture exactly the same, with every line, colour and position unchanged, except: <change>. Save it as <stem>.png in the current working directory.":
1. `peel-mane`: "remove the mane and the forelock, and show the head, neck and back that were under them, smooth lilac with the same outline".
2. `peel-near-legs`: "remove the two legs nearest to the viewer, and show the belly and the two far legs that were behind them".
3. `peel-tail`: "remove the tail, and show the rump that was behind it".

For each, `paste_back` inside the dilated mask of the removed part (mane: the main mane component of MANE and MANE2; near legs: BODY and FIXED pixels below the belly line in the two front-most leg columns, found from the hoof components; tail: the tail component), then compute `seam_error`. Allow one retry per edit.

Pass, all of these:
- every `seam_error` below 12,
- an assembled frame with the mane rotated by 4 degrees around its root and the near legs rotated by 10 degrees around the hips shows no hole and no doubled part (open the PNG with the Read tool at lg size),
- the peeled areas look like clean lilac body, not smudges.

- [ ] **Step 4: Record the decision**

If it passes, extend `rig.build_sprite` with a `mode='layers'` path that takes the peeled sources and writes the parts listed in Interfaces (same file naming, same entry shape), rebuild `moon.baby`, write `{"mode": "layers", "why": "peel seams <numbers>, checked at lg size"}`, and run the stress test again (Task A10 step 5) because the layer count grows. If the stress test then fails, go back to sprite mode.
If it fails or the time box ends, write `{"mode": "sprite", "why": "<the failing check and its numbers>"}`.

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline manifest`
Expected: `rigMode` in the manifest matches `rig-mode.json`.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/tools/art/peel.py games/moon-meadow-home/tools/art/tests/test_peel.py games/moon-meadow-home/art-src/lists/rig-mode.json games/moon-meadow-home/public/art/manifest.json
git commit -m "Try layer cutting on the moon baby and record the rig mode"
```

### Task A13: Word pictures

**Files:**
- Create: `art-src/lists/sheets/words-a.json`, `art-src/sources/words-a-*.webp`, `art-src/meta/words-a*.json`, `art-src/review/words-a*.json`, `art-src/svg/<id>.svg` for fallbacks, `public/art/words/*.webp`
- Modify: `public/art/manifest.json`, `art-src/missing.json`

**Interfaces:**
- Consumes: the pipeline commands (A5), the word list (A2).
- Produces: a manifest `pictures` entry of kind `word` for every one of the 273 ids in `words.txt`, 18 of them with `tint`.

- [ ] **Step 1: Plan the sheets**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline plan-sheets --batch words-a --source words`
Expected (with a 4 x 4 grid): 18 sheets, `words-a-01` to `words-a-16` in colour and `words-a-17`, `words-a-18` grey. P1 words are on the first sheets.

- [ ] **Step 2: Generate (outside the sandbox)**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline gen --batch words-a --parallel 4`
Expected: 18 PNGs in `art-src/raw/` and 18 lossless WebPs in `art-src/sources/`. Re-running the command skips finished sheets, so a stop by the subscription's usage limit loses nothing: wait and run it again.

- [ ] **Step 3: Cut and check**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline cut --batch words-a`
Expected: one WebP per id in `public/art/words/`, a list of issues, and contact PNGs in `art-src/work/contact/`.

- [ ] **Step 4: Look at every picture**

Open each contact PNG with the Read tool. For every cell, check that the picture shows the object its label names, as one whole object in the locked style, with no text, no cut-off part, no white halo on the checkerboard, and that a 6-year-old would know it. Write the verdict per id in `art-src/review/words-a.json`: `ok`, `redo`, `svg`, or `swap:<id>` when two cells are swapped. Every id with an automatic issue other than `low-res` gets `redo` unless the picture is clearly fine.

- [ ] **Step 5: Redo, then fall back to SVG**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline redo --batch words-a && PYTHONPATH=tools python3 -m art.pipeline gen --batch words-a-r1 && PYTHONPATH=tools python3 -m art.pipeline cut --batch words-a-r1`
Then review `words-a-r1` as in Step 4. Repeat once with `words-a-r2`. For every id that ends as `svg`, draw `art-src/svg/<id>.svg` by hand in the locked style (viewBox 0 0 320 320, clean shapes, a darker outline of each fill, a soft top-left highlight made of a lighter shape, no filters, no text), then:

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline svg --batch words-a`
Expected: WebPs for the SVG ids, meta in `art-src/meta/words-a-svg.json`.

- [ ] **Step 6: Build and check the manifest**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline manifest && PYTHONPATH=tools python3 -m art.pipeline check-all && PYTHONPATH=tools python3 -m art.pipeline contact-html`
Expected: `check-all` exits 0 and reports 273 of 273 words. `art-src/missing.json` lists no word.

- [ ] **Step 7: Commit**

Commit after each of steps 3, 5 and 6, so a long run is never lost:

```bash
git add games/moon-meadow-home/art-src/lists/sheets games/moon-meadow-home/art-src/sources games/moon-meadow-home/art-src/meta games/moon-meadow-home/art-src/review games/moon-meadow-home/art-src/jobs games/moon-meadow-home/art-src/svg games/moon-meadow-home/art-src/missing.json games/moon-meadow-home/art-src/contact games/moon-meadow-home/public/art
git commit -m "Add the word pictures for the loaded reading steps"
```

### Task A14: Wave A items and backgrounds, and the Wave A art check

**Files:**
- Create: `art-src/lists/sheets/items-a.json`, sources, meta, review and outputs for the 67 Wave A items and the 6 Wave A backgrounds, SVG fallbacks `art-src/svg/ui-ghost-hand.svg`, `art-src/svg/ui-replay.svg`, `art-src/svg/ui-turn-ipad.svg`, `art-src/svg/ui-play.svg`
- Modify: `art-src/lists/items.txt` (append the four SVG-only UI pictures), `public/art/manifest.json`
- Test: `tools/art/tests/test_wave_a.py`

**Interfaces:**
- Consumes: as Task A13, plus `backgrounds` (A5).
- Produces: every Wave A id from `items.txt`, the backgrounds `bg-meadow`, `bg-nest`, `bg-stable-yard`, `bg-building-yard`, `bg-bath-pond`, `bg-sky`, and the SVG UI pictures `ui-ghost-hand` (a soft pale glowing hand pointing down and left), `ui-replay` (a round speaker button with sound waves), `ui-turn-ipad` (an iPad turning from portrait to landscape with a curved arrow), `ui-play` (a big round green button with a white triangle).

Append to `items.txt`, under `# Wave A`:

```
ui-ghost-hand | ui | A | core | 192 | - | - | svg: a soft pale glowing hand pointing down and to the left
ui-replay | ui | A | core | 192 | - | - | svg: a round speaker button with two sound waves
ui-turn-ipad | ui | A | core | 640 | - | - | svg: a tablet turning from upright to sideways with a curved arrow
ui-play | ui | A | core | 400 | - | - | svg: a big round green button with a white triangle
```

`plan-sheets` skips entries whose description starts with `svg:`; those go straight to the `svg` command with verdict `svg`. Update `test_counts_per_wave` in `test_lists.py` to `{'A': 71, 'B': 91, 'C': 30}` in the same commit.

- [ ] **Step 1: Write the failing Wave A check**

```python
# tools/art/tests/test_wave_a.py
import json
import unittest

from art import lists, paths

MANIFEST = paths.PUBLIC_ART / 'manifest.json'


@unittest.skipUnless(MANIFEST.exists(), 'no manifest yet')
class WaveATest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = json.loads(MANIFEST.read_text())

    def test_every_wave_a_picture(self):
        missing = [e.id for e in lists.load_words() + lists.load_items() if e.wave == 'A' and e.id not in self.m['pictures']]
        self.assertEqual(missing, [])

    def test_wave_a_backgrounds(self):
        want = {b.id for b in lists.load_backgrounds() if b.wave == 'A'}
        self.assertTrue(want <= set(self.m['backgrounds']))
        for b in want:
            self.assertEqual((self.m['backgrounds'][b]['w'], self.m['backgrounds'][b]['h']), (1770, 1230))

    def test_wave_a_unicorns_and_lumi(self):
        for b in ('moon', 'nestling', 'pebble', 'cosy', 'bubble'):
            for s in ('baby', 'foal'):
                self.assertIn(f'{b}.{s}', self.m['unicorns'])
        self.assertIsNotNone(self.m['lumi'])
        self.assertIsNotNone(self.m['patterns'])

    def test_files_exist(self):
        for e in self.m['pictures'].values():
            self.assertTrue((paths.PUBLIC_ART / e['src']).exists(), e['src'])


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_wave_a.py' -v`
Expected: FAIL in `test_every_wave_a_picture` with the item ids listed.

- [ ] **Step 3: Make the items and backgrounds (outside the sandbox for `gen` and `backgrounds`)**

Run, in order:
1. `PYTHONPATH=tools python3 -m art.pipeline plan-sheets --batch items-a --source items --wave A`
2. `PYTHONPATH=tools python3 -m art.pipeline gen --batch items-a --parallel 4`
3. `PYTHONPATH=tools python3 -m art.pipeline backgrounds --batch bg-a --wave A`
4. `PYTHONPATH=tools python3 -m art.pipeline cut --batch items-a`

Review every contact PNG of `items-a` and `bg-a` as in Task A13 step 4. For backgrounds, also check that the open area the description asks for is really open, that there is no character or text, and that the night scenes are deep blue and violet with warm light. Redo once, then SVG for items. A background that fails twice is generated again with the description shortened to its first sentence; if that fails, it is drawn as an SVG gradient scene (sky gradient, a hill shape, a ground band) in `art-src/svg/<id>.svg`.

Draw the four SVG UI pictures, then run `svg --batch items-a`, `derive`, `manifest`, `check-all`, `contact-html`.

- [ ] **Step 4: Run the Wave A check and every suite**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v && npx vitest run tests/art`
Expected: PASS, including `test_wave_a.py`.

- [ ] **Step 5: Look at the art in the browser at iPad size (outside the sandbox)**

Run: `playwright-cli -s=artA open http://127.0.0.1:8765/games/moon-meadow-home/art-src/contact/index.html` (the repo server from the server workstream; if it is not running yet, `cd /Users/tjitse/sites/emmas-game && python3 -m http.server 8765 --bind 127.0.0.1` in the background for this check only), then `playwright-cli -s=artA screenshot`, `playwright-cli -s=artA resize 1024 768`, `playwright-cli -s=artA screenshot`, `playwright-cli -s=artA close`, and move the PNGs from `.playwright-cli/` to `$TMPDIR`. Open them with the Read tool.
Expected: every picture shows at its real size, sharp, with no halo.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/art-src games/moon-meadow-home/tools/art/tests games/moon-meadow-home/public/art
git commit -m "Add the Wave A items, UI pictures and backgrounds"
```

Wave A art is done when `test_wave_a.py` passes, `check-all` exits 0, and `stress-results.json` holds a passing real-art run.

---

## Wave B: release 1.1

### Task B1: Berry, Snow and Post breeds, and breed silhouettes

**Files:**
- Create: sources, meta, review and outputs for `berry`, `snow`, `post` at `baby` and `foal`
- Test: `tools/art/tests/test_wave_b.py` (first part)

**Interfaces:**
- Consumes: as Task A11.
- Produces: manifest keys `berry.baby`, `berry.foal`, `snow.baby`, `snow.foal`, `post.baby`, `post.foal`. Every unicorn entry already has `sil` (Task A8), which the Breed Book shows for breeds she has not hatched. For `sparkle`, which arrives in Wave C, the Breed Book gets the `moon.baby` silhouette until then, through the `unicornEntry` fallback.

- [ ] **Step 1: Write the failing test**

```python
# tools/art/tests/test_wave_b.py
import json
import unittest

from art import lists, paths

MANIFEST = paths.PUBLIC_ART / 'manifest.json'


@unittest.skipUnless(MANIFEST.exists(), 'no manifest yet')
class WaveBTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = json.loads(MANIFEST.read_text())

    def test_wave_b_unicorns(self):
        for b in ('berry', 'snow', 'post'):
            for s in ('baby', 'foal'):
                key = f'{b}.{s}'
                self.assertIn(key, self.m['unicorns'])
                self.assertTrue((paths.PUBLIC_ART / self.m['unicorns'][key]['sil']).exists())

    def test_every_wave_b_picture(self):
        missing = [e.id for e in lists.load_items() if e.wave == 'B' and e.id not in self.m['pictures']]
        self.assertEqual(missing, [])

    def test_pins_have_silhouettes(self):
        for k, e in self.m['pictures'].items():
            if e['kind'] == 'pin':
                self.assertIn('sil', e, k)
                self.assertTrue((paths.PUBLIC_ART / e['sil']).exists())

    def test_outfits_have_slot_and_attach(self):
        for k, e in self.m['pictures'].items():
            if e['kind'] == 'outfit':
                self.assertIn(e['slot'], lists.SLOTS, k)
                x, y = e['attach']
                self.assertTrue(0 <= x <= e['w'] and 0 <= y <= e['h'], k)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run it to see `test_wave_b_unicorns` fail**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_wave_b.py' -v`
Expected: FAIL listing `berry.baby`.

- [ ] **Step 3: Generate and build, as Task A11 steps 3 and 4, for the three breeds**

Run the six jobs (babies first, then foals from their baby), then `pipeline sprite` for each key, look at each recolour and anchor PNG with the Read tool, set verdicts, and run `derive`, `manifest`.

- [ ] **Step 4: Run the test again**

Expected: `test_wave_b_unicorns` passes. The other three tests pass after Tasks B2 to B4.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/art-src games/moon-meadow-home/tools/art/tests/test_wave_b.py games/moon-meadow-home/public/art
git commit -m "Add the Berry, Snow and Post unicorn breeds"
```

### Task B2: Post Box, pins and the Home Book pictures

**Files:**
- Create: sources, meta, review and outputs for the Wave B items of pack `post` and `home`, the background `bg-post-box`

**Interfaces:**
- Consumes: the pipeline (A5), `derive` silhouettes (A8).
- Produces: `building-post-box`, `item-envelope`, `item-envelope-open`, `item-parcel`, `item-pin-pot`, `item-sash` (tint), `item-note-paper`, `pin-star`, the 40 set pins, the 4 moment pins, each pin with `sil`; `item-home-book`, the six `ui-tab-*`, `item-photo-frame`; `bg-post-box`.

Pins show at about 48 CSS pixels on a sash. At that size a pin must read by its shape alone.

- [ ] **Step 1: Plan, generate, cut (outside the sandbox for generation)**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline plan-sheets --batch post-b --source items --wave B --packs post,home && PYTHONPATH=tools python3 -m art.pipeline gen --batch post-b && PYTHONPATH=tools python3 -m art.pipeline backgrounds --batch bg-b --wave B && PYTHONPATH=tools python3 -m art.pipeline cut --batch post-b`

- [ ] **Step 2: Look at every picture**

As Task A13 step 4, plus: open the pin contact sheet scaled to 48 px cells (`contact_png(..., cell=60)`, written to `$TMPDIR`) and check that the ten pins of each set are different from each other at that size. A pin that does not read at 48 px gets `redo`.

- [ ] **Step 3: Redo, SVG fallback, derive silhouettes, manifest, check**

Run: `redo`, `gen`, `cut` for `post-b-r1` as needed, then `svg --batch post-b`, `derive`, `manifest`, `check-all`.
Expected: `test_pins_have_silhouettes` passes.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/art-src games/moon-meadow-home/tools/art/pipeline.py games/moon-meadow-home/public/art
git commit -m "Add the Post Box, pin sets and Home Book pictures"
```

### Task B3: Dressing Corner outfits

**Files:**
- Create: sources, meta, review and outputs for the 14 Wave B outfits and `bg-dressing-corner`
- Modify: `art-src/lists/items.txt` only if a visual check moves an attach point (as a ninth column `attach` with `x,y` fractions; the parser takes it when present)
- Test: `tests/art/outfits.test.ts`

**Interfaces:**
- Consumes: `outfitPlacement`, `SLOT_ANCHOR` (A9), the manifest (A6).
- Produces: outfits that sit right on every breed and stage.

- [ ] **Step 1: Write the failing test**

```ts
// tests/art/outfits.test.ts
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { outfitPlacement } from '../../src/art/unicornParts';
import type { ArtManifest } from '../../src/art/manifest';

const path = new URL('../../public/art/manifest.json', import.meta.url);
const m: ArtManifest | null = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;

describe.skipIf(!m)('outfits on every unicorn', () => {
  it('every outfit lands inside the unicorn frame with a margin', () => {
    const outfits = Object.entries(m!.pictures).filter(([, p]) => p.kind === 'outfit');
    expect(outfits.length).toBeGreaterThanOrEqual(16);
    for (const u of Object.values(m!.unicorns)) {
      for (const [id, p] of outfits) {
        const b = outfitPlacement(u, p, p.slot!, 200)!;
        const w = (u.w * 200) / u.h;
        expect(b.left, id).toBeGreaterThan(-0.25 * w);
        expect(b.left + b.width, id).toBeLessThan(1.25 * w);
        expect(b.top, id).toBeGreaterThan(-0.4 * 200);
        expect(b.top + b.height, id).toBeLessThan(1.1 * 200);
      }
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd games/moon-meadow-home && npx vitest run tests/art/outfits.test.ts`
Expected: FAIL on `outfits.length` (only 2 outfits from Wave A).

- [ ] **Step 3: Make the outfits and the background (outside the sandbox for generation)**

Run: `plan-sheets --batch dress-b --source items --wave B --packs dressing`, `gen`, `backgrounds` (already run in B2 for `bg-dressing-corner`; skip if done), `cut`.

- [ ] **Step 4: Look at the outfits on the unicorns**

Write a scratchpad script that composes, with Pillow, every outfit on `moon.baby`, `moon.foal` and `pebble.baby` (recoloured canonical layers plus the outfit at the position `outfitPlacement` gives, reimplemented in Python with the same numbers: slot width share, attach point, anchor) into `$TMPDIR/outfits.png`. Open it with the Read tool. Crowns and hats sit on the head behind or around the horn, garlands and necklaces around the neck, capes on the back, the bow in the mane. Fix a wrong spot with an `attach` value in `items.txt` or an anchor override, then rebuild. Set verdicts.

- [ ] **Step 5: Manifest, tests**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m art.pipeline manifest && npx vitest run tests/art && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`
Expected: PASS, including `test_outfits_have_slot_and_attach`.

- [ ] **Step 6: Commit**

```bash
git add games/moon-meadow-home/art-src games/moon-meadow-home/tools/art games/moon-meadow-home/tests/art/outfits.test.ts games/moon-meadow-home/public/art
git commit -m "Add the Dressing Corner outfits"
```

### Task B4: Jewel Box, decoration plots and the snow stone

**Files:**
- Create: sources, meta, review and outputs for `item-jewel-box`, `item-jewel-letter`, `item-jewel-number`, the 13 `decor-*` of Wave B and `ui-stone-snow`

**Interfaces:**
- Consumes: the pipeline (A5).
- Produces: those pictures. Decorations are shown at about 200 CSS pixels in the meadow, so they are made at 640 px on their long side.

- [ ] **Step 1: Plan, generate, cut (outside the sandbox for generation)**

Run: `plan-sheets --batch jewel-b --source items --wave B --packs core,meadow`, `gen`, `cut`.

- [ ] **Step 2: Look at every picture**

As Task A13 step 4. Decorations must not contain numbers (the flower clock and sundial), letters or characters.

- [ ] **Step 3: Redo, SVG, manifest, Wave B check**

Run: `redo`, `svg`, `manifest`, `check-all`, `contact-html`, then `PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_wave_b.py' -v`.
Expected: every test in `test_wave_b.py` passes.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/art-src games/moon-meadow-home/public/art
git commit -m "Add the Jewel Box, decoration plots and the snow stone"
```

### Task B5: Word picture top-up from content requests

**Files:**
- Create: sheets, sources, meta, review and outputs for batch `words-req`
- Test: `tools/art/tests/test_lists.py` (one added test)

**Interfaces:**
- Consumes: `art-src/lists/requests.txt` (owned by the content workstream, Contract 3), `lists.load_requests()` (A2).
- Produces: a picture for every requested id, at most 200 per run.

- [ ] **Step 1: Write the failing test**

```python
    # add to tools/art/tests/test_lists.py
    def test_requests_parse_and_do_not_clash(self):
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for n in ('words.txt', 'notes.txt', 'tint.txt'):
                (root / n).write_text((paths.LISTS / n).read_text())
            (root / 'requests.txt').write_text('# requests\nlamb-toy | R21 | a soft plush toy lamb\n')
            req = lists.load_requests(root)
            self.assertEqual([(r.id, r.step, r.wave) for r in req], [('lamb-toy', 'R21', 'B')])
            self.assertNotIn('lamb-toy', [w.id for w in lists.load_words(root)])
```

Add it to `WordsTest`. It passes once `load_requests` takes the `root` argument (it does in Task A2); if it fails, fix `load_requests`.

- [ ] **Step 2: Run the tests**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_lists.py' -v`
Expected: PASS.

- [ ] **Step 3: Make the requested pictures**

If `requests.txt` is missing or empty, write "no requests" in the commit message and stop here. Otherwise drop ids that already have a picture or clash with an item id, then run `plan-sheets --batch words-req --source requests`, `gen`, `cut`, review as Task A13 step 4, `redo`, `svg`, `manifest`, `check-all`.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/art-src games/moon-meadow-home/tools/art/tests/test_lists.py games/moon-meadow-home/public/art
git commit -m "Add the word pictures the content packs asked for"
```

---

## Wave C: releases 1.2 and 1.3

### Task C1: Sparkle breed and Sparkle Salon

**Files:**
- Create: sources, meta, review and outputs for `sparkle.baby`, `sparkle.foal`, the Wave C items of pack `salon`, `bg-salon`
- Create: `src/art/cousins.ts`
- Test: `tests/art/cousins.test.ts`, `tools/art/tests/test_wave_c.py` (first part)

**Interfaces:**
- Consumes: as Tasks A11 and A13.
- Produces: the Sparkle breed, Salon pictures, and the cousins' looks:

```ts
// src/art/cousins.ts
import type { BreedId, Stage } from './manifest';
import type { Colours } from './palette';
export type CousinLook = { breed: BreedId; stage: Stage; colours: Colours; outfit: { mane?: string; neck?: string } };
export const COUSINS: Record<'dot' | 'fen', CousinLook>;
```

Dot is a `pebble` foal with colours `{ body: '#dcffe8', mane: '#4fc3ff', mane2: '#ffbf3f' }` and `outfit: { mane: 'outfit-bow' }`. Fen is a `berry` foal with colours `{ body: '#ffe2cf', mane: '#9d7bff', mane2: '#ff7fbf' }` and `outfit: { neck: 'outfit-garland-daisy' }`. Cousins are visitors, so they are foals and look older than her babies.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/art/cousins.test.ts
import { describe, expect, it } from 'vitest';
import { COUSINS } from '../../src/art/cousins';
import { BODY_COLOURS, MANE_COLOURS } from '../../src/art/palette';

describe('cousins', () => {
  it('Dot and Fen are foals in palette colours with an outfit each', () => {
    for (const c of Object.values(COUSINS)) {
      expect(c.stage).toBe('foal');
      expect(BODY_COLOURS).toContain(c.colours.body);
      expect(MANE_COLOURS).toContain(c.colours.mane);
      expect(MANE_COLOURS).toContain(c.colours.mane2);
      expect(Object.keys(c.outfit)).toHaveLength(1);
    }
    expect(COUSINS.dot.breed).not.toBe(COUSINS.fen.breed);
  });
});
```

```python
# tools/art/tests/test_wave_c.py
import json
import unittest

from art import lists, paths

MANIFEST = paths.PUBLIC_ART / 'manifest.json'


@unittest.skipUnless(MANIFEST.exists(), 'no manifest yet')
class WaveCTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = json.loads(MANIFEST.read_text())

    def test_all_breeds(self):
        for b in lists.load_breeds():
            for s in ('baby', 'foal'):
                self.assertIn(f"{b['id']}.{s}", self.m['unicorns'])

    def test_every_picture_and_background(self):
        missing = [e.id for e in lists.load_words() + lists.load_items() if e.id not in self.m['pictures']]
        self.assertEqual(missing, [])
        self.assertEqual({b.id for b in lists.load_backgrounds()} - set(self.m['backgrounds']), set())


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd games/moon-meadow-home && npx vitest run tests/art/cousins.test.ts; PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -p 'test_wave_c.py' -v`
Expected: FAIL on the missing module and on `sparkle.baby`.

- [ ] **Step 3: Write `src/art/cousins.ts`, then make the art**

Generate `sparkle` as Task A11 steps 3 and 4. Then `plan-sheets --batch salon-c --source items --wave C --packs salon`, `gen`, `backgrounds --batch bg-c --wave C` (all three Wave C backgrounds), `cut`, review, `redo`, `svg`, `manifest`.

- [ ] **Step 4: Run the tests**

Expected: `cousins.test.ts` passes; `test_all_breeds` passes; `test_every_picture_and_background` passes after Tasks C2 and C3.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/art/cousins.ts games/moon-meadow-home/tests/art/cousins.test.ts games/moon-meadow-home/tools/art/tests/test_wave_c.py games/moon-meadow-home/art-src games/moon-meadow-home/public/art
git commit -m "Add the Sparkle breed, the Salon pictures and the cousins' looks"
```

### Task C2: Valley map, mist and Letter Lane

**Files:**
- Create: sources, meta, review and outputs for the `building-icon-*`, `ui-map-scroll`, `ui-mist`, `item-letter-arch` (backgrounds `bg-valley-map` and `bg-letter-lane` were made in Task C1 step 3)
- Create: `src/art/valley.ts`
- Test: `tests/art/valley.test.ts`

**Interfaces:**
- Consumes: the pipeline (A5).
- Produces: map pictures and the building icon spots on the map:

```ts
// src/art/valley.ts
export type Area = 'meadow' | 'stable-yard' | 'village-lane' | 'castle-hill' | 'sky';
export type MapSpot = { area: Area; x: number; y: number };   // centre in stage pixels on the 1180 x 820 map
export const MAP_SPOTS: Record<string, MapSpot>;              // keyed by building icon picture id
```

The integrator's scene workstream may replace the spot values after a visual check of the map. The art workstream sets them from the generated map: Claude opens `bg-valley-map` with the Read tool and picks one open grass plot per icon inside the right area, at least 140 stage pixels apart.

- [ ] **Step 1: Write the failing test**

```ts
// tests/art/valley.test.ts
import { describe, expect, it } from 'vitest';
import { MAP_SPOTS } from '../../src/art/valley';

describe('valley map spots', () => {
  it('has a spot per building icon, on the stage and apart', () => {
    const ids = Object.keys(MAP_SPOTS).sort();
    expect(ids).toEqual(['building-icon-bath-pond', 'building-icon-castle', 'building-icon-letter-lane', 'building-icon-post-box', 'building-icon-salon', 'building-icon-stables']);
    const spots = Object.values(MAP_SPOTS);
    for (const s of spots) {
      expect(s.x).toBeGreaterThanOrEqual(80); expect(s.x).toBeLessThanOrEqual(1100);
      expect(s.y).toBeGreaterThanOrEqual(80); expect(s.y).toBeLessThanOrEqual(740);
    }
    for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++)
      expect(Math.hypot(spots[a].x - spots[b].x, spots[a].y - spots[b].y)).toBeGreaterThanOrEqual(140);
    expect(MAP_SPOTS['building-icon-castle'].area).toBe('castle-hill');
    expect(MAP_SPOTS['building-icon-bath-pond'].area).toBe('meadow');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd games/moon-meadow-home && npx vitest run tests/art/valley.test.ts`
Expected: FAIL on the missing module.

- [ ] **Step 3: Make the pictures, then write `valley.ts` from the map**

Run `plan-sheets --batch valley-c --source items --wave C --packs valley,letters`, `gen`, `cut`, review, `redo`, `svg`, `manifest`. `ui-mist` must have soft edges with no hard outline: if the cut leaves an outline, draw it as SVG instead (overlapping white circles at 70 percent opacity, rendered by `svg`). Then write `MAP_SPOTS` from the map as described.

- [ ] **Step 4: Run the test**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/src/art/valley.ts games/moon-meadow-home/tests/art/valley.test.ts games/moon-meadow-home/art-src games/moon-meadow-home/public/art
git commit -m "Add the valley map pictures, mist and Letter Lane"
```

### Task C3: Titles, come-along ribbon and two-state props

**Files:**
- Create: sources, meta, review and outputs for the remaining Wave C items (`item-title-ribbon`, `item-herd-banner`, `item-hundred-flag`, `outfit-come-along`, the ten `prop-*`)

**Interfaces:**
- Consumes: the pipeline (A5).
- Produces: those pictures. Each `prop-*` pair shows the same object in two states, so the pair must match in size, angle and colour.

- [ ] **Step 1: Plan the props so each pair shares one sheet, side by side**

Run: `plan-sheets --batch props-c --source items --wave C --packs core,meadow`. Check `art-src/lists/sheets/props-c.json`: each pair (`-packed` and `-open`, `-tied` and `-loose`, `-locked` and `-open`, `-zipped` and `-unzipped`, `-packed` and `-unpacked`) is on the same sheet in neighbouring cells. The list order in `items.txt` already puts each pair together, so this holds when the batch starts at a sheet boundary.

- [ ] **Step 2: Generate, cut, review (outside the sandbox for generation)**

Run `gen`, `cut`, review as Task A13 step 4. Also open each pair side by side and check that only the state differs. A pair where the object itself changed gets `redo` for both ids.

- [ ] **Step 3: Redo, SVG, manifest, Wave C check**

Run `redo`, `svg`, `manifest`, `check-all`, `contact-html`, then `PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v`.
Expected: every suite passes, including `test_wave_c.py`.

- [ ] **Step 4: Commit**

```bash
git add games/moon-meadow-home/art-src games/moon-meadow-home/public/art
git commit -m "Add the title pictures, the come-along ribbon and the two-state props"
```

### Task C4: Final stress test and art sign-off

**Files:**
- Modify: `art-src/stress-results.json`, `art-src/contact/index.html`, `art-src/README.md` (a short "state of the art" section: counts per kind, rig mode, the latest stress numbers, ids that are SVG fallbacks)

**Interfaces:**
- Consumes: everything above.
- Produces: the final art state for the integrator.

- [ ] **Step 1: Stress test with the full breed mix at 44 and at 60 unicorns (outside the sandbox)**

Run (Vite dev server running): `cd games/moon-meadow-home && ART=real N=44 sh flows/art-stress.sh && ART=real N=60 sh flows/art-stress.sh`
Expected: both record `dom` with all three sizes passing. Read the screenshots: all nine breeds appear. If 60 fails and 44 passes, write that limit into the README section; spec 5.2 caps the meadow at 12 animated babies, so 44 is the requirement and 60 is margin.

- [ ] **Step 2: Run the stress page from the built app through the repo server**

Run: `cd games/moon-meadow-home && npx vite build && sh flows/art-stress.sh http://127.0.0.1:8765/games/moon-meadow-home/dist`
Expected: the same verdict as the dev run. This is the address Tjitse uses on the iPad (with the Mac's `.local` name in place of 127.0.0.1).

- [ ] **Step 3: Full checks**

Run: `cd games/moon-meadow-home && PYTHONPATH=tools python3 -m unittest discover -s tools/art/tests -t tools -v && npx vitest run tests/art && npx svelte-check --threshold error && PYTHONPATH=tools python3 -m art.pipeline check-all && PYTHONPATH=tools python3 -m art.pipeline status`
Expected: every suite passes, `check-all` exits 0, `status` shows no `pending` and no `redo`.

- [ ] **Step 4: Write the README section and the contact page**

Run: `PYTHONPATH=tools python3 -m art.pipeline contact-html`, then add the "State of the art" section to `art-src/README.md` with the numbers from `status` and `stress-results.json`.

- [ ] **Step 5: Commit**

```bash
git add games/moon-meadow-home/art-src games/moon-meadow-home/public/art/manifest.json
git commit -m "Record the final art state and stress test results"
```

---

## Budget

Codex runs, estimated from the lists and a 4 x 4 grid: words 18 sheets, Wave A items 5 sheets, Wave B items 6 sheets, Wave C items 2 sheets, 18 unicorn pictures, Lumi 2, backgrounds 11, calibration 3, spike up to 6, redos about 15 percent. That is about 80 runs of 30,000 to 40,000 subscription tokens, about 3 million tokens. Wave A alone is about 50 runs. With 4 runs at a time and about 1.5 minutes per run, Wave A generation takes about 20 minutes of wall time plus waits for usage limits. The ledger and the skip-if-done rule make every batch resumable.

ElevenLabs credits: none. This workstream makes no audio.

## Self-review notes

- Spec 2.6 egg kinds and breeds: Tasks A2 (egg list), A11, B1, C1. Golden and speckled eggs: A14 (egg sheet is Wave A). Building eggs (bubble, post, sparkle): A14.
- Spec 2.7 collecting: herd colours and traits (A6, A9), stall doors and heads (A9 `headOnly`, A14 door pictures), sky unicorn (A8 derive), Breed Book silhouettes (A8, B1), pins and sets with silhouettes (B2), Jewel Box (B4), Home Book tabs (B2), moonflower patches (A14).
- Spec 3.10 plurals: every one picture (A2 test), code heaps and jars (A6), the mice jar (A14 `item-mice-jar`), crescent ending gem (A14 `ui-gem-crescent`).
- Spec 5.2: transform and opacity only (A9 CSS), masks prefixed (A6), aria labels on pictures (A6, A9), at most 12 animated babies is a scene rule; the stress test covers 44 and 60.
- Spec 5.4: placeholder run (A10), real run (A11), final run (C4), memory budget in the verdict (A10).
- Spec 5.5: locked style in every prompt (A3), cut-outs with free local tools (A1, A4), contact sheet page and a script that checks size, transparency and weight (A4, A5), one object per word picture (A3 prompt), backgrounds (A14, B2, C1). Picture check with Emma is Tjitse's step after this session; the contact page (A5) is what he shows her.
