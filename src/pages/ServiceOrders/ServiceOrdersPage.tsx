import AddIcon from '@mui/icons-material/Add';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useServiceOrders, useServiceOrderStatusCounts } from '../../hooks/useServiceOrders';
import type { ServiceOrderSearchParams, ServiceOrderStatus } from '../../types/serviceOrder.types';
import { draftKey, listDrafts, removeDraft, type ServiceDraft } from './serviceOrderDrafts';
import {
  daysSince,
  detectSearchField,
  folioLabel,
  formatMoney,
  formatShortDate,
  SEARCH_FIELD_LABELS,
  snapshotClientName,
  snapshotPhones,
  snapshotPlate,
  snapshotVehicleName,
} from './serviceOrderUtils';
import { AgePill, PageCanvas, PageContainer, PlateBadge } from './ui';
import { cardSx, inputSx, tone } from './tokens';

const PAGE_SIZE = 20;
const tabs: { status: ServiceOrderStatus; label: string; empty: string }[] = [
  { status: 'IN_PROGRESS', label: 'En taller', empty: 'No hay vehículos en taller' },
  { status: 'DRAFT', label: 'Borradores', empty: 'No hay borradores' },
  { status: 'COMPLETED', label: 'Completadas', empty: 'No hay órdenes completadas' },
  { status: 'CANCELLED', label: 'Canceladas', empty: 'No hay órdenes canceladas' },
];
const isStatus = (value: string | null): value is ServiceOrderStatus => tabs.some((tab) => tab.status === value);
const columns = '110px minmax(0, 1.2fr) minmax(0, 1.6fr) 150px 130px 24px';

const draftUrl = (draft: ServiceDraft, returnUrl: string) => (draft.server
  ? `/service-orders/${draft.externalId}?returnTo=${encodeURIComponent(returnUrl)}`
  : `/service-orders/new?draft=${draft.externalId}&returnTo=${encodeURIComponent(returnUrl)}`);

const LocalDrafts = ({ returnUrl }: { returnUrl: string }) => {
  const [drafts, setDrafts] = useState(listDrafts);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const refresh = () => setDrafts(listDrafts());
    window.addEventListener('service-drafts-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('service-drafts-changed', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  if (!drafts.length) return null;
  const [first] = drafts;
  const describe = (draft: ServiceDraft) => `«${draft.values.reportedFailureSummary.trim() || 'Sin motivo de ingreso'}», ${new Date(draft.updatedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}`;

  return (
    <Box role="status" sx={{ border: 1, borderColor: tone.warnBorder, bgcolor: tone.warnTint, color: tone.warnInk, borderRadius: 2.5, px: 1.75, py: 1.25 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <ErrorOutlineIcon fontSize="small" />
        <Typography sx={{ flex: 1, fontSize: 14 }}>
          {drafts.length === 1 ? `1 captura sin enviar en este equipo · ${describe(first)}` : `${drafts.length} capturas sin enviar en este equipo`}
        </Typography>
        {drafts.length === 1
          ? <Button component={Link} to={draftUrl(first, returnUrl)} size="small" sx={{ color: tone.warnInk, fontWeight: 700 }}>Continuar</Button>
          : <Button size="small" onClick={() => setExpanded((value) => !value)} sx={{ color: tone.warnInk, fontWeight: 700 }}>{expanded ? 'Ocultar' : 'Ver capturas'}</Button>}
      </Stack>
      {(expanded || drafts.length === 1) && (
        <Stack spacing={0.5} sx={{ mt: drafts.length === 1 ? 0 : 1 }}>
          {drafts.map((draft) => (
            <Stack key={draft.externalId} direction="row" alignItems="center" spacing={1} sx={{ pl: 4 }}>
              {drafts.length > 1 && <Typography sx={{ flex: 1, fontSize: 13 }}>{describe(draft)}</Typography>}
              {drafts.length > 1 && <Button component={Link} to={draftUrl(draft, returnUrl)} size="small" sx={{ color: tone.warnInk }}>Continuar</Button>}
              {!draft.server && (
                <Button
                  size="small"
                  sx={{ color: tone.dangerInk, ml: drafts.length === 1 ? 'auto' : 0 }}
                  onClick={() => { if (window.confirm('¿Eliminar esta captura local? No se puede deshacer.')) removeDraft(draftKey(draft.externalId)); }}
                >
                  Eliminar copia
                </Button>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export const ServiceOrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const status: ServiceOrderStatus = isStatus(statusParam) ? statusParam : 'IN_PROGRESS';
  const rawPage = Number(searchParams.get('page') ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const query = searchParams.get('q') ?? '';
  const dateFrom = searchParams.get('from') ?? '';
  const dateTo = searchParams.get('to') ?? '';
  const invalidDates = Boolean(dateFrom && dateTo && dateTo < dateFrom);
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const searchField = detectSearchField(debouncedQuery);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const returnUrl = `/service-orders${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const update = (changes: Record<string, string | null>, keepPage = false) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    if (!keepPage) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const filters = useMemo<ServiceOrderSearchParams>(() => {
    const base: ServiceOrderSearchParams = {
      status,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    if (debouncedQuery) base[searchField] = debouncedQuery;
    return base;
  }, [dateFrom, dateTo, debouncedQuery, page, searchField, status]);

  const { data, isLoading, isFetching, isError, error, refetch } = useServiceOrders(filters, !invalidDates);
  const counts = useServiceOrderStatusCounts();
  const orders = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const hasFilters = Boolean(query || dateFrom || dateTo);
  const dateLabel = dateFrom || dateTo
    ? `${dateFrom ? formatShortDate(dateFrom) : 'Inicio'} – ${dateTo ? formatShortDate(dateTo) : 'hoy'}`
    : 'Cualquier fecha';
  const inWorkshop = status === 'IN_PROGRESS';

  return (
    <PageCanvas>
      <PageContainer sx={{ pt: 3.5, pb: 6, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <Typography component="h1" sx={{ fontSize: 26, fontWeight: 700, color: tone.ink, flex: 1 }}>Órdenes de servicio</Typography>
          <Button
            component={Link}
            to={`/service-orders/new?returnTo=${encodeURIComponent(returnUrl)}`}
            variant="contained"
            disableElevation
            startIcon={<AddIcon />}
            sx={{ height: 44, px: 2.5, borderRadius: 2.5, whiteSpace: 'nowrap' }}
          >
            Nueva orden
          </Button>
        </Box>

        <LocalDrafts returnUrl={returnUrl} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Box role="tablist" aria-label="Estado de las órdenes" sx={[cardSx, { display: 'flex', p: 0.5, gap: 0.25, borderRadius: 2.5 }]}>
            {tabs.map((tab) => {
              const selected = tab.status === status;
              return (
                <ButtonBase
                  key={tab.status}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => update({ status: tab.status })}
                  sx={{ height: 36, px: 1.75, gap: 1, borderRadius: 1.75, fontSize: 14, fontWeight: 500, bgcolor: selected ? tone.primary : 'transparent', color: selected ? '#FFFFFF' : tone.muted, '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: 1 } }}
                >
                  {tab.label}
                  <Box component="span" sx={{ minWidth: 22, px: 0.75, borderRadius: 999, fontSize: 12, fontWeight: 700, bgcolor: selected ? 'rgba(255,255,255,0.22)' : tone.ground, color: selected ? '#FFFFFF' : tone.muted }}>
                    {counts[tab.status] ?? '…'}
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
          <TextField
            value={query}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Folio, celular o placas"
            slotProps={{
              htmlInput: { 'aria-label': 'Buscar órdenes' },
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: tone.faint }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    {isFetching && !isLoading ? <CircularProgress size={18} /> : debouncedQuery && (
                      <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 999, bgcolor: tone.primaryTint, color: tone.primaryDark, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        Por {SEARCH_FIELD_LABELS[searchField]}
                      </Box>
                    )}
                  </InputAdornment>
                ),
              },
            }}
            sx={[inputSx, { flex: '1 1 360px', '& .MuiOutlinedInput-root': { height: 44, borderRadius: 2.5 } }]}
          />
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<CalendarMonthOutlinedIcon />}
            onClick={(event) => setDateAnchor(event.currentTarget)}
            aria-haspopup="dialog"
            sx={{ height: 44, borderRadius: 2.5, borderColor: invalidDates ? 'error.main' : tone.borderStrong, bgcolor: tone.card, fontWeight: 500, color: invalidDates ? 'error.main' : tone.text }}
          >
            {dateLabel}
          </Button>
          {hasFilters && <Button onClick={() => setSearchParams({ status }, { replace: true })}>Limpiar</Button>}
        </Box>

        <Popover open={Boolean(dateAnchor)} anchorEl={dateAnchor} onClose={() => setDateAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <Stack spacing={1.5} sx={{ p: 2, width: 280 }}>
            <Typography sx={{ fontWeight: 700 }}>Fecha de ingreso</Typography>
            <TextField type="date" size="small" label="Desde" value={dateFrom} onChange={(event) => update({ from: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" size="small" label="Hasta" value={dateTo} onChange={(event) => update({ to: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} error={invalidDates} helperText={invalidDates ? 'Debe ser posterior a «Desde».' : undefined} />
            <Stack direction="row" justifyContent="space-between">
              <Button onClick={() => update({ from: null, to: null })}>Cualquier fecha</Button>
              <Button variant="contained" disableElevation onClick={() => setDateAnchor(null)}>Listo</Button>
            </Stack>
          </Stack>
        </Popover>

        {invalidDates ? <Alert severity="warning">La fecha final debe ser posterior a la inicial.</Alert> : isError ? (
          <Alert severity="error" action={<Button color="inherit" onClick={() => void refetch()}>Reintentar</Button>}>
            {error instanceof Error ? error.message : 'No fue posible cargar las órdenes.'}
          </Alert>
        ) : (
          <Box sx={[cardSx, { overflowX: 'auto' }]}>
            <Box sx={{ minWidth: 900 }} aria-busy={isFetching}>
              <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 2, px: 2.5, py: 1.5, bgcolor: tone.subtle, borderBottom: 1, borderColor: tone.border, fontSize: 12, fontWeight: 700, color: tone.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span>Folio</span><span>Cliente</span><span>Vehículo y motivo</span><span>{inWorkshop ? 'En taller' : 'Ingreso'}</span><Box component="span" sx={{ textAlign: 'right' }}>Total</Box><span />
              </Box>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
              ) : orders.length === 0 ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 8, px: 2, textAlign: 'center' }}>
                  <AssignmentOutlinedIcon sx={{ fontSize: 44, color: tone.borderStrong }} />
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: tone.ink }}>
                    {hasFilters ? 'No encontramos coincidencias' : tabs.find((tab) => tab.status === status)?.empty}
                  </Typography>
                  <Typography sx={{ color: tone.faint }}>{hasFilters ? 'Revisa lo que escribiste o limpia los filtros.' : 'Las órdenes aparecerán aquí al registrarlas.'}</Typography>
                </Stack>
              ) : orders.map((order) => {
                const days = daysSince(order.serviceDate);
                return (
                  <Box
                    key={order.externalId}
                    component={Link}
                    to={`/service-orders/${order.externalId}?returnTo=${encodeURIComponent(returnUrl)}`}
                    sx={{ display: 'grid', gridTemplateColumns: columns, gap: 2, px: 2.5, py: 1.75, borderBottom: 1, borderColor: tone.divider, alignItems: 'center', textDecoration: 'none', color: tone.text, opacity: isFetching && !isLoading ? 0.6 : 1, '&:hover': { bgcolor: '#F8FAFC' }, '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: -2 } }}
                  >
                    <Box component="span" sx={{ fontWeight: 700, color: tone.primary, fontVariantNumeric: 'tabular-nums' }}>{folioLabel(order)}</Box>
                    <Box component="span" sx={{ minWidth: 0 }}>
                      <Box component="span" sx={{ display: 'block', fontWeight: 700, color: tone.ink }}>{snapshotClientName(order)}</Box>
                      <Box component="span" sx={{ display: 'block', color: tone.faint, fontSize: 13 }}>{snapshotPhones(order)}</Box>
                    </Box>
                    <Box component="span" sx={{ minWidth: 0 }}>
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ fontWeight: 500 }}>{snapshotVehicleName(order)}</Box>
                        <PlateBadge plate={snapshotPlate(order)} size="sm" />
                      </Box>
                      <Box component="span" sx={{ display: 'block', color: tone.faint, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.reportedFailureSummary?.trim() || 'Sin motivo registrado'}
                      </Box>
                    </Box>
                    <Box component="span">
                      {inWorkshop && days !== null && <AgePill days={days} />}
                      <Box component="span" sx={{ display: 'block', color: tone.faint, fontSize: 12, mt: inWorkshop ? 0.25 : 0 }}>{inWorkshop ? `Ingresó ${formatShortDate(order.serviceDate)}` : formatShortDate(order.serviceDate)}</Box>
                    </Box>
                    <Box component="span" sx={{ textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(order.total)}</Box>
                    <ChevronRightIcon sx={{ color: '#9AA6B8' }} fontSize="small" />
                  </Box>
                );
              })}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, color: tone.faint }}>
                <span>{total ? `${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} de ${total}` : ''}</span>
                <Stack direction="row" spacing={0.5}>
                  <IconButton aria-label="Página anterior" disabled={page === 0} onClick={() => update({ page: page > 1 ? String(page - 1) : null }, true)}><ChevronLeftIcon /></IconButton>
                  <IconButton aria-label="Página siguiente" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => update({ page: String(page + 1) }, true)}><ChevronRightIcon /></IconButton>
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </PageContainer>
    </PageCanvas>
  );
};
