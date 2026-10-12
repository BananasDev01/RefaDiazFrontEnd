import { getSnapshotText, type ServiceOrder } from '../../types/serviceOrder.types';
import type { ClientVehicle } from '../../types/client.types';

export const IVA_RATE = 0.16;

export type SearchField = 'folio' | 'phone' | 'plate';
export type IvaMode = 'none' | 'auto' | 'manual';

const moneyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const formatMoney = (value: number | null | undefined) => moneyFormatter.format(Number(value ?? 0));

export const toCents = (value: number | null | undefined) => Math.round(Number(value ?? 0) * 100);

/** 16 % of a subtotal, rounded to cents like the paper format. */
export const computeIva = (subtotal: number) => Math.round(toCents(subtotal) * IVA_RATE) / 100;

/** Historical orders may carry a manual tax that is neither 0 nor 16 %; keep it until the user decides. */
export const ivaModeFor = (taxAmount: number | null | undefined, subtotal: number): IvaMode => {
  const tax = toCents(taxAmount);
  if (tax === 0) return 'none';
  return tax === toCents(computeIva(subtotal)) ? 'auto' : 'manual';
};

/** One search box: short numbers and provisional references are folios, long digit runs are phones, the rest plates. */
export const detectSearchField = (query: string): SearchField => {
  const text = query.trim();
  if (/^\d{1,6}$/.test(text) || /^(PEND|SER)\b/i.test(text)) return 'folio';
  const digits = text.replace(/[\s()+-]/g, '');
  if (/^\d{7,}$/.test(digits)) return 'phone';
  return 'plate';
};

export const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
  folio: 'folio',
  phone: 'celular',
  plate: 'placas',
};

const toLocalDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`);

export const daysSince = (value: string | null | undefined, now = new Date()) => {
  if (!value) return null;
  const start = toLocalDate(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
};

export const daysLabel = (days: number) => (days === 0 ? 'Hoy' : days === 1 ? '1 día' : `${days} días`);

export const formatShortDate = (value: string | null | undefined) => {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(toLocalDate(value));
};

/** Same folio the PDF prints: number without the internal series, else the provisional reference. */
export const folioLabel = (order: Pick<ServiceOrder, 'folioNumber' | 'provisionalReference'>) => (
  order.folioNumber ? String(order.folioNumber).padStart(4, '0') : order.provisionalReference
);

export const snapshotClientName = (order: ServiceOrder) => (
  getSnapshotText(order.clientSnapshot, 'clientName', 'client_name', 'name', 'nombre') ?? `Cliente #${order.clientId}`
);

export const snapshotPhones = (order: ServiceOrder) => [
  getSnapshotText(order.clientSnapshot, 'phoneNumber', 'phone_number', 'phone', 'telefono'),
  getSnapshotText(order.clientSnapshot, 'secondaryPhoneNumber', 'secondary_phone_number'),
].filter(Boolean).join(' · ');

export const snapshotVehicleName = (order: ServiceOrder) => [
  getSnapshotText(order.vehicleSnapshot, 'brandName', 'brand_name', 'brand', 'marca'),
  getSnapshotText(order.vehicleSnapshot, 'carModelName', 'car_model_name', 'model', 'modelName', 'modelo'),
  getSnapshotText(order.vehicleSnapshot, 'modelYear', 'model_year', 'year'),
].filter(Boolean).join(' ') || `Vehículo #${order.vehicleId}`;

export const snapshotPlate = (order: ServiceOrder) => getSnapshotText(order.vehicleSnapshot, 'plate', 'plates', 'placas');

export const workSummary = (order: ServiceOrder) => (
  order.reportedFailures.length
    ? [...order.reportedFailures]
      .sort((a, b) => a.displayOrderSnapshot - b.displayOrderSnapshot)
      .map((failure) => failure.labelSnapshot)
      .filter((label, index, labels) => labels.indexOf(label) === index)
      .join(', ')
    : order.reportedFailureSummary?.trim() || 'Sin trabajo registrado'
);

export const vehicleName = (vehicle: ClientVehicle) => (
  [vehicle.carModel?.brand?.name, vehicle.carModel?.name, vehicle.modelYear].filter(Boolean).join(' ') || 'Vehículo sin modelo'
);

export const vehicleDetails = (vehicle: ClientVehicle) => [vehicle.version, vehicle.color].filter(Boolean).join(' · ');

export const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('');

export const isSafeReturnTo = (value: string | null): value is string => (
  value !== null && /^(\/clients\/\d+|\/service-orders(?:\?[^#]*)?)$/.test(value)
);
