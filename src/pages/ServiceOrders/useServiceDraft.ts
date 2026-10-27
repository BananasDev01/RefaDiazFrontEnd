import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { v4 as uuid } from 'uuid';
import type { ReportedFailureType, ServiceOrder, ServiceOrderFormValues } from '../../types/serviceOrder.types';
import { createServiceOrder, getServiceOrder, updateServiceOrder } from '../../services/ServiceOrderService';
import { serviceOrderQueryKeys } from '../../hooks/useServiceOrders';
import { buildWriteFields, createFormValues } from './serviceOrderFormData';
import { serviceOrderSchema } from './serviceOrderSchema';
import { readDraft, writeDraft, removeDraft, type ServiceDraft } from './serviceOrderDrafts';

/** Idle time after which a burst of edits is checkpointed once more. */
export const CHECKPOINT_IDLE_MS = 300;

// Only cancelled orders are closed records; completed ones stay editable.
const isClosed = (order?: ServiceOrder) => order?.status === 'CANCELLED';

/**
 * Local checkpoint for each burst of edits (first change immediately, the rest
 * once typing pauses); server writes are explicit, serialized and versioned.
 * There are no server drafts: an order exists once the operator creates it.
 */
export function useServiceDraft(key: string, externalId: string, form: UseFormReturn<ServiceOrderFormValues>, initialOrder: ServiceOrder | undefined, types: ReportedFailureType[]) {
  const queryClient = useQueryClient();
  const recovered = useRef<ServiceDraft | null | undefined>(undefined);
  if (recovered.current === undefined) {
    const stored = readDraft(key);
    recovered.current = initialOrder && (isClosed(initialOrder) || stored?.syncedValues === JSON.stringify(stored?.values)) ? null : stored;
  }
  const server = useRef<ServiceOrder | undefined>(initialOrder ?? recovered.current?.server);
  const [order, setOrder] = useState(server.current);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setRevision] = useState(0);
  const active = useRef(true);
  const queue = useRef<Promise<ServiceOrder> | null>(null);
  const acknowledged = useRef(recovered.current?.syncedValues ?? (initialOrder ? JSON.stringify(form.getValues()) : ''));
  const conflict = useRef(Boolean(recovered.current?.server && initialOrder && recovered.current.server.version !== initialOrder.version && recovered.current.syncedValues !== JSON.stringify(recovered.current.values)));
  const noteId = useRef(recovered.current?.noteId ?? uuid());
  const hasCheckpoint = useRef(Boolean(recovered.current));
  const burstTimer = useRef<number | null>(null);
  const trailingPending = useRef(false);

  const checkpoint = () => {
    if (conflict.current) return false;
    const values = structuredClone(form.getValues());
    const record: ServiceDraft = { format: 1, externalId, values, noteId: noteId.current, server: server.current, syncedValues: acknowledged.current, updatedAt: new Date().toISOString() };
    try { writeDraft(key, record); hasCheckpoint.current = true; return true; }
    catch { if (active.current) setError('No se pudo respaldar en este navegador. No cierres la pantalla hasta guardar en servidor.'); return false; }
  };
  const checkpointRef = useRef(checkpoint);
  checkpointRef.current = checkpoint;

  const settle = () => {
    if (checkpointRef.current() && active.current) setStatus('Guardado en este dispositivo');
    if (active.current) setRevision((value) => value + 1);
  };
  /** Writes a pending trailing checkpoint now (before saving, leaving or hiding the page). */
  const flushPending = () => {
    if (burstTimer.current !== null) { window.clearTimeout(burstTimer.current); burstTimer.current = null; }
    if (trailingPending.current) { trailingPending.current = false; settle(); }
  };
  const flushRef = useRef(flushPending);
  flushRef.current = flushPending;
  const dropPending = () => {
    if (burstTimer.current !== null) { window.clearTimeout(burstTimer.current); burstTimer.current = null; }
    trailingPending.current = false;
  };

  useEffect(() => {
    active.current = true;
    if (recovered.current) {
      if (conflict.current) setError('La orden cambió en otro lugar. Tu captura se recuperó, pero no se sobrescribirá el servidor. Revisa los cambios antes de continuar.');
      else setStatus(recovered.current.syncedValues === JSON.stringify(form.getValues()) ? 'Guardado en servidor' : 'Captura recuperada en este dispositivo');
    }
    const subscription = form.watch(() => {
      if (isClosed(server.current)) return;
      if (burstTimer.current === null) settle();
      else { trailingPending.current = true; window.clearTimeout(burstTimer.current); }
      burstTimer.current = window.setTimeout(() => {
        burstTimer.current = null;
        if (trailingPending.current) { trailingPending.current = false; settle(); }
      }, CHECKPOINT_IDLE_MS);
    });
    const warn = (event: BeforeUnloadEvent) => {
      flushRef.current();
      if ((hasCheckpoint.current || form.formState.isDirty) && JSON.stringify(form.getValues()) !== acknowledged.current) { event.preventDefault(); event.returnValue = ''; }
    };
    const hidden = () => { if (document.visibilityState === 'hidden') flushRef.current(); };
    const otherTab = (event: StorageEvent) => {
      if (event.key === key) { conflict.current = true; setError('Esta captura cambió en otra pestaña. Se pausó la sincronización para evitar sobrescribir información.'); }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('storage', otherTab);
    return () => {
      active.current = false;
      subscription.unsubscribe();
      // Leaving the screen must not lose the last keystrokes of a burst.
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current);
      burstTimer.current = null;
      if (trailingPending.current) { trailingPending.current = false; checkpointRef.current(); }
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('storage', otherTab);
    };
  }, [key, form]);

  const save = async (): Promise<ServiceOrder> => {
    if (queue.current) { await queue.current; return save(); }
    if (conflict.current) throw new Error('Hay un conflicto de versiones. La copia local se conserva; vuelve al listado y revisa la orden.');
    dropPending();
    const values = structuredClone(form.getValues());
    if (server.current && JSON.stringify(values) === acknowledged.current) return server.current;
    checkpointRef.current();
    setBusy(true); setStatus('Guardando en servidor…'); setError(null);
    const pending = (async () => {
      await serviceOrderSchema.validate(values, { abortEarly: false });
      const fields = buildWriteFields(values, types);
      // Stable note identity across an uncertain network retry.
      if (fields.internalNotes.length) fields.internalNotes[0].externalId = noteId.current;
      let saved: ServiceOrder;
      if (server.current) {
        saved = await updateServiceOrder(externalId, { ...fields, externalId, expectedVersion: server.current.version });
      } else {
        saved = await createServiceOrder({ ...fields, externalId, provisionalReference: `PEND-SER-${externalId.slice(0, 8).toUpperCase()}` });
        if (saved.idempotentReplay) {
          // The first POST may have succeeded before the connection was lost.
          // Preserve that record, then explicitly update its recovered draft only.
          const comparable = (value: ReturnType<typeof buildWriteFields>) => JSON.stringify({ ...value, internalNotes: [], reportedFailures: value.reportedFailures.map((row) => ({ reportedFailureTypeId: row.reportedFailureTypeId, otherText: row.otherText, amount: row.amount, observation: row.observation })) });
          if (comparable(fields) !== comparable(buildWriteFields(createFormValues(types, saved), types))) {
            server.current = saved;
            checkpointRef.current();
            throw Object.assign(new Error('Existe una versión guardada diferente. Tu captura local se conserva; revisa la orden antes de sobrescribirla.'), { statusCode: 409 });
          }
        }
      }
      server.current = saved;
      acknowledged.current = JSON.stringify(values);
      if (values.internalNote) noteId.current = uuid();
      if (values.internalNote && form.getValues('internalNote') === values.internalNote) {
        values.internalNote = '';
        acknowledged.current = JSON.stringify(values);
        form.setValue('internalNote', '');
      }
      queryClient.setQueryData(serviceOrderQueryKeys.detail(externalId), saved);
      void queryClient.invalidateQueries({ queryKey: serviceOrderQueryKeys.lists() });
      // Never reset the form on a network response: typing may have continued.
      checkpointRef.current();
      if (active.current) { setOrder(saved); setStatus(JSON.stringify(form.getValues()) === acknowledged.current ? 'Guardado en servidor' : 'Guardado en este dispositivo'); setRevision((value) => value + 1); }
      return saved;
    })();
    queue.current = pending;
    try { return await pending; }
    catch (failure) {
      if (active.current) { setStatus('Pendiente de sincronizar'); setError(failure instanceof Error ? failure.message : 'No se pudo sincronizar.'); }
      conflict.current = (failure as { statusCode?: number }).statusCode === 409;
      throw failure;
    } finally { queue.current = null; if (active.current) setBusy(false); }
  };

  const acceptTransition = (next: ServiceOrder) => {
    server.current = next; setOrder(next); setError(null);
    if (next.status === 'COMPLETED' || next.status === 'CANCELLED') {
      // A confirmed closing transition shows the persisted record, not any
      // edits intentionally discarded when cancelling the order.
      const values = createFormValues(types, next);
      acknowledged.current = JSON.stringify(values);
      form.reset(values);
      dropPending();
      removeDraft(key);
      hasCheckpoint.current = false;
    } else checkpointRef.current();
    setStatus(JSON.stringify(form.getValues()) === acknowledged.current ? 'Guardado en servidor' : 'Guardado en este dispositivo');
    setRevision((value) => value + 1);
  };
  const reloadServer = async () => {
    const fresh = await getServiceOrder(externalId);
    const values = createFormValues(types, fresh);
    conflict.current = false; server.current = fresh; acknowledged.current = JSON.stringify(values);
    form.reset(values); dropPending(); setOrder(fresh); setError(null); setStatus('Guardado en servidor'); checkpointRef.current();
    setRevision((value) => value + 1);
  };
  // `revision` changes once per burst, so comparing the whole form only happens then.
  const synced = JSON.stringify(form.getValues()) === acknowledged.current;
  return { order, save, busy, status, error, acceptTransition, hasConflict: conflict.current, reloadServer, synced, recovered: Boolean(recovered.current), discardLocal: () => { dropPending(); removeDraft(key); }, flushPending };
}
