import { describe, expect, it } from 'vitest';
import { buildWriteFields, createFormValues } from './serviceOrderFormData';
import { combinedAirPressureWarning, AIR_PRESSURE_WARNING, HEATING_WARNING, sumLineAmounts } from './serviceOrderText';
import type { ReportedFailureType, ServiceOrder } from '../../types/serviceOrder.types';

const types: ReportedFailureType[] = [
  { id: 1, code: 'RADIADOR', label: 'Radiador', displayOrder: 1, allowsFreeText: false, active: true },
  { id: 2, code: 'OTROS', label: 'Otros', displayOrder: 2, allowsFreeText: true, active: true },
];
const order: ServiceOrder = {
  id: 1, externalId: 'old-order', provisionalReference: 'OLD-1', folioSeries: 'SER',
  status: 'DRAFT', serviceDate: '2026-09-10', clientVehicleId: 1, clientId: 1, vehicleId: 1,
  compressionLeakDetected: false, subtotal: 1000, taxAmount: 160, total: 1160,
  reportedFailureSummary: 'Depósito con sarro', clientSnapshot: {}, vehicleSnapshot: {}, legalTextSnapshot: {},
  version: 1, items: [], reportedFailures: types.map((type) => ({
    id: type.id, externalId: `failure-${type.id}`, reportedFailureTypeId: type.id,
    failureCodeSnapshot: type.code, labelSnapshot: type.label, displayOrderSnapshot: type.displayOrder,
  })),
};

describe('datos del formulario de servicios', () => {
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

  it('combina la advertencia sin duplicarla en órdenes históricas', () => {
    const combined = `${AIR_PRESSURE_WARNING} ${HEATING_WARNING}`;
    expect(combinedAirPressureWarning()).toBe(combined);
    expect(combinedAirPressureWarning(HEATING_WARNING)).toBe(combined);
    expect(combinedAirPressureWarning(combined)).toBe(combined);
  });

  it('suma en centavos y distingue costo cero de costo no capturado', () => {
    expect(sumLineAmounts([{ selected: true, amount: 0.1 }, { selected: true, amount: 0.2 }])).toBe(0.3);
    expect(sumLineAmounts([{ selected: false, amount: 380 }, { selected: true, amount: 0 }])).toBe(0);
  });
});
