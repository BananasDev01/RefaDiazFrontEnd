import { v4 as uuidv4 } from 'uuid';
import type { ReportedFailureType, ServiceOrder, ServiceOrderFormValues } from '../../types/serviceOrder.types';
import { decodeServiceOrderLine, encodeServiceOrderLine } from './serviceOrderLineCodec';
import { combinedAirPressureWarning, mergeObservations, sumLineAmounts } from './serviceOrderText';

const WARRANTY_LEGAL_TEXT = 'Radiadores Díaz se obliga por esta garantía a reparar, reemplazar o cubrir únicamente el valor del producto en cuestión. En ningún caso cubrirá materiales, mano de obra o partes suministradas, ni daños incidentales o consecuenciales derivados de una garantía.';
const localDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const nullableText = (value: string) => value.trim() || undefined;

export const createFormValues = (
  failureTypes: ReportedFailureType[],
  order?: ServiceOrder,
  initialClientId?: number | null
): ServiceOrderFormValues => {
  const selectedFailures = order?.reportedFailures ?? [];
  const hasStructuredLines = selectedFailures.some((failure) => (
    decodeServiceOrderLine(failure.otherText).structured
  ));
  const legacyTargetId = hasStructuredLines ? null : selectedFailures[0]?.reportedFailureTypeId ?? null;

  return {
  clientId: order?.clientId ?? initialClientId ?? null,
  clientVehicleId: order?.clientVehicleId ?? null,
  serviceDate: order?.serviceDate ?? localDate(),
  reportedFailureSummary: order?.reportedFailureSummary ?? '',
  workManagerUserId: order?.workManagerUserId ?? '',
  importantInformation: mergeObservations(order?.importantInformation,
    selectedFailures.length === 0 ? order?.authorizedWorkDescription : '',
    selectedFailures.length === 0 ? order?.vehicleOperationObservations : ''),
  informationalNote: combinedAirPressureWarning(order?.informationalNote),
  compressionLeakDetected: order?.compressionLeakDetected ?? false,
  coolingSystemAirPressureDetected: order?.coolingSystemAirPressureDetected ?? false,
  radiatorSerialNumber: order?.radiatorSerialNumber ?? '',
  radiatorObstructionLevel: order?.radiatorObstructionLevel ?? null,
  subtotal: order?.subtotal ?? null,
  preserveLegacySubtotal: Boolean(order && !hasStructuredLines && selectedFailures.length !== 1 && order.subtotal !== null && order.subtotal !== undefined),
  taxAmount: order?.taxAmount ?? 0,
  warrantyMonths: order?.warrantyMonths ?? null,
  internalNote: '',
  reportedFailures: failureTypes.map((type) => {
    const selected = order?.reportedFailures.find(
      (failure) => failure.reportedFailureTypeId === type.id
    );
    const decoded = decodeServiceOrderLine(selected?.otherText);
    const receivesLegacyFields = selected && type.id === legacyTargetId;
    return {
      reportedFailureTypeId: type.id,
      selected: Boolean(selected),
      customFailure: type.allowsFreeText ? decoded.customFailure : '',
      amount: decoded.amount ?? (
        receivesLegacyFields && selectedFailures.length === 1 && order?.subtotal !== undefined
          ? order.subtotal
          : null
      ),
      observation: mergeObservations(decoded.conceptName, decoded.observation, receivesLegacyFields ? order?.authorizedWorkDescription : '', receivesLegacyFields ? order?.vehicleOperationObservations : ''),
      externalId: selected?.externalId,
    };
  }),
  };
};

export const buildWriteFields = (values: ServiceOrderFormValues, failureTypes: ReportedFailureType[]) => {
  const selectedFailures = values.reportedFailures.filter((failure) => failure.selected);
  const failuresById = new Map(failureTypes.map((type) => [type.id, type]));
  const lineSubtotal = sumLineAmounts(selectedFailures);
  const vehicleOperationObservations = selectedFailures
    .filter((failure) => failure.observation.trim())
    .map((failure) => {
      const label = failuresById.get(failure.reportedFailureTypeId)?.label ?? 'Concepto';
      return `${label}: ${failure.observation.trim()}`;
    })
    .join('\n');

  return {
  clientVehicleId: values.clientVehicleId as number,
  serviceDate: values.serviceDate,
  reportedFailureSummary: values.reportedFailureSummary.trim(),
  workManagerUserId: nullableText(values.workManagerUserId),
  authorizedWorkDescription: '',
  vehicleOperationObservations: nullableText(vehicleOperationObservations),
  importantInformation: nullableText(values.importantInformation),
  informationalNote: nullableText(values.informationalNote),
  compressionLeakDetected: values.compressionLeakDetected,
  coolingSystemAirPressureDetected: values.coolingSystemAirPressureDetected,
  radiatorSerialNumber: nullableText(values.radiatorSerialNumber),
  radiatorObstructionLevel: values.radiatorObstructionLevel ?? undefined,
  subtotal: values.preserveLegacySubtotal ? values.subtotal ?? 0 : lineSubtotal,
  taxAmount: values.taxAmount,
  warrantyMonths: values.warrantyMonths ?? undefined,
  legalTextSnapshot: { warrantyDisclaimer: WARRANTY_LEGAL_TEXT },
  reportedFailures: selectedFailures
    .map((failure) => ({
      externalId: failure.externalId ?? uuidv4(),
      reportedFailureTypeId: failure.reportedFailureTypeId,
      otherText: encodeServiceOrderLine({ ...failure, conceptName: '' }),
    })),
  internalNotes: values.internalNote.trim()
    ? [{ externalId: uuidv4(), note: values.internalNote.trim() }]
    : [],
  };
};
