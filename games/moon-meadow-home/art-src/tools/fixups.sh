#!/bin/sh
# Fixes made after looking at the cut pictures of batch A1. `pipeline cut` writes pictures again from the sheets,
# so run this after any new cut of words-a, items-a, items-a-mid or items-a-big. From the game folder:
#   sh art-src/tools/fixups.sh
# Clearing again a picture that is already clear only prints "no white region".
set -e
export PYTHONPATH=tools
# Small parts that the cutter drops: rain drops, sun rays. White inside the hoop and the bib's neck.
python3 art-src/tools/recut.py --batch words-a --ids rain,sun
python3 art-src/tools/recut.py --batch words-a --ids hoop,bib --clear-white
python3 - <<'PY'
from PIL import Image
import numpy as np
p = 'public/art/words/sun.webp'
a = np.asarray(Image.open(p).convert('RGBA')).copy()
a[a[..., :3].min(axis=2) > 215, 3] = 0          # white rim specks around the rays
Image.fromarray(a).save(p, 'WEBP', quality=88, method=6, exact=False)
PY
python3 art-src/tools/clear_holes.py public/art/items/station-swing.webp
c() { f=$1; shift; python3 art-src/tools/clear_holes.py public/art/$f --at "$@"; }
c words/bag.webp 0.54,0.32
c words/basket.webp 0.51,0.28
c words/ring.webp 0.50,0.62
c words/wheel.webp 0.59,0.30 0.42,0.30 0.70,0.42 0.30,0.43 0.70,0.59 0.30,0.59 0.42,0.71 0.58,0.70
c words/ladder.webp 0.48,0.28 0.64,0.51 0.44,0.44 0.39,0.61 0.35,0.78
c items/item-scissors.webp 0.60,0.25 0.76,0.61
c words/harp.webp 0.38,0.47 0.42,0.47 0.46,0.46 0.51,0.45
c words/key.webp 0.58,0.29
c words/lock.webp 0.50,0.31
c words/mug.webp 0.73,0.48
c words/jug.webp 0.72,0.36
c items/item-wish-basket.webp 0.50,0.22
c words/teacup.webp 0.79,0.43
c words/tape.webp 0.39,0.51
c items/item-name-tag.webp 0.50,0.29
c words/horn.webp 0.51,0.61
c words/sled.webp 0.69,0.50 0.49,0.60 0.32,0.66
c words/belt.webp 0.50,0.45
c words/mask.webp 0.70,0.48 0.37,0.54
c words/cup.webp 0.77,0.46
c words/chain.webp 0.74,0.26 0.55,0.48 0.27,0.73
c words/well.webp 0.50,0.37 0.38,0.51 0.59,0.51
