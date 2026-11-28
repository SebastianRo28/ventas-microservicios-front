import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { Colaborador } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { MarcaService } from '../../core/marca.service';
import { ContextoService } from '../../core/contexto.service';
import { PortalService } from '../../core/portal.service';
import { NAV_SECTIONS, NavItem, NavSection, findLeaf } from '../nav.config';

/** Rail (module switcher) + sidebar (module menu). */
@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html'
})
export class NavComponent implements OnDestroy {
  /** Sections and items the signed-in role may open (administrators also see the modules not contracted). */
  sections: NavSection[] = NAV_SECTIONS;
  /** Signed-in collaborator for the portal greeting. */
  yo: { iniciales: string; nombre: string; cargo: string } = { iniciales: '—', nombre: '', cargo: '' };
  current: NavSection = NAV_SECTIONS[1];
  /** Open groups, keyed by `${section}/${label}`. */
  open = new Set<string>();
  private sub: Subscription;
  private readonly subs = new Subscription();
  private cs: Colaborador[] = [];

  /** Live counters (pending surveys); other items keep the count from the nav config. */
  count(item: NavItem): number | undefined {
    if (item.path === 'portal/mis-encuestas') return this.portal.encuestasPendientes;
    // Only with Plataforma Pro: otherwise the evaluations are not requested (the API would answer 403).
    if (item.path === 'portal/mis-evaluaciones') return this.ctx.contexto?.modulos.includes('PRO') ? this.portal.evaluacionesPendientes : undefined;
    return item.count;
  }

  constructor(private router: Router, public data: HrDataService, private portal: PortalService, private auth: AuthService, public marcas: MarcaService,
    private ctx: ContextoService) {
    this.subs.add(auth.usuario$.subscribe(() => { this.filtrar(); this.sync(router.url); this.saludo(); }));
    this.subs.add(ctx.contexto$.subscribe(() => { this.filtrar(); this.sync(router.url); }));
    this.subs.add(data.colaboradores().subscribe((cs) => { this.cs = cs; this.saludo(); }));
    this.sync(router.url);
    this.sub = router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.sync(e.urlAfterRedirects));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); this.subs.unsubscribe(); }

  private filtrar(): void {
    if (this.auth.esAdmin) { this.sections = NAV_SECTIONS; return; }
    // Collaborators and supervisors do not see modules the company has not contracted (the locks are for admins).
    const ver = (i: NavItem, s: NavSection): NavItem | null => {
      if (i.locked || !this.ctx.modulo(i.modulo ?? s.modulo)) return null;
      if (i.children) { const ch = i.children.filter((c) => c.path && this.auth.puedeVer(c.path)); return ch.length ? { ...i, children: ch } : null; }
      return i.path && this.auth.puedeVer(i.path) ? i : null;
    };
    this.sections = NAV_SECTIONS.filter((s) => !s.locked && !s.external && this.ctx.modulo(s.modulo))
      .map((s) => ({ ...s, items: s.items.map((i) => ver(i, s)).filter((i): i is NavItem => !!i) }))
      .filter((s) => s.items.length);
    if (!this.sections.some((s) => s.id === this.current.id)) this.current = this.sections[0] ?? NAV_SECTIONS[0];
  }

  private saludo(): void {
    const u = this.auth.usuario;
    const c = this.cs.find((x) => x.id === u?.colaboradorId);
    this.yo = { iniciales: u?.iniciales ?? '—', nombre: c ? `${c.nombres.split(' ')[0]} ${c.apellidos.split(' ')[0]}` : u?.nombre ?? '', cargo: c?.cargo ?? u?.rol ?? '' };
  }

  /** Follow the route: select its module and expand its group. */
  private sync(url: string): void {
    const leaf = findLeaf(url);
    if (!leaf) return;
    this.current = this.sections.find((s) => s.id === leaf.section.id) ?? leaf.section;
    if (leaf.group) this.open.add(this.key(leaf.group));
  }

  key(group: NavItem): string { return `${this.current.id}/${group.label}`; }
  isOpen(group: NavItem): boolean { return this.open.has(this.key(group)); }

  toggle(group: NavItem): void {
    const k = this.key(group);
    this.open.has(k) ? this.open.delete(k) : this.open.add(k);
  }

  pick(section: NavSection): void {
    this.current = section;
  }

  /** Product coming soon, or module not contracted (its own, or its section's). */
  bloqueado(item: NavItem): boolean { return !!item.locked || !this.ctx.modulo(item.modulo ?? this.current.modulo); }
  seccionBloqueada(s: NavSection): boolean { return !!s.locked || !this.ctx.modulo(s.modulo); }

  /** Module not included in the plan (P-MT.5): a sales opportunity, not an error. */
  abrirBloqueado(item?: NavItem): void {
    const proximamente = item ? !!item.locked : !!this.current.locked;
    const codigo = item?.modulo ?? this.current.modulo ?? null;
    this.ctx.mostrarBloqueado(proximamente ? null : codigo, item?.label ?? this.current.label);
  }
}
