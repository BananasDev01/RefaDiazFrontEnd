import { yupResolver } from '@hookform/resolvers/yup';
import CheckIcon from '@mui/icons-material/Check';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useCallback, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useClient } from '../../hooks/useClients';
import { useServiceOrderMutations } from '../../hooks/useServiceOrders';
import type { ReportedFailureType, ServiceOrder, ServiceOrderFormValues } from '../../types/serviceOrder.types';
import { draftKey, readDraft } from './serviceOrderDrafts';
import { createFormValues } from './serviceOrderFormData';
import { serviceOrderSchema } from './serviceOrderSchema';
import { useServiceDraft } from './useServiceDraft';
import { ConditionsSection } from './editor/ConditionsSection';
import { DiagnosisSection } from './editor/DiagnosisSection';
import { ReceptionSection } from './editor/ReceptionSection';
import { SummaryAside } from './editor/SummaryAside';
import { daysLabel, daysSince, folioLabel, formatMoney, formatShortDate, vehicleName } from './serviceOrderUtils';
import { useTotals } from './editor/useFormSelector';
import { PageCanvas, PageContainer, StatusPill } from './ui';
import { APP_BAR_HEIGHT, tone } from './tokens';

interface ServiceOrderEditorProps {
  order?: ServiceOrder;
  failureTypes: ReportedFailureType[];
  draftId?: string;
  initialClientId?: number | null;
  initialVehicleId?: number | null;
  returnTo?: string;
}

/** Own subscription so the header total updates without re-rendering the whole editor. */
const HeaderTotal = ({ divider }: { divider: boolean }) => {
  const { total } = useTotals();
  return (
    <Box sx={{ textAlign: 'right', pr: 1, borderRight: divider ? 1 : 0, borderColor: tone.border }}>
      <Typography sx={{ fontSize: 12, color: tone.faint, lineHeight: 1.2 }}>Total</Typography>
      <Typography data-testid="so-header-total" sx={{ fontSize: 18, fontWeight: 900, color: tone.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{formatMoney(total)}</Typography>
    </Box>
  );
};

const initialValues = (failureTypes: ReportedFailureType[], order?: ServiceOrder, clientId?: number | null, vehicleId?: number | null) => {
  const values = createFormValues(failureTypes, order, clientId);
  if (!order && clientId && vehicleId) values.clientVehicleId = vehicleId;
  return values;
};

export const ServiceOrderEditor = ({ order: initialOrder, failureTypes, draftId, initialClientId, initialVehicleId, returnTo }: ServiceOrderEditorProps) => {
  const navigate = useNavigate();
  const [externalId] = useState(() => initialOrder?.externalId ?? draftId ?? uuidv4());
  const [storageKey] = useState(() => draftKey(externalId));
  const [recovery] = useState(() => {
    if (initialOrder?.status === 'CANCELLED') return null;
    const record = readDraft(storageKey);
    // A clean local checkpoint must never hide a newer server version.
    return initialOrder && record?.syncedValues === JSON.stringify(record?.values) ? null : record;
  });
  const methods = useForm<ServiceOrderFormValues>({
    resolver: yupResolver(serviceOrderSchema),
    defaultValues: recovery
      ? {
        ...recovery.values,
        reportedFailures: recovery.values.reportedFailures.map((row) => ({ ...row, externalId: row.externalId ?? uuidv4() })),
        radiatorObstructionLevel: recovery.values.radiatorObstructionLevel ?? 0,
      }
      : initialValues(failureTypes, initialOrder, initialClientId, initialVehicleId),
  });
  const { control, handleSubmit, formState: { isDirty, isSubmitting } } = methods;
  const autosave = useServiceDraft(storageKey, externalId, methods, initialOrder, failureTypes);
  const { startServiceOrder, completeServiceOrder, cancelServiceOrder, isTransitioning } = useServiceOrderMutations();
  const [transition, setTransition] = useState<'complete' | 'cancel' | null>(null);

  const order = autosave.order;
  // Completed orders stay editable on request; only cancelled ones are a closed record.
  const isClosed = order?.status === 'CANCELLED';
  const editsExplicitly = order?.status === 'IN_PROGRESS' || order?.status === 'COMPLETED';
  const readOnly = isClosed || isTransitioning || isSubmitting;
  const busy = autosave.busy || isTransitioning;
  const clientId = useWatch({ control, name: 'clientId' });
  const clientVehicleId = useWatch({ control, name: 'clientVehicleId' });
  const serviceDate = useWatch({ control, name: 'serviceDate' });
  const { data: client } = useClient(clientId);
  const vehicle = client?.vehicles.find((candidate) => candidate.clientVehicleId === clientVehicleId);
  const back = returnTo ?? `/service-orders`;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';

  const leaveTo = (path: string) => {
    if (autosave.synced || !isDirty || window.confirm('Hay cambios sin guardar en el servidor. Se conservará la copia de este equipo. ¿Salir?')) navigate(path);
  };
  const leaveRef = useRef(leaveTo);
  leaveRef.current = leaveTo;
  // Stable callbacks keep the memoized sections from re-rendering with the editor.
  const openClient = useCallback((id: number) => leaveRef.current(`/clients/${id}`), []);
  const requestTransition = useCallback((next: 'complete' | 'cancel') => setTransition(next), []);

  const saveChanges = handleSubmit(async () => { await autosave.save().catch(() => undefined); });
  const startOrder = handleSubmit(async () => {
    try {
      const current = await autosave.save();
      const started = await startServiceOrder({ externalId: current.externalId, expectedVersion: current.version });
      autosave.acceptTransition(started);
      navigate(`/service-orders/${current.externalId}${returnQuery}`, { replace: true });
    } catch { /* The save and transition hooks report the failure without losing the capture. */ }
  });
  const primarySubmit = editsExplicitly ? saveChanges : startOrder;

  const confirmTransition = async () => {
    if (!transition) return;
    if (!order) { autosave.discardLocal(); navigate(back); return; }
    if (transition === 'cancel') {
      const cancelled = await cancelServiceOrder({ externalId: order.externalId, expectedVersion: order.version });
      autosave.acceptTransition(cancelled);
      setTransition(null);
      // A draft discarded from /new must not reopen as a fresh capture with the same id on reload.
      if (!initialOrder) navigate(`/service-orders/${cancelled.externalId}${returnQuery}`, { replace: true });
      return;
    }
    await handleSubmit(async () => {
      const current = await autosave.save();
      const completed = await completeServiceOrder({ externalId: current.externalId, expectedVersion: current.version });
      autosave.acceptTransition(completed);
      setTransition(null);
    })();
  };

  const days = order?.status === 'IN_PROGRESS' ? daysSince(serviceDate) : null;
  const subtitle = [
    serviceDate && `Ingresó el ${formatShortDate(serviceDate)}`,
    days !== null && `${daysLabel(days)} en taller`,
    client?.clientName,
    vehicle && vehicleName(vehicle),
  ].filter(Boolean).join(' · ');

  const syncState = autosave.error
    ? { tone: tone.warnInk, icon: <CloudOffOutlinedIcon fontSize="small" />, text: 'Sin sincronizar' }
    : autosave.busy
      ? { tone: tone.faint, icon: <CircularProgress size={14} />, text: 'Guardando…' }
      : order && autosave.synced
        ? { tone: tone.success, icon: <CheckIcon fontSize="small" />, text: 'Todo guardado' }
        : !order && !isDirty && !autosave.recovered
          ? { tone: tone.faint, icon: null, text: 'Se guarda sola mientras capturas' }
          : { tone: tone.warnInk, icon: null, text: autosave.status || 'Cambios sin guardar' };

  const primaryLabel = editsExplicitly ? 'Guardar cambios' : 'Iniciar orden';

  return (
    <FormProvider {...methods}>
      <PageCanvas>
        <Box component="form" noValidate onSubmit={(event) => void primarySubmit(event)}>
          <Box sx={{ position: 'sticky', top: APP_BAR_HEIGHT, zIndex: 10, bgcolor: tone.card, borderBottom: 1, borderColor: tone.border }}>
            <PageContainer sx={{ py: 1.75, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
              <Button startIcon={<ChevronLeftIcon />} onClick={() => leaveTo(back)} sx={{ fontWeight: 500, pl: 0.5 }}>
                {returnTo?.startsWith(`/clients/`) ? 'Cliente' : 'Órdenes'}
              </Button>
              <Box sx={{ width: '1px', height: 28, bgcolor: tone.border }} />
              <Box sx={{ minWidth: 0, flex: '1 1 320px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Typography component="h1" sx={{ fontSize: 22, fontWeight: 700, color: tone.ink }}>
                    {order ? `Orden ${folioLabel(order)}` : 'Nueva orden'}
                  </Typography>
                  {order && <StatusPill status={order.status} />}
                </Box>
                {subtitle && <Typography sx={{ color: tone.faint, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</Typography>}
              </Box>
              <HeaderTotal divider={!isClosed} />
              {!isClosed && (
                <>
                  <Box aria-live="polite" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: syncState.tone, fontSize: 13, fontWeight: 500 }}>
                    {syncState.icon}
                    {syncState.text}
                  </Box>
                  <Button
                    type="submit"
                    variant="contained"
                    disableElevation
                    startIcon={editsExplicitly ? <SaveOutlinedIcon /> : <PlayArrowOutlinedIcon />}
                    disabled={busy || isSubmitting || (editsExplicitly && autosave.synced)}
                    sx={{ height: 40, px: 2.25, borderRadius: 2 }}
                  >
                    {busy ? 'Guardando…' : primaryLabel}
                  </Button>
                </>
              )}
            </PageContainer>
          </Box>

          <PageContainer sx={{ pt: 3, pb: 6 }}>
            {autosave.error && (
              <Alert
                severity="warning"
                sx={{ mb: 2.5 }}
                action={autosave.hasConflict
                  ? <Button color="inherit" disabled={busy} onClick={() => { if (window.confirm('¿Reemplazar esta captura con la versión del servidor? Se descartarán los cambios locales.')) void autosave.reloadServer().catch(() => undefined); }}>Usar versión guardada</Button>
                  : <Button color="inherit" disabled={busy} onClick={() => void saveChanges()}>Reintentar</Button>}
              >
                {autosave.error} La copia local, si pudo guardarse, sigue en este equipo.
              </Alert>
            )}
            {isClosed && (
              <Alert severity="warning" sx={{ mb: 2.5 }}>Esta orden está cancelada y se conserva como solo lectura.</Alert>
            )}
            {order?.status === 'COMPLETED' && (
              <Alert severity="success" sx={{ mb: 2.5 }}>Orden completada. Puedes seguir editándola; tus cambios se guardan con «Guardar cambios».</Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 380px' }, gap: 3, alignItems: 'start' }}>
              <Box component="fieldset" disabled={readOnly} sx={{ border: 0, p: 0, m: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <ReceptionSection readOnly={readOnly} onOpenClient={openClient} />
                <DiagnosisSection failureTypes={failureTypes} readOnly={readOnly} />
                <ConditionsSection readOnly={readOnly} />
              </Box>
              <Box
                component="aside"
                aria-label="Resumen de la orden"
                sx={{ minWidth: 0 }}
              >
                <SummaryAside
                  order={order}
                  failureTypes={failureTypes}
                  readOnly={readOnly}
                  synced={autosave.synced}
                  busy={busy}
                  canDiscardLocal={isDirty || autosave.recovered}
                  onRequestTransition={requestTransition}
                />
              </Box>
            </Box>
          </PageContainer>
        </Box>

        <Dialog open={transition !== null} onClose={() => !busy && setTransition(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{transition === 'complete' ? 'Completar y entregar' : order?.status === 'IN_PROGRESS' ? 'Cancelar orden' : 'Descartar borrador'}</DialogTitle>
          <DialogContent>
            <Typography>
              {transition === 'complete'
                ? 'Se guardarán los cambios pendientes y la orden quedará como entregada. Podrás seguir editándola si hace falta.'
                : order
                  ? 'Se descartarán los cambios pendientes y la orden quedará cancelada como registro histórico. Ya no podrá editarse.'
                  : 'Se eliminará la captura de este equipo. Esta acción no se puede deshacer.'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransition(null)} disabled={busy}>Volver</Button>
            <Button
              variant="contained"
              disableElevation
              color={transition === 'cancel' ? 'error' : 'success'}
              onClick={() => void confirmTransition().catch(() => undefined)}
              disabled={busy}
            >
              {busy ? 'Procesando…' : 'Confirmar'}
            </Button>
          </DialogActions>
        </Dialog>
      </PageCanvas>
    </FormProvider>
  );
};
