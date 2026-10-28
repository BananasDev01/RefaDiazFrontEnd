import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  completeServiceOrder,
  createServiceOrder,
  deleteServiceOrder,
  getServiceOrder,
  listReportedFailureTypes,
  searchServiceOrders,
  updateServiceOrder,
} from '../services/ServiceOrderService';
import type {
  ServiceOrderCategory,
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

  const deleteMutation = useMutation({
    mutationFn: ({ externalId, expectedVersion, reason }: { externalId: string; expectedVersion: number; reason: string }) =>
      deleteServiceOrder(externalId, expectedVersion, reason),
    onSuccess: (order) => {
      synchronizeOrder(order);
      showSnackbar('Orden eliminada.', 'success');
    },
    onError: (error: Error) => showSnackbar(`No se pudo eliminar la orden: ${error.message}`, 'error'),
  });

  return {
    createServiceOrder: createMutation.mutateAsync,
    updateServiceOrder: updateMutation.mutateAsync,
    completeServiceOrder: completeMutation.mutateAsync,
    deleteServiceOrder: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isTransitioning: completeMutation.isPending || deleteMutation.isPending,
  };
};

const serviceOrderStatuses = ['IN_PROGRESS', 'COMPLETED'] as const;

export const useServiceOrderStatusCounts = (clientId?: number, category?: ServiceOrderCategory) => {
  const queries = useQueries({
    queries: serviceOrderStatuses.map((status) => ({
      queryKey: serviceOrderQueryKeys.list({ status, clientId, category, limit: 1, offset: 0 }),
      queryFn: () => searchServiceOrders({ status, clientId, category, limit: 1, offset: 0 }),
    })),
  });

  return serviceOrderStatuses.reduce<Record<(typeof serviceOrderStatuses)[number], number | undefined>>(
    (counts, status, index) => {
      counts[status] = queries[index].data?.pagination.total;
      return counts;
    },
    { IN_PROGRESS: undefined, COMPLETED: undefined }
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
