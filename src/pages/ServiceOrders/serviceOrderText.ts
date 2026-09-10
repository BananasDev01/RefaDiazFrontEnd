export const COMPRESSION_WARNING = 'Fuga de compresión detectada; el vehículo no debe circular en estas condiciones.';
export const AIR_PRESSURE_WARNING = 'Dentro del sistema de enfriamiento se encuentra aire generando una presión por el momento controlada.';
export const HEATING_WARNING = 'Si aún con el mantenimiento vuelve a presentar calentamiento o gorgoreo en el recuperador, revisar con mecánico fuga de compresión.';

// Older orders stored either the continuation or the complete warning.
export const combinedAirPressureWarning = (note?: string | null): string => {
  const text = note?.trim();
  if (!text) return `${AIR_PRESSURE_WARNING} ${HEATING_WARNING}`;
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('aire') && normalized.includes('sistema de enfriamiento')
    ? text
    : `${AIR_PRESSURE_WARNING} ${text}`;
};

export const mergeObservations = (...texts: (string | null | undefined)[]): string => (
  [...new Set(texts.map((text) => text?.trim()).filter((text): text is string => Boolean(text)))].join('\n')
);

export const sumLineAmounts = (lines: { selected: boolean; amount: number | null }[]): number => (
  lines.reduce((cents, line) => cents + (line.selected ? Math.round((line.amount ?? 0) * 100) : 0), 0) / 100
);
