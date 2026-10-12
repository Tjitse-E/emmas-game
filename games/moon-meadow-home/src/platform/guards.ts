/** No pinch zoom, double-tap zoom, long-press menu, text selection or two-finger scroll during play. */
export function installGuards(doc: Document = document): () => void {
  const prevent = (e: Event): void => {
    const t = e.target as Element | null;
    if (t && typeof t.closest === 'function' && t.closest('[data-allow-select]')) return;
    e.preventDefault();
  };
  const types = ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart'];
  for (const t of types) doc.addEventListener(t, prevent, { passive: false });
  const multi = (e: TouchEvent): void => { if (e.touches.length > 1) e.preventDefault(); };
  doc.addEventListener('touchmove', multi, { passive: false });
  return () => {
    for (const t of types) doc.removeEventListener(t, prevent);
    doc.removeEventListener('touchmove', multi);
  };
}
