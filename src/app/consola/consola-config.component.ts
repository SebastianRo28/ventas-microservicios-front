import { Component } from '@angular/core';
import { UiStateService } from '../core/ui-state.service';
import { Anuncio, CatalogoConsola, ConsolaService, Flag, PlanConsola, ResumenCicloVida, Salud, errorConsola, soles } from './consola.service';

const MODULOS_NOMBRE: Record<string, string> = {
  PRO: 'Plataforma Pro', PAYROLL: 'Planillas', ATTENDANCE: 'Asistencia', DOCS: 'Documentos y Firma', ASSETS: 'Gestión de Activos', WHISTLEBLOWER: 'Canal de Denuncias',
  SERVICE_DESK: 'Servicio al colaborador', COMP: 'Compensaciones', HEADCOUNT: 'Headcount', SST: 'SST', COMMS: 'Comunicación', SURVEYS: 'Encuestas',
};

/** P-SA.6 Plans and prices: plan cards, module matrix per plan, edit plan and module prices. */
@Component({
  selector: 'app-consola-planes',
  template: `
    <div class="cx-cab">
      <div><span class="cx-ruta">Consola › Planes y precios</span><h1>Planes y precios</h1><p class="nx-muted nx-mt-0">Precios en soles, sin IGV · un cambio aplica a altas y renovaciones; los precios pactados no cambian</p></div>
      <button *ngIf="c.esAdmin" type="button" class="nx-btn nx-btn--primary" (click)="nuevo()"><app-icon name="plus" [size]="16"></app-icon>Nuevo plan</button>
    </div>
    <div class="cx-planes">
      <article *ngFor="let p of planes" class="nx-card nx-pad cx-plan">
        <div class="cx-tabla__cab"><h2 class="nx-mt-0">{{ p.nombre }}</h2><span class="nx-badge">{{ p.tenants }} tenants</span></div>
        <b class="cx-plan__precio">{{ soles(p.precioPorColaborador) }}</b><small class="nx-muted">por colaborador / mes · sin IGV</small>
        <div class="nx-fieldrow"><span>Empresas</span><span>{{ p.limiteEmpresas }}</span></div>
        <div class="nx-fieldrow"><span>Almacenamiento</span><span>{{ p.limiteAlmacenamientoGb }} GB</span></div>
        <div class="nx-fieldrow"><span>Administradores</span><span>{{ p.limiteAdmins }}</span></div>
        <div class="nx-fieldrow"><span>API por minuto</span><span>{{ p.limiteApiPorMinuto || 'No incluida' }}</span></div>
        <div class="nx-fieldrow"><span>Funciones</span><span>{{ p.funciones.join(', ') || '—' }}</span></div>
        <div class="cx-acciones" *ngIf="c.esAdmin">
          <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="editar(p)">Editar</button>
          <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="duplicar(p)">Duplicar</button>
          <button *ngIf="!p.tenants" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="eliminar(p)">Eliminar</button>
        </div>
      </article>
    </div>
    <section class="nx-card nx-dt__scroll">
      <div class="cx-tabla__cab"><h2 class="nx-section__title nx-mt-0">Módulos por plan</h2><span class="nx-muted nx-small">Precio = adicional por colaborador / mes</span></div>
      <table class="nx-table cx-tabla">
        <thead><tr><th>Módulo</th><th>Clave</th><th class="nx-num">Precio adicional</th><th *ngFor="let p of planes">{{ p.nombre }}</th><th></th></tr></thead>
        <tbody><tr *ngFor="let m of planes[0]?.modulos">
          <td><b>{{ m.nombre }}</b></td><td class="cx-mono">{{ m.codigo }}</td>
          <td class="nx-num"><input *ngIf="precioEdit === m.codigo; else verPrecio" class="nx-input nx-input--sm" type="number" min="0" step="0.1" [(ngModel)]="precioNuevo" [attr.aria-label]="'Precio de ' + m.nombre"><ng-template #verPrecio>{{ soles(m.precioAdicional) }}</ng-template></td>
          <td *ngFor="let p of planes">{{ incluido(p, m.codigo) ? '✓ Incluido' : soles(m.precioAdicional) }}</td>
          <td class="cx-acciones"><ng-container *ngIf="c.esAdmin">
            <button *ngIf="precioEdit !== m.codigo" type="button" class="nx-link-btn" (click)="precioEdit = m.codigo; precioNuevo = m.precioAdicional">Editar precio</button>
            <button *ngIf="precioEdit === m.codigo" type="button" class="nx-btn nx-btn--primary nx-btn--sm" (click)="guardarPrecio(m.codigo, m.nombre)">Guardar</button>
          </ng-container></td>
        </tr></tbody>
      </table>
    </section>

    <app-modal *ngIf="f" [title]="f.esNuevo ? 'Nuevo plan' : 'Editar plan ' + f.nombre" width="620px" (closed)="f = null">
      <div class="nx-form-grid">
        <label class="nx-field">Código<input class="nx-input" [(ngModel)]="f.codigo" [disabled]="!f.esNuevo" maxlength="20"></label>
        <label class="nx-field">Nombre<input class="nx-input" [(ngModel)]="f.nombre" maxlength="60"></label>
        <label class="nx-field">Precio por colaborador (S/)<input class="nx-input" type="number" min="0.01" step="0.1" [(ngModel)]="f.precioPorColaborador"></label>
        <label class="nx-field">Empresas<input class="nx-input" type="number" min="0" [(ngModel)]="f.limiteEmpresas"></label>
        <label class="nx-field">Almacenamiento (GB)<input class="nx-input" type="number" min="0" [(ngModel)]="f.limiteAlmacenamientoGb"></label>
        <label class="nx-field">Administradores<input class="nx-input" type="number" min="0" [(ngModel)]="f.limiteAdmins"></label>
        <label class="nx-field">API por minuto<input class="nx-input" type="number" min="0" [(ngModel)]="f.limiteApiPorMinuto"></label>
        <label class="nx-field nx-span-2">Funciones (separadas por coma)<input class="nx-input" [(ngModel)]="f.funciones" placeholder="SSO_SOCIAL, SAML, CUSTOM_DOMAIN"></label>
      </div>
      <h3 class="nx-settings__title">Módulos incluidos</h3>
      <div class="cx-modulos-sel"><label *ngFor="let m of codigos" class="nx-check"><input type="checkbox" [checked]="f.incluidos.has(m)" (change)="f.incluidos.has(m) ? f.incluidos.delete(m) : f.incluidos.add(m)"> {{ nombre(m) }}</label></div>
      <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="f = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--primary" (click)="guardar()">Guardar</button>
      </ng-container>
    </app-modal>
  `
})
export class ConsolaPlanesComponent {
  readonly soles = soles;
  readonly codigos = Object.keys(MODULOS_NOMBRE);
  planes: PlanConsola[] = [];
  precioEdit: string | null = null;
  precioNuevo = 0;
  error = '';
  f: { esNuevo: boolean; codigo: string; nombre: string; precioPorColaborador: number; limiteEmpresas: number; limiteAlmacenamientoGb: number; limiteAdmins: number;
    limiteApiPorMinuto: number; funciones: string; incluidos: Set<string> } | null = null;

  constructor(public c: ConsolaService, private ui: UiStateService) { this.cargar(); }

  cargar(): void { this.c.get<PlanConsola[]>('plans').subscribe({ next: (p) => this.planes = p, error: (e) => this.ui.toast(errorConsola(e)) }); }
  incluido(p: PlanConsola, m: string): boolean { return !!p.modulos.find((x) => x.codigo === m)?.incluido; }
  nombre(m: string): string { return MODULOS_NOMBRE[m] ?? m; }

  private desde(p: PlanConsola | null, esNuevo: boolean): void {
    this.error = '';
    this.f = {
      esNuevo, codigo: esNuevo ? (p ? p.codigo + '_2' : '') : p!.codigo, nombre: esNuevo && p ? p.nombre + ' (copia)' : p?.nombre ?? '', precioPorColaborador: p?.precioPorColaborador ?? 10,
      limiteEmpresas: p?.limiteEmpresas ?? 1, limiteAlmacenamientoGb: p?.limiteAlmacenamientoGb ?? 5, limiteAdmins: p?.limiteAdmins ?? 3, limiteApiPorMinuto: p?.limiteApiPorMinuto ?? 0,
      funciones: (p?.funciones ?? []).join(', '), incluidos: new Set(p?.modulos.filter((m) => m.incluido).map((m) => m.codigo) ?? []),
    };
  }
  nuevo(): void { this.desde(null, true); }
  editar(p: PlanConsola): void { this.desde(p, false); }
  duplicar(p: PlanConsola): void { this.desde(p, true); }

  guardar(): void {
    const f = this.f!;
    const cuerpo = { codigo: f.codigo, nombre: f.nombre, precioPorColaborador: +f.precioPorColaborador, limiteEmpresas: +f.limiteEmpresas, limiteAlmacenamientoGb: +f.limiteAlmacenamientoGb,
      limiteAdmins: +f.limiteAdmins, limiteApiPorMinuto: +f.limiteApiPorMinuto, modulosIncluidos: [...f.incluidos], funciones: f.funciones.split(',').map((x) => x.trim()).filter(Boolean) };
    (f.esNuevo ? this.c.post('plans', cuerpo) : this.c.put(`plans/${f.codigo}`, cuerpo)).subscribe({
      next: () => { this.ui.toast(f.esNuevo ? 'Plan creado' : 'Plan actualizado'); this.f = null; this.cargar(); },
      error: (e) => this.error = errorConsola(e),
    });
  }

  eliminar(p: PlanConsola): void {
    this.c.delete(`plans/${p.codigo}`).subscribe({ next: () => { this.ui.toast('Plan eliminado'); this.cargar(); }, error: (e) => this.ui.toast(errorConsola(e)) });
  }

  guardarPrecio(codigo: string, nombre: string): void {
    this.c.put(`modules/${codigo}`, { nombre, descripcion: '', precioPorColaborador: +this.precioNuevo }).subscribe({
      next: () => { this.ui.toast('Precio actualizado'); this.precioEdit = null; this.cargar(); }, error: (e) => this.ui.toast(errorConsola(e)),
    });
  }
}

/** P-SA.7 Global catalogs: immutable versions adopted by date; "Publicar nueva versión" with a CSV and the diff. */
@Component({
  selector: 'app-consola-catalogos',
  template: `
    <div class="cx-cab"><div><span class="cx-ruta">Consola › Catálogos globales</span><h1>Catálogos globales</h1>
      <p class="nx-muted nx-mt-0">Catálogos compartidos por todos los tenants. Cada publicación crea una versión inmutable; los tenants la adoptan desde su fecha de vigencia.</p></div></div>
    <section class="nx-card nx-dt__scroll">
      <table class="nx-table cx-tabla">
        <thead><tr><th>Catálogo</th><th>Clave</th><th>Versión</th><th class="nx-num">Registros</th><th>Publicada</th><th>Vigente desde</th><th>Estado</th><th></th></tr></thead>
        <tbody><tr *ngFor="let x of catalogos">
          <td><b>{{ x.nombre }}</b></td><td class="cx-mono">{{ x.clave }}</td><td>{{ x.version || '—' }}</td><td class="nx-num">{{ x.registros | number }}</td>
          <td>{{ x.publicadaEn ? (x.publicadaEn | date: 'dd/MM/yyyy') : '—' }}</td><td>{{ x.vigenteDesde ? (x.vigenteDesde | date: 'dd/MM/yyyy') : '—' }}</td>
          <td><span class="nx-badge nx-badge--sm" [ngClass]="x.estado === 'Publicada' ? 'nx-tone-success' : x.estado === 'Programada' ? 'nx-tone-info' : ''">{{ x.estado }}</span></td>
          <td class="nx-text-right"><button *ngIf="c.esAdmin" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="abrir(x)">Publicar nueva versión</button></td>
        </tr></tbody>
      </table>
    </section>
    <app-modal *ngIf="sel" [title]="'Publicar nueva versión · ' + sel.nombre" width="560px" (closed)="sel = null">
      <div class="nx-form-grid">
        <label class="nx-field">Versión *<input class="nx-input" [(ngModel)]="version" placeholder="v2027.1"></label>
        <label class="nx-field">Vigente desde *<span class="nx-input-icon nx-input-icon--end"><input nxFecha nxFechaIso class="nx-input" [(ngModel)]="vigente"><app-icon name="calendar" [size]="16"></app-icon></span></label>
      </div>
      <label class="nx-field">Archivo CSV *<input type="file" accept=".csv,text/csv" (change)="archivo = $any($event.target).files?.[0] ?? null">
        <span class="nx-hint">Columnas: {{ sel.columnas }}</span></label>
      <label class="nx-field">Notas de la versión<textarea class="nx-input" rows="2" [(ngModel)]="notas"></textarea></label>
      <div *ngIf="resultado" class="nx-banner nx-banner--compact" role="status"><app-icon name="checkcircle" [size]="16"></app-icon>
        <span>{{ resultado.version }} publicada: {{ resultado.registros }} registros · +{{ resultado.agregados }} nuevos, {{ resultado.modificados }} modificados, {{ resultado.eliminados }} eliminados.</span></div>
      <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="sel = null">{{ resultado ? 'Cerrar' : 'Cancelar' }}</button>
        <button *ngIf="!resultado" type="button" class="nx-btn nx-btn--primary" [disabled]="!version || !vigente || !archivo" (click)="publicar()">Publicar versión</button>
      </ng-container>
    </app-modal>
  `
})
export class ConsolaCatalogosComponent {
  catalogos: CatalogoConsola[] = [];
  sel: CatalogoConsola | null = null;
  version = '';
  vigente = '';
  notas = '';
  archivo: File | null = null;
  error = '';
  resultado: { version: string; registros: number; agregados: number; modificados: number; eliminados: number } | null = null;

  constructor(public c: ConsolaService, private ui: UiStateService) { this.cargar(); }
  cargar(): void { this.c.get<CatalogoConsola[]>('catalogs').subscribe({ next: (x) => this.catalogos = x, error: (e) => this.ui.toast(errorConsola(e)) }); }
  abrir(x: CatalogoConsola): void { this.sel = x; this.version = ''; this.vigente = ''; this.notas = ''; this.archivo = null; this.error = ''; this.resultado = null; }

  publicar(): void {
    const form = new FormData();
    form.append('version', this.version.trim());
    form.append('vigenteDesde', this.vigente);
    form.append('archivo', this.archivo!);
    form.append('notas', this.notas);
    this.c.post<typeof this.resultado>(`catalogs/${this.sel!.clave}/versions`, form).subscribe({
      next: (r) => { this.resultado = r; this.cargar(); }, error: (e) => this.error = errorConsola(e),
    });
  }
}

/** P-SA.8 News: announcements for the companies' admins with segmentation, scheduling and preview. */
@Component({
  selector: 'app-consola-novedades',
  template: `
    <div class="cx-cab"><div><span class="cx-ruta">Consola › Novedades</span><h1>Novedades</h1><p class="nx-muted nx-mt-0">Anuncios para los administradores de los tenants</p></div>
      <button *ngIf="c.esAdmin" type="button" class="nx-btn nx-btn--primary" (click)="nuevo()"><app-icon name="plus" [size]="16"></app-icon>Nuevo</button></div>
    <div class="cx-grid-2 cx-grid-2--lista">
      <section class="nx-card">
        <button *ngFor="let a of anuncios" type="button" class="cx-anuncio" [class.is-on]="f?.id === a.id" (click)="editar(a)">
          <b>{{ a.titulo }}</b><span><span class="nx-badge nx-badge--sm" [ngClass]="a.estado === 'Publicada' ? 'nx-tone-success' : a.estado === 'Programada' ? 'nx-tone-info' : ''">{{ a.estado }}</span>
          {{ a.tipo }} · {{ a.desde ? (a.desde | date: 'dd/MM/yyyy') : '—' }} · {{ a.alcance }} tenants</span>
        </button>
        <p *ngIf="!anuncios.length" class="cx-vacio nx-muted">Todavía no hay anuncios.</p>
      </section>
      <section *ngIf="f" class="nx-card nx-pad nx-stack">
        <h2 class="nx-section__title nx-mt-0">{{ f.id ? 'Editar anuncio' : 'Nuevo anuncio' }}</h2>
        <label class="nx-field">Título *<input class="nx-input" maxlength="80" [(ngModel)]="f.titulo"></label>
        <label class="nx-field">Tipo<select class="nx-select" [(ngModel)]="f.tipo"><option>Novedad</option><option>Mantenimiento</option><option>Aviso legal</option></select></label>
        <label class="nx-field">Contenido *<textarea class="nx-input" rows="4" maxlength="2000" [(ngModel)]="f.cuerpo"></textarea></label>
        <div class="nx-field"><span>Segmentación por plan (vacío = todos)</span>
          <div class="cx-modulos-sel"><label *ngFor="let p of ['BASICO', 'PRO', 'ENTERPRISE']" class="nx-check"><input type="checkbox" [checked]="f.planes.has(p)" (change)="alternar(f.planes, p)"> {{ p }}</label></div></div>
        <div class="nx-field"><span>Segmentación por módulo (vacío = todos)</span>
          <div class="cx-modulos-sel"><label *ngFor="let m of modulos" class="nx-check"><input type="checkbox" [checked]="f.modulos.has(m[0])" (change)="alternar(f.modulos, m[0])"> {{ m[1] }}</label></div></div>
        <div class="nx-form-grid">
          <label class="nx-field">Publicar desde<span class="nx-input-icon nx-input-icon--end"><input nxFecha="hora" nxFechaIso="hora" class="nx-input" [(ngModel)]="f.desde"><app-icon name="calendar" [size]="16"></app-icon></span></label>
          <label class="nx-field">Ocultar desde<span class="nx-input-icon nx-input-icon--end"><input nxFecha="hora" nxFechaIso="hora" class="nx-input" [(ngModel)]="f.hasta"><app-icon name="calendar" [size]="16"></app-icon></span></label>
          <label class="nx-field">Canal<select class="nx-select" [(ngModel)]="f.canal"><option value="banner">Banner en la app</option><option value="modal">Modal al ingresar</option><option value="banner_correo">Banner + correo a admins</option></select></label>
        </div>
        <div class="cx-preview-anuncio"><span class="nx-eyebrow">Vista previa en la app del cliente</span>
          <div class="nx-estado"><app-icon name="megaphone" [size]="16"></app-icon><span class="nx-grow"><b>{{ f.titulo || 'Título' }}</b> · {{ f.cuerpo || 'Contenido del anuncio.' }}</span></div></div>
        <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
        <div class="nx-settings__foot" *ngIf="c.esAdmin">
          <button *ngIf="f.id" type="button" class="nx-btn nx-btn--outline" (click)="eliminar()">Eliminar</button>
          <button type="button" class="nx-btn nx-btn--outline" (click)="guardar(false)">Guardar borrador</button>
          <button type="button" class="nx-btn nx-btn--primary" (click)="guardar(true)">{{ f.desde && f.desde > ahora ? 'Programar' : 'Publicar' }}</button>
        </div>
      </section>
    </div>
  `
})
export class ConsolaNovedadesComponent {
  readonly modulos = Object.entries(MODULOS_NOMBRE);
  readonly ahora = new Date().toISOString().slice(0, 16);
  anuncios: Anuncio[] = [];
  error = '';
  f: { id: number | null; titulo: string; cuerpo: string; tipo: string; planes: Set<string>; modulos: Set<string>; desde: string; hasta: string; canal: string } | null = null;

  constructor(public c: ConsolaService, private ui: UiStateService) { this.cargar(); }
  cargar(): void { this.c.get<Anuncio[]>('announcements').subscribe({ next: (a) => this.anuncios = a, error: (e) => this.ui.toast(errorConsola(e)) }); }
  alternar(s: Set<string>, v: string): void { s.has(v) ? s.delete(v) : s.add(v); }
  private local(iso: string | null): string { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  nuevo(): void { this.error = ''; this.f = { id: null, titulo: '', cuerpo: '', tipo: 'Novedad', planes: new Set(), modulos: new Set(), desde: '', hasta: '', canal: 'banner' }; }
  editar(a: Anuncio): void {
    this.error = '';
    this.f = { id: a.id, titulo: a.titulo, cuerpo: a.cuerpo, tipo: a.tipo, planes: new Set(a.planes), modulos: new Set(a.modulos), desde: this.local(a.desde), hasta: this.local(a.hasta), canal: a.canal };
  }

  guardar(publicar: boolean): void {
    const f = this.f!;
    const cuerpo = { titulo: f.titulo, cuerpo: f.cuerpo, tipo: f.tipo, planes: [...f.planes], modulos: [...f.modulos], canal: f.canal, publicar,
      desde: f.desde ? new Date(f.desde).toISOString() : null, hasta: f.hasta ? new Date(f.hasta).toISOString() : null };
    (f.id ? this.c.put<Anuncio>(`announcements/${f.id}`, cuerpo) : this.c.post<Anuncio>('announcements', cuerpo)).subscribe({
      next: (a) => { this.ui.toast(publicar ? `Anuncio ${a.estado.toLowerCase()}` : 'Borrador guardado'); this.cargar(); this.editar(a); },
      error: (e) => this.error = errorConsola(e),
    });
  }

  eliminar(): void {
    this.c.delete(`announcements/${this.f!.id}`).subscribe({ next: () => { this.ui.toast('Anuncio eliminado'); this.f = null; this.cargar(); }, error: (e) => this.ui.toast(errorConsola(e)) });
  }
}

/** P-SA.9 Feature flags: flag × tenant matrix with immediate save and rollback if it fails. */
@Component({
  selector: 'app-consola-flags',
  template: `
    <div class="cx-cab"><div><span class="cx-ruta">Consola › Feature flags</span><h1>Feature flags</h1><p class="nx-muted nx-mt-0">Activación por tenant · los cambios aplican en ≤ 60 s (caché por tenant)</p></div>
      <button *ngIf="c.esAdmin" type="button" class="nx-btn nx-btn--primary" (click)="nuevo = { clave: '', descripcion: '', modulo: '' }"><app-icon name="plus" [size]="16"></app-icon>Nuevo flag</button></div>
    <section class="nx-card nx-dt__scroll">
      <table class="nx-table cx-tabla cx-matriz">
        <thead><tr><th>Flag</th><th>Rollout</th><th *ngFor="let t of tenants" class="cx-matriz__t">{{ t }}</th></tr></thead>
        <tbody><tr *ngFor="let f of flags">
          <td><b class="cx-mono">{{ f.clave }}</b><br><small class="nx-muted">{{ f.descripcion }}{{ f.modulo ? ' · ' + f.modulo : '' }}</small></td>
          <td>{{ f.activos }} / {{ f.tenants.length }}</td>
          <td *ngFor="let x of f.tenants" class="cx-matriz__t">
            <button type="button" role="switch" class="nx-switch" [class.is-on]="x.activo" [attr.aria-checked]="x.activo" [attr.aria-label]="f.clave + ' en ' + x.slug"
                    [disabled]="!c.esAdmin || (!x.moduloContratado && !x.activo)" [title]="x.moduloContratado ? '' : 'El tenant no tiene el módulo ' + f.modulo" (click)="alternar(f, x)"><span></span></button>
          </td>
        </tr></tbody>
      </table>
    </section>
    <p class="nx-hint">Un flag solo tiene efecto si el tenant tiene contratado el módulo al que pertenece.</p>
    <app-modal *ngIf="nuevo" title="Nuevo flag" width="480px" (closed)="nuevo = null">
      <label class="nx-field">Clave (snake_case)<input class="nx-input" [(ngModel)]="nuevo.clave" placeholder="nueva_funcion_beta"></label>
      <label class="nx-field">Descripción<input class="nx-input" [(ngModel)]="nuevo.descripcion"></label>
      <label class="nx-field">Módulo dueño<select class="nx-select" [(ngModel)]="nuevo.modulo"><option value="">Ninguno</option><option *ngFor="let m of modulos" [value]="m[0]">{{ m[1] }}</option></select></label>
      <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="nuevo = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--primary" (click)="crear()">Crear flag</button>
      </ng-container>
    </app-modal>
  `
})
export class ConsolaFlagsComponent {
  readonly modulos = Object.entries(MODULOS_NOMBRE);
  flags: Flag[] = [];
  nuevo: { clave: string; descripcion: string; modulo: string } | null = null;
  error = '';

  constructor(public c: ConsolaService, private ui: UiStateService) { this.cargar(); }
  get tenants(): string[] { return this.flags[0]?.tenants.map((t) => t.slug) ?? []; }
  cargar(): void { this.c.get<Flag[]>('feature-flags').subscribe({ next: (f) => this.flags = f, error: (e) => this.ui.toast(errorConsola(e)) }); }

  alternar(f: Flag, x: Flag['tenants'][number]): void {
    x.activo = !x.activo;
    f.activos += x.activo ? 1 : -1;
    this.c.put(`feature-flags/${f.clave}/tenants/${x.tenantId}`, { activo: x.activo }).subscribe({
      error: (e) => { x.activo = !x.activo; f.activos += x.activo ? 1 : -1; this.ui.toast(errorConsola(e)); },
    });
  }

  crear(): void {
    this.c.post('feature-flags', { ...this.nuevo, modulo: this.nuevo!.modulo || null }).subscribe({
      next: () => { this.nuevo = null; this.ui.toast('Flag creado'); this.cargar(); }, error: (e) => this.error = errorConsola(e),
    });
  }
}

/** P-SA.10 Health: migrations per database, latency and errors per tenant (last hour, in memory) and failed jobs. */
@Component({
  selector: 'app-consola-salud',
  template: `
    <div class="cx-cab"><div><span class="cx-ruta">Consola › Salud</span><h1>Salud de la plataforma</h1>
      <p class="nx-muted nx-mt-0">Actualizado {{ actualizado | date: 'dd/MM/yyyy HH:mm' }}</p></div>
      <div class="cx-acciones">
        <button *ngIf="c.esAdmin" type="button" class="nx-btn nx-btn--outline" [disabled]="ejecutando" (click)="ejecutar()">{{ ejecutando ? 'Ejecutando…' : 'Ejecutar ciclo de vida' }}</button>
        <button type="button" class="nx-btn nx-btn--outline" (click)="cargar()"><app-icon name="refresh" [size]="16"></app-icon>Actualizar</button>
      </div></div>
    <div *ngIf="ciclo" class="nx-banner nx-banner--compact" role="status"><app-icon name="info" [size]="16"></app-icon>
      <span>Ciclo de vida ({{ ciclo.en | date: 'dd/MM HH:mm' }}): {{ ciclo.usos }} tenants medidos, {{ ciclo.facturas }} facturas emitidas, {{ ciclo.trialsVencidos }} trials vencidos,
        {{ ciclo.morosos }} morosos, {{ ciclo.suspendidos }} suspendidos, {{ ciclo.reactivados }} reactivados, {{ ciclo.eliminados }} eliminados.{{ ciclo.eventos.length ? ' ' + ciclo.eventos.join(' · ') : '' }}</span></div>
    <ng-container *ngIf="s">
      <div class="cx-kpis cx-kpis--4">
        <div class="nx-card cx-kpi"><span>API en línea desde</span><b>{{ s.desde | date: 'dd/MM HH:mm' }}</b><small>{{ horas }} de funcionamiento</small></div>
        <div class="nx-card cx-kpi"><span>Latencia p95 (última hora)</span><b>{{ s.p95Ms }} ms</b><small>{{ s.requests | number }} requests</small></div>
        <div class="nx-card cx-kpi"><span>Jobs fallidos (24 h)</span><b>{{ s.trabajosFallidos.length }}</b><small>Sin cola de trabajos aún</small></div>
        <div class="nx-card cx-kpi"><span>BD con migración pendiente</span><b>{{ pendientes }} de {{ s.basesDatos.length }}</b></div>
      </div>
      <section class="nx-card nx-mb-16 nx-dt__scroll">
        <div class="cx-tabla__cab"><h2 class="nx-section__title nx-mt-0">Migraciones por base de datos</h2></div>
        <table class="nx-table cx-tabla"><thead><tr><th>BD</th><th>Tipo</th><th class="nx-num">Tenants</th><th>Esquema (última migración)</th><th>Estado</th></tr></thead>
          <tbody><tr *ngFor="let b of s.basesDatos"><td><b>{{ b.nombre }}</b></td><td>{{ b.tipo }}</td><td class="nx-num">{{ b.tenants }}</td><td class="cx-mono">{{ b.esquema }}</td>
            <td><span class="nx-badge nx-badge--sm" [ngClass]="b.estado === 'Al día' ? 'nx-tone-success' : 'nx-tone-warning'">{{ b.estado }}{{ b.pendientes ? ' (' + b.pendientes + ')' : '' }}</span></td></tr></tbody></table>
      </section>
      <section class="nx-card nx-dt__scroll">
        <div class="cx-tabla__cab"><h2 class="nx-section__title nx-mt-0">Errores y latencia por tenant</h2><span class="nx-muted nx-small">Última hora · umbral p95 300 ms · 5xx 1 %</span></div>
        <table class="nx-table cx-tabla"><thead><tr><th>Tenant</th><th class="nx-num">Req / min</th><th>Latencia p95</th><th>Errores 5xx</th></tr></thead>
          <tbody>
            <tr *ngFor="let t of s.tenants"><td><a [routerLink]="['/consola/tenants', t.tenantId]">{{ t.nombre }}</a></td><td class="nx-num">{{ t.rpm }}</td>
              <td><span class="cx-latencia"><i [style.width.%]="min(100, t.p95Ms / 4)" [class.is-mal]="t.p95Ms > 300"></i></span> {{ t.p95Ms }} ms</td>
              <td [class.nx-error]="t.pctErrores > 1">{{ t.pctErrores }} %</td></tr>
            <tr *ngIf="!s.tenants.length"><td colspan="4" class="cx-vacio">Sin tráfico de tenants en la última hora.</td></tr>
          </tbody></table>
      </section>
    </ng-container>
  `
})
export class ConsolaSaludComponent {
  s: Salud | null = null;
  ciclo: ResumenCicloVida | null = null;
  ejecutando = false;
  actualizado = new Date();
  readonly min = Math.min;
  constructor(public c: ConsolaService, private ui: UiStateService) { this.cargar(); }

  /** Runs the lifecycle for every tenant now (it also runs every hour in production). */
  ejecutar(): void {
    if (!confirm('Se revisarán todos los tenants: trials vencidos, facturas vencidas (morosidad y suspensión), cancelaciones de más de 30 días (eliminación), uso del mes y facturas del mes anterior. ¿Continuar?')) return;
    this.ejecutando = true;
    this.c.post<ResumenCicloVida>('lifecycle/run', {}).subscribe({
      next: (r) => { this.ejecutando = false; this.ciclo = r; }, error: (e) => { this.ejecutando = false; this.ui.toast(errorConsola(e)); },
    });
  }
  get pendientes(): number { return this.s?.basesDatos.filter((b) => b.estado !== 'Al día').length ?? 0; }
  get horas(): string { const m = this.s?.minutosEnLinea ?? 0; return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; }
  cargar(): void { this.c.get<Salud>('health').subscribe({ next: (s) => { this.s = s; this.actualizado = new Date(); }, error: (e) => this.ui.toast(errorConsola(e)) }); }
}
