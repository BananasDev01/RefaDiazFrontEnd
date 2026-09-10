import { describe, expect, it } from 'vitest';
import type { ReportedFailureType, ServiceOrder } from '../../../types/serviceOrder.types';
import { mapServiceOrderToPdfData } from './serviceOrderPdfData';
import { encodeServiceOrderLine } from '../serviceOrderLineCodec';

const failureTypes: ReportedFailureType[] = [
  { id: 1, code: 'RADIADOR', label: 'Servicio radiador', displayOrder: 1, allowsFreeText: false, active: true },
  { id: 2, code: 'OTROS', label: 'Otros', displayOrder: 2, allowsFreeText: true, active: true },
];

const order: ServiceOrder = {
  id: 1,
  externalId: '21a44657-b24e-49a0-b9bd-9f5c671edffa',
  provisionalReference: 'PEND-SER-TEST',
  folioSeries: 'SER',
  folioNumber: 42,
  status: 'IN_PROGRESS',
  serviceDate: '2026-08-21',
  clientVehicleId: 1,
  clientId: 1,
  vehicleId: 1,
  authorizedWorkDescription: 'Cambio de radiador',
  compressionLeakDetected: true,
  radiatorObstructionLevel: 7,
  subtotal: 1000,
  taxAmount: 160,
  total: 1160,
  warrantyMonths: 6,
  clientSnapshot: { clientName: 'Cliente ejemplo', phoneNumber: '8185550101' },
  vehicleSnapshot: { brand: 'Ford', model: 'Lobo', modelYear: 2006, plate: 'ABC123' },
  legalTextSnapshot: { warrantyDisclaimer: 'Garantia de prueba' },
  version: 1,
  reportedFailures: [{
    id: 1,
    externalId: 'b92b3b9a-4812-4d7f-b925-5a28c39d4102',
    reportedFailureTypeId: 2,
    failureCodeSnapshot: 'OTROS',
    labelSnapshot: 'Otros',
    displayOrderSnapshot: 2,
    otherText: encodeServiceOrderLine({
      customFailure: 'Revisar deposito',
      conceptName: 'Cambio de radiador',
      amount: 1000,
      observation: 'Depósito deteriorado',
    }),
  }],
  items: [],
};

describe('mapServiceOrderToPdfData', () => {
  it('construye el formato desde snapshots sin incluir datos internos', () => {
    const result = mapServiceOrderToPdfData(order, failureTypes);

    expect(result.folio).toBe('SER-0042');
    expect(result.serviceDate).toBe('21 de agosto de 2026');
    expect(result.clientName).toBe('Cliente ejemplo');
    expect(result.brand).toBe('Ford');
    expect(result.model).toBe('Lobo');
    expect(result.failures).toEqual([
      { label: 'Servicio radiador', selected: false, detail: undefined, conceptName: '', amount: null, observation: '' },
      { label: 'Otros', selected: true, detail: 'Revisar deposito', conceptName: 'Cambio de radiador', amount: 1000, observation: 'Depósito deteriorado' },
    ]);
    expect(result.reportedFailureSummary).toBe('Revisar deposito');
    expect(result.warrantyLegalText).toBe('Garantia de prueba');
    expect(result.total).toBe(1160);
  });
});
