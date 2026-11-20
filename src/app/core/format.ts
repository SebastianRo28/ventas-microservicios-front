/** "S/ 6,240.50" — amounts as the design shows them. */
export const soles = (n: number): string => 'S/ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Two-letter initials from "Apellidos" + "Nombres". */
export const iniciales = (nombres: string, apellidos: string): string =>
  ((nombres[0] ?? '') + (apellidos[0] ?? '')).toUpperCase();

/** Parses dd/MM/yyyy. */
export const parseFecha = (s?: string): Date | null => {
  const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
};

/** Whole years and months between two dates, e.g. "2 años y 9 meses". */
export const antiguedad = (desde: Date, hasta: Date): string => {
  let months = (hasta.getFullYear() - desde.getFullYear()) * 12 + hasta.getMonth() - desde.getMonth();
  if (hasta.getDate() < desde.getDate()) months--;
  const y = Math.floor(months / 12), mo = months % 12;
  const parts = [y ? `${y} ${y === 1 ? 'año' : 'años'}` : '', mo ? `${mo} ${mo === 1 ? 'mes' : 'meses'}` : ''].filter(Boolean);
  return parts.join(' y ') || 'menos de 1 mes';
};
