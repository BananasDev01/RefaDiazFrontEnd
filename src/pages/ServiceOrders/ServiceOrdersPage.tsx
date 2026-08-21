import AddIcon from '@mui/icons-material/Add';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useServiceOrders, useServiceOrderStatusCounts } from '../../hooks/useServiceOrders';
import {
  getSnapshotText,
  SERVICE_ORDER_STATUS_LABELS,
  type ServiceOrderSearchParams,
  type ServiceOrderStatus,
} from '../../types/serviceOrder.types';

const PAGE_SIZE = 20;
type SearchField = 'folio' | 'phone' | 'plate';
const statuses: ServiceOrderStatus[] = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const statusColor: Record<ServiceOrderStatus, 'default' | 'info' | 'success' | 'error'> = {
  DRAFT: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const isServiceStatus = (value: string | null): value is ServiceOrderStatus =>
  value !== null && statuses.includes(value as ServiceOrderStatus);

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`)
  );
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

const ServiceOrdersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const status: ServiceOrderStatus = isServiceStatus(initialStatus) ? initialStatus : 'IN_PROGRESS';
  const page = Math.max(Number(searchParams.get('page') ?? 0), 0);
  const clientId = searchParams.get('clientId') ? Number(searchParams.get('clientId')) : undefined;
  const [searchText, setSearchText] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('folio');
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 400);

  const filters = useMemo<ServiceOrderSearchParams>(() => {
    const base: ServiceOrderSearchParams = {
      status,
      clientId,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (debouncedSearchText) {
      if (searchField === 'phone') base.phone = debouncedSearchText;
      else if (searchField === 'plate') base.plate = debouncedSearchText;
      else base.folio = debouncedSearchText;
    }
    return base;
  }, [clientId, debouncedSearchText, page, searchField, status]);

  const { data, isLoading, isFetching, isError, error } = useServiceOrders(filters);
  const statusCounts = useServiceOrderStatusCounts(clientId);
  const orders = data?.data ?? [];

  const setStatus = (nextStatus: ServiceOrderStatus) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('status', nextStatus);
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const setPage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage > 0) nextParams.set('page', String(nextPage));
    else nextParams.delete('page');
    setSearchParams(nextParams);
  };

  return (
    <Box>
      <PageHeader
        title="Órdenes de servicio"
        actionButton={(
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/service-orders/new')}>
            Nueva orden
          </Button>
        )}
      />

      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Vista operativa para dar seguimiento a los trabajos del taller. Al entrar se muestran las órdenes en progreso.
      </Typography>

      <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
        <Tabs
          value={status}
          onChange={(_, value: ServiceOrderStatus) => setStatus(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Estado de las órdenes"
        >
          {statuses.map((item) => (
            <Tab
              key={item}
              value={item}
              label={`${SERVICE_ORDER_STATUS_LABELS[item]} (${statusCounts[item] ?? '…'})`}
            />
          ))}
        </Tabs>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Select
            value={searchField}
            onChange={(event) => setSearchField(event.target.value as SearchField)}
            aria-label="Tipo de búsqueda"
            sx={{ minWidth: { sm: 180 } }}
          >
            <MenuItem value="folio">Folio o referencia</MenuItem>
            <MenuItem value="phone">Teléfono</MenuItem>
            <MenuItem value="plate">Placas</MenuItem>
          </Select>
          <TextField
            fullWidth
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            label={searchField === 'phone' ? 'Buscar por teléfono' : searchField === 'plate' ? 'Buscar por placas' : 'Buscar por folio o referencia'}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                endAdornment: isFetching && !isLoading ? <CircularProgress size={20} /> : null,
              },
            }}
          />
        </Stack>
      </Paper>

      {isError ? (
        <Alert severity="error">{error instanceof Error ? error.message : 'No fue posible cargar las órdenes.'}</Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table aria-label="Listado de órdenes de servicio">
              <TableHead>
                <TableRow>
                  <TableCell>Folio</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Vehículo</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Stack alignItems="center" spacing={1} sx={{ py: 8 }}>
                        <AssignmentOutlinedIcon color="disabled" sx={{ fontSize: 44 }} />
                        <Typography variant="h6">No hay órdenes {SERVICE_ORDER_STATUS_LABELS[status].toLowerCase()}</Typography>
                        <Typography variant="body2" color="text.secondary">Las órdenes que coincidan con este estado aparecerán aquí.</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : orders.map((order) => {
                  const clientName = getSnapshotText(order.clientSnapshot, 'clientName', 'client_name', 'name', 'nombre') ?? `Cliente #${order.clientId}`;
                  const vehicle = [
                    getSnapshotText(order.vehicleSnapshot, 'brand', 'marca'),
                    getSnapshotText(order.vehicleSnapshot, 'model', 'modelo'),
                    getSnapshotText(order.vehicleSnapshot, 'plate', 'placas'),
                  ].filter(Boolean).join(' · ') || `Vehículo #${order.vehicleId}`;

                  return (
                    <TableRow
                      key={order.externalId}
                      hover
                      tabIndex={0}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/service-orders/${order.externalId}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/service-orders/${order.externalId}`);
                        }
                      }}
                    >
                      <TableCell>{order.folioNumber ? `${order.folioSeries}-${order.folioNumber}` : order.provisionalReference}</TableCell>
                      <TableCell>
                        <Typography fontWeight={650}>{clientName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getSnapshotText(order.clientSnapshot, 'phoneNumber', 'phone_number', 'phone', 'telefono')}
                        </Typography>
                      </TableCell>
                      <TableCell>{vehicle}</TableCell>
                      <TableCell>{formatDate(order.serviceDate)}</TableCell>
                      <TableCell><Chip size="small" color={statusColor[order.status]} label={SERVICE_ORDER_STATUS_LABELS[order.status]} /></TableCell>
                      <TableCell align="right">{formatMoney(order.total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.pagination.total ?? 0}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            labelRowsPerPage="Órdenes por página"
            onPageChange={(_, nextPage) => setPage(nextPage)}
          />
        </Paper>
      )}
    </Box>
  );
};

export default ServiceOrdersPage;
