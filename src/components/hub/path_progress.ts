const VERSION = 'v1';
const keyFor = (slug: string) => `pathProgress:${VERSION}:${slug}`;

export function readPathProgress(slug: string): string | null {
  try {
    return localStorage.getItem(keyFor(slug));
  } catch {
    return null;
  }
}

export function writePathProgress(slug: string, puzzleKey: string) {
  try {
    localStorage.setItem(keyFor(slug), puzzleKey);
    window.dispatchEvent(new Event('path-progress'));
  } catch {
    // private browsing, quota, or disabled storage
  }
}
