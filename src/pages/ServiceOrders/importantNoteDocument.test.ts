import { describe, expect, it } from 'vitest';
import { documentToNote, noteToDocument } from './importantNoteDocument';
import { parseImportantNote } from './importantNoteFormat';

describe('documento visual de observaciones', () => {
  it.each([
    '', 'Clima funciona\n\nRevisar presión', '<script>alert(1)</script>',
    '• Clima funciona\n• __Revisar presión__',
    '1. ==Revisar presión==\n2. Clima funciona',
    '3. Primera\n4. Segunda\n\n1. Nueva lista',
    '• Principal\n  1. Detalle\n  2. Otro detalle\n• Siguiente',
    '• Primera línea\n  Continuación\n• Segunda',
    '==__Unidad queda a prueba__==',
  ])('conserva el contenido al guardar y volver a cargar: %s', (value) => {
    expect(documentToNote(noteToDocument(value))).toBe(value);
  });
  it('convierte las marcas en formato, no en texto visible ni HTML ejecutable', () => {
    const doc = noteToDocument('__Revisar__ y ==presión==');
    expect(doc.content?.[0].content?.map((node) => node.text).join('')).toBe('Revisar y presión');
    expect(doc.content?.[0].content?.[0].marks).toEqual([{ type: 'underline' }]);
    expect(noteToDocument('<b>Literal</b>').content?.[0].content?.[0].text).toBe('<b>Literal</b>');
  });
  it('el formato visual se exporta con el contrato que ya interpreta el PDF', () => {
    const value = documentToNote({ type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'text', text: 'Revisar presión', marks: [{ type: 'underline' }, { type: 'highlight' }] },
      { type: 'hardBreak' }, { type: 'text', text: 'Clima funciona' },
    ] }] });
    expect(parseImportantNote(value)).toEqual([
      [{ text: 'Revisar presión', underline: true, highlight: true }], [{ text: 'Clima funciona' }],
    ]);
  });
});
