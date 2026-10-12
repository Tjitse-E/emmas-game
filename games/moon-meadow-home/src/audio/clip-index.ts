export type ClipEntry = {
  hash: string; speaker: string; text: string; file: string; model?: string; seed?: number;
  duration_ms?: number | null; generated?: string; ok?: boolean;
  stt?: { hash: string; text: string; match: boolean; how?: string; tries?: number };
};
export type ClipManifest = { clips: Record<string, ClipEntry>; updated?: string };

/** Which clips exist and may be used. A clip with ok: false failed the speech-to-text check and counts as absent. */
export class ClipIndex {
  private packs = new Map<string, ClipManifest>();

  set(pack: string, manifest: ClipManifest | null): void {
    if (manifest && manifest.clips) this.packs.set(pack, manifest);
    else this.packs.delete(pack);
  }

  has(id: string): boolean {
    for (const m of this.packs.values()) {
      const c = m.clips[id];
      if (c) return c.ok !== false;
    }
    return false;
  }

  ids(prefix = ''): string[] {
    const out = new Set<string>();
    for (const m of this.packs.values()) for (const [id, c] of Object.entries(m.clips)) if (id.startsWith(prefix) && c.ok !== false) out.add(id);
    return [...out].sort();
  }
}
