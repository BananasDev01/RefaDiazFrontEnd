import { describe, expect, it } from 'vitest';
import { decodeServiceOrderLine, encodeServiceOrderLine } from './serviceOrderLineCodec';

describe('serviceOrderLineCodec', () => {
  it('conserva concepto, costo y observación usando el contrato actual', () => {
    const encoded = encodeServiceOrderLine({
      customFailure: 'Trabajo especial',
      conceptName: 'Tapón nuevo del cliente',
      amount: 0,
      observation: 'El tapón anterior no sella correctamente.',
    });

    expect(encoded).toMatch(/^RDROW1:/);
    expect(decodeServiceOrderLine(encoded)).toEqual({
      structured: true,
      customFailure: 'Trabajo especial',
      conceptName: 'Tapón nuevo del cliente',
      amount: 0,
      observation: 'El tapón anterior no sella correctamente.',
    });
  });

  it('interpreta el texto histórico como detalle de una falla personalizada', () => {
    expect(decodeServiceOrderLine('Revisar depósito')).toEqual({
      structured: false,
      customFailure: 'Revisar depósito',
      conceptName: '',
      amount: null,
      observation: '',
    });
  });
});
