import { Directive, ElementRef, HostBinding, HostListener, Input, NgZone, OnDestroy, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Calendar for any date field: `<input nxFecha>` (DD/MM/YYYY) or `<input nxFecha="mes">` (MM/YYYY).
 * The field keeps working as text (it can still be typed); choosing a day writes the value and fires `input`
 * and `change`, so `[(ngModel)]` and `(input)` handlers see it as if typed. `[nxFecha]="false"` turns it off
 * (for generic forms that only sometimes hold a date). Optional `nxFechaMin` / `nxFechaMax` in the same format.
 */
@Directive({ selector: 'input[nxFecha]' })
export class FechaDirective implements OnDestroy {
  @Input() nxFecha: '' | 'dia' | 'mes' | 'hora' | boolean | null | undefined = '';
  @Input() nxFechaMin: string | null | undefined;
  @Input() nxFechaMax: string | null | undefined;

  private pop: HTMLDivElement | null = null;
  /** Month shown (day mode) or year shown (month mode). */
  private anio = 0;
  private mes = 0;
  private readonly fuera = (e: Event) => {
    const t = e.target as Node;
    if (this.pop && !this.pop.contains(t) && !this.el.nativeElement.contains(t)) this.cerrar();
  };
  private readonly reubicar = () => this.ubicar();

  constructor(private el: ElementRef<HTMLInputElement>, private zone: NgZone) {}

  private get activo(): boolean { return this.nxFecha !== false && this.nxFecha != null; }
  private get modoMes(): boolean { return this.nxFecha === 'mes'; }
  /** DD/MM/YYYY HH:mm: the calendar sets the day and keeps the time already written (00:00 if none). */
  private get modoHora(): boolean { return this.nxFecha === 'hora'; }

  @HostBinding('class.nx-fecha') get claseFecha() { return this.activo; }
  @HostBinding('attr.autocomplete') get autocompletar() { return this.activo ? 'off' : null; }
  @HostBinding('attr.aria-haspopup') get haspopup() { return this.activo ? 'dialog' : null; }
  @HostBinding('attr.aria-expanded') get expandido() { return this.activo ? !!this.pop : null; }

  @HostListener('click') alClic(): void { if (this.activo && !this.pop && !this.el.nativeElement.disabled && !this.el.nativeElement.readOnly) this.abrir(); }

  @HostListener('keydown', ['$event']) alTecla(e: KeyboardEvent): void {
    if (!this.activo) return;
    if (e.key === 'Escape' && this.pop) { e.stopPropagation(); this.cerrar(); }
    else if (e.key === 'ArrowDown' && (e.altKey || !this.pop)) { e.preventDefault(); this.abrir(); }
    else if (e.key === 'Tab') this.cerrar();
  }

  /** Typing a valid date moves the calendar to it. */
  @HostListener('input') alEscribir(): void { if (this.pop && this.leer(this.el.nativeElement.value)) this.pintar(); }

  ngOnDestroy(): void { this.cerrar(); }

  // --- Values -------------------------------------------------------------------------------------------------------

  /** [year, month 0-11, day] of a DD/MM/YYYY (or MM/YYYY) text, or null. */
  private parse(s: string | null | undefined): [number, number, number] | null {
    const t = (s ?? '').trim();
    const m = this.modoMes ? /^(\d{1,2})\/(\d{4})$/.exec(t) : /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}:\d{2})?$/.exec(t);
    if (!m) return null;
    const [d, mo, y] = this.modoMes ? [1, +m[1], +m[2]] : [+m[1], +m[2], +m[3]];
    const f = new Date(y, mo - 1, d);
    return f.getFullYear() === y && f.getMonth() === mo - 1 && f.getDate() === d ? [y, mo - 1, d] : null;
  }

  private leer(s: string): boolean {
    const p = this.parse(s);
    if (!p) return false;
    [this.anio, this.mes] = [p[0], p[1]];
    return true;
  }

  private clave(y: number, m: number, d = 1): number { return y * 10000 + (m + 1) * 100 + d; }
  private limite(s: string | null | undefined): number | null {
    // Limits may also come as ISO (yyyy-MM-dd), like the [min]/[max] of the old native date fields.
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '');
    if (iso) return this.clave(+iso[1], +iso[2] - 1, this.modoMes ? 1 : +iso[3]);
    const p = this.parse(s);
    return p ? this.clave(p[0], p[1], this.modoMes ? 1 : p[2]) : null; }
  private fueraDeRango(k: number): boolean {
    const min = this.limite(this.nxFechaMin), max = this.limite(this.nxFechaMax);
    return (min !== null && k < min) || (max !== null && k > max);
  }

  private escribir(texto: string): void {
    const input = this.el.nativeElement;
    if (this.modoHora && texto) texto += ' ' + (/(\d{1,2}:\d{2})\s*$/.exec(input.value)?.[1] ?? '00:00');
    this.zone.run(() => {
      input.value = texto;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.cerrar();
    input.focus();
  }

  // --- Popup --------------------------------------------------------------------------------------------------------

  private abrir(): void {
    if (this.pop) return;
    const hoy = new Date();
    if (!this.leer(this.el.nativeElement.value)) [this.anio, this.mes] = [hoy.getFullYear(), hoy.getMonth()];
    this.zone.runOutsideAngular(() => {
      const pop = document.createElement('div');
      pop.className = 'nx-cal';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', this.modoMes ? 'Elegir mes' : 'Elegir fecha');
      pop.addEventListener('mousedown', (e) => { if (!(e.target instanceof HTMLSelectElement)) e.preventDefault(); });
      pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.cerrar(); this.el.nativeElement.focus(); } });
      document.body.appendChild(pop);
      this.pop = pop;
      this.pintar();
      document.addEventListener('mousedown', this.fuera, true);
      window.addEventListener('scroll', this.reubicar, true);
      window.addEventListener('resize', this.reubicar);
    });
  }

  private cerrar(): void {
    if (!this.pop) return;
    this.pop.remove();
    this.pop = null;
    document.removeEventListener('mousedown', this.fuera, true);
    window.removeEventListener('scroll', this.reubicar, true);
    window.removeEventListener('resize', this.reubicar);
  }

  private ubicar(): void {
    if (!this.pop) return;
    const r = this.el.nativeElement.getBoundingClientRect();
    const alto = this.pop.offsetHeight, ancho = this.pop.offsetWidth;
    const abajo = r.bottom + 4 + alto <= window.innerHeight || r.top - 4 - alto < 0;
    this.pop.style.top = `${Math.max(4, abajo ? r.bottom + 4 : r.top - 4 - alto)}px`;
    this.pop.style.left = `${Math.max(4, Math.min(r.left, window.innerWidth - ancho - 4))}px`;
  }

  private boton(texto: string, clase: string, accion: () => void, etiqueta?: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = clase;
    b.textContent = texto;
    if (etiqueta) b.setAttribute('aria-label', etiqueta);
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); accion(); });
    return b;
  }

  private selector(opciones: [number, string][], valor: number, etiqueta: string, alCambiar: (v: number) => void): HTMLSelectElement {
    const s = document.createElement('select');
    s.className = 'nx-cal__sel';
    s.setAttribute('aria-label', etiqueta);
    for (const [v, t] of opciones) { const o = document.createElement('option'); o.value = String(v); o.textContent = t; s.appendChild(o); }
    s.value = String(valor);
    s.addEventListener('change', () => alCambiar(+s.value));
    return s;
  }

  private pintar(): void {
    const pop = this.pop;
    if (!pop) return;
    pop.replaceChildren();
    const actual = this.parse(this.el.nativeElement.value);
    const hoy = new Date();

    const cab = document.createElement('div');
    cab.className = 'nx-cal__cab';
    const paso = (n: number) => () => {
      if (this.modoMes) this.anio += n;
      else { const f = new Date(this.anio, this.mes + n, 1); [this.anio, this.mes] = [f.getFullYear(), f.getMonth()]; }
      this.pintar();
    };
    cab.appendChild(this.boton('‹', 'nx-cal__nav', paso(-1), this.modoMes ? 'Año anterior' : 'Mes anterior'));
    const titulo = document.createElement('div');
    titulo.className = 'nx-cal__titulo';
    const anios: [number, string][] = [];
    const desde = Math.min(1930, this.anio), hasta = Math.max(hoy.getFullYear() + 15, this.anio);
    for (let y = hasta; y >= desde; y--) anios.push([y, String(y)]);
    if (!this.modoMes) titulo.appendChild(this.selector(MESES.map((m, i) => [i, m]), this.mes, 'Mes', (v) => { this.mes = v; this.pintar(); }));
    titulo.appendChild(this.selector(anios, this.anio, 'Año', (v) => { this.anio = v; this.pintar(); }));
    cab.appendChild(titulo);
    cab.appendChild(this.boton('›', 'nx-cal__nav', paso(1), this.modoMes ? 'Año siguiente' : 'Mes siguiente'));
    pop.appendChild(cab);

    const grilla = document.createElement('div');
    grilla.className = this.modoMes ? 'nx-cal__grid nx-cal__grid--meses' : 'nx-cal__grid';
    if (this.modoMes) {
      MESES.forEach((nombre, m) => {
        const b = this.boton(nombre.slice(0, 3), 'nx-cal__dia', () => this.escribir(`${dos(m + 1)}/${this.anio}`), `${nombre} ${this.anio}`);
        if (actual && actual[0] === this.anio && actual[1] === m) b.classList.add('is-sel');
        if (hoy.getFullYear() === this.anio && hoy.getMonth() === m) b.classList.add('is-hoy');
        b.disabled = this.fueraDeRango(this.clave(this.anio, m));
        grilla.appendChild(b);
      });
    } else {
      for (const d of DIAS) { const c = document.createElement('span'); c.className = 'nx-cal__sem'; c.textContent = d; grilla.appendChild(c); }
      const primero = (new Date(this.anio, this.mes, 1).getDay() + 6) % 7;
      const dias = new Date(this.anio, this.mes + 1, 0).getDate();
      for (let i = 0; i < primero; i++) grilla.appendChild(document.createElement('span'));
      for (let d = 1; d <= dias; d++) {
        const texto = `${dos(d)}/${dos(this.mes + 1)}/${this.anio}`;
        const b = this.boton(String(d), 'nx-cal__dia', () => this.escribir(texto), `${d} de ${MESES[this.mes].toLowerCase()} de ${this.anio}`);
        if (actual && actual[0] === this.anio && actual[1] === this.mes && actual[2] === d) { b.classList.add('is-sel'); b.setAttribute('aria-pressed', 'true'); }
        if (hoy.getFullYear() === this.anio && hoy.getMonth() === this.mes && hoy.getDate() === d) b.classList.add('is-hoy');
        b.disabled = this.fueraDeRango(this.clave(this.anio, this.mes, d));
        grilla.appendChild(b);
      }
    }
    pop.appendChild(grilla);

    const pie = document.createElement('div');
    pie.className = 'nx-cal__pie';
    const hoyTexto = this.modoMes ? `${dos(hoy.getMonth() + 1)}/${hoy.getFullYear()}` : `${dos(hoy.getDate())}/${dos(hoy.getMonth() + 1)}/${hoy.getFullYear()}`;
    const bHoy = this.boton(this.modoMes ? 'Este mes' : 'Hoy', 'nx-cal__accion', () => this.escribir(hoyTexto));
    bHoy.disabled = this.fueraDeRango(this.clave(hoy.getFullYear(), hoy.getMonth(), this.modoMes ? 1 : hoy.getDate()));
    pie.appendChild(bHoy);
    pie.appendChild(this.boton('Limpiar', 'nx-cal__accion', () => this.escribir('')));
    pop.appendChild(pie);
    this.ubicar();
  }
}

/**
 * For models kept as ISO (what `<input type="date">` / `datetime-local` used): `<input nxFecha nxFechaIso [(ngModel)]="x">`
 * shows DD/MM/YYYY and gives the model yyyy-MM-dd; with `nxFecha="hora" nxFechaIso="hora"` it shows DD/MM/YYYY HH:mm and gives
 * yyyy-MM-ddTHH:mm. While what is typed is incomplete the model is not touched; an empty field gives ''.
 */
@Directive({
  selector: 'input[nxFechaIso]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FechaIsoDirective), multi: true }],
})
export class FechaIsoDirective implements ControlValueAccessor {
  @Input() nxFechaIso: '' | 'hora' = '';
  @HostBinding('attr.placeholder') get placeholder() { return this.el.nativeElement.getAttribute('placeholder') || (this.nxFechaIso === 'hora' ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY'); }
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};
  private ultimo = '';

  constructor(private el: ElementRef<HTMLInputElement>) {}

  writeValue(v: string | null | undefined): void {
    this.ultimo = v ?? '';
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(this.ultimo);
    this.el.nativeElement.value = !m ? '' : `${m[3]}/${m[2]}/${m[1]}` + (this.nxFechaIso === 'hora' ? ` ${m[4] ?? '00'}:${m[5] ?? '00'}` : '');
  }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.el.nativeElement.disabled = d; }

  @HostListener('input') alEscribir(): void {
    const t = this.el.nativeElement.value.trim();
    const hora = this.nxFechaIso === 'hora';
    let iso: string | null = null;
    if (!t) iso = '';
    else {
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(t);
      if (m) {
        const [d, mo, y] = [+m[1], +m[2], +m[3]];
        const f = new Date(y, mo - 1, d);
        const h = m[4] === undefined ? 0 : +m[4], mi = m[5] === undefined ? 0 : +m[5];
        if (f.getFullYear() === y && f.getMonth() === mo - 1 && f.getDate() === d && h < 24 && mi < 60)
          iso = `${y}-${dos(mo)}-${dos(d)}` + (hora ? `T${dos(h)}:${dos(mi)}` : '');
      }
    }
    if (iso !== null && iso !== this.ultimo) { this.ultimo = iso; this.onChange(iso); }
  }
  @HostListener('blur') alSalir(): void { this.onTouched(); }
}
