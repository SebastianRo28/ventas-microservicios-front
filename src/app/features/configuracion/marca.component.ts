import { ContextoService } from '../../core/contexto.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { API_URL } from '../../core/api';
import { mensajeError } from '../../core/auth.service';
import { CONTRASTE_MINIMO, PASOS, contraste, escala, esHex, sugerirAccesible } from '../../core/color';
import { inicialesEmpresa } from '../../core/entrada.service';
import { FUENTES, MarcaService, RadioMarca, TERMINOS_POR_DEFECTO, TerminologiaMarca, cargarFuente, plural, variablesMarca } from '../../core/marca.service';
import { UiStateService } from '../../core/ui-state.service';

/** Brand as edited (ids of uploaded images, null = automatic color). Same shape as the API's MarcaDatos. */
export interface MarcaDatos {
  nombrePortal: string | null;
  logos: { horizontal: string | null; horizontalClaro: string | null; cuadrado: string | null };
  login: { imagen: string | null; titulo: string | null; mensaje: string | null; ayuda: string | null; mostrarPoweredBy: boolean };
  colores: { primario: string; sidebar: string | null; topbar: string | null; acento: string | null };
  tipografia: string;
  radio: RadioMarca;
  terminologia: TerminologiaMarca;
  correos: { remitente: string | null; firma: string | null };
}
interface VersionMarca { version: number; publicadoPor: string; publicadoEn: string; nota: string | null; }
interface MarcaEdicion {
  version: number; datos: MarcaDatos; archivos: Record<string, string>; versiones: VersionMarca[]; porDefecto: MarcaDatos;
  fuentes: string[]; contrasteMinimo: number; empresa: string;
}
type TipoArchivo = 'horizontal' | 'horizontalClaro' | 'cuadrado' | 'login';

/**
 * ⚙ Administración › Personaliza tu marca (P-MT.2). The company changes its identity (logos, colors, font, corners,
 * login texts, terminology and e-mails), never the layout. Live preview of the login, the admin layout, the portal and
 * an e-mail; colors are checked against WCAG AA (4.5:1) before publishing; every publication is a version that can be
 * restored.
 */
@Component({
  selector: 'app-marca',
  templateUrl: './marca.component.html',
})
export class MarcaComponent {
  readonly tabs = ['Identidad', 'Login', 'Colores y tipografía', 'Terminología', 'Correos'];
  readonly vistas = ['Login', 'Administración', 'Portal', 'Correo'];
  readonly fuentes = FUENTES;
  readonly pasos = PASOS;
  readonly minimo = CONTRASTE_MINIMO;
  readonly radios: { valor: RadioMarca; texto: string }[] = [{ valor: 'recto', texto: 'Recto (2px)' }, { valor: 'suave', texto: 'Suave (6px)' }, { valor: 'redondeado', texto: 'Redondeado (12px)' }];
  readonly terminos: { clave: keyof TerminologiaMarca; etiqueta: string }[] = [
    { clave: 'nivel1', etiqueta: 'Primer nivel organizacional' }, { clave: 'nivel2', etiqueta: 'Segundo nivel organizacional' },
    { clave: 'nivel3', etiqueta: 'Tercer nivel organizacional' }, { clave: 'colaborador', etiqueta: 'Persona que trabaja en la empresa' },
    { clave: 'recinto', etiqueta: 'Lugar de trabajo' },
  ];
  readonly porDefectoTerminos = TERMINOS_POR_DEFECTO;
  tab = 0;
  vista = 0;
  cargando = true;
  edicion: MarcaEdicion | null = null;
  datos: MarcaDatos | null = null;
  /** Image id → URL (uploaded in this session or already published). */
  urls: Record<string, string> = {};
  nota = '';
  publicando = false;
  subiendo: TipoArchivo | null = null;
  errores: Record<string, string> = {};
  confirmarRestaurar: VersionMarca | null = null;
  private original = '';

  constructor(private http: HttpClient, private marcas: MarcaService, private ui: UiStateService, private ctx: ContextoService) { this.cargar(); }

  /** Ocultar “Powered by Nexo RH” es del plan Enterprise (HIDE_POWERED_BY). */
  get marcaBlanca(): boolean { return this.ctx.contexto?.funciones.includes('HIDE_POWERED_BY') ?? false; }

  private cargar(): void {
    this.http.get<MarcaEdicion>(`${API_URL}/marca`).subscribe({
      next: (e) => this.recibir(e),
      error: (e) => { this.cargando = false; this.ui.toast(mensajeError(e)); },
    });
  }

  private recibir(e: MarcaEdicion): void {
    this.cargando = false;
    this.edicion = e;
    this.datos = structuredClone(e.datos);
    this.urls = { ...this.urls, ...e.archivos };
    this.original = JSON.stringify(this.datos);
    this.errores = {};
    cargarFuente(this.datos.tipografia);
  }

  get cambios(): boolean { return !!this.datos && JSON.stringify(this.datos) !== this.original; }
  get empresa(): string { return this.edicion?.empresa ?? ''; }
  get iniciales(): string { return inicialesEmpresa(this.empresa || 'Nexo RH'); }
  url(id: string | null): string | null { return id ? this.urls[id] ?? null : null; }

  // --- colors and accessibility ----------------------------------------------------------------------------------
  get paleta(): { paso: number; color: string }[] {
    const p = this.datos?.colores.primario;
    if (!esHex(p)) return [];
    const e = escala(p);
    return PASOS.map((paso) => ({ paso, color: e[paso] }));
  }
  ratio(c: string | null | undefined): number { return esHex(c) ? contraste(c, '#FFFFFF') : 0; }
  sugerido(c: string | null | undefined): string { return esHex(c) ? sugerirAccesible(c) : ''; }
  falla(c: string | null | undefined): boolean { return esHex(c) && this.ratio(c) < CONTRASTE_MINIMO; }
  /** Colors that must reach 4.5:1 with white text: primary, and sidebar and topbar when they are not automatic. */
  get problemasContraste(): string[] {
    const d = this.datos;
    if (!d) return [];
    const r: string[] = [];
    if (!esHex(d.colores.primario) || this.falla(d.colores.primario)) r.push('primario');
    if (d.colores.sidebar && (!esHex(d.colores.sidebar) || this.falla(d.colores.sidebar))) r.push('sidebar');
    if (d.colores.topbar && (!esHex(d.colores.topbar) || this.falla(d.colores.topbar))) r.push('topbar');
    if (d.colores.acento && !esHex(d.colores.acento)) r.push('acento');
    return r;
  }
  corregir(campo: 'primario' | 'sidebar' | 'topbar'): void {
    const d = this.datos;
    if (!d) return;
    const c = d.colores[campo];
    if (c) d.colores[campo] = sugerirAccesible(c);
  }
  /** Keeps the text field and the color picker in sync; accepts "0f766e" or "#0F766E". */
  normalizarColor(campo: 'primario' | 'sidebar' | 'topbar' | 'acento', valor: string): void {
    const d = this.datos;
    if (!d) return;
    let v = valor.trim();
    if (/^[0-9a-f]{6}$/i.test(v)) v = '#' + v;
    d.colores[campo] = v.toUpperCase();
  }
  automatico(campo: 'sidebar' | 'topbar' | 'acento', auto: boolean): void {
    const d = this.datos;
    if (!d) return;
    const e = esHex(d.colores.primario) ? escala(d.colores.primario) : null;
    d.colores[campo] = auto ? null : campo === 'sidebar' ? e?.[800] ?? '#284297' : campo === 'topbar' ? e?.[900] ?? '#263D8B' : '#F59E0B';
  }
  elegirFuente(f: string): void { if (this.datos) { this.datos.tipografia = f; cargarFuente(f); } }

  // --- preview ---------------------------------------------------------------------------------------------------
  get estiloPreview(): Record<string, string> {
    const d = this.datos;
    if (!d || !esHex(d.colores.primario)) return {};
    const v = variablesMarca({ colores: d.colores, tipografia: d.tipografia, radio: d.radio });
    // Inside the preview the default primary also needs explicit values (the page may be showing another brand).
    if (!v['--nx-primary-700']) {
      const e = escala(d.colores.primario);
      for (const [k, c] of Object.entries(e)) v[`--nx-primary-${k}`] = c;
      v['--nx-primary-800'] = '#284297'; v['--nx-primary-900'] = '#263D8B';
      v['--nx-sidebar-bg'] = d.colores.sidebar ?? '#284297'; v['--nx-topbar-bg'] = d.colores.topbar ?? '#263D8B'; v['--nx-rail'] = '#273E8E';
    }
    if (!v['--nx-font']) v['--nx-font'] = "'Nunito Sans', system-ui, sans-serif";
    return v;
  }
  /** "Colaboradores" → "Trabajadores" with the terminology being edited. */
  t(clave: keyof TerminologiaMarca, enPlural = false): string {
    const v = this.datos?.terminologia[clave]?.trim() || TERMINOS_POR_DEFECTO[clave];
    return enPlural ? plural(v) : v;
  }
  plural(v: string): string { return v ? plural(v) : ''; }
  get portal(): string { return this.datos?.nombrePortal?.trim() || 'Mi Portal'; }
  get tituloLogin(): string { return this.datos?.login.titulo?.trim() || `¡Bienvenido a ${this.empresa}!`; }
  get mensajeLogin(): string { return this.datos?.login.mensaje?.trim() || 'Ingresa para ver tu información, tus boletas y tus solicitudes.'; }
  get imagenLogin(): string | null { const u = this.url(this.datos?.login.imagen ?? null); return u ? `url("${u}")` : null; }

  // --- images ----------------------------------------------------------------------------------------------------
  subir(tipo: TipoArchivo, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || !this.datos) return;
    if (archivo.size > 2 * 1024 * 1024) { this.ui.toast('La imagen supera 2 MB.'); return; }
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('tipo', tipo);
    this.subiendo = tipo;
    this.http.post<{ id: string; url: string }>(`${API_URL}/marca/archivos`, form).subscribe({
      next: (r) => {
        this.subiendo = null;
        this.urls[r.id] = r.url;
        const d = this.datos!;
        if (tipo === 'login') d.login.imagen = r.id; else d.logos[tipo] = r.id;
      },
      error: (e) => { this.subiendo = null; this.ui.toast(mensajeError(e)); },
    });
  }
  quitar(tipo: TipoArchivo): void {
    const d = this.datos;
    if (!d) return;
    if (tipo === 'login') d.login.imagen = null; else d.logos[tipo] = null;
  }

  // --- publish, defaults, versions -------------------------------------------------------------------------------
  restablecer(): void {
    if (!this.edicion) return;
    this.datos = structuredClone(this.edicion.porDefecto);
    this.errores = {};
    this.ui.toast('Se cargaron los valores por defecto. Publica para aplicarlos.');
  }
  descartar(): void { if (this.edicion) { this.datos = JSON.parse(this.original); this.errores = {}; } }

  publicar(): void {
    if (!this.datos || this.publicando) return;
    if (this.problemasContraste.length) {
      this.tab = 2;
      this.ui.toast('Corrige los colores sin contraste suficiente antes de publicar.');
      return;
    }
    this.publicando = true;
    this.errores = {};
    this.http.post<MarcaEdicion>(`${API_URL}/marca`, { datos: this.datos, nota: this.nota.trim() || null }).subscribe({
      next: (e) => { this.publicando = false; this.nota = ''; this.recibir(e); this.aplicarEnLaApp(e.version); this.ui.toast(`Marca publicada (versión ${e.version})`); },
      error: (e: HttpErrorResponse) => {
        this.publicando = false;
        const errs = (e.error as { errors?: Record<string, string[]> } | null)?.errors;
        if (e.status === 400 && errs) {
          this.errores = Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]]));
          this.ui.toast('Revisa los campos marcados.');
        } else this.ui.toast(mensajeError(e));
      },
    });
  }

  restaurar(): void {
    const v = this.confirmarRestaurar;
    if (!v) return;
    this.confirmarRestaurar = null;
    this.http.post<MarcaEdicion>(`${API_URL}/marca/versiones/${v.version}/restaurar`, {}).subscribe({
      next: (e) => { this.recibir(e); this.aplicarEnLaApp(e.version); this.ui.toast(`Se restauró la versión ${v.version} (publicada como ${e.version})`); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  private aplicarEnLaApp(version: number): void { this.marcas.refrescar(version); }
}
