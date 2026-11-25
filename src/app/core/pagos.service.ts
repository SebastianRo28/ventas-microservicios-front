import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { API_URL } from './api';

export interface TarjetaPago { marca: string; tarjeta: string; titular: string; modo: string; registradaEn: string; autorizadoPor: string; }
export interface CobroPago {
  id: number; factura: string; monto: number; origen: 'Automatico' | 'Cliente' | 'Consola'; estado: string; mensaje: string | null;
  codigoAutorizacion: string | null; tarjeta: string; fecha: string; actor: string; orderNumber: string;
}
export interface PagosCuenta { modo: 'Simulado' | 'Sandbox' | 'Produccion'; configurado: boolean; tarjeta: TarjetaPago | null; cobros: CobroPago[]; textoAutorizacion: string; }
interface SesionRegistro { modo: string; script: string | null; config: Record<string, unknown> | null; authorization: string | null; keyRsa: string | null; }
/** What the Izipay form returns (payloadHttp and signature are checked by the API). */
interface RespuestaIzipay { code?: string; messageUser?: string; payloadHttp?: string; signature?: string; }
type IzipayCtor = new (o: { config: Record<string, unknown> }) => {
  LoadForm(o: { authorization: string; keyRSA: string; callbackResponse: (r: RespuestaIzipay) => void }): void;
};

export const MARCAS: Record<string, string> = { VS: 'Visa', MC: 'Mastercard', AE: 'American Express', DN: 'Diners Club' };

/**
 * Card for the automatic monthly charge (Izipay). The card is typed in Izipay's own form: Nexo RH only receives the
 * token, which the API stores encrypted. In "Simulado" mode (no Izipay keys configured) internal test cards are used.
 */
@Injectable({ providedIn: 'root' })
export class PagosService {
  private scripts = new Map<string, Promise<void>>();

  constructor(private http: HttpClient) {}

  ver(): Observable<PagosCuenta> { return this.http.get<PagosCuenta>(`${API_URL}/cuenta/pagos`); }
  retirar(): Observable<void> { return this.http.delete<void>(`${API_URL}/cuenta/pagos/tarjeta`); }
  pagar(numero: string): Observable<CobroPago> { return this.http.post<CobroPago>(`${API_URL}/cuenta/facturas/${encodeURIComponent(numero)}/pagar`, null); }

  /** Simulated mode: registers an internal test card that is approved or always declined. */
  registrarSimulada(tipo: 'aprobada' | 'rechazada'): Observable<TarjetaPago> {
    return this.http.post<TarjetaPago>(`${API_URL}/cuenta/pagos/tarjeta`, { autorizo: true, simulada: tipo });
  }

  /** Opens Izipay's pop-up to register the card and sends its signed answer to the API. */
  registrarConIzipay(): Observable<TarjetaPago> {
    return this.http.post<SesionRegistro>(`${API_URL}/cuenta/pagos/sesion`, null).pipe(
      switchMap((s) => from(this.abrirFormulario(s))),
      switchMap((r) => this.http.post<TarjetaPago>(`${API_URL}/cuenta/pagos/tarjeta`, { autorizo: true, payloadHttp: r.payloadHttp, signature: r.signature })));
  }

  private async abrirFormulario(s: SesionRegistro): Promise<RespuestaIzipay> {
    if (!s.script || !s.config || !s.authorization || !s.keyRsa) throw new Error('No se pudo abrir el formulario de Izipay.');
    await this.cargarScript(s.script);
    const Izipay = (window as unknown as { Izipay?: IzipayCtor }).Izipay;
    if (!Izipay) throw new Error('No se pudo cargar el formulario de Izipay.');
    return new Promise<RespuestaIzipay>((resolve, reject) => {
      try {
        new Izipay({ config: s.config! }).LoadForm({
          authorization: s.authorization!, keyRSA: s.keyRsa!,
          callbackResponse: (r) => (r?.code === '00' && r.payloadHttp ? resolve(r) : reject(new Error(r?.messageUser || 'Izipay no registró la tarjeta.'))),
        });
      } catch (e) {
        reject(new Error((e as { message?: string })?.message || 'No se pudo abrir el formulario de Izipay.'));
      }
    });
  }

  private cargarScript(src: string): Promise<void> {
    if (!/^https:\/\/([a-z0-9-]+\.)*izipay\.pe\//.test(src)) return Promise.reject(new Error('Origen del formulario no permitido.'));
    let p = this.scripts.get(src);
    if (!p) {
      p = new Promise<void>((resolve, reject) => {
        const el = Object.assign(document.createElement('script'), { src, async: true, onload: () => resolve(), onerror: () => reject(new Error('No se pudo cargar el formulario de Izipay.')) });
        document.head.appendChild(el);
      });
      p.catch(() => this.scripts.delete(src));
      this.scripts.set(src, p);
    }
    return p;
  }
}
