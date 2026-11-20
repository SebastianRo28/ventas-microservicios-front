import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { PERMISOS, Perfil, Permiso, Usuario } from '../../core/sample/compensaciones';
import { UiStateService } from '../../core/ui-state.service';
import { Column, Row, RowAction } from '../../shared/data-table/data-table.models';

const UCOLS: Column[] = [
  { key: 'n', label: 'Nombre', w: 'minmax(200px, 1.4fr)' },
  { key: 'e', label: 'Correo', w: 'minmax(220px, 1.5fr)' },
  { key: 'p', label: 'Perfil', filter: 'select', w: 'minmax(170px, 1fr)' },
  { key: 'a', label: 'Último acceso', type: 'date', filter: 'date', w: 'minmax(140px, 0.9fr)' },
  { key: 's', label: 'Estado', type: 'badge', filter: 'select', w: 'minmax(100px, 0.6fr)' },
  { key: 'x', label: 'Acciones', type: 'actions', filter: 'none', sortable: false, w: '100px' },
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
  readonly uActions: RowAction[] = ['editar', 'pausa'];
  readonly pActions: RowAction[] = ['ver', 'eliminar'];
  tab = 0;
  usuarios: Usuario[] = [];
  perfiles: Perfil[] = [];
  uRows: Row[] = [];
  pRows: Row[] = [];

  resumen: Perfil | null = null;
  resumenArea = 0;            // 0 = Resumen general, then index+1 of `areas`
  userModal: { id: number | null; nombre: string; correo: string; perfil: string } | null = null;
  perfilModal: { nombre: string } | null = null;
  intento = false;

  constructor(private data: HrDataService, public ui: UiStateService) {
    data.perfiles().subscribe((p) => (this.perfiles = p));
    data.usuarios().subscribe((u) => (this.usuarios = u));
    this.refresh();
  }

  count(perfil: string): number { return this.usuarios.filter((u) => u.perfil === perfil).length; }
  get sinUsuarios(): number { return this.perfiles.filter((p) => this.count(p.nombre) === 0).length; }

  private refresh(): void {
    this.uRows = this.usuarios.map((u) => ({
      id: u.id, n: u.nombre, e: u.correo, p: u.perfil, a: u.acceso,
      s: u.activo ? { text: 'Activo', tone: 'success' as const } : { text: 'Inactivo', tone: 'gray' as const }, x: '',
    }));
    this.pRows = this.perfiles.map((p) => ({ id: p.id, n: p.nombre, u: this.count(p.nombre), f: p.actualizado, m: p.modificadoPor, x: '' }));
  }

  private hoy(): string { return new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

  // --- usuarios -------------------------------------------------------------
  nuevoUsuario(): void { this.intento = false; this.userModal = { id: null, nombre: '', correo: '', perfil: 'Normal / Colaborador' }; }

  onUsuario(action: RowAction, row: Row): void {
    const u = this.usuarios.find((x) => x.id === row.id);
    if (!u) return;
    if (action === 'editar') { this.intento = false; this.userModal = { id: u.id, nombre: u.nombre, correo: u.correo, perfil: u.perfil }; }
    if (action === 'pausa') { u.activo = !u.activo; this.ui.toast(`${u.nombre}: usuario ${u.activo ? 'activado' : 'desactivado'}`); this.refresh(); }
  }

  get correoInvalido(): boolean { return !!this.userModal && !EMAIL_RE.test(this.userModal.correo.trim()); }
  get correoDuplicado(): boolean {
    const m = this.userModal;
    return !!m && this.usuarios.some((u) => u.id !== m.id && u.correo.toLowerCase() === m.correo.trim().toLowerCase());
  }

  guardarUsuario(): void {
    this.intento = true;
    const m = this.userModal;
    if (!m || !m.nombre.trim() || this.correoInvalido || this.correoDuplicado) return;
    if (m.id === null) {
      this.usuarios.push({ id: Math.max(...this.usuarios.map((u) => u.id)) + 1, nombre: m.nombre.trim(), correo: m.correo.trim(), perfil: m.perfil, acceso: '—', activo: true });
      this.ui.toast(`Usuario creado. Se envió la invitación a ${m.correo.trim()}`);
    } else {
      const u = this.usuarios.find((x) => x.id === m.id);
      if (u) Object.assign(u, { nombre: m.nombre.trim(), correo: m.correo.trim(), perfil: m.perfil });
      this.ui.toast('Usuario actualizado');
    }
    this.userModal = null;
    this.refresh();
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
