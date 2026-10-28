# Requests from the reading lane (2.3.0)

The reading lane compiles and passes its tests against the step 0 files as they are. Nothing below blocks the merge.

## For the integrator

1. **No new clip lines are needed.** `tools/lines.ts` `phraseLine()` already gives a line for all 30 `phrase-<colour>-<thing>` clips ("The green sock."), and the build checks it for every pair. A tap on the printed "the" says v3's `word-the`, an ok clip in `words-phase2`; `allPhraseClipIds()` lists it, so `allClipIds()` has it.
2. **`src/content/index.ts` (optional).** `game/moments.ts` imports `gateKind` straight from `content/phrases.ts`. If index.ts should stay the only entry, add: `export { phraseSpec, allPhraseClipIds, gateKind, phraseTargets, phraseItem, phraseCombos, MIN_PHRASES } from './phrases.ts';` in place of the current phrases line. Why: one entry point for the content, as the other moments have.
3. **`vite.config.ts` (optional, the dev server in lane worktrees).** In a worktree `node_modules` is a link to the main tree, outside `server.fs.allow`, so the dev server answers 403 for the Andika font and dev pages show a fallback font. Change: `server: { fs: { allow: [repo, realpathSync(join(import.meta.dirname, 'node_modules'))] } }`. The build and the flows are not affected. (The reading lane checked its pages with a scratch config that does this.)
4. **`src/ui/moment.ts` (optional, an old rough edge).** `MomentSnapshot` could type the wish's `tags?: string[]`, which the flows read for the miss tag. It now holds phrase keys too ("gold sock").

## For the quests-world lane (corner.ts), at the merge

- Plan each gate read with `planWish(g, 'phrase', 'gate1', { wish: false })` (and `'gate2'`), and run it with `runWish(g, baby, spec, 'gate1', { frame: false })`. When fewer than 6 phrases are strong among Emma's pairs (the live game until her picture check), `planWish` itself returns a dress-up word wish whose intro already says "Your baby wants to dress up like you!", so the Corner says nothing of its own before it and never needs `planWish(g, 'dress', ...)`.
- Preload with `[...wishClipIds(spec), ...wishExtraClipIds(spec)]` (`wishExtraClipIds` adds the baby's line and `word-the`); `runWish` also preloads `word-the`.
- The `kind=play` line: `gk` is `gateKind(g)` from `game/moments.ts` (`'phrase'` or `'word'`), `ph` is `g.save.data.phrases.level`.
- A gate result moves its own level: `runWish` calls `noteReading(g, outcome, spec.kind)`, so a phrase read moves `save.phrases` and a word read `save.reading`.
