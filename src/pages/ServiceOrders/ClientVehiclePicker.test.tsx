import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import { ClientVehiclePicker } from './ClientVehiclePicker';

const renderPicker = (props: Partial<Parameters<typeof ClientVehiclePicker>[0]> = {}) => {
  const onConfirm = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <SnackbarProvider>
        <ClientVehiclePicker confirmLabel="Continuar al diagnóstico" onConfirm={onConfirm} {...props} />
      </SnackbarProvider>
    </QueryClientProvider>
  );
  return { onConfirm };
};

describe('selección de cliente y vehículo para la orden', { timeout: 20_000 }, () => {
  it('busca al cliente y confirma el vehículo elegido', async () => {
    const { onConfirm } = renderPicker();
    const continueButton = screen.getByRole('button', { name: 'Continuar al diagnóstico' });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar cliente' }), { target: { value: 'Pedro' } });
    const vehicle = await screen.findByRole('button', { name: /Ford Lobo 2006/ }, { timeout: 3000 });
    fireEvent.click(vehicle);

    expect(vehicle).toHaveAttribute('aria-pressed', 'true');
    // The confirmation waits for the chosen client's detail to load.
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    expect(onConfirm).toHaveBeenCalledWith(1, 11);
  });

  it('muestra preseleccionado el cliente que viene del expediente', async () => {
    renderPicker({ initialClientId: 1, initialVehicleId: 11 });
    expect(await screen.findByText('Pedro Antonio Félix')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ford Lobo 2006/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Continuar al diagnóstico' })).toBeEnabled();
  });

  it('al registrar un cliente nuevo abre enseguida el alta de su vehículo', async () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cliente y vehículo' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Nombre del cliente' }), { target: { value: 'Cliente de prueba' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Celular' }), { target: { value: '8100000009' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }));

    expect(await screen.findByRole('combobox', { name: 'Marca' }, { timeout: 3000 })).toBeInTheDocument();
    // Behind the vehicle dialog the new client is already chosen, still without a vehicle.
    await waitFor(() => expect(screen.getByText('Cliente de prueba')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Continuar al diagnóstico', hidden: true })).toBeDisabled();
  });
});
