import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { Subject, Subscription, debounceTime, switchMap, timer } from 'rxjs';
import { ConsolaService, PlanConsola, Trabajo, errorConsola, soles } from './consola.service';

type EstadoSlug = 'vacio' | 'verificando' | 'available' | 'taken' | 'reserved' | 'invalid';

/** P-SA.3 "Crear tenant" wizard: customer, domain (live slug), plan and modules, initial admin, options → provisioning. */
@Component({
  selector: 'app-consola-tenant-nuevo',
  template: `
    <div class="cx-cab">
      <div><span class="cx-ruta">Consola › Tenants › Crear tenant</span><h1>Crear tenant</h1>
        <p class="nx-muted nx-mt-0">Aprovisiona un cliente nuevo en el catálogo y su base de datos de negocio</p></div>
    </div>

    <ol *ngIf="!trabajo" class="cx-pasos">
      <li *ngFor="let s of pasos; let i = index" [class.is-on]="paso === i" [class.is-ok]="paso > i"><span>{{ paso > i ? '✓' : i + 1 }}</span>{{ s }}</li>
    </ol>

    <section *ngIf="!trabajo" class="nx-card nx-settings cx-wizard">
      <!-- 1. Datos del cliente -->
      <ng-container *ngIf="paso === 0">
        <h2 class="nx-section__title nx-mt-0">Datos del cliente</h2>
        <p class="nx-muted nx-mt-0">Información legal y comercial del nuevo tenant.</p>
        <div class="nx-form-grid">
          <label class="nx-field">Razón social *<input class="nx-input" [(ngModel)]="d.razonSocial" maxlength="160" (ngModelChange)="sugerirSlug()"></label>
          <label class="nx-field">RUC *<input class="nx-input" [(ngModel)]="d.ruc" maxlength="11" inputmode="numeric"></label>
          <label class="nx-field">Nombre comercial (se muestra en la app)<input class="nx-input" [(ngModel)]="d.nombre" maxlength="120"></label>
          <label class="nx-field">Industria<select class="nx-select" [(ngModel)]="d.industria"><option value="">—</option><option *ngFor="let x of industrias">{{ x }}</option></select></label>
          <label class="nx-field">Ejecutivo de cuenta<input class="nx-input" [(ngModel)]="d.ejecutivo" maxlength="120" list="cx-ejecutivos"></label>
          <label class="nx-field">Correo de facturación<input class="nx-input" type="email" [(ngModel)]="d.correoFacturacion"></label>
        </div>
        <datalist id="cx-ejecutivos"><option *ngFor="let x of ejecutivos" [value]="x"></option></datalist>
        <p *ngIf="intento && !paso1Ok" class="nx-error">Completa la razón social y un RUC de 11 dígitos que empiece con 10 o 20.</p>
      </ng-container>

      <!-- 2. Dominio -->
      <ng-container *ngIf="paso === 1">
        <h2 class="nx-section__title nx-mt-0">Dominio</h2>
        <p class="nx-muted nx-mt-0">El slug define la URL del tenant. Solo minúsculas, números y guiones (3 a 30 caracteres). No se puede cambiar después sin migración de dominio.</p>
        <label class="nx-field">Slug *
          <span class="cx-slug"><input class="nx-input" [(ngModel)]="d.slug" (ngModelChange)="slugManual($event)" maxlength="30" autocomplete="off"><span>.{{ dominio }}</span></span>
        </label>
        <span class="cx-slug__estado" [class]="'is-' + estadoSlug" role="status">{{ textoSlug }}</span>
        <div class="cx-url"><span class="nx-muted">Vista previa de la URL</span><b>{{ protocolo }}//{{ d.slug || 'tuempresa' }}.{{ dominio }}{{ puerto }}</b></div>
        <p class="nx-hint">Los dominios propios (p. ej. rrhh.cliente.pe) se agregan después en el detalle del tenant › Dominios.</p>
      </ng-container>

      <!-- 3. Plan y módulos -->
      <ng-container *ngIf="paso === 2">
        <h2 class="nx-section__title nx-mt-0">Plan y módulos</h2>
        <p class="nx-muted nx-mt-0">Los módulos incluidos en el plan vienen marcados; los adicionales se facturan aparte.</p>
        <div class="cx-planes-sel">
          <button *ngFor="let p of planes" type="button" class="cx-plan-sel" [class.is-on]="d.plan === p.codigo" (click)="elegirPlan(p)">
            <b>{{ p.nombre }}</b><span>{{ soles(p.precioPorColaborador) }} / colab. / mes</span></button>
        </div>
        <h3 class="nx-settings__title">Módulos contratados</h3>
        <div class="cx-modulos-sel" *ngIf="planElegido as pl">
          <label *ngFor="let m of pl.modulos" class="nx-check" [class.is-disabled]="m.incluido">
            <input type="checkbox" [checked]="m.incluido || modulos.has(m.codigo)" [disabled]="m.incluido" (change)="alternar(m.codigo)">
            {{ m.nombre }} <small class="nx-muted">{{ m.incluido ? 'Incluido' : '+ ' + soles(m.precioAdicional) }}</small>
          </label>
        </div>
        <div class="nx-form-grid nx-mt-16">
          <label class="nx-field">Precio del plan por colaborador (S/) *<input class="nx-input" type="number" min="0.01" step="0.1" [(ngModel)]="d.precioPorColaborador"></label>
          <label class="nx-field">Fin del trial<input class="nx-input" type="date" [(ngModel)]="d.trialHasta"><span class="nx-hint">Vacío = activo desde hoy.</span></label>
          <div class="nx-field"><span>Precio total estimado</span><b>{{ soles(total) }} por colaborador / mes</b></div>
        </div>
        <p *ngIf="intento && !paso3Ok" class="nx-error">Elige un plan, al menos un módulo y un precio mayor que cero.</p>
      </ng-container>

      <!-- 4. Administrador inicial -->
      <ng-container *ngIf="paso === 3">
        <h2 class="nx-section__title nx-mt-0">Administrador inicial</h2>
        <p class="nx-muted nx-mt-0">Recibirá la invitación para activar su cuenta y configurar la empresa.</p>
        <div class="nx-form-grid">
          <label class="nx-field">Nombres *<input class="nx-input" [(ngModel)]="d.admin.nombres"></label>
          <label class="nx-field">Apellidos *<input class="nx-input" [(ngModel)]="d.admin.apellidos"></label>
          <label class="nx-field">Correo *<input class="nx-input" type="email" [(ngModel)]="d.admin.correo"></label>
          <label class="nx-field">Cargo<input class="nx-input" [(ngModel)]="d.admin.cargo"></label>
          <label class="nx-field">Celular<input class="nx-input" [(ngModel)]="d.admin.celular"></label>
        </div>
        <p *ngIf="intento && !paso4Ok" class="nx-error">Ingresa nombres, apellidos y un correo válido.</p>
        <p class="nx-hint">La invitación vence en 72 horas y se puede reenviar desde Usuarios en la app del cliente.</p>
      </ng-container>

      <!-- 5. Opciones y resumen -->
      <ng-container *ngIf="paso === 4">
        <h2 class="nx-section__title nx-mt-0">Opciones y resumen</h2>
        <p class="nx-muted nx-mt-0">Revisa antes de crear. El aprovisionamiento toma unos segundos.</p>
        <label class="nx-check"><input type="checkbox" [(ngModel)]="d.opciones.datosEjemplo"> Cargar datos de ejemplo <small class="nx-muted">(colaboradores, áreas y una planilla de prueba)</small></label>
        <label class="nx-check" [class.is-disabled]="d.plan !== 'ENTERPRISE'"><input type="checkbox" [(ngModel)]="d.opciones.bdDedicada" [disabled]="d.plan !== 'ENTERPRISE'"> Base de datos dedicada <small class="nx-muted">(solo Enterprise)</small></label>
        <dl class="cx-resumen">
          <dt>Cliente</dt><dd>{{ d.razonSocial }} · RUC {{ d.ruc }}</dd>
          <dt>URL</dt><dd>{{ d.slug }}.{{ dominio }}</dd>
          <dt>Plan</dt><dd>{{ planElegido?.nombre }} · {{ soles(total) }} por colaborador / mes</dd>
          <dt>Módulos adicionales</dt><dd>{{ nombresModulos || 'Ninguno' }}</dd>
          <dt>Estado</dt><dd>{{ d.trialHasta ? 'Trial hasta ' + (d.trialHasta | date: 'dd/MM/yyyy') : 'Activo' }}</dd>
          <dt>Administrador</dt><dd>{{ d.admin.nombres }} {{ d.admin.apellidos }} · {{ d.admin.correo }}</dd>
        </dl>
      </ng-container>

      <span *ngIf="error" class="nx-error" role="alert">{{ error }}</span>
      <div class="nx-settings__foot">
        <a *ngIf="paso === 0" class="nx-btn nx-btn--outline" routerLink="/consola/tenants">Cancelar</a>
        <button *ngIf="paso > 0" type="button" class="nx-btn nx-btn--outline" (click)="paso = paso - 1; error = ''">Atrás</button>
        <button *ngIf="paso < 4" type="button" class="nx-btn nx-btn--primary" (click)="siguiente()">Siguiente</button>
        <button *ngIf="paso === 4" type="button" class="nx-btn nx-btn--primary" [disabled]="enviando" (click)="crear()">{{ enviando ? 'Creando…' : 'Crear tenant' }}</button>
      </div>
    </section>

    <!-- Aprovisionamiento -->
    <section *ngIf="trabajo as t" class="nx-card nx-settings cx-wizard" aria-live="polite">
      <h2 class="nx-section__title nx-mt-0">{{ t.estado === 'succeeded' ? 'Tenant creado' : t.estado === 'failed' ? 'El aprovisionamiento falló' : 'Aprovisionando ' + d.slug + '…' }}</h2>
      <div class="nx-limite__barra nx-mb-16" [class.is-mal]="t.estado === 'failed'"><span [style.width.%]="t.progreso"></span></div>
      <ul class="cx-tareas">
        <li *ngFor="let s of t.pasos" [class]="'is-' + s.estado">
          <span class="cx-tareas__icono">{{ s.estado === 'succeeded' ? '✓' : s.estado === 'failed' ? '!' : s.estado === 'running' ? '…' : '' }}</span>
          <span class="nx-grow">{{ s.titulo }}<small *ngIf="s.error" class="nx-error"><br>{{ s.error }}</small></span>
        </li>
      </ul>
      <div class="nx-settings__foot">
        <button *ngIf="t.estado === 'failed'" type="button" class="nx-btn nx-btn--outline" (click)="trabajo = null; paso = 4">Revisar y reintentar</button>
        <a *ngIf="t.estado === 'succeeded' && t.tenantId" class="nx-btn nx-btn--primary" [routerLink]="['/consola/tenants', t.tenantId]">Ver tenant</a>
      </div>
    </section>
  `
})
export class ConsolaTenantNuevoComponent implements OnDestroy {
  readonly pasos = ['Datos del cliente', 'Dominio', 'Plan y módulos', 'Administrador inicial', 'Opciones y resumen'];
  readonly industrias = ['Transporte y logística', 'Retail', 'Salud', 'Minería', 'Agroindustria', 'Educación', 'Manufactura', 'Servicios'];
  readonly soles = soles;
  readonly dominio = location.hostname.replace(/^admin\./, '');
  readonly protocolo = location.protocol;
  readonly puerto = location.port ? ':' + location.port : '';
  readonly slug$ = new Subject<string>();
  paso = 0;
  intento = false;
  enviando = false;
  error = '';
  planes: PlanConsola[] = [];
  ejecutivos: string[] = [];
  modulos = new Set<string>();
  estadoSlug: EstadoSlug = 'vacio';
  trabajo: Trabajo | null = null;
  private slugTocado = false;
  private readonly subs = new Subscription();
  d = {
    razonSocial: '', ruc: '', nombre: '', industria: '', ejecutivo: '', correoFacturacion: '', slug: '', plan: 'PRO', precioPorColaborador: 0,
    trialHasta: '', admin: { nombres: '', apellidos: '', correo: '', cargo: '', celular: '' }, opciones: { datosEjemplo: false, bdDedicada: false },
  };

  constructor(private c: ConsolaService) {
    c.get<PlanConsola[]>('plans').subscribe((p) => { this.planes = p; const pro = p.find((x) => x.codigo === 'PRO') ?? p[0]; if (pro) this.elegirPlan(pro); });
    c.get<{ ejecutivos: string[] }>('tenants', { pageSize: 1 }).subscribe((r) => this.ejecutivos = r.ejecutivos);
    this.subs.add(this.slug$.pipe(debounceTime(300), switchMap((s) => { this.estadoSlug = s ? 'verificando' : 'vacio'; return c.get<{ status: EstadoSlug }>('slug-availability', { slug: s || '-' }); }))
      .subscribe({ next: (r) => { if (this.d.slug) this.estadoSlug = r.status; } }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  get planElegido(): PlanConsola | undefined { return this.planes.find((p) => p.codigo === this.d.plan); }
  get total(): number {
    const p = this.planElegido;
    return (+this.d.precioPorColaborador || 0) + (p?.modulos.filter((m) => !m.incluido && this.modulos.has(m.codigo)).reduce((a, m) => a + m.precioAdicional, 0) ?? 0);
  }
  get nombresModulos(): string { return (this.planElegido?.modulos ?? []).filter((m) => !m.incluido && this.modulos.has(m.codigo)).map((m) => m.nombre).join(', '); }
  get textoSlug(): string {
    return ({ vacio: 'Escribe el slug.', verificando: 'Verificando disponibilidad…', available: '✓ Disponible', taken: 'Ya está en uso por otro tenant.',
      reserved: 'Está reservado por la plataforma.', invalid: 'Usa 3 a 30 caracteres: minúsculas, números y guiones (sin guion al inicio ni al final).' } as Record<EstadoSlug, string>)[this.estadoSlug];
  }
  get paso1Ok(): boolean { return !!this.d.razonSocial.trim() && /^(10|20)\d{9}$/.test(this.d.ruc.trim()); }
  get paso3Ok(): boolean { return !!this.planElegido && +this.d.precioPorColaborador > 0 && (this.modulos.size > 0 || this.planElegido.modulos.some((m) => m.incluido)); }
  get paso4Ok(): boolean { const a = this.d.admin; return !!a.nombres.trim() && !!a.apellidos.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.correo.trim()); }

  sugerirSlug(): void {
    if (this.slugTocado) return;
    this.d.slug = this.d.razonSocial.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\b(s\.?a\.?c?\.?|e\.?i\.?r\.?l\.?|s\.?r\.?l\.?)\b/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 30);
    if (this.d.slug) this.slug$.next(this.d.slug);
  }
  /** Once the slug is typed by hand, the company name no longer suggests it. */
  slugManual(v: string): void { this.slugTocado = true; this.slug$.next(v); }
  elegirPlan(p: PlanConsola): void { this.d.plan = p.codigo; this.d.precioPorColaborador = p.precioPorColaborador; if (p.codigo !== 'ENTERPRISE') this.d.opciones.bdDedicada = false; }
  alternar(m: string): void { this.modulos.has(m) ? this.modulos.delete(m) : this.modulos.add(m); }

  siguiente(): void {
    this.intento = true;
    this.error = '';
    const ok = [this.paso1Ok, this.estadoSlug === 'available', this.paso3Ok, this.paso4Ok][this.paso];
    if (this.paso === 1 && !ok) { this.error = this.estadoSlug === 'verificando' ? 'Espera la verificación del slug.' : this.textoSlug; return; }
    if (!ok) return;
    this.intento = false;
    this.paso++;
  }

  crear(): void {
    this.enviando = true;
    this.error = '';
    const d = this.d;
    this.c.post<{ provisioningJobId: string }>('tenants', {
      razonSocial: d.razonSocial.trim(), ruc: d.ruc.trim(), nombre: d.nombre.trim() || null, industria: d.industria || null, ejecutivo: d.ejecutivo.trim() || null,
      correoFacturacion: d.correoFacturacion.trim() || null, slug: d.slug, plan: d.plan, modulos: [...this.modulos], precioPorColaborador: +d.precioPorColaborador,
      trialHasta: d.trialHasta || null, admin: d.admin, opciones: d.opciones,
    }).subscribe({
      next: (r) => this.seguir(r.provisioningJobId),
      error: (e: HttpErrorResponse) => {
        this.enviando = false;
        this.error = errorConsola(e);
        if (e.status === 409) { this.paso = 1; this.estadoSlug = 'taken'; }
      },
    });
  }

  /** Polls the job every 2 s until it succeeds or fails. */
  private seguir(id: string): void {
    const sub = timer(0, 2000).pipe(switchMap(() => this.c.get<Trabajo>(`provisioning/${id}`))).subscribe({
      next: (t) => { this.trabajo = t; if (t.estado !== 'running') { this.enviando = false; sub.unsubscribe(); } },
      error: (e) => { this.enviando = false; this.error = errorConsola(e); sub.unsubscribe(); },
    });
    this.subs.add(sub);
  }
}
