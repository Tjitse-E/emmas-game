import { describe, expect, it } from 'vitest';
import { createSpeech, type SpeechPlayer } from '../../src/audio/speech.ts';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

function fakePlayer() {
  const calls: string[] = [];
  const pending = new Map<string, ReturnType<typeof deferred>>();
  const start = (key: string) => { calls.push(key); const d = deferred(); pending.set(key, d); return d.promise; };
  const player: SpeechPlayer = { say: (id) => start(`say:${id}`), sound: (c) => start(`sound:${c}`), stop: () => { calls.push('stop'); } };
  const end = (key: string) => pending.get(key)!.resolve();
  return { player, calls, end };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const fastSleep = () => tick();

describe('speech order', () => {
  it('plays ids in order and skips empty entries', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const done = s.speak(['a', null, 'b']);
    await tick();
    expect(calls).toEqual(['say:a']);
    end('say:a');
    await tick(); await tick();
    expect(calls).toEqual(['say:a', 'say:b']);
    end('say:b');
    await done;
  });

  it('act() stops the rest of a sequence', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const done = s.speak(['a', 'b']);
    await tick();
    s.act();
    end('say:a');
    await done;
    expect(calls).toEqual(['say:a', 'stop']);
  });

  it('never cuts off a sound she asked for: the instruction waits for it', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const heard = s.listenSound('s');
    const done = s.speak(['g-gems']);
    await tick(); await tick();
    expect(calls).toEqual(['stop', 'sound:s']);
    expect(s.userBusy).toBe(true);
    end('sound:s');
    await heard;
    await tick(); await tick();
    expect(calls).toEqual(['stop', 'sound:s', 'say:g-gems']);
    end('say:g-gems');
    await done;
  });

  it('a replay stops when she starts listening during it', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const done = s.speak(['g1', 'g2'], { replay: true });
    await tick();
    const heard = s.listen('word-hat');
    end('say:g1');
    await tick(); await tick();
    end('say:word-hat');
    await heard;
    await done;
    expect(calls).toEqual(['say:g1', 'stop', 'say:word-hat']);
  });

  it('waits while the naming slider plays', async () => {
    const { player, calls, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    s.setSliding(true);
    const done = s.speak(['fb-spelled']);
    await tick(); await tick();
    expect(calls).toEqual([]);
    s.setSliding(false);
    await tick(); await tick();
    expect(calls).toEqual(['say:fb-spelled']);
    end('say:fb-spelled');
    await done;
  });

  it('reports whether the whole sequence played', async () => {
    const { player, end } = fakePlayer();
    const s = createSpeech(player, fastSleep);
    const whole = s.speak(['a']);
    await tick();
    end('say:a');
    expect(await whole).toBe(true);
    const cut = s.speak(['b', 'c']);
    await tick();
    s.act();
    end('say:b');
    expect(await cut).toBe(false);
  });
});
