import * as yup from 'yup';
import type {
  ClientFormValues,
  ClientVehicleFormValues,
} from '../../types/client.types';

const currentYear = new Date().getFullYear();

export const PHONE_DIGITS = 10;
/** Keeps only digits, capped at a 10-digit Mexican phone number. */
export const phoneDigits = (value?: string | null) => (value ?? '').replace(/\D/g, '').slice(0, PHONE_DIGITS);
/** Same normalization as the backend: uppercase letters and digits only. */
export const normalizePlate = (value?: string | null) => (value ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
/** Placeholders many vehicles may share: no plates, and the legacy «A LA MANO» of older records. */
export const REPEATABLE_PLATES = ['SINPLACAS', 'ALAMANO'];
export const isRepeatablePlate = (value?: string | null) => REPEATABLE_PLATES.includes(normalizePlate(value));

const hasTenDigits = (value?: string | null) => (value ?? '').replace(/\D/g, '').length === PHONE_DIGITS;

export const clientSchema: yup.ObjectSchema<ClientFormValues> = yup.object({
  clientName: yup
    .string()
    .trim()
    .required('El nombre del cliente es obligatorio.')
    .max(300, 'El nombre no puede exceder 300 caracteres.'),
  phoneNumber: yup
    .string()
    .trim()
    .required('El celular es obligatorio.')
    .test('phone-digits', 'El celular debe tener 10 dígitos.', hasTenDigits),
  comments: yup
    .string()
    .trim()
    .max(500, 'Los comentarios no pueden exceder 500 caracteres.')
    .defined(),
  secondaryPhoneNumber: yup
    .string()
    .trim()
    .defined()
    .test('secondary-phone', 'El teléfono secundario debe tener 10 dígitos.', (value) => !value || hasTenDigits(value)),
});

export const clientVehicleSchema: yup.ObjectSchema<ClientVehicleFormValues> = yup.object({
  brandId: yup.number().nullable().required('Selecciona la marca.'),
  carModelId: yup.number().nullable().required('Selecciona el modelo.'),
  modelYear: yup
    .number()
    .nullable()
    .required('Captura el año del vehículo.')
    .integer('El año debe ser un número entero.')
    .min(1886, 'El año no puede ser anterior a 1886.')
    .max(currentYear + 1, `El año no puede ser mayor a ${currentYear + 1}.`),
  version: yup.string().trim().max(300).defined(),
  color: yup.string().trim().max(300).defined(),
  plate: yup
    .string()
    .trim()
    .required('Captura las placas; usa «SIN PLACAS» si no tiene.')
    .max(20, 'Las placas no pueden exceder 20 caracteres.'),
  comments: yup.string().trim().max(700).defined(),
});
