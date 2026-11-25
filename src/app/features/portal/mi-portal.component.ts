import { Component } from '@angular/core';
import { AsistenciaService } from '../../core/asistencia.service';
import { ControlAsistenciaService } from '../../core/control-asistencia.service';
import { Recinto } from '../../core/sample/control-asistencia';
import { HrDataService } from '../../core/hr-data.service';
import { UiStateService } from '../../core/ui-state.service';

type Feed = 'all' | 'pub' | 'rec' | 'bday';

interface Post {
  id: string;
  kind: 'pub' | 'rec' | 'bday';
  ini: string;
  avatarTone: string;
  author: string;
  meta: string;
  text?: string;
  pinned?: boolean;
  image?: boolean;
  /** Recognition */
  from?: string; to?: string; valor?: string; valorColor?: string;
  /** Birthday */
  role?: string;
  likes: number; loves: number; smiles: number; comments: number;
}

/** Colors of the covers, in turn (palette tokens). */
const PALETA = [
  { bg: 'var(--nx-primary-700)', blob: 'var(--nx-primary-600)' }, { bg: 'var(--nx-success-700)', blob: 'var(--nx-success-900)' },
  { bg: 'var(--nx-orange-700)', blob: 'var(--nx-orange-600)' },
];
const ICONOS = ['home', 'hospital', 'clipcheck', 'star'];
/** Shortcuts that Comunicaciones › Portal › Acciones rápidas can show, by title. */
const ACCESOS: Record<string, { icon: string; path: string }> = {
  'Generar certificado o documento': { icon: 'file', path: '/admin/documentos' },
  'Solicitar permiso': { icon: 'calcheck', path: '/admin/asistencia/solicitudes' },
  'Beneficios': { icon: 'gift', path: '/portal/mis-beneficios' },
  'Crear solicitud de workflow': { icon: 'workflow', path: '/portal/procesos-internos' },
};
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** P-01.13 Portal del Colaborador ("Mi portal"), with P-12.3 Nuevo Reconocimiento and P-12.4 calendar. */
import { PortalService, ValorReconocimiento } from '../../core/portal.service';
import { Boleta } from '../../core/models';
import { Reconocimiento } from '../../core/sample/reportes';
import { ComunicacionService } from '../../core/comunicacion.service';
import { mensajeError } from '../../core/auth.service';
import { iniciales, parseFecha } from '../../core/format';
import { PendientesService } from '../../core/pendientes.service';
import { ElementoPortal } from '../../core/sample/reportes';
import { nombrePeriodo } from '../../shared/boleta/boleta-modal.component';
@Component({
  selector: 'app-mi-portal',
  templateUrl: './mi-portal.component.html'
})
export class MiPortalComponent {
  /** Visible covers of Comunicaciones › Portal. */
  portadas: { title: string; text: string; icon: string; bg: string; blob: string }[] = [];
  /** Visible quick actions of Comunicaciones › Portal (all of them while the company has not configured any). */
  private acciones: ElementoPortal[] = [];
  muestra(titulo: string): boolean { return !this.acciones.length || this.acciones.some((a) => a.titulo === titulo && a.visible); }
  get accesos(): { icon: string; label: string; path: string }[] {
    return Object.entries(ACCESOS).filter(([t]) => this.muestra(t)).map(([label, a]) => ({ label, ...a }));
  }
  /** Birthdays of the year by month, from each collaborator's record (day and month). */
  cumples: [string, [string, string, string][]][] = [];
  readonly anio: number;
  get valores(): ValorReconocimiento[] { return this.portal.valores$.value; }
  readonly chips: [Feed, string][] = [['all', 'Todo'], ['pub', 'Publicaciones'], ['rec', 'Reconocimientos'], ['bday', 'Cumpleaños']];
  slide = 0;
  feed: Feed = 'all';
  liked = new Set<string>();
  marca: string | null = null;
  marcaError = false;
  recintos: Recinto[] = [];
  ubicacion = 0;

  /** Birthday posts of the day (attendance cut-off date), from the collaborators' records. */
  private fijos: Post[] = [];
  /** First pending tasks (PendientesService) and how many there are. */
  tareas: { tag: string; tone: string; who: string; what: string; when: string }[] = [];
  totalTareas = 0;

  /** Modals */
  recon = 0;            // 0 closed · 1 valor · 2 destinatarios · 3 publicado
  valor = 0;
  reconWho: string[] = ['Chávez Quispe, Renato'];
  reconMsg = '';
  personas: string[] = [];
  tareasCfg = false;
  calendario = false;

  /** Vacation balance of the signed-in collaborator. */
  saldoVacaciones = 0;

  constructor(data: HrDataService, public ui: UiStateService, asistencia: AsistenciaService, private ca: ControlAsistenciaService, public portal: PortalService, private com: ComunicacionService,
              pendientes: PendientesService) {
    const hoy = parseFecha(asistencia.corte) ?? new Date();
    this.anio = hoy.getFullYear();
    const ddmm = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    data.portadas().subscribe((ps) => {
      this.portadas = ps.filter((p) => p.visible).map((p, i) => ({ title: p.titulo, text: p.descripcion, icon: ICONOS[i % ICONOS.length], ...PALETA[i % PALETA.length] }));
      this.slide = 0;
    });
    data.accionesRapidas().subscribe((a) => (this.acciones = a));
    pendientes.items$().subscribe((l) => {
      this.totalTareas = l.length;
      this.tareas = l.slice(0, 3).map((p) => ({ tag: p.etiqueta, tone: p.tone, who: p.titulo, what: p.detalle, when: p.fecha }));
    });
    this.recintos = ca.recintos$.value.filter((r) => r.activo);
    this.ubicacion = ca.recintoDe[this.portal.yoId] ?? this.recintos[0]?.id ?? 0;
    data.colaboradores().subscribe((l) => {
      const conCumple = l.filter((c) => c.contacto?.cumpleanos).sort((a, b) => a.contacto!.cumpleanos!.split('/').reverse().join('').localeCompare(b.contacto!.cumpleanos!.split('/').reverse().join('')));
      this.cumples = MESES.map((m, i) => [m, conCumple.filter((c) => +c.contacto!.cumpleanos!.slice(3) === i + 1)
        .map((c) => [iniciales(c.nombres, c.apellidos), `${c.nombres.split(' ')[0]} ${c.apellidos.split(' ')[0]}`, c.contacto!.cumpleanos!] as [string, string, string])] as [string, [string, string, string][]])
        .filter(([, ps]) => ps.length);
      this.fijos = conCumple.filter((c) => c.contacto!.cumpleanos === ddmm).map((c): Post => ({
        id: 'b' + c.id, kind: 'bday', ini: iniciales(c.nombres, c.apellidos), avatarTone: 'yellow', author: `${c.nombres} ${c.apellidos}`,
        meta: `CUMPLEAÑOS · ${ddmm}/${this.anio}`, role: `${c.cargo} · ${c.area}`, likes: 0, loves: 0, smiles: 0, comments: 0 }));
      this.componer();
      const otros = l.filter((c) => c.id !== this.portal.yoId);
      this.personas = otros.map((c) => `${c.apellidos}, ${c.nombres}`);
      this.idPorNombre = new Map(otros.map((c) => [`${c.apellidos}, ${c.nombres}`, c.id]));
      const yo = l.find((c) => c.id === this.portal.yoId);
      if (yo) this.saldoVacaciones = asistencia.saldo(yo);
    });
    portal.reconocimientos$.subscribe((rs) => this.armarMuro(rs));
    this.cargarMuro();
    if (this.portal.yoId >= 0) data.boletas(this.portal.yoId).subscribe((bs) => (this.boletas = bs.filter((b) => b.definitiva).slice(0, 3)));
  }

  /** Wall: pinned publications, then the latest recognitions, then the rest. */
  posts: Post[] = [];
  private armarMuro(rs: Reconocimiento[]): void {
    const recs: Post[] = rs.slice(0, 8).map((r) => {
      const v = this.valores.find((x) => x.nombre === r.valor);
      const autor = r.autor.split(', ').reverse().join(' ');
      return { id: 'r' + r.id, kind: 'rec', ini: iniciales(r.autor.split(', ')[1] ?? r.autor, r.autor.split(', ')[0] ?? ''), avatarTone: 'warning', author: '', meta: `${r.fecha} · Reconocimiento`,
        from: autor, to: r.para.split('; ').map((n) => n.split(', ').reverse().join(' ')).join(', '), valor: r.valor, valorColor: v?.color,
        text: `“${r.mensaje}”`, likes: 0, loves: 0, smiles: 0, comments: 0 };
    });
    this.recs = recs;
    this.componer();
  }
  private recs: Post[] = [];
  private pubs: Post[] = [];
  /** Publications from the API (Comunicaciones › Portal) that are published and not expired. */
  private cargarMuro(): void {
    this.com.muro().subscribe({
      next: (ps) => {
        this.pubs = ps.map((x) => ({ id: 'p' + x.id, kind: 'pub' as const, pinned: x.fijada, ini: iniciales(x.autor.split(' ')[0] ?? '', x.autor.split(' ')[1] ?? ''),
          avatarTone: 'info', author: x.autor, meta: `${x.publicada} · Publicación`, text: x.texto, likes: x.reacciones, loves: 0, smiles: 0, comments: x.comentarios }));
        this.componer();
      },
      error: () => this.componer(),
    });
  }
  /** Wall: pinned publications, latest recognitions, other publications, birthdays. */
  private componer(): void {
    const otros = this.fijos.filter((x) => x.kind !== 'pub');
    this.posts = [...this.pubs.filter((x) => x.pinned), ...this.recs, ...this.pubs.filter((x) => !x.pinned), ...otros];
  }

  get visibles(): Post[] { return this.posts.filter((p) => this.feed === 'all' || p.kind === this.feed); }
  get reconOpts(): string[] { return this.personas.filter((p) => !this.reconWho.includes(p)); }

  prev(): void { const n = this.portadas.length; if (n) this.slide = (this.slide + n - 1) % n; }
  next(): void { const n = this.portadas.length; if (n) this.slide = (this.slide + 1) % n; }

  toggleLike(p: Post): void { this.liked.has(p.id) ? this.liked.delete(p.id) : this.liked.add(p.id); }

  private idPorNombre = new Map<string, number>();
  /** Last three final payslips of the signed-in person. */
  boletas: Boleta[] = [];
  boletaVer: number | null = null;
  readonly nombrePeriodo = nombrePeriodo;
  /** A punch is being sent to the API. */
  marcando = false;
  /** Punch from the portal (method Web); it shows up in Control de Asistencia at once. */
  marcar(tipo: 'Entrada' | 'Salida'): void {
    // The API sets the date and time of the punch.
    if (this.portal.yoId < 0) { this.marca = 'Tu usuario no está vinculado a un colaborador, así que no puede registrar asistencia.'; this.marcaError = true; return; }
    this.marcando = true;
    this.ca.marcar(this.portal.yoId, +this.ubicacion, tipo, 'Web').subscribe((r) => {
      this.marcando = false;
      this.marca = r.mensaje;
      this.marcaError = !r.ok;
    });
  }

  reconError = '';
  openRecon(): void { this.recon = 1; this.valor = 0; this.reconWho = []; this.reconMsg = ''; this.reconError = ''; }

  reconNext(): void {
    if (this.recon === 1) { this.recon = 2; return; }
    if (!this.reconWho.length) return;
    const ids = this.reconWho.map((n) => this.idPorNombre.get(n)).filter((x): x is number => x !== undefined);
    this.reconError = '';
    this.portal.reconocer(ids, this.valores[this.valor]?.nombre ?? '', this.reconMsg.trim() || '¡Buen trabajo equipo!').subscribe({
      next: () => (this.recon = 3),
      error: (e) => (this.reconError = mensajeError(e)),
    });
  }

  addWho(name: string): void { if (name) this.reconWho = [...this.reconWho, name]; }
  removeWho(name: string): void { this.reconWho = this.reconWho.filter((x) => x !== name); }

  reconBack(): void { this.recon = this.recon === 2 ? 1 : 0; }

  saveTareas(): void { this.tareasCfg = false; this.ui.toast('Preferencias de tareas guardadas'); }
}
