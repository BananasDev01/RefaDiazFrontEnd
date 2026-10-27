import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../mocks/server';
import type { ServiceOrder } from '../../types/serviceOrder.types';
import { ServiceOrdersPage } from './ServiceOrdersPage';

const apiBaseUrl = import.meta.env.VITE_API_REFA_BASE_PATH || '/api';

const order = {
  id: 1,
  externalId: '6bf739bd-6caf-4470-9900-a5a99f8e39e4',
  provisionalReference: 'QA-1',
  folioSeries: 'SER',
  folioNumber: 4861,
  status: 'IN_PROGRESS',
  category: 'VEHICLE',
  serviceDate: '2026-10-01',
  clientVehicleId: 11,
  clientId: 1,
  vehicleId: 101,
  reportedFailureSummary: 'Se calienta en tráfico',
  taxAmount: 0,
  total: 4408,
  clientSnapshot: { clientName: 'Pedro Antonio Félix', phoneNumber: '8125049511' },
  vehicleSnapshot: { brandName: 'Nissan', carModelName: 'Pathfinder', modelYear: 2006, plate: 'RKU483B' },
  version: 1,
  items: [],
  reportedFailures: [],
} satisfies ServiceOrder;

describe('listado de órdenes', () => {
  let requests: URLSearchParams[] = [];

  beforeEach(() => {
    localStorage.clear();
    requests = [];
    server.use(http.get(`${apiBaseUrl}/services`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const listed = params.get('limit') === '1' ? [] : [order];
      return HttpResponse.json({ data: listed, pagination: { limit: 20, offset: 0, total: 1 } });
    }));
  });

  const renderList = (path = '/service-orders') => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <ServiceOrdersPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

  it('muestra las órdenes en progreso con folio, placas y enlace a la orden', async () => {
    renderList();
    const row = await screen.findByRole('link', { name: /4861/ });
    expect(row).toHaveAttribute('href', expect.stringContaining('/service-orders/6bf739bd-6caf-4470-9900-a5a99f8e39e4'));
    expect(screen.getByLabelText('Placas RKU483B')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /En progreso/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.replace(/[\d…]/g, ''))).toEqual(['En progreso', 'Completadas']);
  });

  it('filtra por piezas y muestra su descripción en lugar del vehículo', async () => {
    server.use(http.get(`${apiBaseUrl}/services`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const part = { ...order, category: 'PART' as const, partDescription: 'Radiador de Tsuru 2004', clientVehicleId: null, vehicleId: null, vehicleSnapshot: {} };
      return HttpResponse.json({ data: params.get('limit') === '1' ? [] : [part], pagination: { limit: 20, offset: 0, total: 1 } });
    }));
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: /Piezas/ }));
    await waitFor(() => expect(requests.some((params) => params.get('category') === 'PART')).toBe(true));
    expect(await screen.findByText('Radiador de Tsuru 2004')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Placas/)).not.toBeInTheDocument();
  });

  it('una sola caja busca por celular cuando escribes un teléfono', async () => {
    renderList();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar órdenes' }), { target: { value: '812 504 9511' } });
    await waitFor(() => expect(requests.some((params) => params.get('phone') === '812 504 9511')).toBe(true), { timeout: 2000 });
    expect(await screen.findByText('Por celular')).toBeInTheDocument();
    expect(requests.every((params) => !params.get('folio'))).toBe(true);
  });

  it('busca por folio con números cortos', async () => {
    renderList('/service-orders?q=4861');
    await waitFor(() => expect(requests.some((params) => params.get('folio') === '4861')).toBe(true), { timeout: 2000 });
  });
});
