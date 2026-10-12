import * as yup from 'yup';
import type { ServiceOrderFormValues } from '../../types/serviceOrder.types';

const validCurrency = (value: number | null | undefined) => value == null || (
  Number.isFinite(value) && value <= 9_999_999_999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
);

export const serviceOrderSchema: yup.ObjectSchema<ServiceOrderFormValues> = yup.object({
  clientId: yup.number().nullable().required('Selecciona un cliente.'),
  clientVehicleId: yup.number().nullable().required('Selecciona el vehículo que ingresará al taller.'),
  serviceDate: yup.string().required('La fecha es obligatoria.'),
  reportedFailureSummary: yup.string().trim().max(4000).defined(),
  workManagerUserId: yup.string().defined(),
  importantInformation: yup.string().trim().max(4000).defined(),
  informationalNote: yup.string().trim().max(2000).defined(),
  compressionLeakDetected: yup.boolean().required(),
  coolingSystemAirPressureDetected: yup.boolean().required(),
  radiatorSerialNumber: yup.string().trim().max(300).defined(),
  radiatorObstructionLevel: yup
    .number()
    .nullable()
    .integer('La escala debe ser un número entero.')
    .min(0, 'El mínimo es 0.')
    .max(10, 'El máximo es 10.')
    .defined(),
  subtotal: yup
    .number()
    .nullable()
    .min(0, 'El subtotal no puede ser negativo.')
    .defined(),
  preserveLegacySubtotal: yup.boolean().required(),
  taxAmount: yup
    .number()
    .required('Captura el IVA, incluso cuando sea $0.')
    .min(0, 'El IVA no puede ser negativo.')
    .test('currency', 'Usa un importe válido con máximo dos decimales.', validCurrency),
  warrantyMonths: yup.mixed<0 | 3 | 6 | 12>().oneOf([0, 3, 6, 12]).nullable().defined(),
  internalNote: yup.string().trim().max(4000).defined(),
  reportedFailures: yup.array().of(yup.object({
    reportedFailureTypeId: yup.number().required(),
    selected: yup.boolean().required(),
    customFailure: yup.string().trim().max(80).defined(),
    amount: yup.number().nullable().min(0, 'El costo no puede ser negativo.').test('currency', 'Usa un importe válido con máximo dos decimales.', validCurrency).defined(),
    observation: yup.string().trim().max(4000).defined(),
    externalId: yup.string().optional(),
  })).required(),
});
