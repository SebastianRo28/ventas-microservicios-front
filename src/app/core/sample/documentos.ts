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
