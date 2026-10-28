import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Button, ButtonBase, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useClient, useClients } from '../../hooks/useClients';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { Client } from '../../types/client.types';
import type { ServiceOrderCategory } from '../../types/serviceOrder.types';
import ClientCreateDialog from '../Clients/ClientCreateDialog';
import ClientVehicleDialog from '../Clients/ClientVehicleDialog';
import { vehicleDetails, vehicleName } from './serviceOrderUtils';
import { Avatar, PlateBadge } from './ui';
import { cardSx, tone } from './tokens';

interface Selection {
  clientId: number | null;
  vehicleId: number | null;
}

interface ClientVehiclePickerProps {
  initialClientId?: number | null;
  initialVehicleId?: number | null;
  confirmLabel: string;
  /** A part order only needs the client; the vehicle is `null`. */
  onConfirm: (clientId: number, clientVehicleId: number | null) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  category?: ServiceOrderCategory;
}

export const ClientVehiclePicker = ({
  initialClientId = null,
  initialVehicleId = null,
  confirmLabel,
  onConfirm,
  onCancel,
  autoFocus = true,
  category = 'VEHICLE',
}: ClientVehiclePickerProps) => {
  const isPart = category === 'PART';
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection>({ clientId: initialClientId, vehicleId: initialVehicleId });
  const [creatingClient, setCreatingClient] = useState(false);
  const [vehicleFor, setVehicleFor] = useState<number | null>(null);
  const search = useDebouncedValue(query.trim(), 300);
  const results = useClients({ q: search || undefined, limit: 8, offset: 0 });
  const { data: selectedClient } = useClient(selection.clientId);

  const clients = useMemo(() => {
    const found = search ? results.data?.data ?? [] : [];
    // Keep the chosen client visible while the operator keeps searching.
    return selectedClient && !found.some((client) => client.id === selectedClient.id)
      ? [selectedClient, ...found]
      : found;
  }, [results.data?.data, search, selectedClient]);

  const chosenVehicle = selectedClient?.vehicles.find((vehicle) => vehicle.clientVehicleId === selection.vehicleId);
  const ready = Boolean(selectedClient && (isPart || chosenVehicle));

  const pick = (client: Client, vehicleId: number) => setSelection((current) => (
    current.clientId === client.id && current.vehicleId === vehicleId
      ? { clientId: client.id, vehicleId: null }
      : { clientId: client.id, vehicleId }
  ));

  return (
    <Stack spacing={2.5}>
      <TextField
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Celular, nombre o placas"
        slotProps={{
          htmlInput: { 'aria-label': 'Buscar cliente' },
          input: {
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: tone.primary }} /></InputAdornment>,
            endAdornment: results.isFetching && search ? <CircularProgress size={20} /> : null,
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': { bgcolor: tone.card, borderRadius: 3, height: 56, fontSize: 18 },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tone.primary, borderWidth: 2 },
        }}
      />

      {results.isError && search && <Alert severity="error">No se pudo buscar clientes. {results.error instanceof Error ? results.error.message : ''}</Alert>}

      <Box component="section" aria-label="Resultados de clientes" sx={[cardSx, { overflow: 'hidden' }]}>
        {(search || selectedClient) && (
          <Box sx={{ px: 2.25, py: 1.25, bgcolor: tone.subtle, borderBottom: 1, borderColor: tone.border, fontSize: 12, fontWeight: 700, color: tone.faint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {search
              ? results.isFetching && !results.data ? 'Buscando…' : `${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`
              : 'Cliente elegido'}
          </Box>
        )}
        {!search && !selectedClient && (
          <Typography sx={{ px: 2.25, py: 3, color: tone.faint }}>
            Escribe el celular, el nombre o las placas para encontrar al cliente.
          </Typography>
        )}
        {search && !results.isFetching && clients.length === 0 && (
          <Typography sx={{ px: 2.25, py: 3, color: tone.faint }}>No encontramos a nadie con «{search}».</Typography>
        )}
        {clients.map((client) => (
          <Box key={client.id} sx={{ px: 2.25, py: 2, display: 'flex', gap: 1.75, alignItems: 'flex-start', borderBottom: 1, borderColor: tone.divider }}>
            <Avatar name={client.clientName} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: tone.ink }}>{client.clientName}</Typography>
              <Typography sx={{ color: tone.muted }}>{[client.phoneNumber, client.secondaryPhoneNumber].filter(Boolean).join(' · ')}</Typography>
              {isPart ? (
                <ButtonBase
                  aria-pressed={selection.clientId === client.id}
                  onClick={() => setSelection({ clientId: client.id, vehicleId: null })}
                  sx={{
                    mt: 1.5,
                    minHeight: 44,
                    borderRadius: 2.5,
                    px: 1.75,
                    gap: 1,
                    justifyContent: 'flex-start',
                    border: selection.clientId === client.id ? `2px solid ${tone.primary}` : `1px solid ${tone.borderStrong}`,
                    bgcolor: selection.clientId === client.id ? '#F0F4FA' : tone.card,
                    color: selection.clientId === client.id ? tone.primaryDark : tone.text,
                    fontSize: 14,
                    fontWeight: 500,
                    '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: 2 },
                  }}
                >
                  <CheckCircleOutlineIcon fontSize="small" />
                  {selection.clientId === client.id ? 'Cliente elegido' : 'Elegir a este cliente'}
                </ButtonBase>
              ) : (
              <Stack spacing={1} sx={{ mt: 1.5 }} role="group" aria-label={`Vehículos de ${client.clientName}`}>
                {client.vehicles.map((vehicle) => {
                  const selected = selection.clientId === client.id && selection.vehicleId === vehicle.clientVehicleId;
                  return (
                    <ButtonBase
                      key={vehicle.clientVehicleId}
                      aria-pressed={selected}
                      onClick={() => pick(client, vehicle.clientVehicleId)}
                      sx={{
                        minHeight: 48,
                        borderRadius: 2.5,
                        px: 1.75,
                        gap: 1.5,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        border: selected ? `2px solid ${tone.primary}` : `1px solid ${tone.borderStrong}`,
                        bgcolor: selected ? '#F0F4FA' : tone.card,
                        color: selected ? tone.primaryDark : tone.text,
                        fontSize: 14,
                        '&:focus-visible': { outline: `2px solid ${tone.primary}`, outlineOffset: 2 },
                      }}
                    >
                      <DirectionsCarOutlinedIcon fontSize="small" />
                      <Box component="span" sx={{ flex: 1 }}>
                        <strong>{vehicleName(vehicle)}</strong>{vehicleDetails(vehicle) ? ` · ${vehicleDetails(vehicle)}` : ''}
                      </Box>
                      <PlateBadge plate={vehicle.plate} />
                    </ButtonBase>
                  );
                })}
                <Button
                  onClick={() => setVehicleFor(client.id)}
                  startIcon={<AddIcon />}
                  sx={{ justifyContent: 'flex-start', minHeight: 44, borderRadius: 2.5, border: '1px dashed #9AA6B8', px: 1.75, fontWeight: 500 }}
                >
                  {client.vehicles.length ? 'Otro vehículo de este cliente' : 'Agregar el vehículo de este cliente'}
                </Button>
              </Stack>
              )}
            </Box>
          </Box>
        ))}
        <Box sx={{ px: 2.25, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ color: tone.muted }}>¿No aparece?</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreatingClient(true)} sx={{ height: 40, borderRadius: 2 }}>
            {isPart ? 'Registrar cliente' : 'Registrar cliente y vehículo'}
          </Button>
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-end" flexWrap="wrap" useFlexGap>
        <Typography sx={{ color: tone.faint }} aria-live="polite">
          {ready && selectedClient
            ? [selectedClient.clientName, chosenVehicle && vehicleName(chosenVehicle), chosenVehicle?.color].filter(Boolean).join(' · ')
            : isPart ? 'Elige al cliente que deja la pieza' : 'Elige el vehículo que ingresa'}
        </Typography>
        {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
        <Button
          variant="contained"
          disableElevation
          endIcon={<ChevronRightIcon />}
          disabled={!ready}
          onClick={() => { if (selection.clientId && (isPart || selection.vehicleId)) onConfirm(selection.clientId, isPart ? null : selection.vehicleId); }}
          sx={{ height: 48, px: 2.75, borderRadius: 2.5, fontSize: 15 }}
        >
          {confirmLabel}
        </Button>
      </Stack>

      <ClientCreateDialog
        open={creatingClient}
        onClose={() => setCreatingClient(false)}
        onCreated={(client) => {
          setSelection({ clientId: client.id, vehicleId: null });
          setCreatingClient(false);
          if (!isPart) setVehicleFor(client.id);
        }}
        onUseExisting={(client) => {
          // Pick the registered client and let the operator choose among its vehicles.
          setSelection({ clientId: client.id, vehicleId: !isPart && client.vehicles.length === 1 ? client.vehicles[0].clientVehicleId : null });
          setCreatingClient(false);
          if (!isPart && client.vehicles.length === 0) setVehicleFor(client.id);
        }}
      />
      {vehicleFor !== null && (
        <ClientVehicleDialog
          clientId={vehicleFor}
          open
          onClose={() => setVehicleFor(null)}
          onCreated={(client, clientVehicleId) => setSelection({ clientId: client.id, vehicleId: clientVehicleId })}
        />
      )}
    </Stack>
  );
};
