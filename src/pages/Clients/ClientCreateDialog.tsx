import { yupResolver } from '@hookform/resolvers/yup';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { useClientMutations } from '../../hooks/useClients';
import type { Client, ClientFormValues } from '../../types/client.types';
import { clientSchema } from './clientSchemas';

interface ClientCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
}

const defaultValues: ClientFormValues = {
  clientName: '',
  phoneNumber: '',
  comments: '',
};

const ClientCreateDialog = ({ open, onClose, onCreated }: ClientCreateDialogProps) => {
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
                  <TextField
                    {...field}
                    fullWidth
                    required
                    label="Celular"
                    inputMode="tel"
                    error={Boolean(errors.phoneNumber)}
                    helperText={errors.phoneNumber?.message}
                  />
                )}
              />
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button onClick={handleClose} disabled={isCreatingClient}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isCreatingClient}>
              {isCreatingClient ? 'Guardando…' : 'Guardar cliente'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCreateDialog;
