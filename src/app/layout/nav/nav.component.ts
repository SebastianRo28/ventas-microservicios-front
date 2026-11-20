import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { HrDataService } from '../../core/hr-data.service';
import { PortalService } from '../../core/portal.service';
import { NAV_SECTIONS, NavItem, NavSection, findLeaf } from '../nav.config';

/** Rail (module switcher) + sidebar (module menu). */
@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html'
})
export class NavComponent implements OnDestroy {
  readonly sections = NAV_SECTIONS;
  current: NavSection = NAV_SECTIONS[1];
  /** Open groups, keyed by `${section}/${label}`. */
  open = new Set<string>();
  private sub: Subscription;

  /** Live counters (pending surveys); other items keep the count from the nav config. */
  count(item: NavItem): number | undefined {
    if (item.path === 'portal/mis-encuestas') return this.portal.encuestasPendientes;
    if (item.path === 'portal/mis-evaluaciones') return this.portal.evaluacionesPendientes;
    return item.count;
  }

  constructor(private router: Router, public data: HrDataService, private portal: PortalService) {
    this.sync(router.url);
    this.sub = router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.sync(e.urlAfterRedirects));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  /** Follow the route: select its module and expand its group. */
  private sync(url: string): void {
    const leaf = findLeaf(url);
    if (!leaf) return;
    this.current = leaf.section;
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
}
