import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import { server } from '../mocks/server';
import type {
  ServiceOrder,
  ServiceOrderCreateRequest,
  ServiceOrderUpdateRequest,
} from '../types/serviceOrder.types';
import {
  useReportedFailureTypes,
  useServiceOrder,
  useServiceOrderMutations,
  useServiceOrderStatusCounts,
} from './useServiceOrders';

const apiBaseUrl = import.meta.env.VITE_API_REFA_BASE_PATH || '/api';
const orderExternalId = '07d1e37f-b75d-4eb7-9ea6-b8a830cbb339';

const createOrder = (overrides: Partial<ServiceOrder> = {}): ServiceOrder => ({
  id: 301,
  externalId: orderExternalId,
  provisionalReference: 'PEND-SER-07D1E37F',
  folioSeries: 'SER',
  folioNumber: 5001,
  status: 'DRAFT',
  serviceDate: '2026-08-20',
  clientVehicleId: 11,
  clientId: 1,
  vehicleId: 101,
  compressionLeakDetected: false,
  coolingSystemAirPressureDetected: true,
  subtotal: 1000,
  taxAmount: 160,
  total: 1160,
  clientSnapshot: { client_name: 'Pedro Antonio Félix', phone_number: '8125049511' },
  vehicleSnapshot: { brand_name: 'Ford', car_model_name: 'Lobo', plate: 'RKU483B' },
  legalTextSnapshot: {},
  version: 1,
  reportedFailures: [],
  items: [],
  ...overrides,
});

const createQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

describe('hooks de órdenes de servicio', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>{children}</SnackbarProvider>
    </QueryClientProvider>
  );

  it('carga el catálogo vigente de fallas reportadas', async () => {
    server.use(
      http.get(`${apiBaseUrl}/services/failure-types`, () => HttpResponse.json([
        { id: 1, code: 'SERVICIO_RADIADOR', label: 'Servicio radiador', displayOrder: 1, allowsFreeText: false, active: true },
        { id: 2, code: 'OTROS', label: 'Otros', displayOrder: 2, allowsFreeText: true, active: true },
      ]))
    );

    const { result } = renderHook(() => useReportedFailureTypes(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[1].allowsFreeText).toBe(true);
  });

  it('crea la orden completa y guarda el resultado en caché', async () => {
    let receivedPayload: ServiceOrderCreateRequest | null = null;
    server.use(
      http.post(`${apiBaseUrl}/services`, async ({ request }) => {
        receivedPayload = await request.json() as ServiceOrderCreateRequest;
        return HttpResponse.json(createOrder(), { status: 201 });
      }),
      http.get(`${apiBaseUrl}/services/:externalId`, () => HttpResponse.json(createOrder()))
    );
    const mutation = renderHook(() => useServiceOrderMutations(), { wrapper });

    await act(async () => {
      await mutation.result.current.createServiceOrder({
        externalId: orderExternalId,
        clientVehicleId: 11,
        serviceDate: '2026-08-20',
        compressionLeakDetected: false,
        coolingSystemAirPressureDetected: true,
        subtotal: 1000,
        taxAmount: 160,
        warrantyMonths: 6,
        reportedFailures: [],
      });
    });

    expect(receivedPayload).toMatchObject({ clientVehicleId: 11, taxAmount: 160 });
    const detail = renderHook(() => useServiceOrder(orderExternalId), { wrapper });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(detail.result.current.data?.total).toBe(1160);
  });

  it('actualiza, inicia y completa usando la nueva versión en cada transición', async () => {
    const expectedVersions: number[] = [];
    server.use(
      http.put(`${apiBaseUrl}/services/:externalId`, async ({ request }) => {
        const payload = await request.json() as ServiceOrderUpdateRequest;
        expectedVersions.push(payload.expectedVersion);
        return HttpResponse.json(createOrder({ version: 2, importantInformation: 'Revisar en una semana' }));
      }),
      http.post(`${apiBaseUrl}/services/:externalId/start`, async ({ request }) => {
        const payload = await request.json() as { expectedVersion: number };
        expectedVersions.push(payload.expectedVersion);
        return HttpResponse.json(createOrder({ version: 3, status: 'IN_PROGRESS' }));
      }),
      http.post(`${apiBaseUrl}/services/:externalId/complete`, async ({ request }) => {
        const payload = await request.json() as { expectedVersion: number };
        expectedVersions.push(payload.expectedVersion);
        return HttpResponse.json(createOrder({ version: 4, status: 'COMPLETED' }));
      })
    );
    const mutation = renderHook(() => useServiceOrderMutations(), { wrapper });

    let updated = createOrder();
    await act(async () => {
      updated = await mutation.result.current.updateServiceOrder({
        externalId: orderExternalId,
        payload: {
          externalId: orderExternalId,
          expectedVersion: 1,
          clientVehicleId: 11,
          importantInformation: 'Revisar en una semana',
          compressionLeakDetected: false,
          coolingSystemAirPressureDetected: false,
          taxAmount: 160,
        },
      });
      updated = await mutation.result.current.startServiceOrder({
        externalId: orderExternalId,
        expectedVersion: updated.version,
      });
      await mutation.result.current.completeServiceOrder({
        externalId: orderExternalId,
        expectedVersion: updated.version,
      });
    });

    expect(expectedVersions).toEqual([1, 2, 3]);
    expect(queryClient.getQueryData<ServiceOrder>(['service-orders', 'detail', orderExternalId])?.status).toBe('COMPLETED');
  });

  it('obtiene el total de órdenes para cada estado', async () => {
    const totals = { DRAFT: 2, IN_PROGRESS: 4, COMPLETED: 11, CANCELLED: 1 };
    server.use(
      http.get(`${apiBaseUrl}/services`, ({ request }) => {
        const status = new URL(request.url).searchParams.get('status') as keyof typeof totals;
        return HttpResponse.json({
          data: [],
          pagination: { limit: 1, offset: 0, total: totals[status] },
        });
      })
    );

    const { result } = renderHook(() => useServiceOrderStatusCounts(), { wrapper });
    await waitFor(() => expect(result.current.CANCELLED).toBe(1));

    expect(result.current).toEqual(totals);
  });
});
