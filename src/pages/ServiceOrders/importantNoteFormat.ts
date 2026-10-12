export interface NotePart { text: string; underline?: boolean; highlight?: boolean }

/** A small, non-HTML format, persisted in the existing text field. */
export function parseImportantNote(text: string): NotePart[][] {
  const parseLine = (line: string): NotePart[] => line.split(/(==[^=\n]+==|__[^_\n]+__)/g).filter(Boolean).flatMap((part): NotePart[] => {
    if (part.startsWith('==') && part.endsWith('==')) return parseLine(part.slice(2, -2)).map((span) => ({ ...span, highlight: true }));
    if (part.startsWith('__') && part.endsWith('__')) return parseLine(part.slice(2, -2)).map((span) => ({ ...span, underline: true }));
    return [{ text: part }];
  });
  return text.split('\n').map(parseLine);
}

export function formatNoteSelection(value: string, start: number, end: number, action: 'underline' | 'highlight' | 'bullet' | 'number') {
  if (action === 'bullet' || action === 'number') {
    const from = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = value.indexOf('\n', end);
    const to = nextBreak === -1 ? value.length : nextBreak;
    const selected = value.slice(from, to).split('\n').map((line, index) => `${action === 'bullet' ? '•' : `${index + 1}.`} ${line.replace(/^(?:[•*]|\d+\.)\s+/, '')}`).join('\n');
    return { value: value.slice(0, from) + selected + value.slice(to), start: from, end: from + selected.length };
  }
  if (start === end) return null;
  const marker = action === 'underline' ? '__' : '==';
  // Each line is independent; no HTML is interpreted or sent to the PDF.
  const selected = value.slice(start, end).split('\n').map((line) => line ? marker + line + marker : '').join('\n');
  return { value: value.slice(0, start) + selected + value.slice(end), start, end: start + selected.length };
}
