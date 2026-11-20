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
  { title: 'Bienvenidos al nuevo portal Nexo RH', text: 'Tus boletas, solicitudes y documentos, ahora en un solo lugar.', icon: 'home', bg: '#2D4DA4', blob: '#4B69C0' },
  { title: 'Campaña de vacunación 2026', text: 'Inscríbete hasta el 20/03/2026 en el tópico de la sede central.', icon: 'hospital', bg: '#1F6E55', blob: '#3C8C72' },
  { title: 'Encuesta de clima laboral', text: 'Tu opinión es anónima y nos ayuda a mejorar. Responde antes del 31/03/2026.', icon: 'clipcheck', bg: '#A55A17', blob: '#B9671F' },
];

const VALORES = [
  { name: 'Vamos por más!', hint: 'Buscamos superar las metas cada día.', color: '#2D4DA4', icon: 'trend' },
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

  posts: Post[] = [
    { id: 'p1', kind: 'pub', pinned: true, image: true, ini: 'GP', avatarTone: 'info', author: 'Gestión de Personas', meta: '02/03/2026 · Publicación',
      text: '¡Bienvenidos a Nexo RH! Desde este mes tus boletas de pago, solicitudes de vacaciones y documentos estarán disponibles en el portal. Si tienes dudas, escríbenos por el chat de Servicio al Colaborador.',
      likes: 24, loves: 12, smiles: 3, comments: 8 },
    { id: 'p2', kind: 'rec', ini: 'LC', avatarTone: 'warning', author: '', meta: '10/03/2026 · Reconocimiento',
      from: 'Lucía Cáceres Huamán', to: 'Renato Chávez Quispe', valor: 'Trabajo en equipo',
      text: '“Gracias por apoyar el cierre de planillas de febrero fuera de horario. ¡Gran trabajo!”', likes: 15, loves: 6, smiles: 1, comments: 3 },
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

  constructor(data: HrDataService, public ui: UiStateService, asistencia: AsistenciaService, private ca: ControlAsistenciaService, public portal: PortalService) {
    this.recintos = ca.recintos$.value.filter((r) => r.activo);
    this.ubicacion = ca.recintoDe[this.portal.yoId] ?? this.recintos[0]?.id ?? 0;
    data.colaboradores().subscribe((l) => {
      this.personas = l.map((c) => `${c.apellidos}, ${c.nombres}`);
      const yo = l.find((c) => c.id === this.portal.yoId);
      if (yo) this.saldoVacaciones = asistencia.saldo(yo);
    });
  }

  get visibles(): Post[] { return this.posts.filter((p) => this.feed === 'all' || p.kind === this.feed); }
  get reconOpts(): string[] { return this.personas.filter((p) => !this.reconWho.includes(p)); }

  prev(): void { this.slide = (this.slide + PORTADAS.length - 1) % PORTADAS.length; }
  next(): void { this.slide = (this.slide + 1) % PORTADAS.length; }

  toggleLike(p: Post): void { this.liked.has(p.id) ? this.liked.delete(p.id) : this.liked.add(p.id); }

  /** Punch from the portal (method Web); it shows up in Control de Asistencia at once. */
  marcar(tipo: 'Entrada' | 'Salida'): void {
    // The sample data lives on 16/03/2026; its clock (ca.horaCorte) is used so the punch fits the day already on file.
    if (this.portal.yoId < 0) { this.marca = 'Tu usuario no está vinculado a un colaborador, así que no puede registrar asistencia.'; this.marcaError = true; return; }
    const r = this.ca.marcar(this.portal.yoId, +this.ubicacion, tipo, 'Web', this.ca.horaCorte);
    this.marca = r.mensaje;
    this.marcaError = !r.ok;
  }

  openRecon(): void { this.recon = 1; this.valor = 0; this.reconWho = ['Chávez Quispe, Renato']; this.reconMsg = ''; }

  reconNext(): void {
    if (this.recon === 1) { this.recon = 2; return; }
    if (!this.reconWho.length) return;
    const v = VALORES[this.valor];
    this.posts = [{
      id: 'r' + Date.now(), kind: 'rec', ini: this.portal.yoIniciales, avatarTone: 'warning', author: '', meta: 'Ahora · Reconocimiento',
      from: this.portal.yoNombre, to: this.reconWho.join(', '), valor: v.name, valorColor: v.color,
      text: `“${this.reconMsg.trim() || '¡Buen trabajo equipo!'}”`, likes: 0, loves: 0, smiles: 0, comments: 0,
    }, ...this.posts];
    this.recon = 3;
  }

  addWho(name: string): void { if (name) this.reconWho = [...this.reconWho, name]; }
  removeWho(name: string): void { this.reconWho = this.reconWho.filter((x) => x !== name); }

  reconBack(): void { this.recon = this.recon === 2 ? 1 : 0; }

  saveTareas(): void { this.tareasCfg = false; this.ui.toast('Preferencias de tareas guardadas'); }
}
