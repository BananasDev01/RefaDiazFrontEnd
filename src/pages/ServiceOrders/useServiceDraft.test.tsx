import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { ReportedFailureType, ServiceOrder, ServiceOrderFormValues } from '../../types/serviceOrder.types';
import { createServiceOrder, updateServiceOrder } from '../../services/ServiceOrderService';
import { createFormValues } from './serviceOrderFormData';
import { draftKey, listDrafts, readDraft, writeDraft } from './serviceOrderDrafts';
import { CHECKPOINT_IDLE_MS, useServiceDraft } from './useServiceDraft';

vi.mock('../../services/ServiceOrderService', () => ({ createServiceOrder: vi.fn(), updateServiceOrder: vi.fn(), getServiceOrder: vi.fn() }));
const types: ReportedFailureType[] = [{ id: 1, code: 'RADIATOR_SERVICE', label: 'Servicio radiador', displayOrder: 1, allowsFreeText: false, active: true }];
const id = 'd893d655-3284-4586-9d17-ced490664daf';
const saved: ServiceOrder = { id: 1, externalId: id, provisionalReference: 'QA', folioSeries: 'SER', status: 'DRAFT', version: 1, clientVehicleId: 11, clientId: 1, vehicleId: 1, serviceDate: '2026-09-12', compressionLeakDetected: false, taxAmount: 0, total: 0, clientSnapshot: {}, vehicleSnapshot: {}, legalTextSnapshot: {}, reportedFailures: [], items: [], lineTotalsMode: 'LINES' };
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
const setup = (initial?: ServiceOrder, defaults = createFormValues(types, initial)) => renderHook(() => {
  const form = useForm<ServiceOrderFormValues>({ defaultValues: defaults });
  const draft = useServiceDraft(draftKey(id), id, form, initial, types);
  return { form, draft };
}, { wrapper });
const idle = () => act(async () => { await vi.advanceTimersByTimeAsync(1300); });

describe('respaldo y sincronización de borradores', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.mocked(createServiceOrder).mockResolvedValue(saved); vi.mocked(updateServiceOrder).mockResolvedValue({ ...saved, version: 2 }); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('respalda la captura incompleta inmediatamente y no crea registros inválidos', async () => {
    const { result } = setup();
    act(() => result.current.form.setValue('reportedFailureSummary', 'Depósito con sarro'));
    expect(readDraft(draftKey(id))?.values.reportedFailureSummary).toBe('Depósito con sarro');
    expect(listDrafts()).toHaveLength(1);
    await idle();
    expect(createServiceOrder).not.toHaveBeenCalled();
  });

  it('crea automáticamente al tener cliente y vehículo, luego actualiza el mismo UUID', async () => {
    const { result } = setup();
    act(() => { result.current.form.setValue('clientId', 1); result.current.form.setValue('clientVehicleId', 11); });
    await idle();
    expect(createServiceOrder).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createServiceOrder).mock.calls[0][0].externalId).toBe(id);
    expect(result.current.draft.synced).toBe(true);
    act(() => result.current.form.setValue('reportedFailureSummary', 'Texto nuevo'));
    await idle();
    expect(updateServiceOrder).toHaveBeenCalledWith(id, expect.objectContaining({ expectedVersion: 1, reportedFailureSummary: 'Texto nuevo' }));
    expect(createServiceOrder).toHaveBeenCalledTimes(1);
  });

  it('no pierde lo escrito mientras el servidor responde', async () => {
    let resolve!: (value: ServiceOrder) => void;
    vi.mocked(createServiceOrder).mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result } = setup();
    act(() => { result.current.form.setValue('clientId', 1); result.current.form.setValue('clientVehicleId', 11); });
    await idle();
    act(() => result.current.form.setValue('reportedFailureSummary', 'Editado durante envío'));
    await act(async () => resolve(saved));
    expect(result.current.form.getValues('reportedFailureSummary')).toBe('Editado durante envío');
    expect(result.current.draft.synced).toBe(false);
    await idle();
    expect(updateServiceOrder).toHaveBeenCalledWith(id, expect.objectContaining({ reportedFailureSummary: 'Editado durante envío' }));
  });

  it('conserva la copia y reutiliza UUID tras una falla de red', async () => {
    vi.mocked(createServiceOrder).mockRejectedValueOnce(new Error('Sin conexión'));
    const { result } = setup();
    act(() => { result.current.form.setValue('clientId', 1); result.current.form.setValue('clientVehicleId', 11); });
    await idle();
    expect(result.current.draft.error).toBe('Sin conexión');
    expect(readDraft(draftKey(id))).not.toBeNull();
    await act(async () => { await result.current.draft.save(); });
    expect(vi.mocked(createServiceOrder).mock.calls.map(([payload]) => payload.externalId)).toEqual([id, id]);
  });

  it('recupera después de desmontar sin necesitar completar el formulario', () => {
    const first = setup();
    act(() => first.result.current.form.setValue('radiatorSerialNumber', '022588'));
    first.unmount();
    const values = readDraft(draftKey(id))!.values;
    const second = setup(undefined, values);
    expect(second.result.current.form.getValues('radiatorSerialNumber')).toBe('022588');
    expect(second.result.current.draft.recovered).toBe(true);
  });

  it('separa respaldos por usuario y advierte si el almacenamiento está lleno', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'empleado-1' }));
    const key = draftKey(id);
    const { result } = setup();
    act(() => result.current.form.setValue('reportedFailureSummary', 'Privado'));
    localStorage.setItem('user', JSON.stringify({ id: 'empleado-2' }));
    expect(listDrafts()).toHaveLength(0);
    expect(readDraft(key)).not.toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    act(() => result.current.form.setValue('reportedFailureSummary', 'No respaldado'));
    // Within a burst the next checkpoint is written once typing pauses.
    await act(async () => { await vi.advanceTimersByTimeAsync(CHECKPOINT_IDLE_MS); });
    expect(result.current.draft.error).toContain('No se pudo respaldar');
  });

  it('no sobrescribe una orden cuando la versión del servidor cambió', async () => {
    const values = createFormValues(types, saved); values.reportedFailureSummary = 'Edición pendiente';
    writeDraft(draftKey(id), { format: 1, externalId: id, updatedAt: new Date().toISOString(), values, server: saved, syncedValues: 'anterior' });
    const { result } = setup({ ...saved, version: 2 }, values);
    await idle();
    expect(result.current.draft.hasConflict).toBe(true);
    expect(updateServiceOrder).not.toHaveBeenCalled();
  });

  it('ignora un respaldo limpio cuando se carga una versión nueva del servidor', () => {
    const values = createFormValues(types, saved);
    writeDraft(draftKey(id), { format: 1, externalId: id, updatedAt: new Date().toISOString(), values, server: saved, syncedValues: JSON.stringify(values) });
    const { result } = setup({ ...saved, version: 2, reportedFailureSummary: 'Versión nueva' });
    expect(result.current.draft.recovered).toBe(false);
    expect(result.current.form.getValues('reportedFailureSummary')).toBe('Versión nueva');
    expect(result.current.draft.synced).toBe(true);
  });

  it('pausa los envíos si otra pestaña cambia la misma captura', async () => {
    const { result } = setup(saved);
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: draftKey(id) })));
    act(() => result.current.form.setValue('reportedFailureSummary', 'Otra edición'));
    await idle();
    expect(result.current.draft.hasConflict).toBe(true);
    expect(updateServiceOrder).not.toHaveBeenCalled();
  });

  it('las órdenes en progreso conservan respaldo pero no se actualizan automáticamente', async () => {
    const { result } = setup({ ...saved, status: 'IN_PROGRESS' });
    act(() => result.current.form.setValue('reportedFailureSummary', 'Pendiente'));
    await idle();
    expect(updateServiceOrder).not.toHaveBeenCalled();
    expect(readDraft(draftKey(id))?.values.reportedFailureSummary).toBe('Pendiente');
  });

  it('agrupa una ráfaga de cambios en el primer respaldo y uno final', async () => {
    const { result } = setup();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    act(() => { for (let i = 1; i <= 20; i += 1) result.current.form.setValue('reportedFailureSummary', 'x'.repeat(i)); });
    expect(setItem).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(CHECKPOINT_IDLE_MS); });
    expect(setItem).toHaveBeenCalledTimes(2);
    expect(readDraft(draftKey(id))?.values.reportedFailureSummary).toBe('x'.repeat(20));
  });

  it('al desmontar a media ráfaga respalda lo último escrito', () => {
    const first = setup();
    act(() => { first.result.current.form.setValue('radiatorSerialNumber', '1'); first.result.current.form.setValue('radiatorSerialNumber', '12345'); });
    first.unmount();
    expect(readDraft(draftKey(id))?.values.radiatorSerialNumber).toBe('12345');
  });

  it('una orden completada sigue editable con respaldo y guardado explícito', async () => {
    const completed = { ...saved, status: 'COMPLETED' as const };
    const { result } = setup(completed);
    act(() => result.current.form.setValue('reportedFailureSummary', 'Ajuste posterior a la entrega'));
    await idle();
    expect(readDraft(draftKey(id))?.values.reportedFailureSummary).toBe('Ajuste posterior a la entrega');
    expect(updateServiceOrder).not.toHaveBeenCalled();
    expect(result.current.draft.synced).toBe(false);
    await act(async () => { await result.current.draft.save(); });
    expect(updateServiceOrder).toHaveBeenCalledWith(id, expect.objectContaining({ reportedFailureSummary: 'Ajuste posterior a la entrega' }));
  });

  it('al cancelar muestra los datos persistidos y elimina el respaldo descartado', () => {
    const { result } = setup({ ...saved, status: 'IN_PROGRESS' });
    act(() => result.current.form.setValue('reportedFailureSummary', 'Cambio sin guardar'));
    act(() => result.current.draft.acceptTransition({ ...saved, status: 'CANCELLED' }));
    expect(result.current.form.getValues('reportedFailureSummary')).toBe(saved.reportedFailureSummary ?? '');
    expect(result.current.draft.synced).toBe(true);
    expect(readDraft(draftKey(id))).toBeNull();
  });
});
