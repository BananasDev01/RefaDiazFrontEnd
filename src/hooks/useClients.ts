import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  addClientVehicles,
  createClient,
  getClient,
  searchClients,
  updateClientContact,
} from '../services/ClientService';
import type {
  AddClientVehiclesRequest,
  ClientCreateRequest,
  ClientContactUpdateRequest,
  ClientSearchParams,
} from '../types/client.types';

export const clientQueryKeys = {
  all: ['clients'] as const,
  lists: () => [...clientQueryKeys.all, 'list'] as const,
  list: (filters: ClientSearchParams) => [...clientQueryKeys.lists(), filters] as const,
  details: () => [...clientQueryKeys.all, 'detail'] as const,
  detail: (clientId: number) => [...clientQueryKeys.details(), clientId] as const,
};

export const useClients = (filters: ClientSearchParams, enabled = true) => {
  return useQuery({
    queryKey: clientQueryKeys.list(filters),
    queryFn: () => searchClients(filters),
    placeholderData: (previousData) => previousData,
    enabled,
  });
};

/** Human message for business errors the clients API reports by code. */
export const clientErrorMessage = (error: Error) => (
  error.message.includes('VEHICLE_PLATE_DUPLICATE')
    ? 'Este cliente ya tiene un vehículo con esas placas.'
    : error.message
);

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
          ? `Ese celular ya estaba registrado a nombre de ${client.clientName}. Se usó su expediente; el nombre y los comentarios capturados no se cambiaron.`
          : 'Cliente registrado exitosamente.',
        client.reconciledByPhone ? 'info' : 'success'
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
      showSnackbar(`No se pudo agregar el vehículo: ${clientErrorMessage(error)}`, 'error');
    },
  });

  const contactMutation = useMutation({
    mutationFn: ({ clientId, payload }: { clientId: number; payload: ClientContactUpdateRequest }) => updateClientContact(clientId, payload),
    onSuccess: (client) => {
      queryClient.setQueryData(clientQueryKeys.detail(client.id), client);
      void queryClient.invalidateQueries({ queryKey: clientQueryKeys.lists() });
      showSnackbar('Datos del cliente actualizados.', 'success');
    },
    onError: (error: Error) => showSnackbar(`No se pudieron guardar los datos: ${error.message}`, 'error'),
  });

  return {
    updateClientContact: contactMutation.mutateAsync,
    isUpdatingContact: contactMutation.isPending,
    createClient: createClientMutation.mutateAsync,
    isCreatingClient: createClientMutation.isPending,
    addClientVehicles: addVehiclesMutation.mutateAsync,
    isAddingVehicles: addVehiclesMutation.isPending,
  };
};
