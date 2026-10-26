// Queen Lumi's portrait in her crescent moon, top left (v3 Lumi.svelte). She bobs gently, talks while her clips
// play (the mouth picture flickers over the face) and a tap on her repeats the current goal.
import { audio } from '../audio';
import { el, img, onPress, play } from './dom';
import { PIC } from './parts';

/** The mouth box on lumi.webp (600 x 598), from v3's art manifest. */
const MOUTH = { x: 260, y: 308, w: 113, h: 74, W: 600, H: 598 };

export function createLumi(parent: HTMLElement, fallbackTap: () => void) {
  const box = el('div', 'lumi touch hidden', parent);
  box.setAttribute('aria-label', 'Queen Lumi');
  const bob = el('div', 'lumi-bob', box);
  img(PIC.lumi, 'lumi-face', bob);
  const mouth = img(PIC.lumiMouth, 'lumi-mouth', bob);
  mouth.style.left = `${(MOUTH.x / MOUTH.W) * 100}%`;
  mouth.style.top = `${(MOUTH.y / MOUTH.H) * 100}%`;
  mouth.style.width = `${(MOUTH.w / MOUTH.W) * 100}%`;
  mouth.style.height = `${(MOUTH.h / MOUTH.H) * 100}%`;
  let handler: (() => void) | null = null;
  let talkToken = 0;

  onPress(box, () => {
    void play(bob, [{ transform: 'scale(1)' }, { transform: 'scale(1.1) rotate(-4deg)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
    (handler ?? fallbackTap)();
  });

  return {
    el: box,
    show(on: boolean) {
      box.classList.toggle('hidden', !on);
    },
    async speak(clips: string[]) {
      const mine = ++talkToken;
      box.classList.add('talking');
      try {
        await audio.sayAll(clips);
      } finally {
        if (mine === talkToken) box.classList.remove('talking');
      }
    },
    onTap(fn: () => void) {
      handler = fn;
    },
    reset() {
      talkToken++;
      box.classList.remove('talking');
    },
  };
}
