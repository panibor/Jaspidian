/**
 * Shared colour palette for popup + options. Keyed to prefers-color-scheme.
 * The accent (#C91200) is the Jaspidian crimson; identical across both modes
 * so brand identity stays constant whether the system is dark or light.
 *
 * Framework-agnostic: exposes a small callback API instead of React hooks.
 */

export interface Palette {
  bg: string;
  surface: string;
  card: string;
  accent: string;
  accentHover: string;
  green: string;
  red: string;
  yellow: string;
  text: string;
  muted: string;
  border: string;
  white: string;
}

export const DARK: Palette = {
  bg: '#150202', surface: '#0d0101', card: '#220505',
  accent: '#C91200', accentHover: '#FF2E12',
  green: '#22c55e', red: '#ef4444', yellow: '#f59e0b',
  text: '#f2e6e6', muted: '#b07070',
  border: 'rgba(255,46,18,0.13)', white: '#ffffff',
};

export const LIGHT: Palette = {
  bg: '#f5f5f5', surface: '#ffffff', card: '#ebebeb',
  accent: '#C91200', accentHover: '#a50e00',
  green: '#16a34a', red: '#dc2626', yellow: '#b45309',
  text: '#111111', muted: '#555555',
  border: 'rgba(0,0,0,0.15)', white: '#ffffff',
};

function _mq(): MediaQueryList | null {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
}

export function currentPalette(): Palette {
  return _mq()?.matches ?? true ? DARK : LIGHT;
}

/**
 * Subscribe to OS theme changes. Returns an unsubscribe function.
 */
export function onThemeChange(cb: (p: Palette) => void): () => void {
  const mq = _mq();
  if (!mq) return () => { /* no-op */ };
  const handler = (e: MediaQueryListEvent) => cb(e.matches ? DARK : LIGHT);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
