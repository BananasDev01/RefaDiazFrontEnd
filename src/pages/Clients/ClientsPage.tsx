import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useClients } from '../../hooks/useClients';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { vehicleName } from '../ServiceOrders/serviceOrderUtils';
import { cardSx, inputSx, tone } from '../ServiceOrders/tokens';
import { Avatar, PageCanvas, PageContainer, PlateBadge } from '../ServiceOrders/ui';
import ClientCreateDialog from './ClientCreateDialog';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZES = [10, 20, 50];
const VISIBLE_VEHICLES = 2;
const columns = 'minmax(0, 1.3fr) 200px minmax(0, 1.5fr) 24px';

const ClientsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '');
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 400);
  const page = Math.max(Number(searchParams.get('page') ?? 0), 0);
  const rowsPerPage = Math.max(Number(searchParams.get('limit') ?? DEFAULT_PAGE_SIZE), 1);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    const currentQuery = nextParams.get('q') ?? '';

    if (debouncedSearchText) {
      nextParams.set('q', debouncedSearchText);
    } else {
      nextParams.delete('q');
    }

    if (currentQuery !== debouncedSearchText) {
      nextParams.delete('page');
      setSearchParams(nextParams, { replace: true });
    }
  }, [debouncedSearchText, searchParams, setSearchParams]);

  const filters = useMemo(
    () => ({
      q: debouncedSearchText || undefined,
      limit: rowsPerPage,
      offset: page * rowsPerPage,
    }),
    [debouncedSearchText, page, rowsPerPage]
  );
  const { data, isLoading, isFetching, isError, error, refetch } = useClients(filters);
  const clients = data?.data ?? [];
  const total = data?.pagination.total ?? 0;

  const updatePagination = (nextPage: number, nextLimit = rowsPerPage) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage > 0) nextParams.set('page', String(nextPage));
    else nextParams.delete('page');
    if (nextLimit !== DEFAULT_PAGE_SIZE) nextParams.set('limit', String(nextLimit));
    else nextParams.delete('limit');
    setSearchParams(nextParams);
  };

  return (
    <PageCanvas>
      <PageContainer sx={{ pt: 3.5, pb: 6, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography component="h1" sx={{ fontSize: 26, fontWeight: 700, color: tone.ink }}>Clientes</Typography>
            <Typography sx={{ color: tone.faint, fontSize: 14 }}>Expediente de cada cliente, sus vehículos y su historial de órdenes.</Typography>
          </Box>
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon />}
            onClick={() => setIsCreateOpen(true)}
            sx={{ height: 44, px: 2.5, borderRadius: 2.5, whiteSpace: 'nowrap' }}
          >
            Nuevo cliente
          </Button>
        </Box>

        <TextField
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Nombre, celular, placa, marca, modelo o año"
          slotProps={{
            htmlInput: { 'aria-label': 'Buscar clientes' },
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: tone.faint }} /></InputAdornment>,
              endAdornment: isFetching && !isLoading ? <InputAdornment position="end"><CircularProgress size={18} /></InputAdornment> : null,
            },
          }}
          sx={[inputSx, { '& .MuiOutlinedInput-root': { height: 44, borderRadius: 2.5 } }]}
        />

        {isError ? (
          <Alert severity="error" action={<Button color="inherit" onClick={() => void refetch()}>Reintentar</Button>}>
            {error instanceof Error ? error.message : 'No fue posible cargar los clientes.'}
          </Alert>
        ) : (
          <Box sx={[cardSx, { overflowX: 'auto' }]}>
            <Box sx={{ minWidth: 760 }} aria-busy={isFetching}>
              <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 2, px: 2.5, py: 1.5, bgcolor: tone.subtle, borderBottom: 1, borderColor: tone.border, fontSize: 12, fontWeight: 700, color: tone.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span>Cliente</span><span>Teléfonos</span><span>Vehículos</span><span />
              </Box>

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
              ) : clients.length === 0 ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 8, px: 2, textAlign: 'center' }}>
                  <PeopleAltOutlinedIcon sx={{ fontSize: 44, color: tone.borderStrong }} />
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: tone.ink }}>
                    {debouncedSearchText ? 'No encontramos coincidencias' : 'Todavía no hay clientes'}
                  </Typography>
                  <Typography sx={{ color: tone.faint }}>
                    {debouncedSearchText
                      ? 'Prueba con otro nombre, teléfono o dato del vehículo.'
                      : 'Registra el primer cliente para comenzar su expediente.'}
                  </Typography>
                  {!debouncedSearchText && <Button startIcon={<AddIcon />} onClick={() => setIsCreateOpen(true)}>Nuevo cliente</Button>}
                </Stack>
              ) : clients.map((client) => (
                <Box
                  key={client.id}
                  component={Link}
                  to={`/clients/${client.id}`}
                  sx={{ display: 'grid', gridTemplateColumns: columns, gap: 2, px: 2.5, py: 1.75, borderBottom: 1, borderColor: tone.divider, alignItems: 'center', textDecoration: 'none', color: tone.text, opacity: isFetching && !isLoading ? 0.6 : 1, '&:hover': { bgcolor: '#F8FAFC' }, '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: -2 } }}
                >
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Avatar name={client.clientName} size={36} />
                    <Box component="span" sx={{ minWidth: 0 }}>
                      <Box component="span" sx={{ display: 'block', fontWeight: 700, color: tone.ink }}>{client.clientName}</Box>
                      {client.comments && (
                        <Box component="span" sx={{ display: 'block', color: tone.faint, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.comments}</Box>
                      )}
                    </Box>
                  </Box>
                  <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    <Box component="span" sx={{ display: 'block', fontWeight: 500 }}>{client.phoneNumber}</Box>
                    {client.secondaryPhoneNumber && <Box component="span" sx={{ display: 'block', color: tone.faint, fontSize: 13 }}>{client.secondaryPhoneNumber}</Box>}
                  </Box>
                  <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                    {client.vehicles.length === 0 && <Box component="span" sx={{ color: tone.faint, fontSize: 13 }}>Sin vehículos</Box>}
                    {client.vehicles.slice(0, VISIBLE_VEHICLES).map((vehicle) => (
                      <Box key={vehicle.clientVehicleId} component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Box component="span" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vehicleName(vehicle)}</Box>
                        <PlateBadge plate={vehicle.plate} size="sm" />
                      </Box>
                    ))}
                    {client.vehicles.length > VISIBLE_VEHICLES && (
                      <Box component="span" sx={{ color: tone.primary, fontSize: 13, fontWeight: 500 }}>
                        +{client.vehicles.length - VISIBLE_VEHICLES} {client.vehicles.length - VISIBLE_VEHICLES === 1 ? 'vehículo más' : 'vehículos más'}
                      </Box>
                    )}
                  </Box>
                  <ChevronRightIcon fontSize="small" sx={{ color: '#9AA6B8' }} />
                </Box>
              ))}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, px: 2.5, py: 1.25, color: tone.faint }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography id="clients-page-size" sx={{ fontSize: 13 }}>Por página</Typography>
                  <Select
                    size="small"
                    value={rowsPerPage}
                    onChange={(event) => updatePagination(0, Number(event.target.value))}
                    inputProps={{ 'aria-labelledby': 'clients-page-size' }}
                    sx={{ fontSize: 13, '& .MuiSelect-select': { py: 0.5 } }}
                  >
                    {PAGE_SIZES.map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
                  </Select>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{total ? `${page * rowsPerPage + 1}–${Math.min(total, (page + 1) * rowsPerPage)} de ${total}` : ''}</span>
                  <IconButton aria-label="Página anterior" disabled={page === 0} onClick={() => updatePagination(page - 1)}><ChevronLeftIcon /></IconButton>
                  <IconButton aria-label="Página siguiente" disabled={(page + 1) * rowsPerPage >= total} onClick={() => updatePagination(page + 1)}><ChevronRightIcon /></IconButton>
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </PageContainer>

      <ClientCreateDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(client) => {
          setIsCreateOpen(false);
          navigate(`/clients/${client.id}`);
        }}
      />
    </PageCanvas>
  );
};

export default ClientsPage;
