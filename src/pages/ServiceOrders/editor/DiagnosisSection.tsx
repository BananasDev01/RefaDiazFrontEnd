import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Alert, Box, Button, ButtonBase, Checkbox, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import { memo, useCallback, useMemo, useState } from 'react';
import { Controller, useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import type { ReportedFailureType, ServiceOrderFailureFormValue, ServiceOrderFormValues } from '../../../types/serviceOrder.types';
import { formatMoney } from '../serviceOrderUtils';
import { SectionCard } from '../ui';
import { inputSx, tone } from '../tokens';
import { AmountInput } from './AmountInput';
import { useFormSelector, useTotals } from './useFormSelector';

type Undo = { kind: 'deselected'; index: number; label: string } | { kind: 'removed'; index: number; row: ServiceOrderFailureFormValue; label: string };

const OTHER_CODE = 'OTHER';
const columns = { xs: '40px minmax(0, 1fr) 40px', md: '40px minmax(150px, 210px) minmax(0, 1fr) 150px 40px' } as const;
const hasData = (row: ServiceOrderFailureFormValue) => row.amount !== null || Boolean(row.observation.trim()) || Boolean(row.customFailure.trim());

// Re-renders only when the selection changes, not while typing observations or costs.
const selectSelection = (values: ServiceOrderFormValues) => values.reportedFailures.map((row) => [row.reportedFailureTypeId, row.selected] as const);

interface ConceptRowProps {
  label: string;
  /** Form row for this concept; null while it has never been selected. */
  index: number | null;
  selected: boolean;
  showDetail: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onRemove: (index: number) => void;
  onAmountChange: () => void;
}

/** One line per concept, like the paper form: checking it opens observations and cost on the same line. */
const ConceptRow = memo(({ label, index, selected, showDetail, readOnly, onToggle, onRemove, onAmountChange }: ConceptRowProps) => {
  const { control } = useFormContext<ServiceOrderFormValues>();
  const { errors } = useFormState({ control, name: index === null ? 'reportedFailures' : `reportedFailures.${index}` });
  const rowErrors = index === null ? undefined : errors.reportedFailures?.[index];
  const open = selected && index !== null;

  return (
    <Box
      data-testid={open ? 'service-line' : undefined}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: columns.xs, md: columns.md },
        columnGap: 1.25,
        rowGap: 1,
        alignItems: 'center',
        px: 1,
        py: open ? 1 : 0.25,
        minHeight: 40,
        borderBottom: 1,
        borderColor: tone.divider,
        bgcolor: open ? tone.primaryTint : 'transparent',
        transition: 'background-color 120ms ease',
      }}
    >
      <Checkbox
        checked={selected}
        onChange={onToggle}
        disabled={readOnly}
        size="small"
        slotProps={{ input: { 'aria-label': label } }}
        sx={{ gridColumn: 1, gridRow: 1, justifySelf: 'center', p: 0.75 }}
      />
      <Box
        onClick={readOnly ? undefined : onToggle}
        sx={{ minWidth: 0, cursor: readOnly ? 'default' : 'pointer', userSelect: 'none', gridRow: 1, gridColumn: { xs: open ? 2 : '2 / -1', md: open ? 2 : '2 / -1' } }}
      >
        <Typography sx={{ fontWeight: open ? 700 : 500, color: open ? tone.ink : tone.muted, fontSize: 14 }}>{label}</Typography>
      </Box>
      {open && (
        <>
          {showDetail && (
            <Box sx={{ gridColumn: { xs: '2 / -1', md: 2 }, gridRow: 2 }}>
              <Controller
                name={`reportedFailures.${index}.customFailure`}
                control={control}
                render={({ field }) => (
                  <TextField {...field} size="small" fullWidth disabled={readOnly} slotProps={{ htmlInput: { 'aria-label': `Detalle de ${label}` } }} placeholder="Detalle (opcional)" error={Boolean(rowErrors?.customFailure)} helperText={rowErrors?.customFailure?.message} sx={inputSx} />
                )}
              />
            </Box>
          )}
          <Box sx={{ gridColumn: { xs: '2 / -1', md: 3 }, gridRow: { xs: showDetail ? 3 : 2, md: 1 } }}>
            <Controller
              name={`reportedFailures.${index}.observation`}
              control={control}
              render={({ field: { ref, ...field } }) => (
                <TextField
                  {...field}
                  inputRef={ref}
                  size="small"
                  fullWidth
                  multiline
                  minRows={1}
                  disabled={readOnly}
                  placeholder="Qué se encontró, refacción, notas…"
                  slotProps={{ htmlInput: { 'aria-label': `Observaciones de ${label}`, lang: 'es-MX', spellCheck: true } }}
                  error={Boolean(rowErrors?.observation)}
                  helperText={rowErrors?.observation?.message}
                  sx={inputSx}
                />
              )}
            />
          </Box>
          <Box sx={{ gridColumn: { xs: '2 / -1', md: 4 }, gridRow: { xs: showDetail ? 4 : 3, md: 1 } }}>
            <Controller
              name={`reportedFailures.${index}.amount`}
              control={control}
              render={({ field }) => (
                <AmountInput
                  label={`Costo de ${label}`}
                  value={field.value}
                  disabled={readOnly}
                  onBlur={field.onBlur}
                  onChange={(next) => { field.onChange(next); onAmountChange(); }}
                  error={rowErrors?.amount?.message}
                  helperText={field.value === null ? 'Sin cotizar' : field.value === 0 ? 'Sin cargo' : undefined}
                />
              )}
            />
          </Box>
          <Box sx={{ gridColumn: { xs: 3, md: 5 }, gridRow: 1, justifySelf: 'center' }}>
            {!readOnly && (
              <Tooltip title={`Quitar ${label}`}>
                <IconButton aria-label={`Quitar ${label}`} onClick={() => onRemove(index)} size="small" sx={{ color: tone.faint }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </>
      )}
    </Box>
  );
});
ConceptRow.displayName = 'ConceptRow';

const SubtotalFooter = () => {
  const { subtotal, preserveLegacySubtotal } = useTotals();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 3, px: 1.75, py: 1.5, bgcolor: tone.subtle }}>
      <Typography sx={{ color: tone.muted, fontWeight: 500, fontSize: 14 }}>
        {preserveLegacySubtotal ? 'Subtotal histórico (se recalcula al cambiar costos o partidas)' : 'Subtotal de partidas'}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', pr: { md: 7 } }}>{formatMoney(subtotal)}</Typography>
    </Box>
  );
};

interface DiagnosisSectionProps {
  failureTypes: ReportedFailureType[];
  readOnly: boolean;
}

export const DiagnosisSection = memo(({ failureTypes, readOnly }: DiagnosisSectionProps) => {
  const { control, setValue, getValues, setFocus } = useFormContext<ServiceOrderFormValues>();
  const rows = useFieldArray({ control, name: 'reportedFailures' });
  const selection = useFormSelector(selectSelection);
  const [undo, setUndo] = useState<Undo | null>(null);
  const typesById = useMemo(() => new Map(failureTypes.map((type) => [type.id, type])), [failureTypes]);
  const otherType = failureTypes.find((type) => type.code === OTHER_CODE);
  const chipTypes = useMemo(() => failureTypes.filter((type) => type.code !== OTHER_CODE), [failureTypes]);
  const { append, insert, remove } = rows;

  // Leaving the historical subtotal is a one-time switch; skip the write once it is off.
  const touchTotals = useCallback(() => {
    if (getValues('preserveLegacySubtotal')) setValue('preserveLegacySubtotal', false, { shouldDirty: true });
  }, [getValues, setValue]);
  const select = useCallback((index: number, selected: boolean) => {
    setValue(`reportedFailures.${index}.selected`, selected, { shouldDirty: true });
    touchTotals();
  }, [setValue, touchTotals]);
  const labelOf = useCallback((row: ServiceOrderFailureFormValue) => typesById.get(row.reportedFailureTypeId)?.label ?? 'Concepto', [typesById]);

  const focusObservation = useCallback((index: number) => {
    // Wait for the row to open before moving the cursor into it.
    requestAnimationFrame(() => setFocus(`reportedFailures.${index}.observation`));
  }, [setFocus]);

  const toggleType = (type: ReportedFailureType) => {
    const values = getValues('reportedFailures');
    const indexes = values.flatMap((row, index) => (row.reportedFailureTypeId === type.id ? [index] : []));
    const selected = indexes.filter((index) => values[index].selected);
    if (selected.length) {
      selected.forEach((index) => select(index, false));
      const withData = selected.find((index) => hasData(values[index]));
      setUndo(withData === undefined ? null : { kind: 'deselected', index: withData, label: type.label });
    } else if (indexes.length) {
      select(indexes[0], true);
      setUndo(null);
      focusObservation(indexes[0]);
    } else {
      append({ reportedFailureTypeId: type.id, selected: true, customFailure: '', amount: null, observation: '', externalId: uuidv4() }, { shouldFocus: false });
      touchTotals();
      focusObservation(values.length);
    }
  };

  const addOther = () => {
    if (!otherType) return;
    const values = getValues('reportedFailures');
    const empty = values.findIndex((row) => row.reportedFailureTypeId === otherType.id && !row.selected && !hasData(row));
    if (empty >= 0) {
      select(empty, true);
      focusObservation(empty);
    } else {
      append({ reportedFailureTypeId: otherType.id, selected: true, customFailure: '', amount: null, observation: '', externalId: uuidv4() }, { shouldFocus: false });
      touchTotals();
      focusObservation(values.length);
    }
  };

  const removeLine = useCallback((index: number) => {
    const values = getValues('reportedFailures');
    const row = values[index];
    const label = labelOf(row);
    const sameType = values.filter((candidate) => candidate.reportedFailureTypeId === row.reportedFailureTypeId).length;
    if (row.reportedFailureTypeId === otherType?.id && sameType > 1) {
      remove(index);
      touchTotals();
      setUndo(hasData(row) ? { kind: 'removed', index, row: { ...row }, label } : null);
    } else {
      select(index, false);
      setUndo(hasData(row) ? { kind: 'deselected', index, label } : null);
    }
  }, [getValues, labelOf, otherType?.id, remove, select, touchTotals]);

  const restore = () => {
    if (!undo) return;
    if (undo.kind === 'removed') insert(undo.index, undo.row);
    else setValue(`reportedFailures.${undo.index}.selected`, true, { shouldDirty: true });
    touchTotals();
    setUndo(null);
  };

  const lines = selection.flatMap(([, selected], index) => (selected ? [index] : []));
  const otherLines = lines.filter((index) => selection[index][0] === otherType?.id);

  return (
    <SectionCard
      id="so-diagnostico"
      title="Diagnóstico y trabajo"
      action={<Typography sx={{ color: tone.faint, fontSize: 13 }}>{lines.length === 1 ? '1 partida' : `${lines.length} partidas`}</Typography>}
      description="Marca lo que se hizo y escribe en el mismo renglón."
    >
      {undo && (
        <Alert severity="info" sx={{ mb: 1.5 }} action={<Button color="inherit" size="small" onClick={restore}>Deshacer</Button>} onClose={() => setUndo(null)}>
          Se quitó «{undo.label}». Sus datos se conservan si lo vuelves a marcar.
        </Alert>
      )}

      <Box role="group" aria-label="Conceptos del diagnóstico" sx={{ border: 1, borderColor: tone.border, borderRadius: 2.5, overflow: 'hidden' }}>
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: columns.md, columnGap: 1.25, px: 1, py: 1, bgcolor: tone.subtle, borderBottom: 1, borderColor: tone.border, fontSize: 12, fontWeight: 700, color: tone.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span /><span>Concepto</span><span>Observaciones</span><Box component="span" sx={{ textAlign: 'right' }}>Costo</Box><span />
        </Box>
        {chipTypes.map((type) => {
          const indexes = selection.flatMap(([typeId], index) => (typeId === type.id ? [index] : []));
          const selectedIndex = indexes.find((index) => selection[index][1]);
          const index = selectedIndex ?? indexes[0] ?? null;
          // The field array and the selection subscription can be one render apart after append/remove.
          const ready = index !== null && Boolean(rows.fields[index]);
          return (
            <ConceptRow
              key={type.id}
              label={type.label}
              index={ready ? index : null}
              selected={selectedIndex !== undefined}
              showDetail={Boolean(type.allowsFreeText && ready && rows.fields[index]?.customFailure)}
              readOnly={readOnly}
              onToggle={() => toggleType(type)}
              onRemove={removeLine}
              onAmountChange={touchTotals}
            />
          );
        })}
        {otherLines.map((index) => {
          const field = rows.fields[index];
          if (!field) return null;
          return (
            <ConceptRow
              key={field.id}
              label={otherType?.label ?? 'Otros'}
              index={index}
              selected
              showDetail={Boolean(otherType?.allowsFreeText && field.customFailure)}
              readOnly={readOnly}
              onToggle={() => removeLine(index)}
              onRemove={removeLine}
              onAmountChange={touchTotals}
            />
          );
        })}
        {otherType && !readOnly && (
          <ButtonBase
            onClick={addOther}
            sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: columns.xs, md: columns.md }, columnGap: 1.25, alignItems: 'center', justifyItems: 'start', px: 1, minHeight: 42, color: tone.primary, fontSize: 14, fontWeight: 600, borderBottom: 1, borderColor: tone.divider, '&:hover': { bgcolor: tone.subtle }, '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: -2 } }}
          >
            <AddIcon sx={{ fontSize: 20, justifySelf: 'center' }} />
            <Box component="span" sx={{ gridColumn: '2 / -1' }}>Otro concepto</Box>
          </ButtonBase>
        )}
        <SubtotalFooter />
      </Box>
    </SectionCard>
  );
});
DiagnosisSection.displayName = 'DiagnosisSection';
