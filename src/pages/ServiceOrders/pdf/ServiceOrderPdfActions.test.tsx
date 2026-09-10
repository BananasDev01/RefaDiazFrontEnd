import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceOrderPdfActions } from './ServiceOrderPdfActions';
import type { ServiceOrder } from '../../../types/serviceOrder.types';

const { renderPdf } = vi.hoisted(() => ({ renderPdf: vi.fn() }));
vi.mock('@react-pdf/renderer', () => ({ pdf: renderPdf }));
vi.mock('./ServiceOrderPdfDocument', () => ({ ServiceOrderPdfDocument: () => null }));

const order: ServiceOrder = {
  id: 1, externalId: 'order-1', provisionalReference: 'PEND-SER-1', folioSeries: 'SER', folioNumber: 1,
  status: 'IN_PROGRESS', serviceDate: '2026-09-10', clientVehicleId: 1, clientId: 1, vehicleId: 1,
  compressionLeakDetected: false, taxAmount: 160, subtotal: 1000, total: 1160,
  clientSnapshot: { clientName: 'Cliente ejemplo' }, vehicleSnapshot: {}, legalTextSnapshot: {},
  version: 1, reportedFailures: [], items: [],
};
const failureTypes: [] = [];

describe('PDFs independientes', () => {
  beforeEach(() => {
    renderPdf.mockReset();
    renderPdf.mockReturnValue({ toBlob: async () => new Blob(['pdf']) });
    let sequence = 0;
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => `blob:pdf-${++sequence}`);
      static revokeObjectURL = vi.fn();
    });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('abre y descarga la orden y el comprobante con nombres diferentes', async () => {
    render(<ServiceOrderPdfActions order={order} failureTypes={failureTypes} />);
    fireEvent.click(screen.getByRole('button', { name: 'PDF de orden' }));
    expect(await screen.findByTitle('Vista previa: orden SER-0001')).toHaveAttribute('src', 'blob:pdf-1');
    expect(screen.getByRole('link', { name: 'Descargar PDF' })).toHaveAttribute('download', 'orden-servicio-ser-0001.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'PDF de comprobante' }));
    expect(await screen.findByTitle('Vista previa: comprobante SER-0001')).toHaveAttribute('src', 'blob:pdf-2');
    expect(screen.getByRole('link', { name: 'Descargar PDF' })).toHaveAttribute('download', 'comprobante-servicio-ser-0001.pdf');
    expect(renderPdf.mock.calls.at(-1)?.[0].props.kind).toBe('receipt');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-1');
  });

  it('regenera y libera el PDF anterior cuando cambian los datos guardados', async () => {
    const view = render(<ServiceOrderPdfActions order={order} failureTypes={failureTypes} />);
    fireEvent.click(screen.getByRole('button', { name: 'PDF de orden' }));
    await screen.findByTitle('Vista previa: orden SER-0001');
    view.rerender(<ServiceOrderPdfActions order={{ ...order, version: 2, total: 2320 }} failureTypes={failureTypes} />);
    await waitFor(() => expect(screen.getByTitle('Vista previa: orden SER-0001')).toHaveAttribute('src', 'blob:pdf-2'));
    expect(renderPdf.mock.calls.at(-1)?.[0].props.data.total).toBe(2320);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-1');
  });

  it('ignora una generación que termina después de cerrar la vista previa', async () => {
    let resolveBlob!: (blob: Blob) => void;
    renderPdf.mockReturnValue({ toBlob: () => new Promise<Blob>((resolve) => { resolveBlob = resolve; }) });
    render(<ServiceOrderPdfActions order={order} failureTypes={failureTypes} />);
    fireEvent.click(screen.getByRole('button', { name: 'PDF de orden' }));
    await waitFor(() => expect(renderPdf).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    resolveBlob(new Blob(['pdf']));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
