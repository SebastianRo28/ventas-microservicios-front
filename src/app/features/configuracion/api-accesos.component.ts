import { Component } from '@angular/core';
import { ApiKey, EVENTOS_WEBHOOK, IpPermitida, NivelPermiso, RECURSOS_API, Webhook, API_KEYS, WHITELIST, WEBHOOKS } from '../../core/sample/plataforma';
import { UiStateService } from '../../core/ui-state.service';

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const HTTPS = /^https:\/\/[^\s/$.?#].[^\s]*$/i;

/** Random token shown once on creation; it only identifies keys inside this prototype. */
function nuevoToken(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'nx_live_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** P-02.10 Administración › Accesos API (PRO): keys, IP whitelist, accounting integration and webhooks. */
@Component({
  selector: 'app-api-accesos',
  templateUrl: './api-accesos.component.html'
})
export class ApiAccesosComponent {
  readonly tabs = ['Accesos API', 'Whitelist de Acceso', 'Integración Contable', 'Urls Webhook'];
  readonly recursos = RECURSOS_API;
  readonly eventos = EVENTOS_WEBHOOK;
  tab = 0;
  keys: ApiKey[] = API_KEYS;
  ips: IpPermitida[] = WHITELIST;
  hooks: Webhook[] = WEBHOOKS;
  visibles = new Set<number>();

  keyModal: { descripcion: string; limitar: boolean; permisos: Record<string, NivelPermiso> } | null = null;
  tokenCreado: { descripcion: string; token: string } | null = null;
  borrarKey: ApiKey | null = null;
  ipModal: { ip: string; descripcion: string } | null = null;
  hookModal: { id: number | null; url: string; evento: string } | null = null;
  intento = false;
  contable = { sistema: 'SAP Business One', formato: 'JSON vía API', url: '', alCerrar: true };
  errContable = '';

  constructor(public ui: UiStateService) {}

  private hoy(): string { return new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

  mask(k: ApiKey): string { return this.visibles.has(k.id) ? k.token : k.token.slice(0, 8) + '••••••••••••'; }
  toggleToken(k: ApiKey): void { this.visibles.has(k.id) ? this.visibles.delete(k.id) : this.visibles.add(k.id); }

  async copiar(texto: string): Promise<void> {
    try { await navigator.clipboard.writeText(texto); this.ui.toast('Token copiado al portapapeles'); }
    catch { this.ui.toast('No se pudo copiar automáticamente; selecciona el token y cópialo'); }
  }

  // --- API keys -------------------------------------------------------------
  nuevaKey(): void {
    this.intento = false;
    this.keyModal = { descripcion: '', limitar: false, permisos: Object.fromEntries(RECURSOS_API.map((r) => [r, 'No' as NivelPermiso])) };
  }

  get sinPermisos(): boolean { return !!this.keyModal && Object.values(this.keyModal.permisos).every((p) => p === 'No'); }

  crearKey(): void {
    this.intento = true;
    const m = this.keyModal;
    if (!m || !m.descripcion.trim() || this.sinPermisos) return;
    const token = nuevoToken();
    this.keys.unshift({
      id: Math.max(0, ...this.keys.map((k) => k.id)) + 1, descripcion: m.descripcion.trim(), limitarEmpresas: m.limitar, token,
      empresas: m.limitar ? 'Comercial Andina S.A.C.' : 'Todas', ultimaIp: '—', ultimoAcceso: '—', creada: this.hoy(), permisos: { ...m.permisos },
    });
    this.keyModal = null;
    this.tokenCreado = { descripcion: m.descripcion.trim(), token };
  }

  eliminarKey(): void {
    const k = this.borrarKey;
    if (!k) return;
    this.keys.splice(this.keys.indexOf(k), 1);
    this.borrarKey = null;
    this.ui.toast(`API Key “${k.descripcion}” revocada`);
  }

  // --- Whitelist ------------------------------------------------------------
  get ipInvalida(): string {
    const m = this.ipModal;
    if (!m) return '';
    if (!IPV4.test(m.ip.trim())) return 'Ingresa una IPv4 válida, por ejemplo 190.12.45.201.';
    if (this.ips.some((i) => i.ip === m.ip.trim())) return 'Esa IP ya está en la lista.';
    return '';
  }
  agregarIp(): void {
    this.intento = true;
    const m = this.ipModal;
    if (!m || this.ipInvalida) return;
    this.ips.push({ ip: m.ip.trim(), descripcion: m.descripcion.trim() || '—', creada: this.hoy() });
    this.ipModal = null;
    this.ui.toast(`IP ${m.ip.trim()} agregada a la whitelist`);
  }
  quitarIp(ip: IpPermitida): void { this.ips.splice(this.ips.indexOf(ip), 1); this.ui.toast(`IP ${ip.ip} eliminada`); }

  // --- Integración contable -------------------------------------------------
  guardarContable(): void {
    this.errContable = this.contable.formato === 'JSON vía API' && !HTTPS.test(this.contable.url.trim())
      ? 'Para enviar por API indica una URL que comience con https://' : '';
    if (!this.errContable) this.ui.toast('Integración contable guardada');
  }

  // --- Webhooks -------------------------------------------------------------
  get urlInvalida(): boolean { return !!this.hookModal && !HTTPS.test(this.hookModal.url.trim()); }
  editarHook(h: Webhook | null): void {
    this.intento = false;
    this.hookModal = h ? { id: h.id, url: h.url, evento: h.evento } : { id: null, url: '', evento: EVENTOS_WEBHOOK[0] };
  }
  guardarHook(): void {
    this.intento = true;
    const m = this.hookModal;
    if (!m || this.urlInvalida) return;
    if (m.id === null) this.hooks.push({ id: Math.max(-1, ...this.hooks.map((h) => h.id)) + 1, url: m.url.trim(), evento: m.evento, activo: true });
    else Object.assign(this.hooks.find((h) => h.id === m.id)!, { url: m.url.trim(), evento: m.evento });
    this.hookModal = null;
    this.ui.toast('Url webhook guardada');
  }
  toggleHook(h: Webhook): void { h.activo = !h.activo; }
  quitarHook(h: Webhook): void { this.hooks.splice(this.hooks.indexOf(h), 1); this.ui.toast('Url webhook eliminada'); }
}
