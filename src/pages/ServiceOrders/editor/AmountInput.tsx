import { InputAdornment, TextField } from '@mui/material';
import { useState } from 'react';
import { inputSx } from '../tokens';

interface AmountInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  label: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

const display = (value: number | null) => (value === null
  ? ''
  : new Intl.NumberFormat('es-MX', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value));

/**
 * Text input for money: keeps what the user types (e.g. "12.") while focused and
 * shows thousands separators otherwise, unlike a number input that the mouse wheel can change.
 */
export const AmountInput = ({ value, onChange, onBlur, label, error, helperText, disabled }: AmountInputProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? display(value);

  return (
    <TextField
      size="small"
      fullWidth
      value={shown}
      disabled={disabled}
      onFocus={() => setDraft(value === null ? '' : String(value))}
      onChange={(event) => {
        const text = event.target.value.replace(/[,\s$]/g, '');
        if (!/^\d*(\.\d{0,2})?$/.test(text)) return;
        setDraft(text);
        onChange(text === '' || text === '.' ? null : Number(text));
      }}
      onBlur={() => { setDraft(null); onBlur?.(); }}
      error={Boolean(error)}
      helperText={error ?? helperText}
      slotProps={{
        htmlInput: { inputMode: 'decimal', 'aria-label': label, style: { textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' } },
        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
        formHelperText: { sx: { textAlign: 'right', mx: 0 } },
      }}
      sx={inputSx}
    />
  );
};
