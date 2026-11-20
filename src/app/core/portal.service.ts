import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { fmtFecha } from './asistencia.service';
import { RECONOCIMIENTOS, Reconocimiento } from './sample/reportes';
import {
  BENEFICIOS, Beneficio, CANJES, CURSOS, Canje, Curso, EVALUACIONES, EncuestaPortal, Evaluacion, JEFES, MIS_ENCUESTAS, PUNTOS_INICIALES, YO_ID
} from './sample/portal';

/** State of the collaborator portal (signed in as Florencia Alamos). In memory until there is an API. */
@Injectable({ providedIn: 'root' })
export class PortalService {
  readonly yoId = YO_ID;
  readonly jefes = JEFES;
  readonly beneficios: Beneficio[] = BENEFICIOS;
  readonly canjes$ = new BehaviorSubject<Canje[]>(CANJES);
  readonly encuestas$ = new BehaviorSubject<EncuestaPortal[]>(MIS_ENCUESTAS);
  readonly reconocimientos$ = new BehaviorSubject<Reconocimiento[]>(RECONOCIMIENTOS);
  readonly cursos$ = new BehaviorSubject<Curso[]>(CURSOS);
  readonly evaluaciones$ = new BehaviorSubject<Evaluacion[]>(EVALUACIONES);
  puntos = PUNTOS_INICIALES;

  /** Evaluations waiting for the collaborator: counter next to "Mis Evaluaciones". */
  get evaluacionesPendientes(): number { return this.evaluaciones$.value.filter((e) => e.estado === 'Autoevaluación pendiente').length; }

  /** Pending surveys: shown as the counter next to "Mis Encuestas" in the menu. */
  get encuestasPendientes(): number { return this.encuestas$.value.filter((e) => !e.respondida).length; }

  /** Direct reports of a collaborator. */
  reportes(id: number): number[] { return Object.keys(this.jefes).map(Number).filter((k) => this.jefes[k] === id); }

  canjear(b: Beneficio): Canje {
    const list = this.canjes$.value;
    const c: Canje = { id: Math.max(0, ...list.map((x) => x.id)) + 1, beneficioId: b.id, fecha: fmtFecha(new Date()), puntos: b.puntos, estado: 'Solicitado' };
    this.puntos -= b.puntos;
    if (b.stock !== null) b.stock--;
    this.canjes$.next([c, ...list]);
    return c;
  }

  /** Marks a module done or undone; completing every module completes the course. */
  marcarModulo(c: Curso, i: number, hecho: boolean): void {
    c.hechos = hecho ? [...new Set([...c.hechos, i])].sort((a, b) => a - b) : c.hechos.filter((x) => x !== i);
    c.completado = c.hechos.length === c.modulos.length ? fmtFecha(new Date()) : null;
    this.cursos$.next([...this.cursos$.value]);
  }
  inscribir(c: Curso): void { c.inscrito = true; this.cursos$.next([...this.cursos$.value]); }

  enviarAutoevaluacion(e: Evaluacion, notas: Record<string, number>): void {
    e.auto = { ...notas };
    e.estado = 'Esperando a la jefatura';
    this.evaluaciones$.next([...this.evaluaciones$.value]);
  }

  responder(e: EncuestaPortal): void {
    e.respondida = fmtFecha(new Date());
    this.encuestas$.next([...this.encuestas$.value]);
  }

  reconocer(r: Omit<Reconocimiento, 'id' | 'fecha'>): Reconocimiento {
    const list = this.reconocimientos$.value;
    const nuevo: Reconocimiento = { ...r, id: Math.max(-1, ...list.map((x) => x.id)) + 1, fecha: fmtFecha(new Date()) };
    list.unshift(nuevo);
    this.reconocimientos$.next([...list]);
    return nuevo;
  }
}

/** Corporate e-mail: the one on file, otherwise first initial + first surname (f.alamos@comercialandina.pe). */
export const emailDe = (c: { nombres: string; apellidos: string; detalle?: { emailCorporativo?: string } }): string => {
  if (c.detalle?.emailCorporativo) return c.detalle.emailCorporativo;
  const limpio = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return `${limpio(c.nombres[0])}.${limpio(c.apellidos.split(' ')[0])}@comercialandina.pe`;
};
