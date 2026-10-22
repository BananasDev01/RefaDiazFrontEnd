import CheckIcon from '@mui/icons-material/Check';
import { Box, Button, FormControlLabel, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { memo, useEffect, useId, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { ReportedFailureType, ServiceOrder, ServiceOrderFormValues } from '../../../types/serviceOrder.types';
import { computeIva, formatMoney, ivaModeFor, toCents, type IvaMode } from '../serviceOrderUtils';
import { SectionCard } from '../ui';
import { tone } from '../tokens';
import { PrintableDocuments } from './PrintableDocuments';
import type { PdfActions } from './usePdfDocuments';
import { SignedDocuments } from './SignedDocuments';
import { useTotals } from './useFormSelector';

const warranties = [
  { months: 0, label: 'Sin', aria: 'Sin garantía' },
  { months: 3, label: '3 meses' },
  { months: 6, label: '6 meses' },
  { months: 12, label: '12 meses' },
] as const;

const ImportCard = memo(({ failureTypes, readOnly }: { failureTypes: ReportedFailureType[]; readOnly: boolean }) => {
  const { control, setValue, getValues } = useFormContext<ServiceOrderFormValues>();
  // Totals only change with selections, costs or tax, not while typing observations.
  const { lines, subtotal, taxAmount, total } = useTotals();
  const [mode, setMode] = useState<IvaMode>(() => ivaModeFor(getValues('taxAmount'), subtotal));
  const warrantyLabel = useId();
  const labels = useMemo(() => new Map(failureTypes.map((type) => [type.id, type.label])), [failureTypes]);

  useEffect(() => {
    // Keep 16 % in step with the subtotal; a historical manual tax is left alone until the user decides.
    if (readOnly || mode !== 'auto') return;
    const expected = computeIva(subtotal);
    if (toCents(getValues('taxAmount')) !== toCents(expected)) setValue('taxAmount', expected, { shouldDirty: true, shouldValidate: true });
  }, [getValues, mode, readOnly, setValue, subtotal]);

  const toggleIva = (enabled: boolean) => {
    setMode(enabled ? 'auto' : 'none');
    setValue('taxAmount', enabled ? computeIva(subtotal) : 0, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <SectionCard id="so-importe" title="Importe">
      <Stack spacing={0.75}>
        {lines.length === 0 && <Typography sx={{ color: tone.faint, fontSize: 14 }}>Sin partidas todavía.</Typography>}
        {lines.map((row) => (
          <Box key={row.index} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, color: tone.muted, fontSize: 14 }}>
            <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labels.get(row.typeId) ?? 'Concepto'}</Box>
            <Box component="span" sx={{ flex: 'none', fontVariantNumeric: 'tabular-nums', color: row.amount === null ? tone.faint : tone.muted }}>
              {row.amount === null ? 'Sin cotizar' : formatMoney(row.amount)}
            </Box>
          </Box>
        ))}
      </Stack>
      <Box sx={{ height: '1px', bgcolor: '#E3E7ED', my: 1.5 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
        <span>Subtotal</span>
        <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(subtotal)}</Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, gap: 1.5 }}>
        <FormControlLabel
          sx={{ m: 0, gap: 1 }}
          control={<Switch size="small" checked={mode !== 'none'} disabled={readOnly} onChange={(_, checked) => toggleIva(checked)} />}
          label="IVA 16%"
        />
        <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', color: mode === 'none' ? tone.faint : tone.text }}>
          {mode === 'none' ? 'Sin IVA' : formatMoney(taxAmount)}
        </Box>
      </Box>
      {mode === 'manual' && (
        <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, bgcolor: tone.warnTint, border: 1, borderColor: tone.warnBorder, color: tone.warnInk, fontSize: 13 }}>
          Esta orden trae un IVA capturado a mano que no equivale al 16 %.
          {!readOnly && <Button size="small" onClick={() => toggleIva(true)} sx={{ ml: 0.5, color: tone.warnInk, fontWeight: 700 }}>Recalcular al 16 %</Button>}
        </Box>
      )}
      <Box sx={{ mt: 1.75, px: 2, py: 1.75, borderRadius: 2.5, bgcolor: '#F0F4FA', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography sx={{ fontWeight: 700, color: tone.primaryDark }}>Total</Typography>
        <Typography data-testid="so-total" sx={{ fontSize: 28, fontWeight: 900, color: tone.ink, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</Typography>
      </Box>
      <Controller
        name="warrantyMonths"
        control={control}
        render={({ field }) => (
          <Box sx={{ mt: 2 }}>
            <Typography id={warrantyLabel} sx={{ fontSize: 13, fontWeight: 500, color: tone.muted, mb: 0.75 }}>Garantía en piezas</Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              disabled={readOnly}
              aria-labelledby={warrantyLabel}
              value={field.value}
              onChange={(_, value: 0 | 3 | 6 | 12 | null) => field.onChange(value)}
              sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 500, color: tone.text, borderColor: tone.borderStrong, height: 36 }, '& .Mui-selected, & .Mui-selected:hover': { bgcolor: `${tone.primary} !important`, color: '#FFFFFF !important', fontWeight: 700 } }}
            >
              {warranties.map((option) => (
                <ToggleButton key={option.months} value={option.months} aria-label={'aria' in option ? option.aria : option.label}>{option.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            {field.value === null && <Typography sx={{ fontSize: 12, color: tone.faint, mt: 0.5 }}>Sin especificar</Typography>}
          </Box>
        )}
      />
    </SectionCard>
  );
});
ImportCard.displayName = 'ImportCard';

interface SummaryAsideProps {
  order?: ServiceOrder;
  failureTypes: ReportedFailureType[];
  readOnly: boolean;
  synced: boolean;
  busy: boolean;
  onRequestTransition: (transition: 'complete' | 'cancel') => void;
  canDiscardLocal: boolean;
  pdf: PdfActions;
}

export const SummaryAside = memo(({ order, failureTypes, readOnly, synced, busy, onRequestTransition, canDiscardLocal, pdf }: SummaryAsideProps) => {
  const closed = order?.status === 'COMPLETED' || order?.status === 'CANCELLED';
  return (
    <Stack spacing={2}>
      <ImportCard failureTypes={failureTypes} readOnly={readOnly} />

      <SectionCard id="so-documentos" title="Documentos">
        {order ? (
          <Stack spacing={1.25}>
            <PrintableDocuments pdf={pdf} disabled={!synced || busy} />
            {!synced && <Typography sx={{ fontSize: 12, color: tone.faint }}>Guarda los cambios para imprimir la versión actual.</Typography>}
            <SignedDocuments order={order} disabled={!synced || busy} />
          </Stack>
        ) : (
          <Typography sx={{ color: tone.faint, fontSize: 14 }}>La orden y el comprobante se habilitan cuando la captura se guarda en el servidor.</Typography>
        )}
      </SectionCard>

      <SectionCard id="so-entrega" title={closed ? 'Estado' : 'Entrega'}>
        {order?.status === 'IN_PROGRESS' && (
          <Stack spacing={1.25}>
            <Typography sx={{ color: tone.faint, fontSize: 14 }}>Al completar se guardan los cambios y la orden queda como entregada. Podrás seguir editándola si hace falta.</Typography>
            <Button
              variant="contained"
              disableElevation
              startIcon={<CheckIcon />}
              disabled={busy}
              onClick={() => onRequestTransition('complete')}
              sx={{ height: 44, borderRadius: 2, bgcolor: tone.success, '&:hover': { bgcolor: '#1B6442' } }}
            >
              Completar y entregar
            </Button>
            <Button disabled={busy} onClick={() => onRequestTransition('cancel')} sx={{ color: tone.danger }}>Cancelar orden</Button>
          </Stack>
        )}
        {(order?.status === 'DRAFT' || (!order && canDiscardLocal)) && (
          <Stack spacing={1.25}>
            <Typography sx={{ color: tone.faint, fontSize: 14 }}>
              {order ? 'Borrador guardado. Usa «Pasar a taller» cuando el cliente autorice el trabajo; ahí aparece en la pestaña En taller.' : 'Captura guardada solo en este equipo hasta elegir cliente y vehículo.'}
            </Typography>
            <Button disabled={busy} onClick={() => onRequestTransition('cancel')} sx={{ color: tone.danger }}>Descartar borrador</Button>
          </Stack>
        )}
        {!order && !canDiscardLocal && <Typography sx={{ color: tone.faint, fontSize: 14 }}>La captura se guarda sola mientras escribes.</Typography>}
        {closed && order && (
          <Typography sx={{ color: order.status === 'COMPLETED' ? tone.successInk : tone.dangerInk, fontSize: 14, fontWeight: 500 }}>
            {order.status === 'COMPLETED'
              ? `Completada${order.completedAt ? ` el ${new Date(order.completedAt).toLocaleDateString('es-MX')}` : ''}. Puedes seguir editándola; guarda los cambios al terminar.`
              : `Cancelada${order.cancelledAt ? ` el ${new Date(order.cancelledAt).toLocaleDateString('es-MX')}` : ''}. Se conserva como registro histórico.`}
          </Typography>
        )}
      </SectionCard>
    </Stack>
  );
});
SummaryAside.displayName = 'SummaryAside';
