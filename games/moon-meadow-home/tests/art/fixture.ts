import type { ArtManifest, UnicornEntry } from '../../src/art/manifest.ts';

type Box = [number, number, number, number];
type Pt = [number, number];

export function unicornFixture(breed: UnicornEntry['breed'] = 'moon', stage: UnicornEntry['stage'] = 'baby'): UnicornEntry {
  const parts = (r: 'sm' | 'lg') => [
    { id: 'tail' as const, box: [0, 100, 120, 120] as Box, pivot: [110, 160] as Pt, anim: 'tail' as const,
      layers: [{ src: `unicorns/${breed}.${stage}.${r}.tail-mane.webp`, tint: 'mane' as const, box: [0, 100, 120, 120] as Box }] },
    { id: 'body' as const, box: [80, 0, 320, 300] as Box, pivot: [240, 300] as Pt, anim: 'none' as const,
      layers: [
        { src: `unicorns/${breed}.${stage}.${r}.body.webp`, tint: 'body' as const, box: [80, 40, 320, 260] as Box },
        { src: `unicorns/${breed}.${stage}.${r}.mane.webp`, tint: 'mane' as const, box: [180, 10, 80, 140] as Box },
        { src: `unicorns/${breed}.${stage}.${r}.fixed.webp`, tint: 'none' as const, box: [80, 0, 320, 300] as Box },
      ] },
    { id: 'lids' as const, box: [270, 70, 40, 30] as Box, pivot: [290, 85] as Pt, anim: 'blink' as const, hidden: true,
      layers: [{ src: `unicorns/${breed}.${stage}.${r}.lids.webp`, tint: 'body' as const, box: [270, 70, 40, 30] as Box }] },
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
