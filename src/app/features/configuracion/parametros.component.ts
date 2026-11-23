import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { UiStateService } from '../../core/ui-state.service';

/** 5.10 Administración › Parámetros generales: datos de la organización (marca, seguridad e implementación tienen su propia pantalla). */
@Component({
  selector: 'app-parametros',
  templateUrl: './parametros.component.html'
})
export class ParametrosComponent {
  readonly tabs = ['Organización'];
  tab = 0;

  org = {
    pais: 'Perú', compania: '', contabilidad: 'Comercial Andina', alertaRecontratacion: 30, horas: 43, dias: 30,
    mailAdmin: 'Gestión de Personas', mailCumple: 'Comunicaciones Internas', mailEncuestas: 'Clima y Cultura',
    formatoNombre: 'Apellido, Nombre',
  };
  errores: string[] = [];

  constructor(private data: HrDataService, private ui: UiStateService) {
    this.org.compania = data.empresa;
  }

  guardarOrg(): void {
    this.errores = [];
    const o = this.org;
    if (!o.compania.trim()) this.errores.push('El nombre de la compañía es obligatorio.');
    if (!(o.horas > 0 && o.horas <= 48)) this.errores.push('Las horas laborales deben estar entre 1 y 48 por semana.');
    if (!(o.dias > 0 && o.dias <= 31)) this.errores.push('Los días laborales deben estar entre 1 y 31.');
    if (this.errores.length) return;
    this.data.empresa = o.compania.trim();
    this.ui.toast('Parámetros de organización guardados');
  }


}
