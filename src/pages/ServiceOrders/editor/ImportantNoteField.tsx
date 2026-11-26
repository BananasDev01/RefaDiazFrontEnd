import BoltIcon from '@mui/icons-material/Bolt';
import BorderColorOutlinedIcon from '@mui/icons-material/BorderColorOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Button, Divider, FormHelperText, IconButton, Tooltip } from '@mui/material';
import Highlight from '@tiptap/extension-highlight';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { documentToNote, noteToDocument } from '../importantNoteDocument';
import { FieldLabel } from '../ui';
import { insertPhraseAsBullet } from './insertPhraseAsBullet';
import { QuickPhrasesPopover } from './QuickPhrasesPopover';
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
  const [phrasesAnchor, setPhrasesAnchor] = useState<HTMLElement | null>(null);
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
        spellcheck: 'true',
        lang: 'es-MX',
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
          <Divider orientation="vertical" flexItem sx={{ mx: 0.75, my: 0.5 }} />
          <Button
            size="small"
            variant={phrasesAnchor ? 'contained' : 'outlined'}
            startIcon={<BoltIcon fontSize="small" />}
            endIcon={<ExpandMoreIcon fontSize="small" />}
            disabled={disabled || !editor}
            aria-haspopup="dialog"
            aria-expanded={Boolean(phrasesAnchor)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              // Without a cursor in the field, phrases go to the end of the text.
              if (editor && !editor.isFocused) editor.commands.focus('end');
              setPhrasesAnchor(event.currentTarget);
            }}
            sx={{ height: 30, px: 1.25, fontSize: 13, fontWeight: 600, borderRadius: 1.5, '& .MuiButton-startIcon': { mr: 0.5 }, '& .MuiButton-endIcon': { ml: 0.25 } }}
          >
            Frases
          </Button>
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
      <QuickPhrasesPopover
        anchorEl={phrasesAnchor}
        open={Boolean(phrasesAnchor)}
        onClose={() => { setPhrasesAnchor(null); editor?.commands.focus(); }}
        onInsert={(phrase) => { if (editor) insertPhraseAsBullet(editor, phrase); }}
      />
    </Box>
  );
};
