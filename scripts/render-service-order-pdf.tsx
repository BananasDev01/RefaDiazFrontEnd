import { renderToFile } from '@react-pdf/renderer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ServiceOrderPdfDocument } from '../src/pages/ServiceOrders/pdf/ServiceOrderPdfDocument';
import { mapServiceOrderToPdfData } from '../src/pages/ServiceOrders/pdf/serviceOrderPdfData';
import type { ReportedFailureType, ServiceOrder } from '../src/types/serviceOrder.types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'output', 'pdf');
const outputPath = path.join(outputDirectory, 'orden-servicio-ejemplo.pdf');

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
  importantInformation: 'Clima no funciona.\nFoco de motor encendido.',
  informationalNote: 'Si aun con el mantenimiento vuelve a presentar calentamiento o gorgoteo en el recuperador, revisar con un mecanico fuga de compresion.',
  compressionLeakDetected: true,
  coolingSystemAirPressureDetected: false,
  radiatorSerialNumber: '22553',
  radiatorObstructionLevel: 6,
  subtotal: 3800,
  taxAmount: 608,
  total: 4408,
  warrantyMonths: 6,
  clientSnapshot: { clientName: 'Pedro Antonio Felix', phoneNumber: '8125049511' },
  vehicleSnapshot: { brand: 'Nissan', model: 'Pathfinder', modelYear: 2006, color: 'Gris', plate: 'RKU483B', version: 'SE' },
  workManagerSnapshot: { fullName: 'Eduardo Garcia' },
  legalTextSnapshot: {
    warrantyDisclaimer: 'Radiadores Diaz se obliga por esta garantia a reparar, reemplazar o cubrir unicamente el valor del producto en cuestion. En ningun caso cubrira materiales, mano de obra o partes suministradas, ni danos incidentales o consecuenciales derivados de una garantia.',
  },
  version: 1,
  reportedFailures: [
    { id: 1, externalId: '60edb6f2-0426-4dff-921d-3e1543bb3d31', reportedFailureTypeId: 7, failureCodeSnapshot: 'ABANICO', labelSnapshot: 'Abanico de clutch o electrico', displayOrderSnapshot: 7 },
    { id: 2, externalId: '7bc97afd-3758-45af-979b-dba2f51af432', reportedFailureTypeId: 9, failureCodeSnapshot: 'TAPON', labelSnapshot: 'Tapon', displayOrderSnapshot: 9 },
    { id: 3, externalId: '37df4ef1-255c-4914-ae15-6780d33d2852', reportedFailureTypeId: 12, failureCodeSnapshot: 'ANTICONGELANTE', labelSnapshot: 'Anticongelante', displayOrderSnapshot: 12 },
  ],
  items: [],
};

await mkdir(outputDirectory, { recursive: true });
await renderToFile(
  <ServiceOrderPdfDocument
    data={mapServiceOrderToPdfData(order, failureTypes)}
    logoSource={path.join(root, 'src', 'assets', 'LOGO CON CONTORNO BLANCO RD.png')}
  />,
  outputPath
);

process.stdout.write(`${outputPath}\n`);
