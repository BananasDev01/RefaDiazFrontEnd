import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Run after pdf:sample -- --two-other-rows and pdf:sample -- --stress-rows.
// Poppler is deliberately limited to this visual-layout regression check.
const readPages = (relativePath) => {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  const info = execFileSync('pdfinfo', [path], { encoding: 'utf8' });
  assert.match(info, /Page size:\s+612 x 792 pts/);
  const pages = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' })
    .split('\f').filter(page => page.trim());
  assert.equal(pages.length, Number(info.match(/Pages:\s+(\d+)/)?.[1]));
  return pages;
};

const example = readPages('../output/pdf/orden-servicio-ejemplo-dos-otros.pdf');
assert.equal(example.length, 1, 'Two Others and a two-line failure must fit on one page.');
for (const text of ['EJEMPLO 1:', 'EJEMPLO 2:', '$1,800.00', '$680.00', '$6,280.00', '$1,004.80', '$7,284.80',
  'El cliente reporta sarro', 'Revisar el sellado del tapón', 'FIRMA DE CONFORMIDAD DEL CLIENTE']) {
  assert.ok(example[0].includes(text), `Missing example content: ${text}`);
}

const extensive = readPages('../tmp/pdfs/stress-feedback/orden-servicio-ejemplo.pdf');
assert.ok(extensive.length > 1, 'Extensive content must continue, not shrink to fit.');
const allText = extensive.join('\n');
for (let i = 1; i <= 24; i++) assert.ok(allText.includes(`Renglón adicional ${i}:`));
for (let i = 1; i <= 32; i++) assert.ok(allText.includes(`Observación de prueba ${i}:`));
for (const page of extensive.slice(1)) assert.ok(page.includes('ORDEN 4869 - CONTINUACIÓN'));
for (const page of [example[0], ...extensive]) {
  if (page.includes('COSTO DEL TRABAJO')) {
    assert.ok(page.includes('FIRMA DE CONFORMIDAD DEL CLIENTE'), 'Totals and signatures cannot split.');
    assert.ok(page.includes('GARANTÍA EN PIEZAS CAMBIADAS'), 'Warranty must remain with the closing.');
  }
}
console.log(`PDF layout checks passed: example ${example.length} page; extensive ${extensive.length} pages; complete content and grouped closing.`);
