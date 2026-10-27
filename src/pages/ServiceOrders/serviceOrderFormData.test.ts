import { describe, expect, it } from 'vitest';
import { buildWriteFields, createFormValues } from './serviceOrderFormData';
import { AIR_PRESSURE_WARNING, sumLineAmounts } from './serviceOrderText';
import type { ReportedFailureType, ServiceOrder } from '../../types/serviceOrder.types';

const types: ReportedFailureType[] = [
  { id: 1, code: 'RADIADOR', label: 'Radiador', displayOrder: 1, allowsFreeText: false, active: true },
  { id: 2, code: 'OTROS', label: 'Otros', displayOrder: 2, allowsFreeText: true, active: true },
];
const order: ServiceOrder = {
  id: 1, externalId: 'old-order', provisionalReference: 'OLD-1', folioSeries: 'SER',
  status: 'IN_PROGRESS', category: 'VEHICLE', serviceDate: '2026-09-10', clientVehicleId: 1, clientId: 1, vehicleId: 1,
  compressionLeakDetected: false, subtotal: 1000, taxAmount: 160, total: 1160,
  reportedFailureSummary: 'Depósito con sarro', clientSnapshot: {}, vehicleSnapshot: {}, legalTextSnapshot: {},
  version: 1, items: [], reportedFailures: types.map((type) => ({
    id: type.id, externalId: `failure-${type.id}`, reportedFailureTypeId: type.id,
    failureCodeSnapshot: type.code, labelSnapshot: type.label, displayOrderSnapshot: type.displayOrder,
  })),
};

describe('datos del formulario de servicios', () => {
  it('envía obstrucción cero por defecto y conserva la garantía para el PDF', () => {
    const values = createFormValues(types);
    expect(values.radiatorObstructionLevel).toBe(0);
    expect(buildWriteFields(values, types)).toMatchObject({
      radiatorObstructionLevel: 0,
      legalTextSnapshot: { warrantyDisclaimer: expect.stringContaining('Radiadores Díaz se obliga') },
    });
    expect(createFormValues(types, { ...order, radiatorObstructionLevel: 6 }).radiatorObstructionLevel).toBe(6);
  });

  it('guarda importe y observación en campos propios, nunca en otherText de tipos estándar', () => {
    const values = createFormValues(types, order);
    values.preserveLegacySubtotal = false;
    values.reportedFailures[0].amount = 3800;
    values.reportedFailures[0].observation = ' Servicio preventivo ';
    values.reportedFailures[0].customFailure = 'Texto residual';
    values.reportedFailures[1].amount = 1800;
    values.reportedFailures[1].customFailure = 'Tubo de bomba';
    const payload = buildWriteFields(values, types);
    expect(payload.lineTotalsMode).toBe('LINES');
    expect(payload.subtotal).toBe(5600);
    expect(payload.reportedFailures?.[0]).toMatchObject({ amount: 3800, observation: 'Servicio preventivo' });
    expect(payload.reportedFailures?.[0].otherText).toBeUndefined();
    expect(payload.reportedFailures?.[1].otherText).toBe('Tubo de bomba');
  });

  it('recupera filas nativas sin redistribuir subtotales ni duplicar observaciones agregadas', () => {
    const values = createFormValues(types, {
      ...order, lineTotalsMode: 'LINES',
      vehicleOperationObservations: 'Resumen que no debe duplicarse',
      reportedFailures: order.reportedFailures.map((row, i) => ({ ...row, amount: i === 0 ? 0 : null, observation: 'Circula' })),
    });
    expect(values.preserveLegacySubtotal).toBe(false);
    expect(values.reportedFailures.map(({ amount }) => amount)).toEqual([0, null]);
    expect(values.reportedFailures[0].observation).toBe('Circula');
    expect(buildWriteFields(values, types).subtotal).toBe(0);
  });

  it('conserva el subtotal global de una orden LEGACY nativa al volver a guardarla', () => {
    const values = createFormValues(types, { ...order, lineTotalsMode: 'LEGACY' });
    expect(values.preserveLegacySubtotal).toBe(true);
    expect(values.reportedFailures.every(({ amount }) => amount === null)).toBe(true);
    expect(buildWriteFields(values, types)).toMatchObject({ subtotal: 1000, lineTotalsMode: 'LEGACY' });
  });

  it('conserva la falla general al leer y escribir', () => {
    const values = createFormValues(types, order);
    expect(values.reportedFailureSummary).toBe('Depósito con sarro');
    expect(buildWriteFields(values, types).reportedFailureSummary).toBe('Depósito con sarro');
  });

  it('preserva subtotal histórico hasta cambiar los costos y no lo restaura al borrar importes', () => {
    const values = createFormValues(types, order);
    expect(values.preserveLegacySubtotal).toBe(true);
    expect(buildWriteFields(values, types).subtotal).toBe(1000);
    values.preserveLegacySubtotal = false;
    values.reportedFailures[0].amount = 500;
    expect(buildWriteFields(values, types).subtotal).toBe(500);
    values.reportedFailures[0].amount = null;
    expect(buildWriteFields(values, types).subtotal).toBe(0);
  });

  it('mueve los conceptos del prototipo a observaciones sin perder texto', () => {
    const values = createFormValues(types, {
      ...order,
      reportedFailures: [{ ...order.reportedFailures[0], otherText: 'RDROW1:{"c":"Tapón nuevo","a":380,"o":"El anterior no sella"}' }],
    });
    expect(values.reportedFailures[0].observation).toBe('Tapón nuevo\nEl anterior no sella');
    expect(values.reportedFailures[0].amount).toBe(380);
    expect(values.preserveLegacySubtotal).toBe(false);
  });

  it('las órdenes históricas toman la leyenda vigente de presión de aire', () => {
    expect(createFormValues(types, { ...order, informationalNote: 'Texto anterior' }).informationalNote).toBe(AIR_PRESSURE_WARNING);
  });

  it('suma en centavos y distingue costo cero de costo no capturado', () => {
    expect(sumLineAmounts([{ selected: true, amount: 0.1 }, { selected: true, amount: 0.2 }])).toBe(0.3);
    expect(sumLineAmounts([{ selected: false, amount: 380 }, { selected: true, amount: 0 }])).toBe(0);
  });
});
