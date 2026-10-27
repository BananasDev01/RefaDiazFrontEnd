import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useClient } from '../../hooks/useClients';
import { useServiceOrders } from '../../hooks/useServiceOrders';
import ClientEditDialog from './ClientEditDialog';
import ClientVehicleDialog from './ClientVehicleDialog';
import {
  folioLabel,
  formatMoney,
  formatShortDate,
  snapshotVehicleName,
  vehicleDetails,
  vehicleName,
  workSummary,
} from '../ServiceOrders/serviceOrderUtils';
import { Avatar, PageCanvas, PageContainer, PlateBadge, SectionCard, StatusPill } from '../ServiceOrders/ui';
import { cardSx, tone } from '../ServiceOrders/tokens';

const HISTORY_LIMIT = 50;
const historyColumns = '90px 120px minmax(0, 1.4fr) 130px 120px 24px';

const Stat = ({ children, accent = false }: { children: ReactNode; accent?: boolean }) => (
  <Box component="span" sx={{ px: 1.5, py: 0.75, borderRadius: 2, border: 1, fontSize: 14, ...(accent
    ? { bgcolor: tone.primarySoft, borderColor: tone.primaryBorder, color: tone.primaryDark }
    : { bgcolor: tone.subtle, borderColor: '#E3E7ED', color: tone.text }) }}
  >
    {children}
  </Box>
);

export const ClientDetailPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const id = clientId && /^\d+$/.test(clientId) ? Number(clientId) : null;
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const clientQuery = useClient(id);
  const ordersQuery = useServiceOrders({ clientId: id ?? undefined, limit: HISTORY_LIMIT, offset: 0 }, id !== null);

  if (id === null) return <Alert severity="error">El identificador del cliente no es válido.</Alert>;
  if (clientQuery.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (clientQuery.isError || !clientQuery.data) {
    return <Alert severity="error">{clientQuery.error instanceof Error ? clientQuery.error.message : 'No fue posible cargar el expediente.'}</Alert>;
  }

  const client = clientQuery.data;
  const orders = ordersQuery.data?.data ?? [];
  const totalOrders = ordersQuery.data?.pagination.total ?? orders.length;
  const inWorkshop = orders.filter((order) => order.status === 'IN_PROGRESS');
  const returnTo = encodeURIComponent(`/clients/${id}`);
  const newOrderUrl = (vehicleId?: number) => `/service-orders/new?clientId=${id}${vehicleId ? `&vehicleId=${vehicleId}` : ''}&returnTo=${returnTo}`;
  const orderUrl = (externalId: string) => `/service-orders/${externalId}?returnTo=${returnTo}`;
  const since = client.createdAt
    ? new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(new Date(client.createdAt))
    : null;

  return (
    <PageCanvas>
      <Box sx={{ bgcolor: tone.card, borderBottom: 1, borderColor: tone.border }}>
        <PageContainer sx={{ pt: 2, pb: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button startIcon={<ChevronLeftIcon />} onClick={() => navigate('/clients')} sx={{ alignSelf: 'flex-start', fontWeight: 500, pl: 0.5 }}>Clientes</Button>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2.25 }}>
            <Avatar name={client.clientName} size={56} />
            <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>
              <Typography component="h1" sx={{ fontSize: 26, fontWeight: 700, color: tone.ink }}>{client.clientName}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2.25, mt: 0.5, color: tone.muted }}>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <PhoneIphoneOutlinedIcon fontSize="small" />
                  <Box component="strong" sx={{ color: tone.ink }}>{client.phoneNumber}</Box> · principal
                </Box>
                {client.secondaryPhoneNumber && <span>{client.secondaryPhoneNumber} · secundario</span>}
                <Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => setEditingContact(true)} sx={{ fontWeight: 500, minWidth: 0, py: 0 }}>
                  Editar datos
                </Button>
              </Box>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'flex-start', gap: 0.75, color: client.comments ? tone.text : tone.faint, fontSize: 14 }}>
                <StickyNote2OutlinedIcon fontSize="small" sx={{ mt: '1px', color: tone.faint }} />
                <Box component="span" sx={{ whiteSpace: 'pre-line' }}>
                  {client.comments || 'Sin comentarios. Usa «Editar datos» para agregar notas sobre el cliente.'}
                </Box>
              </Box>
            </Box>
            <Button
              component={Link}
              to={newOrderUrl()}
              variant="contained"
              disableElevation
              startIcon={<AddIcon />}
              sx={{ height: 44, px: 2.5, borderRadius: 2.5, whiteSpace: 'nowrap' }}
            >
              Nueva orden
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            <Stat><strong>{totalOrders}</strong> {totalOrders === 1 ? 'orden' : 'órdenes'}</Stat>
            {inWorkshop.length > 0 && <Stat accent><strong>{inWorkshop.length}</strong> en progreso</Stat>}
            {since && <Stat>Cliente desde {since}</Stat>}
          </Box>
        </PageContainer>
      </Box>

      <PageContainer sx={{ pt: 3, pb: 6, display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '420px minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <SectionCard
          id="so-vehiculos"
          title="Vehículos"
          action={<Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddingVehicle(true)} sx={{ borderRadius: 2, borderColor: tone.borderStrong }}>Agregar</Button>}
        >
          {client.vehicles.length === 0 ? (
            <Stack alignItems="center" spacing={1} sx={{ py: 3, color: tone.faint }}>
              <DirectionsCarOutlinedIcon sx={{ fontSize: 40, color: tone.borderStrong }} />
              <Typography>Sin vehículos registrados</Typography>
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              {client.vehicles.map((vehicle) => {
                const visits = orders.filter((order) => order.clientVehicleId === vehicle.clientVehicleId).length;
                const active = inWorkshop.find((order) => order.clientVehicleId === vehicle.clientVehicleId);
                return (
                  <Box key={vehicle.clientVehicleId} sx={{ border: 1, borderColor: tone.border, borderRadius: 2.5, p: 1.75 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.25, alignItems: 'flex-start' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: tone.ink }}>{vehicleName(vehicle)}</Typography>
                        <Typography sx={{ color: tone.muted, fontSize: 14 }}>
                          {[vehicleDetails(vehicle), visits ? `${visits} ${visits === 1 ? 'visita' : 'visitas'}` : 'Sin visitas'].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                      <PlateBadge plate={vehicle.plate} />
                    </Box>
                    {vehicle.comments && (
                      <Typography sx={{ mt: 1, fontSize: 13, color: tone.muted, whiteSpace: 'pre-line' }}>{vehicle.comments}</Typography>
                    )}
                    {active ? (
                      <Box sx={{ mt: 1.25, px: 1.25, py: 1, borderRadius: 2, bgcolor: tone.primarySoft, color: tone.primaryDark, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <span>En taller · orden {folioLabel(active)}</span>
                        <Button component={Link} to={orderUrl(active.externalId)} size="small" sx={{ color: tone.primaryDark, fontWeight: 700 }}>Abrir</Button>
                      </Box>
                    ) : (
                      <Button component={Link} to={newOrderUrl(vehicle.clientVehicleId)} size="small" startIcon={<AddIcon />} sx={{ mt: 1, fontWeight: 500, pl: 0.5 }}>
                        Nueva orden para este vehículo
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </SectionCard>

        <Box component="section" aria-labelledby="so-historial" sx={[cardSx, { overflow: 'hidden' }]}>
          <Box sx={{ px: 2.5, py: 2.25, borderBottom: 1, borderColor: tone.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography id="so-historial" component="h2" sx={{ fontSize: 16, fontWeight: 700, color: tone.ink }}>Historial de órdenes</Typography>
            {totalOrders > HISTORY_LIMIT && <Typography sx={{ color: tone.faint, fontSize: 13 }}>Últimas {HISTORY_LIMIT} de {totalOrders}</Typography>}
          </Box>
          {ordersQuery.isError ? (
            <Alert severity="error" sx={{ m: 2 }}>{ordersQuery.error instanceof Error ? ordersQuery.error.message : 'No fue posible cargar las órdenes.'}</Alert>
          ) : ordersQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box>
          ) : orders.length === 0 ? (
            <Typography sx={{ py: 7, px: 2, textAlign: 'center', color: tone.faint }}>Todavía no hay órdenes para este cliente.</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 680 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: historyColumns, gap: 1.75, px: 2.5, py: 1.25, bgcolor: tone.subtle, borderBottom: 1, borderColor: tone.border, fontSize: 12, fontWeight: 700, color: tone.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span>Folio</span><span>Fecha</span><span>Vehículo y trabajo</span><span>Estado</span><Box component="span" sx={{ textAlign: 'right' }}>Total</Box><span />
                </Box>
                {orders.map((order) => (
                  <Box
                    key={order.externalId}
                    component={Link}
                    to={orderUrl(order.externalId)}
                    sx={{ display: 'grid', gridTemplateColumns: historyColumns, gap: 1.75, px: 2.5, py: 1.75, borderBottom: 1, borderColor: tone.divider, alignItems: 'center', textDecoration: 'none', color: tone.text, '&:hover': { bgcolor: '#F8FAFC' }, '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: -2 } }}
                  >
                    <Box component="span" sx={{ fontWeight: 700, color: tone.primary }}>{folioLabel(order)}</Box>
                    <span>{formatShortDate(order.serviceDate)}</span>
                    <Box component="span" sx={{ minWidth: 0 }}>
                      <Box component="span" sx={{ display: 'block', fontWeight: 500 }}>{snapshotVehicleName(order)}</Box>
                      <Box component="span" sx={{ display: 'block', color: tone.faint, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workSummary(order)}</Box>
                    </Box>
                    <span><StatusPill status={order.status} /></span>
                    <Box component="span" sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(order.total)}</Box>
                    <ChevronRightIcon fontSize="small" sx={{ color: '#9AA6B8' }} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </PageContainer>

      <ClientVehicleDialog clientId={id} open={addingVehicle} onClose={() => setAddingVehicle(false)} />
      {editingContact && <ClientEditDialog client={client} onClose={() => setEditingContact(false)} />}
    </PageCanvas>
  );
};
