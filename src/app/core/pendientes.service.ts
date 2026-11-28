import { Injectable } from '@angular/core';
import { Observable, catchError, combineLatest, filter, map, of, shareReplay, startWith, switchMap, take } from 'rxjs';
import { AsistenciaService } from './asistencia.service';
import { AuthService } from './auth.service';
import { ContextoService } from './contexto.service';
import { HrDataService } from './hr-data.service';
import { Colaborador, Pendiente } from './models';
import { PortalService } from './portal.service';
import { SstService } from './sst.service';

/** "dd/MM/yyyy" → sortable "yyyyMMdd". */
const orden = (f: string) => f.slice(0, 10).split('/').reverse().join('');

/**
 * What is actually pending for the signed-in user ("Mis pendientes" and the tasks of Mi Portal): attendance requests and
 * workflow requests waiting for approval (as the API returns them for the user's role), the user's own self-assessments,
 * and, for administrators, SST evidence about to expire or expired. Newest first.
 */
@Injectable({ providedIn: 'root' })
export class PendientesService {
  constructor(private data: HrDataService, private asis: AsistenciaService, private portal: PortalService, private sst: SstService, private auth: AuthService, private ctx: ContextoService) {}

  items$(): Observable<Pendiente[]> {
    const evidencias = this.auth.esAdmin
      // Only when the plan includes SST (otherwise the API answers 403).
      ? this.ctx.contexto$.pipe(filter((c) => !!c), take(1),
        switchMap((c) => c!.modulos.includes('SST') ? this.sst.datos().pipe(map((d) => d.asignaciones), catchError(() => of([]))) : of([])), startWith([]))
      : of([]);
    // Evaluations (and workflows, filtered in HrDataService) are part of Plataforma Pro.
    const evaluaciones = this.ctx.contratado$('PRO').pipe(switchMap((pro) => pro ? this.portal.evaluaciones$ : of([])), startWith([]));
    return combineLatest([this.data.colaboradores(), this.asis.solicitudes$, this.data.solicitudesWf(), evaluaciones, evidencias]).pipe(
      map(([cs, sols, wf, evals, evs]) => {
        const nombre = (id: number) => { const c = cs.find((x: Colaborador) => x.id === id); return c ? `${c.apellidos}, ${c.nombres}` : '—'; };
        const lista: Pendiente[] = [
          ...sols.filter((s) => s.estado === 'Pendiente').map((s): Pendiente => ({
            tipo: s.tipo === 'Vacaciones' ? 'vac' : 'aus', etiqueta: 'Solicitudes', tone: 'info', fecha: s.creada,
            titulo: `Solicitud de ${s.tipo === 'Vacaciones' ? 'Vacaciones' : 'Ausentismo'} · ${nombre(s.colaboradorId)}`,
            detalle: s.desde === s.hasta ? `${s.tipo} el ${s.desde}.` : `${s.tipo} del ${s.desde} al ${s.hasta}.`,
            ruta: '/admin/asistencia/solicitudes', accion: 'Revisar solicitud',
          })),
          ...wf.filter((s) => s.estado === 'Pendiente' && !s.esMia).map((s): Pendiente => ({
            tipo: 'otro', etiqueta: 'Solicitudes', tone: 'info', fecha: s.creada,
            titulo: `#${s.id} ${s.titulo} está pendiente de revisión`, detalle: `Solicitado por ${s.solicitante}.`,
            ruta: '/admin/workflow/solicitudes', accion: 'Revisar solicitud',
          })),
          ...evals.filter((e) => e.estado === 'Autoevaluación pendiente').map((e): Pendiente => ({
            tipo: 'eva', etiqueta: 'Acciones pendientes - Evaluación', tone: 'neutral', fecha: e.cierre,
            titulo: e.nombre, detalle: `Completa tu autoevaluación antes del ${e.cierre}.`,
            ruta: '/portal/mis-evaluaciones', accion: 'Hacer autoevaluación',
          })),
          ...evs.filter((a) => !a.finalizada && (a.estado === 'Por vencer' || a.estado === 'Vencida')).map((a): Pendiente => ({
            tipo: 'sst', etiqueta: 'SST', tone: a.estado === 'Vencida' ? 'danger' : 'warning', fecha: a.vence ?? a.actualizado,
            titulo: `${a.requisito} ${a.estado === 'Vencida' ? 'vencido' : 'por vencer'}`,
            detalle: `La evidencia de ${a.titular} ${a.estado === 'Vencida' ? 'venció' : 'vence'} el ${a.vence ?? '—'}.`,
            ruta: '/sst/cumplimientos', accion: 'Actualizar evidencia',
          })),
        ];
        return lista.sort((a, b) => orden(b.fecha).localeCompare(orden(a.fecha)));
      }),
      shareReplay({ bufferSize: 1, refCount: true }));
  }
}
