import { Injectable } from '@angular/core';
import { AuditService } from './audit.service';
import {
  COMISIONES_AFP, CONFIG_REM, ComisionAfp, ConfigRem, PARAMETROS_GENERALES, ParametroGeneral, TRAMOS_RENTA, TramoRenta
} from './sample/parametros-rem';

/** Legal payroll parameters and payroll settings. Other screens read RMV and asignación familiar from here. */
@Injectable({ providedIn: 'root' })
export class ParametrosRemService {
  readonly generales: ParametroGeneral[] = PARAMETROS_GENERALES;
  readonly afp: ComisionAfp[] = COMISIONES_AFP;
  readonly tramos: TramoRenta[] = TRAMOS_RENTA;
  readonly config: ConfigRem = CONFIG_REM;

  constructor(private audit: AuditService) {}

  valor(clave: ParametroGeneral['clave']): number { return this.generales.find((p) => p.clave === clave)!.valor; }
  get rmv(): number { return this.valor('rmv'); }
  /** Asignación familiar in soles: % of the RMV, rounded to cents. */
  get asignacionFamiliar(): number { return Math.round(this.rmv * this.valor('asigFamiliarPct')) / 100; }
  /** Minimum daily wage: RMV / 30. */
  get jornalMinimo(): number { return Math.round((this.rmv / 30) * 100) / 100; }

  actualizar(p: ParametroGeneral, valor: number, vigenteDesde: string): void {
    const anterior = `${p.valor} ${p.unidad} (desde ${p.vigenteDesde})`;
    p.valor = valor;
    p.vigenteDesde = vigenteDesde;
    this.registrar(`Parámetro ${p.nombre}`, anterior, `${valor} ${p.unidad} (desde ${vigenteDesde})`);
  }

  actualizarAfp(a: ComisionAfp, flujo: number, saldo: number): void {
    const anterior = `${a.comisionFlujoPct} % flujo · ${a.comisionSaldoPct} % saldo`;
    a.comisionFlujoPct = flujo;
    a.comisionSaldoPct = saldo;
    this.registrar(`Comisión AFP ${a.afp}`, anterior, `${flujo} % flujo · ${saldo} % saldo`);
  }

  actualizarTramo(t: TramoRenta, tasa: number): void {
    const anterior = `${t.tasaPct} %`;
    t.tasaPct = tasa;
    this.registrar(`Tramo 5ta ${t.desde}–${t.hasta ?? '∞'} UIT`, anterior, `${tasa} %`);
  }

  private registrar(entidad: string, anterior: string, actual: string): void {
    this.audit.registrar({ colaborador: '—', documento: '—', entidad, accion: 'Modificar', propiedad: 'valor', anterior, actual });
  }
}
