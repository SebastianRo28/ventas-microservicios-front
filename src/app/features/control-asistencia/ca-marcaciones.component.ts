import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { aIso, aMin, ControlAsistenciaService, deIso } from '../../core/control-asistencia.service';
import { Colaborador } from '../../core/models';
import { Marca, MarcaFallida, Recinto } from '../../core/sample/control-asistencia';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';
import { PuntoMapa } from './ca-shared.components';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "Agregar marca manual" modal (P-04.8), used in Marcas Manuales, Marcas Fallidas and the attendance profile. */
@Component({
  selector: 'app-ca-marca-manual',
  template: `
    <app-modal title="Agregar marca manual" width="560px" (closed)="cerrar.emit()">
      <form id="mm-form" class="nx-form" (ngSubmit)="guardar()" novalidate>
        <label class="nx-field">Colaborador*
          <select class="nx-select" name="colaborador" [attr.name]="'colaborador'" [(ngModel)]="m.colaboradorId" [disabled]="fijo">
            <option [ngValue]="null" disabled>Selecciona un colaborador</option>
            <option *ngFor="let c of colaboradores" [ngValue]="c.id">{{ c.apellidos }}, {{ c.nombres }} · {{ c.documento }}</option></select></label>
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Fecha*<span class="nx-input-icon nx-input-icon--end"><input nxFecha nxFechaIso class="nx-input" name="fecha" [nxFechaMin]="minIso" [nxFechaMax]="maxIso" [(ngModel)]="m.fecha"><app-icon name="calendar" [size]="16"></app-icon></span></label>
          <label class="nx-field">Hora*<input type="time" class="nx-input" name="hora" [(ngModel)]="m.hora"></label>
        </div>
        <fieldset class="nx-field"><legend class="nx-field-label">Tipo*</legend>
          <div class="nx-row">
            <label class="nx-check nx-check--plain"><input type="radio" name="tipo" [attr.name]="'tipo'" value="Entrada" [(ngModel)]="m.tipo">Entrada</label>
            <label class="nx-check nx-check--plain"><input type="radio" name="tipo" [attr.name]="'tipo'" value="Salida" [(ngModel)]="m.tipo">Salida</label>
          </div></fieldset>
        <label class="nx-field">Motivo*<input class="nx-input" name="motivo" maxlength="120" placeholder="Ej. Olvidó marcar la salida" [(ngModel)]="m.motivo"></label>
        <div *ngIf="!error && aviso" class="nx-ok-note nx-ok-note--warn" role="status"><app-icon name="alert" [size]="16"></app-icon>{{ aviso }}</div>
        <span *ngIf="intento && error" class="nx-error" role="alert">{{ error }}</span>
        <p class="nx-small nx-muted nx-mb-0">La marca queda registrada con tu nombre en el historial de cambios y recalcula la jornada del día.</p>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="cerrar.emit()">Cancelar</button>
        <button type="submit" form="mm-form" class="nx-btn nx-btn--primary">Agregar marca</button>
      </ng-container>
    </app-modal>
  `
})
export class CaMarcaManualComponent implements OnInit {
  @Input() colaboradorId: number | null = null;
  @Input() prefill: Partial<{ fecha: string; hora: string; tipo: Marca['tipo']; motivo: string }> = {};
  @Output() cerrar = new EventEmitter<void>();
  readonly minIso: string;
  readonly maxIso: string;
  colaboradores: Colaborador[];
  fijo = false;
  intento = false;
  m: { colaboradorId: number | null; fecha: string; hora: string; tipo: Marca['tipo'] | ''; motivo: string } = { colaboradorId: null, fecha: '', hora: '', tipo: '', motivo: '' };

  constructor(private ca: ControlAsistenciaService, private ui: UiStateService) {
    this.minIso = aIso(ca.inicio);
    this.maxIso = aIso(ca.corte);
    this.colaboradores = ca.visibles({ ...ca.filtro, area: '', cargo: '', contrato: '', supervisor: '' }, 0);
  }
  ngOnInit(): void {
    this.fijo = this.colaboradorId != null && !this.prefill.motivo;
    this.m = { colaboradorId: this.colaboradorId, fecha: aIso(this.prefill.fecha ?? this.ca.filtro.fecha), hora: this.prefill.hora ?? '', tipo: this.prefill.tipo ?? '', motivo: this.prefill.motivo ?? '' };
  }

  get error(): string {
    const m = this.m;
    if (m.colaboradorId == null) return 'Selecciona un colaborador.';
    if (!m.fecha || m.fecha < this.minIso || m.fecha > this.maxIso) return `La fecha debe estar entre el ${this.ca.inicio} y hoy (${this.ca.corte}).`;
    if (!HORA.test(m.hora)) return 'Ingresa la hora en formato HH:mm.';
    const f = deIso(m.fecha);
    if (f === this.ca.corte && aMin(m.hora) > aMin(this.ca.horaCorte)) return `No puedes registrar una marca posterior a la hora actual (${this.ca.horaCorte}).`;
    if (!m.tipo) return 'Elige si es entrada o salida.';
    if (m.motivo.trim().length < 5) return 'Escribe el motivo (al menos 5 caracteres).';
    const cerca = this.ca.marcasDe(+m.colaboradorId, f).find((x) => Math.abs(aMin(x.hora) - aMin(m.hora)) < 5);
    if (cerca) return `Ya existe una marca de ${cerca.tipo.toLowerCase()} a las ${cerca.hora} ese día.`;
    return '';
  }
  get aviso(): string {
    const m = this.m;
    if (m.colaboradorId == null || !m.fecha || !HORA.test(m.hora) || !m.tipo) return '';
    const marcas = this.ca.marcasDe(+m.colaboradorId, deIso(m.fecha));
    const entrada = marcas.find((x) => x.tipo === 'Entrada');
    if (m.tipo === 'Salida' && entrada && aMin(m.hora) < aMin(entrada.hora)) return `La salida queda antes de la entrada (${entrada.hora}); revisa la hora.`;
    const j = this.ca.jornada(+m.colaboradorId, deIso(m.fecha));
    if (['Vacaciones', 'Licencia', 'Permiso'].includes(j.estado)) return `Ese día el colaborador tiene ${j.detalle.toLowerCase()}.`;
    return '';
  }

  guardar(): void {
    this.intento = true;
    if (this.error) return;
    const c = this.ca.col(+this.m.colaboradorId!)!;
    this.ca.agregarManual(c, { fecha: deIso(this.m.fecha), hora: this.m.hora, tipo: this.m.tipo as Marca['tipo'], motivo: this.m.motivo.trim() });
    this.ui.toast(`Marca de ${this.m.tipo.toLowerCase()} agregada para ${c.nombres} ${c.apellidos}`);
    this.cerrar.emit();
  }
}

const COLS: Column[] = [
  { key: 'f', label: 'Fecha y hora', type: 'date', filter: 'date', w: 'minmax(140px, 0.8fr)' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.3fr)' },
  { key: 'd', label: 'Documento', w: '110px', oculta: true },
  { key: 'r', label: 'Recinto', filter: 'select', w: 'minmax(180px, 1fr)' },
  { key: 't', label: 'Tipo', type: 'badge', filter: 'select', w: '96px' },
  { key: 'm', label: 'Método', filter: 'select', w: '96px' },
  { key: 'dr', label: 'En el radio', type: 'badge', filter: 'select', w: 'minmax(130px, 0.6fr)' },
  { key: 'fo', label: 'Foto', type: 'badge', filter: 'select', w: '90px' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '70px' },
];
const fila = (ca: ControlAsistenciaService, m: Marca): Row => ({
  id: m.id, f: `${m.fecha} ${m.hora}`, c: { text: ca.nombre(m.colaboradorId), link: `/ca/colaboradores/perfil/${m.colaboradorId}` },
  d: ca.col(m.colaboradorId)?.documento ?? '—', r: ca.recinto(m.recintoId)?.nombre ?? '—',
  t: { text: m.tipo, tone: m.tipo === 'Entrada' ? 'success' : 'orange' }, m: m.metodo,
  // Manual punches and web punches made before the location was asked carry the site coordinates, not the device ones.
  dr: m.metodo === 'Manual' ? { text: 'No aplica', tone: 'gray' } : m.metodo === 'Web' && m.distancia == null ? { text: 'Sin ubicación', tone: 'gray' }
    : m.dentroRadio ? { text: '✓ Sí', tone: 'success' } : { text: '✗ No', tone: 'danger' },
  fo: m.metodo === 'Manual' ? { text: 'No aplica', tone: 'gray' } : m.foto ? { text: 'Sí', tone: 'success' } : { text: 'No', tone: m.metodo === 'Web' ? 'gray' : 'warning' }, x: '',
});

/** Control de Asistencia › Marcaciones › Registro de Marcaciones (P-04.8). */
@Component({
  selector: 'app-ca-marcaciones',
  template: `
    <app-page-header title="Registro de Marcaciones" [crumbs]="['Control de Asistencia', 'Marcaciones']"></app-page-header>
    <app-ca-filtros></app-ca-filtros>
    <div class="nx-row nx-mb-12">
      <div class="nx-chips" role="group" aria-label="Período">
        <button type="button" class="nx-chip" [class.is-on]="!mes" [attr.aria-pressed]="!mes" (click)="mes = false; armar()">Día seleccionado ({{ ca.filtro.fecha }})</button>
        <button type="button" class="nx-chip" [class.is-on]="mes" [attr.aria-pressed]="mes" (click)="mes = true; armar()">Mes completo hasta esa fecha</button>
      </div>
      <span class="nx-grow"></span><span class="nx-small nx-muted">{{ rows.length }} marcas</span>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="['ver']" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Marcaciones" minWidth="1050px" exportName="marcaciones" emptyTitle="Sin marcas" emptyText="No hay marcas para los filtros elegidos."
                    (action)="ver($event.row)"></app-data-table>
    <app-modal *ngIf="sel as m" [title]="m.tipo + ' · ' + ca.nombre(m.colaboradorId)" width="620px" (closed)="cerrar()">
      <div class="nx-fieldrow"><span>Fecha y hora</span><span>{{ m.fecha }} {{ m.hora }}</span></div>
      <div class="nx-fieldrow"><span>Método</span><span>{{ m.metodo }}{{ m.creadoPor ? ' · registrada por ' + m.creadoPor : '' }}</span></div>
      <div *ngIf="m.motivo" class="nx-fieldrow"><span>Motivo</span><span>{{ m.motivo }}</span></div>
      <div *ngIf="m.distancia != null; else sinGps" class="nx-fieldrow"><span>Ubicación del dispositivo</span>
        <span>{{ m.lat.toFixed(5) }}, {{ m.lng.toFixed(5) }} · a {{ m.distancia | number: '1.0-0' }} m del recinto, {{ m.dentroRadio ? 'dentro del radio' : 'fuera del radio' }}{{ m.precision != null ? ' · precisión del GPS ±' + m.precision + ' m' : '' }}</span></div>
      <ng-template #sinGps><div class="nx-fieldrow"><span>Coordenadas</span><span>{{ m.lat.toFixed(5) }}, {{ m.lng.toFixed(5) }} · {{ m.metodo === 'Manual' || m.metodo === 'Web' ? 'las del recinto (sin ubicación del dispositivo)' : m.dentroRadio ? 'dentro del radio' : 'fuera del radio' }}</span></div></ng-template>
      <div *ngIf="m.foto" class="nx-fieldrow"><span>Selfie</span>
        <span><img *ngIf="fotoUrl; else cargandoFoto" class="nx-marca-foto" [src]="fotoUrl" [alt]="'Selfie de la marca de ' + ca.nombre(m.colaboradorId)"><ng-template #cargandoFoto><span *ngIf="fotoError" class="nx-muted">{{ fotoError }}</span><span *ngIf="!fotoError" class="nx-marca-foto nx-skel-box" role="status" aria-label="Cargando la foto"></span></ng-template></span></div>
      <app-ca-mapa class="nx-mt-12" [recintos]="recintoSel" [puntos]="puntoSel" [alto]="240" etiqueta="Ubicación de la marca"></app-ca-mapa>
      <ng-container modal-footer><button type="button" class="nx-btn nx-btn--primary" (click)="cerrar()">Cerrar</button></ng-container>
    </app-modal>
  `
})
export class CaMarcacionesComponent implements OnDestroy {
  readonly cols = COLS;
  rows: Row[] = [];
  mes = false;
  sel: Marca | null = null;
  recintoSel: Recinto[] = [];
  puntoSel: PuntoMapa[] = [];
  private sub: Subscription;

  constructor(public ca: ControlAsistenciaService) { this.sub = ca.cambios$.subscribe(() => this.armar()); }
  ngOnDestroy(): void { this.sub.unsubscribe(); this.soltarFoto(); }

  /** Selfie of the open punch (object URL, revoked on close). */
  fotoUrl: string | null = null;
  fotoError = '';
  private soltarFoto(): void { if (this.fotoUrl) URL.revokeObjectURL(this.fotoUrl); this.fotoUrl = null; this.fotoError = ''; }
  cerrar(): void { this.sel = null; this.soltarFoto(); }

  armar(): void {
    const f = this.ca.filtro.fecha, mes = f.slice(3), dia = +f.slice(0, 2);
    const ids = new Set(this.ca.visibles().map((c) => c.id));
    this.rows = this.ca.todasLasMarcas().filter((m) => ids.has(m.colaboradorId) && (this.mes ? m.fecha.slice(3) === mes && +m.fecha.slice(0, 2) <= dia : m.fecha === f))
      .sort((a, b) => (b.fecha.split('/').reverse().join('') + b.hora).localeCompare(a.fecha.split('/').reverse().join('') + a.hora))
      .map((m) => fila(this.ca, m));
  }
  ver(row: Row): void {
    const m = this.ca.todasLasMarcas().find((x) => x.id === row.id);
    if (!m) return;
    this.soltarFoto();
    this.sel = m;
    if (m.foto && m.id > 0) this.ca.fotoMarca(m.id).subscribe({
      next: (u) => { if (this.sel === m) this.fotoUrl = u; else URL.revokeObjectURL(u); },
      error: () => (this.fotoError = 'No se pudo cargar la foto.'),
    });
    const r = this.ca.recinto(m.recintoId);
    this.recintoSel = r ? [r] : [];
    this.puntoSel = [{ lat: m.lat, lng: m.lng, color: m.tipo === 'Entrada' ? 'var(--nx-success-500)' : 'var(--nx-orange)', label: `${m.tipo} ${m.hora}` }];
  }
}

const COLS_MANUAL: Column[] = [
  { key: 'f', label: 'Fecha y hora', type: 'date', filter: 'date', w: 'minmax(140px, 0.8fr)' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.3fr)' },
  { key: 'r', label: 'Recinto', filter: 'select', w: 'minmax(170px, 1fr)' },
  { key: 't', label: 'Tipo', type: 'badge', filter: 'select', w: '96px' },
  { key: 'mo', label: 'Motivo', w: 'minmax(220px, 1.5fr)' },
  { key: 'a', label: 'Registrada por', filter: 'select', w: 'minmax(150px, 0.9fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '90px' },
];

/** Control de Asistencia › Marcaciones › Marcas Manuales (P-04.8). */
@Component({
  selector: 'app-ca-marcas-manuales',
  template: `
    <app-page-header title="Marcas Manuales" [crumbs]="['Control de Asistencia', 'Marcaciones']">
      <button type="button" class="nx-btn nx-btn--primary" (click)="modal = true"><app-icon name="plus" [size]="16"></app-icon>Agregar marca manual</button>
    </app-page-header>
    <app-ca-filtros [fecha]="false"></app-ca-filtros>
    <div class="nx-banner" role="note"><app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Úsalas cuando un colaborador no pudo marcar (por ejemplo, olvidó la salida). Cada marca guarda su autor y motivo en el historial de cambios.</span></div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="['eliminar']" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Marcas manuales" minWidth="1100px" exportName="marcas-manuales" emptyTitle="No hay marcas manuales" (action)="pedirBorrar($event.row)"></app-data-table>
    <app-ca-marca-manual *ngIf="modal" (cerrar)="modal = false"></app-ca-marca-manual>
    <app-modal *ngIf="borrar as b" title="Eliminar marca manual" width="460px" (closed)="borrar = null">
      <p class="nx-mt-0">Se eliminará la {{ b.tipo.toLowerCase() }} del {{ b.fecha }} a las {{ b.hora }} de {{ ca.nombre(b.colaboradorId) }} y se recalculará su jornada.</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="borrar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmar()">Eliminar</button>
      </ng-container>
    </app-modal>
  `
})
export class CaMarcasManualesComponent implements OnDestroy {
  readonly cols = COLS_MANUAL;
  rows: Row[] = [];
  modal = false;
  borrar: Marca | null = null;
  private sub: Subscription;

  constructor(public ca: ControlAsistenciaService, private ui: UiStateService) {
    this.sub = ca.cambios$.subscribe(() => {
      const ids = new Set(ca.visibles().map((c) => c.id));
      this.rows = ca.todasLasMarcas().filter((m) => m.metodo === 'Manual' && ids.has(m.colaboradorId))
        .sort((a, b) => (b.fecha.split('/').reverse().join('') + b.hora).localeCompare(a.fecha.split('/').reverse().join('') + a.hora))
        .map((m) => ({
          id: m.id, f: `${m.fecha} ${m.hora}`, c: { text: ca.nombre(m.colaboradorId), link: `/ca/colaboradores/perfil/${m.colaboradorId}` },
          r: ca.recinto(m.recintoId)?.nombre ?? '—', t: { text: m.tipo, tone: m.tipo === 'Entrada' ? 'success' : 'orange' }, mo: m.motivo ?? '—', a: m.creadoPor ?? '—', x: '',
        }));
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }
  pedirBorrar(row: Row): void { this.borrar = this.ca.todasLasMarcas().find((m) => m.id === row.id) ?? null; }
  confirmar(): void { if (this.borrar) { this.ca.eliminarMarca(this.borrar); this.ui.toast('Marca eliminada'); } this.borrar = null; }
}

const COLS_FALLIDAS: Column[] = [
  { key: 'f', label: 'Fecha y hora', type: 'date', filter: 'date', w: 'minmax(140px, 0.8fr)' },
  { key: 'c', label: 'Colaborador', type: 'link', w: 'minmax(200px, 1.3fr)' },
  { key: 'r', label: 'Recinto', filter: 'select', w: 'minmax(170px, 1fr)' },
  { key: 't', label: 'Tipo', filter: 'select', w: '100px' },
  { key: 'm', label: 'Método', filter: 'select', w: '100px' },
  { key: 'mo', label: 'Motivo del rechazo', type: 'badge', filter: 'select', w: 'minmax(170px, 1fr)' },
  { key: 'di', label: 'Distancia al recinto', w: 'minmax(140px, 0.7fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '90px' },
];

/** Control de Asistencia › Marcaciones › Marcas Fallidas (P-04.8): rejected punches with their reason. */
@Component({
  selector: 'app-ca-marcas-fallidas',
  template: `
    <app-page-header title="Marcas Fallidas" [crumbs]="['Control de Asistencia', 'Marcaciones']"></app-page-header>
    <app-ca-filtros [fecha]="false"></app-ca-filtros>
    <div class="nx-banner" role="note"><app-icon name="info" [size]="19"></app-icon>
      <span class="nx-grow">Intentos de marca rechazados según <a routerLink="/ca/configuraciones/metodos">Métodos de Marcación</a>. Si corresponde, regístralos como marca manual con el botón <b>+</b>.</span></div>
    <app-data-table [columns]="cols" [rows]="rows" [rowActions]="['cargar']" [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false"
                    tableLabel="Marcas fallidas" minWidth="1200px" exportName="marcas-fallidas" emptyTitle="Sin marcas fallidas" (action)="registrar($event.row)"></app-data-table>
    <app-ca-marca-manual *ngIf="pre as p" [colaboradorId]="p.colaboradorId" [prefill]="p.datos" (cerrar)="pre = null"></app-ca-marca-manual>
  `
})
export class CaMarcasFallidasComponent implements OnDestroy {
  readonly cols = COLS_FALLIDAS;
  rows: Row[] = [];
  pre: { colaboradorId: number; datos: Partial<{ fecha: string; hora: string; tipo: Marca['tipo']; motivo: string }> } | null = null;
  private lista: MarcaFallida[] = [];
  private sub: Subscription;

  constructor(private ca: ControlAsistenciaService) {
    this.sub = combineLatest([ca.cambios$, ca.fallidas$]).subscribe(([, fs]) => {
      this.lista = fs;
      const ids = new Set(ca.visibles().map((c) => c.id));
      const tone: Record<string, 'danger' | 'warning' | 'orange'> = { 'Fuera del radio': 'danger', 'Sin foto': 'warning', 'Sin turno asignado': 'orange', 'Método no permitido': 'warning' };
      this.rows = fs.filter((m) => ids.has(m.colaboradorId)).map((m) => ({
        id: m.id, f: `${m.fecha} ${m.hora}`, c: { text: ca.nombre(m.colaboradorId), link: `/ca/colaboradores/perfil/${m.colaboradorId}` },
        r: ca.recinto(m.recintoId)?.nombre ?? '—', t: m.tipo, m: m.metodo, mo: { text: m.motivo, tone: tone[m.motivo] },
        di: m.distancia ? `${m.distancia.toLocaleString('es-PE')} m (radio ${ca.recinto(m.recintoId)?.radio} m)` : '—', x: '',
      }));
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }
  registrar(row: Row): void {
    const m = this.lista.find((x) => x.id === row.id);
    if (m) this.pre = { colaboradorId: m.colaboradorId, datos: { fecha: m.fecha, hora: m.hora, tipo: m.tipo, motivo: `Marca fallida validada (${m.motivo.toLowerCase()})` } };
  }
}
