import { yupResolver } from '@hookform/resolvers/yup';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
} from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { useClientMutations, useClients } from '../../hooks/useClients';
import type { Client, ClientFormValues } from '../../types/client.types';
import { clientSchema, PHONE_DIGITS, phoneDigits } from './clientSchemas';
import { PhoneField } from './PhoneField';

interface ClientCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
  /** An already registered client found by phone; defaults to `onCreated`. */
  onUseExisting?: (client: Client) => void;
}

const defaultValues: ClientFormValues = {
  clientName: '',
  phoneNumber: '',
  secondaryPhoneNumber: '',
  comments: '',
};

const ClientCreateDialog = ({ open, onClose, onCreated, onUseExisting }: ClientCreateDialogProps) => {
  const { createClient, isCreatingClient } = useClientMutations();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: yupResolver(clientSchema),
    defaultValues,
  });
  // Detect a registered phone before saving instead of silently reusing that client.
  const phone = phoneDigits(useWatch({ control, name: 'phoneNumber' }));
  const lookup = useClients({ phone, limit: 1, offset: 0 }, open && phone.length === PHONE_DIGITS);
  const existing = phone.length === PHONE_DIGITS ? lookup.data?.data[0] : undefined;

  const chooseExisting = (client: Client) => {
    reset(defaultValues);
    (onUseExisting ?? onCreated)(client);
  };

  const handleClose = () => {
    if (isCreatingClient) return;
    reset(defaultValues);
    onClose();
  };

  const handleCreate = async (values: ClientFormValues) => {
    const client = await createClient({
      externalId: uuidv4(),
      clientName: values.clientName.trim(),
      phoneNumber: values.phoneNumber.trim(),
      secondaryPhoneNumber: values.secondaryPhoneNumber.trim() || null,
      comments: values.comments.trim() || null,
      vehicles: [],
    });

    reset(defaultValues);
    onCreated(client);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Nuevo cliente
        <IconButton aria-label="Cerrar" onClick={handleClose} disabled={isCreatingClient}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" onSubmit={handleSubmit(handleCreate)} noValidate>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <Controller
                name="clientName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    autoFocus
                    fullWidth
                    required
                    label="Nombre del cliente"
                    error={Boolean(errors.clientName)}
                    helperText={errors.clientName?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <PhoneField
                    {...field}
                    fullWidth
                    required
                    label="Celular"
                    error={Boolean(errors.phoneNumber)}
                    helperText={errors.phoneNumber?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller name="secondaryPhoneNumber" control={control} render={({ field }) => <PhoneField {...field} fullWidth label="Teléfono secundario (opcional)" error={Boolean(errors.secondaryPhoneNumber)} helperText={errors.secondaryPhoneNumber?.message} />} />
            </Grid>
            <Grid size={12}>
              <Controller
                name="comments"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={3}
                    label="Comentarios internos (opcional)"
                    error={Boolean(errors.comments)}
                    helperText={errors.comments?.message ?? 'Estos comentarios no forman parte de las órdenes impresas.'}
                  />
                )}
              />
            </Grid>
          </Grid>
          {existing && (
            <Alert
              severity="info"
              sx={{ mt: 2.5 }}
              action={<Button color="inherit" size="small" onClick={() => chooseExisting(existing)}>Usar este cliente</Button>}
            >
              Este celular ya está registrado a nombre de <strong>{existing.clientName}</strong>
              {' '}({existing.vehicles.length === 1 ? '1 vehículo' : `${existing.vehicles.length} vehículos`}). Usa su expediente para no duplicarlo.
            </Alert>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button onClick={handleClose} disabled={isCreatingClient}>Cancelar</Button>
            {existing ? (
              <Button variant="contained" onClick={() => chooseExisting(existing)}>Usar este cliente</Button>
            ) : (
              <Button type="submit" variant="contained" disabled={isCreatingClient}>
                {isCreatingClient ? 'Guardando…' : 'Guardar cliente'}
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCreateDialog;
