import { describe, expect, it } from 'vitest';
import { formatNoteSelection, parseImportantNote } from './importantNoteFormat';

describe('formato de observaciones importantes', () => {
  it('preserva texto antiguo, saltos y contenido que parece HTML como texto', () => {
    expect(parseImportantNote('Clima funciona\n<script>alert(1)</script>')).toEqual([[{ text: 'Clima funciona' }], [{ text: '<script>alert(1)</script>' }]]);
  });
  it('separa subrayado y resaltado sin imprimir los marcadores', () => {
    expect(parseImportantNote('__Revisar__ y ==presión==')).toEqual([[{ text: 'Revisar', underline: true }, { text: ' y ' }, { text: 'presión', highlight: true }]]);
  });
  it('formatea solo la selección y permite listas', () => {
    expect(formatNoteSelection('Revisar presión', 8, 15, 'highlight')?.value).toBe('Revisar ==presión==');
    expect(formatNoteSelection('Uno\nDos', 0, 7, 'number')?.value).toBe('1. Uno\n2. Dos');
    expect(formatNoteSelection('Uno', 0, 0, 'underline')).toBeNull();
  });
  it('permite subrayado y resaltado juntos', () => {
    expect(parseImportantNote('==__Revisar__==')).toEqual([[{ text: 'Revisar', underline: true, highlight: true }]]);
  });
});
