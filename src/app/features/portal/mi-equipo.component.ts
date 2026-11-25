import { Component, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AsistenciaService, seCruzan } from '../../core/asistencia.service';
import { iniciales, parseFecha } from '../../core/format';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador } from '../../core/models';
import { emailDe, PortalService } from '../../core/portal.service';

interface Miembro { c: Colaborador; ini: string; rol: 'Jefatura' | 'Compañero(a)' | 'A tu cargo' | 'Tú'; estado: string; tone: string; email: string; anexo: string; }
interface Ausencia { c: Colaborador; detalle: string; desde: string; hasta: string; }

/**
 * Mi Portal › Mi Equipo: the collaborator's manager, peers and direct reports, who is out today and the team's
 * absences coming up (from Asistencia).
 */
@Component({
  selector: 'app-mi-equipo',
  template: `
    <app-page-header title="Mi Equipo" [crumbs]="['Mi Portal']"></app-page-header>
    <div class="nx-grid nx-grid--4 nx-mb-16">
      <div class="nx-card nx-stat"><span>Personas en tu equipo</span><b>{{ miembros.length }}</b></div>
      <div class="nx-card nx-stat"><span>Disponibles al {{ asis.corte }}</span><b>{{ disponibles }}</b></div>
      <div class="nx-card nx-stat"><span>Ausentes al {{ asis.corte }}</span><b>{{ miembros.length - disponibles }}</b></div>
      <div class="nx-card nx-stat"><span>Ausencias en los próximos 30 días</span><b>{{ proximas.length }}</b></div>
    </div>
    <div class="nx-portal">
      <div class="nx-portal__main">
        <h2 class="nx-section__title">{{ area }}</h2>
        <div class="nx-dir">
          <div *ngFor="let m of miembros" class="nx-card nx-dir__card nx-team__card" [class.is-me]="m.rol === 'Tú'">
            <span class="nx-avatar nx-avatar--52">{{ m.ini }}</span>
            <span class="nx-dir__text">
              <b>{{ m.c.nombres }} {{ m.c.apellidos.split(' ')[0] }}<span class="nx-badge nx-badge--sm nx-tone-gray">{{ m.rol }}</span></b>
              <span>{{ m.c.cargo }}</span>
              <span class="nx-badge nx-badge--sm nx-team__estado" [ngClass]="'nx-tone-' + m.tone">{{ m.estado }}</span>
              <span class="nx-small"><a [href]="'mailto:' + m.email">{{ m.email }}</a> · anexo {{ m.anexo }}</span>
            </span>
          </div>
        </div>
      </div>
      <aside class="nx-portal__side">
        <section class="nx-card nx-pad">
          <h2 class="nx-section__title">Próximas ausencias</h2>
          <ul class="nx-cal__list">
            <li *ngFor="let a of proximas">
              <span class="nx-cal__dot" [class.is-goce]="a.detalle !== 'Vacaciones'"></span>
              <span class="nx-grow"><b>{{ a.c.nombres }} {{ a.c.apellidos.split(' ')[0] }}</b>
                <span class="nx-hint">{{ a.detalle }} · {{ a.desde }} al {{ a.hasta }}</span></span>
            </li>
          </ul>
          <p *ngIf="!proximas.length" class="nx-muted nx-small nx-mb-0">Nadie del equipo tiene ausencias programadas en los próximos 30 días.</p>
          <a class="nx-btn nx-btn--outline nx-btn--sm nx-mt-12" routerLink="/portal/organigrama" [queryParams]="{ id: portal.yoId }">
            <app-icon name="sitemap" [size]="15"></app-icon>Ver en organigrama</a>
        </section>
      </aside>
    </div>
  `
})
export class MiEquipoComponent implements OnDestroy {
  miembros: Miembro[] = [];
  proximas: Ausencia[] = [];
  area = '';
  private sub: Subscription;

  constructor(data: HrDataService, public asis: AsistenciaService, public portal: PortalService) {
    this.sub = combineLatest([data.colaboradores(), asis.vacaciones$, asis.ausencias$]).subscribe(([cs]) => this.armar(cs));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get disponibles(): number { return this.miembros.filter((m) => m.tone === 'success').length; }

  /** Today's state from vacations and absences in Asistencia. */
  private estado(id: number): { estado: string; tone: string } {
    const hoy = this.asis.corte;
    const v = this.asis.vacaciones$.value.find((x) => x.colaboradorId === id && seCruzan(hoy, hoy, x.desde, x.hasta));
    if (v) return { estado: `De vacaciones hasta el ${v.hasta}`, tone: 'info' };
    const a = this.asis.ausencias$.value.find((x) => x.colaboradorId === id && seCruzan(hoy, hoy, x.desde, x.hasta));
    return a ? { estado: `${a.tipo} hasta el ${a.hasta}`, tone: 'warning' } : { estado: 'Disponible', tone: 'success' };
  }

  private armar(cs: Colaborador[]): void {
    const yo = cs.find((c) => c.id === this.portal.yoId);
    if (!yo) return;
    const jefeId = this.portal.jefes[yo.id];
    const ids: [number, Miembro['rol']][] = [
      ...(jefeId != null ? [[jefeId, 'Jefatura'] as [number, Miembro['rol']]] : []),
      [yo.id, 'Tú'],
      ...(jefeId != null ? this.portal.reportes(jefeId).filter((id) => id !== yo.id).map((id) => [id, 'Compañero(a)'] as [number, Miembro['rol']]) : []),
      ...this.portal.reportes(yo.id).map((id) => [id, 'A tu cargo'] as [number, Miembro['rol']]),
    ];
    this.area = `Equipo de ${cs.find((c) => c.id === jefeId)?.nombres ?? yo.nombres} · ${yo.area}`;
    this.miembros = ids.map(([id, rol]) => cs.find((c) => c.id === id) && { id, rol }).filter((x): x is { id: number; rol: Miembro['rol'] } => !!x)
      .map(({ id, rol }) => {
        const c = cs.find((x) => x.id === id)!;
        return { c, rol, ini: iniciales(c.nombres, c.apellidos), email: emailDe(c), anexo: c.contacto?.anexo || '—', ...this.estado(c.id) };
      });
    const corte = parseFecha(this.asis.corte)!, fin = new Date(corte.getTime() + 30 * 86_400_000);
    const enEquipo = new Set(this.miembros.map((m) => m.c.id));
    const futuro = (desde: string) => { const d = parseFecha(desde)!; return d > corte && d <= fin; };
    this.proximas = [
      ...this.asis.vacaciones$.value.filter((v) => enEquipo.has(v.colaboradorId) && futuro(v.desde))
        .map((v) => ({ c: cs.find((x) => x.id === v.colaboradorId)!, detalle: 'Vacaciones', desde: v.desde, hasta: v.hasta })),
      ...this.asis.ausencias$.value.filter((a) => enEquipo.has(a.colaboradorId) && futuro(a.desde))
        .map((a) => ({ c: cs.find((x) => x.id === a.colaboradorId)!, detalle: a.tipo, desde: a.desde, hasta: a.hasta })),
    ].sort((a, b) => parseFecha(a.desde)!.getTime() - parseFecha(b.desde)!.getTime());
  }
}
