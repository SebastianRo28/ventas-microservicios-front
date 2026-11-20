import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { UiStateService } from '../../core/ui-state.service';
import { NAV_LEAVES, findLeaf } from '../nav.config';

interface SearchHit { label: string; detail: string; path: string; }

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html'
})
export class TopbarComponent {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  query = '';
  hits: SearchHit[] = [];
  activeHit = 0;
  private people: SearchHit[] = [];

  menuUsuario = false;

  constructor(public ui: UiStateService, public data: HrDataService, private router: Router, public auth: AuthService) {
    data.colaboradores().subscribe((list) => {
      this.people = list.map((p) => ({
        label: `${p.apellidos}, ${p.nombres}`, detail: p.cargo, path: `admin/colaboradores/ficha/${p.id}`
      }));
    });
  }

  salir(): void {
    this.menuUsuario = false;
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /** In the portal the eye switches back to admin; elsewhere it opens the collaborator view. */
  get inPortal(): boolean {
    return findLeaf(this.router.url)?.section.id === 'portal';
  }

  /** Below 768px the sidebar is hidden by default and the toggle shows it, so the flag is inverted. */
  sidebarVisible(collapsed: boolean | null): boolean {
    const phone = window.matchMedia('(max-width: 767.98px)').matches;
    return phone ? !!collapsed : !collapsed;
  }

  @HostListener('document:keydown', ['$event'])
  onShortcut(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  }

  search(q: string): void {
    this.query = q;
    this.activeHit = 0;
    const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const term = norm(q.trim());
    if (!term) { this.hits = []; return; }
    const pages = NAV_LEAVES.map((l) => ({
      label: l.label, detail: [l.section.label, l.group?.label].filter(Boolean).join(' › '), path: l.path
    }));
    this.hits = [...this.people, ...pages].filter((h) => norm(h.label).includes(term)).slice(0, 8);
  }

  onSearchKey(e: KeyboardEvent): void {
    if (!this.hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.activeHit = (this.activeHit + 1) % this.hits.length; }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.activeHit = (this.activeHit - 1 + this.hits.length) % this.hits.length; }
    if (e.key === 'Enter') { this.go(this.hits[this.activeHit]); }
    if (e.key === 'Escape') { this.hits = []; }
  }

  go(hit: SearchHit): void {
    this.router.navigateByUrl('/' + hit.path);
    this.query = '';
    this.hits = [];
  }

  closeResults(): void {
    setTimeout(() => (this.hits = []), 150);
  }
}
