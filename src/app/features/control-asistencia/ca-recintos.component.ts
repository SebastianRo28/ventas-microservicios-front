import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ControlAsistenciaService } from '../../core/control-asistencia.service';
import { Colaborador, UbigeoDepartamento, mismoLugar } from '../../core/models';
import { HrDataService } from '../../core/hr-data.service';
import { emailDe } from '../../core/portal.service';
import { Recinto } from '../../core/sample/control-asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
type FormRecinto = Omit<Recinto, 'id'> & { id: number | null };

/** Create / edit recinto modal, shared by the list and the record. */
@Component({
  selector: 'app-ca-recinto-form',
  template: `
    <app-modal [title]="r.id == null ? 'Crear recinto' : 'Editar recinto'" width="720px" (closed)="cerrar.emit()">
      <form id="rec-form" class="nx-form" (ngSubmit)="guardar()" novalidate>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Nombre*<input class="nx-input" name="nombre" [(ngModel)]="r.nombre" maxlength="60"></label>
          <label class="nx-field">Clave*<input class="nx-input" name="clave" [(ngModel)]="r.clave" maxlength="10" placeholder="Ej. SC-01"></label>
          <label class="nx-field">Departamento*
            <select class="nx-select" name="departamento" [attr.name]="'departamento'" [(ngModel)]="r.departamento" (ngModelChange)="onDepartamento()"><option *ngFor="let d of departamentos" [value]="d.nombre">{{ d.nombre }}</option></select></label>
          <label class="nx-field">Provincia*
            <select class="nx-select" name="provincia" [attr.name]="'provincia'" [(ngModel)]="r.provincia" (ngModelChange)="r.distrito = ''"><option *ngFor="let p of provincias" [value]="p.nombre">{{ p.nombre }}</option></select></label>
          <label class="nx-field">Distrito*
            <select class="nx-select" name="distrito" [attr.name]="'distrito'" [(ngModel)]="r.distrito"><option value="">Seleccionar</option><option *ngFor="let d of distritos" [value]="d.nombre">{{ d.nombre }}</option></select></label>
          <label class="nx-field">Dirección*<input class="nx-input" name="direccion" [(ngModel)]="r.direccion"></label>
          <label class="nx-field">Jefatura a cargo
            <select class="nx-select" name="jefatura" [attr.name]="'jefatura'" [(ngModel)]="r.jefaturaId">
              <option [ngValue]="null">Sin asignar</option><option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }}</option></select></label>
          <label class="nx-field">Administrativo a cargo
            <select class="nx-select" name="administrativo" [attr.name]="'administrativo'" [(ngModel)]="r.administrativoId">
              <option [ngValue]="null">Sin asignar</option><option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }}</option></select></label>
          <label class="nx-field">Latitud*<input class="nx-input" name="lat" type="number" step="0.0001" [(ngModel)]="r.lat"></label>
          <label class="nx-field">Longitud*<input class="nx-input" name="lng" type="number" step="0.0001" [(ngModel)]="r.lng"></label>
          <label class="nx-field">Radio de asistencia (metros)*<input class="nx-input" name="radio" type="number" min="20" max="2000" [(ngModel)]="r.radio">
            <span class="nx-hint">Las marcas desde la app fuera de este radio se rechazan.</span></label>
          <label class="nx-field">Estado
            <select class="nx-select" name="activo" [attr.name]="'activo'" [(ngModel)]="r.activo"><option [ngValue]="true">Activo</option><option [ngValue]="false">Inactivo</option></select></label>
        </div>
        <label class="nx-field">Información adicional<textarea class="nx-textarea" name="info" rows="2" [(ngModel)]="r.info" maxlength="300"></textarea></label>
        <span *ngIf="intento && error" class="nx-error" role="alert">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="cerrar.emit()">Cancelar</button>
        <button type="submit" form="rec-form" class="nx-btn nx-btn--primary">{{ r.id == null ? 'Crear recinto' : 'Guardar' }}</button>
      </ng-container>
    </app-modal>
  `
})
export class CaRecintoFormComponent implements OnChanges {
  @Input() recinto: Recinto | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<Recinto>();
  departamentos: UbigeoDepartamento[] = [];
  r!: FormRecinto;
  intento = false;
  colaboradores: Colaborador[] = [];

  constructor(private ca: ControlAsistenciaService, private ui: UiStateService, data: HrDataService) {
    this.colaboradores = ca.colaboradores;
    this.ngOnChanges();
    data.ubigeo().subscribe((u) => { this.departamentos = u.departamentos; this.alUbigeo(); });
  }

  get provincias() { return this.departamentos.find((d) => d.nombre === this.r.departamento)?.provincias ?? []; }
  get distritos() { return this.provincias.find((p) => p.nombre === this.r.provincia)?.distritos ?? []; }

  /** Older recintos may say "Lurín": select the official name ("Lurin") so the lists show it. */
  private alUbigeo(): void {
    const d = this.departamentos.find((x) => mismoLugar(x.nombre, this.r.departamento));
    if (!d) return;
    this.r.departamento = d.nombre;
    const p = d.provincias.find((x) => mismoLugar(x.nombre, this.r.provincia));
    if (p) this.r.provincia = p.nombre;
    const di = p?.distritos.find((x) => mismoLugar(x.nombre, this.r.distrito));
    if (di) this.r.distrito = di.nombre;
  }

  onDepartamento(): void {
    const ps = this.provincias;
    this.r.provincia = (ps.find((p) => p.nombre === this.r.departamento) ?? ps[0])?.nombre ?? '';
    this.r.distrito = '';
  }

  ngOnChanges(): void {
    const base = this.ca.recintos$.value[0];
    this.r = this.recinto ? { ...this.recinto, emails: [...this.recinto.emails], usuarios: [...this.recinto.usuarios] } : {
      id: null, nombre: '', empresa: base.empresa, ruc: base.ruc, codigoInterno: `CA-00${this.ca.recintos$.value.length + 1}`, pais: 'Perú', departamento: 'Lima', provincia: 'Lima',
      distrito: '', direccion: '', clave: '', info: '', jefaturaId: null, administrativoId: null, lat: -12.0464, lng: -77.0428,
      radio: Number(this.ca.metodos['radioDefecto']) || 150, emails: [], activo: true, usuarios: [],
    };
    if (this.departamentos?.length) this.alUbigeo();
  }

  get error(): string {
    const r = this.r;
    const req: [keyof FormRecinto, string][] = [['nombre', 'el nombre'], ['clave', 'la clave'], ['provincia', 'la provincia'], ['distrito', 'el distrito'], ['direccion', 'la dirección']];
    const falta = req.find(([k]) => !String(r[k] ?? '').trim());
    if (falta) return `Ingresa ${falta[1]}.`;
    const otros = this.ca.recintos$.value.filter((x) => x.id !== r.id);
    if (otros.some((x) => x.nombre.trim().toLowerCase() === r.nombre.trim().toLowerCase())) return 'Ya existe un recinto con ese nombre.';
    if (otros.some((x) => x.clave.trim().toUpperCase() === r.clave.trim().toUpperCase())) return 'Ya existe un recinto con esa clave.';
    if (!Number.isFinite(+r.lat) || +r.lat < -18.5 || +r.lat > 0) return 'La latitud debe estar entre -18.5 y 0 (Perú).';
    if (!Number.isFinite(+r.lng) || +r.lng < -81.5 || +r.lng > -68.5) return 'La longitud debe estar entre -81.5 y -68.5 (Perú).';
    if (!Number.isInteger(+r.radio) || +r.radio < 20 || +r.radio > 2000) return 'El radio debe ser un número entero entre 20 y 2000 metros.';
    if (!r.activo && r.id != null && this.ca.dotacion(r.id)) return `No se puede desactivar: ${this.ca.dotacion(r.id)} colaborador(es) tienen este recinto como principal.`;
    return '';
  }

  guardar(): void {
    this.intento = true;
    if (this.error) return;
    const r = this.r;
    const res = this.ca.guardarRecinto({ ...r, nombre: r.nombre.trim(), clave: r.clave.trim().toUpperCase(), lat: +r.lat, lng: +r.lng, radio: +r.radio });
    this.ui.toast(r.id == null ? `Recinto “${res.nombre}” creado` : 'Cambios guardados');
    this.guardado.emit(res);
  }
}

const COLS: Column[] = [
  { key: 'n', label: 'Nombre', type: 'link', w: 'minmax(210px, 1.4fr)' },
  { key: 'e', label: 'Empresa', filter: 'select', w: 'minmax(180px, 1fr)' },
  { key: 'd', label: 'Dirección', w: 'minmax(200px, 1.3fr)' },
  { key: 'di', label: 'Distrito', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'j', label: 'Jefatura', w: 'minmax(170px, 1fr)' },
  { key: 'c', label: 'N° de colaboradores', type: 'number', filter: 'none', w: 'minmax(130px, 0.7fr)' },
  { key: 'r', label: 'Radio (m)', type: 'number', filter: 'none', w: '100px' },
  { key: 's', label: 'Estado', type: 'badge', filter: 'select', w: '110px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' },
];

/** Control de Asistencia › Recintos › Listado de Recintos (P-04.5). */
@Component({
  selector: 'app-ca-recintos',
  template: `
    <app-page-header title="Listado de Recintos" [crumbs]="['Control de Asistencia', 'Recintos']">
      <button type="button" class="nx-btn nx-btn--primary" (click)="editar = null; modal = true"><app-icon name="plus" [size]="16"></app-icon>Crear Recinto</button>
    </app-page-header>
    <div class="nx-banner" role="note"><app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Los recintos son los lugares de trabajo donde se marca asistencia. También se administran desde <b>Administración › Localidades</b> para los datos generales.</span></div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="acciones" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Recintos" minWidth="1300px" exportName="recintos" (action)="onAction($event.action, $event.row)"></app-data-table>
    <app-ca-recinto-form *ngIf="modal" [recinto]="editar" (cerrar)="modal = false" (guardado)="modal = false"></app-ca-recinto-form>
  `
})
export class CaRecintosComponent implements OnDestroy {
  readonly cols = COLS;
  readonly acciones: RowAction[] = ['ver', 'editar'];
  rows: Row[] = [];
  modal = false;
  editar: Recinto | null = null;
  private sub: Subscription;

  constructor(private ca: ControlAsistenciaService, private router: Router) {
    this.sub = ca.recintos$.subscribe((rs) => {
      this.rows = rs.map((r) => ({
        id: r.id, n: { text: r.nombre, link: `/ca/recintos/ficha/${r.id}` }, e: r.empresa, d: r.direccion, di: r.distrito,
        j: r.jefaturaId == null ? '—' : ca.nombre(r.jefaturaId), c: ca.dotacion(r.id), r: r.radio,
        s: r.activo ? { text: 'Activo', tone: 'success' } : { text: 'Inactivo', tone: 'gray' }, x: '',
      }));
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  onAction(a: RowAction, row: Row): void {
    const r = this.ca.recinto(+row.id);
    if (!r) return;
    if (a === 'ver') this.router.navigate(['/ca/recintos/ficha', r.id]);
    if (a === 'editar') { this.editar = r; this.modal = true; }
  }
}

/** Control de Asistencia › Recintos › Ficha de Recinto (P-04.5). */
@Component({
  selector: 'app-ca-recinto-ficha',
  template: `
    <ng-container *ngIf="r">
      <app-page-header [title]="r.nombre" [crumbs]="['Control de Asistencia', 'Recintos']">
        <select class="nx-select nx-w-280" aria-label="Cambiar de recinto" [ngModel]="r.id" (ngModelChange)="ir($event)">
          <option *ngFor="let x of recintos" [ngValue]="x.id">{{ x.nombre }}</option></select>
        <button type="button" class="nx-btn nx-btn--primary" (click)="editando = true"><app-icon name="edit" [size]="16"></app-icon>Editar</button>
      </app-page-header>

      <section class="nx-card nx-pad nx-mb-16" aria-label="Últimas modificaciones">
        <h2 class="nx-section__title">Últimas modificaciones</h2>
        <ul class="nx-calog"><li *ngFor="let h of historial"><span class="nx-small nx-muted">{{ h.fecha }} · {{ h.usuario }}</span><span>{{ h.texto }}</span></li></ul>
        <p *ngIf="!historial.length" class="nx-muted nx-small nx-mb-0">Sin cambios registrados en esta sesión. Los cambios que hagas aparecerán aquí y en Historial de cambios.</p>
      </section>

      <div class="nx-grid nx-grid--2 nx-mb-16">
        <section class="nx-card nx-pad">
          <h2 class="nx-section__title">Datos del recinto</h2>
          <div class="nx-fieldrow"><span>País</span><span>{{ r.pais }}</span></div>
          <div class="nx-fieldrow"><span>Departamento / Provincia / Distrito</span><span>{{ r.departamento }} / {{ r.provincia }} / {{ r.distrito }}</span></div>
          <div class="nx-fieldrow"><span>Dirección</span><span>{{ r.direccion }}</span></div>
          <div class="nx-fieldrow"><span>Clave</span><span>{{ r.clave }}</span></div>
          <div class="nx-fieldrow"><span>Estado</span><span><span class="nx-badge" [ngClass]="r.activo ? 'nx-tone-success' : 'nx-tone-gray'">{{ r.activo ? 'Activo' : 'Inactivo' }}</span></span></div>
          <div class="nx-fieldrow"><span>Información adicional</span><span>{{ r.info || '—' }}</span></div>
        </section>
        <section class="nx-card nx-pad">
          <h2 class="nx-section__title">Responsables</h2>
          <div *ngFor="let p of responsables" class="nx-person nx-mb-12">
            <span class="nx-avatar nx-avatar--40">{{ p.ini }}</span>
            <div><span class="nx-small nx-muted">{{ p.rol }}</span><br><b>{{ p.nombre }}</b><br><span class="nx-small">{{ p.email }}</span></div>
          </div>
          <h2 class="nx-section__title nx-mt-16">Datos de la empresa</h2>
          <div class="nx-fieldrow"><span>Razón social</span><span>{{ r.empresa }}</span></div>
          <div class="nx-fieldrow"><span>RUC</span><span>{{ r.ruc }}</span></div>
          <div class="nx-fieldrow"><span>Código interno</span><span>{{ r.codigoInterno }}</span></div>
        </section>
      </div>

      <div class="nx-grid nx-grid--2 nx-mb-16">
        <section class="nx-card nx-pad" aria-label="Ubicación">
          <div class="nx-section__head"><h2>Ubicación</h2><span class="nx-small nx-muted">Haz clic en el mapa para mover el pin</span></div>
          <app-ca-mapa [recintos]="[pin]" [editable]="true" [alto]="260" (mover)="moverPin($event)" etiqueta="Ubicación del recinto"></app-ca-mapa>
          <div class="nx-grid nx-grid--2 nx-gap-16 nx-mt-12">
            <label class="nx-field">Latitud<input class="nx-input" type="number" step="0.0001" [(ngModel)]="pin.lat" (ngModelChange)="pinCambiado = true"></label>
            <label class="nx-field">Longitud<input class="nx-input" type="number" step="0.0001" [(ngModel)]="pin.lng" (ngModelChange)="pinCambiado = true"></label>
            <label class="nx-field">Radio de asistencia (metros)<input class="nx-input" type="number" min="20" max="2000" [(ngModel)]="pin.radio" (ngModelChange)="pinCambiado = true"></label>
          </div>
          <span *ngIf="pinCambiado && errorPin" class="nx-error">{{ errorPin }}</span>
          <div *ngIf="pinCambiado" class="nx-row nx-row--end nx-mt-12">
            <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="resetPin()">Descartar</button>
            <button type="button" class="nx-btn nx-btn--primary nx-btn--sm" [disabled]="!!errorPin" (click)="guardarPin()">Guardar ubicación</button>
          </div>
        </section>
        <section class="nx-card nx-pad" aria-label="Notificaciones">
          <h2 class="nx-section__title">Notificaciones</h2>
          <p class="nx-muted nx-small nx-mt-0">Hasta 5 correos que reciben las alertas del recinto.</p>
          <ul class="nx-calog">
            <li *ngFor="let e of r.emails" class="nx-row"><span class="nx-grow">{{ e }}</span>
              <button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Quitar ' + e" (click)="quitarEmail(e)"><app-icon name="trash" [size]="15"></app-icon></button></li>
          </ul>
          <form class="nx-row nx-mt-12" (ngSubmit)="agregarEmail()">
            <input class="nx-input nx-grow" name="email" type="email" placeholder="correo@empresa.pe" [(ngModel)]="nuevoEmail" [disabled]="r.emails.length >= 5" aria-label="Nuevo correo">
            <button type="submit" class="nx-btn nx-btn--outline" [disabled]="r.emails.length >= 5">Agregar</button>
          </form>
          <span *ngIf="errorEmail" class="nx-error">{{ errorEmail }}</span>
        </section>
      </div>

      <section class="nx-card nx-pad" aria-label="Usuarios con acceso">
        <div class="nx-section__head"><h2>Usuarios con acceso</h2>
          <button type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="agregarUsuario = true; usuarioSel = null"><app-icon name="plus" [size]="15"></app-icon>Agregar</button></div>
        <div class="nx-dt__scroll"><table class="nx-table">
          <thead><tr><th>Nombre</th><th>Cargo</th><th>Email</th><th></th></tr></thead>
          <tbody><tr *ngFor="let u of usuarios"><td>{{ u.apellidos }}, {{ u.nombres }}</td><td>{{ u.cargo }}</td><td>{{ email(u) }}</td>
            <td><button type="button" class="nx-icon-btn nx-icon-btn--ghost nx-icon-btn--sm" [attr.aria-label]="'Quitar acceso a ' + u.nombres" (click)="quitarUsuario(u)"><app-icon name="trash" [size]="15"></app-icon></button></td></tr>
            <tr *ngIf="!usuarios.length"><td colspan="4" class="nx-muted">Nadie tiene acceso a este recinto.</td></tr></tbody>
        </table></div>
      </section>

      <app-ca-recinto-form *ngIf="editando" [recinto]="r" (cerrar)="editando = false" (guardado)="editando = false; cargar(r.id)"></app-ca-recinto-form>
      <app-modal *ngIf="agregarUsuario" title="Agregar usuario con acceso" width="480px" (closed)="agregarUsuario = false">
        <label class="nx-field">Colaborador*
          <select class="nx-select" [(ngModel)]="usuarioSel" aria-label="Colaborador">
            <option [ngValue]="null" disabled>Selecciona</option><option *ngFor="let c of candidatos" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }} · {{ c.cargo }}</option></select></label>
        <ng-container modal-footer>
          <button type="button" class="nx-btn nx-btn--outline" (click)="agregarUsuario = false">Cancelar</button>
          <button type="button" class="nx-btn nx-btn--primary" [disabled]="usuarioSel == null" (click)="confirmarUsuario()">Agregar</button>
        </ng-container>
      </app-modal>
    </ng-container>
  `
})
export class CaRecintoFichaComponent implements OnDestroy {
  r: Recinto | null = null;
  recintos: Recinto[] = [];
  pin!: Recinto;
  pinCambiado = false;
  editando = false;
  historial: { fecha: string; texto: string; usuario: string }[] = [];
  responsables: { rol: string; nombre: string; email: string; ini: string }[] = [];
  usuarios: Colaborador[] = [];
  nuevoEmail = '';
  errorEmail = '';
  agregarUsuario = false;
  usuarioSel: number | null = null;
  private sub = new Subscription();

  constructor(private ca: ControlAsistenciaService, private route: ActivatedRoute, private router: Router, private ui: UiStateService) {
    this.sub.add(ca.recintos$.subscribe((rs) => { this.recintos = rs; if (this.r) this.cargar(this.r.id); }));
    this.sub.add(route.paramMap.subscribe((p) => this.cargar(Number(p.get('id')) || rs0(ca))));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  cargar(id: number): void {
    this.r = this.ca.recinto(id) ?? this.ca.recintos$.value[0];
    const r = this.r;
    this.resetPin();
    this.historial = this.ca.historialRecinto(r);
    const persona = (rol: string, id: number | null) => {
      const c = id == null ? undefined : this.ca.col(id);
      return { rol, nombre: c ? `${c.apellidos}, ${c.nombres}` : 'Sin asignar', email: c ? emailDe(c) : '—', ini: c ? c.nombres[0] + c.apellidos[0] : '—' };
    };
    this.responsables = [persona('Jefatura a cargo', r.jefaturaId), persona('Administrativo a cargo', r.administrativoId)];
    this.usuarios = r.usuarios.map((u) => this.ca.col(u)).filter((c): c is Colaborador => !!c);
  }
  ir(id: number): void { this.router.navigate(['/ca/recintos/ficha', id]); }
  email(c: Colaborador): string { return emailDe(c); }

  resetPin(): void { if (this.r) this.pin = { ...this.r }; this.pinCambiado = false; }
  moverPin(p: { lat: number; lng: number }): void { this.pin = { ...this.pin, lat: p.lat, lng: p.lng }; this.pinCambiado = true; }
  get errorPin(): string {
    const p = this.pin;
    if (!Number.isFinite(+p.lat) || +p.lat < -18.5 || +p.lat > 0 || !Number.isFinite(+p.lng) || +p.lng < -81.5 || +p.lng > -68.5) return 'Las coordenadas deben estar dentro de Perú.';
    if (!Number.isInteger(+p.radio) || +p.radio < 20 || +p.radio > 2000) return 'El radio debe ser un número entero entre 20 y 2000 metros.';
    return '';
  }
  guardarPin(): void {
    if (!this.r || this.errorPin) return;
    this.ca.guardarRecinto({ ...this.r, lat: +this.pin.lat, lng: +this.pin.lng, radio: +this.pin.radio });
    this.ui.toast('Ubicación guardada');
  }

  agregarEmail(): void {
    const e = this.nuevoEmail.trim().toLowerCase();
    if (!this.r) return;
    this.errorEmail = !EMAIL.test(e) ? 'Ingresa un correo válido.' : this.r.emails.includes(e) ? 'Ese correo ya está en la lista.' : this.r.emails.length >= 5 ? 'Máximo 5 correos.' : '';
    if (this.errorEmail) return;
    this.ca.guardarRecinto({ ...this.r, emails: [...this.r.emails, e] });
    this.nuevoEmail = '';
    this.ui.toast('Correo agregado');
  }
  quitarEmail(e: string): void { if (this.r) this.ca.guardarRecinto({ ...this.r, emails: this.r.emails.filter((x) => x !== e) }); }

  get candidatos(): Colaborador[] { return this.ca.colaboradores.filter((c) => !this.r?.usuarios.includes(c.id)); }
  confirmarUsuario(): void {
    if (!this.r || this.usuarioSel == null) return;
    this.ca.guardarRecinto({ ...this.r, usuarios: [...this.r.usuarios, this.usuarioSel] });
    this.agregarUsuario = false;
    this.ui.toast(`${this.ca.nombre(this.usuarioSel)} ahora tiene acceso al recinto`);
  }
  quitarUsuario(c: Colaborador): void { if (this.r) this.ca.guardarRecinto({ ...this.r, usuarios: this.r.usuarios.filter((x) => x !== c.id) }); }
}

const rs0 = (ca: ControlAsistenciaService) => ca.recintos$.value[0].id;
