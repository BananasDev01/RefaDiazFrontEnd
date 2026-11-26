import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, ButtonBase, CircularProgress, IconButton, InputAdornment, Popover, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useQuickPhrases } from '../../../hooks/useQuickPhrases';
import type { ServiceQuickPhrase } from '../../../types/serviceOrder.types';
import { tone } from '../tokens';

type DraftPhrase = { key: string; externalId: string | null; phrase: string };

const toDraft = (phrases: ServiceQuickPhrase[]): DraftPhrase[] =>
  phrases.map((item) => ({ key: item.externalId, externalId: item.externalId, phrase: item.phrase }));

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface QuickPhrasesPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onInsert: (phrase: string) => void;
}

export const QuickPhrasesPopover = ({ anchorEl, open, onClose, onInsert }: QuickPhrasesPopoverProps) => {
  const { phrases, isLoading, isError, save } = useQuickPhrases(open);
  const [mode, setMode] = useState<'pick' | 'edit'>('pick');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<DraftPhrase[]>([]);
  const [newPhrase, setNewPhrase] = useState('');
  const [dragKey, setDragKey] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const editListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMode('pick');
      setQuery('');
    }
  }, [open]);

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    return needle ? phrases.filter((item) => normalize(item.phrase).includes(needle)) : phrases;
  }, [phrases, query]);

  const startEditing = () => {
    setDraft(toDraft(phrases));
    setNewPhrase('');
    setMode('edit');
  };

  const addPhrase = () => {
    const text = newPhrase.trim();
    if (!text) return;
    setDraft((current) => [...current, { key: uuidv4(), externalId: null, phrase: text }]);
    setNewPhrase('');
    // Show the phrase just added at the bottom of the list.
    requestAnimationFrame(() => editListRef.current?.scrollTo({ top: editListRef.current.scrollHeight }));
  };

  const moveTo = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    setDraft((current) => {
      const from = current.findIndex((item) => item.key === dragKey);
      const to = current.findIndex((item) => item.key === targetKey);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const hasEmpty = draft.some((item) => !item.phrase.trim());
  const saveDraft = () => {
    const pending = newPhrase.trim();
    const phrasesToSave = [...draft, ...(pending ? [{ key: 'pending', externalId: null, phrase: pending }] : [])];
    save.mutate(
      phrasesToSave.map((item) => ({ externalId: item.externalId, phrase: item.phrase.trim() })),
      { onSuccess: () => { setNewPhrase(''); setMode('pick'); } },
    );
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      disableRestoreFocus
      TransitionProps={{ onEntered: () => searchRef.current?.focus() }}
      slotProps={{ paper: { sx: { width: 360, maxWidth: 'calc(100vw - 32px)', mt: 0.75, borderRadius: 2.5, border: 1, borderColor: tone.border, boxShadow: '0 12px 32px rgba(28, 34, 48, 0.16)' } } }}
    >
      {mode === 'pick' ? (
        <Box>
          <Box sx={{ p: 1.25, pb: 0.75 }}>
            <TextField
              inputRef={searchRef}
              size="small"
              fullWidth
              placeholder="Buscar frase"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && matches[0]) {
                  event.preventDefault();
                  onInsert(matches[0].phrase);
                }
              }}
              slotProps={{
                htmlInput: { 'aria-label': 'Buscar frase', spellCheck: false },
                input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
              }}
            />
          </Box>
          <Box role="group" aria-label="Frases rápidas" sx={{ maxHeight: 300, overflowY: 'auto', px: 0.75, pb: 0.75 }}>
            {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>}
            {isError && <Typography sx={{ px: 1.25, py: 2, fontSize: 13, color: tone.danger }}>No se pudieron cargar las frases.</Typography>}
            {!isLoading && !isError && matches.length === 0 && (
              <Typography sx={{ px: 1.25, py: 2, fontSize: 13, color: tone.faint }}>
                {phrases.length ? 'Sin coincidencias.' : 'Aún no hay frases. Toca «Editar lista» para agregar.'}
              </Typography>
            )}
            {matches.map((item) => (
              <ButtonBase
                key={item.externalId}
                onClick={() => onInsert(item.phrase)}
                sx={{ width: '100%', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 1, textAlign: 'left', px: 1.25, py: 1, borderRadius: 1.5, fontSize: 13, lineHeight: 1.4, color: tone.text, '&:hover, &:focus-visible': { bgcolor: tone.primaryTint } }}
              >
                <AddIcon sx={{ fontSize: 16, color: tone.primary, mt: 0.15 }} />
                {item.phrase}
              </ButtonBase>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderTop: 1, borderColor: tone.divider }}>
            <Typography sx={{ fontSize: 12, color: tone.faint }}>Clic para insertar</Typography>
            <Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={startEditing} disabled={isLoading || isError}>
              Editar lista
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, pt: 1 }}>
            <IconButton size="small" aria-label="Volver sin guardar" onClick={() => setMode('pick')}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Editar frases</Typography>
          </Box>
          <Box ref={editListRef} role="list" aria-label="Frases para editar" sx={{ maxHeight: 300, overflowY: 'auto', px: 1, py: 0.5 }}>
            {draft.map((item, index) => (
              <Box
                key={item.key}
                role="listitem"
                draggable
                onDragStart={() => setDragKey(item.key)}
                onDragEnter={() => moveTo(item.key)}
                onDragOver={(event) => event.preventDefault()}
                onDragEnd={() => setDragKey(null)}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.5, borderBottom: 1, borderColor: tone.divider, opacity: dragKey === item.key ? 0.5 : 1 }}
              >
                <Tooltip title="Arrastra para ordenar">
                  <DragIndicatorIcon fontSize="small" sx={{ color: tone.faint, cursor: 'grab', flexShrink: 0 }} />
                </Tooltip>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  maxRows={3}
                  value={item.phrase}
                  error={!item.phrase.trim()}
                  onChange={(event) => {
                    const phrase = event.target.value.toUpperCase();
                    setDraft((current) => current.map((candidate) => (candidate.key === item.key ? { ...candidate, phrase } : candidate)));
                  }}
                  slotProps={{ htmlInput: { 'aria-label': `Frase ${index + 1}`, maxLength: 500, lang: 'es-MX', spellCheck: true } }}
                  sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
                />
                <IconButton size="small" aria-label={`Quitar frase ${index + 1}`} onClick={() => setDraft((current) => current.filter((candidate) => candidate.key !== item.key))}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, px: 1.25, py: 1, borderTop: 1, borderColor: tone.divider }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Nueva frase"
              value={newPhrase}
              onChange={(event) => setNewPhrase(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addPhrase();
                }
              }}
              slotProps={{ htmlInput: { 'aria-label': 'Nueva frase', maxLength: 500, lang: 'es-MX', spellCheck: true } }}
              sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
            />
            <Button variant="outlined" onClick={addPhrase} disabled={!newPhrase.trim()}>Agregar</Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.5, pb: 1.25 }}>
            <Typography sx={{ fontSize: 12, color: tone.faint }}>Los cambios son para todo el equipo.</Typography>
            <Button variant="contained" size="small" onClick={saveDraft} disabled={save.isPending || hasEmpty}>
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </Box>
        </Box>
      )}
    </Popover>
  );
};
