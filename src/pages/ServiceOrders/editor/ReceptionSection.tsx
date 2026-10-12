import AddIcon from '@mui/icons-material/Add';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { memo, useState, type ReactNode } from 'react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useClient } from '../../../hooks/useClients';
import type { ServiceOrderFormValues } from '../../../types/serviceOrder.types';
import ClientVehicleDialog from '../../Clients/ClientVehicleDialog';
import { ClientVehiclePicker } from '../ClientVehiclePicker';
import { vehicleDetails, vehicleName } from '../serviceOrderUtils';
import { FieldLabel, IconTile, PlateBadge, SectionCard } from '../ui';
import { inputSx, tone } from '../tokens';

const SummaryTile = ({ icon, caption, title, detail, actions }: { icon: ReactNode; caption: string; title: ReactNode; detail?: ReactNode; actions: ReactNode }) => (
  <Box sx={{ border: 1, borderColor: tone.border, borderRadius: 2.5, p: 1.75, display: 'flex', gap: 1.75, alignItems: 'flex-start', minWidth: 0 }}>
    <IconTile>{icon}</IconTile>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, color: tone.faint, fontWeight: 500 }}>{caption}</Typography>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: tone.ink, overflowWrap: 'anywhere' }}>{title}</Typography>
      {detail && <Box sx={{ color: tone.muted, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>{detail}</Box>}
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>{actions}</Box>
  </Box>
);

interface ReceptionSectionProps {
  readOnly: boolean;
  onOpenClient: (clientId: number) => void;
}

export const ReceptionSection = memo(({ readOnly, onOpenClient }: ReceptionSectionProps) => {
  const { control, setValue } = useFormContext<ServiceOrderFormValues>();
  const { errors } = useFormState({ control, name: ['clientId', 'clientVehicleId', 'serviceDate', 'reportedFailureSummary'] });
  const clientId = useWatch({ control, name: 'clientId' });
  const clientVehicleId = useWatch({ control, name: 'clientVehicleId' });
  const { data: client, isLoading } = useClient(clientId);
  const vehicle = client?.vehicles.find((candidate) => candidate.clientVehicleId === clientVehicleId);
  const [picking, setPicking] = useState(false);
  const [vehicleMenu, setVehicleMenu] = useState<HTMLElement | null>(null);
  const [addingVehicle, setAddingVehicle] = useState(false);

  const choose = (nextClientId: number, nextVehicleId: number) => {
    setValue('clientId', nextClientId, { shouldDirty: true, shouldValidate: true });
    setValue('clientVehicleId', nextVehicleId, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    setPicking(false);
  };

  const linkButton = { fontSize: 13, fontWeight: 500, minWidth: 0, px: 0.75, py: 0.25 } as const;

  return (
    <SectionCard id="so-recepcion" title="Recepción">
      {!clientId ? (
        <Box sx={{ border: '1px dashed', borderColor: errors.clientId ? 'error.main' : '#9AA6B8', borderRadius: 2.5, p: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ flex: 1, color: errors.clientId ? 'error.main' : tone.muted }}>
            {errors.clientId?.message ?? 'Esta captura todavía no tiene cliente ni vehículo.'}
          </Typography>
          <Button variant="contained" disableElevation disabled={readOnly} onClick={() => setPicking(true)}>Elegir cliente y vehículo</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
          <SummaryTile
            icon={<PersonOutlineIcon />}
            caption="Cliente"
            title={isLoading ? <Skeleton width={180} /> : client?.clientName ?? 'Cliente no disponible'}
            detail={client && <span>{[client.phoneNumber, client.secondaryPhoneNumber].filter(Boolean).join(' · ')}</span>}
            actions={(
              <>
                <Button size="small" sx={linkButton} onClick={() => onOpenClient(clientId)}>Ver expediente</Button>
                {!readOnly && <Button size="small" sx={linkButton} onClick={() => setPicking(true)}>Cambiar</Button>}
              </>
            )}
          />
          <SummaryTile
            icon={<DirectionsCarOutlinedIcon />}
            caption="Vehículo"
            title={isLoading ? <Skeleton width={180} /> : vehicle ? vehicleName(vehicle) : <Box component="span" sx={{ color: errors.clientVehicleId ? 'error.main' : tone.faint, fontWeight: 500 }}>{errors.clientVehicleId?.message ?? 'Elige el vehículo'}</Box>}
            detail={vehicle && (
              <>
                {vehicleDetails(vehicle) && <span>{vehicleDetails(vehicle)}</span>}
                <PlateBadge plate={vehicle.plate} />
              </>
            )}
            actions={!readOnly && (
              <Button
                size="small"
                sx={linkButton}
                aria-haspopup="menu"
                aria-expanded={Boolean(vehicleMenu)}
                onClick={(event) => setVehicleMenu(event.currentTarget)}
              >
                {vehicle ? 'Cambiar' : 'Elegir'}
              </Button>
            )}
          />
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '190px minmax(0, 1fr)' }, gap: 1.5, mt: 2 }}>
        <Controller
          name="serviceDate"
          control={control}
          render={({ field }) => (
            <Box>
              <FieldLabel htmlFor="so-service-date">Fecha de ingreso</FieldLabel>
              <TextField {...field} id="so-service-date" type="date" size="small" fullWidth disabled={readOnly} error={Boolean(errors.serviceDate)} helperText={errors.serviceDate?.message} sx={[inputSx, { '& .MuiOutlinedInput-root': { height: 40 } }]} />
            </Box>
          )}
        />
        <Controller
          name="reportedFailureSummary"
          control={control}
          render={({ field }) => (
            <Box>
              <FieldLabel htmlFor="so-summary">Motivo de ingreso</FieldLabel>
              <TextField
                {...field}
                id="so-summary"
                size="small"
                fullWidth
                multiline
                minRows={1}
                maxRows={4}
                disabled={readOnly}
                placeholder="Lo que reporta el cliente; se imprime en FALLA"
                error={Boolean(errors.reportedFailureSummary)}
                helperText={errors.reportedFailureSummary?.message}
                sx={inputSx}
              />
            </Box>
          )}
        />
      </Box>

      <Menu anchorEl={vehicleMenu} open={Boolean(vehicleMenu)} onClose={() => setVehicleMenu(null)}>
        {client?.vehicles.map((candidate) => (
          <MenuItem
            key={candidate.clientVehicleId}
            selected={candidate.clientVehicleId === clientVehicleId}
            onClick={() => {
              setValue('clientVehicleId', candidate.clientVehicleId, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
              setVehicleMenu(null);
            }}
          >
            <ListItemIcon><DirectionsCarOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={vehicleName(candidate)} secondary={[vehicleDetails(candidate), candidate.plate].filter(Boolean).join(' · ')} />
          </MenuItem>
        ))}
        {Boolean(client?.vehicles.length) && <Divider />}
        <MenuItem onClick={() => { setVehicleMenu(null); setAddingVehicle(true); }} sx={{ color: tone.primary, fontWeight: 500 }}>
          <ListItemIcon sx={{ color: 'inherit' }}><AddIcon fontSize="small" /></ListItemIcon>
          Agregar vehículo
        </MenuItem>
      </Menu>

      <Dialog open={picking} onClose={() => setPicking(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 700 }}>Cliente y vehículo de la orden</DialogTitle>
        <DialogContent sx={{ bgcolor: tone.ground, pt: '16px !important' }}>
          {clientId && <Alert severity="info" sx={{ mb: 2 }}>Al cambiar de cliente la orden se reasigna; los datos capturados se conservan.</Alert>}
          <ClientVehiclePicker
            initialClientId={clientId}
            initialVehicleId={clientVehicleId}
            confirmLabel="Usar este vehículo"
            onConfirm={choose}
            onCancel={() => setPicking(false)}
          />
        </DialogContent>
      </Dialog>

      {clientId && addingVehicle && (
        <ClientVehicleDialog
          clientId={clientId}
          open
          onClose={() => setAddingVehicle(false)}
          onCreated={(_, createdVehicleId) => setValue('clientVehicleId', createdVehicleId, { shouldDirty: true, shouldValidate: true, shouldTouch: true })}
        />
      )}
    </SectionCard>
  );
});
ReceptionSection.displayName = 'ReceptionSection';
