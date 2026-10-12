import { renderToFile } from '@react-pdf/renderer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ServiceOrderPdfDocument } from '../src/pages/ServiceOrders/pdf/ServiceOrderPdfDocument';
import { mapServiceOrderToPdfData } from '../src/pages/ServiceOrders/pdf/serviceOrderPdfData';
import type { ReportedFailureType, ServiceOrder } from '../src/types/serviceOrder.types';
import { encodeServiceOrderLine } from '../src/pages/ServiceOrders/serviceOrderLineCodec';
import { decodeServiceOrderLine } from '../src/pages/ServiceOrders/serviceOrderLineCodec';
import { buildWriteFields, createFormValues } from '../src/pages/ServiceOrders/serviceOrderFormData';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stressRows = process.argv.includes('--stress-rows');
const twoOtherRows = process.argv.includes('--two-other-rows');
const stressTest = process.argv.includes('--stress') || stressRows;
const outputDirectory = stressTest ? path.join(root, 'tmp', 'pdfs', 'stress-feedback') : path.join(root, 'output', 'pdf');
const outputPath = path.join(outputDirectory, twoOtherRows ? 'orden-servicio-ejemplo-dos-otros.pdf' : 'orden-servicio-ejemplo.pdf');

const failureTypes: ReportedFailureType[] = [
  { id: 1, code: 'SERVICIO_RADIADOR', label: 'Servicio radiador', displayOrder: 1, allowsFreeText: false, active: true },
  { id: 2, code: 'LAVADO_SISTEMA', label: 'Servicio y lavado de sistema', displayOrder: 2, allowsFreeText: false, active: true },
  { id: 3, code: 'RADIADOR_NUEVO', label: 'Radiador nuevo', displayOrder: 3, allowsFreeText: false, active: true },
  { id: 4, code: 'RADIADOR_RECONSTRUIDO', label: 'Radiador reconstruido', displayOrder: 4, allowsFreeText: false, active: true },
  { id: 5, code: 'REPARACION', label: 'Reparacion', displayOrder: 5, allowsFreeText: false, active: true },
  { id: 6, code: 'BOMBA_AGUA', label: 'Bomba de agua', displayOrder: 6, allowsFreeText: false, active: true },
  { id: 7, code: 'ABANICO', label: 'Abanico de clutch o electrico', displayOrder: 7, allowsFreeText: false, active: true },
  { id: 8, code: 'TERMOSTATO', label: 'Termostato', displayOrder: 8, allowsFreeText: false, active: true },
  { id: 9, code: 'TAPON', label: 'Tapon', displayOrder: 9, allowsFreeText: false, active: true },
  { id: 10, code: 'MANGUERAS', label: 'Mangueras', displayOrder: 10, allowsFreeText: false, active: true },
  { id: 11, code: 'SENSOR', label: 'Bulbo, sensor o relevador', displayOrder: 11, allowsFreeText: false, active: true },
  { id: 12, code: 'ANTICONGELANTE', label: 'Anticongelante', displayOrder: 12, allowsFreeText: false, active: true },
  { id: 13, code: 'OTROS', label: 'Otros', displayOrder: 13, allowsFreeText: true, active: true },
];

const order: ServiceOrder = {
  id: 1,
  externalId: '1f0e1b39-b8b9-4589-a116-8292f5c3cdea',
  provisionalReference: 'PEND-SER-EJEMPLO',
  folioSeries: 'SER',
  folioNumber: 4869,
  status: 'IN_PROGRESS',
  serviceDate: '2026-08-21',
  clientVehicleId: 11,
  clientId: 1,
  vehicleId: 101,
  reportedFailureSummary: 'Cambio de tapon y revision del sistema de enfriamiento.',
  authorizedWorkDescription: 'Cambio de tapon y revision completa del sistema.\nRevisar mangueras y funcionamiento del abanico.',
  vehicleOperationObservations: 'Mantenimiento completo recomendado. Revisar si vuelve a presentar temperatura alta. El tapon anterior no sella correctamente.',
  importantInformation: '• Clima no funciona.\n• __Foco de motor encendido.__\n• ==Unidad a prueba: revisar con mecánico si presenta calentamiento.==',
  informationalNote: 'Si aun con el mantenimiento vuelve a presentar calentamiento o gorgoteo en el recuperador, revisar con un mecanico fuga de compresion.',
  compressionLeakDetected: true,
  coolingSystemAirPressureDetected: false,
  radiatorSerialNumber: '22553',
  radiatorObstructionLevel: 6,
  subtotal: 3800,
  taxAmount: 608,
  total: 4408,
  warrantyMonths: 6,
  clientSnapshot: { clientName: 'Pedro Antonio Felix', phoneNumber: '8125049511', secondaryPhoneNumber: '8112345678' },
  vehicleSnapshot: { brand: 'Nissan', model: 'Pathfinder', modelYear: 2006, color: 'Gris', plate: 'RKU483B', version: 'SE' },
  workManagerSnapshot: { fullName: 'Eduardo Garcia' },
  legalTextSnapshot: {
    warrantyDisclaimer: 'Radiadores Diaz se obliga por esta garantia a reparar, reemplazar o cubrir unicamente el valor del producto en cuestion. En ningun caso cubrira materiales, mano de obra o partes suministradas, ni danos incidentales o consecuenciales derivados de una garantia.',
  },
  version: 1,
  reportedFailures: [
    {
      id: 1,
      externalId: '60edb6f2-0426-4dff-921d-3e1543bb3d31',
      reportedFailureTypeId: 7,
      failureCodeSnapshot: 'ABANICO',
      labelSnapshot: 'Abanico de clutch o electrico',
      displayOrderSnapshot: 7,
      otherText: encodeServiceOrderLine({ customFailure: '', conceptName: 'Revisión de abanico', amount: 250, observation: 'Pendiente revisar funcionamiento eléctrico.' }),
    },
    {
      id: 2,
      externalId: '7bc97afd-3758-45af-979b-dba2f51af432',
      reportedFailureTypeId: 9,
      failureCodeSnapshot: 'TAPON',
      labelSnapshot: 'Tapon',
      displayOrderSnapshot: 9,
      otherText: encodeServiceOrderLine({ customFailure: '', conceptName: 'Tapón nuevo del cliente', amount: 0, observation: 'El tapón anterior no sella correctamente.' }),
    },
    {
      id: 3,
      externalId: '37df4ef1-255c-4914-ae15-6780d33d2852',
      reportedFailureTypeId: 12,
      failureCodeSnapshot: 'ANTICONGELANTE',
      labelSnapshot: 'Anticongelante',
      displayOrderSnapshot: 12,
      otherText: encodeServiceOrderLine({ customFailure: '', conceptName: 'Servicio completo y anticongelante', amount: 3550, observation: 'Mantenimiento completo recomendado.' }),
    },
  ],
  items: [],
};

if (stressTest) order.importantInformation = Array.from({ length: 32 }, (_, i) => `${i + 1}. ==Observación de prueba ${i + 1}==: revisar mangueras, temperatura y presión. __Confirmar con el cliente antes de reparar.__`).join('\n');
if (stressRows) {
  order.reportedFailures.push(...Array.from({ length: 24 }, (_, i) => ({
    id: 100 + i,
    reportedFailureTypeId: 13,
    failureCodeSnapshot: 'OTROS',
    labelSnapshot: 'Otros',
    displayOrderSnapshot: 13,
    otherText: encodeServiceOrderLine({ customFailure: '', conceptName: '', amount: 100,
      observation: `Renglón adicional ${i + 1}: revisión de manguera y conexiones. Confirmar funcionamiento después del mantenimiento.` }),
  })));
  order.subtotal = 6200;
  order.taxAmount = 992;
  order.total = 7192;
}
if (twoOtherRows) {
  assert(!stressTest, 'Run the two-row example separately from the stress test.');
  order.reportedFailureSummary = 'El cliente reporta sarro en el depósito y aumento de temperatura después de circular; solicita revisar el enfriamiento.\nRevisar el sellado del tapón, las mangueras y el funcionamiento del abanico antes de realizar el mantenimiento.';
  order.lineTotalsMode = 'LINES';
  order.reportedFailures = order.reportedFailures.map(failure => {
    const line = decodeServiceOrderLine(failure.otherText);
    return { ...failure, otherText: null, amount: line.amount,
      observation: [line.conceptName, line.observation].filter(Boolean).join('\n') };
  });
  const otherType = failureTypes.find(type => type.id === 13)!;
  otherType.code = 'OTHER';
  order.reportedFailures.push(...[
    { amount: 1800, observation: 'EJEMPLO 1: Corregir fuga en el tubo y casquillo de la bomba de agua.' },
    { amount: 680, observation: 'EJEMPLO 2: Cambiar la manguera del purgador y verificar que no existan fugas.' },
  ].map((line, index) => ({
    id: 100 + index,
    reportedFailureTypeId: otherType.id,
    failureCodeSnapshot: otherType.code,
    labelSnapshot: otherType.label,
    displayOrderSnapshot: otherType.displayOrder,
    ...line,
  })));
  // Use the same subtotal transformation as the capture form, not a typed total.
  const values = createFormValues(failureTypes, order);
  const subtotal = buildWriteFields(values, failureTypes).subtotal!;
  values.taxAmount = Math.round(subtotal * 16) / 100;
  const payload = buildWriteFields(values, failureTypes);
  order.subtotal = payload.subtotal;
  order.taxAmount = payload.taxAmount;
  order.total = (Math.round(subtotal * 100) + Math.round(payload.taxAmount * 100)) / 100;
  assert.equal(order.subtotal, 6280);
  assert.equal(order.taxAmount, 1004.8);
  assert.equal(order.total, 7284.8);
  const pdfData = mapServiceOrderToPdfData(order, failureTypes);
  assert.equal(pdfData.failures.filter(row => row.label === 'Otros' && row.selected).length, 2);
  assert.equal(pdfData.failures.reduce((sum, row) => sum + Math.round((row.amount ?? 0) * 100), 0), 628000);
  process.stdout.write(`Verified: subtotal ${order.subtotal}; IVA ${order.taxAmount}; total ${order.total}\n`);
}
await mkdir(outputDirectory, { recursive: true });
await renderToFile(
  <ServiceOrderPdfDocument
    data={mapServiceOrderToPdfData(order, failureTypes)}
    logoSource={path.join(root, 'src', 'assets', 'LOGO CON CONTORNO BLANCO RD.png')}
  />,
  outputPath
);

process.stdout.write(`${outputPath}\n`);
if (!twoOtherRows) {
const receiptPath = path.join(outputDirectory, 'comprobante-servicio-ejemplo.pdf');
await renderToFile(
  <ServiceOrderPdfDocument
    kind="receipt"
    data={mapServiceOrderToPdfData(order, failureTypes)}
    logoSource={path.join(root, 'src', 'assets', 'LOGO CON CONTORNO BLANCO RD.png')}
  />,
  receiptPath
);
process.stdout.write(`${receiptPath}\n`);
}
