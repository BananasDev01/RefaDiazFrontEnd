import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useClientMutations } from '../../hooks/useClients';
import type { Client } from '../../types/client.types';
import { clientSchema, phoneDigits } from './clientSchemas';
import { PhoneField } from './PhoneField';

const schema = clientSchema.pick(['secondaryPhoneNumber']);

export default function ClientContactDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const { updateClientContact, isUpdatingContact } = useClientMutations();
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema), defaultValues: { secondaryPhoneNumber: phoneDigits(client.secondaryPhoneNumber) },
  });
  return <Dialog open onClose={() => !isUpdatingContact && onClose()} maxWidth="xs" fullWidth>
    <DialogTitle>Teléfonos del cliente</DialogTitle>
    <form onSubmit={handleSubmit(async (values) => {
      try { await updateClientContact({ clientId: client.id, payload: { secondaryPhoneNumber: values.secondaryPhoneNumber.trim() || null } }); onClose(); } catch { /* Mutation displays the error. */ }
    })}>
      <DialogContent>
        <Typography sx={{ mb: 3 }}>Celular principal: {client.phoneNumber}</Typography>
        <Controller name="secondaryPhoneNumber" control={control} render={({ field }) => <PhoneField {...field} autoFocus fullWidth label="Teléfono secundario (opcional)" disabled={isUpdatingContact} error={Boolean(errors.secondaryPhoneNumber)} helperText={errors.secondaryPhoneNumber?.message ?? 'Deja vacío para quitar el teléfono secundario.'} />} />
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={isUpdatingContact}>Cancelar</Button><Button type="submit" variant="contained" disabled={isUpdatingContact}>Guardar</Button></DialogActions>
    </form>
  </Dialog>;
}
