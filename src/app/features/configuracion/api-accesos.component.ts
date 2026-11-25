import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiKey, EVENTOS_WEBHOOK, IpPermitida, NivelPermiso, RECURSOS_API, Webhook } from '../../core/sample/plataforma';
import { DatosService } from '../../core/datos.service';
import { HrDataService } from '../../core/hr-data.service';
import { UiStateService } from '../../core/ui-state.service';

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const HTTPS = /^https:\/\/[^\s/$.?#].[^\s]*$/i;

/** Random token shown once on creation; it only identifies keys inside this prototype. */

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
  /** Stored by the API (/api/datos: api-claves, api-ips, api-webhooks, integracion-contable). Keys keep only a hash and a masked token. */
  get keys(): ApiKey[] { return [...this.datos.lista$<ApiKey>('api-claves').value].reverse(); }
  get ips(): (IpPermitida & { id: number })[] { return this.datos.lista$<IpPermitida & { id: number }>('api-ips').value; }
  get hooks(): Webhook[] { return this.datos.lista$<Webhook>('api-webhooks').value; }

  keyModal: { descripcion: string; limitar: boolean; permisos: Record<string, NivelPermiso> } | null = null;
  tokenCreado: { descripcion: string; token: string } | null = null;
  borrarKey: ApiKey | null = null;
  ipModal: { ip: string; descripcion: string } | null = null;
  hookModal: { id: number | null; url: string; evento: string } | null = null;
  intento = false;
  contable = { sistema: 'SAP Business One', formato: 'JSON vía API', url: '', alCerrar: true };
  errContable = '';

  constructor(public ui: UiStateService, private datos: DatosService, private data: HrDataService) {
    datos.lista$<{ id: number; sistema: string; formato: string; url: string; alCerrar: boolean }>('integracion-contable').subscribe((l) => {
      if (l[0]) this.contable = { sistema: l[0].sistema, formato: l[0].formato, url: l[0].url, alCerrar: l[0].alCerrar };
    });
  }

  private hoy(): string { return new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

  /** Only the masked token is kept: the full one is shown once, when the key is created. */
  mask(k: ApiKey): string { return k.token; }

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
    // The API generates the token, stores only its hash and returns it this one time.
    this.datos.crear<ApiKey & { tokenNuevo?: string }>('api-claves', {
      descripcion: m.descripcion.trim(), limitarEmpresas: m.limitar,
      empresas: m.limitar ? this.data.empresa : 'Todas', ultimaIp: '—', ultimoAcceso: '—', creada: this.hoy(), permisos: { ...m.permisos },
    }).subscribe((k) => {
      this.keyModal = null;
      this.tokenCreado = { descripcion: m.descripcion.trim(), token: k.tokenNuevo ?? k.token };
    });
  }

  eliminarKey(): void {
    const k = this.borrarKey;
    if (!k) return;
    this.borrarKey = null;
    this.datos.eliminar('api-claves', k.id).subscribe(() => this.ui.toast(`API Key “${k.descripcion}” revocada`));
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
    this.datos.crear('api-ips', { ip: m.ip.trim(), descripcion: m.descripcion.trim() || '—', creada: this.hoy() })
      .subscribe(() => { this.ipModal = null; this.ui.toast(`IP ${m.ip.trim()} agregada a la whitelist`); });
  }
  quitarIp(ip: IpPermitida & { id: number }): void { this.datos.eliminar('api-ips', ip.id).subscribe(() => this.ui.toast(`IP ${ip.ip} eliminada`)); }

  // --- Integración contable -------------------------------------------------
  guardarContable(): void {
    this.errContable = this.contable.formato === 'JSON vía API' && !HTTPS.test(this.contable.url.trim())
      ? 'Para enviar por API indica una URL que comience con https://' : '';
    if (this.errContable) return;
    const actual = this.datos.valor<{ id: number }>('integracion-contable')[0];
    const guardar: Observable<unknown> = actual ? this.datos.actualizar('integracion-contable', { ...this.contable, id: actual.id }) : this.datos.crear('integracion-contable', { ...this.contable });
    guardar.subscribe(() => this.ui.toast('Integración contable guardada'));
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
    const actual = this.hooks.find((h) => h.id === m.id);
    const guardar: Observable<unknown> = actual ? this.datos.actualizar('api-webhooks', { ...actual, url: m.url.trim(), evento: m.evento })
      : this.datos.crear('api-webhooks', { url: m.url.trim(), evento: m.evento, activo: true });
    guardar.subscribe(() => { this.hookModal = null; this.ui.toast('Url webhook guardada'); });
  }
  toggleHook(h: Webhook): void { this.datos.actualizar('api-webhooks', { ...h, activo: !h.activo }).subscribe(); }
  quitarHook(h: Webhook): void { this.datos.eliminar('api-webhooks', h.id).subscribe(() => this.ui.toast('Url webhook eliminada')); }
}
