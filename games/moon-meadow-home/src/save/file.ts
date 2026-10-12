// Save files in the browser: the share sheet where it exists (https), a download otherwise (the Mac's http).
import { exportFileName } from '../core/save/export.ts';
import type { ExportFile } from '../core/save/export.ts';

type ShareNav = { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title: string }) => Promise<void> };

export async function saveExportFile(file: ExportFile, nav: ShareNav = globalThis.navigator as ShareNav, doc?: Document): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = exportFileName(file.exportedAt);
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  if (typeof File !== 'undefined' && nav?.canShare && nav.share) {
    const f = new File([blob], name, { type: 'application/json' });
    if (nav.canShare({ files: [f] })) {
      try {
        await nav.share({ files: [f], title: 'Moon Meadow save' });
        return 'shared';
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return 'cancelled';
      }
    }
  }
  const d = doc ?? document;
  const url = URL.createObjectURL(blob);
  const a = d.createElement('a');
  a.href = url;
  a.download = name;
  d.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export function readFileText(file: Blob): Promise<string> {
  return file.text();
}
