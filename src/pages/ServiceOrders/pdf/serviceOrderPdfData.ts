import type { ReportedFailureType, ServiceOrder } from '../../../types/serviceOrder.types';
import { getSnapshotText } from '../../../types/serviceOrder.types';

export const DEFAULT_WARRANTY_LEGAL_TEXT = 'Radiadores Díaz se obliga por esta garantía a reparar, reemplazar o cubrir únicamente el valor del producto en cuestión. En ningún caso cubrirá materiales, mano de obra o partes suministradas, ni daños incidentales o consecuenciales derivados de una garantía.';

export interface ServiceOrderPdfFailure {
  label: string;
  selected: boolean;
  detail?: string;
}

export interface ServiceOrderPdfData {
  folio: string;
  serviceDate: string;
  clientName: string;
  phoneNumber: string;
  reportedFailureSummary: string;
  brand: string;
  model: string;
  modelYear: string;
  color: string;
  plate: string;
  version: string;
  failures: ServiceOrderPdfFailure[];
  authorizedWorkDescription: string;
  vehicleOperationObservations: string;
  importantInformation: string;
  informationalNote: string;
  compressionLeakDetected: boolean;
  coolingSystemAirPressureDetected: boolean;
  radiatorSerialNumber: string;
  radiatorObstructionLevel: number | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  warrantyMonths: number | null;
  workManagerName: string;
  warrantyLegalText: string;
}

const asRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const nestedSnapshotText = (
  snapshot: Record<string, unknown> | null | undefined,
  nestedKey: string,
  ...keys: string[]
) => {
  if (!snapshot) return null;
  const nested = asRecord(snapshot[nestedKey]);
  return nested ? getSnapshotText(nested, ...keys) : null;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  const monthNames = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const monthName = monthNames[Number(month) - 1];
  return year && monthName && day ? `${Number(day)} de ${monthName} de ${year}` : value;
};

const getWarrantyText = (order: ServiceOrder) => {
  const snapshot = order.legalTextSnapshot;
  if (!snapshot) return DEFAULT_WARRANTY_LEGAL_TEXT;
  return getSnapshotText(
    snapshot,
    'warrantyDisclaimer',
    'warranty_disclaimer',
    'warrantyLegalText',
    'warranty_legal_text'
  ) ?? DEFAULT_WARRANTY_LEGAL_TEXT;
};

const getWorkManagerName = (order: ServiceOrder) => {
  const snapshot = asRecord(order.workManagerSnapshot);
  if (!snapshot) return '';
  const directName = getSnapshotText(snapshot, 'fullName', 'full_name', 'name', 'displayName');
  if (directName) return directName;

  const person = asRecord(snapshot.person);
  if (!person) return '';
  return [
    getSnapshotText(person, 'name', 'firstName', 'first_name'),
    getSnapshotText(person, 'lastName', 'last_name'),
  ].filter(Boolean).join(' ');
};

const getAuthorizedWork = (order: ServiceOrder) => {
  if (order.authorizedWorkDescription?.trim()) {
    return order.authorizedWorkDescription.trim();
  }

  return [...order.items]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((item) => {
      const quantity = item.quantity === 1 ? '' : `${item.quantity} x `;
      return `${quantity}${item.descriptionSnapshot}`;
    })
    .join('\n');
};

export const mapServiceOrderToPdfData = (
  order: ServiceOrder,
  failureTypes: ReportedFailureType[]
): ServiceOrderPdfData => {
  const vehicle = order.vehicleSnapshot;
  const selectedFailures = new Map(
    order.reportedFailures.map((failure) => [failure.reportedFailureTypeId, failure])
  );
  const failures = [...failureTypes]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((failureType) => {
      const selected = selectedFailures.get(failureType.id);
      return {
        label: failureType.label,
        selected: Boolean(selected),
        detail: selected?.otherText,
      };
    });

  const knownTypeIds = new Set(failureTypes.map((failureType) => failureType.id));
  order.reportedFailures
    .filter((failure) => !knownTypeIds.has(failure.reportedFailureTypeId))
    .sort((a, b) => a.displayOrderSnapshot - b.displayOrderSnapshot)
    .forEach((failure) => {
      failures.push({
        label: failure.labelSnapshot,
        selected: true,
        detail: failure.otherText,
      });
    });

  const selectedFailureSummary = failures
    .filter((failure) => failure.selected)
    .map((failure) => failure.detail || failure.label)
    .join(', ');

  return {
    folio: order.folioNumber
      ? `${order.folioSeries}-${String(order.folioNumber).padStart(4, '0')}`
      : order.provisionalReference,
    serviceDate: formatDate(order.serviceDate),
    clientName: getSnapshotText(order.clientSnapshot, 'clientName', 'client_name', 'name', 'nombre') ?? '',
    phoneNumber: getSnapshotText(order.clientSnapshot, 'phoneNumber', 'phone_number', 'phone', 'telefono') ?? '',
    reportedFailureSummary: order.reportedFailureSummary?.trim() || selectedFailureSummary,
    brand: getSnapshotText(vehicle, 'brand', 'brandName', 'brand_name', 'marca')
      ?? nestedSnapshotText(vehicle, 'carModel', 'brandName', 'brand_name')
      ?? nestedSnapshotText(asRecord(vehicle.carModel), 'brand', 'name')
      ?? '',
    model: getSnapshotText(vehicle, 'model', 'modelName', 'model_name', 'modelo')
      ?? nestedSnapshotText(vehicle, 'carModel', 'name', 'modelName')
      ?? '',
    modelYear: getSnapshotText(vehicle, 'modelYear', 'model_year', 'year', 'anio') ?? '',
    color: getSnapshotText(vehicle, 'color') ?? '',
    plate: getSnapshotText(vehicle, 'plate', 'plates', 'placas') ?? '',
    version: getSnapshotText(vehicle, 'version') ?? '',
    failures,
    authorizedWorkDescription: getAuthorizedWork(order),
    vehicleOperationObservations: order.vehicleOperationObservations?.trim() ?? '',
    importantInformation: order.importantInformation?.trim() ?? '',
    informationalNote: order.informationalNote?.trim() ?? '',
    compressionLeakDetected: Boolean(order.compressionLeakDetected),
    coolingSystemAirPressureDetected: Boolean(order.coolingSystemAirPressureDetected),
    radiatorSerialNumber: order.radiatorSerialNumber?.trim() ?? '',
    radiatorObstructionLevel: order.radiatorObstructionLevel ?? null,
    subtotal: Number(order.subtotal ?? 0),
    taxAmount: Number(order.taxAmount ?? 0),
    total: Number(order.total ?? 0),
    warrantyMonths: order.warrantyMonths ?? null,
    workManagerName: getWorkManagerName(order),
    warrantyLegalText: getWarrantyText(order),
  };
};
