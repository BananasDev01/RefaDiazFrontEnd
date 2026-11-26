import type { Editor } from '@tiptap/react';

/** Inserts the phrase as a bullet where the cursor is, without merging it into existing text. */
export const insertPhraseAsBullet = (editor: Editor, phrase: string) => {
  const { $from } = editor.state.selection;
  const blockEmpty = $from.parent.content.size === 0;
  const inList = editor.isActive('bulletList') || editor.isActive('orderedList');
  if (inList) {
    const chain = editor.chain();
    if (blockEmpty) chain.insertContent(phrase).run();
    else chain.setTextSelection($from.end()).splitListItem('listItem').insertContent(phrase).run();
    return;
  }
  if (blockEmpty) {
    editor.chain().toggleBulletList().insertContent(phrase).run();
    return;
  }
  const afterBlock = $from.after(1);
  editor.chain().insertContentAt(afterBlock, {
    type: 'bulletList',
    content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: phrase }] }] }],
  }).run();
};
