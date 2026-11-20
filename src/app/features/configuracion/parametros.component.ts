import { Component } from '@angular/core';
import { HrDataService } from '../../core/hr-data.service';
import { DEFAULT_THEME, ThemeColors, ThemeService } from '../../core/theme.service';
import { UiStateService } from '../../core/ui-state.service';

/** 5.10 Administración › Parámetros generales: Organización, Personaliza tu Nexo, Seguridad / SSO. */
@Component({
  selector: 'app-parametros',
  templateUrl: './parametros.component.html'
})
export class ParametrosComponent {
  readonly tabs = ['Organización', 'Personaliza tu Nexo', 'Seguridad / SSO'];
  tab = 0;

  org = {
    pais: 'Perú', compania: '', contabilidad: 'Comercial Andina', alertaRecontratacion: 30, horas: 43, dias: 30, implementacion: false,
    nivel1: 'División', nivel2: 'Área', nivel3: 'Sub-área',
    mailAdmin: 'Gestión de Personas', mailCumple: 'Comunicaciones Internas', mailEncuestas: 'Clima y Cultura', recintos: 'Sedes',
    formatoNombre: 'Apellido, Nombre',
  };
  colores: ThemeColors;
  seg = {
    omniauth: true, dobleAuth: true, loginDocumento: false, captcha: true, historial: true, linkSso: true,
    nombreSso: 'Ingresar con mi cuenta corporativa', dominiosGoogle: '', dominiosMicrosoft: 'comercialandina.pe',
    clientId: '', clientSecret: '', tenantId: '', authorizeUrl: '', tokenUrl: '', userinfo: '', logoutUrl: '', dominiosOauth: '', emailCompleto: false,
    saml: true, samlDominios: 'comercialandina.pe', issuer: 'https://sts.windows.net/8f1c…/', audience: 'https://app.nexorh.pe/saml/metadata',
    contexto: 'PasswordProtectedTransport', idp: 'https://login.microsoftonline.com/8f1c…/saml2',
  };
  errores: string[] = [];

  constructor(private data: HrDataService, private theme: ThemeService, private ui: UiStateService) {
    this.org.compania = data.empresa;
    this.colores = { ...theme.current };
  }

  guardarOrg(): void {
    this.errores = [];
    const o = this.org;
    if (!o.compania.trim()) this.errores.push('El nombre de la compañía es obligatorio.');
    if (!(o.horas > 0 && o.horas <= 48)) this.errores.push('Las horas laborales deben estar entre 1 y 48 por semana.');
    if (!(o.dias > 0 && o.dias <= 31)) this.errores.push('Los días laborales deben estar entre 1 y 31.');
    if (!o.nivel1.trim() || !o.nivel2.trim() || !o.nivel3.trim()) this.errores.push('Los tres niveles organizacionales son obligatorios.');
    if (this.errores.length) return;
    this.data.empresa = o.compania.trim();
    this.ui.toast('Parámetros de organización guardados');
  }

  restablecer(): void { this.colores = { ...DEFAULT_THEME }; }
  guardarColores(): void { this.theme.save(this.colores); this.ui.toast('Colores aplicados a la plataforma'); }

  guardarSeguridad(): void {
    this.errores = [];
    const urls = [this.seg.authorizeUrl, this.seg.tokenUrl, this.seg.userinfo, this.seg.logoutUrl].filter(Boolean);
    if (urls.some((u) => !/^https:\/\//.test(u))) this.errores.push('Las URLs de OAuth deben comenzar con https://');
    if (this.seg.linkSso && !this.seg.nombreSso.trim()) this.errores.push('Indica el nombre del link SSO.');
    if (this.errores.length) return;
    this.ui.toast('Configuración de seguridad guardada');
  }
}
