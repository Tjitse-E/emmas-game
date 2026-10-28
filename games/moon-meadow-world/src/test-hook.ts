// window.__game: the test hook for the flows and for Tjitse in the console. State, every touchable thing on screen
// (ui targets and 3D targets), the answer of the open moment, jumps between parts, and the save.
import * as THREE from 'three';
import type { Owned, PrincessLook, Ribbon } from './contracts';
import type { UiTarget } from './ui';
import { HAY_RACK, NEST, PICNIC, SLIDE, SLIDE_CURVE, WILD_EGG, dist2 } from './layout';
import { audio } from './audio';
import { parseOwned } from './wardrobe';
import { nameGems } from './ui/geometry';
import { type Game, type Part, doorPoint, flat, isPart } from './game/game';
import { jump } from './game/level';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

/**
 * A world point and a size in metres as a screen target, when it is on screen. Taps on these find a sphere around
 * the point (herd.pick) or a picker shape, so the size is measured across the view (the camera's right and up).
 */
function target3d(g: Game, name: string, p: THREE.Vector3, sizeM: number): UiTarget | null {
  const s = g.world.toScreen(p);
  if (!s.visible) return null;
  const cam = g.world.camera;
  const right = g.world.toScreen(_w.set(1, 0, 0).applyQuaternion(cam.quaternion).multiplyScalar(sizeM / 2).add(p));
  const top = g.world.toScreen(_v.set(0, 1, 0).applyQuaternion(cam.quaternion).multiplyScalar(sizeM / 2).add(p));
  const w = Math.round(Math.abs(right.x - s.x) * 2);
  const h = Math.round(Math.abs(top.y - s.y) * 2);
  return { name, x: Math.round(s.x), y: Math.round(s.y), w, h };
}

/** Door n's tap area: its full width and storey on the stable front. */
function doorTarget(g: Game, n: number): UiTarget | null {
  const c = doorPoint(n);
  const s = g.world.toScreen(c);
  if (!s.visible) return null;
  const l = g.world.toScreen(_v.copy(c).setX(c.x - 0.75));
  const r = g.world.toScreen(_w.copy(c).setX(c.x + 0.75));
  const t = g.world.toScreen(_v.copy(c).setY(c.y + 0.97));
  const b = g.world.toScreen(_w.copy(c).setY(c.y - 0.97));
  return { name: `door ${n}`, x: Math.round(s.x), y: Math.round(s.y), w: Math.round(r.x - l.x), h: Math.round(b.y - t.y) };
}

export function installHook(g: Game): void {
  const { world, actors, layer } = g;

  const moment = () => {
    const m = layer.snapshot().moment;
    if (m) return m;
    if (g.door) {
      return { kind: 'door', phase: g.door.kind, open: g.door.open, level: g.door.level, misses: g.door.misses, answer: `door ${g.door.door}` };
    }
    return null;
  };

  const targets = (): UiTarget[] => {
    const out: (UiTarget | null)[] = [...layer.snapshot().targets];
    const p = actors.princess.position;
    out.push(target3d(g, 'princess', _v.set(p.x, p.y + 0.6, p.z).clone(), 1.0));
    for (const u of actors.herd.all()) {
      if (u.mode === 'stall') continue;
      // herd.pick takes a tap in the 3D hit sphere or within 32 px of its middle on screen, so the real tap area is
      // never under 64 px.
      const t = target3d(g, `unicorn ${u.id}`, u.hitCentre(new THREE.Vector3()), u.build.hit * 2);
      out.push(t && { ...t, w: Math.max(t.w, 64), h: Math.max(t.h, 64) });
    }
    for (let n = 1; n <= 20; n++) out.push(doorTarget(g, n));
    out.push(target3d(g, 'nest', new THREE.Vector3(NEST.center.x, 0.4, NEST.center.z), 2.4));
    if (actors.egg.visible) {
      const e = actors.egg.position.clone();
      out.push(target3d(g, dist2(flat(e), WILD_EGG.at) < 1 ? 'wild egg' : 'egg', e, 0.9));
    }
    out.push(target3d(g, 'slide', SLIDE_CURVE.getPointAt(0.62), 1.4));
    out.push(target3d(g, 'slide top', SLIDE.top.clone(), 1.2));
    out.push(target3d(g, 'rack', new THREE.Vector3(HAY_RACK.center.x, 0.9, HAY_RACK.center.z), 1.8));
    out.push(target3d(g, 'picnic', new THREE.Vector3(PICNIC.rug.center.x, 0.1, PICNIC.rug.center.z), 2));
    if (g.goal) out.push(target3d(g, 'goal', new THREE.Vector3(g.goal.stand.x, 0, g.goal.stand.z), 1.2));
    return out.filter((t): t is UiTarget => t !== null);
  };

  /** The customiser's state from the layer: open, and the row in focus (null while it is closed). */
  const wardrobe = () => layer.snapshot().wardrobe;

  const hook = {
    state() {
      const p = actors.princess;
      const q = g.quests;
      return {
        part: g.part,
        moment: moment(),
        look: { ...p.look },
        wardrobe: wardrobe(),
        readingLevel: g.options.readingLevel ?? g.save.data.reading.level,
        mathsBand: g.maths.band,
        quests: {
          offered: [...q.offered],
          done: [...q.done],
          running: q.running,
          helpers: q.helpers.slice(),
          rose: q.rose,
          hay: q.hay,
          freeMs: Math.round(q.freeMs),
          maths: q.maths,
          dressing: q.dressing,
          gifts: q.gifts.map((i) => `${i.field}:${i.id}`),
        },
        owned: g.save.data.owned,
        clock: { checkedMs: Math.round(g.clock.checkedMs), dressMs: { ...g.clock.dressMs } },
        sound: audio.soundState(),
        princess: { x: +p.position.x.toFixed(2), z: +p.position.z.toFixed(2), mode: p.mode },
        herd: actors.herd.all().map((u) => {
          const door = g.herd.find((h) => h.id === u.id)?.door ?? g.babies.find((b) => b.unicorn === u)?.door ?? null;
          return { id: u.id, name: u.name, door, mode: u.mode, x: +u.position.x.toFixed(2), z: +u.position.z.toFixed(2) };
        }),
        followers: g.followers.list.map((u) => u.id),
        goal: g.goal?.place ?? null,
        egg: actors.egg.visible ? { x: +actors.egg.position.x.toFixed(2), z: +actors.egg.position.z.toFixed(2) } : null,
        timeOfDay: +world.timeOfDay.toFixed(2),
        stalls: [...g.stalls.keys()].sort((a, b) => a - b),
        results: g.results.lines,
      };
    },
    targets,
    /** The name of the target that answers the open moment now (a stone, a bell, a gem, the star, an item, a door). */
    answer(): string | null {
      return moment()?.answer ?? null;
    },
    /**
     * The open moment's spec as the game planned it: an egg's numbers, stones and decoy kinds; a wish's target,
     * basket, level and decoy kinds; naming's bells and, once chosen, the gems of the name in slot order.
     */
    spec(): unknown {
      const s = g.openSpec as Record<string, unknown> | null;
      if (!s) return null;
      // An egg sum (with its grade and heart) and a bead tree string: everything but the clips.
      if ('stones' in s || 'tray' in s) {
        const { clips: _clips, ...rest } = s;
        return rest;
      }
      if ('basket' in s) {
        const w = s as { kind: string; level: number; target: { word: string }; basket: { word: string }[]; decoys: Record<string, string> };
        return { kind: w.kind, level: w.level, target: w.target.word, basket: w.basket.map((i) => i.word), decoys: w.decoys };
      }
      const n = s as { bells: { name: string }[]; chosen: { name: string; gpcs: string[]; distractors: string[] } | null };
      return {
        bells: n.bells.map((b) => b.name),
        chosen: n.chosen ? { name: n.chosen.name, gems: nameGems(n.chosen.gpcs), distractors: n.chosen.distractors } : null,
      };
    },
    /** Run the open moment's next idle step now (repeat, then the focused hint). */
    idleNow(): boolean {
      if (g.door) {
        g.door.idleNow();
        return true;
      }
      return layer.idleNow();
    },
    jump(part: string): boolean {
      if (!isPart(part)) return false;
      jump(g, part as Part);
      return true;
    },
    /** End the current timed wait (free play's two minutes, the pond's 45 s). */
    skip(): number {
      return g.run.skip();
    },
    perf() {
      return { ...world.perf(), ...actors.stats(), pixelRatio: world.renderer.getPixelRatio() };
    },
    missingClips(): string[] {
      return audio.missing.slice();
    },
    /** A world point on screen (flows tap the ground with it). */
    screenOf(x: number, z: number, y = 0) {
      return world.toScreen(new THREE.Vector3(x, y, z));
    },
    /** Change her look (missing fields keep what she wears) and save it. */
    setLook(look: Partial<PrincessLook>): PrincessLook {
      actors.princess.setLook(look);
      g.save.write((s) => void (s.look = { ...actors.princess.look }));
      return { ...actors.princess.look };
    },
    /** The ribbon colours she has earned (pink is always hers), as goodnight would add them. The customiser reads them when it opens. */
    setRibbons(ribbons: Ribbon[]): Ribbon[] {
      g.save.write((s) => void (s.ribbons = ribbons.slice()));
      return g.save.data.ribbons.slice();
    },
    /** The earned items she owns (2.3.0), as a quest's gift would add them. The wardrobe reads them when it opens. */
    setOwned(owned: Partial<Owned>): Owned {
      g.save.write((s) => void (s.owned = parseOwned({ ...s.owned, ...owned })));
      return g.save.data.owned;
    },
    /** What the save holds now (read from the store again; from memory with ?fresh=1). */
    save() {
      return g.save.load();
    },
    /** Remove the save: the next load is a first visit. */
    clearSave(): boolean {
      g.save.clear();
      return true;
    },
  };
  (window as unknown as { __game: typeof hook }).__game = hook;
}
