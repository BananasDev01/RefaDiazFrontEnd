import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Alert, Box, Button, ButtonBase, IconButton, TextField, Tooltip, Typography } from '@mui/material';
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
const columns = { xs: 'minmax(0, 1fr) 44px', md: 'minmax(150px, 1fr) minmax(0, 2.2fr) 150px 44px' } as const;
const hasData = (row: ServiceOrderFailureFormValue) => row.amount !== null || Boolean(row.observation.trim()) || Boolean(row.customFailure.trim());

// Re-renders only when the selection changes, not while typing observations or costs.
const selectSelection = (values: ServiceOrderFormValues) => values.reportedFailures.map((row) => [row.reportedFailureTypeId, row.selected] as const);

interface LineRowProps {
  index: number;
  label: string;
  showDetail: boolean;
  readOnly: boolean;
  onRemove: (index: number) => void;
  onAmountChange: () => void;
}

const LineRow = memo(({ index, label, showDetail, readOnly, onRemove, onAmountChange }: LineRowProps) => {
  const { control } = useFormContext<ServiceOrderFormValues>();
  const { errors } = useFormState({ control, name: `reportedFailures.${index}` });
  const rowErrors = errors.reportedFailures?.[index];

  return (
    <Box
      data-testid="service-line"
      sx={{ display: 'grid', gridTemplateColumns: { xs: columns.xs, md: columns.md }, gap: 1.5, px: 1.75, py: 1.5, borderBottom: 1, borderColor: tone.divider, alignItems: 'start' }}
    >
      <Box sx={{ pt: { md: 1.1 }, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, color: tone.ink, fontSize: 14 }}>{label}</Typography>
        {showDetail && (
          <Controller
            name={`reportedFailures.${index}.customFailure`}
            control={control}
            render={({ field }) => (
              <TextField {...field} size="small" fullWidth disabled={readOnly} slotProps={{ htmlInput: { 'aria-label': `Detalle de ${label}` } }} placeholder="Detalle (opcional)" error={Boolean(rowErrors?.customFailure)} helperText={rowErrors?.customFailure?.message} sx={[inputSx, { mt: 1 }]} />
            )}
          />
        )}
      </Box>
      <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 2, md: 'auto' } }}>
        <Controller
          name={`reportedFailures.${index}.observation`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              fullWidth
              multiline
              minRows={1}
              disabled={readOnly}
              placeholder="Qué se encontró, refacción, notas…"
              slotProps={{ htmlInput: { 'aria-label': `Observaciones de ${label}` } }}
              error={Boolean(rowErrors?.observation)}
              helperText={rowErrors?.observation?.message}
              sx={inputSx}
            />
          )}
        />
      </Box>
      <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 3, md: 'auto' } }}>
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
      <Box sx={{ gridColumn: { xs: 2, md: 'auto' }, gridRow: { xs: 1, md: 'auto' } }}>
        {!readOnly && (
          <Tooltip title={`Quitar ${label}`}>
            <IconButton aria-label={`Quitar ${label}`} onClick={() => onRemove(index)} sx={{ color: tone.faint }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
});
LineRow.displayName = 'LineRow';

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
  const { control, setValue, getValues } = useFormContext<ServiceOrderFormValues>();
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
    } else {
      append({ reportedFailureTypeId: type.id, selected: true, customFailure: '', amount: null, observation: '', externalId: uuidv4() });
      touchTotals();
    }
  };

  const addOther = () => {
    if (!otherType) return;
    const values = getValues('reportedFailures');
    const empty = values.findIndex((row) => row.reportedFailureTypeId === otherType.id && !row.selected && !hasData(row));
    if (empty >= 0) select(empty, true);
    else {
      append({ reportedFailureTypeId: otherType.id, selected: true, customFailure: '', amount: null, observation: '', externalId: uuidv4() });
      touchTotals();
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

  return (
    <SectionCard
      id="so-diagnostico"
      title="Diagnóstico y trabajo"
      action={<Typography sx={{ color: tone.faint, fontSize: 13 }}>{lines.length === 1 ? '1 partida' : `${lines.length} partidas`}</Typography>}
      description="Marca las fallas encontradas. Cada una se vuelve una partida con su costo."
    >
      <Box role="group" aria-label="Fallas del catálogo" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {chipTypes.map((type) => {
          const selected = selection.some(([typeId, isSelected]) => typeId === type.id && isSelected);
          return (
            <ButtonBase
              key={type.id}
              aria-pressed={selected}
              disabled={readOnly}
              onClick={() => toggleType(type)}
              sx={{
                height: 34,
                px: 1.75,
                gap: 0.75,
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 500,
                border: 1,
                borderColor: selected ? tone.primary : tone.borderStrong,
                bgcolor: selected ? tone.primary : tone.card,
                color: selected ? '#FFFFFF' : tone.text,
                transition: 'background-color 120ms ease, border-color 120ms ease',
                '&:hover': { borderColor: tone.primary },
                '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: 2 },
                '&.Mui-disabled': { opacity: selected ? 0.85 : 0.6 },
              }}
            >
              {selected && <CheckIcon sx={{ fontSize: 16 }} />}
              {type.label}
            </ButtonBase>
          );
        })}
        {otherType && (
          <ButtonBase
            onClick={addOther}
            disabled={readOnly}
            sx={{ height: 34, px: 1.75, gap: 0.75, borderRadius: 999, fontSize: 14, fontWeight: 500, border: `1px dashed ${tone.primary}`, color: tone.primary, bgcolor: tone.card, '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: 2 }, '&.Mui-disabled': { opacity: 0.6 } }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
            Otro concepto
          </ButtonBase>
        )}
      </Box>

      {undo && (
        <Alert severity="info" sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={restore}>Deshacer</Button>} onClose={() => setUndo(null)}>
          Se quitó «{undo.label}». Sus datos se conservan si lo vuelves a marcar.
        </Alert>
      )}

      <Box sx={{ mt: 2.25, border: 1, borderColor: tone.border, borderRadius: 2.5, overflow: 'hidden' }}>
        <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: columns.md, gap: 1.5, px: 1.75, py: 1.25, bgcolor: tone.subtle, borderBottom: 1, borderColor: tone.border, fontSize: 12, fontWeight: 700, color: tone.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Concepto</span><span>Observaciones</span><Box component="span" sx={{ textAlign: 'right' }}>Costo</Box><span />
        </Box>
        {lines.length === 0 && (
          <Typography sx={{ py: 3.5, px: 2, textAlign: 'center', color: tone.faint }}>Aún no hay partidas. Marca una falla arriba para empezar.</Typography>
        )}
        {lines.map((index) => {
          const field = rows.fields[index];
          // The field array and the selection subscription can be one render apart after append/remove.
          if (!field) return null;
          const type = typesById.get(selection[index][0]);
          return (
            <LineRow
              key={field?.id ?? index}
              index={index}
              label={type?.label ?? 'Concepto'}
              showDetail={Boolean(type?.allowsFreeText && field?.customFailure)}
              readOnly={readOnly}
              onRemove={removeLine}
              onAmountChange={touchTotals}
            />
          );
        })}
        <SubtotalFooter />
      </Box>
    </SectionCard>
  );
});
DiagnosisSection.displayName = 'DiagnosisSection';
