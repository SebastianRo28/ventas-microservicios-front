/** Sample data for Documentos y Firma (design P-05.5 Documentos, P-05.7 Firma electrónica). */

export type Check = 'si' | 'no' | 'na';

export interface Documento {
  id: number;
  colaborador: string;
  empresa: string;
  archivo: string;
  fecha: string;
  /** Revisión, firma del colaborador, firma de la empresa. */
  revision: Check;
  firmaColaborador: Check;
  firmaEmpresa: Check;
  oculto: boolean;
}

export interface DocumentoEliminado {
  id: number;
  colaborador: string;
  empresa: string;
  archivo: string;
  fecha: string;
  eliminado: string;
  eliminadoPor: string;
  disponibleHasta: string;
}

const E = 'Comercial Andina S.A.C.';
const d = (id: number, colaborador: string, archivo: string, fecha: string, revision: Check, firmaColaborador: Check, firmaEmpresa: Check): Documento =>
  ({ id, colaborador, empresa: E, archivo, fecha, revision, firmaColaborador, firmaEmpresa, oculto: false });

export const DOCUMENTOS: Documento[] = [
  d(0, 'Alamos Ruiz, Florencia', '2026_03_12_10-14_Anexo_de_trabajo_remoto_Florencia_Alamos_F1.pdf', '12/03/2026', 'si', 'no', 'si'),
  d(1, 'Chávez Quispe, Renato', '2026_03_12_10-14_Anexo_de_trabajo_remoto_Renato_Chavez_F1.pdf', '12/03/2026', 'si', 'no', 'si'),
  d(2, 'Ortiz Ramírez, Daniela', '2026_03_01_09-02_Contrato_de_practicante_Daniela_Ortiz_F1.pdf', '01/03/2026', 'na', 'no', 'no'),
  d(3, 'Herrera Castillo, Valeria', '2026_02_10_16-40_Acta_de_entrega_de_activos_Valeria_Herrera_F1.pdf', '10/02/2026', 'na', 'si', 'si'),
  d(4, 'Gutiérrez Paredes, Javier', '2026_03_05_11-20_Carta_de_preaviso_Javier_Gutierrez_F1.pdf', '05/03/2026', 'no', 'no', 'no'),
  d(5, 'Medina Torres, Sofía', '2026_01_20_08-30_Certificado_de_trabajo_Sofia_Medina_F1.pdf', '20/01/2026', 'na', 'na', 'si'),
  d(6, 'Pérez Soto, Luis', '2026_03_10_15-05_Acta_de_entrega_de_EPP_Luis_Perez_F1.pdf', '10/03/2026', 'na', 'si', 'no'),
];

export const PAPELERA: DocumentoEliminado[] = [
  { id: 0, colaborador: 'Zapata Ugarte, Miguel', empresa: E, archivo: '2026_02_02_09-10_Anexo_de_cambio_de_jornada_Miguel_Zapata_F1.pdf',
    fecha: '02/02/2026', eliminado: '05/02/2026', eliminadoPor: 'Rodrigo Paredes', disponibleHasta: '06/04/2026' },
  { id: 1, colaborador: 'Ríos Calderón, Ana', empresa: E, archivo: '2026_01_15_12-00_Carta_de_amonestacion_Ana_Rios_F1.pdf',
    fecha: '15/01/2026', eliminado: '20/01/2026', eliminadoPor: 'Lucía Cáceres', disponibleHasta: '21/03/2026' },
];
