import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UiStateService } from '../core/ui-state.service';
import { MarcaPublica, variablesMarca } from '../core/marca.service';
import { TenantModal } from './consola-modales.component';
import {
  AdminTenant, Certificado, ConsolaService, CorreoDominio, DetalleTenant, ResumenCicloVida, Dominio, Trabajo, EventoAuditoria, Factura, MESES, ModuloTenant, Nota, TONOS_ESTADO, UsoTenant, errorConsola, soles,
} from './consola.service';

type Tab = 'resumen' | 'modulos' | 'uso' | 'facturacion' | 'dominios' | 'marca' | 'usuarios' | 'auditoria' | 'notas';

/** P-SA.4 Tenant detail: summary, plan and modules (with effective date), usage, billing, domains, brand, admins, audit and notes. */
@Component({
  selector: 'app-consola-tenant-detalle',
  template: `
    <p *ngIf="!t && !error" class="nx-muted">Cargando…</p>
    <div *ngIf="error" class="cx-alerta" role="alert"><app-icon name="alert" [size]="16"></app-icon>{{ error }}</div>
    <ng-container *ngIf="t">
      <div class="cx-cab">
        <div><span class="cx-ruta"><a routerLink="/consola/tenants">Consola › Tenants</a> › {{ t.nombre }}</span>
          <h1>{{ t.nombre }} <span class="nx-badge" [ngClass]="tono(t.estado)">{{ t.estado }}</span> <span class="nx-badge">{{ t.planNombre }}</span></h1>
          <p class="nx-muted nx-mt-0">{{ t.slug }} · {{ t.dominioPrincipal }} · cliente desde {{ t.creadoEn | date: 'dd/MM/yyyy' }}</p>
          <p *ngIf="t.motivoSuspension && t.estado === 'Suspendido'" class="cx-alerta cx-alerta--peligro"><app-icon name="alert" [size]="16"></app-icon>Suspendido: {{ t.motivoSuspension }}</p>
          <p *ngIf="t.estado === 'Cancelado'" class="cx-alerta cx-alerta--aviso"><app-icon name="alert" [size]="16"></app-icon>
            Cancelado el {{ t.canceladoEn | date: 'dd/MM/yyyy' }}{{ t.motivoSuspension ? ' (' + t.motivoSuspension + ')' : '' }}: solo lectura y exportación para el cliente. Sus datos se eliminan el {{ t.eliminacionProgramada | date: 'dd/MM/yyyy' }}.</p>
        </div>
        <div class="cx-acciones">
          <button *ngIf="c.puedeSoporte && t.estado !== 'Cancelado' && t.estado !== 'Eliminado'" type="button" class="nx-btn nx-btn--outline" (click)="soporte = modal()">Entrar como soporte</button>
          <ng-container *ngIf="c.esAdmin && t.estado !== 'Eliminado'">
            <button type="button" class="nx-btn nx-btn--outline" (click)="revisar()" title="Corre el ciclo de vida para este tenant">Revisar estado ahora</button>
            <button *ngIf="t.estado !== 'Suspendido' && t.estado !== 'Cancelado'" type="button" class="nx-btn nx-btn--outline nx-btn--danger" (click)="suspender = modal()">Suspender</button>
            <button *ngIf="t.estado === 'Suspendido' || t.estado === 'Cancelado'" type="button" class="nx-btn nx-btn--primary" (click)="reactivar()">Reactivar</button>
            <button *ngIf="t.estado !== 'Cancelado'" type="button" class="nx-btn nx-btn--outline nx-btn--danger" (click)="abrirCancelar()">Cancelar cuenta</button>
            <button *ngIf="t.estado === 'Cancelado'" type="button" class="nx-btn cx-btn-peligro" (click)="abrirEliminar()">Eliminar definitivamente</button>
          </ng-container>
        </div>
      </div>

      <section *ngIf="t.estado === 'Eliminado'" class="nx-card nx-pad nx-mb-16">
        <h2 class="nx-section__title nx-mt-0">Certificado de eliminación</h2>
        <ng-container *ngIf="certificado as k">
          <div class="nx-fieldrow"><span>Cliente</span><span>{{ k.razonSocial }} · RUC {{ k.ruc }}</span></div>
          <div class="nx-fieldrow"><span>Eliminado</span><span>{{ k.eliminadoEn | date: 'dd/MM/yyyy HH:mm' }} por {{ k.responsable }}</span></div>
          <div class="nx-fieldrow"><span>Filas de negocio eliminadas</span><span>{{ k.filasNegocio | number }} en {{ tablas(k) }} tablas</span></div>
          <div class="nx-fieldrow"><span>Archivos de marca eliminados</span><span>{{ k.archivosCatalogo }}</span></div>
          <p class="nx-hint">{{ k.nota }}</p>
          <button type="button" class="nx-btn nx-btn--outline" (click)="imprimirCertificado(k)"><app-icon name="download" [size]="16"></app-icon>Descargar certificado</button>
        </ng-container>
      </section>

      <div class="cx-kpis cx-kpis--4">
        <div class="nx-card cx-kpi"><span>Colaboradores facturables</span><b>{{ t.colaboradores | number }}</b></div>
        <div class="nx-card cx-kpi"><span>MRR del tenant</span><b>{{ soles(t.mrr) }}</b><small>{{ soles(t.precioPorColaborador) }} × {{ t.colaboradores }}</small></div>
        <div class="nx-card cx-kpi"><span>Usuarios activos (30 d)</span><b>{{ t.usuariosActivos30d }}</b><small>{{ t.usuarios ? (t.usuariosActivos30d * 100 / t.usuarios | number: '1.0-0') : 0 }} % del total</small></div>
        <div class="nx-card cx-kpi"><span>Saldo por cobrar</span><b>{{ soles(t.saldo) }}</b><small>{{ t.saldo ? 'Pendiente' : 'Al día' }}</small></div>
      </div>

      <div class="nx-tabs nx-tabs--scroll" role="tablist">
        <button *ngFor="let x of tabs" type="button" role="tab" class="nx-tab" [class.is-active]="tab === x.id" [attr.aria-selected]="tab === x.id" (click)="ir(x.id)">{{ x.label }}</button>
      </div>

      <!-- Resumen -->
      <div *ngIf="tab === 'resumen'" class="cx-grid-2">
        <section class="nx-card nx-pad">
          <div class="cx-tabla__cab"><h2 class="nx-section__title nx-mt-0">Datos del cliente</h2>
            <button *ngIf="c.esAdmin && !editando" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="editar()">Editar</button></div>
          <ng-container *ngIf="!editando">
            <div class="nx-fieldrow"><span>Razón social</span><span>{{ t.razonSocial }}</span></div>
            <div class="nx-fieldrow"><span>RUC</span><span>{{ t.ruc }}</span></div>
            <div class="nx-fieldrow"><span>Industria</span><span>{{ t.industria || '—' }}</span></div>
            <div class="nx-fieldrow"><span>Ejecutivo de cuenta</span><span>{{ t.ejecutivo || '—' }}</span></div>
            <div class="nx-fieldrow"><span>Contacto de facturación</span><span>{{ t.correoFacturacion || '—' }}</span></div>
            <div class="nx-fieldrow"><span>Fin de trial</span><span>{{ t.trialHasta ? (t.trialHasta | date: 'dd/MM/yyyy') : '—' }}</span></div>
          </ng-container>
          <form *ngIf="editando" class="nx-stack" (ngSubmit)="guardarDatos()">
            <label class="nx-field">Razón social<input class="nx-input" name="rs" [(ngModel)]="f.razonSocial"></label>
            <label class="nx-field">Nombre comercial<input class="nx-input" name="nc" [(ngModel)]="f.nombre"></label>
            <label class="nx-field">Industria<input class="nx-input" name="in" [(ngModel)]="f.industria"></label>
            <label class="nx-field">Ejecutivo de cuenta<input class="nx-input" name="ej" [(ngModel)]="f.ejecutivo"></label>
            <label class="nx-field">Correo de facturación<input class="nx-input" name="cf" type="email" [(ngModel)]="f.correoFacturacion"></label>
            <label class="nx-field">Fin de trial<input class="nx-input" name="th" type="date" [(ngModel)]="f.trialHasta"></label>
            <div class="nx-settings__foot"><button type="button" class="nx-btn nx-btn--outline" (click)="editando = false">Cancelar</button><button type="submit" class="nx-btn nx-btn--primary">Guardar</button></div>
          </form>
        </section>
        <section class="nx-card nx-pad">
          <h2 class="nx-section__title nx-mt-0">Plataforma</h2>
          <div class="nx-fieldrow"><span>Slug</span><span class="cx-mono">{{ t.slug }}</span></div>
          <div class="nx-fieldrow"><span>Dominio principal</span><span>{{ t.dominioPrincipal }}</span></div>
          <div class="nx-fieldrow"><span>Base de datos</span><span>{{ t.baseDatos }}
            <span *ngIf="t.enMantenimiento" class="nx-badge nx-badge--sm nx-tone-warning">En mantenimiento</span>
            <button *ngIf="c.esAdmin && t.baseDatos === 'Compartida' && !t.enMantenimiento && t.estado !== 'Cancelado' && t.estado !== 'Eliminado'" type="button"
              class="nx-btn nx-btn--outline nx-btn--sm" [disabled]="!t.funciones.includes('DEDICATED_DB')"
              [title]="t.funciones.includes('DEDICATED_DB') ? 'Copia sus datos a su propia base y la conecta' : 'Disponible en el plan Enterprise (o con el flag DEDICATED_DB)'"
              (click)="abrirDedicar()">Mover a BD dedicada</button></span></div>
          <div class="nx-fieldrow"><span>Versión de esquema</span><span class="cx-mono">{{ t.versionEsquema }}</span></div>
          <div class="nx-fieldrow"><span>Accesos de soporte</span><span>{{ t.soporteHasta ? 'Autorizados hasta ' + (t.soporteHasta | date: 'dd/MM/yyyy') : 'No autorizados' }}</span></div>
        </section>
      </div>

      <!-- Plan y módulos -->
      <section *ngIf="tab === 'modulos'" class="nx-card nx-pad">
        <div class="cx-planes-sel">
          <button *ngFor="let p of t.planes" type="button" class="cx-plan-sel" [class.is-on]="t.plan === p.codigo" [disabled]="!c.esAdmin" (click)="cambiarPlan(p.codigo)">
            <b>{{ p.nombre }}</b><span>{{ soles(p.precio) }} / colab.</span></button>
        </div>
        <p class="nx-hint">Precio actual: {{ soles(t.precioPorColaborador) }} por colaborador{{ t.precioPactado ? ' (plan con precio pactado ' + soles(t.precioPactado) + ')' : '' }}. Cada cambio toma efecto desde la fecha indicada. Apagar un módulo oculta sus pantallas al tenant, no borra datos.</p>
        <table class="nx-table cx-tabla">
          <thead><tr><th>Activo</th><th>Módulo</th><th>Condición</th><th>Vigencia desde</th><th>Estado</th></tr></thead>
          <tbody><tr *ngFor="let m of mods">
            <td><button type="button" role="switch" class="nx-switch" [class.is-on]="m.activo" [attr.aria-checked]="m.activo" [attr.aria-label]="m.nombre"
                        [disabled]="!c.esAdmin || m.condicion.startsWith('Incluido')" (click)="m.activo = !m.activo; pendientes.add(m.codigo)"><span></span></button></td>
            <td><b>{{ m.nombre }}</b></td>
            <td>{{ m.condicion.startsWith('Incluido') ? m.condicion : 'Adicional ' + soles(m.precio) + ' / colab.' }}</td>
            <td><input *ngIf="!m.condicion.startsWith('Incluido') && pendientes.has(m.codigo); else fecha" class="nx-input nx-input--sm" type="date" [(ngModel)]="vigencias[m.codigo]" [attr.aria-label]="'Vigencia de ' + m.nombre">
              <ng-template #fecha>{{ m.desde ? (m.desde | date: 'dd/MM/yyyy') : '—' }}</ng-template></td>
            <td><span class="nx-badge nx-badge--sm" [ngClass]="m.activo ? 'nx-tone-success' : ''">{{ pendientes.has(m.codigo) ? 'Cambio pendiente' : m.activo ? 'Activo' : 'No contratado' }}</span></td>
          </tr></tbody>
        </table>
        <div class="nx-settings__foot" *ngIf="pendientes.size">
          <button type="button" class="nx-btn nx-btn--outline" (click)="descartarModulos()">Descartar</button>
          <button type="button" class="nx-btn nx-btn--primary" (click)="guardarModulos()">Guardar cambios ({{ pendientes.size }})</button>
        </div>
      </section>

      <!-- Uso -->
      <section *ngIf="tab === 'uso'" class="nx-card nx-pad">
        <ng-container *ngIf="uso">
          <h2 class="nx-section__title nx-mt-0">Colaboradores facturables por mes</h2>
          <div class="cx-barras">
            <div *ngFor="let u of uso.colaboradores" class="cx-barras__col"><span [style.height.%]="alto(u.colaboradores)" [title]="u.colaboradores"></span><small>{{ mes(u.periodo) }}</small><b>{{ u.colaboradores }}</b></div>
          </div>
          <h2 class="nx-section__title">Consumo frente a los límites del plan</h2>
          <div *ngFor="let l of uso.limites" class="nx-limite">
            <div class="nx-fieldrow"><span>{{ l.nombre }}</span><span>{{ l.maximo === 0 ? 'No incluido' : (l.usado | number: '1.0-3') + ' de ' + l.maximo + (l.unidad ? ' ' + l.unidad : '') }}</span></div>
            <div *ngIf="l.maximo > 0" class="nx-limite__barra" [class.is-aviso]="l.pct >= 80 && l.pct < 100" [class.is-mal]="l.pct >= 100"><span [style.width.%]="l.pct"></span></div>
          </div>
          <div class="nx-fieldrow"><span>Usuarios activos (30 días)</span><span>{{ uso.usuariosActivos30d }}</span></div>
          <div class="nx-fieldrow"><span>Correos enviados (30 días)</span><span>{{ uso.correos30d }}</span></div>
          <div class="nx-fieldrow"><span>Sesiones de soporte (total)</span><span>{{ uso.sesionesSoporte }}</span></div>
        </ng-container>
      </section>

      <!-- Facturación -->
      <section *ngIf="tab === 'facturacion'" class="nx-card nx-dt__scroll">
        <table class="nx-table cx-tabla">
          <thead><tr><th>Factura</th><th>Período</th><th class="nx-num">Colab.</th><th class="nx-num">Total (con IGV)</th><th>Emitida</th><th>Vence</th><th>Estado</th><th>SUNAT</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let x of facturas"><td><b>{{ x.numero }}</b></td><td>{{ mesLargo(x.periodo) }}</td><td class="nx-num">{{ x.colaboradores }}</td><td class="nx-num">{{ soles(x.total) }}</td>
              <td>{{ x.emitida }}</td><td>{{ x.vence }}</td>
              <td><span class="nx-badge nx-badge--sm" [ngClass]="x.estado === 'Pagada' ? 'nx-tone-success' : x.estado === 'Vencida' ? 'nx-tone-danger' : 'nx-tone-warning'">{{ x.estado }}</span></td>
              <td class="nx-muted nx-small">{{ x.sunatEstado }}</td>
              <td class="nx-text-right"><button *ngIf="c.esAdmin && x.estado !== 'Pagada'" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="pagar(x)">Marcar pagada</button></td></tr>
            <tr *ngIf="!facturas.length"><td colspan="9" class="cx-vacio">Todavía no hay facturas.</td></tr>
          </tbody>
        </table>
      </section>

      <!-- Dominios -->
      <section *ngIf="tab === 'dominios'" class="nx-stack">
        <p *ngIf="!t.funciones.includes('CUSTOM_DOMAIN')" class="cx-alerta cx-alerta--aviso"><app-icon name="info" [size]="16"></app-icon>El dominio propio es del plan Enterprise (o con el flag CUSTOM_DOMAIN). El cliente lo configura en Administración › Dominio y correo.</p>
        <article *ngFor="let d of dominios" class="nx-card nx-pad cx-dominio">
          <div class="cx-tabla__cab"><b class="cx-mono">{{ d.host }}</b>
            <span><span class="nx-badge nx-badge--sm">{{ d.tipo }}</span>
              <span *ngIf="d.principal" class="nx-badge nx-badge--sm nx-tone-info">Principal</span>
              <span class="nx-badge nx-badge--sm" [ngClass]="d.verificado ? 'nx-tone-success' : 'nx-tone-warning'">{{ d.verificado ? 'Verificado' : 'Pendiente' }}</span>
              <span *ngIf="d.tipo === 'Personalizado'" class="nx-badge nx-badge--sm" [ngClass]="d.estadoCertificado === 'Activo' ? 'nx-tone-success' : d.estadoCertificado === 'Emitiendo' ? 'nx-tone-info' : ''">TLS: {{ d.estadoCertificado === 'Emitiendo' ? 'se emite al primer acceso' : d.estadoCertificado }}</span></span></div>
          <p *ngIf="d.error && !d.verificado" class="nx-small nx-error nx-mt-0">{{ d.error }}</p>
          <ng-container *ngIf="d.registros.length && !d.verificado">
            <p class="nx-muted nx-small nx-mt-0">Registros que el cliente debe publicar en su DNS:</p>
            <table class="nx-table cx-tabla"><thead><tr><th>Tipo</th><th>Nombre</th><th>Valor</th><th>TTL</th></tr></thead>
              <tbody><tr *ngFor="let r of d.registros"><td>{{ r.tipo }}</td><td class="cx-mono">{{ r.nombre }}</td><td class="cx-mono">{{ r.valor }}</td><td>{{ r.ttl }}</td></tr></tbody></table>
          </ng-container>
          <div *ngIf="c.esAdmin && d.tipo === 'Personalizado'" class="cx-acciones nx-mt-16">
            <button *ngIf="!d.verificado" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="verificar(d)">Verificar ahora</button>
            <button *ngIf="d.verificado && !d.principal" type="button" class="nx-btn nx-btn--outline nx-btn--sm" (click)="principalDominio(d)">Hacer principal</button>
            <button type="button" class="nx-btn nx-btn--outline nx-btn--danger nx-btn--sm" (click)="quitarDominio(d)">Quitar</button>
            <span *ngIf="d.ultimaRevision" class="nx-small nx-muted">Última revisión {{ d.ultimaRevision | date: 'dd/MM HH:mm' }}</span>
          </div>
        </article>
        <article class="nx-card nx-pad">
          <div class="cx-tabla__cab"><b>Correos desde el dominio del cliente</b>
            <span *ngIf="correoDominio as k" class="nx-badge nx-badge--sm" [ngClass]="k.enUso ? 'nx-tone-success' : 'nx-tone-warning'">{{ k.enUso ? 'En uso' : k.verificado ? 'Verificado (fuera del plan)' : 'Pendiente de DNS' }}</span></div>
          <p *ngIf="!correoDominio" class="nx-muted nx-small nx-mt-0">Sin configurar: los correos salen desde la dirección de Nexo RH. El cliente lo configura en Administración › Dominio y correo (Enterprise).</p>
          <ng-container *ngIf="correoDominio as k">
            <div class="nx-fieldrow"><span>Remitente</span><span class="cx-mono">{{ k.direccion }}</span></div>
            <div class="nx-fieldrow"><span>SPF · DKIM · DMARC</span><span>{{ k.spfOk ? '✓' : '✗' }} · {{ k.dkimOk ? '✓' : '✗' }} · {{ k.dmarcOk ? '✓' : '✗' }}</span></div>
            <div class="nx-fieldrow"><span>Última revisión</span><span>{{ k.ultimaRevision ? (k.ultimaRevision | date: 'dd/MM/yyyy HH:mm') : 'Nunca' }}</span></div>
            <button *ngIf="c.esAdmin" type="button" class="nx-btn nx-btn--outline nx-btn--sm nx-mt-16" (click)="verificarCorreo()">Revisar el DNS</button>
          </ng-container>
        </article>
        <form *ngIf="c.esAdmin && t.funciones.includes('CUSTOM_DOMAIN')" class="nx-card nx-pad cx-filtros" (ngSubmit)="agregarDominio()">
          <input class="nx-input" name="host" placeholder="rrhh.cliente.pe" [(ngModel)]="nuevoDominio" aria-label="Dominio propio">
          <button type="submit" class="nx-btn nx-btn--primary">Agregar dominio propio</button>
        </form>
      </section>

      <!-- Marca (solo lectura) -->
      <section *ngIf="tab === 'marca'" class="nx-card nx-pad">
        <ng-container *ngIf="marca">
          <p class="nx-muted nx-mt-0">Versión {{ marca.version }} · la edita el cliente en Administración › Personaliza tu marca.</p>
          <div class="cx-marca" [ngStyle]="estiloMarca">
            <div class="cx-marca__top"></div>
            <div class="cx-marca__cuerpo">
              <div class="cx-marca__side"><img *ngIf="marca.logos.horizontal" [src]="'//' + t.slug + '.' + dominio + puerto + marca.logos.horizontal" alt=""><b *ngIf="!marca.logos.horizontal">{{ t.nombre }}</b>
                <span>{{ marca.terminologia.colaborador }}es</span><span>{{ marca.terminologia.nivel1 }}</span><span>{{ marca.nombrePortal }}</span></div>
              <div class="cx-marca__main"><b>{{ marca.login.titulo }}</b><small>{{ marca.login.mensaje }}</small><span class="cx-marca__btn">Botón primario</span></div>
            </div>
          </div>
          <div class="nx-fieldrow"><span>Color primario</span><span class="cx-mono">{{ marca.colores.primario }}</span></div>
          <div class="nx-fieldrow"><span>Tipografía</span><span>{{ marca.tipografia }}</span></div>
          <div class="nx-fieldrow"><span>Bordes</span><span>{{ marca.radio }}</span></div>
        </ng-container>
      </section>

      <!-- Usuarios admin -->
      <section *ngIf="tab === 'usuarios'" class="nx-card nx-dt__scroll">
        <table class="nx-table cx-tabla">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Estado</th><th>Doble factor</th><th>Último acceso</th></tr></thead>
          <tbody><tr *ngFor="let a of admins"><td><b>{{ a.nombre }}</b></td><td>{{ a.correo }}</td>
            <td><span class="nx-badge nx-badge--sm" [ngClass]="a.pendienteActivacion ? 'nx-tone-info' : a.activo ? 'nx-tone-success' : ''">{{ a.pendienteActivacion ? 'Invitación pendiente' : a.activo ? 'Activo' : 'Inactivo' }}</span></td>
            <td>{{ a.dobleFactor ? 'Sí' : 'No' }}</td><td>{{ a.ultimoAcceso }}</td></tr></tbody>
        </table>
        <p class="nx-hint cx-vacio">Solo lectura: las invitaciones se reenvían desde Usuarios en la app del cliente.</p>
      </section>

      <!-- Auditoría -->
      <section *ngIf="tab === 'auditoria'" class="nx-card">
        <div class="cx-segmentos cx-segmentos--pad">
          <button type="button" [class.is-on]="origen === 'platform'" (click)="cargarAuditoria('platform')">Plataforma</button>
          <button type="button" [class.is-on]="origen === 'tenant'" (click)="cargarAuditoria('tenant')">Historial del tenant</button>
        </div>
        <table class="nx-table cx-tabla">
          <thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Detalle</th><th>IP</th></tr></thead>
          <tbody>
            <tr *ngFor="let a of auditoria"><td>{{ a.en | date: 'dd/MM/yyyy HH:mm' }}</td><td>{{ a.actor }}</td><td class="cx-mono">{{ a.accion }}</td><td class="nx-muted">{{ a.detalle || '—' }}</td><td>{{ a.ip || '—' }}</td></tr>
            <tr *ngIf="!auditoria.length"><td colspan="5" class="cx-vacio">Sin eventos.</td></tr>
          </tbody>
        </table>
      </section>

      <!-- Notas internas -->
      <section *ngIf="tab === 'notas'" class="nx-stack">
        <form class="nx-card nx-pad nx-stack" (ngSubmit)="agregarNota()">
          <label class="nx-field">Nueva nota interna (no la ve el cliente)<textarea class="nx-input" name="nota" rows="3" maxlength="2000" [(ngModel)]="nuevaNota"></textarea></label>
          <div class="nx-settings__foot"><button type="submit" class="nx-btn nx-btn--primary" [disabled]="!nuevaNota.trim()">Agregar nota</button></div>
        </form>
        <article *ngFor="let n of notas" class="nx-card nx-pad"><small class="nx-muted">{{ n.autor }} · {{ n.creadaEn | date: 'dd/MM/yyyy HH:mm' }}</small><p class="nx-mt-0 cx-nota">{{ n.texto }}</p></article>
      </section>

      <app-modal *ngIf="cancelar" [title]="'Cancelar ' + t.nombre" width="520px" (closed)="cancelar = null">
        <div class="cx-alerta cx-alerta--peligro"><app-icon name="alert" [size]="16"></app-icon>
          <span>El cliente tendrá 30 días de solo lectura y exportación; después sus datos se eliminan definitivamente (con certificado). Se puede reactivar antes de esa fecha.</span></div>
        <label class="nx-field">Motivo *<select class="nx-select" [(ngModel)]="cancelar.motivo"><option value="">Elige un motivo</option><option *ngFor="let m of motivosCancelacion">{{ m }}</option></select></label>
        <label class="nx-field"><span>Escribe <b>{{ t.slug }}</b> para confirmar</span><input class="nx-input" [(ngModel)]="cancelar.confirmacion" autocomplete="off"></label>
        <span *ngIf="errorModal" class="nx-error" role="alert">{{ errorModal }}</span>
        <ng-container modal-footer>
          <button type="button" class="nx-btn nx-btn--outline" (click)="cancelar = null">Volver</button>
          <button type="button" class="nx-btn cx-btn-peligro" [disabled]="!cancelar.motivo || cancelar.confirmacion !== t.slug" (click)="confirmarCancelar()">Cancelar cuenta</button>
        </ng-container>
      </app-modal>
      <app-modal *ngIf="eliminar" [title]="'Eliminar ' + t.nombre + ' definitivamente'" width="520px" (closed)="eliminar = null">
        <div class="cx-alerta cx-alerta--peligro"><app-icon name="alert" [size]="16"></app-icon>
          <span>Se borran todos sus datos de negocio y del catálogo. No se puede deshacer. Se conservan las facturas y la auditoría, y se emite un certificado de eliminación.</span></div>
        <label class="nx-field"><span>Escribe <b>{{ t.slug }}</b> para confirmar</span><input class="nx-input" [(ngModel)]="eliminar.confirmacion" autocomplete="off"></label>
        <span *ngIf="errorModal" class="nx-error" role="alert">{{ errorModal }}</span>
        <ng-container modal-footer>
          <button type="button" class="nx-btn nx-btn--outline" (click)="eliminar = null">Volver</button>
          <button type="button" class="nx-btn cx-btn-peligro" [disabled]="eliminar.confirmacion !== t.slug" (click)="confirmarEliminar()">Eliminar definitivamente</button>
        </ng-container>
      </app-modal>

      <app-modal *ngIf="dedicar" [title]="'Mover ' + t.nombre + ' a su BD dedicada'" width="560px" (closed)="cerrarDedicar()">
        <ng-container *ngIf="!dedicar.trabajo; else progresoDedicar">
          <div class="cx-alerta cx-alerta--aviso"><app-icon name="alert" [size]="16"></app-icon>
            <span>Se crea la base {{ '{BD compartida}_' + t.slug.split('-').join('_') }}, se copian sus datos, se comparan los conteos y se cambia la conexión. Durante la copia (normalmente menos de un minuto) la app del cliente responde “en mantenimiento”.</span></div>
          <label class="nx-field"><span>Escribe <b>{{ t.slug }}</b> para confirmar</span><input class="nx-input" [(ngModel)]="dedicar.confirmacion" autocomplete="off"></label>
          <span *ngIf="errorModal" class="nx-error" role="alert">{{ errorModal }}</span>
        </ng-container>
        <ng-template #progresoDedicar>
          <div aria-live="polite">
            <div class="nx-limite__barra nx-mb-16" [class.is-mal]="dedicar.trabajo!.estado === 'failed'"><span [style.width.%]="dedicar.trabajo!.progreso"></span></div>
            <ul class="cx-tareas">
              <li *ngFor="let p of dedicar.trabajo!.pasos" [class]="'is-' + p.estado">
                <span class="cx-tareas__icono">{{ p.estado === 'succeeded' ? '✓' : p.estado === 'failed' ? '!' : p.estado === 'running' ? '…' : '' }}</span>
                <span class="nx-grow">{{ p.titulo }}<small *ngIf="p.error" class="nx-error"><br>{{ p.error }}</small></span>
              </li>
            </ul>
          </div>
        </ng-template>
        <ng-container modal-footer>
          <button *ngIf="!dedicar.trabajo" type="button" class="nx-btn nx-btn--outline" (click)="cerrarDedicar()">Volver</button>
          <button *ngIf="!dedicar.trabajo" type="button" class="nx-btn nx-btn--primary" [disabled]="dedicar.confirmacion !== t.slug" (click)="confirmarDedicar()">Mover a BD dedicada</button>
          <button *ngIf="dedicar.trabajo && dedicar.trabajo.estado !== 'running'" type="button" class="nx-btn nx-btn--primary" (click)="cerrarDedicar()">Cerrar</button>
        </ng-container>
      </app-modal>

      <app-cx-suspender *ngIf="suspender" [t]="suspender" (cerrado)="suspender = null" (hecho)="suspender = null; cargar(); ui.toast(t.nombre + ' suspendido')"></app-cx-suspender>
      <app-cx-soporte *ngIf="soporte" [t]="soporte" (cerrado)="soporte = null"></app-cx-soporte>
    </ng-container>
  `
})
export class ConsolaTenantDetalleComponent implements OnDestroy {
  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' }, { id: 'modulos', label: 'Plan y módulos' }, { id: 'uso', label: 'Uso' }, { id: 'facturacion', label: 'Facturación' },
    { id: 'dominios', label: 'Dominios' }, { id: 'marca', label: 'Marca' }, { id: 'usuarios', label: 'Usuarios admin' }, { id: 'auditoria', label: 'Auditoría' }, { id: 'notas', label: 'Notas internas' },
  ];
  readonly soles = soles;
  readonly dominio = location.hostname.replace(/^admin\./, '');
  readonly puerto = location.port ? ':' + location.port : '';
  id = '';
  tab: Tab = 'resumen';
  t: DetalleTenant | null = null;
  error = '';
  mods: ModuloTenant[] = [];
  pendientes = new Set<string>();
  vigencias: Record<string, string> = {};
  uso: UsoTenant | null = null;
  facturas: Factura[] = [];
  dominios: Dominio[] = [];
  estadoDominio: Record<number, string> = {};
  correoDominio: CorreoDominio | null = null;
  dedicar: { confirmacion: string; trabajo: Trabajo | null } | null = null;
  private sondeo: ReturnType<typeof setInterval> | null = null;
  nuevoDominio = '';
  marca: MarcaPublica | null = null;
  admins: AdminTenant[] = [];
  auditoria: EventoAuditoria[] = [];
  origen: 'platform' | 'tenant' = 'platform';
  notas: Nota[] = [];
  nuevaNota = '';
  editando = false;
  f = { razonSocial: '', nombre: '', industria: '', ejecutivo: '', correoFacturacion: '', trialHasta: '' };
  suspender: TenantModal | null = null;
  readonly motivosCancelacion = ['Solicitud del cliente', 'Morosidad prolongada', 'Fin de contrato', 'Incumplimiento de términos'];
  cancelar: { motivo: string; confirmacion: string } | null = null;
  eliminar: { confirmacion: string } | null = null;
  errorModal = '';
  certificado: Certificado | null = null;
  soporte: TenantModal | null = null;
  private readonly sub: Subscription;

  constructor(public c: ConsolaService, public ui: UiStateService, private router: Router, route: ActivatedRoute) {
    this.sub = route.paramMap.subscribe((p) => { this.id = p.get('id') ?? ''; this.cargar(); });
    this.sub.add(route.queryParamMap.subscribe((q) => { this.tab = (q.get('tab') as Tab) || 'resumen'; this.cargarTab(); }));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); this.detenerSondeo(); }

  tono(e: string): string { return TONOS_ESTADO[e] ?? ''; }
  modal(): TenantModal { return { id: this.t!.id, nombre: this.t!.nombre, slug: this.t!.slug, soporteAutorizado: !!this.t!.soporteHasta, soporteHasta: this.t!.soporteHasta }; }
  mes(p: string): string { return MESES[+p.split('-')[1] - 1]; }
  mesLargo(p: string): string { return `${this.mes(p)} ${p.split('-')[0]}`; }
  alto(n: number): number { const max = Math.max(1, ...(this.uso?.colaboradores ?? []).map((x) => x.colaboradores)); return Math.max(4, n * 100 / max); }
  get estiloMarca(): Record<string, string> { return this.marca ? variablesMarca(this.marca) : {}; }

  ir(tab: Tab): void { this.router.navigate([], { queryParams: { tab }, replaceUrl: true }); }

  cargar(): void {
    this.c.get<DetalleTenant>(`tenants/${this.id}`).subscribe({
      next: (t) => {
        this.t = t; this.mods = t.modulos.map((m) => ({ ...m })); this.pendientes.clear();
        if (t.estado === 'Eliminado') this.c.get<Certificado>(`tenants/${this.id}/certificado`).subscribe((k) => this.certificado = k);
      },
      error: (e) => this.error = errorConsola(e),
    });
  }

  cargarTab(): void {
    if (!this.id) return;
    const e = (x: unknown) => this.ui.toast(errorConsola(x));
    if (this.tab === 'uso') this.c.get<UsoTenant>(`tenants/${this.id}/usage`).subscribe({ next: (u) => this.uso = u, error: e });
    if (this.tab === 'facturacion') this.c.get<Factura[]>(`tenants/${this.id}/invoices`).subscribe({ next: (f) => this.facturas = f, error: e });
    if (this.tab === 'dominios') {
      this.c.get<Dominio[]>(`tenants/${this.id}/domains`).subscribe({ next: (d) => this.dominios = d, error: e });
      this.c.get<CorreoDominio | null>(`tenants/${this.id}/email-domain`).subscribe({ next: (k) => this.correoDominio = k ?? null, error: e });
    }
    if (this.tab === 'marca') this.c.get<MarcaPublica>(`tenants/${this.id}/branding`).subscribe({ next: (m) => this.marca = m, error: e });
    if (this.tab === 'usuarios') this.c.get<AdminTenant[]>(`tenants/${this.id}/admins`).subscribe({ next: (a) => this.admins = a, error: e });
    if (this.tab === 'auditoria') this.cargarAuditoria(this.origen);
    if (this.tab === 'notas') this.c.get<Nota[]>(`tenants/${this.id}/notes`).subscribe({ next: (n) => this.notas = n, error: e });
  }

  cargarAuditoria(origen: 'platform' | 'tenant'): void {
    this.origen = origen;
    this.c.get<EventoAuditoria[]>(`tenants/${this.id}/audit`, { origen }).subscribe({ next: (a) => this.auditoria = a, error: (x) => this.ui.toast(errorConsola(x)) });
  }

  editar(): void {
    const t = this.t!;
    this.f = { razonSocial: t.razonSocial, nombre: t.nombre, industria: t.industria ?? '', ejecutivo: t.ejecutivo ?? '', correoFacturacion: t.correoFacturacion ?? '', trialHasta: t.trialHasta ?? '' };
    this.editando = true;
  }

  guardarDatos(): void {
    this.c.patch<DetalleTenant>(`tenants/${this.id}`, { ...this.f, trialHasta: this.f.trialHasta || null }).subscribe({
      next: (t) => { this.t = t; this.editando = false; this.ui.toast('Datos del cliente guardados'); },
      error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  cambiarPlan(plan: string): void {
    if (plan === this.t?.plan) return;
    this.c.patch<DetalleTenant>(`tenants/${this.id}`, { plan, quitarPrecioPactado: true }).subscribe({
      next: (t) => { this.t = t; this.mods = t.modulos.map((m) => ({ ...m })); this.ui.toast(`Plan cambiado a ${t.planNombre}`); },
      error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  descartarModulos(): void { this.mods = this.t!.modulos.map((m) => ({ ...m })); this.pendientes.clear(); }

  guardarModulos(): void {
    const hoy = new Date().toISOString().slice(0, 10);
    const modulos = [...this.pendientes].map((codigo) => ({ codigo, activo: this.mods.find((m) => m.codigo === codigo)!.activo, desde: this.vigencias[codigo] || hoy }));
    this.c.put<ModuloTenant[]>(`tenants/${this.id}/modules`, { modulos }).subscribe({
      next: () => { this.ui.toast('Módulos actualizados'); this.vigencias = {}; this.cargar(); },
      error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  reactivar(): void {
    this.c.post(`tenants/${this.id}/reactivate`, {}).subscribe({ next: () => { this.ui.toast(`${this.t!.nombre} reactivado`); this.cargar(); }, error: (e) => this.ui.toast(errorConsola(e)) });
  }

  agregarDominio(): void {
    this.c.post<Dominio>(`tenants/${this.id}/domains`, { host: this.nuevoDominio }).subscribe({
      next: (d) => { this.dominios.push(d); this.nuevoDominio = ''; this.ui.toast('Dominio agregado: configura el DNS y verifica'); },
      error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  verificar(d: Dominio): void {
    this.c.post<{ status: string; dominio: Dominio }>(`tenants/${this.id}/domains/${d.id}/verify`, {}).subscribe({
      next: (r) => { Object.assign(d, r.dominio); this.ui.toast(r.status === 'verified' ? `${d.host} verificado` : 'Todavía no se encuentran los registros'); },
      error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  principalDominio(d: Dominio): void {
    this.c.post(`tenants/${this.id}/domains/${d.id}/primary`, {}).subscribe({
      next: () => { this.ui.toast(`${d.host} es el dominio principal`); this.cargar(); this.cargarTab(); }, error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  quitarDominio(d: Dominio): void {
    if (!confirm(`¿Quitar ${d.host}? Dejará de abrir la app del cliente.`)) return;
    this.c.delete(`tenants/${this.id}/domains/${d.id}`).subscribe({
      next: () => { this.ui.toast(`${d.host} quitado`); this.cargar(); this.cargarTab(); }, error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  verificarCorreo(): void {
    this.c.post<CorreoDominio>(`tenants/${this.id}/email-domain/verify`, {}).subscribe({
      next: (k) => { this.correoDominio = k; this.ui.toast(k.verificado ? 'SPF, DKIM y DMARC verificados' : 'Faltan registros'); }, error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  abrirDedicar(): void { this.errorModal = ''; this.dedicar = { confirmacion: '', trabajo: null }; }

  confirmarDedicar(): void {
    this.c.post<{ provisioningJobId: string }>(`tenants/${this.id}/database/dedicate`, { confirmacion: this.dedicar!.confirmacion }).subscribe({
      next: (r) => {
        const leer = () => this.c.get<Trabajo>(`provisioning/${r.provisioningJobId}`).subscribe((j) => {
          if (!this.dedicar) return;
          this.dedicar.trabajo = j;
          if (j.estado !== 'running') {
            this.detenerSondeo();
            this.ui.toast(j.estado === 'succeeded' ? `${this.t!.nombre} ya usa su BD dedicada` : 'La mudanza falló: el tenant sigue en la base compartida');
            this.cargar();
          }
        });
        leer();
        this.sondeo = setInterval(leer, 1500);
      },
      error: (e) => this.errorModal = errorConsola(e),
    });
  }

  cerrarDedicar(): void { if (this.dedicar?.trabajo?.estado === 'running') return; this.detenerSondeo(); this.dedicar = null; }
  private detenerSondeo(): void { if (this.sondeo) { clearInterval(this.sondeo); this.sondeo = null; } }

  abrirCancelar(): void { this.errorModal = ''; this.cancelar = { motivo: '', confirmacion: '' }; }
  abrirEliminar(): void { this.errorModal = ''; this.eliminar = { confirmacion: '' }; }
  tablas(k: Certificado): number { return Object.keys(k.porTabla).length; }

  confirmarCancelar(): void {
    this.c.post(`tenants/${this.id}/cancel`, this.cancelar).subscribe({
      next: () => { this.cancelar = null; this.ui.toast(`${this.t!.nombre} cancelado`); this.cargar(); }, error: (e) => this.errorModal = errorConsola(e),
    });
  }

  confirmarEliminar(): void {
    this.c.post<Certificado>(`tenants/${this.id}/delete`, this.eliminar).subscribe({
      next: (k) => { this.eliminar = null; this.certificado = k; this.ui.toast('Datos eliminados: certificado emitido'); this.cargar(); }, error: (e) => this.errorModal = errorConsola(e),
    });
  }

  /** Runs the lifecycle for this tenant (trial, overdue invoices, cancellation, usage and monthly invoice). */
  revisar(): void {
    this.c.post<ResumenCicloVida>(`lifecycle/run?tenantId=${this.id}`, {}).subscribe({
      next: (r) => { this.ui.toast(r.eventos.length ? r.eventos.join(' · ') : 'Sin cambios: el estado está al día'); this.cargar(); this.cargarTab(); },
      error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  pagar(x: Factura): void {
    this.c.post<ResumenCicloVida>(`tenants/${this.id}/invoices/${x.numero}/pay`, {}).subscribe({
      next: (r) => { this.ui.toast(`${x.numero} pagada${r.eventos.length ? ' · ' + r.eventos.join(' · ') : ''}`); this.cargar(); this.cargarTab(); },
      error: (e) => this.ui.toast(errorConsola(e)),
    });
  }

  imprimirCertificado(k: Certificado): void {
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[ch]);
    const filas = Object.entries(k.porTabla).sort().map(([t, n]) => `<tr><td>${esc(t)}</td><td align="right">${n}</td></tr>`).join('');
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Certificado de eliminación · ${esc(k.slug)}</title>
<body style="font-family:system-ui,sans-serif;padding:40px;max-width:720px"><h1 style="margin:0">Certificado de eliminación de datos</h1><p>Nexo RH · plataforma de Recursos Humanos</p>
<p><b>Cliente:</b> ${esc(k.razonSocial)} · RUC ${esc(k.ruc)} · ${esc(k.slug)}<br><b>Fecha:</b> ${new Date(k.eliminadoEn).toLocaleString('es-PE')}<br><b>Responsable:</b> ${esc(k.responsable)}</p>
<p>Se eliminaron definitivamente <b>${k.filasNegocio}</b> filas de la base de negocio y ${k.archivosCatalogo} archivos de marca.</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th align="left">Tabla</th><th align="right">Filas</th></tr>${filas}</table>
<p style="font-size:13px">${esc(k.nota)}</p><p style="font-size:12px">Identificador del tenant: ${esc(k.tenantId)}</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: `certificado-eliminacion-${k.slug}.html` }).click();
    URL.revokeObjectURL(url);
  }

  agregarNota(): void {
    this.c.post<Nota>(`tenants/${this.id}/notes`, { texto: this.nuevaNota }).subscribe({
      next: (n) => { this.notas.unshift(n); this.nuevaNota = ''; }, error: (e) => this.ui.toast(errorConsola(e)),
    });
  }
}
