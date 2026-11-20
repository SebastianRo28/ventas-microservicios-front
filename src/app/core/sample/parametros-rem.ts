/**
 * Legal payroll parameters (Peru). Reference values for the prototype: check them against the official
 * source (MTPE, SUNAT, SBS) before using them in a real payroll.
 */
export interface ParametroGeneral {
  clave: 'rmv' | 'uit' | 'asigFamiliarPct' | 'essaludPct' | 'onpPct' | 'afpAportePct' | 'primaSeguroPct' | 'deduccionUit' | 'remMaxAsegurable';
  nombre: string;
  valor: number;
  unidad: 'S/' | '%' | 'UIT';
  vigenteDesde: string;
  fuente: string;
}

export const PARAMETROS_GENERALES: ParametroGeneral[] = [
  { clave: 'rmv', nombre: 'Remuneración Mínima Vital (RMV)', valor: 1130, unidad: 'S/', vigenteDesde: '01/01/2025', fuente: 'D.S. 006-2024-TR' },
  { clave: 'uit', nombre: 'Unidad Impositiva Tributaria (UIT)', valor: 5500, unidad: 'S/', vigenteDesde: '01/01/2026', fuente: 'SUNAT' },
  { clave: 'asigFamiliarPct', nombre: 'Asignación familiar', valor: 10, unidad: '%', vigenteDesde: '01/01/2025', fuente: 'Ley 25129 (% de la RMV)' },
  { clave: 'essaludPct', nombre: 'Aporte EsSalud (empleador)', valor: 9, unidad: '%', vigenteDesde: '01/01/2025', fuente: 'Ley 26790' },
  { clave: 'onpPct', nombre: 'Aporte ONP', valor: 13, unidad: '%', vigenteDesde: '01/01/2025', fuente: 'D.L. 19990' },
  { clave: 'afpAportePct', nombre: 'Aporte obligatorio AFP', valor: 10, unidad: '%', vigenteDesde: '01/01/2025', fuente: 'SBS' },
  { clave: 'primaSeguroPct', nombre: 'Prima de seguro AFP', valor: 1.37, unidad: '%', vigenteDesde: '01/01/2025', fuente: 'SBS' },
  { clave: 'deduccionUit', nombre: 'Deducción anual renta de 5ta categoría', valor: 7, unidad: 'UIT', vigenteDesde: '01/01/2025', fuente: 'Ley del Impuesto a la Renta, art. 46' },
];

export interface ComisionAfp { afp: string; comisionFlujoPct: number; comisionSaldoPct: number; }

export const COMISIONES_AFP: ComisionAfp[] = [
  { afp: 'Habitat', comisionFlujoPct: 1.47, comisionSaldoPct: 1.25 },
  { afp: 'Integra', comisionFlujoPct: 1.55, comisionSaldoPct: 0.78 },
  { afp: 'Prima', comisionFlujoPct: 1.6, comisionSaldoPct: 1.25 },
  { afp: 'Profuturo', comisionFlujoPct: 1.69, comisionSaldoPct: 1.2 },
];

/** Annual 5th-category income tax brackets, in UIT. `hasta` null = no upper limit. */
export interface TramoRenta { id?: number; desde: number; hasta: number | null; tasaPct: number; }

export const TRAMOS_RENTA: TramoRenta[] = [
  { desde: 0, hasta: 5, tasaPct: 8 },
  { desde: 5, hasta: 20, tasaPct: 14 },
  { desde: 20, hasta: 35, tasaPct: 17 },
  { desde: 35, hasta: 45, tasaPct: 20 },
  { desde: 45, hasta: null, tasaPct: 30 },
];

/** Payroll settings edited in Remuneraciones › Configuraciones. */
export interface ConfigRem {
  periodicidad: 'Mensual' | 'Quincenal';
  diaPago: number;
  diaAdelanto: number;
  adelantoPct: number;
  redondeo: 'Sin redondeo' | 'Al décimo' | 'Al entero';
  boletaAportes: boolean;
  boletaFirma: boolean;
  boletaCorreo: boolean;
  boletaPortal: boolean;
}

export const CONFIG_REM: ConfigRem = {
  periodicidad: 'Mensual', diaPago: 31, diaAdelanto: 15, adelantoPct: 40, redondeo: 'Sin redondeo',
  boletaAportes: true, boletaFirma: true, boletaCorreo: true, boletaPortal: true,
};
