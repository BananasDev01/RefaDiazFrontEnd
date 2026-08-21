import AddIcon from '@mui/icons-material/Add';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { useClients } from '../../hooks/useClients';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { ClientVehicle } from '../../types/client.types';
import ClientCreateDialog from './ClientCreateDialog';

const DEFAULT_PAGE_SIZE = 20;

const getVehicleLabel = (vehicle: ClientVehicle) => {
  const model = [vehicle.carModel?.brand?.name, vehicle.carModel?.name]
    .filter(Boolean)
    .join(' ');
  const details = [vehicle.modelYear, vehicle.plate].filter(Boolean).join(' · ');
  return [model || 'Vehículo sin modelo', details].filter(Boolean).join(' — ');
};

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
  const { data, isLoading, isFetching, isError, error } = useClients(filters);
  const clients = data?.data ?? [];

  const updatePagination = (nextPage: number, nextLimit = rowsPerPage) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage > 0) nextParams.set('page', String(nextPage));
    else nextParams.delete('page');
    if (nextLimit !== DEFAULT_PAGE_SIZE) nextParams.set('limit', String(nextLimit));
    else nextParams.delete('limit');
    setSearchParams(nextParams);
  };

  return (
    <Box>
      <PageHeader
        title="Clientes"
        actionButton={(
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateOpen(true)}
          >
            Nuevo cliente
          </Button>
        )}
      />

      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Consulta el expediente de cada cliente, sus vehículos y el historial de órdenes de servicio.
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <TextField
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          fullWidth
          label="Buscar clientes"
          placeholder="Nombre, celular, placa, marca, modelo o año"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: isFetching && !isLoading ? <CircularProgress size={20} /> : null,
            },
          }}
        />
      </Paper>

      {isError ? (
        <Alert severity="error">
          {error instanceof Error ? error.message : 'No fue posible cargar los clientes.'}
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table aria-label="Listado de clientes">
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Celular</TableCell>
                  <TableCell>Vehículos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Stack alignItems="center" spacing={1.5} sx={{ py: 7 }}>
                        <DirectionsCarOutlinedIcon color="disabled" sx={{ fontSize: 44 }} />
                        <Typography variant="h6">No se encontraron clientes</Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                          {debouncedSearchText
                            ? 'Prueba con otro nombre, teléfono o dato del vehículo.'
                            : 'Registra el primer cliente para comenzar su expediente.'}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow
                      key={client.id}
                      hover
                      tabIndex={0}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/clients/${client.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/clients/${client.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight={650}>{client.clientName}</Typography>
                        {client.comments && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 360, display: 'block' }}>
                            {client.comments}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{client.phoneNumber}</TableCell>
                      <TableCell>
                        {client.vehicles.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">Sin vehículos</Typography>
                        ) : (
                          <Stack spacing={0.4}>
                            {client.vehicles.slice(0, 2).map((vehicle) => (
                              <Typography key={vehicle.clientVehicleId} variant="body2">
                                {getVehicleLabel(vehicle)}
                              </Typography>
                            ))}
                            {client.vehicles.length > 2 && (
                              <Typography variant="caption" color="primary.main">
                                +{client.vehicles.length - 2} vehículo(s)
                              </Typography>
                            )}
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.pagination.total ?? 0}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Clientes por página"
            onPageChange={(_, nextPage) => updatePagination(nextPage)}
            onRowsPerPageChange={(event) => updatePagination(0, Number(event.target.value))}
          />
        </Paper>
      )}

      <ClientCreateDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(client) => {
          setIsCreateOpen(false);
          navigate(`/clients/${client.id}`);
        }}
      />
    </Box>
  );
};

export default ClientsPage;
