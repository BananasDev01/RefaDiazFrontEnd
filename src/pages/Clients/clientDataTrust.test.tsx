import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SnackbarProvider } from '../../contexts/SnackbarContext';
import { getMockClient } from '../../mocks/handlers';
import ClientCreateDialog from './ClientCreateDialog';
import ClientEditDialog from './ClientEditDialog';
import ClientVehicleDialog from './ClientVehicleDialog';
import { isRepeatablePlate, normalizePlate } from './clientSchemas';

const wrap = (node: ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <SnackbarProvider>{node}</SnackbarProvider>
  </QueryClientProvider>
);

describe('confianza en los datos de clientes', { timeout: 20_000 }, () => {
  it('normaliza placas igual que el backend y deja repetir SIN PLACAS y A LA MANO', () => {
    expect(normalizePlate('rku-483 b')).toBe('RKU483B');
    expect(isRepeatablePlate('a la mano')).toBe(true);
    expect(isRepeatablePlate('Sin Placas')).toBe(true);
    expect(isRepeatablePlate('RKU483B')).toBe(false);
  });

  it('avisa que el celular ya existe y ofrece usar ese expediente en lugar de duplicarlo', async () => {
    const onCreated = vi.fn();
    const onUseExisting = vi.fn();
    wrap(<ClientCreateDialog open onClose={vi.fn()} onCreated={onCreated} onUseExisting={onUseExisting} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del cliente' }), { target: { value: 'Otro nombre' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Celular' }), { target: { value: '8125049511' } });
    expect(await screen.findByText(/ya está registrado a nombre de/)).toHaveTextContent('Pedro Antonio Félix');
    expect(screen.queryByRole('button', { name: 'Guardar cliente' })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Usar este cliente' })[0]);
    expect(onUseExisting).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('un celular nuevo se registra normalmente', async () => {
    wrap(<ClientCreateDialog open onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Celular' }), { target: { value: '8100000077' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cliente' })).toBeInTheDocument());
    expect(screen.queryByText(/ya está registrado/)).not.toBeInTheDocument();
  });

  it('impide repetir las placas de un vehículo del mismo cliente y ofrece usar el existente', async () => {
    const onCreated = vi.fn();
    wrap(<ClientVehicleDialog clientId={1} open onClose={vi.fn()} onCreated={onCreated} />);
    const plate = screen.getByRole('textbox', { name: 'Placas (opcional)' });
    fireEvent.change(plate, { target: { value: 'rku-483 b' } });
    expect(await screen.findByText(/ya están registradas en Ford Lobo 2006/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar vehículo' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Usar ese vehículo' }));
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 11);
  });

  it('permite placas repetibles como A LA MANO', async () => {
    wrap(<ClientVehicleDialog clientId={1} open onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Placas (opcional)' }), { target: { value: 'A LA MANO' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar vehículo' })).toBeEnabled());
    expect(screen.queryByText(/ya están registradas/)).not.toBeInTheDocument();
  });

  it('edita nombre y comentarios sin tocar el celular principal', async () => {
    const onClose = vi.fn();
    wrap(<ClientEditDialog client={getMockClient(1)!} onClose={onClose} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del cliente' }), { target: { value: 'Pedro A. Félix' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Comentarios internos (opcional)' }), { target: { value: 'Ha venido tres veces' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(getMockClient(1)).toMatchObject({ clientName: 'Pedro A. Félix', comments: 'Ha venido tres veces', phoneNumber: '8125049511' });
  });
});
