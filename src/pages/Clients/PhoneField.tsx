import { TextField, type TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';
import { PHONE_DIGITS, phoneDigits } from './clientSchemas';

type PhoneFieldProps = Omit<TextFieldProps, 'onChange' | 'value' | 'type'> & {
  value: string;
  onChange: (value: string) => void;
};

/** Mexican phone input: digits only, at most 10, with the numeric keypad on touch devices. */
export const PhoneField = forwardRef<HTMLDivElement, PhoneFieldProps>(({ value, onChange, helperText, error, slotProps, ...props }, ref) => {
  const digits = phoneDigits(value);
  const partial = digits.length > 0 && digits.length < PHONE_DIGITS;
  return (
    <TextField
      {...props}
      ref={ref}
      type="tel"
      value={digits}
      onChange={(event) => onChange(phoneDigits(event.target.value))}
      error={error}
      helperText={helperText ?? (partial ? `${digits.length} de ${PHONE_DIGITS} dígitos` : undefined)}
      slotProps={{
        ...slotProps,
        htmlInput: { inputMode: 'numeric', autoComplete: 'tel', maxLength: PHONE_DIGITS, pattern: '[0-9]*', ...(slotProps?.htmlInput as object | undefined) },
      }}
    />
  );
});
PhoneField.displayName = 'PhoneField';
