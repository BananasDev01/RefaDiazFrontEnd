import * as yup from 'yup';
import type {
  ClientFormValues,
  ClientVehicleFormValues,
} from '../../types/client.types';

const currentYear = new Date().getFullYear();

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
    .test('phone-digits', 'Captura un teléfono de 10 a 15 dígitos.', (value) => {
      const digits = value?.replace(/\D/g, '') ?? '';
      return digits.length >= 10 && digits.length <= 15;
    }),
  comments: yup
    .string()
    .trim()
    .max(500, 'Los comentarios no pueden exceder 500 caracteres.')
    .defined(),
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
  plate: yup.string().trim().max(20).defined(),
  comments: yup.string().trim().max(700).defined(),
});
