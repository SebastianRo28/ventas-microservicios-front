// Theming (spec. 5.3): components use only CSS variables, never hex colors. Fails when a hex color appears outside the
// token declarations (:root of styles.css) or the allowed files. Run with: npm run lint:colores
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', 'src');
// Files allowed to contain hex colors, and why.
const PERMITIDOS = [
  'app/core/color.ts',                                   // color math (white, black, defaults)
  'app/core/marca.service.ts',                           // default primary of the brand
  'app/features/configuracion/marca.component.ts',       // default colors offered by the brand editor
  'app/core/sample/',                                    // sample data
  // Printable documents opened in a new window: they do not load the app's stylesheet.
  'app/features/configuracion/estado-cuenta.component.ts',
  'app/features/control-asistencia/ca-tarjeta.ts',
  'app/features/portal/mis-capacitaciones.component.ts',
  'app/shared/boleta/boleta-modal.component.ts',
  // Content colors chosen per item (portal covers and company values), not part of the theme.
  'app/features/portal/mi-portal.component.ts',
];
const HEX = /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b(?![0-9A-Za-z-])/g;
const errores = [];

function revisar(archivo, texto) {
  texto.split('\n').forEach((linea, i) => {
    const m = linea.match(HEX);
    if (m) errores.push(`${archivo}:${i + 1}  ${m.join(' ')}`);
  });
}

// styles.css: everything after the :root block.
const css = fs.readFileSync(path.join(raiz, 'styles.css'), 'utf8');
const inicio = css.indexOf(':root {');
const fin = css.indexOf('\n}', inicio) + 2;
revisar('styles.css (después de :root)', css.slice(0, inicio) + '\n'.repeat(css.slice(inicio, fin).split('\n').length - 1) + css.slice(fin));

(function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { recorrer(p); continue; }
    if (!/\.(ts|html|css|scss)$/.test(e.name) || e.name.endsWith('.spec.ts')) continue;
    const rel = path.relative(raiz, p).replace(/\\/g, '/');
    if (!rel.startsWith('app/') || PERMITIDOS.some((x) => rel.startsWith(x))) continue;
    revisar(rel, fs.readFileSync(p, 'utf8'));
  }
})(path.join(raiz, 'app'));

if (errores.length) {
  console.error('Colores fijos fuera de los tokens (usa var(--nx-…)):\n' + errores.join('\n'));
  process.exit(1);
}
console.log('Sin colores fijos fuera de los tokens.');
