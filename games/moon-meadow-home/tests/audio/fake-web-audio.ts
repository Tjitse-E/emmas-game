import { vi } from 'vitest';

type Buffer = { duration: number; getChannelData: () => Float32Array };
const param = () => ({ value: 1, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });

/** Just enough of AudioContext for shared/audio.js: decode succeeds, a source ends 1 ms after start. */
export class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  sampleRate = 44100;
  createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
  createBuffer(_channels: number, length: number, rate: number): Buffer {
    return { duration: length / rate, getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    const source: { onended?: () => void; buffer?: unknown; loop?: boolean; connect(): void; start(): void; stop(): void } = {
      connect() {},
      start() { setTimeout(() => source.onended?.(), 1); },
      stop() {},
    };
    return source;
  }
  decodeAudioData(_data: ArrayBuffer, ok: (b: Buffer) => void): Promise<Buffer> {
    const b = { duration: 0.001, getChannelData: () => new Float32Array(10) };
    ok(b);
    return Promise.resolve(b);
  }
  resume() { return Promise.resolve(); }
}

export type FakeFetch = ((url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown>; arrayBuffer(): Promise<ArrayBuffer> }>)
  & { calls: string[]; inits: Array<RequestInit | undefined> };

/** fetch over a map of url to JSON (manifests) or any truthy value (an mp3). Unknown urls answer 404. */
export function fakeFetch(files: Record<string, unknown>): FakeFetch {
  const calls: string[] = [];
  const inits: Array<RequestInit | undefined> = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push(url);
    inits.push(init);
    const hit = url in files;
    return { ok: hit, json: async () => (hit ? files[url] : null), arrayBuffer: async () => new ArrayBuffer(hit ? 8 : 0) };
  }) as FakeFetch;
  fn.calls = calls;
  fn.inits = inits;
  return fn;
}

export function installBrowserFakes(files: Record<string, unknown>): FakeFetch {
  const f = fakeFetch(files);
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('document', { addEventListener() {}, visibilityState: 'visible' });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('fetch', f);
  return f;
}
