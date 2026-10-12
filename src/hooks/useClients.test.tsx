import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import { useClient, useClientMutations, useClients } from './useClients';

const createQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

describe('hooks de clientes', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>{children}</SnackbarProvider>
    </QueryClientProvider>
  );

  it('busca clientes por cualquier dato del expediente', async () => {
    const { result } = renderHook(
      () => useClients({ q: 'RKU483B', limit: 20, offset: 0 }),
      { wrapper }
    );

    await waitFor(
      () => expect(result.current.isFetching).toBe(false),
      { timeout: 5000 }
    );
    expect(result.current.error).toBeNull();

    expect(result.current.data?.pagination.total).toBe(1);
    expect(result.current.data?.data[0].clientName).toBe('Pedro Antonio Félix');
    expect(result.current.data?.data[0].vehicles[0].plate).toBe('RKU483B');
  });

  it('registra un cliente y deja su expediente en caché', async () => {
    const { result } = renderHook(() => useClientMutations(), { wrapper });

    let createdId = 0;
    await act(async () => {
      const client = await result.current.createClient({
        externalId: 'f2a8ea68-34cc-4af7-96f0-a27fb8ecfb13',
        clientName: 'Cliente Nuevo',
        phoneNumber: '81 8555 0199',
        comments: null,
        vehicles: [],
      });
      createdId = client.id;
    });

    const detail = renderHook(() => useClient(createdId), { wrapper });
    await waitFor(
      () => expect(detail.result.current.isSuccess).toBe(true),
      { timeout: 5000 }
    );

    expect(detail.result.current.data?.clientName).toBe('Cliente Nuevo');
    expect(detail.result.current.data?.phoneNormalized).toBe('8185550199');
  });

  it('agrega varios vehículos al mismo cliente sin duplicar el expediente', async () => {
    const mutation = renderHook(() => useClientMutations(), { wrapper });

    await act(async () => {
      await mutation.result.current.addClientVehicles({
        clientId: 2,
        payload: {
          vehicles: [
            {
              externalId: '95fcd833-891c-40e3-a2c0-b59fb310ce01',
              carModelId: 101,
              modelYear: 2020,
              plate: 'ABC-123-A',
            },
            {
              externalId: '0b3532cf-e8d5-474c-bb3d-184d9230b802',
              carModelId: 102,
              modelYear: 2023,
              plate: 'XYZ-987-B',
            },
          ],
        },
      });
    });

    const detail = renderHook(() => useClient(2), { wrapper });
    await waitFor(
      () => expect(detail.result.current.isSuccess).toBe(true),
      { timeout: 5000 }
    );

    expect(detail.result.current.data?.vehicles).toHaveLength(2);
    expect(detail.result.current.data?.vehicles.map((vehicle) => vehicle.plate)).toEqual([
      'ABC-123-A',
      'XYZ-987-B',
    ]);
  });
});
