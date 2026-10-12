import { describe, expect, it } from 'vitest';
import { clientSchema, phoneDigits } from './clientSchemas';

describe('teléfonos del cliente', () => {
  const base = { clientName: 'Prueba', phoneNumber: '8112345678', comments: '' };
  it('permite omitir el teléfono secundario sin alterar el principal', async () => {
    expect(await clientSchema.validate({ ...base, secondaryPhoneNumber: '' })).toMatchObject(base);
  });
  it('acepta un teléfono secundario de 10 dígitos y rechaza uno incompleto o más largo', async () => {
    expect(await clientSchema.isValid({ ...base, secondaryPhoneNumber: '81 8765 4321' })).toBe(true);
    expect(await clientSchema.isValid({ ...base, secondaryPhoneNumber: '123' })).toBe(false);
    expect(await clientSchema.isValid({ ...base, secondaryPhoneNumber: '81876543210' })).toBe(false);
  });
  it('exige exactamente 10 dígitos en el celular', async () => {
    expect(await clientSchema.isValid({ ...base, secondaryPhoneNumber: '', phoneNumber: '811234567' })).toBe(false);
    expect(await clientSchema.isValid({ ...base, secondaryPhoneNumber: '', phoneNumber: '81123456789' })).toBe(false);
    await expect(clientSchema.validate({ ...base, secondaryPhoneNumber: '', phoneNumber: '811234567' })).rejects.toThrow('El celular debe tener 10 dígitos.');
  });
  it('limpia lo que no son dígitos y corta a 10', () => {
    expect(phoneDigits('(81) 1234-5678 9')).toBe('8112345678');
    expect(phoneDigits(null)).toBe('');
  });
});
