import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { AsistenciaService } from '../../core/asistencia.service';
import { ControlAsistenciaService, DatosMarca } from '../../core/control-asistencia.service';
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
import { ComentarioMuro, ComunicacionService, ElementoMuro, InteraccionMuro, TipoReaccion } from '../../core/comunicacion.service';
import { mensajeError } from '../../core/auth.service';
import { iniciales, parseFecha } from '../../core/format';
import { PendientesService } from '../../core/pendientes.service';
import { ElementoPortal } from '../../core/sample/reportes';
import { nombrePeriodo } from '../../shared/boleta/boleta-modal.component';
@Component({
  selector: 'app-mi-portal',
  templateUrl: './mi-portal.component.html'
})
export class MiPortalComponent implements OnDestroy {
  /** Visible covers of Comunicaciones › Portal. */
  portadas: { title: string; text: string; icon: string; bg: string; blob: string; imagen: string | null }[] = [];
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
  marca: string | null = null;
  marcaError = false;
  recintos: Recinto[] = [];
  ubicacion = 0;

  /** Birthday posts of the day (attendance cut-off date), from the collaborators' records. */
  private fijos: Post[] = [];
  /** First pending tasks (PendientesService) and how many there are. */
  tareas: { tag: string; tone: string; who: string; what: string; when: string; ruta: string; accion: string }[] = [];
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
      this.portadas = ps.filter((p) => p.visible).map((p, i) => ({ title: p.titulo, text: p.descripcion, icon: ICONOS[i % ICONOS.length], ...PALETA[i % PALETA.length], imagen: p.imagen ?? null }));
      this.slide = 0;
    });
    data.accionesRapidas().subscribe((a) => (this.acciones = a));
    pendientes.items$().subscribe((l) => {
      this.totalTareas = l.length;
      this.tareas = l.slice(0, 3).map((p) => ({ tag: p.etiqueta, tone: p.tone, who: p.titulo, what: p.detalle, when: p.fecha, ruta: p.ruta, accion: p.accion }));
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
        meta: `CUMPLEAÑOS · ${ddmm}/${this.anio}`, role: `${c.cargo} · ${c.area}`}));
      this.componer();
      const otros = l.filter((c) => c.id !== this.portal.yoId);
      this.personas = otros.map((c) => `${c.apellidos}, ${c.nombres}`);
      this.idPorNombre = new Map(otros.map((c) => [`${c.apellidos}, ${c.nombres}`, c.id]));
      const yo = l.find((c) => c.id === this.portal.yoId);
      if (yo) this.saldoVacaciones = asistencia.saldo(yo);
    });
    portal.reconocimientos$.subscribe((rs) => this.armarMuro(rs));
    this.cargarMuro();
    this.cargarInteracciones();
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
        text: `“${r.mensaje}”`};
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
          avatarTone: 'info', author: x.autor, meta: `${x.publicada} · Publicación`, text: x.texto}));
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

  // ---- Reactions and comments (publications and recognitions; birthdays have none) ----
  readonly reacciones: { tipo: TipoReaccion; icono: string; nombre: string }[] = [
    { tipo: 'like', icono: 'thumbsup', nombre: 'Me gusta' }, { tipo: 'love', icono: 'heart', nombre: 'Me encanta' }, { tipo: 'smile', icono: 'smile', nombre: 'Me divierte' },
  ];
  /** Counters by post id ('p12', 'r3'). */
  private inter = new Map<string, InteraccionMuro>();
  /** Posts whose comment list is open, their comments and the comment being written. */
  abiertos = new Set<string>();
  comentarios = new Map<string, ComentarioMuro[]>();
  borrador: Record<string, string> = {};
  enviando = new Set<string>();

  /** API reference of a post (null for birthdays). */
  private ref(p: Post): { e: ElementoMuro; id: number } | null {
    return p.kind === 'bday' ? null : { e: p.kind, id: +p.id.slice(1) };
  }
  interaccion(p: Post): InteraccionMuro {
    return this.inter.get(p.id) ?? { elemento: p.kind as ElementoMuro, id: +p.id.slice(1), like: 0, love: 0, smile: 0, mia: null, comentarios: 0 };
  }
  private cargarInteracciones(): void {
    this.com.interacciones().subscribe({ next: (l) => (this.inter = new Map(l.map((x) => [(x.elemento === 'pub' ? 'p' : 'r') + x.id, x]))), error: () => {} });
  }

  /** Same reaction again removes it; another one replaces it. Shown at once and corrected with the API's answer. */
  reaccionar(p: Post, tipo: TipoReaccion): void {
    const r = this.ref(p);
    if (!r) return;
    const antes = this.interaccion(p);
    const nueva = antes.mia === tipo ? null : tipo;
    const opt = { ...antes, mia: nueva };
    if (antes.mia) opt[antes.mia]--;
    if (nueva) opt[nueva]++;
    this.inter.set(p.id, opt);
    this.com.reaccionar(r.e, r.id, nueva).subscribe({
      next: (x) => this.inter.set(p.id, x),
      error: (e) => { this.inter.set(p.id, antes); this.ui.toast(mensajeError(e)); },
    });
  }

  verComentarios(p: Post): void {
    const r = this.ref(p);
    if (!r) return;
    if (this.abiertos.has(p.id)) { this.abiertos.delete(p.id); return; }
    this.abiertos.add(p.id);
    this.com.comentariosMuro(r.e, r.id).subscribe({
      next: (l) => this.comentarios.set(p.id, l),
      error: (e) => { this.abiertos.delete(p.id); this.ui.toast(mensajeError(e)); },
    });
  }

  comentar(p: Post): void {
    const r = this.ref(p);
    const texto = (this.borrador[p.id] ?? '').trim();
    if (!r || !texto || this.enviando.has(p.id)) return;
    this.enviando.add(p.id);
    this.com.comentar(r.e, r.id, texto).subscribe({
      next: (c) => {
        this.enviando.delete(p.id);
        this.borrador[p.id] = '';
        const i = this.interaccion(p);
        this.inter.set(p.id, { ...i, comentarios: i.comentarios + 1 });
        // Show the list with the new comment (loading the others if it was closed).
        if (this.comentarios.has(p.id) && this.abiertos.has(p.id)) this.comentarios.set(p.id, [...this.comentarios.get(p.id)!, c]);
        else { this.abiertos.delete(p.id); this.verComentarios(p); }
      },
      error: (e) => { this.enviando.delete(p.id); this.ui.toast(mensajeError(e)); },
    });
  }

  borrarComentario(p: Post, c: ComentarioMuro): void {
    this.com.borrarComentario(c.id).subscribe({
      next: () => {
        this.comentarios.set(p.id, (this.comentarios.get(p.id) ?? []).filter((x) => x.id !== c.id));
        const i = this.interaccion(p);
        this.inter.set(p.id, { ...i, comentarios: Math.max(0, i.comentarios - 1) });
        this.ui.toast('Comentario eliminado');
      },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }
  /** Initials of "Nombres Apellidos": first name and first surname. */
  inicialesDe(nombre: string): string { const w = nombre.trim().split(/\s+/); return iniciales(w[0] ?? '', (w.length > 2 ? w[w.length - 2] : w[w.length - 1]) ?? ''); }

  private idPorNombre = new Map<string, number>();
  /** Last three final payslips of the signed-in person. */
  boletas: Boleta[] = [];
  boletaVer: number | null = null;
  readonly nombrePeriodo = nombrePeriodo;
  /** A punch is being sent to the API. */
  marcando = false;
  /** Punch from the portal (method Web); it shows up in Control de Asistencia at once. Depending on Configuraciones ›
   *  Métodos de marcación it asks for the device location and a selfie, which the API checks against the site radius. */
  marcar(tipo: 'Entrada' | 'Salida'): void {
    // The API sets the date and time of the punch.
    if (this.portal.yoId < 0) { this.marca = 'Tu usuario no está vinculado a un colaborador, así que no puede registrar asistencia.'; this.marcaError = true; return; }
    this.marca = null;
    if (this.ca.metodos['fotoWeb']) { this.abrirCamara(tipo); return; }
    this.enviarMarca(tipo);
  }

  private async enviarMarca(tipo: 'Entrada' | 'Salida', foto?: string): Promise<void> {
    this.marcando = true;
    const extra: DatosMarca = { foto };
    if (this.ca.metodos['ubicacionWeb']) {
      this.marca = 'Obteniendo tu ubicación…'; this.marcaError = false;
      try {
        const p = await ubicacionActual();
        Object.assign(extra, { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy });
      } catch (e) {
        this.marcando = false; this.marcaError = true;
        this.marca = (e as GeolocationPositionError)?.code === 1
          ? 'Necesitamos tu ubicación para registrar la marca. Permite el acceso a la ubicación en tu navegador y vuelve a intentarlo.'
          : 'No pudimos obtener tu ubicación. Revisa que la ubicación del dispositivo esté activada y vuelve a intentarlo.';
        return;
      }
    }
    this.ca.marcar(this.portal.yoId, +this.ubicacion, tipo, 'Web', extra).subscribe((r) => {
      this.marcando = false;
      this.marca = r.mensaje;
      this.marcaError = !r.ok;
    });
  }

  /** What the punch will record besides the time, per Configuraciones › Métodos de marcación. */
  get avisoMarca(): string {
    const u = !!this.ca.metodos['ubicacionWeb'], f = !!this.ca.metodos['fotoWeb'];
    return u && f ? 'Al marcar se registrará tu ubicación y una selfie.' : u ? 'Al marcar se registrará tu ubicación.' : f ? 'Al marcar se tomará una selfie.' : '';
  }

  /** Selfie step: the type of punch being taken, the camera stream and any camera error. */
  camara: 'Entrada' | 'Salida' | null = null;
  camaraError = '';
  camaraLista = false;
  private stream: MediaStream | null = null;
  private video?: HTMLVideoElement;
  @ViewChild('video') set videoRef(r: ElementRef<HTMLVideoElement> | undefined) {
    this.video = r?.nativeElement;
    if (this.video && this.stream && this.video.srcObject !== this.stream) { this.video.srcObject = this.stream; this.video.play().catch(() => undefined); }
  }

  private async abrirCamara(tipo: 'Entrada' | 'Salida'): Promise<void> {
    this.camara = tipo; this.camaraError = ''; this.camaraLista = false;
    if (!navigator.mediaDevices?.getUserMedia) { this.camaraError = 'Este navegador no permite usar la cámara. Prueba con otro navegador o desde tu celular.'; return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (this.camara !== tipo) { s.getTracks().forEach((t) => t.stop()); return; }
      this.stream = s;
      if (this.video) { this.video.srcObject = s; await this.video.play().catch(() => undefined); }
      this.camaraLista = true;
    } catch (e) {
      const n = (e as DOMException)?.name;
      this.camaraError = n === 'NotAllowedError'
        ? 'Necesitamos la cámara para tomar tu selfie. Permite el acceso a la cámara en tu navegador y vuelve a intentarlo.'
        : n === 'NotFoundError' ? 'No encontramos una cámara en este dispositivo. Marca desde tu celular o avisa a RR.HH.'
        : 'No pudimos abrir la cámara. Cierra otras aplicaciones que la estén usando y vuelve a intentarlo.';
    }
  }

  tomarFoto(): void {
    const v = this.video, tipo = this.camara;
    if (!v || !tipo || !v.videoWidth) return;
    // Small JPEG (max 480 px wide): enough to recognize the person, light to store.
    const ancho = Math.min(480, v.videoWidth), alto = Math.round(ancho * v.videoHeight / v.videoWidth);
    const c = document.createElement('canvas');
    c.width = ancho; c.height = alto;
    const g = c.getContext('2d')!;
    g.translate(ancho, 0); g.scale(-1, 1); // same mirror image the person sees
    g.drawImage(v, 0, 0, ancho, alto);
    const foto = c.toDataURL('image/jpeg', 0.75);
    this.cerrarCamara();
    this.enviarMarca(tipo, foto);
  }

  cerrarCamara(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null; this.camara = null; this.camaraLista = false;
  }

  ngOnDestroy(): void { this.cerrarCamara(); }

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

/** Current position of the device (GPS when available). */
function ubicacionActual(): Promise<GeolocationPosition> {
  return new Promise((ok, mal) => {
    if (!navigator.geolocation) { mal({ code: 2 }); return; }
    navigator.geolocation.getCurrentPosition(ok, mal, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}
