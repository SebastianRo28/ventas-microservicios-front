import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { UiStateService } from '../../core/ui-state.service';
import { GenericosService } from '../../core/genericos.service';
import { CONFIG_FORMS } from '../../core/sample/config-forms';

/** 5.10 Administración › Parámetros generales: datos de la organización (marca, seguridad e implementación tienen su propia pantalla). */
@Component({
  selector: 'app-parametros',
  templateUrl: './parametros.component.html'
})
export class ParametrosComponent {
  readonly tabs = ['Organización'];
  tab = 0;

  /** Stored in /api/configuracion/parametros-generales; the company name is the account's. */
  org = { compania: '', ...(this.gen.valores(CONFIG_FORMS['parametros-generales']) as Record<string, string | number>) } as {
    compania: string; pais: string; contabilidad: string; alertaRecontratacion: number; horas: number; dias: number;
    mailAdmin: string; mailCumple: string; mailEncuestas: string; formatoNombre: string;
  };
  errores: string[] = [];

  constructor(private data: HrDataService, private ui: UiStateService, private gen: GenericosService) {
    this.org.compania = data.empresa;
    if (!this.org.contabilidad) this.org.contabilidad = data.empresa;
  }

  guardarOrg(): void {
    this.errores = [];
    const o = this.org;
    if (!(o.horas > 0 && o.horas <= 48)) this.errores.push('Las horas laborales deben estar entre 1 y 48 por semana.');
    if (!(o.dias > 0 && o.dias <= 31)) this.errores.push('Los días laborales deben estar entre 1 y 31.');
    if (this.errores.length) return;
    const { compania, ...valores } = o;
    const cambios = this.gen.guardarConfig(CONFIG_FORMS['parametros-generales'], 'Parámetros generales',
      { ...valores, horas: Number(o.horas), dias: Number(o.dias), alertaRecontratacion: Number(o.alertaRecontratacion) });
    this.ui.toast(cambios.length ? 'Parámetros de organización guardados' : 'No hay cambios que guardar');
  }


}
