import { describe, expect, it } from 'vitest';
import {
  computeIva,
  daysSince,
  detectSearchField,
  folioLabel,
  isSafeReturnTo,
  ivaModeFor,
} from './serviceOrderUtils';

describe('utilidades de órdenes de servicio', () => {
  it('reconoce folio, celular o placas en una sola búsqueda', () => {
    expect(detectSearchField('4861')).toBe('folio');
    expect(detectSearchField('PEND-SER-1A2B')).toBe('folio');
    expect(detectSearchField('812 504 9511')).toBe('phone');
    expect(detectSearchField('(81) 2504-9511')).toBe('phone');
    expect(detectSearchField('RKU483B')).toBe('plate');
    expect(detectSearchField('rku-483-b')).toBe('plate');
  });

  it('calcula el 16 % en centavos', () => {
    expect(computeIva(3800)).toBe(608);
    expect(computeIva(5000.5)).toBe(800.08);
    expect(computeIva(0.1)).toBe(0.02);
  });

  it('distingue IVA ausente, automático o capturado a mano', () => {
    expect(ivaModeFor(0, 3800)).toBe('none');
    expect(ivaModeFor(608, 3800)).toBe('auto');
    expect(ivaModeFor(500, 3800)).toBe('manual');
  });

  it('cuenta días calendario desde el ingreso', () => {
    const now = new Date(2026, 9, 10, 9);
    expect(daysSince('2026-10-10', now)).toBe(0);
    expect(daysSince('2026-10-01', now)).toBe(9);
    expect(daysSince(null, now)).toBeNull();
  });

  it('usa el mismo folio que el PDF', () => {
    expect(folioLabel({ folioNumber: 42, provisionalReference: 'PEND-SER-X' })).toBe('0042');
    expect(folioLabel({ folioNumber: undefined, provisionalReference: 'PEND-SER-X' })).toBe('PEND-SER-X');
  });

  it('solo acepta destinos de regreso internos', () => {
    expect(isSafeReturnTo('/clients/12')).toBe(true);
    expect(isSafeReturnTo('/service-orders?status=DRAFT&q=48')).toBe(true);
    expect(isSafeReturnTo('https://example.com')).toBe(false);
    expect(isSafeReturnTo('/clients/12/../../admin')).toBe(false);
  });
});
