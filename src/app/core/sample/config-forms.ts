import { ConfigFormDef } from '../genericos';

const EVENTOS: [string, string][] = [
  ['vac', 'Solicitud de vacaciones o permiso'], ['res', 'Solicitud aprobada o rechazada'], ['bol', 'Boleta de pago disponible'],
  ['fir', 'Documento pendiente de firma'], ['rec', 'Reconocimiento recibido'], ['enc', 'Encuesta asignada'],
];

/** Generic settings forms, keyed by the `config` value in the route data. */
export const CONFIG_FORMS: Record<string, ConfigFormDef> = {
  // Screens with their own form (Asistencia, Remuneraciones, Parámetros generales): stored the same way.
  'asistencia': { clave: 'asistencia', tabs: [], valores: {umbralSaldo: 30, permitirAdelanto: false, anticipacionDias: 3, sobretasaDomingo: 100, horasJornada: 8} },
  'remuneraciones': { clave: 'remuneraciones', tabs: [], valores: {periodicidad: 'Mensual', diaPago: 31, diaAdelanto: 15, adelantoPct: 40, redondeo: 'Sin redondeo', boletaAportes: true, boletaFirma: true, boletaCorreo: true, boletaPortal: true} },
  'parametros-generales': { clave: 'parametros-generales', tabs: [], valores: {pais: 'Perú', contabilidad: '', alertaRecontratacion: 30, horas: 43, dias: 30, mailAdmin: 'Gestión de Personas', mailCumple: 'Comunicaciones Internas', mailEncuestas: 'Clima y Cultura', formatoNombre: 'Apellido, Nombre'} },
  documentos: {
    clave: 'documentos',
    tabs: [{ nombre: 'General', secciones: [
      { titulo: 'Firma de documentos', campos: [
        { key: 'metodo', label: 'Método de firma', tipo: 'select', opciones: ['Firma digital con certificado', 'Firma electrónica simple (OTP por correo)'] },
        { key: 'recordar', label: 'Recordar firmas pendientes', tipo: 'switch' },
        { key: 'recordarDias', label: 'Cada cuántos días', tipo: 'numero', min: 1, max: 30, dependeDe: 'recordar' },
      ] },
      { titulo: 'Vencimientos y conservación', campos: [
        { key: 'avisoVence', label: 'Avisar antes del vencimiento de un documento (días)', tipo: 'numero', min: 0, max: 90 },
        { key: 'retencion', label: 'Años de conservación de documentos laborales', tipo: 'numero', min: 1, max: 20,
          ayuda: 'Las boletas y documentos laborales se suelen conservar al menos 5 años.' },
        { key: 'descarga', label: 'Permitir que los colaboradores descarguen sus documentos en PDF', tipo: 'switch' },
      ] },
    ] }],
    valores: { metodo: 'Firma digital con certificado', recordar: true, recordarDias: 3, avisoVence: 30, retencion: 5, descarga: true },
  },
  compensaciones: {
    clave: 'compensaciones',
    tabs: [{ nombre: 'General', secciones: [
      { titulo: 'Bandas salariales', campos: [
        { key: 'referencia', label: 'Referencia de mercado para el punto medio', tipo: 'select', opciones: ['Percentil 50', 'Percentil 62.5', 'Percentil 75'] },
        { key: 'compaMin', label: 'Compa ratio mínimo aceptable', tipo: 'numero', min: 0.5, max: 1 },
        { key: 'compaMax', label: 'Compa ratio máximo aceptable', tipo: 'numero', min: 1, max: 1.5 },
        { key: 'ajuste', label: 'Ajuste anual de bandas por inflación (%)', tipo: 'numero', min: 0, max: 15 },
      ] },
      { titulo: 'Visibilidad', campos: [
        { key: 'verBanda', label: 'Mostrar al colaborador su ubicación en la banda', tipo: 'switch' },
        { key: 'verJefe', label: 'Mostrar a las jefaturas las bandas de su equipo', tipo: 'switch' },
      ] },
    ] }],
    valores: { referencia: 'Percentil 50', compaMin: 0.8, compaMax: 1.2, ajuste: 3, verBanda: false, verJefe: true },
  },
  encuestas: {
    clave: 'encuestas',
    tabs: [{ nombre: 'General', secciones: [
      { titulo: 'Confidencialidad', campos: [
        { key: 'minimo', label: 'Respuestas mínimas para mostrar resultados de un grupo', tipo: 'numero', min: 3, max: 20,
          ayuda: 'Evita que se pueda identificar a quien respondió en equipos pequeños.' },
        { key: 'comentarios', label: 'Permitir comentarios abiertos', tipo: 'switch' },
      ] },
      { titulo: 'Participación', campos: [
        { key: 'escala', label: 'Escala por defecto', tipo: 'select', opciones: ['1 a 5', '1 a 7', 'eNPS (0 a 10)'] },
        { key: 'recordatorios', label: 'Enviar recordatorios a quienes no respondieron', tipo: 'switch' },
        { key: 'recordatorioDias', label: 'Cada cuántos días', tipo: 'numero', min: 1, max: 14, dependeDe: 'recordatorios' },
      ] },
    ] }],
    valores: { minimo: 5, comentarios: true, escala: '1 a 5', recordatorios: true, recordatorioDias: 3 },
  },
  denuncias: {
    clave: 'denuncias',
    nota: 'Define cómo se reciben y gestionan las denuncias. Revisa los plazos con el área legal según el tipo de caso.',
    tabs: [{ nombre: 'General', secciones: [
      { titulo: 'Recepción', campos: [
        { key: 'anonimo', label: 'Permitir denuncias anónimas', tipo: 'switch' },
        { key: 'externo', label: 'Habilitar formulario público para terceros (proveedores, clientes)', tipo: 'switch' },
        { key: 'correo', label: 'Correo del comité que recibe las denuncias', tipo: 'email', obligatorio: true },
      ] },
      { titulo: 'Gestión', campos: [
        { key: 'acuse', label: 'Plazo para acusar recibo (días hábiles)', tipo: 'numero', min: 1, max: 10 },
        { key: 'investigacion', label: 'Plazo objetivo de investigación (días calendario)', tipo: 'numero', min: 5, max: 90 },
        { key: 'seguimiento', label: 'Permitir al denunciante ver el estado con un código de seguimiento', tipo: 'switch' },
      ] },
    ] }],
    valores: { anonimo: true, externo: false, correo: 'comite.etica@comercialandina.pe', acuse: 3, investigacion: 30, seguimiento: true },
  },
  sst: {
    clave: 'sst',
    tabs: [{ nombre: 'General', secciones: [
      { titulo: 'Organización de SST', campos: [
        { key: 'organo', label: 'Órgano de SST', tipo: 'select', opciones: ['Supervisor de SST', 'Comité de SST'],
          ayuda: 'Con menos de 20 trabajadores corresponde un supervisor; con 20 o más, un comité paritario.' },
        { key: 'responsable', label: 'Correo del responsable de SST', tipo: 'email', obligatorio: true },
      ] },
      { titulo: 'Capacitación y salud', campos: [
        { key: 'capacitaciones', label: 'Capacitaciones de SST por año', tipo: 'numero', min: 1, max: 12 },
        { key: 'emo', label: 'Periodicidad del examen médico ocupacional (años)', tipo: 'numero', min: 1, max: 3 },
        { key: 'incidentes', label: 'Plazo para registrar un incidente (horas)', tipo: 'numero', min: 1, max: 72 },
        { key: 'alertas', label: 'Alertar requisitos de SST vencidos al responsable', tipo: 'switch' },
      ] },
    ] }],
    valores: { organo: 'Supervisor de SST', responsable: 'l.perez@comercialandina.pe', capacitaciones: 4, emo: 2, incidentes: 24, alertas: true },
  },
  notificaciones: {
    clave: 'notificaciones',
    nota: 'Elige por qué canal se avisa cada evento. Los colaboradores pueden silenciar los correos opcionales desde su perfil.',
    tabs: [
      { nombre: 'Correo', secciones: [{ titulo: 'Notificaciones por correo', campos: EVENTOS.map(([k, label]) => ({ key: 'mail_' + k, label, tipo: 'switch' as const })) }] },
      { nombre: 'Portal', secciones: [{ titulo: 'Notificaciones en el portal', campos: EVENTOS.map(([k, label]) => ({ key: 'web_' + k, label, tipo: 'switch' as const })) }] },
      { nombre: 'Remitente', secciones: [{ titulo: 'Remitente de los correos', campos: [
        { key: 'remitente', label: 'Nombre del remitente', tipo: 'texto', obligatorio: true },
        { key: 'respuesta', label: 'Correo de respuesta', tipo: 'email', obligatorio: true },
      ] }] },
    ],
    valores: {
      ...Object.fromEntries(EVENTOS.map(([k]) => ['mail_' + k, k !== 'rec'])), ...Object.fromEntries(EVENTOS.map(([k]) => ['web_' + k, true])),
      remitente: 'Recursos Humanos · Comercial Andina', respuesta: 'rrhh@comercialandina.pe',
    },
  },
  'ca-tolerancias': {
    clave: 'ca-tolerancias',
    nota: 'Estos valores se usan para calcular atrasos, salidas anticipadas y horas extras en Control de Asistencia. La tolerancia de atraso se define en cada turno.',
    tabs: [
      { nombre: 'Tolerancias', secciones: [{ titulo: 'Tolerancias de la jornada', campos: [
        { key: 'toleranciaSalida', label: 'Tolerancia de salida anticipada (minutos)', tipo: 'numero', min: 0, max: 60 },
        { key: 'minExceso', label: 'Exceso mínimo para considerar horas extras (minutos)', tipo: 'numero', min: 1, max: 120,
          ayuda: 'Los excesos menores no pasan a Aprobación de Horas Extras.' },
        { key: 'contarAntes', label: 'Considerar como horas extras el tiempo antes del inicio del turno', tipo: 'switch' },
      ] }] },
      { nombre: 'Alertas', secciones: [{ titulo: 'Alertas del Panel de Control', descripcion: 'Se recalculan durante el día y se muestran a los usuarios con acceso al recinto.', campos: [
        { key: 'alDisminucion', label: 'Disminución anormal de asistencia', tipo: 'switch' },
        { key: 'umbralDisminucion', label: 'Puntos porcentuales por debajo del promedio del mismo día de la semana', tipo: 'numero', min: 5, max: 50, dependeDe: 'alDisminucion' },
        { key: 'alSinFoto', label: 'Registros sin foto', tipo: 'switch' },
        { key: 'alIncompletos', label: 'Registros incompletos del día hábil anterior', tipo: 'switch' },
        { key: 'alHhee', label: 'Posibles horas extras por aprobar', tipo: 'switch' },
        { key: 'alLunes', label: 'Inasistencias en lunes', tipo: 'switch' },
        { key: 'lunes', label: 'Cantidad de lunes en el mes', tipo: 'numero', min: 1, max: 4, dependeDe: 'alLunes' },
        { key: 'alInasistencias', label: 'Inasistencias en el mes', tipo: 'switch' },
        { key: 'inasistencias', label: 'Días de inasistencia en el mes', tipo: 'numero', min: 1, max: 10, dependeDe: 'alInasistencias' },
        { key: 'alDomingos', label: 'Domingos trabajados en el mes', tipo: 'switch' },
        { key: 'domingos', label: 'Cantidad de domingos', tipo: 'numero', min: 1, max: 5, dependeDe: 'alDomingos' },
      ] }] },
    ],
    valores: {
      toleranciaSalida: 5, minExceso: 30, contarAntes: true, alDisminucion: true, umbralDisminucion: 15, alSinFoto: true, alIncompletos: true, alHhee: true,
      alLunes: true, lunes: 2, alInasistencias: true, inasistencias: 3, alDomingos: true, domingos: 2,
    },
  },
  'ca-metodos': {
    clave: 'ca-metodos',
    nota: 'Las marcas que no cumplen estas reglas se rechazan y quedan en Marcas Fallidas.',
    tabs: [{ nombre: 'General', secciones: [
      { titulo: 'Métodos permitidos', campos: [
        { key: 'web', label: 'Portal web (widget Registrar Asistencia de Mi Portal)', tipo: 'switch' },
        { key: 'app', label: 'App móvil con GPS', tipo: 'switch' },
        { key: 'qr', label: 'Código QR del recinto', tipo: 'switch' },
        { key: 'foto', label: 'Foto desde un dispositivo compartido', tipo: 'switch' },
      ] },
      { titulo: 'Validaciones', campos: [
        { key: 'exigirFoto', label: 'Exigir foto en las marcas desde la app o QR', tipo: 'switch' },
        { key: 'exigirRadio', label: 'Exigir que la marca esté dentro del radio del recinto', tipo: 'switch' },
        { key: 'radioDefecto', label: 'Radio por defecto de los recintos nuevos (metros)', tipo: 'numero', min: 20, max: 2000 },
      ] },
    ] }],
    valores: { web: true, app: true, qr: true, foto: false, exigirFoto: true, exigirRadio: true, radioDefecto: 150 },
  },
};
