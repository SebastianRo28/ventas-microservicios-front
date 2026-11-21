import { Component } from '@angular/core';
import { mensajeError } from '../../core/auth.service';
import { HrDataService } from '../../core/hr-data.service';
import { COLUMNAS_COLABORADORES, ColumnaImportacion, ReporteriaService, ResultadoImportacion } from '../../core/reporteria.service';
import { CATEGORIAS_IMPORTADOR, Importador, MODULOS_IMPORTADOR } from '../../core/sample/reportes';
import { UiStateService } from '../../core/ui-state.service';

/**
 * 5.3 Reportería › Importadores. The Colaboradores importer works on the API: the file is first checked row by row and,
 * when it has no errors, loaded in one go (all or nothing). The other importers are listed but not available yet.
 */
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
  archivo: File | null = null;
  resultado: ResultadoImportacion | null = null;
  ocupado = false;

  constructor(private data: HrDataService, private api: ReporteriaService, private ui: UiStateService) {
    data.importadores().subscribe((i) => (this.all = i));
  }

  disponible(i: Importador): boolean { return i.nombre === 'Colaboradores' && i.tipo === 'Importador'; }

  get enModulo(): Importador[] { return this.all.filter((i) => i.modulo === MODULOS_IMPORTADOR[this.modulo]); }

  get categorias(): { nombre: string; n: number }[] {
    return CATEGORIAS_IMPORTADOR.map((nombre) => ({
      nombre, n: nombre === 'Todos' ? this.enModulo.length : this.enModulo.filter((i) => i.categoria === nombre).length,
    }));
  }

  get visibles(): Importador[] {
    const q = this.query.trim().toLowerCase();
    return this.enModulo.filter((i) => (this.categoria === 'Todos' || i.categoria === this.categoria) && (!q || i.nombre.toLowerCase().includes(q)))
      .sort((a, b) => Number(this.disponible(b)) - Number(this.disponible(a)));
  }

  pickModulo(i: number): void { this.modulo = i; this.categoria = 'Todos'; }

  get campos(): ColumnaImportacion[] { return this.abierto && this.disponible(this.abierto) ? COLUMNAS_COLABORADORES : []; }

  abrir(i: Importador): void { this.abierto = i; this.resultado = null; this.archivo = null; }

  descargarTemplate(): void {
    this.api.templateColaboradores().subscribe({ error: (e) => this.ui.toast(mensajeError(e)) });
  }

  /** Step 1: check the selected CSV on the server without loading anything. */
  elegir(input: HTMLInputElement): void {
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file || this.ocupado) return;
    this.archivo = file;
    this.ocupado = true;
    this.api.importarColaboradores(file, true).subscribe({
      next: (r) => { this.ocupado = false; this.resultado = r; },
      error: (e) => { this.ocupado = false; this.archivo = null; this.ui.toast(mensajeError(e)); },
    });
  }

  /** Step 2: load the checked file; it is recorded in Historial de Cargas. */
  cargar(): void {
    const f = this.archivo;
    if (!f || this.ocupado) return;
    this.ocupado = true;
    this.api.importarColaboradores(f, false).subscribe({
      next: (r) => {
        this.ocupado = false;
        this.resultado = r;
        this.archivo = null;
        if (r.estado === 'Exitosa') this.data.cargar().subscribe();   // the new people show up in every screen
        this.ui.toast(r.estado === 'Exitosa' ? `${r.creados} colaborador(es) cargado(s) · carga N° ${r.cargaId}` : `La carga N° ${r.cargaId} tiene errores: no se cargó ningún colaborador`);
      },
      error: (e) => { this.ocupado = false; this.ui.toast(mensajeError(e)); },
    });
  }
}
