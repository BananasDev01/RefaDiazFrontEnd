import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import { Alert, Box, Button, ButtonBase, CircularProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useReportedFailureTypes, useServiceOrder } from '../../hooks/useServiceOrders';
import type { ServiceOrderCategory } from '../../types/serviceOrder.types';
import { draftKey, readDraft } from './serviceOrderDrafts';
import { ClientVehiclePicker } from './ClientVehiclePicker';
import { ServiceOrderEditor } from './ServiceOrderEditor';
import { isSafeReturnTo } from './serviceOrderUtils';
import { PageCanvas, PageContainer } from './ui';
import { tone } from './tokens';

const numericParam = (value: string | null) => (value && /^\d+$/.test(value) ? Number(value) : null);

const CategoryOption = ({ selected, icon, title, caption, onClick }: { selected: boolean; icon: ReactNode; title: string; caption: string; onClick: () => void }) => (
  <ButtonBase
    aria-pressed={selected}
    onClick={onClick}
    sx={{
      flex: '1 1 260px',
      justifyContent: 'flex-start',
      textAlign: 'left',
      gap: 1.75,
      p: 2,
      borderRadius: 3,
      bgcolor: selected ? '#F0F4FA' : tone.card,
      border: selected ? `2px solid ${tone.primary}` : `1px solid ${tone.borderStrong}`,
      color: selected ? tone.primaryDark : tone.text,
      '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: 2 },
    }}
  >
    <Box sx={{ display: 'flex', color: selected ? tone.primary : tone.faint }}>{icon}</Box>
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ fontSize: 14, color: selected ? tone.primaryDark : tone.faint }}>{caption}</Typography>
    </Box>
    {selected && <CheckCircleIcon sx={{ color: tone.primary }} />}
  </ButtonBase>
);

const Loading = () => <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

export const ServiceOrderEditorPage = () => {
  const { serviceExternalId } = useParams<{ serviceExternalId: string }>();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const orderQuery = useServiceOrder(serviceExternalId ?? null);
  const failureTypesQuery = useReportedFailureTypes();

  if (orderQuery.isLoading || failureTypesQuery.isLoading) return <Loading />;
  if (orderQuery.isError || failureTypesQuery.isError || !orderQuery.data) {
    const error = orderQuery.error ?? failureTypesQuery.error;
    return <Alert severity="error">{error instanceof Error ? error.message : 'No fue posible abrir la orden.'}</Alert>;
  }
  return (
    <ServiceOrderEditor
      key={serviceExternalId}
      order={orderQuery.data}
      failureTypes={failureTypesQuery.data ?? []}
      returnTo={isSafeReturnTo(returnTo) ? returnTo : undefined}
    />
  );
};

/** Step 1 chooses what comes in (vehicle or loose part) and from whom; step 2 is the full editor. */
export const NewServiceOrderPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const failureTypesQuery = useReportedFailureTypes();
  const [draftId] = useState(() => searchParams.get('draft') ?? uuidv4());
  const clientId = numericParam(searchParams.get('clientId'));
  const vehicleId = numericParam(searchParams.get('vehicleId'));
  const category: ServiceOrderCategory = searchParams.get('category') === 'PART' ? 'PART' : 'VEHICLE';
  const isPart = category === 'PART';
  const returnToValue = searchParams.get('returnTo');
  const returnTo = isSafeReturnTo(returnToValue) ? returnToValue : undefined;
  const hasLocalDraft = Boolean(readDraft(draftKey(draftId)));
  const capturing = hasLocalDraft || Boolean(clientId && (vehicleId || isPart));

  useEffect(() => {
    if (searchParams.get('draft')) return;
    const next = new URLSearchParams(searchParams);
    next.set('draft', draftId);
    setSearchParams(next, { replace: true });
  }, [draftId, searchParams, setSearchParams]);

  if (failureTypesQuery.isLoading) return <Loading />;
  if (failureTypesQuery.isError) {
    return <Alert severity="error">{failureTypesQuery.error instanceof Error ? failureTypesQuery.error.message : 'No fue posible preparar la orden.'}</Alert>;
  }

  if (capturing) {
    return (
      <ServiceOrderEditor
        key={draftId}
        draftId={draftId}
        failureTypes={failureTypesQuery.data ?? []}
        initialClientId={clientId}
        initialVehicleId={vehicleId}
        initialCategory={category}
        returnTo={returnTo}
      />
    );
  }

  const chooseCategory = (next: ServiceOrderCategory) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'PART') params.set('category', 'PART'); else params.delete('category');
    setSearchParams(params, { replace: true });
  };

  return (
    <PageCanvas>
      <Box sx={{ bgcolor: tone.card, borderBottom: 1, borderColor: tone.border }}>
        <PageContainer sx={{ py: 1.75, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ChevronLeftIcon />} onClick={() => navigate(returnTo ?? `/service-orders`)} sx={{ fontWeight: 500, pl: 0.5 }}>
            {returnTo?.startsWith(`/clients/`) ? 'Cliente' : 'Órdenes'}
          </Button>
          <Box sx={{ width: '1px', height: 28, bgcolor: tone.border }} />
          <Typography component="h1" sx={{ fontSize: 22, fontWeight: 700, color: tone.ink, flex: 1 }}>Nueva orden</Typography>
          <Typography sx={{ color: tone.faint, fontSize: 13 }}>Se guarda sola mientras capturas</Typography>
        </PageContainer>
      </Box>
      <Box sx={{ maxWidth: 880, mx: 'auto', px: { xs: 2, md: 4 }, pt: 5, pb: 7 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: tone.primary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Paso 1 de 2</Typography>
        <Typography component="h2" sx={{ fontSize: 26, fontWeight: 700, color: tone.ink, mt: 0.5 }}>¿Qué ingresa?</Typography>
        <Box role="group" aria-label="Qué ingresa" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5, mb: 4 }}>
          <CategoryOption selected={!isPart} icon={<DirectionsCarOutlinedIcon />} title="Vehículo" caption="Entra al taller" onClick={() => chooseCategory('VEHICLE')} />
          <CategoryOption selected={isPart} icon={<BuildOutlinedIcon />} title="Pieza" caption="Radiador, tubo u otra pieza suelta" onClick={() => chooseCategory('PART')} />
        </Box>
        <Typography component="h2" sx={{ fontSize: 22, fontWeight: 700, color: tone.ink }}>{isPart ? '¿Quién deja la pieza?' : '¿Quién trae el vehículo?'}</Typography>
        <Typography sx={{ color: tone.faint, fontSize: 15, mt: 0.75, mb: 2.5 }}>Busca por celular, nombre o placas. Después pasas directo al diagnóstico.</Typography>
        <ClientVehiclePicker
          key={category}
          initialClientId={clientId}
          initialVehicleId={vehicleId}
          category={category}
          confirmLabel="Continuar al diagnóstico"
          onConfirm={(nextClientId, nextVehicleId) => {
            const next = new URLSearchParams(searchParams);
            next.set('draft', draftId);
            next.set('clientId', String(nextClientId));
            if (nextVehicleId) next.set('vehicleId', String(nextVehicleId)); else next.delete('vehicleId');
            setSearchParams(next, { replace: true });
          }}
        />
      </Box>
    </PageCanvas>
  );
};
