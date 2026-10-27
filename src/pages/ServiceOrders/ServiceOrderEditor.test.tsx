import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import { server } from '../../mocks/server';
import type { ReportedFailureType, ServiceOrder } from '../../types/serviceOrder.types';
import { ServiceOrderEditor } from './ServiceOrderEditor';

const apiBaseUrl = import.meta.env.VITE_API_REFA_BASE_PATH || '/api';

const failureTypes: ReportedFailureType[] = [
  { id: 1, code: 'SERVICIO_RADIADOR', label: 'Servicio radiador', displayOrder: 1, allowsFreeText: false, active: true },
  { id: 2, code: 'TAPON', label: 'Tapón', displayOrder: 2, allowsFreeText: false, active: true },
  { id: 3, code: 'OTHER', label: 'Otros', displayOrder: 3, allowsFreeText: true, active: true },
];

const order: ServiceOrder = {
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
  lineTotalsMode: 'LINES',
  subtotal: 1000,
  taxAmount: 160,
  total: 1160,
  compressionLeakDetected: false,
  clientSnapshot: { clientName: 'Pedro Antonio Félix', phoneNumber: '8125049511' },
  vehicleSnapshot: {},
  legalTextSnapshot: {},
  version: 3,
  items: [],
  reportedFailures: [{
    id: 1,
    externalId: '60edb6f2-0426-4dff-921d-3e1543bb3d31',
    reportedFailureTypeId: 1,
    failureCodeSnapshot: 'SERVICIO_RADIADOR',
    labelSnapshot: 'Servicio radiador',
    displayOrderSnapshot: 1,
    amount: 1000,
    observation: 'Lavado y prueba de presión.',
  }],
};

const renderEditor = (props: Partial<Parameters<typeof ServiceOrderEditor>[0]> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <MemoryRouter>
          <ServiceOrderEditor failureTypes={failureTypes} order={order} {...props} />
        </MemoryRouter>
      </SnackbarProvider>
    </QueryClientProvider>
  );
};

const headerTotal = () => screen.getByTestId('so-header-total');

// The editor mounts Tiptap and the whole MUI form; give the first render room on slow runners.
describe('editor de órdenes', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    server.use(http.get(`${apiBaseUrl}/service-documents`, () => HttpResponse.json([])));
  });

  it('muestra cliente, vehículo y partidas como resumen', async () => {
    renderEditor();
    expect(screen.getByRole('heading', { name: 'Orden 4861' })).toBeInTheDocument();
    expect(await screen.findByText('Ford Lobo 2006')).toBeInTheDocument();
    expect(screen.getByText('Pedro Antonio Félix', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Servicio radiador' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('textbox', { name: 'Observaciones de Servicio radiador' })).toHaveValue('Lavado y prueba de presión.');
    expect(headerTotal()).toHaveTextContent('$1,160.00');
  });

  it('marcar una falla agrega su partida y el IVA sigue al subtotal', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Tapón' }));
    const amount = screen.getByRole('textbox', { name: 'Costo de Tapón' });
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: '500' } });
    fireEvent.blur(amount);
    await waitFor(() => expect(headerTotal()).toHaveTextContent('$1,740.00'));
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });

  it('apagar el IVA deja la orden sin impuesto', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('switch', { name: 'IVA 16%' }));
    await waitFor(() => expect(headerTotal()).toHaveTextContent('$1,000.00'));
    expect(screen.getByText('Sin IVA')).toBeInTheDocument();
  });

  it('avisa cuando el IVA histórico no es 16 % y no lo reemplaza solo', async () => {
    renderEditor({ order: { ...order, taxAmount: 100, total: 1100 } });
    expect(screen.getByText(/IVA capturado a mano/)).toBeInTheDocument();
    expect(headerTotal()).toHaveTextContent('$1,100.00');
    fireEvent.click(screen.getByRole('button', { name: 'Recalcular al 16 %' }));
    await waitFor(() => expect(headerTotal()).toHaveTextContent('$1,160.00'));
  });

  it('quitar una partida con datos se puede deshacer', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Servicio radiador' }));
    expect(screen.queryByRole('textbox', { name: 'Observaciones de Servicio radiador' })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Deshacer' }));
    expect(screen.getByRole('textbox', { name: 'Observaciones de Servicio radiador' })).toHaveValue('Lavado y prueba de presión.');
  });

  it('«Otro concepto» agrega partidas genéricas repetibles', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Otro concepto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Otro concepto' }));
    expect(screen.getAllByRole('textbox', { name: 'Costo de Otros' })).toHaveLength(2);
  });

  it('una captura nueva se guarda sola y ya no tiene «Pasar a taller»', () => {
    renderEditor({ order: undefined, draftId: 'b0d8c6a2-6f37-4d7d-9a35-31b2c1f0a222', initialClientId: 1, initialVehicleId: 11 });
    expect(screen.getByRole('button', { name: 'Crear orden' })).toHaveAttribute('type', 'submit');
    expect(screen.queryByRole('button', { name: 'Pasar a taller' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Completar y entregar' })).not.toBeInTheDocument();
  });

  it('una orden de pieza pide descripción y oculta las advertencias del motor', () => {
    renderEditor({ order: { ...order, category: 'PART', partDescription: 'Radiador de Tsuru 2004', clientVehicleId: null, vehicleId: null } });
    expect(screen.getByRole('textbox', { name: 'Descripción de la pieza' })).toHaveValue('Radiador de Tsuru 2004');
    expect(screen.getByRole('button', { name: /Pieza/, pressed: true })).toBeInTheDocument();
    expect(screen.queryByText('Advertencias para el cliente')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Condiciones de la pieza' })).toBeInTheDocument();
  });

  it('cambiar a pieza quita el vehículo sin perder lo capturado', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /Pieza/ }));
    expect(screen.getByRole('textbox', { name: 'Descripción de la pieza' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Observaciones de Servicio radiador' })).toHaveValue('Lavado y prueba de presión.');
  });

  it('eliminar una orden pide el motivo', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar orden' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar orden' });
    const confirm = within(dialog).getByRole('button', { name: 'Eliminar' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Motivo/ }), { target: { value: 'Capturada por error' } });
    expect(confirm).toBeEnabled();
  });

  it('completar pide confirmación', async () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Completar y entregar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Completar y entregar' });
    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  it('una orden completada sigue editable y se guarda con el botón principal', () => {
    renderEditor({ order: { ...order, status: 'COMPLETED' } });
    expect(screen.getByText(/Puedes seguir editándola/, { selector: '.MuiAlert-message' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tapón' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toHaveAttribute('type', 'submit');
    expect(screen.queryByRole('button', { name: 'Completar y entregar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tapón' }));
    expect(screen.getByRole('textbox', { name: 'Costo de Tapón' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });

  it('una orden eliminada queda en solo lectura con sus documentos', () => {
    renderEditor({ order: { ...order, status: 'CANCELLED' } });
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.getByText(/solo lectura/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tapón' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vista previa: orden de servicio' })).toBeEnabled();
  });

  it('regresa al expediente cuando la orden se abrió desde clientes', () => {
    renderEditor({ returnTo: '/clients/1' });
    expect(screen.getByRole('button', { name: 'Cliente' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Órdenes' })).not.toBeInTheDocument();
  });

  it('una captura nueva inicia con el cliente y vehículo elegidos', async () => {
    renderEditor({ order: undefined, draftId: 'b0d8c6a2-6f37-4d7d-9a35-31b2c1f0a111', initialClientId: 1, initialVehicleId: 11 });
    expect(screen.getByRole('heading', { name: 'Nueva orden' })).toBeInTheDocument();
    expect(await screen.findByText('Ford Lobo 2006')).toBeInTheDocument();
    expect(screen.getByText(/se habilitan cuando la captura se guarda/)).toBeInTheDocument();
  });
});
