import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Box, ButtonBase, Checkbox, Collapse, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { memo, useId, useState } from 'react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { ServiceOrderFormValues } from '../../../types/serviceOrder.types';
import { combinedAirPressureWarning, COMPRESSION_WARNING } from '../serviceOrderText';
import { FieldLabel, SectionCard } from '../ui';
import { inputSx, tone } from '../tokens';
import { ImportantNoteField } from './ImportantNoteField';

const levels = Array.from({ length: 11 }, (_, level) => level);

const WarningToggle = ({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled: boolean }) => (
  <Box
    component="label"
    sx={{
      display: 'flex',
      gap: 1.25,
      alignItems: 'flex-start',
      p: 1.25,
      borderRadius: 2,
      border: 1,
      cursor: disabled ? 'default' : 'pointer',
      fontSize: 14,
      ...(checked
        ? { bgcolor: tone.dangerTint, borderColor: tone.dangerBorder, color: tone.dangerInk, fontWeight: 500 }
        : { bgcolor: tone.card, borderColor: tone.border, color: tone.muted }),
    }}
  >
    <Checkbox checked={checked} disabled={disabled} onChange={(_, value) => onChange(value)} sx={{ p: 0, mt: '1px', color: tone.borderStrong, '&.Mui-checked': { color: tone.danger } }} />
    <span>{label}</span>
  </Box>
);

export const ConditionsSection = memo(({ readOnly }: { readOnly: boolean }) => {
  const { control, getValues } = useFormContext<ServiceOrderFormValues>();
  const { errors } = useFormState({ control, name: ['radiatorSerialNumber', 'importantInformation', 'internalNote'] });
  const informationalNote = useWatch({ control, name: 'informationalNote' });
  // Read once: watching the private note would re-render the section on every keystroke.
  const [privateOpen, setPrivateOpen] = useState(() => Boolean(getValues('internalNote')));
  const levelLabelId = useId();
  const privateId = useId();

  return (
    <SectionCard id="so-condiciones" title="Condiciones del vehículo">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <FieldLabel>Advertencias para el cliente</FieldLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Controller
                name="compressionLeakDetected"
                control={control}
                render={({ field }) => <WarningToggle checked={field.value} onChange={field.onChange} label={COMPRESSION_WARNING} disabled={readOnly} />}
              />
              <Controller
                name="coolingSystemAirPressureDetected"
                control={control}
                render={({ field }) => <WarningToggle checked={field.value} onChange={field.onChange} label={combinedAirPressureWarning(informationalNote)} disabled={readOnly} />}
              />
            </Box>
          </Box>
          <Controller
            name="radiatorSerialNumber"
            control={control}
            render={({ field }) => (
              <Box>
                <FieldLabel htmlFor="so-serial">Número o serie del radiador</FieldLabel>
                <TextField {...field} id="so-serial" size="small" fullWidth disabled={readOnly} error={Boolean(errors.radiatorSerialNumber)} helperText={errors.radiatorSerialNumber?.message} sx={inputSx} />
              </Box>
            )}
          />
          <Controller
            name="radiatorObstructionLevel"
            control={control}
            render={({ field }) => {
              const current = field.value ?? 0;
              return (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <FieldLabel id={levelLabelId}>Radiador tapado</FieldLabel>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: tone.ink }}>{current} de 10</Typography>
                  </Box>
                  <ToggleButtonGroup
                    exclusive
                    value={current}
                    disabled={readOnly}
                    aria-labelledby={levelLabelId}
                    onChange={(_, value: number | null) => { if (value !== null) field.onChange(value); }}
                    sx={{ display: 'grid', gridTemplateColumns: 'repeat(11, minmax(0, 1fr))', gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 1, borderRadius: '6px !important', m: 0 } }}
                  >
                    {levels.map((level) => (
                      <ToggleButton
                        key={level}
                        value={level}
                        aria-label={`${level} de 10`}
                        sx={{
                          height: 36,
                          p: 0,
                          fontWeight: 500,
                          fontVariantNumeric: 'tabular-nums',
                          color: tone.muted,
                          borderColor: `${tone.borderStrong} !important`,
                          bgcolor: level <= current ? '#DCE6F6' : tone.card,
                          '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tone.primary, color: '#FFFFFF', borderColor: `${tone.primary} !important` },
                        }}
                      >
                        {level}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: tone.faint, mt: 0.5 }}><span>Libre</span><span>Tapado</span></Box>
                </Box>
              );
            }}
          />
        </Box>
        <Controller
          name="importantInformation"
          control={control}
          render={({ field }) => (
            <ImportantNoteField value={field.value} onChange={field.onChange} onBlur={field.onBlur} disabled={readOnly} error={errors.importantInformation?.message} />
          )}
        />
      </Box>

      {!readOnly && (
        <Box sx={{ mt: 2.25, border: '1px dashed #B8C1CE', borderRadius: 2.5, bgcolor: '#F8F9FB' }}>
          <ButtonBase
            aria-expanded={privateOpen}
            aria-controls={privateId}
            onClick={() => setPrivateOpen((open) => !open)}
            sx={{ width: '100%', justifyContent: 'flex-start', gap: 1, px: 2, py: 1.5, color: tone.muted, fontWeight: 500, fontSize: 14, borderRadius: 2.5 }}
          >
            <LockOutlinedIcon fontSize="small" />
            <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>Nota privada del taller · no se imprime</Box>
            <ExpandMoreIcon fontSize="small" sx={{ transform: privateOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} />
          </ButtonBase>
          <Collapse in={privateOpen} id={privateId}>
            <Box sx={{ px: 2, pb: 1.75 }}>
              <Controller
                name="internalNote"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth multiline minRows={2} size="small" placeholder="Solo la verá el personal; nunca aparece en el PDF." slotProps={{ htmlInput: { 'aria-label': 'Nota privada del taller' } }} error={Boolean(errors.internalNote)} helperText={errors.internalNote?.message ?? 'Se agrega al historial interno de la orden al guardar.'} sx={inputSx} />
                )}
              />
            </Box>
          </Collapse>
        </Box>
      )}
    </SectionCard>
  );
});
ConditionsSection.displayName = 'ConditionsSection';
