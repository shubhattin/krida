/**
 * Detect devices that typically rely on an on-screen keyboard rather than a
 * physical one. We intentionally treat any touch-capable surface as a match —
 * including touch-screen laptops — because those users still benefit from the
 * in-app QWERTY panel after Start. Desktop mice with no touch stay closed by
 * default and can open the panel via the keyboard icon.
 */
export function shouldAutoOpenOnScreenKeyboard(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const hasTouchPoints = navigator.maxTouchPoints > 0;
  const hasTouchStart = 'ontouchstart' in window;
  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

  return hasTouchPoints || hasTouchStart || coarsePointer;
}
