import { Component } from '@angular/core';
import { AuthService, RolUsuario, mensajeError, rolPuedeVer } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador, PerfilCuenta, UsuarioCuenta } from '../../core/models';
import { UiStateService } from '../../core/ui-state.service';
import { ContextoService } from '../../core/contexto.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const UCOLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(200px, 1.4fr)' },
  { key: 'e', label: 'Correo', w: 'minmax(220px, 1.5fr)' },
  { key: 'pf', label: 'Perfil', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'p', label: 'Rol', filter: 'select', w: 'minmax(120px, 0.8fr)' },
  { key: 'c', label: 'Colaborador vinculado', w: 'minmax(200px, 1.2fr)' },
  { key: 'a', label: 'Último acceso', filter: 'none', w: 'minmax(140px, 0.9fr)' },
  { key: 's', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(100px, 0.6fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '130px' },
];
const PCOLS: Column[] = [
  { key: 'n', label: 'Perfil', w: 'minmax(220px, 1.6fr)' },
  { key: 'r', label: 'Rol base', filter: 'select', w: 'minmax(130px, 0.8fr)' },
  { key: 'u', label: 'Usuarios asignados', type: 'number', filter: 'none', w: 'minmax(150px, 0.9fr)' },
  { key: 'f', label: 'Última actualización', type: 'date', filter: 'date', w: 'minmax(160px, 1fr)' },
  { key: 'm', label: 'Modificado por', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '130px' },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Modules and the screen that represents them, to show what each role can open (same rules as the menu and routes). */
const MODULOS: { nombre: string; ruta: string; modulo?: string }[] = [
  { nombre: 'Mi Portal', ruta: 'portal' },
  { nombre: 'Colaboradores vigentes y fichas', ruta: 'admin/colaboradores/vigentes' },
  { nombre: 'Administrativo (organización, asistencia, documentos)', ruta: 'admin/panel' },
  { nombre: 'Control de Asistencia · panel, marcaciones, ausencias y horas extras', ruta: 'ca/panel', modulo: 'ATTENDANCE' },
  { nombre: 'Control de Asistencia · turnos, recintos y configuración', ruta: 'ca/turnos', modulo: 'ATTENDANCE' },
  { nombre: 'Remuneraciones', ruta: 'rem', modulo: 'PAYROLL' },
  { nombre: 'Desarrollo Organizacional', ruta: 'do' },
  { nombre: 'Seguridad y Salud en el Trabajo', ruta: 'sst', modulo: 'SST' },
  { nombre: 'Reportería', ruta: 'rep' },
  { nombre: 'Configuración del sistema (usuarios, perfiles, parámetros)', ruta: 'configuracion/usuarios' },
];
const ALCANCE: Record<RolUsuario, string> = {
  Administrador: 'Todos los colaboradores.',
  Supervisor: 'Sus propios datos y los de su equipo (quienes dependen de él en el organigrama, directa o indirectamente). Aprueba y corrige la asistencia de su equipo, nunca la propia.',
  Colaborador: 'Solo sus propios datos. Del resto ve el directorio sin datos personales ni sueldos.',
};

/** Sección 3 · Administración de Usuarios y Perfiles, with "Resumen del perfil". */
@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html'
})
export class UsuariosComponent {
  readonly ucols = UCOLS; readonly pcols = PCOLS;
  /** Permissions of modules the company has not contracted are not shown (spec. 6.2). */
  get modulos(): typeof MODULOS { return MODULOS.filter((m) => this.ctx.modulo(m.modulo)); }
  readonly alcance = ALCANCE;
  readonly uActions: RowAction[] = ['editar', 'restablecer', 'pausa'];
  readonly roles: RolUsuario[] = ['Administrador', 'Supervisor', 'Colaborador'];
  readonly pActions: RowAction[] = ['ver', 'editar', 'eliminar'];
  tab = 0;
  usuarios: UsuarioCuenta[] = [];
  colaboradores: Colaborador[] = [];
  perfiles: PerfilCuenta[] = [];
  uRows: Row[] = [];
  pRows: Row[] = [];

  resumen: PerfilCuenta | null = null;
  resumenArea = 0;            // 0 = Resumen general, 1 = Accesos
  userModal: { id: number | null; nombre: string; correo: string; perfilId: number | null; colaboradorId: number | null; invitar: boolean; dobleFactor: boolean } | null = null;
  /** Temporary password just generated: shown once so the administrator can hand it over. */
  temporal: { nombre: string; correo: string; password: string; creado: boolean } | null = null;
  confirmar: UsuarioCuenta | null = null;
  guardando = false;
  errorApi = '';
  perfilModal: { id: number | null; nombre: string; rol: RolUsuario; descripcion: string; predefinido: boolean; usuarios: number } | null = null;
  eliminarPerfilConfirmar: PerfilCuenta | null = null;
  intento = false;

  constructor(private data: HrDataService, public ui: UiStateService, private auth: AuthService, private ctx: ContextoService) {
    data.colaboradores().subscribe((c) => (this.colaboradores = [...c].sort((x, y) => x.apellidos.localeCompare(y.apellidos))));
    this.cargarUsuarios();
    this.cargarPerfiles();
  }

  private cargarUsuarios(): void {
    this.data.usuarios().subscribe({
      next: (u) => { this.usuarios = u; this.refresh(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }
  private cargarPerfiles(): void {
    this.data.perfiles().subscribe({
      next: (p) => { this.perfiles = p; this.refresh(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  /** Collaborators without an account, plus the one linked to the account being edited. */
  get colaboradoresLibres(): Colaborador[] {
    const m = this.userModal;
    const usados = new Set(this.usuarios.filter((u) => u.id !== m?.id).map((u) => u.colaboradorId));
    return this.colaboradores.filter((c) => !usados.has(c.id));
  }

  get sinUsuarios(): number { return this.perfiles.filter((p) => p.usuarios === 0).length; }
  perfil(id: number | null): PerfilCuenta | undefined { return this.perfiles.find((p) => p.id === id); }
  /** "Normal / Colaborador": the predefined profile of the Colaborador role. */
  get perfilNormal(): PerfilCuenta | undefined { return this.perfiles.find((p) => p.predefinido && p.rol === 'Colaborador'); }

  private refresh(): void {
    this.uRows = this.usuarios.map((u) => ({
      id: u.id, n: u.nombre, e: u.correo, pf: u.perfil, p: u.rol, c: u.colaborador ?? '—', a: u.ultimoAcceso,
      s: !u.activo ? { text: 'Inactivo', tone: 'gray' as const } : u.pendienteActivacion ? { text: 'Invitación pendiente', tone: 'info' as const }
        : u.bloqueado ? { text: 'Bloqueado', tone: 'danger' as const }
        : u.debeCambiarPassword ? { text: 'Clave temporal', tone: 'warning' as const } : { text: 'Activo', tone: 'success' as const }, x: '',
    }));
    this.pRows = this.perfiles.map((p) => ({
      id: p.id, n: p.predefinido ? `${p.nombre} (predefinido)` : p.nombre, r: p.rol, u: p.usuarios, f: p.actualizado, m: p.modificadoPor || '—', x: '',
    }));
  }

  // --- usuarios -------------------------------------------------------------
  nuevoUsuario(): void {
    this.intento = false; this.errorApi = '';
    this.userModal = { id: null, nombre: '', correo: '', perfilId: this.perfilNormal?.id ?? null, colaboradorId: null, invitar: true, dobleFactor: false };
  }

  onUsuario(action: RowAction, row: Row): void {
    const u = this.usuarios.find((x) => x.id === row.id);
    if (!u) return;
    if (action === 'editar') { this.intento = false; this.errorApi = ''; this.userModal = { id: u.id, nombre: u.nombre, correo: u.correo, perfilId: u.perfilId, colaboradorId: u.colaboradorId, invitar: false, dobleFactor: u.dobleFactor }; }
    // An invited account has no password yet: "restablecer" re-sends its invitation.
    if (action === 'restablecer' && u.pendienteActivacion) this.reenviarInvitacion(u);
    else if (action === 'restablecer') this.confirmar = u;
    if (action === 'pausa') {
      this.data.estadoUsuario(u.id, !u.activo).subscribe({
        next: (r) => { this.ui.toast(`${r.nombre}: usuario ${r.activo ? 'activado' : 'desactivado'}`); this.cargarUsuarios(); },
        error: (err) => this.ui.toast(mensajeError(err)),
      });
    }
  }

  /** Picking the collaborator fills the name and email when they are empty. */
  elegirColaborador(id: number | null): void {
    const m = this.userModal;
    if (!m) return;
    m.colaboradorId = id;
    const c = this.colaboradores.find((x) => x.id === id);
    if (c && !m.nombre.trim()) m.nombre = `${c.nombres} ${c.apellidos}`;
    if (c && !m.correo.trim() && c.detalle?.emailCorporativo) m.correo = c.detalle.emailCorporativo;
  }

  get rolElegido(): RolUsuario | undefined { return this.perfil(this.userModal?.perfilId ?? null)?.rol; }
  get correoInvalido(): boolean { return !!this.userModal && !EMAIL_RE.test(this.userModal.correo.trim()); }
  get correoDuplicado(): boolean {
    const m = this.userModal;
    return !!m && this.usuarios.some((u) => u.id !== m.id && u.correo.toLowerCase() === m.correo.trim().toLowerCase());
  }
  get faltaColaborador(): boolean { return !!this.userModal && !!this.rolElegido && this.rolElegido !== 'Administrador' && this.userModal.colaboradorId === null; }

  guardarUsuario(): void {
    this.intento = true;
    this.errorApi = '';
    const m = this.userModal;
    if (!m || !m.nombre.trim() || m.perfilId === null || this.correoInvalido || this.correoDuplicado || this.faltaColaborador || this.guardando) return;
    const datos = { nombre: m.nombre.trim(), correo: m.correo.trim(), perfilId: m.perfilId, colaboradorId: m.colaboradorId, invitar: m.id === null ? m.invitar : undefined };
    this.guardando = true;
    const fin = () => { this.guardando = false; this.userModal = null; this.cargarUsuarios(); this.cargarPerfiles(); };
    const fallo = (err: unknown) => { this.guardando = false; this.errorApi = mensajeError(err); };
    if (m.id === null) {
      this.data.crearUsuario(datos).subscribe({
        next: (r) => {
          fin();
          if (r.passwordTemporal) this.temporal = { nombre: r.usuario.nombre, correo: r.usuario.correo, password: r.passwordTemporal, creado: true };
          else this.ui.toast(`Invitación enviada a ${r.usuario.correo}`);
        },
        error: fallo,
      });
    } else {
      this.data.modificarUsuario(m.id, datos).subscribe({ next: () => { fin(); this.ui.toast('Usuario actualizado'); }, error: fallo });
    }
  }

  restablecer(): void {
    const u = this.confirmar;
    if (!u) return;
    this.confirmar = null;
    this.data.restablecerUsuario(u.id).subscribe({
      next: (r) => { this.temporal = { nombre: r.usuario.nombre, correo: r.usuario.correo, password: r.passwordTemporal ?? '', creado: false }; this.cargarUsuarios(); },
      error: (err) => this.ui.toast(mensajeError(err)),
    });
  }

  reenviarInvitacion(u: UsuarioCuenta): void {
    this.data.invitarUsuario(u.id).subscribe({
      next: (r) => this.ui.toast(`Invitación reenviada a ${r.correo}`),
      error: (err) => this.ui.toast(mensajeError(err)),
    });
  }

  /** From the edit modal: the person will set it up again (mandatory if the company policy requires it). */
  quitarDobleFactor(): void {
    const m = this.userModal;
    if (!m || m.id === null) return;
    this.data.quitarDobleFactor(m.id).subscribe({
      next: (r) => { m.dobleFactor = false; this.ui.toast(`Doble factor quitado a ${r.nombre}`); this.cargarUsuarios(); },
      error: (err) => this.ui.toast(mensajeError(err)),
    });
  }

  copiar(): void {
    const t = this.temporal;
    if (!t) return;
    navigator.clipboard?.writeText(t.password).then(
      () => this.ui.toast('Contraseña copiada'),
      () => this.ui.toast('No se pudo copiar: selecciónala y cópiala manualmente'));
  }

  // --- perfiles -------------------------------------------------------------
  onPerfil(action: RowAction, row: Row): void {
    const p = this.perfiles.find((x) => x.id === row.id);
    if (!p) return;
    if (action === 'ver') { this.resumen = p; this.resumenArea = 0; }
    if (action === 'editar') this.editarPerfil(p);
    if (action === 'eliminar') {
      if (p.predefinido) { this.ui.toast(`“${p.nombre}” es un perfil predefinido y no se puede eliminar`); return; }
      if (p.usuarios) { this.ui.toast(`No se puede eliminar “${p.nombre}”: tiene ${p.usuarios} usuario(s) asignado(s)`); return; }
      this.eliminarPerfilConfirmar = p;
    }
  }

  /** What the role can open, with the same rules as the menu and the routes. */
  puede(rol: RolUsuario, ruta: string): boolean { return rolPuedeVer(rol, ruta); }

  nuevoPerfil(): void {
    this.intento = false; this.errorApi = '';
    this.perfilModal = { id: null, nombre: '', rol: 'Colaborador', descripcion: '', predefinido: false, usuarios: 0 };
  }
  editarPerfil(p: PerfilCuenta): void {
    this.resumen = null;
    this.intento = false; this.errorApi = '';
    this.perfilModal = { id: p.id, nombre: p.nombre, rol: p.rol, descripcion: p.descripcion, predefinido: p.predefinido, usuarios: p.usuarios };
  }
  /** Whether saving changes the role of users that already have this profile (their sessions will close). */
  get cambiaRolConUsuarios(): boolean {
    const m = this.perfilModal;
    return !!m && m.id !== null && m.usuarios > 0 && this.perfil(m.id)?.rol !== m.rol;
  }

  get perfilDuplicado(): boolean {
    const m = this.perfilModal;
    return !!m && this.perfiles.some((p) => p.id !== m.id && p.nombre.toLowerCase() === m.nombre.trim().toLowerCase());
  }

  guardarPerfil(): void {
    this.intento = true;
    this.errorApi = '';
    const m = this.perfilModal;
    if (!m || !m.nombre.trim() || this.perfilDuplicado || this.guardando) return;
    const datos = { nombre: m.nombre.trim(), rol: m.rol, descripcion: m.descripcion.trim() };
    this.guardando = true;
    const obs = m.id === null ? this.data.crearPerfil(datos) : this.data.modificarPerfil(m.id, datos);
    obs.subscribe({
      next: (p) => {
        this.guardando = false;
        this.perfilModal = null;
        this.ui.toast(m.id === null ? `Perfil “${p.nombre}” creado` : `Perfil “${p.nombre}” actualizado`);
        this.cargarPerfiles();
        this.cargarUsuarios();
      },
      error: (err) => { this.guardando = false; this.errorApi = mensajeError(err); },
    });
  }

  eliminarPerfil(): void {
    const p = this.eliminarPerfilConfirmar;
    if (!p) return;
    this.eliminarPerfilConfirmar = null;
    this.data.eliminarPerfil(p.id).subscribe({
      next: () => { this.ui.toast(`Perfil “${p.nombre}” eliminado`); this.cargarPerfiles(); },
      error: (err) => this.ui.toast(mensajeError(err)),
    });
  }
}
