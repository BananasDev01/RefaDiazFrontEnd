import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import { server } from '../../mocks/server';
import VehicleNoteFormPage from './VehicleNoteFormPage';

vi.mock('../../services/VehicleNoteImageService', () => ({
  VehicleNoteImageService: {
    uploadFiles: vi.fn(async (files: unknown[]) => files),
  },
}));

vi.mock('../../utils/storage', () => ({
  getPublicStorageUrl: () => '',
}));

const apiBaseUrl = import.meta.env.VITE_API_REFA_BASE_PATH || '/api';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('VehicleNoteFormPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  const renderPage = () => render(
    <MemoryRouter initialEntries={['/vehicle-notes/new']}>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <Routes>
            <Route path="/vehicle-notes/new" element={<VehicleNoteFormPage />} />
            <Route path="/vehicle-notes/edit/:noteId" element={<div>edit page</div>} />
          </Routes>
        </SnackbarProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  it('should validate required fields', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(
      'El titulo es requerido.',
      {},
      { timeout: 10000 }
    )).toBeInTheDocument();
    expect(await screen.findByText(
      'El contenido es requerido.',
      {},
      { timeout: 10000 }
    )).toBeInTheDocument();
  }, 15000);

  it('should submit a payload with null carModelId', async () => {
    let capturedBody: Record<string, unknown> | undefined;

    server.use(
      http.post(`${apiBaseUrl}/vehicle-notes`, async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>;

        return HttpResponse.json(
          {
            id: 999,
            title: capturedBody.title,
            contentMarkdown: capturedBody.contentMarkdown,
            carModelId: capturedBody.carModelId,
            carModel: null,
            files: [],
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { status: 201 }
        );
      })
    );

    renderPage();

    fireEvent.change(screen.getByLabelText('Titulo'), {
      target: { value: 'Nota de prueba' },
    });
    fireEvent.change(screen.getByLabelText('Contenido'), {
      target: { value: '# Encabezado\n\nContenido de prueba' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(capturedBody).toBeDefined());

    expect(capturedBody?.title).toBe('Nota de prueba');
    expect(capturedBody?.contentMarkdown).toBe('# Encabezado\n\nContenido de prueba');
    expect(capturedBody?.carModelId).toBeNull();
    expect(capturedBody?.files).toBeUndefined();
    await waitFor(() => expect(screen.getByText('edit page')).toBeInTheDocument());
  });
});
