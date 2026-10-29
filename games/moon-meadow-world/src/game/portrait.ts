// The customiser's camera (docs/v4/2.2.md 2.4): Princess Emma close up on the left, the panel on the right. The world
// camera always looks at a ground point from the south, so this pure helper puts that ground point on the line of
// sight through a point `lookY` above her, behind her, and moves it east so she stands in the middle of the space left
// of the panel. world.frame(center, width, { pitch, shiftY: 0 }) then puts the camera at L + d (0, sin p, cos p),
// looking at L = (her.x + ox, lookY, her.z). shiftY 0 keeps frame() from making a low pitch into a sky shot.
import type { LookTab, Vec2 } from '../contracts';
import { TABS } from '../wardrobe';
import { FOV } from '../world/camera';
import { wardrobeLayout } from '../ui/geometry';

export type PortraitKind = 'body' | 'face' | 'feet';

/** hvis: metres seen top to bottom at her; lookY: the height at the middle of the screen; pitch in degrees. */
export const PORTRAIT: Record<PortraitKind, { hvis: number; lookY: number; pitch: number }> = {
  /** The hair, gown and crown tabs and the default: all of her, feet at about 77%. */
  body: { hvis: 2.08, lookY: 0.58, pitch: 8 },
  /**
   * The eyes tab (eyes, earrings, necklace) and the sparkles tab: her head about 330 px high. 2.3.0's last pass: a
   * little wider and lower than 2.2's (1.05 m at 1.08 m), so the necklace shows above Done and a hair thing on her
   * left stays on screen.
   */
  face: { hvis: 1.25, lookY: 0.98, pitch: 6 },
  /**
   * The shoes tab (2.3.0's last pass): a little closer than the body frame and lower, so her shoes (whose toes stand
   * about 0.3 m in front of her) are above Done, which hid them in the body frame.
   */
  feet: { hvis: 1.6, lookY: 0.3, pitch: 10 },
};

/** The tabs that bring the camera to her face (wardrobe.ts TABS). */
export const FACE_TABS: readonly LookTab[] = TABS.filter((t) => t.frame === 'face').map((t) => t.tab);
/** A face or feet frame goes back to the body frame this long after the last touch on its tab. */
export const FACE_RETURN_MS = 2500;
/** The first move into the portrait, and every move between the frames. */
export const ENTER_MS = 900;
export const MOVE_MS = 500;

export const portraitKind = (tab: LookTab | null): PortraitKind => (tab ? (TABS.find((t) => t.tab === tab)?.frame ?? 'body') : 'body');

/** The panel's left edge in CSS px, as the layer draws it (2.2): she stands at half of it. */
export function panelLeftOf(w: number, h: number): number {
  return wardrobeLayout(w, h).panel.x;
}

export interface PortraitFrame {
  kind: PortraitKind;
  /** For world.frame(center, width, { pitch, shiftY: 0 }). */
  center: Vec2;
  width: number;
  pitch: number;
  /** Where the camera ends up, and the point it looks through (world space). */
  camera: { x: number; y: number; z: number };
  look: { x: number; y: number; z: number };
}

/**
 * The frame for a tab (null: the body frame). `screen.panelLeft` is the panel's left edge: she stands at half of it,
 * the middle of the preview. `halfFov` is half the camera's vertical field of view in degrees.
 */
export function portraitFrame(her: Vec2, row: LookTab | null, screen: { w: number; h: number; panelLeft: number }, halfFov = FOV / 2): PortraitFrame {
  const kind = portraitKind(row);
  const { hvis, lookY, pitch } = PORTRAIT[kind];
  const t = Math.tan((halfFov * Math.PI) / 180);
  const p = (pitch * Math.PI) / 180;
  const aspect = screen.w / screen.h;
  const d = hvis / (2 * t);
  const xFrac = screen.panelLeft / 2 / screen.w;
  const ox = (1 - 2 * xFrac) * d * t * aspect;
  const look = { x: her.x + ox, y: lookY, z: her.z };
  return {
    kind,
    center: { x: look.x, z: her.z - lookY / Math.tan(p) },
    width: (d + lookY / Math.sin(p)) * 2 * t * aspect,
    pitch,
    camera: { x: look.x, y: lookY + d * Math.sin(p), z: her.z + d * Math.cos(p) },
    look,
  };
}
