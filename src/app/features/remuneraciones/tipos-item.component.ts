import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ItemsService } from '../../core/items.service';
import { CLASE_TONE, ClaseItem, TipoItem } from '../../core/sample/items';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const COLS: Column[] = [
  { key: 'cd', label: 'Código', w: 'minmax(100px, 0.6fr)' },
  { key: 'n', label: 'Nombre', w: 'minmax(220px, 1.6fr)' },
  { key: 'cl', label: 'Clase', type: 'badge', filter: 'select', w: 'minmax(130px, 0.8fr)' },
  { key: 'p', label: 'Código PLAME', w: 'minmax(110px, 0.7fr)' },
  { key: 'es', label: 'EsSalud', type: 'check', filter: 'none', checkLabels: ['Afecto', 'No afecto'], w: '90px' },
  { key: 'pe', label: 'AFP / ONP', type: 'check', filter: 'none', checkLabels: ['Afecto', 'No afecto'], w: '100px' },
  { key: 'q', label: '5ta categoría', type: 'check', filter: 'none', checkLabels: ['Afecto', 'No afecto'], w: '110px' },
  { key: 'o', label: 'Origen', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'u', label: 'Asignaciones', type: 'number', filter: 'none', w: 'minmax(110px, 0.7fr)' },
  { key: 'e', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(100px, 0.6fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '140px' },
];

type Form = Omit<TipoItem, 'id'> & { id: number | null };

/** Remuneraciones › Ítems › Tipos de ítem: payroll concepts with their PLAME code and contributions they affect. */
@Component({
  selector: 'app-tipos-item',
  template: `
    <app-page-header title="Tipos de ítem" [crumbs]="['Remuneraciones', 'Ítems']"></app-page-header>
    <app-data-table [columns]="cols" [rows]="rows" createLabel="Crear Tipo de ítem" [rowActions]="actions" [selectable]="false" [showBulk]="false"
                    [showAdvancedFilter]="false" tableLabel="Tipos de ítem" minWidth="1500px" exportName="tipos-de-item"
                    (create)="abrir(null)" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="form as f" [title]="f.id === null ? 'Crear tipo de ítem' : 'Editar tipo de ítem'" width="640px" (closed)="form = null">
      <form id="tipo-form" class="nx-form" (ngSubmit)="guardar()">
        <div class="nx-grid nx-grid--2 nx-gap-16">
          <label class="nx-field">Código*<input class="nx-input" name="codigo" placeholder="Ej. BON-PRO" maxlength="10" [(ngModel)]="f.codigo"></label>
          <label class="nx-field">Código PLAME*<input class="nx-input" name="plame" placeholder="0000" maxlength="4" inputmode="numeric" [(ngModel)]="f.plame"></label>
        </div>
        <label class="nx-field">Nombre*<input class="nx-input" name="nombre" placeholder="Ej. Bono de productividad" [(ngModel)]="f.nombre"></label>
        <label class="nx-field">Clase*
          <select class="nx-select" name="clase" [(ngModel)]="f.clase" [disabled]="f.automatico"><option *ngFor="let c of clases">{{ c }}</option></select>
        </label>
        <span class="nx-field-label nx-mb-0">Afecto a</span>
        <div class="nx-checks">
          <label class="nx-check nx-check--plain"><input type="checkbox" name="essalud" [(ngModel)]="f.essalud" [disabled]="f.clase !== 'Haber'">EsSalud</label>
          <label class="nx-check nx-check--plain"><input type="checkbox" name="pension" [(ngModel)]="f.pension" [disabled]="f.clase !== 'Haber'">AFP / ONP</label>
          <label class="nx-check nx-check--plain"><input type="checkbox" name="quinta" [(ngModel)]="f.quinta" [disabled]="f.clase !== 'Haber'">Renta de 5ta categoría</label>
        </div>
        <span *ngIf="f.clase !== 'Haber'" class="nx-hint">Las afectaciones solo aplican a haberes.</span>
        <span *ngIf="f.automatico" class="nx-hint">Ítem calculado por Nexo RH: solo puedes cambiar el nombre y las afectaciones.</span>
        <span *ngIf="intento && error" class="nx-error">{{ error }}</span>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="form = null">Cancelar</button>
        <button type="submit" form="tipo-form" class="nx-btn nx-btn--primary">Guardar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="borrar as b" title="Eliminar tipo de ítem" width="460px" (closed)="borrar = null">
      <p class="nx-mt-0">Se eliminará “{{ b.nombre }}” ({{ b.codigo }}).</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="borrar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmarBorrar()">Eliminar</button>
      </ng-container>
    </app-modal>
  `
})
export class TiposItemComponent implements OnDestroy {
  readonly cols = COLS;
  readonly clases: ClaseItem[] = ['Haber', 'Descuento', 'Aporte empleador'];
  readonly actions: RowAction[] = ['editar', 'pausa', 'eliminar'];
  rows: Row[] = [];
  form: Form | null = null;
  borrar: TipoItem | null = null;
  intento = false;
  private tipos: TipoItem[] = [];
  private sub: Subscription;

  constructor(private items: ItemsService, private ui: UiStateService) {
    this.sub = items.tipos$.subscribe((ts) => { this.tipos = ts; this.refrescar(); });
    this.sub.add(items.asignaciones$.subscribe(() => this.refrescar()));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private refrescar(): void {
    const ck = (t: TipoItem, v: boolean) => (t.clase === 'Haber' ? (v ? 'si' : 'no') : 'na');
    this.rows = this.tipos.map((t) => ({
      id: t.id, cd: t.codigo, n: t.nombre, cl: { text: t.clase, tone: CLASE_TONE[t.clase] }, p: t.plame,
      es: ck(t, t.essalud), pe: ck(t, t.pension), q: ck(t, t.quinta), o: t.automatico ? 'Automático' : 'Manual',
      u: this.items.usos(t.id), e: t.activo ? { text: 'Activo', tone: 'success' } : { text: 'Inactivo', tone: 'gray' }, x: '',
    }));
  }

  abrir(t: TipoItem | null): void {
    this.intento = false;
    this.form = t ? { ...t } : { id: null, codigo: '', nombre: '', clase: 'Haber', plame: '', essalud: true, pension: true, quinta: true, automatico: false, activo: true };
  }

  get error(): string {
    const f = this.form;
    if (!f) return '';
    const codigo = f.codigo.trim().toUpperCase();
    if (!codigo || !f.nombre.trim()) return 'Completa el código y el nombre.';
    if (!/^[A-Z0-9-]{2,10}$/.test(codigo)) return 'El código usa letras, números y guiones (2 a 10 caracteres).';
    if (this.tipos.some((t) => t.id !== f.id && t.codigo === codigo)) return `Ya existe un tipo de ítem con el código ${codigo}.`;
    if (!/^\d{4}$/.test(f.plame.trim())) return 'El código PLAME tiene 4 dígitos (Tabla 22 de SUNAT).';
    return '';
  }

  guardar(): void {
    this.intento = true;
    const f = this.form;
    if (!f || this.error) return;
    const haber = f.clase === 'Haber';
    const t = this.items.guardarTipo({ ...f, codigo: f.codigo.trim().toUpperCase(), nombre: f.nombre.trim(), plame: f.plame.trim(),
      essalud: haber && f.essalud, pension: haber && f.pension, quinta: haber && f.quinta });
    this.form = null;
    this.ui.toast(f.id === null ? `Tipo de ítem ${t.codigo} creado` : `Tipo de ítem ${t.codigo} actualizado`);
  }

  onAction(action: RowAction, row: Row): void {
    const t = this.tipos.find((x) => x.id === row.id);
    if (!t) return;
    if (action === 'editar') this.abrir(t);
    else if (action === 'pausa') {
      this.items.toggleTipo(t);
      this.ui.toast(t.activo ? `${t.nombre} activado` : `${t.nombre} desactivado: ya no se podrá asignar`);
    } else if (action === 'eliminar') {
      if (t.automatico) this.ui.toast('Los ítems automáticos no se pueden eliminar; puedes desactivarlos');
      else if (this.items.usos(t.id)) this.ui.toast(`No se puede eliminar: tiene ${this.items.usos(t.id)} asignaciones. Desactívalo en su lugar`);
      else this.borrar = t;
    }
  }

  confirmarBorrar(): void {
    const b = this.borrar;
    if (!b) return;
    this.items.eliminarTipo(b);
    this.borrar = null;
    this.ui.toast(`Tipo de ítem ${b.codigo} eliminado`);
  }
}
