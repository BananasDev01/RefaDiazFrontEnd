import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import ClientsPage from './ClientsPage';

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <SnackbarProvider>
      <MemoryRouter initialEntries={['/clients']}>
        <ClientsPage />
      </MemoryRouter>
    </SnackbarProvider>
  </QueryClientProvider>
);

describe('listado de clientes', { timeout: 20_000 }, () => {
  it('muestra cada cliente con sus vehículos y enlaza a su expediente', async () => {
    renderPage();
    const row = await screen.findByRole('link', { name: /Pedro Antonio Félix/ });
    expect(row).toHaveAttribute('href', '/clients/1');
    expect(screen.getByLabelText('Placas RKU483B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument();
  });

  it('filtra por lo que se escribe en la búsqueda', async () => {
    renderPage();
    await screen.findByRole('link', { name: /Pedro Antonio Félix/ });
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar clientes' }), { target: { value: 'sin coincidencias' } });
    expect(await screen.findByText('No encontramos coincidencias', {}, { timeout: 2000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('link', { name: /Pedro Antonio Félix/ })).not.toBeInTheDocument());
  });
});
