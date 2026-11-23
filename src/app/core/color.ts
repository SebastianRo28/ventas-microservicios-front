/**
 * Brand colors: OKLCH palette (same hue, even lightness steps), WCAG 2.x contrast and the closest accessible tone.
 * The API applies the same contrast rule before publishing a brand.
 */

type Oklch = { l: number; c: number; h: number };
export const PASOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Paso = typeof PASOS[number];
export const CONTRASTE_MINIMO = 4.5;

const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function esHex(c: string | null | undefined): c is string { return !!c && /^#[0-9a-f]{6}$/i.test(c); }

function aRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function aHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function aOklch(hex: string): Oklch {
  const [r, g, b] = aRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}

function rgbLineal({ l: L, c, h }: Oklch): number[] {
  const A = c * Math.cos(h * Math.PI / 180), B = c * Math.sin(h * Math.PI / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

/** OKLCH → hex, lowering the chroma until the color fits in sRGB (keeps hue and lightness). */
export function deOklch(o: Oklch): string {
  let c = o.c;
  for (let i = 0; i < 40; i++) {
    const rgb = rgbLineal({ ...o, c });
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) return aHex(rgb.map(gam));
    c *= 0.92;
  }
  return aHex(rgbLineal({ ...o, c: 0 }).map(gam));
}

export function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Text on a colored surface: white, or near-black when white does not reach 4.5:1. */
export function textoSobre(hex: string): string { return contraste(hex, '#FFFFFF') >= CONTRASTE_MINIMO ? '#FFFFFF' : '#111827'; }

/** Closest tone (same hue, darker) with at least 4.5:1 against white; the same color if it already passes. */
export function sugerirAccesible(hex: string): string {
  if (contraste(hex, '#FFFFFF') >= CONTRASTE_MINIMO) return hex.toUpperCase();
  const o = aOklch(hex);
  for (let l = o.l; l > 0; l -= 0.005) {
    const c = deOklch({ ...o, l });
    if (contraste(c, '#FFFFFF') >= CONTRASTE_MINIMO) return c;
  }
  return '#000000';
}

/**
 * Scale 50–950 from one color. The chosen color is exactly step 700 (buttons and links); lighter steps go up to
 * almost white and darker ones down evenly, all with the same hue. Chroma softens at the light end.
 */
export function escala(primario: string): Record<Paso, string> {
  const o = aOklch(primario);
  const claro = 0.975, oscuro = Math.max(0.16, o.l - 0.17);
  const claros: Paso[] = [50, 100, 200, 300, 400, 500, 600];
  const oscuros: Paso[] = [800, 900, 950];
  const r = { 700: primario.toUpperCase() } as Record<Paso, string>;
  claros.forEach((p, i) => {
    const t = ((claros.length - i) / claros.length) ** 0.9;        // 50 → casi blanco … 600 → cerca del color
    const l = o.l + (claro - o.l) * t;
    r[p] = deOklch({ l, c: o.c * (1 - t * 0.88), h: o.h });
  });
  oscuros.forEach((p, i) => {
    const t = (i + 1) / oscuros.length;
    r[p] = deOklch({ l: o.l + (oscuro - o.l) * t, c: o.c * (1 - t * 0.25), h: o.h });
  });
  return r;
}

/** Same color, a bit darker (used for the rail next to the sidebar). */
export function oscurecer(hex: string, cuanto = 0.03): string { const o = aOklch(hex); return deOklch({ ...o, l: Math.max(0, o.l - cuanto) }); }
