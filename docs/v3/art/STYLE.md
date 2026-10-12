# Art style

Locked by Tjitse on 2026-10-12. Every picture in v3 matches [style-reference.png](style-reference.png).

## The style

- Clean, smooth picture-book look. No paint, gouache, watercolour, brush or paper texture.
- Clean shapes with smooth soft shading and light from the top left.
- A warm outline in a darker shade of each fill.
- Babies: big head, big eyes with two highlights and lashes, rosy cheeks, short legs, round body, curly mane and tail, golden horn and hooves.
- Pastel base colours. Saturated accents only for things to tap or collect.
- Plain white background for anything that gets cut out. No text in pictures.
- Our own characters only. No look-alikes of trademarked characters.

## How pictures are made

Pictures come from the image generation tool in Tjitse's Codex subscription. No paid image API (see [../decisions.md](../decisions.md)). Always attach `style-reference.png` and put the prompt before the `-i` flag, because `-i` takes every argument after it as a file:

```sh
codex exec --skip-git-repo-check --sandbox workspace-write \
  "Use your image generation tool to draw <subject> in exactly the style of the attached picture: clean shapes, smooth soft shading, warm darker outline, light from top left, no paint or brush texture, plain white background, no text. Save it as <file>.png in the current working directory." \
  -i style-reference.png
```

Codex needs the network, so run it outside the sandbox. Each picture costs subscription tokens: about 31,000 from scratch and about 14,000 for a redraw from a reference.
