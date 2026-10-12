import BorderColorOutlinedIcon from '@mui/icons-material/BorderColorOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, FormHelperText, IconButton, Tooltip } from '@mui/material';
import Highlight from '@tiptap/extension-highlight';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useId, type ReactNode } from 'react';
import { documentToNote, noteToDocument } from '../importantNoteDocument';
import { FieldLabel } from '../ui';
import { tone } from '../tokens';

interface ImportantNoteFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled: boolean;
  error?: string;
}

/** Same persisted text contract as the current editor (`__subrayado__`, `==resaltado==`, • and 1.). */
export const ImportantNoteField = ({ value, onChange, onBlur, disabled, error }: ImportantNoteFieldProps) => {
  const id = useId();
  const editor = useEditor({
    extensions: [StarterKit.configure({
      bold: false, italic: false, strike: false, code: false, codeBlock: false,
      heading: false, blockquote: false, horizontalRule: false, link: false, trailingNode: false,
    }), Highlight],
    content: noteToDocument(value),
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) => onChange(documentToNote(current.getJSON())),
    onBlur: () => onBlur(),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': `${id}-label`,
        'aria-invalid': String(Boolean(error)),
        'aria-describedby': error ? `${id}-error` : '',
        'aria-disabled': String(disabled),
      },
    },
  });

  useEffect(() => {
    // Replace content only on external loads/resets so typing keeps selection and undo history.
    if (editor && documentToNote(editor.getJSON()) !== value) {
      editor.commands.setContent(noteToDocument(value), { emitUpdate: false });
    }
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);

  const tools: { label: string; icon: ReactNode; active?: boolean; run: () => void; enabled?: boolean }[] = [
    { label: 'Viñetas', icon: <FormatListBulletedIcon fontSize="small" />, active: editor?.isActive('bulletList'), run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: 'Numerar', icon: <FormatListNumberedIcon fontSize="small" />, active: editor?.isActive('orderedList'), run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: 'Subrayar', icon: <FormatUnderlinedIcon fontSize="small" />, active: editor?.isActive('underline'), run: () => editor?.chain().focus().toggleUnderline().run() },
    { label: 'Resaltar', icon: <BorderColorOutlinedIcon fontSize="small" />, active: editor?.isActive('highlight'), run: () => editor?.chain().focus().toggleHighlight().run() },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
      <FieldLabel id={`${id}-label`}>Información importante (se imprime)</FieldLabel>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: 1,
          borderColor: error ? 'error.main' : tone.borderStrong,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: tone.card,
          opacity: disabled ? 0.7 : 1,
          '&:focus-within': { borderColor: error ? 'error.main' : tone.primary, boxShadow: `0 0 0 1px ${error ? '#d32f2f' : tone.primary}` },
        }}
      >
        <Box role="toolbar" aria-label="Formato de información importante" sx={{ display: 'flex', gap: 0.25, p: 0.5, borderBottom: 1, borderColor: tone.border, bgcolor: tone.subtle }}>
          {tools.map((tool) => (
            <Tooltip key={tool.label} title={tool.label}>
              <span>
                <IconButton
                  size="small"
                  aria-label={tool.label}
                  aria-pressed={Boolean(tool.active)}
                  disabled={disabled || !editor}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={tool.run}
                  sx={{ borderRadius: 1.5, color: tool.active ? tone.primaryDark : tone.muted, bgcolor: tool.active ? tone.primarySoft : 'transparent' }}
                >
                  {tool.icon}
                </IconButton>
              </span>
            </Tooltip>
          ))}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Deshacer">
            <span>
              <IconButton
                size="small"
                aria-label="Deshacer"
                disabled={disabled || !editor?.can().undo()}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor?.chain().focus().undo().run()}
                sx={{ borderRadius: 1.5, color: tone.muted }}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        <Box
          sx={{
            flex: 1,
            '& .tiptap': { p: 1.5, minHeight: 150, maxHeight: 280, overflowY: 'auto', outline: 'none', fontSize: 14, lineHeight: 1.5, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' },
            '& p': { m: 0 },
            '& ul, & ol': { my: 0.25, pl: 2.5 },
            '& mark': { bgcolor: tone.highlight, color: 'inherit' },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
      {error && <FormHelperText id={`${id}-error`} error>{error}</FormHelperText>}
    </Box>
  );
};
