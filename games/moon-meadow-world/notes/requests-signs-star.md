# Requests from the signs-star lane (2.4.0)

Integrator files this lane needs changed. The lane compiles against the current files meanwhile.

## 1. `src/content/index.ts`: export the planner's set key and sets

```ts
export { planTrip, allSignClipIds, goalClip, setKey, signSets, SIGN_WORDS, type TripPlan, type SignUse, type SignSet } from './signs.ts';
```

Why: the ride (mount lane) adds each trip's two sets to `g.signUse.sets`; `setKey` is the planner's own key (the words sorted and joined with commas), so the two never drift.

## 2. `src/content/index.ts`: export the star egg's and "no sum twice" helpers

```ts
export {
  eggSpec, eggSums, eggClipIds, eggCombos, gradeCombos, nextBand, totalOf, factClip, SUM_GRADES, type Band, type MathsUsed, type MathsPick,
  type AskedSums, emptyAsked, noteAsked, prepareEggPlan, starCompares,
} from './eggs.ts';
```

Why: optional, for lanes and tests that read the content through the index; nothing in this lane needs it.
