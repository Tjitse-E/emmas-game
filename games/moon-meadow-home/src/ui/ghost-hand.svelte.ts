// First version (platform A9). Task A11 adds tap and drag.
export const ghostState = $state({ visible: false, pressed: false, x: 0, y: 0, moveMs: 0 });
export const ghost = {
  get visible(): boolean { return ghostState.visible; },
  hide(): void { ghostState.visible = false; ghostState.pressed = false; },
};
