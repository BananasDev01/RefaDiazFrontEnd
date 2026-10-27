import type { components, operations } from '../api/refadiaz-api';

export type ServiceOrderStatus = components['schemas']['ServiceStatus'];
export type ServiceOrderCategory = components['schemas']['ServiceCategory'];
export type ServiceOrder = components['schemas']['ServiceResponse'];
export type ServiceOrderListResponse = components['schemas']['ServiceListResponse'];
export type ServiceOrderCreateRequest = components['schemas']['ServiceCreateRequest'];
export type ServiceOrderUpdateRequest = components['schemas']['ServiceUpdateRequest'];
export type ReportedFailureType = components['schemas']['ReportedFailureType'];
export type WarrantyMonths = components['schemas']['WarrantyMonths'];
export type ServiceOrderSearchParams = NonNullable<
  operations['searchServices']['parameters']['query']
>;

export interface ServiceOrderFailureFormValue {
  reportedFailureTypeId: number;
  selected: boolean;
  customFailure: string;
  amount: number | null;
  observation: string;
  externalId?: string;
}

export interface ServiceOrderFormValues {
  category: ServiceOrderCategory;
  clientId: number | null;
  clientVehicleId: number | null;
  partDescription: string;
  serviceDate: string;
  reportedFailureSummary: string;
  workManagerUserId: string;
  importantInformation: string;
  informationalNote: string;
  compressionLeakDetected: boolean;
  coolingSystemAirPressureDetected: boolean;
  radiatorSerialNumber: string;
  radiatorObstructionLevel: number | null;
  subtotal: number | null;
  preserveLegacySubtotal: boolean;
  taxAmount: number;
  warrantyMonths: WarrantyMonths | null;
  internalNote: string;
  reportedFailures: ServiceOrderFailureFormValue[];
}

export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  // Deleted orders are hidden from lists; the record stays for the folio trail.
  CANCELLED: 'Eliminada',
};

export const SERVICE_ORDER_CATEGORY_LABELS: Record<ServiceOrderCategory, string> = {
  VEHICLE: 'Vehículo',
  PART: 'Pieza',
};

export const getSnapshotText = (
  snapshot: Record<string, unknown>,
  ...keys: string[]
): string | null => {
  for (const key of keys) {
    const value = snapshot[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }

  return null;
};
