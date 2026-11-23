import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { aIso, ControlAsistenciaService, deIso } from '../../core/control-asistencia.service';
import { Recinto } from '../../core/sample/control-asistencia';

/**
 * P-04.0 · Standard header of Control de Asistencia: recinto selector (all recintos or one), date (today by default)
 * and optional quick filters. The values live in the service, so they carry over between screens of the module.
 */
@Component({
  selector: 'app-ca-filtros',
  template: `
    <div class="nx-card nx-cafil" role="search" aria-label="Filtros de Control de Asistencia">
      <label *ngIf="recinto" class="nx-cafil__f nx-cafil__f--wide">Recinto
        <select class="nx-select nx-select--sm" name="ca-recinto" [attr.name]="'ca-recinto'" [ngModel]="f.recintoId" (ngModelChange)="ca.setFiltro({ recintoId: +$event })">
          <option [ngValue]="0">Todos los recintos</option>
          <option *ngFor="let r of recintos" [ngValue]="r.id">{{ r.nombre }}{{ r.activo ? '' : ' (inactivo)' }}</option>
        </select>
      </label>
      <label *ngIf="fecha" class="nx-cafil__f">Fecha
        <input type="date" class="nx-input nx-input--sm" name="ca-fecha" [attr.name]="'ca-fecha'" [min]="minIso" [max]="maxIso" [ngModel]="iso" (ngModelChange)="setFecha($event)">
      </label>
      <button *ngIf="fecha && f.fecha !== ca.corte" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="ca.setFiltro({ fecha: ca.corte })">Hoy</button>
      <ng-container *ngIf="rapidos">
        <label class="nx-cafil__f">Área
          <select class="nx-select nx-select--sm" name="ca-area" [attr.name]="'ca-area'" [ngModel]="f.area" (ngModelChange)="ca.setFiltro({ area: $event })">
            <option value="">Todas</option><option *ngFor="let x of areas">{{ x }}</option></select></label>
        <label class="nx-cafil__f">Cargo
          <select class="nx-select nx-select--sm" name="ca-cargo" [attr.name]="'ca-cargo'" [ngModel]="f.cargo" (ngModelChange)="ca.setFiltro({ cargo: $event })">
            <option value="">Todos</option><option *ngFor="let x of cargos">{{ x }}</option></select></label>
        <label class="nx-cafil__f">Tipo de contrato
          <select class="nx-select nx-select--sm" name="ca-contrato" [attr.name]="'ca-contrato'" [ngModel]="f.contrato" (ngModelChange)="ca.setFiltro({ contrato: $event })">
            <option value="">Todos</option><option *ngFor="let x of contratos">{{ x }}</option></select></label>
        <label class="nx-cafil__f">Supervisor
          <select class="nx-select nx-select--sm" name="ca-supervisor" [attr.name]="'ca-supervisor'" [ngModel]="f.supervisor" (ngModelChange)="ca.setFiltro({ supervisor: $event })">
            <option value="">Todos</option><option *ngFor="let x of supervisores">{{ x }}</option></select></label>
        <button *ngIf="f.area || f.cargo || f.contrato || f.supervisor" type="button" class="nx-link-btn" (click)="limpiar()">Limpiar filtros</button>
      </ng-container>
      <span class="nx-grow"></span>
      <span class="nx-small nx-muted">{{ cuantos }} colaboradores</span>
    </div>
  `
})
export class CaFiltrosComponent implements OnDestroy {
  @Input() recinto = true;
  @Input() fecha = true;
  @Input() rapidos = true;
  recintos: Recinto[] = [];
  areas: string[] = [];
  cargos: string[] = [];
  contratos: string[] = [];
  supervisores: string[] = [];
  readonly minIso: string;
  readonly maxIso: string;
  private sub = new Subscription();

  constructor(public ca: ControlAsistenciaService) {
    this.minIso = aIso(ca.inicio);
    this.maxIso = aIso(ca.corte);
    this.sub.add(ca.recintos$.subscribe((rs) => (this.recintos = rs)));
    this.sub.add(ca.cambios$.subscribe(() => {
      const cs = ca.colaboradores;
      const uniq = (xs: string[]) => [...new Set(xs.filter((x) => x && x !== '—'))].sort((a, b) => a.localeCompare(b));
      this.areas = uniq(cs.map((c) => c.area));
      this.cargos = uniq(cs.map((c) => c.cargo));
      this.contratos = uniq(cs.map((c) => ca.contrato(c.id)));
      this.supervisores = uniq(cs.map((c) => ca.supervisor(c.id)));
    }));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get f() { return this.ca.filtro; }
  get cuantos(): number { return this.recinto ? this.ca.visibles().length : this.ca.visibles(this.ca.filtro, 0).length; }
  get iso(): string { return aIso(this.f.fecha); }
  setFecha(v: string): void { if (v && v >= this.minIso && v <= this.maxIso) this.ca.setFiltro({ fecha: deIso(v) }); }
  limpiar(): void { this.ca.setFiltro({ area: '', cargo: '', contrato: '', supervisor: '' }); }
}

export interface PuntoMapa { lat: number; lng: number; color: string; label: string; }

/**
 * Schematic map (no external tiles): recintos with their attendance radius and the punches of the day. In edit mode a
 * click moves the pin of the first recinto.
 */
@Component({
  selector: 'app-ca-mapa',
  template: `
    <svg #svg class="nx-camap" [class.is-edit]="editable" [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="etiqueta" (click)="click($event)">
      <defs><pattern id="nx-camap-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" class="nx-camap__grid"/></pattern></defs>
      <rect [attr.width]="W" [attr.height]="H" fill="url(#nx-camap-grid)"/>
      <g *ngFor="let r of vista">
        <circle [attr.cx]="r.x" [attr.cy]="r.y" [attr.r]="r.rr" class="nx-camap__radio" [class.is-off]="!r.activo"/>
        <path [attr.d]="pin(r.x, r.y)" class="nx-camap__pin" [class.is-off]="!r.activo"/>
        <text [attr.x]="r.x + 14" [attr.y]="r.y - 8" class="nx-camap__label">{{ r.nombre }}</text>
      </g>
      <circle *ngFor="let p of pts" [attr.cx]="p.x" [attr.cy]="p.y" r="5" [style.fill]="p.color" class="nx-camap__dot"><title>{{ p.label }}</title></circle>
    </svg>
  `
})
export class CaMapaComponent implements OnChanges {
  @Input() recintos: Recinto[] = [];
  @Input() puntos: PuntoMapa[] = [];
  @Input() editable = false;
  @Input() etiqueta = 'Mapa de recintos';
  @Input() alto = 300;
  @Output() mover = new EventEmitter<{ lat: number; lng: number }>();
  @ViewChild('svg') svg?: ElementRef<SVGSVGElement>;
  readonly W = 640;
  H = 300;
  vista: (Recinto & { x: number; y: number; rr: number })[] = [];
  pts: (PuntoMapa & { x: number; y: number })[] = [];
  private box = { lat0: 0, lng0: 0, k: 1, ox: 0, oy: 0 };
  private fijado = false;

  ngOnChanges(): void {
    this.H = this.alto;
    const g = (m: number) => m / 111_000;
    const ext = [
      ...this.recintos.flatMap((r) => [[r.lat - g(r.radio) * 1.6, r.lng - g(r.radio) * 1.6], [r.lat + g(r.radio) * 1.6, r.lng + g(r.radio) * 1.6]]),
      ...this.puntos.map((p) => [p.lat, p.lng]),
    ];
    if (!ext.length) { this.vista = []; this.pts = []; return; }
    if (!(this.editable && this.fijado)) this.encuadrar(ext);
    this.fijado = this.editable;
    const b = this.box;
    const xy = (lat: number, lng: number) => ({ x: b.ox + (lng - b.lng0) * b.k, y: b.oy + (b.lat0 - lat) * b.k });
    this.vista = this.recintos.map((r) => ({ ...r, ...xy(r.lat, r.lng), rr: Math.max(8, g(r.radio) * b.k) }));
    this.pts = this.puntos.map((p) => ({ ...p, ...xy(p.lat, p.lng) }));
  }

  /** Fits the view to the recintos and punches (kept fixed while editing, so the pin moves under the cursor). */
  private encuadrar(ext: number[][]): void {
    const lats = ext.map((e) => e[0]), lngs = ext.map((e) => e[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 40;
    const k = Math.min((this.W - pad * 2) / Math.max(maxLng - minLng, 1e-5), (this.H - pad * 2) / Math.max(maxLat - minLat, 1e-5));
    const ox = (this.W - (maxLng - minLng) * k) / 2, oy = (this.H - (maxLat - minLat) * k) / 2;
    this.box = { lat0: maxLat, lng0: minLng, k, ox, oy };
  }

  pin(x: number, y: number): string { return `M${x} ${y}c-6-7-10-11-10-16a10 10 0 0 1 20 0c0 5-4 9-10 16z`; }

  click(ev: MouseEvent): void {
    if (!this.editable || !this.svg) return;
    const rect = this.svg.nativeElement.getBoundingClientRect();
    const sx = this.W / rect.width, sy = this.H / rect.height;
    const x = (ev.clientX - rect.left) * sx, y = (ev.clientY - rect.top) * sy;
    const b = this.box;
    const lat = Math.round((b.lat0 - (y - b.oy) / b.k) * 1e6) / 1e6, lng = Math.round((b.lng0 + (x - b.ox) / b.k) * 1e6) / 1e6;
    this.mover.emit({ lat, lng });
  }
}
