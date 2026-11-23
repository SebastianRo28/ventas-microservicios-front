import { HttpClient } from '@angular/common/http';
import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom, timeout } from 'rxjs';
import { API_URL } from './api';
import { escala, oscurecer, textoSobre } from './color';

export interface ColoresMarca { primario: string; sidebar: string | null; topbar: string | null; acento: string | null; }
export interface TerminologiaMarca { nivel1: string; nivel2: string; nivel3: string; colaborador: string; recinto: string; }
export type RadioMarca = 'recto' | 'suave' | 'redondeado';
/** GET /api/publico/marca: the published brand of the company of this host. */
export interface MarcaPublica {
  version: number; empresa: string; nombrePortal: string;
  logos: { horizontal: string | null; horizontalClaro: string | null; cuadrado: string | null };
  login: { imagen: string | null; titulo: string; mensaje: string; ayuda: string | null; mostrarPoweredBy: boolean };
  colores: ColoresMarca; tipografia: string; radio: RadioMarca; terminologia: TerminologiaMarca;
}

export const PRIMARIO_POR_DEFECTO = '#2D4DA4';
export const FUENTES = ['Nunito Sans', 'Inter', 'Source Sans 3', 'Roboto', 'Montserrat', 'Open Sans', 'Lato'];
export const TERMINOS_POR_DEFECTO: TerminologiaMarca = { nivel1: 'División', nivel2: 'Área', nivel3: 'Sub-área', colaborador: 'Colaborador', recinto: 'Recinto' };
const RADIOS: Record<RadioMarca, [string, string]> = { recto: ['2px', '4px'], suave: ['6px', '8px'], redondeado: ['12px', '16px'] };
const CLAVE = 'nexo-rh.marca';

/**
 * CSS variables of a brand. Every component uses only these tokens, so the whole app (or the live preview of
 * "Personaliza tu marca", which applies them to one element) takes the company's identity. With the default primary
 * the colors of the stylesheet stay as designed.
 */
export function variablesMarca(m: Pick<MarcaPublica, 'colores' | 'tipografia' | 'radio'>): Record<string, string> {
  const v: Record<string, string> = {};
  const p = (m.colores.primario || PRIMARIO_POR_DEFECTO).toUpperCase();
  if (p !== PRIMARIO_POR_DEFECTO || m.colores.sidebar || m.colores.topbar) {
    const e = escala(p);
    for (const [paso, color] of Object.entries(e)) v[`--nx-primary-${paso}`] = color;
    const sidebar = m.colores.sidebar || e[800];
    v['--nx-sidebar-bg'] = sidebar;
    v['--nx-rail'] = oscurecer(sidebar);
    v['--nx-topbar-bg'] = m.colores.topbar || e[900];
    v['--nx-selected'] = e[50];
    // Tints of the brand used by chips, calendars, maps and charts.
    v['--nx-primary-subtle'] = e[50];
    v['--nx-primary-soft'] = e[50];
    v['--nx-primary-tint'] = e[100];
    v['--nx-primary-line'] = e[200];
    v['--nx-primary-ink'] = e[800];
    v['--nx-chart-1'] = e[600];
    v['--nx-chart-2'] = e[300];
    v['--nx-on-primary'] = textoSobre(p);
  }
  if (m.colores.acento) { v['--nx-accent'] = m.colores.acento; v['--nx-on-accent'] = textoSobre(m.colores.acento); }
  if (m.tipografia && m.tipografia !== 'Nunito Sans') v['--nx-font'] = `'${m.tipografia}', 'Nunito Sans', system-ui, sans-serif`;
  const [r, rl] = RADIOS[m.radio] ?? RADIOS.suave;
  v['--nx-radius'] = r;
  v['--nx-radius-lg'] = rl;
  return v;
}

/** Loads a font of the curated list from Google Fonts (allowed by the CSP). */
export function cargarFuente(familia: string): void {
  if (!FUENTES.includes(familia) || familia === 'Nunito Sans') return;
  const id = 'nx-fuente-' + familia.replace(/\s/g, '-');
  if (document.getElementById(id)) return;
  const l = document.createElement('link');
  l.id = id;
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familia).replace(/%20/g, '+')}:wght@400;600;700;800&display=swap`;
  document.head.appendChild(l);
}

/** Spanish plural for the labels of the terminology ("División" → "Divisiones", "Sede" → "Sedes"). */
export function plural(s: string): string {
  const [primera, ...resto] = s.split(' ');
  const p = /[aeiouáéó]$/i.test(primera) ? primera + 's'
    : /z$/i.test(primera) ? primera.slice(0, -1) + 'ces'
    : primera.replace(/([áéíóú])([nsl])$/i, (_, v: string, c: string) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' } as Record<string, string>)[v.toLowerCase()] + c) + 'es';
  return [p, ...resto].join(' ');
}

/**
 * Published brand of the company: applied before the app is shown (from the copy saved in this browser, then
 * refreshed from the API), so the default theme never flashes.
 */
@Injectable({ providedIn: 'root' })
export class MarcaService {
  readonly marca$ = new BehaviorSubject<MarcaPublica | null>(null);
  private reglas: [RegExp, string][] = [];

  constructor(private http: HttpClient) {
    try {
      const guardada = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as MarcaPublica | null;
      if (guardada?.colores) this.aplicar(guardada);
    } catch { /* storage unavailable */ }
  }

  get marca(): MarcaPublica | null { return this.marca$.value; }
  get nombrePortal(): string { return this.marca?.nombrePortal ?? 'Mi Portal'; }

  /** APP_INITIALIZER: waits for the API only when there is no saved copy (at most 2 s). */
  iniciar(): Promise<void> {
    const pedido = this.refrescar();
    return this.marca ? Promise.resolve() : firstValueFrom(pedido.pipe(timeout(2000))).then(() => undefined, () => undefined);
  }

  /** version: after publishing, skips the browser cache of the previous version. */
  refrescar(version?: number): Observable<MarcaPublica> {
    const o = this.http.get<MarcaPublica>(`${API_URL}/publico/marca`, version === undefined ? {} : { params: { v: version } });
    o.subscribe({
      next: (m) => {
        if (JSON.stringify(m) !== JSON.stringify(this.marca)) this.aplicar(m);
        try { localStorage.setItem(CLAVE, JSON.stringify(m)); } catch { /* ignore */ }
      },
      error: () => { /* keep the saved brand or the default one */ },
    });
    return o;
  }

  aplicar(m: MarcaPublica): void {
    const raiz = document.documentElement.style;
    // Remove what a previous brand set, then apply the new tokens.
    for (const prop of Array.from(raiz)) if (prop.startsWith('--nx-')) raiz.removeProperty(prop);
    for (const [k, v] of Object.entries(variablesMarca(m))) raiz.setProperty(k, v);
    cargarFuente(m.tipografia);
    const icono = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icono) icono.href = m.logos.cuadrado ?? 'favicon.ico';
    this.reglas = reglasTerminologia(m.terminologia, m.nombrePortal);
    this.marca$.next(m);
  }

  /** Label with the company's terminology ("Colaboradores" → "Trabajadores", "Área" → "Departamento"…). */
  termino(texto: string): string {
    if (!texto || this.reglas.length === 0) return texto;
    let r = texto;
    for (const [re, valor] of this.reglas) r = r.replace(re, (m) => (m[0] === m[0].toLowerCase() ? valor.charAt(0).toLowerCase() + valor.slice(1) : valor));
    return r;
  }
}

/** Replacement rules (plural before singular, Sub-área before Área) for the terms that differ from the default ones. */
function reglasTerminologia(t: TerminologiaMarca | undefined, portal?: string): [RegExp, string][] {
  const r: [RegExp, string][] = [];
  // "Mi Portal" → the portal name of the company ("Mi Andino").
  if (portal && portal !== 'Mi Portal') r.push([/Mi Portal/g, portal]);
  if (!t) return r;
  const pares: [string, keyof TerminologiaMarca][] = [['Sub-área', 'nivel3'], ['División', 'nivel1'], ['Área', 'nivel2'], ['Colaborador', 'colaborador'], ['Recinto', 'recinto']];
  for (const [base, clave] of pares) {
    const valor = t[clave]?.trim();
    if (!valor || valor === TERMINOS_POR_DEFECTO[clave]) continue;
    const letra = (s: string) => `[${s[0].toUpperCase()}${s[0].toLowerCase()}]${s.slice(1)}`;
    // \b does not work with accented letters: delimit with "not a letter".
    const borde = (s: string) => new RegExp(`(?<![\\p{L}-])${letra(s)}(?![\\p{L}-])`, 'gu');
    r.push([borde(plural(base)), plural(valor)], [borde(base), valor]);
  }
  return r;
}

/** {{ 'Colaboradores' | termino }}: the label with the company's terminology. */
@Pipe({ name: 'termino', pure: false })
export class TerminoPipe implements PipeTransform {
  private ultimo: [string, number, string] | null = null;
  constructor(private marcas: MarcaService) {}
  transform(texto: string | null | undefined): string {
    const t = texto ?? '';
    const v = this.marcas.marca?.version ?? -1;
    if (this.ultimo && this.ultimo[0] === t && this.ultimo[1] === v) return this.ultimo[2];
    const r = this.marcas.termino(t);
    this.ultimo = [t, v, r];
    return r;
  }
}
