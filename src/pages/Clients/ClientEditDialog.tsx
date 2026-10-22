import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useClientMutations } from '../../hooks/useClients';
import type { Client } from '../../types/client.types';
import { clientSchema, phoneDigits } from './clientSchemas';
import { PhoneField } from './PhoneField';

const schema = clientSchema.pick(['clientName', 'secondaryPhoneNumber', 'comments']);

/** Edits what staff may change; the primary phone identifies the client and stays fixed. */
export default function ClientEditDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const { updateClientContact, isUpdatingContact } = useClientMutations();
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      clientName: client.clientName,
      secondaryPhoneNumber: phoneDigits(client.secondaryPhoneNumber),
      comments: client.comments ?? '',
    },
  });

  return (
    <Dialog open onClose={() => !isUpdatingContact && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Editar datos del cliente</DialogTitle>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          try {
            await updateClientContact({
              clientId: client.id,
              payload: {
                clientName: values.clientName.trim(),
                secondaryPhoneNumber: values.secondaryPhoneNumber.trim() || null,
                comments: values.comments.trim() || null,
              },
            });
            onClose();
          } catch { /* The mutation shows the error. */ }
        })}
      >
        <DialogContent>
          <Stack spacing={2.5}>
            <Typography color="text.secondary">Celular principal: {client.phoneNumber}. Identifica al cliente y no se puede cambiar.</Typography>
            <Controller name="clientName" control={control} render={({ field }) => <TextField {...field} autoFocus fullWidth required label="Nombre del cliente" disabled={isUpdatingContact} error={Boolean(errors.clientName)} helperText={errors.clientName?.message} />} />
            <Controller name="secondaryPhoneNumber" control={control} render={({ field }) => <PhoneField {...field} fullWidth label="Teléfono secundario (opcional)" disabled={isUpdatingContact} error={Boolean(errors.secondaryPhoneNumber)} helperText={errors.secondaryPhoneNumber?.message ?? 'Deja vacío para quitar el teléfono secundario.'} />} />
            <Controller name="comments" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={3} label="Comentarios internos (opcional)" disabled={isUpdatingContact} error={Boolean(errors.comments)} helperText={errors.comments?.message ?? 'Visibles para el personal en el expediente y al recibir sus vehículos; no se imprimen.'} />} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isUpdatingContact}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isUpdatingContact}>{isUpdatingContact ? 'Guardando…' : 'Guardar'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
