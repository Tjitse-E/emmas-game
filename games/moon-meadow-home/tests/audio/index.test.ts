import { describe, expect, it } from 'vitest';
import { audio, numId, wordId, PACKS, SCENES, type SpeakId } from '../../src/audio/index.ts';
import { PACKS as CONTRACT_PACKS, type Audio as ContractAudio } from '../../src/types/contracts.ts';
import { HEARTBEAT_NUMBER_IDS } from '../../src/core/keys.ts';

// Type checks (npm run check runs tsc over tests/): the app's audio fits the contract interface, a computed id passes,
// and a misspelt literal id or scene is a compile error (R52).
const contract: ContractAudio = audio;
async function typeChecks(maybe: string | null, list: SpeakId[], lines: string[]): Promise<void> {
  await audio.speak('lumi-hello', 'g-egg-waiting');
  await audio.speak(numId('n', 3), wordId('hat'), HEARTBEAT_NUMBER_IDS.over(2), maybe, null);
  await audio.say('fb-lovely');
  await audio.sayAll(list);
  await audio.sayAll(lines);
  await audio.listen(wordId('hat'));
  await audio.replay('g-egg-waiting');
  await audio.preloadScene('heartbeat');
  audio.release('moving-day');
  // @ts-expect-error a misspelt static id
  await audio.speak('lumi-helo');
  // @ts-expect-error a misspelt static id after a good one
  await audio.speak('lumi-hello', 'g-eg-waiting');
  // @ts-expect-error a misspelt static id
  await audio.say('fb-lovley');
  // @ts-expect-error a scene that does not exist
  await audio.preloadScene('nest-typo');
}

describe('src/audio/index.ts', () => {
  it('loads in Node with a silent player and lists the contract packs', async () => {
    expect(typeof typeChecks).toBe('function');
    expect(contract).toBe(audio);
    expect([...PACKS]).toEqual([...CONTRACT_PACKS]);
    expect(SCENES).toContain('common');
    await audio.init({ base: './audio/' });
    await audio.speak('lumi-hello');
    expect(audio.hasClip('lumi-hello')).toBe(false);
    expect(await audio.sayName('Pip', '!')).toBe(false);
  });
});
