export const COMPRESSION_WARNING = 'Fuga de compresión detectada; el vehículo no debe circular en estas condiciones.';
// Every order, old or new, prints the current wording; the stored note is only an archive.
export const AIR_PRESSURE_WARNING = 'Dentro del sistema de enfriamiento se encuentra un exceso de presión de aire por el momento controlada. Si aún con el mantenimiento vuelve a presentar calentamiento, fuga o gorgoreo en el recuperador, revisar con mecánico por fuga de compresión.';

export const mergeObservations = (...texts: (string | null | undefined)[]): string => (
  [...new Set(texts.map((text) => text?.trim()).filter((text): text is string => Boolean(text)))].join('\n')
);

export const sumLineAmounts = (lines: { selected: boolean; amount: number | null }[]): number => (
  lines.reduce((cents, line) => cents + (line.selected ? Math.round((line.amount ?? 0) * 100) : 0), 0) / 100
);
