/**
 * Sample data for Workflow › Plantillas (P-02.3), Documentos › Plantillas (P-05.1),
 * Analítica (P-02.5) and Gestión de Activos › Inventario (P-06.2).
 */

export type EstadoPlantilla = 'Activa' | 'Inactiva' | 'Error' | 'Incompleta';

export interface PlantillaWorkflow { id: number; nombre: string; tipo: string; estado: EstadoPlantilla; operaciones: number; actualizada: string; solicitudes?: number; }

const w = (id: number, nombre: string, tipo: string, estado: EstadoPlantilla, operaciones: number, actualizada: string): PlantillaWorkflow =>
  ({ id, nombre, tipo, estado, operaciones, actualizada });

export const PLANTILLAS_WORKFLOW: PlantillaWorkflow[] = [
  w(716, 'Alta simple', 'Alta', 'Activa', 4, '28/03/2026'),
  w(715, 'Alta con documentos y cursos', 'Alta', 'Activa', 7, '27/03/2026'),
  w(714, 'Solicitud bono', 'Flexible', 'Activa', 3, '26/03/2026'),
  w(713, 'Solicitud de Pre Ingreso', 'Pre-Ingreso', 'Activa', 5, '25/03/2026'),
  w(712, 'Cambio de cargo', 'Movimiento', 'Activa', 4, '24/03/2026'),
  w(711, 'Cambio de sueldo', 'Movimiento', 'Incompleta', 2, '23/03/2026'),
  w(710, 'Baja voluntaria', 'Baja', 'Activa', 6, '22/03/2026'),
  w(709, 'Baja por término de contrato', 'Baja', 'Inactiva', 5, '21/03/2026'),
  w(708, 'Solicitud de activo', 'Flexible', 'Activa', 3, '20/03/2026'),
  w(707, 'Generar contrato al crear trabajo', 'Alta', 'Activa', 2, '19/03/2026'),
  w(706, 'Generar anexo al cambiar trabajo', 'Movimiento', 'Error', 2, '18/02/2026'),
  w(705, 'Generar acta al terminar trabajo', 'Baja', 'Activa', 2, '17/02/2026'),
  w(704, 'Asignar curso de inducción', 'Alta', 'Activa', 1, '16/02/2026'),
  w(703, 'Encuesta de salida', 'Baja', 'Inactiva', 1, '15/02/2026'),
  w(702, 'Tarea a TI: crear cuentas', 'Alta', 'Activa', 2, '14/02/2026'),
  w(701, 'Solicitud de adelanto de sueldo', 'Flexible', 'Incompleta', 1, '13/02/2026'),
  w(700, 'Cambio de supervisor', 'Movimiento', 'Activa', 2, '12/02/2026'),
  w(699, 'Solicitud de capacitación externa', 'Flexible', 'Activa', 4, '11/02/2026'),
  w(698, 'Renovación de contrato', 'Movimiento', 'Activa', 3, '10/02/2026'),
  w(697, 'Solicitud de teletrabajo', 'Flexible', 'Error', 2, '09/02/2026'),
  w(696, 'Alta practicante', 'Alta', 'Activa', 4, '08/02/2026'),
  w(695, 'Cambio de jornada', 'Movimiento', 'Inactiva', 2, '07/02/2026'),
  w(694, 'Solicitud de reembolso', 'Flexible', 'Activa', 3, '06/02/2026'),
  w(693, 'Baja por mutuo acuerdo', 'Baja', 'Incompleta', 3, '05/02/2026'),
  w(692, 'Pre ingreso con exámenes médicos', 'Pre-Ingreso', 'Activa', 6, '04/02/2026'),
];

export interface PlantillaDocumento { id: number; nombre: string; tipo: string; activa: boolean; carpeta: string; }

const d = (id: number, nombre: string, tipo: string, carpeta: string, activa = true): PlantillaDocumento => ({ id, nombre, tipo, carpeta, activa });
const FICHA = 'Ficha del Colaborador';

export const PLANTILLAS_DOCUMENTO: PlantillaDocumento[] = [
  d(0, 'Contrato de trabajo – Indefinido', 'Contrato', '…/CONTRATOS'),
  d(1, 'Contrato de trabajo – Plazo fijo', 'Contrato', '…/CONTRATOS'),
  d(2, 'Contrato de practicante', 'Contrato', '…/CONTRATOS', false),
  d(3, 'Anexo de cambio de cargo', 'Anexo', '…/ANEXOS'),
  d(4, 'Anexo de cambio de sueldo', 'Anexo', '…/ANEXOS'),
  d(5, 'Anexo de trabajo remoto', 'Anexo de asistencia', '…/ANEXOS'),
  d(6, 'Anexo de cambio de jornada', 'Anexo de asistencia', '…/ANEXOS'),
  d(7, 'Certificado de trabajo', 'Certificado', FICHA),
  d(8, 'Certificado de antigüedad', 'Certificado de antigüedad', FICHA),
  d(9, 'Certificado de renta de quinta', 'Certificado', FICHA),
  d(10, 'Carta de preaviso de término', 'Carta de aviso', '…/CARTAS'),
  d(11, 'Carta de amonestación', 'Carta de aviso', '…/CARTAS'),
  d(12, 'Acta de entrega de activos', 'Acta de entrega', '…/ACTIVOS', false),
  d(13, 'Acta de devolución de activos', 'Acta de entrega', '…/ACTIVOS'),
  d(14, 'Acta de entrega de EPP', 'Acta de entrega', '…/SST'),
  d(15, 'Constancia de vacaciones', 'Certificado', '…/VACACIONES'),
  d(16, 'Solicitud de vacaciones', 'Anexo de asistencia', '…/VACACIONES'),
  d(17, 'Liquidación de beneficios sociales', 'Certificado', '…/LIQUIDACIÓN'),
  d(18, 'Carta de renuncia aceptada', 'Carta de aviso', '…/CARTAS', false),
  d(19, 'Política de seguridad de la información', 'Anexo', FICHA),
  d(20, 'Reglamento interno de trabajo', 'Anexo', FICHA),
  d(21, 'Compromiso de confidencialidad', 'Anexo', '…/ANEXOS'),
  d(22, 'Autorización de descuento', 'Anexo', '…/ANEXOS'),
  d(23, 'Convenio de capacitación', 'Anexo', '…/CAPACITACIONES'),
  d(24, 'Constancia de entrega de boletas', 'Certificado', FICHA),
];

export interface Dashboard { id: number; nombre: string; descripcion: string; editado: string; }
export interface Widget { id: number; nombre: string; tipo: string; origen: string; editado: string; }

const b = (id: number, nombre: string, descripcion: string, editado: string): Dashboard => ({ id, nombre, descripcion, editado });
export const DASHBOARDS: Dashboard[] = [
  b(14, 'Demografía de colaboradores', 'Género, edad y nacionalidad de la dotación.', '18/03/2026'),
  b(13, 'Rotación 2026', 'Entradas, salidas y tasa de rotación mensual.', '17/03/2026'),
  b(12, 'Ausentismo', 'Días no trabajados por tipo de ausencia.', '16/03/2026'),
  b(11, 'Horas extras', 'Horas extras por área y por mes.', '15/03/2026'),
  b(10, 'Costo de planilla', 'Gasto mensual por centro de costo.', '14/03/2026'),
  b(9, 'Vacaciones', 'Saldos y vacaciones tomadas por área.', '13/03/2026'),
  b(8, 'Headcount vs. plan', 'Posiciones ocupadas frente al plan.', '12/03/2026'),
  b(7, 'Bandas salariales', 'Ubicación en banda por cargo.', '11/03/2026'),
  b(6, 'Clima laboral 2025', 'Resultados de la encuesta de clima.', '10/03/2026'),
  b(5, 'Capacitaciones', 'Horas de capacitación por colaborador.', '09/03/2026'),
  b(4, 'SST · Evidencias', 'Evidencias vigentes, por vencer y vencidas.', '08/03/2026'),
  b(3, 'Antigüedad', 'Distribución por años en la empresa.', '07/03/2026'),
  b(2, 'Dashboard nuevo', '', '06/03/2026'),
  b(1, 'Dotación por división', 'Colaboradores por división y área.', '05/03/2026'),
];

export const WIDGETS: Widget[] = [
  { id: 0, nombre: 'Distribución por género', tipo: 'Anillo', origen: 'Nexo AI', editado: '16/03/2026' },
  { id: 1, nombre: 'Rango etario', tipo: 'Circular', origen: 'Librería Nexo', editado: '15/03/2026' },
  { id: 2, nombre: 'Top 5 mayores edades', tipo: 'Embudo', origen: 'Nexo AI', editado: '14/03/2026' },
  { id: 3, nombre: 'Nacionalidad', tipo: 'Circular', origen: 'Librería Nexo', editado: '13/03/2026' },
  { id: 4, nombre: 'Colaboradores por división', tipo: 'Barras', origen: 'Propio', editado: '12/03/2026' },
  { id: 5, nombre: 'Total colaboradores', tipo: 'Tarjeta', origen: 'Librería Nexo', editado: '11/03/2026' },
];

export type EstadoActivo = 'Disponible' | 'Asignado' | 'Mantenimiento' | 'Inactivo';

export interface MovimientoActivo { fecha: string; asignado: string; estado: EstadoActivo; comentario: string; admin: string; }
export interface Activo { id: string; nombre: string; categoria: string; marca: string; estado: EstadoActivo; asignado: string; historial: MovimientoActivo[]; }

const a = (id: string, nombre: string, categoria: string, marca: string, estado: EstadoActivo, asignado = '—'): Activo =>
  ({ id, nombre, categoria, marca, estado, asignado, historial: [] });
const FA = 'Alamos Ruiz, Florencia';

export const ACTIVOS: Activo[] = [
  { ...a('ACT-0042', 'Laptop ThinkPad E14 Gen 5', 'Computadores', 'Lenovo', 'Asignado', FA), historial: [
    { fecha: '20/01/2026 11:00', asignado: FA, estado: 'Asignado', comentario: 'Devuelto por el servicio técnico.', admin: 'Lucía Cáceres' },
    { fecha: '14/01/2026 16:30', asignado: FA, estado: 'Mantenimiento', comentario: 'Cambio de batería en garantía.', admin: 'Lucía Cáceres' },
    { fecha: '02/06/2023 10:15', asignado: FA, estado: 'Asignado', comentario: 'Entrega con acta firmada.', admin: 'Rodrigo Paredes' },
    { fecha: '01/06/2023 09:00', asignado: '—', estado: 'Disponible', comentario: 'Ingreso al inventario (factura F001-2231).', admin: 'Rodrigo Paredes' },
  ] },
  a('ACT-0043', 'Laptop ThinkPad E14 Gen 5', 'Computadores', 'Lenovo', 'Disponible'),
  a('ACT-0051', 'MacBook Air 13"', 'Computadores', 'Apple', 'Asignado', 'Herrera Castillo, Valeria'),
  a('ACT-0107', 'Monitor 24" P2422H', 'Tecnología', 'Dell', 'Asignado', FA),
  a('ACT-0108', 'Monitor 24" P2422H', 'Tecnología', 'Dell', 'Mantenimiento'),
  a('ACT-0213', 'Celular Galaxy A54', 'Tecnología', 'Samsung', 'Asignado', FA),
  a('ACT-0214', 'Celular Galaxy A54', 'Tecnología', 'Samsung', 'Asignado', 'Benavides Rojas, Diego'),
  a('ACT-0301', 'Casco de seguridad', 'EPP', '3M', 'Asignado', 'Pérez Soto, Luis'),
  a('ACT-0302', 'Chaleco reflectivo', 'EPP', 'Steelpro', 'Asignado', 'Gutiérrez Paredes, Javier'),
  a('ACT-0303', 'Zapatos de seguridad T42', 'EPP', 'Caterpillar', 'Disponible'),
  a('ACT-0410', 'Polo corporativo M', 'Uniformes', 'Comercial Andina', 'Asignado', 'Medina Torres, Sofía'),
  a('ACT-0502', 'Licencia Microsoft 365', 'Licencias', 'Microsoft', 'Asignado', 'Chávez Quispe, Renato'),
  a('ACT-0601', 'Camioneta Hilux', 'Transporte', 'Toyota', 'Mantenimiento'),
  a('ACT-0702', 'Taladro percutor', 'Construcción', 'Bosch', 'Inactivo'),
  a('ACT-0044', 'Laptop ThinkPad E14 Gen 5', 'Computadores', 'Lenovo', 'Asignado', 'Zapata Ugarte, Miguel'),
  a('ACT-0045', 'Laptop ThinkPad E14 Gen 5', 'Computadores', 'Lenovo', 'Asignado', 'Ríos Calderón, Ana'),
];
