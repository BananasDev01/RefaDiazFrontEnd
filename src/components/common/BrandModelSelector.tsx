import { useMemo, useState, type MouseEvent, type SyntheticEvent } from 'react';
import { Autocomplete, Box, Grid, IconButton, TextField } from '@mui/material';
import type { GridProps } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useBrands, useModels } from '../../hooks/useVehicleData';
import { BRAND_TYPE_AUTOMOTIVE } from '../../constants/productConstants';
import type { Brand } from '../../types/brand.types';
import type { CarModel } from '../../types/model.types';
import { AddModelDialog } from './AddModelDialog';
import { DeleteModelDialog } from './DeleteModelDialog';

const ADD_NEW_MODEL_ID = -1; // Opción sentinel para "+ Añadir nuevo modelo"

interface BrandModelSelectorProps {
  selectedBrand: Brand | null;
  selectedModel: CarModel | null;
  onBrandChange: (brand: Brand | null) => void;
  onModelChange: (model: CarModel | null) => void;
  disabled?: boolean;
  /** Habilita crear/eliminar modelos desde el propio Autocomplete. */
  manageModels?: boolean;
  required?: boolean;
  brandError?: string;
  modelError?: string;
  brandGridSize: GridProps['size'];
  modelGridSize: GridProps['size'];
}

const getBrandGroup = (brand: Brand) => (
  brand.brandTypeId === BRAND_TYPE_AUTOMOTIVE ? 'Automotriz' : 'Carga Pesada'
);

/**
 * Par de Autocompletes Marca → Modelo (con agrupado por tipo de marca)
 * compartido por compatibilidades de producto y notas de vehículo.
 * Renderiza dos Grid items; debe colocarse dentro de un Grid container.
 */
export const BrandModelSelector = ({
  selectedBrand,
  selectedModel,
  onBrandChange,
  onModelChange,
  disabled = false,
  manageModels = false,
  required = false,
  brandError,
  modelError,
  brandGridSize,
  modelGridSize,
}: BrandModelSelectorProps) => {
  const [isAddModelDialogOpen, setAddModelDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<CarModel | null>(null);

  const { data: brands = [], isLoading: isLoadingBrands } = useBrands();
  const { data: models = [], isLoading: isLoadingModels } = useModels(selectedBrand?.id ?? null);

  const sortedBrands = useMemo(() => (
    [...brands].sort((a, b) => a.brandTypeId - b.brandTypeId || a.name.localeCompare(b.name, 'es'))
  ), [brands]);

  const modelOptions = useMemo(() => {
    if (!manageModels || !selectedBrand) {
      return models;
    }

    const addNewOption: CarModel = { id: ADD_NEW_MODEL_ID, name: '+ Añadir nuevo modelo', brandId: selectedBrand.id };
    return [...models, addNewOption];
  }, [manageModels, models, selectedBrand]);

  const handleBrandChange = (_: SyntheticEvent, value: Brand | null) => {
    onBrandChange(value);
    onModelChange(null);
  };

  const handleModelChange = (_: SyntheticEvent, value: CarModel | null) => {
    if (value?.id === ADD_NEW_MODEL_ID) {
      setAddModelDialogOpen(true);
      return;
    }

    onModelChange(value);
  };

  const handleDeleteModelClick = (event: MouseEvent, model: CarModel) => {
    event.stopPropagation();
    setModelToDelete(model);
  };

  const handleDeleteSuccess = () => {
    if (selectedModel?.id === modelToDelete?.id) {
      onModelChange(null);
    }
  };

  return (
    <>
      <Grid size={brandGridSize}>
        <Autocomplete
          options={sortedBrands}
          groupBy={getBrandGroup}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={selectedBrand}
          onChange={handleBrandChange}
          loading={isLoadingBrands}
          disabled={disabled}
          renderGroup={(params) => (
            <li key={params.key}>
              <Box
                sx={{
                  position: 'sticky',
                  top: '-8px',
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  backgroundColor: params.group === 'Automotriz' ? 'primary.light' : 'secondary.light',
                  color: params.group === 'Automotriz' ? 'primary.contrastText' : 'secondary.contrastText',
                }}
              >
                {params.group}
              </Box>
              <ul style={{ padding: 0 }}>{params.children}</ul>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              required={required}
              label="Marca"
              error={Boolean(brandError)}
              helperText={brandError}
            />
          )}
        />
      </Grid>
      <Grid size={modelGridSize}>
        <Autocomplete
          options={modelOptions}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={selectedModel}
          onChange={handleModelChange}
          loading={isLoadingModels}
          disabled={!selectedBrand || disabled}
          renderOption={manageModels ? (props, option) => (
            <li {...props} key={option.id}>
              {option.id === ADD_NEW_MODEL_ID ? (
                <Box sx={{ fontStyle: 'italic', color: 'primary.main' }}>{option.name}</Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span>{option.name}</span>
                  <IconButton
                    size="small"
                    onClick={(event) => handleDeleteModelClick(event, option)}
                    sx={{ ml: 1, color: 'error.main', '&:hover': { backgroundColor: 'error.light', color: 'error.contrastText' } }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </li>
          ) : undefined}
          renderInput={(params) => (
            <TextField
              {...params}
              required={required}
              label="Modelo"
              error={Boolean(modelError)}
              helperText={modelError}
            />
          )}
        />
      </Grid>
      {manageModels && selectedBrand && (
        <>
          <AddModelDialog
            open={isAddModelDialogOpen}
            onClose={() => setAddModelDialogOpen(false)}
            onSuccess={onModelChange}
            brandId={selectedBrand.id}
          />
          <DeleteModelDialog
            open={!!modelToDelete}
            onClose={() => setModelToDelete(null)}
            onSuccess={handleDeleteSuccess}
            model={modelToDelete}
            brandId={selectedBrand.id}
          />
        </>
      )}
    </>
  );
};
