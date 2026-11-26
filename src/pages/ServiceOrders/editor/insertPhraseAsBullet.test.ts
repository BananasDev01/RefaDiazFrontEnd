import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import { documentToNote, noteToDocument } from '../importantNoteDocument';
import { insertPhraseAsBullet } from './insertPhraseAsBullet';

let editor: Editor | null = null;
const createEditor = (note: string) => {
  editor = new Editor({ extensions: [StarterKit.configure({ trailingNode: false })], content: noteToDocument(note) });
  return editor;
};
const noteOf = (current: Editor) => documentToNote(current.getJSON());

describe('insertar frase rápida', () => {
  afterEach(() => editor?.destroy());

  it('en un campo vacío empieza una viñeta', () => {
    const current = createEditor('');
    insertPhraseAsBullet(current, 'CLIMA SÍ FUNCIONA');
    expect(noteOf(current)).toBe('• CLIMA SÍ FUNCIONA');
  });

  it('después de un párrafo agrega la viñeta abajo sin mezclar el texto', () => {
    const current = createEditor('Cliente regresa el viernes');
    current.commands.setTextSelection(5);
    insertPhraseAsBullet(current, 'CLIMA SÍ FUNCIONA');
    expect(noteOf(current)).toBe('Cliente regresa el viernes\n• CLIMA SÍ FUNCIONA');
  });

  it('dentro de una lista agrega un renglón nuevo debajo del actual', () => {
    const current = createEditor('• PRIMERA\n• TERCERA');
    current.commands.setTextSelection(4);
    insertPhraseAsBullet(current, 'SEGUNDA');
    expect(noteOf(current)).toBe('• PRIMERA\n• SEGUNDA\n• TERCERA');
  });
});
