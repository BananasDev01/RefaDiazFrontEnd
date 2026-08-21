import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  addClientVehicles,
  createClient,
  getClient,
  searchClients,
} from '../services/ClientService';
import type {
  AddClientVehiclesRequest,
  ClientCreateRequest,
  ClientSearchParams,
} from '../types/client.types';

export const clientQueryKeys = {
  all: ['clients'] as const,
  lists: () => [...clientQueryKeys.all, 'list'] as const,
  list: (filters: ClientSearchParams) => [...clientQueryKeys.lists(), filters] as const,
  details: () => [...clientQueryKeys.all, 'detail'] as const,
  detail: (clientId: number) => [...clientQueryKeys.details(), clientId] as const,
};

export const useClients = (filters: ClientSearchParams) => {
  return useQuery({
    queryKey: clientQueryKeys.list(filters),
    queryFn: () => searchClients(filters),
    placeholderData: (previousData) => previousData,
  });
};

export const useClient = (clientId: number | null) => {
  return useQuery({
    queryKey: clientQueryKeys.detail(clientId ?? 0),
    queryFn: () => {
      if (!clientId) {
        throw new Error('El identificador del cliente es obligatorio.');
      }
      return getClient(clientId);
    },
    enabled: clientId !== null,
  });
};

export const useClientMutations = () => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const createClientMutation = useMutation({
    mutationFn: (payload: ClientCreateRequest) => createClient(payload),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.lists() });
      queryClient.setQueryData(clientQueryKeys.detail(client.id), client);
      showSnackbar(
        client.reconciledByPhone
          ? 'El teléfono ya existía; se conciliaron los vehículos nuevos.'
          : 'Cliente registrado exitosamente.',
        'success'
      );
    },
    onError: (error: Error) => {
      showSnackbar(`No se pudo registrar el cliente: ${error.message}`, 'error');
    },
  });

  const addVehiclesMutation = useMutation({
    mutationFn: ({
      clientId,
      payload,
    }: {
      clientId: number;
      payload: AddClientVehiclesRequest;
    }) => addClientVehicles(clientId, payload),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.lists() });
      queryClient.setQueryData(clientQueryKeys.detail(client.id), client);
      showSnackbar('Vehículo agregado exitosamente.', 'success');
    },
    onError: (error: Error) => {
      showSnackbar(`No se pudo agregar el vehículo: ${error.message}`, 'error');
    },
  });

  return {
    createClient: createClientMutation.mutateAsync,
    isCreatingClient: createClientMutation.isPending,
    addClientVehicles: addVehiclesMutation.mutateAsync,
    isAddingVehicles: addVehiclesMutation.isPending,
  };
};
