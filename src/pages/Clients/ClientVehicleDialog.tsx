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
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BrandModelSelector } from '../../components/common/BrandModelSelector';
import { useClientMutations } from '../../hooks/useClients';
import { useBrands, useModels } from '../../hooks/useVehicleData';
import type { Client, ClientVehicleFormValues } from '../../types/client.types';
import { clientVehicleSchema } from './clientSchemas';

interface ClientVehicleDialogProps {
  clientId: number;
  open: boolean;
  onClose: () => void;
  onCreated?: (client: Client, clientVehicleId: number) => void;
}

const defaultValues: ClientVehicleFormValues = {
  brandId: null,
  carModelId: null,
  modelYear: null,
  version: '',
  color: '',
  plate: '',
  comments: '',
};

const ClientVehicleDialog = ({ clientId, open, onClose, onCreated }: ClientVehicleDialogProps) => {
  const { addClientVehicles, isAddingVehicles } = useClientMutations();
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClientVehicleFormValues>({
    resolver: yupResolver(clientVehicleSchema),
    defaultValues,
  });
  const selectedBrandId = useWatch({ control, name: 'brandId' });
  const selectedModelId = useWatch({ control, name: 'carModelId' });
  const { data: brands = [] } = useBrands();
  const { data: models = [] } = useModels(selectedBrandId);
  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
    [brands, selectedBrandId]
  );
  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId]
  );

  const handleClose = () => {
    if (isAddingVehicles) return;
    reset(defaultValues);
    onClose();
  };

  const handleCreate = async (values: ClientVehicleFormValues) => {
    const externalId = uuidv4();
    const client = await addClientVehicles({
      clientId,
      payload: {
        vehicle: {
          externalId,
          carModelId: values.carModelId ?? undefined,
          modelYear: values.modelYear ?? undefined,
          version: values.version.trim() || undefined,
          color: values.color.trim() || undefined,
          plate: values.plate.trim() || undefined,
          comments: values.comments.trim() || undefined,
        },
      },
    });
    const createdVehicle = client.vehicles.find((vehicle) => vehicle.externalId === externalId);
    if (!createdVehicle) {
      throw new Error('El vehículo se guardó, pero no fue posible seleccionarlo automáticamente.');
    }
    reset(defaultValues);
    onCreated?.(client, createdVehicle.clientVehicleId);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Agregar vehículo
        <IconButton aria-label="Cerrar" onClick={handleClose} disabled={isAddingVehicles}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" onSubmit={handleSubmit(handleCreate)} noValidate>
          <Grid container spacing={2}>
            <BrandModelSelector
              selectedBrand={selectedBrand}
              selectedModel={selectedModel}
              onBrandChange={(brand) => {
                setValue('brandId', brand?.id ?? null, { shouldDirty: true, shouldValidate: true });
                setValue('carModelId', null, { shouldDirty: true, shouldValidate: true });
              }}
              onModelChange={(model) => {
                setValue('carModelId', model?.id ?? null, { shouldDirty: true, shouldValidate: true });
              }}
              manageModels
              required
              brandError={errors.brandId?.message}
              modelError={errors.carModelId?.message}
              brandGridSize={{ xs: 12, md: 4 }}
              modelGridSize={{ xs: 12, md: 4 }}
            />
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name="modelYear"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)}
                    fullWidth
                    required
                    type="number"
                    label="Año"
                    error={Boolean(errors.modelYear)}
                    helperText={errors.modelYear?.message}
                    inputProps={{ min: 1886, max: new Date().getFullYear() + 1 }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="version" control={control} render={({ field }) => <TextField {...field} fullWidth label="Versión (opcional)" />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="color" control={control} render={({ field }) => <TextField {...field} fullWidth label="Color (opcional)" />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="plate" control={control} render={({ field }) => <TextField {...field} fullWidth label="Placas (opcional)" />} />
            </Grid>
            <Grid size={12}>
              <Controller name="comments" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={2} label="Comentarios del vehículo (opcional)" />} />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button onClick={handleClose} disabled={isAddingVehicles}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isAddingVehicles}>
              {isAddingVehicles ? 'Guardando…' : 'Agregar vehículo'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ClientVehicleDialog;
