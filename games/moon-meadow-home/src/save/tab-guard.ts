// One playing tab per device id. The newest tab wins; older tabs are told to stop saving.
import { uuid4 } from '../core/ids.ts';

export const TAB_CHANNEL = 'moon-meadow-tabs';
export type TabGuard = { readonly tab: string; close(): void };

export function claimTab(onLost: () => void, channelName: string = TAB_CHANNEL): TabGuard {
  const tab = uuid4();
  if (typeof BroadcastChannel === 'undefined') return { tab, close() {} };
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = (m: MessageEvent) => {
    const d = m.data as { type?: string; tab?: string } | null;
    if (d?.type === 'claim' && d.tab !== tab) onLost();
  };
  channel.postMessage({ type: 'claim', tab });
  return { tab, close: () => channel.close() };
}
