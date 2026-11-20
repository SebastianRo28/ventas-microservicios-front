import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { parseFecha } from '../../core/format';
import { CampoCatalogo, CatalogoConfig, FilaCatalogo } from '../../core/genericos';
import { GenericosService } from '../../core/genericos.service';
import { HrDataService } from '../../core/hr-data.service';
import { ItemsService } from '../../core/items.service';
import { CATALOGOS } from '../../core/sample/catalogos-config';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

type Valor = string | number | boolean;

/**
 * Generic catalog screen (list + create/edit/delete with validation). The catalog comes from the route data
 * (`catalogo: 'clave'`), so simple master tables share one tested implementation.
 */
@Component({
  selector: 'app-catalogo',
  template: `
    <app-page-header [title]="titulo" [crumbs]="crumbs"></app-page-header>
    <div *ngIf="cfg.descripcion" class="nx-banner" role="note">
      <app-icon name="info" [size]="19"></app-icon><span class="nx-grow">{{ cfg.descripcion }}</span>
    </div>
    <app-data-table [columns]="cols" [rows]="rows" [createLabel]="'Agregar ' + cfg.singular.toLowerCase()" [rowActions]="actions"
                    [selectable]="false" [showBulk]="false" [showAdvancedFilter]="false" [tableLabel]="titulo"
                    [minWidth]="cfg.minWidth ?? '900px'" [exportName]="cfg.clave" [emptyTitle]="'Aún no hay ' + titulo.toLowerCase()"
                    (create)="abrir(null)" (action)="onAction($event.action, $event.row)"></app-data-table>

    <app-modal *ngIf="form as f" [title]="(f.id === null ? 'Agregar ' : 'Editar ') + cfg.singular.toLowerCase()" width="600px" (closed)="form = null">
      <form id="cat-form" class="nx-form" (ngSubmit)="guardar()" novalidate>
        <ng-container *ngFor="let c of cfg.campos">
          <label *ngIf="c.tipo === 'switch'; else campo" class="nx-check nx-check--plain">
            <input type="checkbox" [name]="c.key" [attr.name]="c.key" [(ngModel)]="f.v[c.key]">{{ c.label }}</label>
          <ng-template #campo>
            <label class="nx-field">{{ c.label }}{{ requerido(c, f.v) ? '*' : '' }}
              <select *ngIf="c.tipo === 'select'" class="nx-select" [name]="c.key" [attr.name]="c.key" [(ngModel)]="f.v[c.key]">
                <option value="">{{ requerido(c, f.v) ? 'Selecciona una opción' : '— Ninguno —' }}</option>
                <option *ngFor="let o of opciones(c)" [value]="o">{{ o }}</option>
              </select>
              <textarea *ngIf="c.tipo === 'textarea'" class="nx-textarea" rows="3" maxlength="500" [name]="c.key" [attr.name]="c.key" [(ngModel)]="f.v[c.key]"></textarea>
              <input *ngIf="c.tipo === 'texto' || c.tipo === 'numero' || c.tipo === 'fecha'" class="nx-input" [name]="c.key" [attr.name]="c.key"
                     [attr.inputmode]="c.tipo === 'numero' ? 'decimal' : null" [placeholder]="c.placeholder ?? (c.tipo === 'fecha' ? 'DD/MM/YYYY' : '')"
                     [(ngModel)]="f.v[c.key]" [class.is-invalid]="intento && errores[c.key]">
              <span *ngIf="c.ayuda" class="nx-hint">{{ c.ayuda }}</span>
              <span *ngIf="intento && errores[c.key]" class="nx-error">{{ errores[c.key] }}</span>
            </label>
          </ng-template>
        </ng-container>
      </form>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="form = null">Cancelar</button>
        <button type="submit" form="cat-form" class="nx-btn nx-btn--primary">Guardar</button>
      </ng-container>
    </app-modal>

    <app-modal *ngIf="borrar as b" [title]="'Eliminar ' + cfg.singular.toLowerCase()" width="460px" (closed)="borrar = null">
      <p class="nx-mt-0">Se eliminará “{{ etiqueta(b) }}”.</p>
      <ng-container modal-footer>
        <button type="button" class="nx-btn nx-btn--outline" (click)="borrar = null">Cancelar</button>
        <button type="button" class="nx-btn nx-btn--danger-solid" (click)="confirmarBorrar()">Eliminar</button>
      </ng-container>
    </app-modal>
  `
})
export class CatalogoComponent implements OnDestroy {
  readonly cfg: CatalogoConfig;
  readonly titulo: string;
  readonly crumbs: string[];
  readonly actions: RowAction[] = ['editar', 'eliminar'];
  cols: Column[] = [];
  rows: Row[] = [];
  form: { id: number | null; v: Record<string, Valor> } | null = null;
  borrar: FilaCatalogo | null = null;
  intento = false;
  errores: Record<string, string> = {};
  private filas: FilaCatalogo[] = [];
  private fuentes: Record<string, string[]> = {};
  private sub: Subscription;

  constructor(route: ActivatedRoute, private gen: GenericosService, data: HrDataService, items: ItemsService, private ui: UiStateService) {
    this.cfg = CATALOGOS[route.snapshot.data['catalogo']];
    this.titulo = route.snapshot.data['title'] ?? '';
    this.crumbs = route.snapshot.data['crumbs'] ?? [];
    this.cols = [
      ...this.cfg.campos.filter((c) => !c.soloFormulario).map((c): Column => ({
        key: c.key, label: c.label, w: c.ancho ?? (c.tipo === 'switch' || c.tipo === 'numero' ? 'minmax(100px, 0.6fr)' : 'minmax(140px, 1fr)'),
        type: c.tipo === 'switch' ? 'badge' : c.tipo === 'fecha' ? 'date' : c.tipo === 'numero' ? 'number' : 'text',
        filter: c.tipo === 'select' || c.tipo === 'switch' ? 'select' : c.tipo === 'numero' ? 'none' : 'text',
      })),
      { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '110px' },
    ];
    this.sub = combineLatest([gen.filas$(this.cfg), data.colaboradores(), data.cargos(), items.tipos$]).subscribe(([fs, cs, cargos, tipos]) => {
      this.fuentes = {
        colaboradores: cs.map((c) => `${c.apellidos}, ${c.nombres}`),
        areas: [...new Set(cs.map((c) => c.area))].sort(),
        cargos: cargos.map((c) => c.nombre),
        items: tipos.filter((t) => t.activo).map((t) => `${t.codigo} · ${t.nombre}`),
      };
      this.filas = fs;
      this.rows = fs.map((f) => {
        const r: Row = { id: f.id, x: '' };
        for (const c of this.cfg.campos) {
          const v = f[c.key];
          r[c.key] = c.tipo === 'switch' ? (v ? { text: c.etiquetas?.[0] ?? 'Activo', tone: 'success' } : { text: c.etiquetas?.[1] ?? 'Inactivo', tone: 'gray' })
            : v === '' || v === undefined ? '—' : String(v);
        }
        return r;
      });
    });
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  opciones(c: CampoCatalogo): string[] {
    if (Array.isArray(c.opciones)) return c.opciones;
    if (!c.opciones) return [];
    if (c.opciones.startsWith('catalogo:')) {
      const otro = CATALOGOS[c.opciones.slice(9)];
      const k1 = otro.campos[0].key, k2 = otro.campos[1]?.key;
      return this.gen.filas(otro).filter((f) => f['activo'] !== false).map((f) => (k2 && otro.campos[1].tipo === 'texto' ? `${f[k1]} · ${f[k2]}` : String(f[k1])));
    }
    return this.fuentes[c.opciones] ?? [];
  }

  requerido(c: CampoCatalogo, v: Record<string, Valor>): boolean {
    return !!c.obligatorio || (!!c.requeridoSi && String(v[c.requeridoSi.campo]) === c.requeridoSi.valor);
  }
  genero(raiz: string): string { return raiz + (this.cfg.femenino ? 'a' : 'o'); }
  etiqueta(f: FilaCatalogo | Record<string, Valor>): string { return String(f[this.cfg.campos[0].key] ?? ''); }

  abrir(f: FilaCatalogo | null): void {
    this.intento = false;
    this.errores = {};
    const v: Record<string, Valor> = {};
    for (const c of this.cfg.campos) v[c.key] = f ? f[c.key] ?? (c.tipo === 'switch' ? false : '') : c.tipo === 'switch' ? true : '';
    this.form = { id: f?.id ?? null, v };
  }

  private validar(): Record<string, string> {
    const f = this.form!, e: Record<string, string> = {};
    for (const c of this.cfg.campos) {
      if (c.tipo === 'switch') continue;
      const s = String(f.v[c.key] ?? '').trim();
      if (!s) { if (this.requerido(c, f.v)) e[c.key] = 'Campo obligatorio.'; continue; }
      if (c.tipo === 'numero') {
        const n = Number(s.replace(',', '.'));
        if (!Number.isFinite(n)) e[c.key] = 'Ingresa un número.';
        else if (c.min !== undefined && n < c.min) e[c.key] = `Mínimo ${c.min}.`;
        else if (c.max !== undefined && n > c.max) e[c.key] = `Máximo ${c.max}.`;
      }
      if (c.tipo === 'fecha' && !parseFecha(s)) e[c.key] = 'Usa el formato DD/MM/YYYY.';
      if (!e[c.key] && c.patron && !new RegExp(c.patron.re).test(s)) e[c.key] = c.patron.msg;
      if (!e[c.key] && c.unico && this.filas.some((x) => x.id !== f.id && String(x[c.key]).trim().toLowerCase() === s.toLowerCase())) {
        e[c.key] = `Ya existe un registro con ese ${c.label === c.label.toUpperCase() ? c.label : c.label.toLowerCase()}.`;
      }
    }
    return e;
  }

  guardar(): void {
    this.intento = true;
    const f = this.form;
    if (!f) return;
    this.errores = this.validar();
    if (Object.keys(this.errores).length) return;
    const limpio: Record<string, Valor> = {};
    for (const c of this.cfg.campos) {
      const v = f.v[c.key];
      limpio[c.key] = c.tipo === 'switch' ? !!v : c.tipo === 'numero' && String(v).trim() !== '' ? Number(String(v).replace(',', '.')) : String(v ?? '').trim();
    }
    const fila = this.gen.guardar(this.cfg, f.id === null ? limpio : { id: f.id, ...limpio }, this.etiqueta(limpio));
    this.form = null;
    this.ui.toast(`${this.cfg.singular} “${this.etiqueta(fila)}” ${this.genero(f.id === null ? 'agregad' : 'actualizad')}`);
  }

  onAction(action: RowAction, row: Row): void {
    const f = this.filas.find((x) => x.id === row.id);
    if (!f) return;
    if (action === 'editar') { this.abrir(f); return; }
    if (action !== 'eliminar') return;
    const ref = (this.cfg.referenciadoPor ?? []).find((r) => {
      const otro = CATALOGOS[r.clave];
      return this.gen.filas(otro).some((x) => String(x[r.campo]).split(' · ')[0] === String(f[this.cfg.campos[0].key]));
    });
    if (ref) { this.ui.toast(`No se puede eliminar: se usa en ${CATALOGOS[ref.clave].singular.toLowerCase()}. Desactívalo en su lugar`); return; }
    this.borrar = f;
  }

  confirmarBorrar(): void {
    const b = this.borrar;
    if (!b) return;
    this.gen.eliminar(this.cfg, b, this.etiqueta(b));
    this.borrar = null;
    this.ui.toast(`${this.cfg.singular} “${this.etiqueta(b)}” ${this.genero('eliminad')}`);
  }
}
