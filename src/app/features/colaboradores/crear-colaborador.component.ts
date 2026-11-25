import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { GenericosService } from '../../core/genericos.service';
import { CATALOGOS } from '../../core/sample/catalogos-config';
import { Division, UbigeoDepartamento } from '../../core/models';

const STEPS = [
  { label: 'Datos Personales', title: 'Paso 1 · Datos Personales', sub: 'Identificación, contacto y dirección del colaborador.' },
  { label: 'Datos Previsionales', title: 'Paso 2 · Datos Previsionales', sub: 'Salud, régimen pensionario y datos de pago.' },
  { label: 'Datos Trabajo', title: 'Paso 3 · Datos Trabajo', sub: 'Información contractual del primer trabajo (ficha F1).' },
];

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyForm() {
  return {
    nombre: '', apellido: '', segundoApellido: '', tipoDoc: 'DNI', documento: '', nacionalidad: 'Perú',
    sexo: '', estadoCivil: '', nacimiento: '', telOficina: '', telefono: '', email: '', crearUsuario: true,
    emailPersonal: '', direccion: '', departamento: 'Lima', provincia: 'Lima', distrito: '', educacion: '', centro: '',
    planSalud: 'EsSalud', regimen: 'AFP', afp: 'Habitat', cuspp: '', comision: 'Flujo',
    banco: 'BCP', tipoCuenta: 'Ahorros', cuenta: '', formaPago: 'Transferencia',
    cargo: '', supervisor: '', division: 'Departamento de Administración', area: 'Finanzas', subArea: 'Tesorería',
    ingreso: '', contrato: 'Indefinido', termino: '', jornada: 'Mensual · 43.0 hrs (L, M, M, J, V)', sueldo: '',
  };
}

/** P-01.5 Crear Colaborador (3 pasos). */
@Component({
  selector: 'app-crear-colaborador',
  templateUrl: './crear-colaborador.component.html'
})
export class CrearColaboradorComponent {
  readonly steps = STEPS;
  step = 0;
  banner = true;
  advanced = false;
  submitted = false;
  createdId: number | null = null;
  guardando = false;
  /** Error returned by the API (validation or connection). */
  errorApi = '';
  f = emptyForm();
  errors: Record<string, string> = {};

  cargos: string[] = [];
  divisiones: Division[] = [];
  departamentos: UbigeoDepartamento[] = [];
  /** Active cost centers of Configuración › Centros de costo. */
  get centros(): string[] { return this.gen.filas(CATALOGOS['centros-de-costo']).filter((f) => f['activo'] !== false).map((f) => `${f['codigo']} ${f['nombre']}`); }
  /** Current collaborators of this company ("Apellidos, Nombres"). */
  supervisores: string[] = [];

  constructor(public data: HrDataService, private gen: GenericosService) {
    data.cargos().subscribe((l) => (this.cargos = l.filter((c) => c.activo).map((c) => c.nombre)));
    data.divisiones().subscribe((d) => (this.divisiones = d));
    data.ubigeo().subscribe((u) => (this.departamentos = u.departamentos));
    data.colaboradores().subscribe((cs) => (this.supervisores = cs.map((c) => `${c.apellidos}, ${c.nombres}`).sort((a, b) => a.localeCompare(b, 'es'))));
  }

  get provincias() { return this.departamentos.find((d) => d.nombre === this.f.departamento)?.provincias ?? []; }
  get distritos() { return this.provincias.find((p) => p.nombre === this.f.provincia)?.distritos ?? []; }

  onDepartamento(): void {
    // Lima › Lima, Callao › Callao…: la provincia capital suele llamarse como el departamento.
    const ps = this.provincias;
    this.f.provincia = (ps.find((p) => p.nombre === this.f.departamento) ?? ps[0])?.nombre ?? '';
    this.f.distrito = '';
  }

  onProvincia(): void { this.f.distrito = ''; }

  get areas() { return this.divisiones.find((d) => d.nombre === this.f.division)?.areas ?? []; }
  get subAreas() { return this.areas.find((a) => a.nombre === this.f.area)?.subAreas ?? []; }

  onDivision(): void {
    this.f.area = this.areas[0]?.nombre ?? '';
    this.onArea();
  }
  onArea(): void { this.f.subArea = this.subAreas[0]?.nombre ?? ''; }

  /** Validates the given step; returns true when it has no errors. */
  private validate(step: number): boolean {
    const e: Record<string, string> = {};
    const f = this.f;
    const req = (k: keyof typeof f, msg = 'Campo obligatorio.') => { if (!String(f[k]).trim()) e[k] = msg; };
    if (step === 0) {
      req('nombre'); req('apellido'); req('documento'); req('sexo'); req('estadoCivil'); req('email');
      if (f.tipoDoc === 'DNI' && f.documento && !/^\d{8}$/.test(f.documento)) e['documento'] = 'El DNI debe tener 8 dígitos.';
      if (!DATE_RE.test(f.nacimiento)) e['nacimiento'] = 'Usa el formato DD/MM/YYYY.';
      if (f.email && !EMAIL_RE.test(f.email)) e['email'] = 'Ingresa un correo válido.';
    }
    if (step === 2) {
      req('cargo');
      if (!DATE_RE.test(f.ingreso)) e['ingreso'] = 'Usa el formato DD/MM/YYYY.';
      if (f.contrato === 'Plazo fijo' && !DATE_RE.test(f.termino)) e['termino'] = 'Usa el formato DD/MM/YYYY.';
      if (!(parseFloat(f.sueldo) > 0)) e['sueldo'] = 'Ingresa un sueldo mayor a 0.';
    }
    this.errors = e;
    return Object.keys(e).length === 0;
  }

  goTo(i: number): void {
    if (i <= this.step || this.validate(this.step)) this.step = i;
  }

  back(): void { this.errors = {}; this.step--; }

  next(): void {
    if (!this.validate(this.step)) return;
    if (this.step < 2) { this.step++; return; }
    const f = this.f;
    const sueldo = parseFloat(f.sueldo);
    this.guardando = true;
    this.errorApi = '';
    this.data.addColaborador({
      apellidos: [f.apellido, f.segundoApellido].filter(Boolean).join(' ').trim(), nombres: f.nombre.trim(),
      documento: f.documento.trim(), cargo: f.cargo, division: f.division, area: f.area, subArea: f.subArea,
      ingreso: f.ingreso, sueldoNeto: sueldo,
      detalle: {
        tipoDocumento: f.tipoDoc, emailCorporativo: f.email, telefono: f.telefono, anexo: f.telOficina.trim() || undefined, nacimiento: f.nacimiento,
        direccion: [f.direccion, f.distrito, f.provincia, f.departamento].filter((x, i, a) => x && a.indexOf(x) === i).join(', '), planSalud: f.planSalud,
        pension: f.regimen === 'AFP' ? `AFP ${f.afp} · comisión ${f.comision}` : 'ONP', cuspp: f.cuspp,
        banco: f.cuenta ? `${f.banco} · Cuenta de ${f.tipoCuenta.toLowerCase()} ****${f.cuenta.slice(-4)}` : f.banco,
        formaPago: f.formaPago, supervisor: f.supervisor, sueldoBase: sueldo, contrato: f.contrato,
        jornada: f.jornada.replace(' · ', ' '), sindicalizado: 'No',
      },
    }).subscribe({
      next: (nuevo) => {
        this.guardando = false;
        this.createdId = nuevo.id;
        this.f = emptyForm();
        this.step = 0;
        window.scrollTo({ top: 0 });
      },
      error: (e) => { this.guardando = false; this.errorApi = mensajeError(e); },
    });
  }
}
