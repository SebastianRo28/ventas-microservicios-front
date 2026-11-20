import { Component } from '@angular/core';
import { downloadCsv, parseCsv } from '../../core/csv';
import { HrDataService } from '../../core/hr-data.service';
import { CATEGORIAS_IMPORTADOR, Importador, MODULOS_IMPORTADOR } from '../../core/sample/reportes';

interface Campo { nombre: string; formato: string; validar?: (v: string) => boolean; error?: string; }

/** Template of the "Colaboradores" importer (design 5.3). Other importers only check the column layout. */
const CAMPOS_COLABORADORES: Campo[] = [
  { nombre: 'Código de Ficha', formato: 'F1, F2…', validar: (v) => /^F\d+$/i.test(v), error: 'debe tener el formato F1, F2…' },
  { nombre: 'Número de Documento', formato: '8 dígitos para DNI; 9 a 12 para CE o pasaporte', validar: (v) => /^\d{8}$|^[A-Z0-9]{9,12}$/i.test(v), error: 'debe tener 8 dígitos (DNI) o 9 a 12 caracteres' },
  { nombre: 'Fecha Nac', formato: 'AAAA-MM-DD', validar: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)), error: 'tiene un formato inválido. Usa AAAA-MM-DD' },
  { nombre: 'Sexo', formato: 'M / F', validar: (v) => /^[MF]$/i.test(v), error: 'debe ser M o F' },
  { nombre: 'Nacionalidad', formato: 'Código ISO-3166 (PE, VE, CO…)', validar: (v) => /^[A-Z]{2}$/i.test(v), error: 'debe ser un código ISO de 2 letras' },
  { nombre: 'Estado civil', formato: 'Soltero / Casado / Divorciado / Viudo / Conviviente',
    validar: (v) => /^(soltero|casado|divorciado|viudo|conviviente)$/i.test(v), error: 'no es un valor permitido' },
  { nombre: 'Departamento / Provincia / Distrito', formato: 'Ver lista' },
  { nombre: 'Nombre de vía', formato: 'Máx. 20 caracteres', validar: (v) => v.length <= 20, error: 'supera los 20 caracteres' },
];

interface Resultado { archivo: string; filas: number; errores: string[]; }

/** 5.3 Reportería › Importadores, with the importer instructions modal. */
@Component({
  selector: 'app-importadores',
  templateUrl: './importadores.component.html'
})
export class ImportadoresComponent {
  readonly modulos = MODULOS_IMPORTADOR;
  modulo = 0;
  categoria = 'Todos';
  query = '';
  all: Importador[] = [];

  abierto: Importador | null = null;
  inactivos = false;
  resultado: Resultado | null = null;

  constructor(data: HrDataService) {
    data.importadores().subscribe((i) => (this.all = i));
  }

  get enModulo(): Importador[] { return this.all.filter((i) => i.modulo === MODULOS_IMPORTADOR[this.modulo]); }

  get categorias(): { nombre: string; n: number }[] {
    return CATEGORIAS_IMPORTADOR.map((nombre) => ({
      nombre, n: nombre === 'Todos' ? this.enModulo.length : this.enModulo.filter((i) => i.categoria === nombre).length,
    }));
  }

  get visibles(): Importador[] {
    const q = this.query.trim().toLowerCase();
    return this.enModulo.filter((i) => (this.categoria === 'Todos' || i.categoria === this.categoria) && (!q || i.nombre.toLowerCase().includes(q)));
  }

  pickModulo(i: number): void { this.modulo = i; this.categoria = 'Todos'; }

  get campos(): Campo[] {
    if (!this.abierto) return [];
    return this.abierto.nombre === 'Colaboradores' && this.abierto.tipo === 'Importador'
      ? CAMPOS_COLABORADORES
      : [{ nombre: 'Número de Documento', formato: 'Identifica al colaborador o registro' }, { nombre: this.abierto.nombre, formato: 'Valor a cargar' }];
  }

  abrir(i: Importador): void { this.abierto = i; this.resultado = null; this.inactivos = false; }

  descargarTemplate(): void {
    if (!this.abierto) return;
    downloadCsv(`template-${this.abierto.tipo.toLowerCase()}-${this.abierto.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      this.campos.map((c) => c.nombre), []);
  }

  /** Reads the selected CSV and checks columns and each row against the template rules. */
  async cargar(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const errores: string[] = [];
    if (!/\.csv$/i.test(file.name)) {
      this.resultado = { archivo: file.name, filas: 0, errores: ['El archivo debe ser .csv (usa “Guardar como CSV” en Excel).'] };
      return;
    }
    const filas = parseCsv(await file.text());
    const [header, ...data] = filas;
    const esperado = this.campos.map((c) => c.nombre);
    if (!header || esperado.some((c, i) => (header[i] ?? '').trim() !== c)) {
      errores.push(`Las columnas no coinciden con el template. Se esperaba: ${esperado.join(', ')}.`);
    } else {
      data.forEach((fila, i) => this.campos.forEach((c, j) => {
        const v = (fila[j] ?? '').trim();
        if (!v) errores.push(`Fila ${i + 2}: “${c.nombre}” está vacío.`);
        else if (c.validar && !c.validar(v)) errores.push(`Fila ${i + 2}: “${c.nombre}” ${c.error} (${v}).`);
      }));
      if (!data.length) errores.push('El archivo no tiene filas de datos.');
    }
    this.resultado = { archivo: file.name, filas: data.length, errores };
  }
}
