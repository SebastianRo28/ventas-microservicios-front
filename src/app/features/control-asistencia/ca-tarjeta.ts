import { ControlAsistenciaService, diaSemana, DIAS_SEMANA, dur, Jornada, rangoFechas } from '../../core/control-asistencia.service';
import { Colaborador } from '../../core/models';

/** One row of the attendance card (tarjeta de asistencia). */
export interface FilaTarjeta {
  j: Jornada;
  fecha: string;
  dia: string;
  entrada: string;
  salida: string;
  ho: number;
  hnt: number;
  hhee: number;
  aprobadas: number;
  permiso: string;
  clase: string;
}
export interface TotalSemana { semana: string; ho: number; hnt: number; hhee: number; aprobadas: number; }

const CLASE: Record<string, string> = { Inasistencia: 'is-ina', Descanso: 'is-des', Feriado: 'is-fer', Licencia: 'is-lic', Vacaciones: 'is-lic', Permiso: 'is-lic' };

export function filasTarjeta(ca: ControlAsistenciaService, colId: number, desde: string, hasta: string): { filas: (FilaTarjeta | TotalSemana)[]; total: TotalSemana } {
  const ex = new Map(ca.excesos().filter((e) => e.colaboradorId === colId).map((e) => [e.fecha, e]));
  const out: (FilaTarjeta | TotalSemana)[] = [];
  let sem: TotalSemana = { semana: '', ho: 0, hnt: 0, hhee: 0, aprobadas: 0 };
  const total: TotalSemana = { semana: 'Total del período', ho: 0, hnt: 0, hhee: 0, aprobadas: 0 };
  const fechas = rangoFechas(desde, hasta);
  fechas.forEach((f, i) => {
    const j = ca.jornada(colId, f);
    const e = ex.get(f);
    const fila: FilaTarjeta = {
      j, fecha: f, dia: DIAS_SEMANA[diaSemana(f)].slice(0, 3),
      entrada: j.entrada ? `${j.entrada.hora} · ${j.entrada.metodo}` : '—', salida: j.salida ? `${j.salida.hora} · ${j.salida.metodo}` : '—',
      ho: j.ho, hnt: j.hnt, hhee: j.exceso, aprobadas: e ? ca.aprobadas(e) : 0,
      permiso: ['Permiso', 'Licencia', 'Vacaciones', 'Feriado'].includes(j.estado) ? j.detalle : j.estado === 'Inasistencia' ? 'Inasistencia' : j.estado === 'Incompleta' ? j.detalle : '',
      clase: CLASE[j.estado] ?? (j.estado === 'Incompleta' ? 'is-inc' : ''),
    };
    out.push(fila);
    for (const k of ['ho', 'hnt', 'hhee', 'aprobadas'] as const) { sem[k] += fila[k]; total[k] += fila[k]; }
    if (diaSemana(f) === 0 || i === fechas.length - 1) {
      sem.semana = 'Total semanal';
      out.push(sem);
      sem = { semana: '', ho: 0, hnt: 0, hhee: 0, aprobadas: 0 };
    }
  });
  return { filas: out, total };
}
export const esTotal = (x: FilaTarjeta | TotalSemana): x is TotalSemana => 'semana' in x;

/** Printable card(s) as a standalone HTML page (print → "Guardar como PDF" for a PDF). */
export function imprimirTarjetas(ca: ControlAsistenciaService, cs: Colaborador[], desde: string, hasta: string, conResumen: boolean, empresa: string): void {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
  const bloques = cs.map((c) => {
    const { filas, total } = filasTarjeta(ca, c.id, desde, hasta);
    const trs = filas.filter((x) => conResumen || !esTotal(x)).map((x) => esTotal(x)
      ? `<tr class="tot"><td colspan="6">${x.semana}</td><td>${dur(x.ho)}</td><td>${dur(x.hnt)}</td><td>${dur(x.hhee)}</td><td>${dur(x.aprobadas)}</td><td></td></tr>`
      : `<tr class="${x.clase}"><td>${x.dia} ${x.fecha}</td><td>${x.j.codigo}</td><td>${esc(x.j.horario)}</td><td>${x.entrada}</td><td>${x.salida}</td><td>${x.j.estado}</td>`
        + `<td>${dur(x.ho)}</td><td>${dur(x.hnt)}</td><td>${dur(x.hhee)}</td><td>${dur(x.aprobadas)}</td><td>${esc(x.permiso)}</td></tr>`).join('');
    return `<section><h2>${esc(c.apellidos)}, ${esc(c.nombres)}</h2>
<p>DNI ${c.documento} · ${esc(c.cargo)} · ${esc(c.area)} · ${esc(ca.recintoNombre(c.id))} · Contrato ${ca.contrato(c.id)}</p>
<table><thead><tr><th>Fecha</th><th>Turno</th><th>Horario</th><th>Entrada</th><th>Salida</th><th>Estado</th><th>HO</th><th>HNT</th><th>HHEE</th><th>HE aprob.</th><th>Permiso</th></tr></thead>
<tbody>${trs}<tr class="tot"><td colspan="6">${total.semana}</td><td>${dur(total.ho)}</td><td>${dur(total.hnt)}</td><td>${dur(total.hhee)}</td><td>${dur(total.aprobadas)}</td><td></td></tr></tbody></table>
<p class="firma">Firma del trabajador: ____________________</p></section>`;
  }).join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tarjetas de asistencia ${desde} al ${hasta}</title>
<style>body{font-family:system-ui,sans-serif;color:#1E2433;margin:24px;font-size:12px}h1{font-size:18px;margin:0 0 4px}h2{font-size:15px;margin:0}
section{page-break-after:always;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #CDD3DD;padding:4px 6px;text-align:left}
th{background:#F2F4F8}.tot td{font-weight:700;background:#F8F9FB}.is-ina td{background:#FFF1E6}.is-des td{background:#EEFBEA}.is-fer td{background:#F1F2F5}
.is-lic td{background:#EAF1FF}.is-inc td{background:#FFF8DB}.firma{margin-top:28px}</style></head>
<body><h1>Registro de control de asistencia · ${esc(empresa)}</h1><p>Del ${desde} al ${hasta}. HO: horas ordinarias · HNT: horas no trabajadas · HHEE: horas extras.</p>${bloques}</body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); return; }
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  Object.assign(document.createElement('a'), { href: url, download: `tarjetas-${desde.replace(/\//g, '-')}.html` }).click();
  URL.revokeObjectURL(url);
}
