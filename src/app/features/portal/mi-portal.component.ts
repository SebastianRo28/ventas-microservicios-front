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

const PORTADAS = [
  { title: 'Bienvenidos al nuevo portal Nexo RH', text: 'Tus boletas, solicitudes y documentos, ahora en un solo lugar.', icon: 'home', bg: 'var(--nx-primary-700)', blob: 'var(--nx-primary-600)' },
  { title: 'Campaña de vacunación 2026', text: 'Inscríbete hasta el 20/03/2026 en el tópico de la sede central.', icon: 'hospital', bg: '#1F6E55', blob: '#3C8C72' },
  { title: 'Encuesta de clima laboral', text: 'Tu opinión es anónima y nos ayuda a mejorar. Responde antes del 31/03/2026.', icon: 'clipcheck', bg: '#A55A17', blob: '#B9671F' },
];

const VALORES = [
  { name: 'Vamos por más!', hint: 'Buscamos superar las metas cada día.', color: 'var(--nx-primary-700)', icon: 'trend' },
  { name: 'Nos mueve la excelencia', hint: 'Hacemos las cosas bien desde el inicio.', color: '#1F6E55', icon: 'star' },
  { name: 'Pasión por el servicio', hint: 'Ponemos al cliente interno y externo al centro.', color: '#B4521F', icon: 'heart' },
  { name: 'Al infinito y más allá', hint: 'Nos atrevemos a innovar y aprender.', color: '#5B3FA8', icon: 'rocket' },
];

const CUMPLES: [string, [string, string, string][]][] = [
  ['Enero', [['SM', 'Sofía Medina', '08/01']]], ['Febrero', [['GN', 'Gonzalo Navarro', '19/02']]],
  ['Marzo', [['AR', 'Ana Ríos', '12/03'], ['LP', 'Luis Pérez', '28/03']]],
  ['Abril', [['FA', 'Florencia Alamos', '14/04'], ['RC', 'Renato Chávez', '22/04']]],
  ['Mayo', [['VH', 'Valeria Herrera', '03/05']]], ['Junio', [['DB', 'Diego Benavides', '17/06']]],
  ['Julio', [['AD', 'Andrea Delgado', '09/07']]], ['Agosto', [['ME', 'Martín Espinoza', '25/08']]],
  ['Septiembre', [['CF', 'Carolina Flores', '11/09']]], ['Octubre', [['JG', 'Javier Gutiérrez', '30/10']]],
  ['Noviembre', [['PH', 'Paolo Huertas', '06/11'], ['DO', 'Daniela Ortiz', '21/11']]],
  ['Diciembre', [['MZ', 'Miguel Zapata', '15/12'], ['LC', 'Lucía Cáceres', '27/12']]],
];

/** P-01.13 Portal del Colaborador ("Mi portal"), with P-12.3 Nuevo Reconocimiento and P-12.4 calendar. */
import { PortalService } from '../../core/portal.service';
import { Boleta } from '../../core/models';
import { Reconocimiento } from '../../core/sample/reportes';
import { ComunicacionService } from '../../core/comunicacion.service';
import { mensajeError } from '../../core/auth.service';
import { iniciales } from '../../core/format';
import { nombrePeriodo } from '../../shared/boleta/boleta-modal.component';
@Component({
  selector: 'app-mi-portal',
  templateUrl: './mi-portal.component.html'
})
export class MiPortalComponent {
  readonly portadas = PORTADAS;
  readonly valores = VALORES;
  readonly cumples = CUMPLES;
  readonly chips: [Feed, string][] = [['all', 'Todo'], ['pub', 'Publicaciones'], ['rec', 'Reconocimientos'], ['bday', 'Cumpleaños']];
  slide = 0;
  feed: Feed = 'all';
  liked = new Set<string>();
  marca: string | null = null;
  marcaError = false;
  recintos: Recinto[] = [];
  ubicacion = 0;

  /** Fixed posts (publications and birthdays) until Comunicaciones has an API; recognitions come from the API. */
  private fijos: Post[] = [
    { id: 'p1', kind: 'pub', pinned: true, image: true, ini: 'GP', avatarTone: 'info', author: 'Gestión de Personas', meta: '02/03/2026 · Publicación',
      text: '¡Bienvenidos a Nexo RH! Desde este mes tus boletas de pago, solicitudes de vacaciones y documentos estarán disponibles en el portal. Si tienes dudas, escríbenos por el chat de Servicio al Colaborador.',
      likes: 24, loves: 12, smiles: 3, comments: 8 },
    { id: 'p3', kind: 'pub', ini: 'CI', avatarTone: 'info', author: 'Comunicaciones Internas', meta: '09/03/2026 · Publicación',
      text: 'Recordatorio: el viernes 13/03/2026 la sede central cerrará a las 3:00 p. m. por mantenimiento eléctrico. El trabajo remoto está habilitado para todas las áreas administrativas.',
      likes: 9, loves: 2, smiles: 0, comments: 1 },
    { id: 'p4', kind: 'bday', ini: 'AR', avatarTone: 'yellow', author: 'Ana Ríos Calderón', meta: 'CUMPLEAÑOS · 12/03/2026', role: 'Asistente Contable · Contabilidad',
      likes: 31, loves: 18, smiles: 4, comments: 12 },
  ];

  tareas = [
    { tag: 'Solicitudes', tone: 'info', who: 'Navarro Ríos, Gonzalo', what: '#18747 Aporte Patronal está pendiente de revisión', when: '12/03/2026' },
    { tag: 'Solicitud de ausentismo', tone: 'info', who: 'Chávez Quispe, Renato', what: 'Permiso por trámite personal el 14/03/2026', when: '11/03/2026' },
    { tag: 'Acciones pendientes - Evaluación', tone: 'neutral', who: 'Gestión de Personas', what: 'Autoevaluación de desempeño 2026', when: '09/03/2026' },
  ];
  accesos = [
    { icon: 'file', label: 'Generar certificado o documento', path: '/admin/documentos' },
    { icon: 'calcheck', label: 'Solicitar permiso', path: '/admin/asistencia/solicitudes' },
    { icon: 'gift', label: 'Beneficios', path: '/portal/mis-beneficios' },
    { icon: 'workflow', label: 'Crear solicitud de workflow', path: '/portal/procesos-internos' },
  ];

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

  constructor(data: HrDataService, public ui: UiStateService, asistencia: AsistenciaService, private ca: ControlAsistenciaService, public portal: PortalService, private com: ComunicacionService) {
    this.recintos = ca.recintos$.value.filter((r) => r.activo);
    this.ubicacion = ca.recintoDe[this.portal.yoId] ?? this.recintos[0]?.id ?? 0;
    data.colaboradores().subscribe((l) => {
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
      const v = VALORES.find((x) => x.name === r.valor);
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

  prev(): void { this.slide = (this.slide + PORTADAS.length - 1) % PORTADAS.length; }
  next(): void { this.slide = (this.slide + 1) % PORTADAS.length; }

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
    this.portal.reconocer(ids, VALORES[this.valor].name, this.reconMsg.trim() || '¡Buen trabajo equipo!').subscribe({
      next: () => (this.recon = 3),
      error: (e) => (this.reconError = mensajeError(e)),
    });
  }

  addWho(name: string): void { if (name) this.reconWho = [...this.reconWho, name]; }
  removeWho(name: string): void { this.reconWho = this.reconWho.filter((x) => x !== name); }

  reconBack(): void { this.recon = this.recon === 2 ? 1 : 0; }

  saveTareas(): void { this.tareasCfg = false; this.ui.toast('Preferencias de tareas guardadas'); }
}
