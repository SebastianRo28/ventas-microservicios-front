import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row } from '../../shared/data-table/data-table.models';

const ACC: Column = { key: 'acc', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '80px' };
const COLS: Column[] = [
  { key: 'nombre', label: 'Nombre', w: 'minmax(220px, 2fr)' },
  { key: 'subs', label: 'N° Sub-áreas', type: 'number', filter: 'none', w: 'minmax(110px, 0.8fr)' },
  { key: 'cols', label: 'N° Colaboradores', type: 'number', filter: 'none', w: 'minmax(130px, 0.8fr)' },
  { key: 'fam', label: 'Familia de Cargo', filter: 'select', w: 'minmax(150px, 1fr)' },
  { key: 'act', label: 'Activo', filter: 'select', w: 'minmax(100px, 0.6fr)' }, ACC,
];
const FCOLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(200px, 2fr)' },
  { key: 'c', label: 'N° Cargos', type: 'number', filter: 'none', w: 'minmax(110px, 1fr)' },
  { key: 'a', label: 'Activo', filter: 'select', w: 'minmax(100px, 1fr)' }, ACC,
];
const CCOLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(200px, 1.2fr)' },
  { key: 'd', label: 'Descripción', w: 'minmax(300px, 2.5fr)' },
  { key: 'a', label: 'Activo', filter: 'select', w: 'minmax(100px, 0.6fr)' }, ACC,
];

const si = (b: boolean) => (b ? 'Sí' : 'No');

/** P-01.3 Cargos, with P-01.4 modal "Nuevo Cargo". */
@Component({
  selector: 'app-cargos',
  templateUrl: './cargos.component.html'
})
export class CargosComponent {
  readonly tabs = ['Cargos', 'Familias de Cargo', 'Competencias'];
  readonly cols = COLS; readonly fcols = FCOLS; readonly ccols = CCOLS;
  tab = 0;
  banner = true;
  rows: Row[] = []; frows: Row[] = []; crows: Row[] = [];

  modal = false;
  adv = false;
  generated = false;
  errorApi = '';
  form = { name: '', code: '', desc: '', req: '', familia: 'Intermedio' };
  subs: string[] = ['Compensaciones'];
  allSubs: string[];

  constructor(private data: HrDataService, private ui: UiStateService) {
    this.allSubs = data.subAreas();
    this.cargarCargos();
    data.familias().subscribe((l) => (this.frows = l.map((f) => ({ id: f.id, n: f.nombre, c: f.cargos, a: si(f.activo), x: '' }))));
    data.competencias().subscribe((l) => (this.crows = l.map((c) => ({ id: c.id, n: c.nombre, d: c.descripcion, a: si(c.activo), x: '' }))));
  }

  private cargarCargos(): void {
    this.data.cargos().subscribe((l) => (this.rows = l.map((c) => ({
      id: c.id, nombre: c.nombre, subs: c.subAreas, cols: c.colaboradores, fam: c.familia, act: si(c.activo), acc: ''
    }))));
  }

  get subsAvail(): string[] { return this.allSubs.filter((s) => !this.subs.includes(s)); }

  openModal(): void {
    this.form = { name: '', code: '', desc: '', req: '', familia: 'Intermedio' };
    this.subs = ['Compensaciones'];
    this.generated = false;
    this.adv = false;
    this.modal = true;
  }

  addSub(v: string): void { if (v) this.subs = [...this.subs, v]; }
  removeSub(v: string): void { this.subs = this.subs.filter((s) => s !== v); }

  /** "Crear Cargo con Nexo AI": fills description and requirements from the name (canned until an AI API exists). */
  generate(): void {
    const n = this.form.name.trim() || 'Analista de Planillas';
    this.form.name = n;
    this.form.code ||= n.split(' ').filter((w) => w.length > 2).map((w) => w.slice(0, 3).toUpperCase()).join('-');
    this.form.desc = 'Responsable de ' + (n.toLowerCase().includes('planilla')
      ? 'procesar la planilla mensual, calcular beneficios sociales (CTS, gratificaciones, vacaciones) y preparar los archivos PLAME y AFPnet en los plazos legales.'
      : `ejecutar las funciones propias del cargo ${n}, coordinar con su jefatura y asegurar la calidad de los entregables del área.`);
    this.form.req = '• Bachiller en Administración, Contabilidad, Ingeniería o afines.\n• 2 años de experiencia en funciones similares.\n• Excel intermedio.\n• Conocimiento de normativa laboral peruana.';
    this.generated = true;
  }

  /** Creates the cargo in the API (it checks the name is unique) and reloads the list. */
  create(): void {
    this.errorApi = '';
    if (!this.form.name.trim() || !this.form.code.trim()) { this.errorApi = 'Ingresa el nombre y el código del cargo.'; return; }
    this.data.crearCargo({ nombre: this.form.name.trim(), codigo: this.form.code.trim(), familia: this.form.familia, subAreas: this.subs.length,
      descripcion: [this.form.desc, this.form.req].filter(Boolean).join('\n\n') }).subscribe({
      next: () => { this.modal = false; this.tab = 0; this.cargarCargos(); this.ui.toast('Cargo creado con éxito'); },
      error: (e) => (this.errorApi = mensajeError(e)),
    });
  }
}
