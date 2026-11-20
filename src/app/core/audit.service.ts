import { Injectable } from '@angular/core';
import { AccionCambio, CAMBIOS, Cambio } from './sample/plataforma';

/**
 * Change log behind "Historial de cambios". Seeded with the design's sample entries;
 * screens that change data call `registrar` so their changes appear in the history.
 */
@Injectable({ providedIn: 'root' })
export class AuditService {
  readonly cambios: Cambio[] = CAMBIOS;

  registrar(c: { colaborador: string; documento: string; entidad: string; accion: AccionCambio; propiedad?: string; anterior?: string; actual?: string }): void {
    const fecha = new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
    this.cambios.unshift({
      id: Math.max(-1, ...this.cambios.map((x) => x.id)) + 1, usuario: 'Rodrigo Paredes · Administrador', origen: 'Web', fecha,
      propiedad: c.propiedad ?? '—', anterior: c.anterior ?? '—', actual: c.actual ?? '—',
      colaborador: c.colaborador, documento: c.documento, entidad: c.entidad, accion: c.accion,
    });
  }
}
