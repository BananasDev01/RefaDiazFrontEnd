import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  cancelServiceOrder,
  completeServiceOrder,
  createServiceOrder,
  getServiceOrder,
  listReportedFailureTypes,
  searchServiceOrders,
  startServiceOrder,
  updateServiceOrder,
} from '../services/ServiceOrderService';
import type {
  ServiceOrderCreateRequest,
  ServiceOrderSearchParams,
  ServiceOrderUpdateRequest,
} from '../types/serviceOrder.types';

export const serviceOrderQueryKeys = {
  all: ['service-orders'] as const,
  lists: () => [...serviceOrderQueryKeys.all, 'list'] as const,
  list: (filters: ServiceOrderSearchParams) => [
    ...serviceOrderQueryKeys.lists(),
    filters,
  ] as const,
  details: () => [...serviceOrderQueryKeys.all, 'detail'] as const,
  detail: (externalId: string) => [
    ...serviceOrderQueryKeys.details(),
    externalId,
  ] as const,
  failureTypes: () => [...serviceOrderQueryKeys.all, 'failure-types'] as const,
};

export const useReportedFailureTypes = () => {
  return useQuery({
    queryKey: serviceOrderQueryKeys.failureTypes(),
    queryFn: listReportedFailureTypes,
    staleTime: 1000 * 60 * 60,
  });
};

export const useServiceOrderMutations = () => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const synchronizeOrder = (order: Awaited<ReturnType<typeof createServiceOrder>>) => {
    queryClient.setQueryData(serviceOrderQueryKeys.detail(order.externalId), order);
    queryClient.invalidateQueries({ queryKey: serviceOrderQueryKeys.lists() });
  };

  const createMutation = useMutation({
    mutationFn: (payload: ServiceOrderCreateRequest) => createServiceOrder(payload),
    onSuccess: (order) => {
      synchronizeOrder(order);
      showSnackbar('Orden de servicio creada exitosamente.', 'success');
    },
    onError: (error: Error) => showSnackbar(`No se pudo crear la orden: ${error.message}`, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ externalId, payload }: { externalId: string; payload: ServiceOrderUpdateRequest }) =>
      updateServiceOrder(externalId, payload),
    onSuccess: (order) => {
      synchronizeOrder(order);
      showSnackbar('Cambios guardados exitosamente.', 'success');
    },
    onError: (error: Error) => showSnackbar(`No se pudo guardar la orden: ${error.message}`, 'error'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ externalId, expectedVersion }: { externalId: string; expectedVersion: number }) =>
      completeServiceOrder(externalId, expectedVersion),
    onSuccess: (order) => {
      synchronizeOrder(order);
      showSnackbar('Orden completada.', 'success');
    },
    onError: (error: Error) => showSnackbar(`No se pudo completar la orden: ${error.message}`, 'error'),
  });

  const startMutation = useMutation({
    mutationFn: ({ externalId, expectedVersion }: { externalId: string; expectedVersion: number }) =>
      startServiceOrder(externalId, expectedVersion),
    onSuccess: (order) => {
      synchronizeOrder(order);
      showSnackbar('La orden está en progreso.', 'success');
    },
    onError: (error: Error) => showSnackbar(`No se pudo iniciar la orden: ${error.message}`, 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ externalId, expectedVersion }: { externalId: string; expectedVersion: number }) =>
      cancelServiceOrder(externalId, expectedVersion),
    onSuccess: (order) => {
      synchronizeOrder(order);
      showSnackbar('Orden cancelada.', 'success');
    },
    onError: (error: Error) => showSnackbar(`No se pudo cancelar la orden: ${error.message}`, 'error'),
  });

  return {
    createServiceOrder: createMutation.mutateAsync,
    updateServiceOrder: updateMutation.mutateAsync,
    startServiceOrder: startMutation.mutateAsync,
    completeServiceOrder: completeMutation.mutateAsync,
    cancelServiceOrder: cancelMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isTransitioning: startMutation.isPending || completeMutation.isPending || cancelMutation.isPending,
  };
};

const serviceOrderStatuses = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export const useServiceOrderStatusCounts = (clientId?: number) => {
  const queries = useQueries({
    queries: serviceOrderStatuses.map((status) => ({
      queryKey: serviceOrderQueryKeys.list({ status, clientId, limit: 1, offset: 0 }),
      queryFn: () => searchServiceOrders({ status, clientId, limit: 1, offset: 0 }),
    })),
  });

  return serviceOrderStatuses.reduce<Record<(typeof serviceOrderStatuses)[number], number | undefined>>(
    (counts, status, index) => {
      counts[status] = queries[index].data?.pagination.total;
      return counts;
    },
    { DRAFT: undefined, IN_PROGRESS: undefined, COMPLETED: undefined, CANCELLED: undefined }
  );
};

export const useServiceOrders = (
  filters: ServiceOrderSearchParams,
  enabled = true
) => {
  return useQuery({
    queryKey: serviceOrderQueryKeys.list(filters),
    queryFn: () => searchServiceOrders(filters),
    placeholderData: (previousData) => previousData,
    enabled,
  });
};

export const useServiceOrder = (externalId: string | null) => {
  return useQuery({
    queryKey: serviceOrderQueryKeys.detail(externalId ?? ''),
    queryFn: () => {
      if (!externalId) {
        throw new Error('El identificador de la orden es obligatorio.');
      }
      return getServiceOrder(externalId);
    },
    enabled: externalId !== null,
  });
};
