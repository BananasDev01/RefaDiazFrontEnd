import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import { server } from '../../mocks/server';
import type { ReportedFailureType } from '../../types/serviceOrder.types';
import { ServiceOrderForm } from './ServiceOrderFormPage';

const apiBaseUrl = import.meta.env.VITE_API_REFA_BASE_PATH || '/api';
const failureTypes: ReportedFailureType[] = [
  {
    id: 1,
    code: 'SERVICIO_RADIADOR',
    label: 'Servicio radiador',
    displayOrder: 1,
    allowsFreeText: false,
    active: true,
  },
];

const renderForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <MemoryRouter>
          <ServiceOrderForm failureTypes={failureTypes} initialClientId={1} />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>
  );
};

describe('formulario de órdenes de servicio', () => {
  it('captura solo costo y observación dentro del renglón seleccionado', async () => {
    server.use(http.get(`${apiBaseUrl}/users`, () => HttpResponse.json([])));
    renderForm();

    await screen.findByDisplayValue('Pedro Antonio Félix · 8125049511');
    expect(screen.queryByRole('textbox', { name: /Concepto o nota/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Servicio radiador' }));

    expect(screen.queryByRole('textbox', { name: /Concepto o nota/ })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Costo/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Observación/ })).toBeInTheDocument();
  });

  it('regresa al expediente cuando la orden se abrió desde clientes', async () => {
    server.use(http.get(`${apiBaseUrl}/users`, () => HttpResponse.json([])));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <MemoryRouter initialEntries={['/service-orders/new']}>
            <Routes>
              <Route
                path="/service-orders/new"
                element={<ServiceOrderForm failureTypes={failureTypes} initialClientId={1} returnTo="/clients/1" />}
              />
              <Route path="/clients/1" element={<div>Expediente del cliente</div>} />
            </Routes>
          </MemoryRouter>
        </SnackbarProvider>
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Volver al cliente' }));

    expect(await screen.findByText('Expediente del cliente')).toBeInTheDocument();
  });

  it('elimina el error requerido cuando se selecciona un vehículo', async () => {
    server.use(http.get(`${apiBaseUrl}/users`, () => HttpResponse.json([])));
    renderForm();

    await screen.findByDisplayValue('Pedro Antonio Félix · 8125049511');
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Vehículo' })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByText('Selecciona el vehículo que ingresará al taller.')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Vehículo' }));
    fireEvent.click(await screen.findByRole('option', { name: /Ford Lobo 2006/ }));

    await waitFor(() => {
      expect(screen.queryByText('Selecciona el vehículo que ingresará al taller.')).not.toBeInTheDocument();
    });
  });

  it('permite abrir el alta de un cliente sin abandonar la orden', async () => {
    server.use(http.get(`${apiBaseUrl}/users`, () => HttpResponse.json([])));
    renderForm();

    const clientInput = await screen.findByRole('combobox', { name: /Buscar cliente/ });
    fireEvent.mouseDown(clientInput);
    fireEvent.click(await screen.findByRole('option', { name: /Añadir nuevo cliente/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Nuevo cliente' })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Nombre del cliente/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Celular/ })).toBeInTheDocument();
  });

  it('ofrece crear un modelo desde el alta contextual de vehículo', async () => {
    server.use(http.get(`${apiBaseUrl}/users`, () => HttpResponse.json([])));
    renderForm();
    await screen.findByDisplayValue('Pedro Antonio Félix · 8125049511');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Vehículo' }));
    fireEvent.click(await screen.findByRole('option', { name: /Agregar vehículo/ }));
    const vehicleDialog = await screen.findByRole('dialog');
    const brandInput = within(vehicleDialog).getByRole('combobox', { name: /Marca/ });
    fireEvent.mouseDown(brandInput);
    fireEvent.click(await screen.findByRole('option', { name: 'Ford' }));

    const modelInput = within(vehicleDialog).getByRole('combobox', { name: /Modelo/ });
    fireEvent.mouseDown(modelInput);
    fireEvent.click(await screen.findByRole('option', { name: '+ Añadir nuevo modelo' }));

    expect(await screen.findByRole('heading', { name: 'Añadir Nuevo Modelo' })).toBeInTheDocument();
  });

  it('selecciona automáticamente el cliente y vehículo creados durante la orden', async () => {
    server.use(http.get(`${apiBaseUrl}/users`, () => HttpResponse.json([])));
    renderForm();

    const clientInput = await screen.findByRole('combobox', { name: /Buscar cliente/ });
    fireEvent.mouseDown(clientInput);
    fireEvent.click(await screen.findByRole('option', { name: /Añadir nuevo cliente/ }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Nombre del cliente/ }), {
      target: { value: 'Cliente desde orden' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Celular/ }), {
      target: { value: '8185550199' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cliente' }));

    expect(await screen.findByRole('heading', { name: 'Agregar vehículo' })).toBeInTheDocument();
    dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /Marca/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Honda' }));
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /Modelo/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Civic' }));
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Año/ }), {
      target: { value: '2020' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar vehículo' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Cliente desde orden · 8185550199')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Vehículo' })).toHaveTextContent('Honda Civic 2020');
  });
});
