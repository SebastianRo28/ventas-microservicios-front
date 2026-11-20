import { CatalogoConfig } from '../genericos';
import { FERIADOS_2026 } from './asistencia';

const ACTIVO = { key: 'activo', label: 'Estado', tipo: 'switch' as const };
const RUC = { re: '^(10|15|17|20)\\d{9}$', msg: 'El RUC tiene 11 dígitos y empieza con 10, 15, 17 o 20.' };

/** Generic catalogs, keyed by the `catalogo` value in the route data. Sample values are fictional. */
export const CATALOGOS: Record<string, CatalogoConfig> = {
  grupos: {
    clave: 'grupos', singular: 'Grupo',
    descripcion: 'Agrupa colaboradores para asignar encuestas, capacitaciones, comunicaciones o permisos de una sola vez.',
    campos: [
      { key: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true, unico: true, ancho: 'minmax(200px, 1.3fr)' },
      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['Manual', 'Por área', 'Por cargo'], obligatorio: true },
      { key: 'area', label: 'Área', tipo: 'select', opciones: 'areas', requeridoSi: { campo: 'tipo', valor: 'Por área' } },
      { key: 'cargo', label: 'Cargo', tipo: 'select', opciones: 'cargos', requeridoSi: { campo: 'tipo', valor: 'Por cargo' } },
      { key: 'descripcion', label: 'Descripción', tipo: 'textarea', soloFormulario: true },
      ACTIVO,
    ],
    filas: [
      { nombre: 'Brigada de emergencia', tipo: 'Manual', area: '', cargo: '', descripcion: 'Brigadistas de evacuación y primeros auxilios.', activo: true },
      { nombre: 'Equipo de almacén', tipo: 'Por área', area: 'Logística', cargo: '', descripcion: '', activo: true },
      { nombre: 'Fuerza de ventas', tipo: 'Por área', area: 'Ventas', cargo: '', descripcion: '', activo: true },
      { nombre: 'Practicantes', tipo: 'Por cargo', area: '', cargo: 'Practicante Profesional', descripcion: 'Seguimiento de convenios de prácticas.', activo: true },
    ],
  },
  puestos: {
    clave: 'puestos', singular: 'Puesto', minWidth: '1100px',
    descripcion: 'Cada puesto es una posición concreta de un cargo: puede estar ocupado por un colaborador o vacante.',
    campos: [
      { key: 'codigo', label: 'Código', tipo: 'texto', obligatorio: true, unico: true, patron: { re: '^[A-Z]{2,4}-\\d{2,4}$', msg: 'Usa el formato ABC-001.' }, placeholder: 'FIN-001' },
      { key: 'cargo', label: 'Cargo', tipo: 'select', opciones: 'cargos', obligatorio: true },
      { key: 'area', label: 'Área', tipo: 'select', opciones: 'areas', obligatorio: true },
      { key: 'centro', label: 'Centro de costo', tipo: 'select', opciones: 'catalogo:centros-de-costo' },
      { key: 'estado', label: 'Estado', tipo: 'select', opciones: ['Ocupado', 'Vacante', 'Congelado'], obligatorio: true },
      { key: 'ocupante', label: 'Ocupante', tipo: 'select', opciones: 'colaboradores', requeridoSi: { campo: 'estado', valor: 'Ocupado' } },
    ],
    filas: [
      { codigo: 'FIN-001', cargo: 'Jefe de Finanzas', area: 'Finanzas', centro: 'CC-110 · Finanzas', estado: 'Ocupado', ocupante: 'Navarro Ríos, Gonzalo' },
      { codigo: 'FIN-002', cargo: 'Analista Finanzas', area: 'Finanzas', centro: 'CC-110 · Finanzas', estado: 'Ocupado', ocupante: 'Alamos Ruiz, Florencia' },
      { codigo: 'FIN-003', cargo: 'Analista Finanzas', area: 'Finanzas', centro: 'CC-110 · Finanzas', estado: 'Vacante', ocupante: '' },
      { codigo: 'LOG-001', cargo: 'Jefe de Operaciones', area: 'Logística', centro: 'CC-200 · Operaciones y almacén', estado: 'Ocupado', ocupante: 'Benavides Rojas, Diego' },
      { codigo: 'LOG-002', cargo: 'Asistente de Almacén', area: 'Logística', centro: 'CC-200 · Operaciones y almacén', estado: 'Ocupado', ocupante: 'Gutiérrez Paredes, Javier' },
      { codigo: 'VTA-004', cargo: 'Ejecutiva Comercial', area: 'Ventas', centro: 'CC-300 · Comercial', estado: 'Congelado', ocupante: '' },
    ],
  },
  anotaciones: {
    clave: 'anotaciones', singular: 'Anotación', femenino: true, minWidth: '1100px',
    descripcion: 'Registro de hechos relevantes de cada colaborador: felicitaciones, observaciones y amonestaciones.',
    campos: [
      { key: 'colaborador', label: 'Colaborador', tipo: 'select', opciones: 'colaboradores', obligatorio: true, ancho: 'minmax(200px, 1.2fr)' },
      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['Felicitación', 'Observación', 'Amonestación verbal', 'Amonestación escrita'], obligatorio: true },
      { key: 'fecha', label: 'Fecha', tipo: 'fecha', obligatorio: true },
      { key: 'detalle', label: 'Detalle', tipo: 'textarea', obligatorio: true, ancho: 'minmax(240px, 1.8fr)' },
      { key: 'visible', label: 'Visible para el colaborador', tipo: 'switch', etiquetas: ['Visible', 'Privada'] },
    ],
    filas: [
      { colaborador: 'Gutiérrez Paredes, Javier', tipo: 'Felicitación', fecha: '06/03/2026', detalle: 'Inventario sin diferencias por tercer mes consecutivo.', visible: true },
      { colaborador: 'Gutiérrez Paredes, Javier', tipo: 'Observación', fecha: '09/03/2026', detalle: 'Inasistencia sin aviso al turno de mañana.', visible: false },
      { colaborador: 'Medina Torres, Sofía', tipo: 'Felicitación', fecha: '27/02/2026', detalle: 'Campaña digital de verano superó la meta de leads.', visible: true },
    ],
  },
  atributos: {
    clave: 'atributos', singular: 'Atributo',
    descripcion: 'Campos propios de la empresa que se agregan a la ficha del colaborador, del cargo o del área.',
    campos: [
      { key: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true, unico: true },
      { key: 'entidad', label: 'Se aplica a', tipo: 'select', opciones: ['Colaborador', 'Cargo', 'Área'], obligatorio: true },
      { key: 'tipoDato', label: 'Tipo de dato', tipo: 'select', opciones: ['Texto', 'Número', 'Fecha', 'Lista'], obligatorio: true },
      { key: 'opciones', label: 'Opciones de la lista', tipo: 'texto', requeridoSi: { campo: 'tipoDato', valor: 'Lista' }, ayuda: 'Separadas por coma, solo para el tipo Lista.' },
      { key: 'obligatorio', label: 'Obligatorio', tipo: 'switch', etiquetas: ['Sí', 'No'] },
    ],
    filas: [
      { nombre: 'Talla de uniforme', entidad: 'Colaborador', tipoDato: 'Lista', opciones: 'S, M, L, XL', obligatorio: false },
      { nombre: 'Contacto de emergencia', entidad: 'Colaborador', tipoDato: 'Texto', opciones: '', obligatorio: true },
      { nombre: 'Requiere licencia de conducir', entidad: 'Cargo', tipoDato: 'Lista', opciones: 'Sí, No', obligatorio: false },
    ],
  },
  recordatorios: {
    clave: 'recordatorios', singular: 'Recordatorio',
    campos: [
      { key: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true, unico: true, ancho: 'minmax(200px, 1.3fr)' },
      { key: 'evento', label: 'Evento', tipo: 'select', obligatorio: true,
        opciones: ['Cumpleaños', 'Aniversario laboral', 'Fin de contrato', 'Fin de período de prueba', 'Vencimiento de examen médico', 'Vencimiento de documento'] },
      { key: 'anticipacion', label: 'Días de anticipación', tipo: 'numero', obligatorio: true, min: 0, max: 90 },
      { key: 'destinatario', label: 'Avisar a', tipo: 'select', opciones: ['Recursos Humanos', 'Jefatura directa', 'Colaborador', 'RR.HH. y jefatura'], obligatorio: true },
      ACTIVO,
    ],
    filas: [
      { nombre: 'Saludo de cumpleaños', evento: 'Cumpleaños', anticipacion: 0, destinatario: 'Colaborador', activo: true },
      { nombre: 'Renovación de contrato', evento: 'Fin de contrato', anticipacion: 30, destinatario: 'RR.HH. y jefatura', activo: true },
      { nombre: 'Evaluar período de prueba', evento: 'Fin de período de prueba', anticipacion: 15, destinatario: 'Jefatura directa', activo: true },
      { nombre: 'Examen médico ocupacional', evento: 'Vencimiento de examen médico', anticipacion: 30, destinatario: 'Recursos Humanos', activo: false },
    ],
  },
  empresas: {
    clave: 'empresas', singular: 'Empresa', femenino: true, minWidth: '1000px',
    campos: [
      { key: 'razon', label: 'Razón social', tipo: 'texto', obligatorio: true, unico: true, ancho: 'minmax(220px, 1.4fr)' },
      { key: 'ruc', label: 'RUC', tipo: 'texto', obligatorio: true, unico: true, patron: RUC, placeholder: '20XXXXXXXXX' },
      { key: 'direccion', label: 'Domicilio fiscal', tipo: 'texto', obligatorio: true, ancho: 'minmax(220px, 1.4fr)' },
      { key: 'regimen', label: 'Régimen laboral', tipo: 'select', opciones: ['General', 'MYPE · Pequeña empresa', 'MYPE · Microempresa', 'Agrario'], obligatorio: true },
      { key: 'activo', label: 'Estado', tipo: 'switch', etiquetas: ['Activa', 'Inactiva'] },
    ],
    filas: [
      { razon: 'Comercial Andina S.A.C.', ruc: '20512345678', direccion: 'Av. Javier Prado Este 1234, San Isidro, Lima', regimen: 'General', activo: true },
      { razon: 'Andina Logística S.A.C.', ruc: '20601234567', direccion: 'Mz. B Lt. 5, Parque Industrial, Lurín, Lima', regimen: 'MYPE · Pequeña empresa', activo: true },
    ],
  },
  sindicatos: {
    clave: 'sindicatos', singular: 'Sindicato',
    campos: [
      { key: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true, unico: true, ancho: 'minmax(240px, 1.6fr)' },
      { key: 'registro', label: 'N° de registro', tipo: 'texto', obligatorio: true },
      { key: 'cuota', label: 'Cuota sindical (%)', tipo: 'numero', min: 0, max: 5, obligatorio: true },
      { key: 'convenio', label: 'Vigencia del convenio hasta', tipo: 'fecha' },
      ACTIVO,
    ],
    filas: [
      { nombre: 'Sindicato de Trabajadores de Almacén Andina', registro: 'SINT-2019-0451', cuota: 1, convenio: '31/12/2026', activo: true },
    ],
  },
  'cuentas-contables': {
    clave: 'cuentas-contables', singular: 'Cuenta contable', femenino: true,
    descripcion: 'Plan de cuentas usado para los asientos de la planilla (Plan Contable General Empresarial).',
    referenciadoPor: [{ clave: 'estructuras-contables', campo: 'debe' }, { clave: 'estructuras-contables', campo: 'haber' }],
    campos: [
      { key: 'codigo', label: 'Código', tipo: 'texto', obligatorio: true, unico: true, patron: { re: '^\\d{2,8}$', msg: 'El código tiene entre 2 y 8 dígitos.' } },
      { key: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true, ancho: 'minmax(260px, 1.8fr)' },
      { key: 'naturaleza', label: 'Naturaleza', tipo: 'select', opciones: ['Deudora', 'Acreedora'], obligatorio: true },
      { key: 'activo', label: 'Estado', tipo: 'switch', etiquetas: ['Activa', 'Inactiva'] },
    ],
    filas: [
      { codigo: '6211', nombre: 'Sueldos y salarios', naturaleza: 'Deudora', activo: true },
      { codigo: '6214', nombre: 'Gratificaciones', naturaleza: 'Deudora', activo: true },
      { codigo: '6215', nombre: 'Vacaciones', naturaleza: 'Deudora', activo: true },
      { codigo: '6271', nombre: 'Régimen de prestaciones de salud (EsSalud)', naturaleza: 'Deudora', activo: true },
      { codigo: '4031', nombre: 'EsSalud por pagar', naturaleza: 'Acreedora', activo: true },
      { codigo: '4032', nombre: 'ONP por pagar', naturaleza: 'Acreedora', activo: true },
      { codigo: '4111', nombre: 'Sueldos y salarios por pagar', naturaleza: 'Acreedora', activo: true },
      { codigo: '4171', nombre: 'Administradoras de fondos de pensiones', naturaleza: 'Acreedora', activo: true },
    ],
  },
  'centros-de-costo': {
    clave: 'centros-de-costo', singular: 'Centro de costo',
    referenciadoPor: [{ clave: 'puestos', campo: 'centro' }],
    campos: [
      { key: 'codigo', label: 'Código', tipo: 'texto', obligatorio: true, unico: true, patron: { re: '^CC-\\d{3}$', msg: 'Usa el formato CC-000.' }, placeholder: 'CC-000' },
      { key: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true, ancho: 'minmax(200px, 1.4fr)' },
      { key: 'area', label: 'Área', tipo: 'select', opciones: 'areas' },
      { key: 'responsable', label: 'Responsable', tipo: 'select', opciones: 'colaboradores' },
      ACTIVO,
    ],
    filas: [
      { codigo: 'CC-100', nombre: 'Gerencia General', area: 'Gerencia General', responsable: 'Espinoza Vargas, Martín', activo: true },
      { codigo: 'CC-110', nombre: 'Finanzas', area: 'Finanzas', responsable: 'Navarro Ríos, Gonzalo', activo: true },
      { codigo: 'CC-120', nombre: 'Recursos Humanos', area: 'Recursos Humanos', responsable: 'Cáceres Huamán, Lucía', activo: true },
      { codigo: 'CC-200', nombre: 'Operaciones y almacén', area: 'Logística', responsable: 'Benavides Rojas, Diego', activo: true },
      { codigo: 'CC-300', nombre: 'Comercial', area: 'Ventas', responsable: 'Huertas León, Paolo', activo: true },
      { codigo: 'CC-400', nombre: 'Tecnología', area: 'Desarrollo', responsable: 'Chávez Quispe, Renato', activo: true },
    ],
  },
  'estructuras-contables': {
    clave: 'estructuras-contables', singular: 'Estructura contable', femenino: true, minWidth: '1000px',
    descripcion: 'Qué cuenta se carga y cuál se abona por cada ítem de remuneraciones al generar el asiento de la planilla.',
    campos: [
      { key: 'item', label: 'Ítem', tipo: 'select', opciones: 'items', obligatorio: true, unico: true, ancho: 'minmax(240px, 1.5fr)' },
      { key: 'debe', label: 'Cuenta al debe', tipo: 'select', opciones: 'catalogo:cuentas-contables', obligatorio: true, ancho: 'minmax(220px, 1.3fr)' },
      { key: 'haber', label: 'Cuenta al haber', tipo: 'select', opciones: 'catalogo:cuentas-contables', obligatorio: true, ancho: 'minmax(220px, 1.3fr)' },
      { key: 'centro', label: 'Centro de costo', tipo: 'select', opciones: ['Según el colaborador', 'Fijo: CC-100', 'Fijo: CC-120'], obligatorio: true },
    ],
    filas: [
      { item: 'SUE-BAS · Remuneración básica', debe: '6211 · Sueldos y salarios', haber: '4111 · Sueldos y salarios por pagar', centro: 'Según el colaborador' },
      { item: 'ASI-FAM · Asignación familiar', debe: '6211 · Sueldos y salarios', haber: '4111 · Sueldos y salarios por pagar', centro: 'Según el colaborador' },
      { item: 'APO-ESS · EsSalud', debe: '6271 · Régimen de prestaciones de salud (EsSalud)', haber: '4031 · EsSalud por pagar', centro: 'Según el colaborador' },
      { item: 'VAC-REM · Remuneración vacacional', debe: '6215 · Vacaciones', haber: '4111 · Sueldos y salarios por pagar', centro: 'Según el colaborador' },
    ],
  },
  localidades: {
    clave: 'localidades', singular: 'Localidad', femenino: true, minWidth: '1000px',
    campos: [
      { key: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true, unico: true },
      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['Oficina', 'Almacén', 'Tienda', 'Remoto'], obligatorio: true },
      { key: 'direccion', label: 'Dirección', tipo: 'texto', requeridoSi: { campo: 'tipo', valor: 'Oficina' }, ancho: 'minmax(220px, 1.5fr)' },
      { key: 'departamento', label: 'Departamento', tipo: 'select', opciones: ['Lima', 'Arequipa', 'La Libertad', 'Piura', 'Cusco', 'Ica', 'Junín', 'Lambayeque'], obligatorio: true },
      { key: 'activo', label: 'Estado', tipo: 'switch', etiquetas: ['Activa', 'Inactiva'] },
    ],
    filas: [
      { nombre: 'Sede central · San Isidro', tipo: 'Oficina', direccion: 'Av. Javier Prado Este 1234, San Isidro', departamento: 'Lima', activo: true },
      { nombre: 'Almacén Lurín', tipo: 'Almacén', direccion: 'Mz. B Lt. 5, Parque Industrial, Lurín', departamento: 'Lima', activo: true },
      { nombre: 'Tienda Miraflores', tipo: 'Tienda', direccion: 'Av. Larco 455, Miraflores', departamento: 'Lima', activo: true },
      { nombre: 'Remoto', tipo: 'Remoto', direccion: '', departamento: 'Lima', activo: true },
    ],
  },
  feriados: {
    clave: 'feriados', singular: 'Feriado',
    descripcion: 'Los feriados se usan en el Calendario de asistencia y para validar el Recargo Domingo.',
    campos: [
      { key: 'fecha', label: 'Fecha', tipo: 'fecha', obligatorio: true, unico: true },
      { key: 'nombre', label: 'Nombre', tipo: 'texto', obligatorio: true, ancho: 'minmax(240px, 1.6fr)' },
      { key: 'alcance', label: 'Alcance', tipo: 'select', opciones: ['Nacional', 'Regional', 'Día no laborable de la empresa'], obligatorio: true },
    ],
    filas: FERIADOS_2026.map((f) => ({ fecha: f.fecha, nombre: f.nombre, alcance: 'Nacional' })),
  },
};
