import type { JSONContent } from '@tiptap/react';
import { parseImportantNote } from './importantNoteFormat';

const paragraph = (text: string): JSONContent => ({
  type: 'paragraph',
  content: (parseImportantNote(text)[0] ?? []).map((part) => ({
    type: 'text', text: part.text,
    marks: [ ...(part.underline ? [{ type: 'underline' }] : []), ...(part.highlight ? [{ type: 'highlight' }] : []) ],
  })),
});

/** Existing text contract for persistence/PDF; markup never appears in the editor. */
export function noteToDocument(value: string): JSONContent {
  const content: JSONContent[] = [];
  const lists: { indent: number; node: JSONContent; item: JSONContent; next: number }[] = [];
  for (const line of value.split('\n')) {
    const match = /^( *)(•|\d+\.) (.*)$/.exec(line);
    if (!match) {
      const current = lists.at(-1);
      const indent = line.length - line.trimStart().length;
      if (current && indent > current.indent) {
        current.item.content?.push(paragraph(line.slice(current.indent + 2)));
      } else { lists.length = 0; content.push(paragraph(line)); }
      continue;
    }
    const indent = match[1].length;
    const type = match[2] === '•' ? 'bulletList' : 'orderedList';
    const start = type === 'orderedList' ? Number.parseInt(match[2], 10) : 1;
    while (lists.length && lists[lists.length - 1].indent > indent) lists.pop();
    let current = lists.at(-1);
    if (current?.indent === indent && (current.node.type !== type || (type === 'orderedList' && current.next !== start))) {
      lists.pop(); current = lists.at(-1);
    }
    const item: JSONContent = { type: 'listItem', content: [paragraph(match[3])] };
    if (!current || current.indent < indent) {
      const node: JSONContent = { type, ...(type === 'orderedList' ? { attrs: { start } } : {}), content: [] };
      if (current) current.item.content?.push(node); else content.push(node);
      current = { indent, node, item, next: start };
      lists.push(current);
    }
    current.node.content?.push(item); current.item = item; current.next = start + 1;
  }
  return { type: 'doc', content };
}

export function documentToNote(document: JSONContent): string {
  const inline = (node: JSONContent): string => {
    if (node.type === 'hardBreak') return '\n';
    let text = node.text ?? (node.content ?? []).map(inline).join('');
    if (node.marks?.some((mark) => mark.type === 'underline')) text = text.split('\n').map((line) => line ? `__${line}__` : '').join('\n');
    if (node.marks?.some((mark) => mark.type === 'highlight')) text = text.split('\n').map((line) => line ? `==${line}==` : '').join('\n');
    return text;
  };
  const blocks = (nodes: JSONContent[], indent = ''): string[] => nodes.flatMap((node) => {
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      const start = Number(node.attrs?.start ?? 1);
      return (node.content ?? []).flatMap((item, index) => {
        const [first, ...rest] = item.content ?? [];
        const prefix = node.type === 'bulletList' ? '•' : `${start + index}.`;
        const lines = inline(first ?? {}).split('\n');
        return [`${indent}${prefix} ${lines[0]}`, ...lines.slice(1).map((line) => `${indent}  ${line}`), ...blocks(rest, `${indent}  `)];
      });
    }
    return inline(node).split('\n').map((line) => indent + line);
  });
  return blocks(document.content ?? []).join('\n');
}
