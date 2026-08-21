import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import {
  useVehicleNote,
  useVehicleNoteMutations,
  useVehicleNotes,
} from './useVehicleNotes';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('useVehicleNotes hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/vehicle-notes']}>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>{children}</SnackbarProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  it('should fetch vehicle notes using filters', async () => {
    const { result } = renderHook(
      () => useVehicleNotes({ textSearch: 'Ford', brandId: 202, carModelId: 103 }),
      { wrapper }
    );

    await waitFor(
      () => expect(result.current.isSuccess).toBe(true),
      { timeout: 5000 }
    );

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe('Procedimiento de purga');
  });

  it('should fetch a single vehicle note by id', async () => {
    const { result } = renderHook(() => useVehicleNote(1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.title).toBe('Procedimiento de purga');
    expect(result.current.data?.carModel?.name).toBe('Lobo');
  });

  it('should create, update and delete a vehicle note while invalidating the list', async () => {
    const listHook = renderHook(
      () => useVehicleNotes({ textSearch: null, brandId: null, carModelId: null }),
      { wrapper }
    );
    const mutationHook = renderHook(() => useVehicleNoteMutations(), { wrapper });

    await waitFor(() => expect(listHook.result.current.data).toHaveLength(3));

    await act(async () => {
      await mutationHook.result.current.createVehicleNote({
        title: 'Nueva nota',
        contentMarkdown: 'Contenido inicial',
        carModelId: null,
      });
    });

    await waitFor(() => {
      expect(listHook.result.current.data?.some((note) => note.title === 'Nueva nota')).toBe(true);
    });

    const createdNote = listHook.result.current.data?.find((note) => note.title === 'Nueva nota');
    expect(createdNote?.carModelId).toBeNull();

    await act(async () => {
      await mutationHook.result.current.updateVehicleNote({
        id: createdNote!.id!,
        data: {
          title: 'Nueva nota actualizada',
          contentMarkdown: 'Contenido actualizado',
          carModelId: 101,
          files: [],
        },
      });
    });

    await waitFor(() => {
      expect(
        listHook.result.current.data?.some((note) => note.title === 'Nueva nota actualizada')
      ).toBe(true);
    });

    await act(async () => {
      await mutationHook.result.current.deleteVehicleNote(createdNote!.id!);
    });

    await waitFor(() => expect(listHook.result.current.data).toHaveLength(3));
    expect(
      listHook.result.current.data?.some((note) => note.title === 'Nueva nota actualizada')
    ).toBe(false);
  });
});
