import { Tone } from './models';
import { Banda } from './sample/compensaciones';

export type Ubicacion = 'Bajo la banda' | 'En la banda' | 'Sobre la banda' | 'Sin información';
export const UBICACION_TONE: Record<Ubicacion, Tone> = {
  'Bajo la banda': 'warning', 'En la banda': 'success', 'Sobre la banda': 'info', 'Sin información': 'gray',
};

export const bandaMin = (b: Banda) => Math.round(b.objetivo * b.pctMin) / 100;
export const bandaMax = (b: Banda) => Math.round(b.objetivo * b.pctMax) / 100;

export function ubicar(valor: number, min: number, max: number): Ubicacion {
  return valor < min ? 'Bajo la banda' : valor > max ? 'Sobre la banda' : 'En la banda';
}

/**
 * Geometry of the "Posición y compa ratio" bar: the scale goes from 60 % to 140 % of the target;
 * yellow below the minimum, green inside the band, blue above the maximum.
 */
export function barra(valor: number, min: number, max: number, objetivo: number) {
  const lo = objetivo * 0.6, hi = objetivo * 1.4, span = hi - lo;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / span) * 100));
  return { bajo: pct(min), dentro: pct(max) - pct(min), marca: pct(valor) };
}
