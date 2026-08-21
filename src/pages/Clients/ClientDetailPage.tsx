import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { useClient } from '../../hooks/useClients';
import { useServiceOrders } from '../../hooks/useServiceOrders';
import {
  getSnapshotText,
  SERVICE_ORDER_STATUS_LABELS,
  type ServiceOrderStatus,
} from '../../types/serviceOrder.types';
import ClientVehicleDialog from './ClientVehicleDialog';

const statusColor: Record<ServiceOrderStatus, 'default' | 'info' | 'success' | 'error'> = {
  DRAFT: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`)
  );
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

const ClientDetailPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const numericClientId = clientId && /^\d+$/.test(clientId) ? Number(clientId) : null;
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const clientQuery = useClient(numericClientId);
  const ordersQuery = useServiceOrders({
    clientId: numericClientId ?? undefined,
    limit: 50,
    offset: 0,
  }, numericClientId !== null);

  if (!numericClientId) {
    return <Alert severity="error">El identificador del cliente no es válido.</Alert>;
  }

  if (clientQuery.isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <Alert severity="error">
        {clientQuery.error instanceof Error
          ? clientQuery.error.message
          : 'No fue posible cargar el expediente.'}
      </Alert>
    );
  }

  const client = clientQuery.data;
  const orders = ordersQuery.data?.data ?? [];
  const orderReturnQuery = `returnTo=${encodeURIComponent(`/clients/${numericClientId}`)}`;

  return (
    <Box>
      <PageHeader
        title={client.clientName}
        actionButton={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/clients')}
            >
              Clientes
            </Button>
            <Button
              variant="contained"
              startIcon={<AssignmentOutlinedIcon />}
              onClick={() => navigate(`/service-orders/new?clientId=${numericClientId}&${orderReturnQuery}`)}
              disabled={client.vehicles.length === 0}
              title={client.vehicles.length === 0 ? 'Agrega un vehículo antes de crear la orden.' : undefined}
            >
              Nueva orden
            </Button>
          </Stack>
        )}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">Datos de contacto</Typography>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 1 }}>
                <PhoneOutlinedIcon color="action" />
                <Typography fontWeight={600}>{client.phoneNumber}</Typography>
              </Stack>
              {client.comments && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">{client.comments}</Typography>
                </>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="overline" color="text.secondary">Vehículos</Typography>
                  <Typography variant="h6">{client.vehicles.length} registrados</Typography>
                </Box>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setIsVehicleDialogOpen(true)}>
                  Agregar
                </Button>
              </Stack>

              {client.vehicles.length === 0 ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
                  <DirectionsCarOutlinedIcon color="disabled" sx={{ fontSize: 40 }} />
                  <Typography variant="body2" color="text.secondary">Sin vehículos registrados</Typography>
                </Stack>
              ) : (
                <Stack divider={<Divider flexItem />} spacing={2}>
                  {client.vehicles.map((vehicle) => (
                    <Box key={vehicle.clientVehicleId}>
                      <Typography fontWeight={650}>
                        {[vehicle.carModel?.brand?.name, vehicle.carModel?.name]
                          .filter(Boolean)
                          .join(' ') || 'Vehículo sin modelo'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[vehicle.modelYear, vehicle.version, vehicle.color].filter(Boolean).join(' · ') || 'Sin detalles'}
                      </Typography>
                      {vehicle.plate && <Chip label={`Placas ${vehicle.plate}`} size="small" variant="outlined" sx={{ mt: 1 }} />}
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2.5 }}>
              <Typography variant="overline" color="text.secondary">Historial</Typography>
              <Typography variant="h6">Órdenes de servicio</Typography>
            </Box>
            <Divider />
            {ordersQuery.isError ? (
              <Alert severity="error" sx={{ m: 2 }}>
                {ordersQuery.error instanceof Error
                  ? ordersQuery.error.message
                  : 'No fue posible cargar las órdenes.'}
              </Alert>
            ) : ordersQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box>
            ) : orders.length === 0 ? (
              <Stack alignItems="center" spacing={1} sx={{ py: 8, px: 2 }}>
                <AssignmentOutlinedIcon color="disabled" sx={{ fontSize: 44 }} />
                <Typography variant="h6">Todavía no hay órdenes</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Las órdenes vinculadas a este cliente aparecerán aquí.
                </Typography>
              </Stack>
            ) : (
              <TableContainer>
                <Table aria-label="Historial de órdenes de servicio">
                  <TableHead>
                    <TableRow>
                      <TableCell>Folio</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Vehículo</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.externalId}
                        hover
                        tabIndex={0}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/service-orders/${order.externalId}?${orderReturnQuery}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/service-orders/${order.externalId}?${orderReturnQuery}`);
                          }
                        }}
                      >
                        <TableCell>{order.folioNumber ? `${order.folioSeries}-${order.folioNumber}` : order.provisionalReference}</TableCell>
                        <TableCell>{formatDate(order.serviceDate)}</TableCell>
                        <TableCell>
                          {getSnapshotText(order.vehicleSnapshot, 'plate', 'placas', 'model', 'modelo') ?? 'Sin dato'}
                        </TableCell>
                        <TableCell><Chip size="small" label={SERVICE_ORDER_STATUS_LABELS[order.status]} color={statusColor[order.status]} /></TableCell>
                        <TableCell align="right">{formatMoney(order.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <ClientVehicleDialog
        clientId={numericClientId}
        open={isVehicleDialogOpen}
        onClose={() => setIsVehicleDialogOpen(false)}
      />
    </Box>
  );
};

export default ClientDetailPage;
