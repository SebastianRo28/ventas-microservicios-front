import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { ADMIN_LINKS } from '../layout/drawers/admin-drawer.component';
import { NAV_LEAVES } from '../layout/nav.config';
import { PlaceholderComponent } from '../features/placeholder/placeholder.component';

/**
 * Child routes of a lazy-loaded section ("admin", "rem", "portal"…), generated from the menu config so the menu and
 * the routes never drift apart. Entries without a built screen route to the placeholder.
 */
export function sectionRoutes(prefix: string, screens: Record<string, Type<unknown>>, extraData: Record<string, object> = {}): Routes {
  const child = (path: string) => (path === prefix ? '' : path.slice(prefix.length + 1));
  const enSeccion = (path: string) => path === prefix || path.startsWith(prefix + '/');
  return [
    ...NAV_LEAVES.filter((l) => enSeccion(l.path)).map((leaf) => ({
      path: child(leaf.path),
      pathMatch: (leaf.path === prefix ? 'full' : 'prefix') as 'full' | 'prefix',
      component: screens[leaf.path] ?? PlaceholderComponent,
      title: `${leaf.label} · Nexo RH`,
      data: { title: leaf.label, crumbs: [leaf.section.label, leaf.group?.label].filter(Boolean), ...extraData[leaf.path] },
    })),
    ...ADMIN_LINKS.filter((l) => enSeccion(l.path)).map((l) => ({
      path: child(l.path), component: screens[l.path] ?? PlaceholderComponent, title: `${l.label} · Nexo RH`,
      data: { title: l.label, crumbs: ['Administración'], ...extraData[l.path] },
    })),
  ];
}
