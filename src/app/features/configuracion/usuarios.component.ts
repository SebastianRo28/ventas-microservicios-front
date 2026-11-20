import { Component } from '@angular/core';
import { AuthService, mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { Colaborador, UsuarioCuenta } from '../../core/models';
import { PERMISOS, Perfil, Permiso } from '../../core/sample/compensaciones';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const UCOLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(200px, 1.4fr)' },
  { key: 'e', label: 'Correo', w: 'minmax(220px, 1.5fr)' },
  { key: 'p', label: 'Rol', filter: 'select', w: 'minmax(130px, 0.8fr)' },
  { key: 'c', label: 'Colaborador vinculado', w: 'minmax(200px, 1.2fr)' },
  { key: 'a', label: 'Último acceso', filter: 'none', w: 'minmax(140px, 0.9fr)' },
  { key: 's', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(100px, 0.6fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '130px' },
];
const PCOLS: Column[] = [
  { key: 'n', label: 'Perfil', w: 'minmax(220px, 1.6fr)' },
  { key: 'u', label: 'Usuarios asignados', type: 'number', filter: 'none', w: 'minmax(150px, 0.9fr)' },
  { key: 'f', label: 'Última actualización', type: 'date', filter: 'date', w: 'minmax(160px, 1fr)' },
  { key: 'm', label: 'Modificado por', filter: 'select', w: 'minmax(160px, 1fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sección 3 · Administración de Usuarios y Perfiles, with "Resumen del perfil". */
@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html'
})
export class UsuariosComponent {
  readonly ucols = UCOLS; readonly pcols = PCOLS;
  readonly areas = Object.keys(PERMISOS);
  readonly uActions: RowAction[] = ['editar', 'restablecer', 'pausa'];
  readonly roles = ['Administrador', 'Supervisor', 'Colaborador'];
  readonly pActions: RowAction[] = ['ver', 'eliminar'];
  tab = 0;
  usuarios: UsuarioCuenta[] = [];
  colaboradores: Colaborador[] = [];
  perfiles: Perfil[] = [];
  uRows: Row[] = [];
  pRows: Row[] = [];

  resumen: Perfil | null = null;
  resumenArea = 0;            // 0 = Resumen general, then index+1 of `areas`
  userModal: { id: number | null; nombre: string; correo: string; rol: string; colaboradorId: number | null } | null = null;
  /** Temporary password just generated: shown once so the administrator can hand it over. */
  temporal: { nombre: string; correo: string; password: string; creado: boolean } | null = null;
  confirmar: UsuarioCuenta | null = null;
  guardando = false;
  errorApi = '';
  perfilModal: { nombre: string } | null = null;
  intento = false;

  constructor(private data: HrDataService, public ui: UiStateService, private auth: AuthService) {
    data.perfiles().subscribe((p) => (this.perfiles = p));
    data.colaboradores().subscribe((c) => (this.colaboradores = [...c].sort((x, y) => x.apellidos.localeCompare(y.apellidos))));
    this.cargarUsuarios();
  }

  private cargarUsuarios(): void {
    this.data.usuarios().subscribe({
      next: (u) => { this.usuarios = u; this.refresh(); },
      error: (e) => this.ui.toast(mensajeError(e)),
    });
  }

  /** Collaborators without an account, plus the one linked to the account being edited. */
  get colaboradoresLibres(): Colaborador[] {
    const m = this.userModal;
    const usados = new Set(this.usuarios.filter((u) => u.id !== m?.id).map((u) => u.colaboradorId));
    return this.colaboradores.filter((c) => !usados.has(c.id));
  }

  count(perfil: string): number { return this.usuarios.filter((u) => u.perfil === perfil).length; }
  get sinUsuarios(): number { return this.perfiles.filter((p) => this.count(p.nombre) === 0).length; }

  private refresh(): void {
    this.uRows = this.usuarios.map((u) => ({
      id: u.id, n: u.nombre, e: u.correo, p: u.rol, c: u.colaborador ?? '—', a: u.ultimoAcceso,
      s: !u.activo ? { text: 'Inactivo', tone: 'gray' as const } : u.bloqueado ? { text: 'Bloqueado', tone: 'danger' as const }
        : u.debeCambiarPassword ? { text: 'Clave temporal', tone: 'warning' as const } : { text: 'Activo', tone: 'success' as const }, x: '',
    }));
    this.pRows = this.perfiles.map((p) => ({ id: p.id, n: p.nombre, u: this.count(p.nombre), f: p.actualizado, m: p.modificadoPor, x: '' }));
  }

  private hoy(): string { return new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

  // --- usuarios -------------------------------------------------------------
  nuevoUsuario(): void { this.intento = false; this.errorApi = ''; this.userModal = { id: null, nombre: '', correo: '', rol: 'Colaborador', colaboradorId: null }; }

  onUsuario(action: RowAction, row: Row): void {
    const u = this.usuarios.find((x) => x.id === row.id);
    if (!u) return;
    if (action === 'editar') { this.intento = false; this.errorApi = ''; this.userModal = { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, colaboradorId: u.colaboradorId }; }
    if (action === 'restablecer') this.confirmar = u;
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

  get correoInvalido(): boolean { return !!this.userModal && !EMAIL_RE.test(this.userModal.correo.trim()); }
  get correoDuplicado(): boolean {
    const m = this.userModal;
    return !!m && this.usuarios.some((u) => u.id !== m.id && u.correo.toLowerCase() === m.correo.trim().toLowerCase());
  }
  get faltaColaborador(): boolean { return !!this.userModal && this.userModal.rol !== 'Administrador' && this.userModal.colaboradorId === null; }

  guardarUsuario(): void {
    this.intento = true;
    this.errorApi = '';
    const m = this.userModal;
    if (!m || !m.nombre.trim() || this.correoInvalido || this.correoDuplicado || this.faltaColaborador || this.guardando) return;
    const datos = { nombre: m.nombre.trim(), correo: m.correo.trim(), rol: m.rol, colaboradorId: m.colaboradorId };
    this.guardando = true;
    const fin = () => { this.guardando = false; this.userModal = null; this.cargarUsuarios(); };
    const fallo = (err: unknown) => { this.guardando = false; this.errorApi = mensajeError(err); };
    if (m.id === null) {
      this.data.crearUsuario(datos).subscribe({
        next: (r) => { fin(); this.temporal = { nombre: r.usuario.nombre, correo: r.usuario.correo, password: r.passwordTemporal, creado: true }; },
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
      next: (r) => { this.temporal = { nombre: r.usuario.nombre, correo: r.usuario.correo, password: r.passwordTemporal, creado: false }; this.cargarUsuarios(); },
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
    if (action === 'eliminar') {
      if (p.predefinido) { this.ui.toast(`“${p.nombre}” es un perfil predefinido y no se puede eliminar`); return; }
      const n = this.count(p.nombre);
      if (n) { this.ui.toast(`No se puede eliminar “${p.nombre}”: tiene ${n} usuario(s) asignado(s)`); return; }
      this.perfiles.splice(this.perfiles.indexOf(p), 1);
      this.ui.toast(`Perfil “${p.nombre}” eliminado`);
      this.refresh();
    }
  }

  /** Administrators can do everything; normal users only reach support; custom profiles use their sheet. */
  permisos(p: Perfil, area: string): [string, Permiso][] {
    const base = PERMISOS[area] ?? [];
    if (p.nombre === 'Administrador') return base.map(([n, v]) => [n, v === 'Sí' || v === 'No' ? 'Sí' : 'Modificación']);
    if (p.nombre === 'Normal / Colaborador') return base.map(([n]) => [n, area === 'Acceso a Soporte' ? 'Sí' : 'No']);
    return base;
  }

  crearPerfil(): void {
    this.intento = true;
    const m = this.perfilModal;
    if (!m || !m.nombre.trim()) return;
    if (this.perfiles.some((p) => p.nombre.toLowerCase() === m.nombre.trim().toLowerCase())) return;
    this.perfiles.push({ id: Math.max(...this.perfiles.map((p) => p.id)) + 1, nombre: m.nombre.trim(), predefinido: false,
      actualizado: this.hoy(), modificadoPor: this.data.usuario.nombre, creado: this.hoy() });
    this.perfilModal = null;
    this.refresh();
    this.ui.toast(`Perfil “${m.nombre.trim()}” creado sin usuarios`);
  }

  get perfilDuplicado(): boolean {
    const m = this.perfilModal;
    return !!m && this.perfiles.some((p) => p.nombre.toLowerCase() === m.nombre.trim().toLowerCase());
  }
}
