import type {
  AddClientVehiclesRequest,
  Client,
  ClientCreateRequest,
  ClientContactUpdateRequest,
  ClientListResponse,
  ClientSearchParams,
} from '../types/client.types';
import axiosInstance from './axiosConfig';

const CLIENTS_ENDPOINT = '/clients';

export const updateClientContact = async (clientId: number, payload: ClientContactUpdateRequest): Promise<Client> =>
  axiosInstance.patch(`${CLIENTS_ENDPOINT}/${clientId}`, payload);

export const searchClients = async (
  filters: ClientSearchParams = {}
): Promise<ClientListResponse> => {
  return axiosInstance.get(CLIENTS_ENDPOINT, { params: filters });
};

export const getClient = async (clientId: number): Promise<Client> => {
  return axiosInstance.get(`${CLIENTS_ENDPOINT}/${clientId}`);
};

export const createClient = async (payload: ClientCreateRequest): Promise<Client> => {
  const client: Client = await axiosInstance.post(CLIENTS_ENDPOINT, payload);
  if (payload.secondaryPhoneNumber && !client.secondaryPhoneNumber) {
    throw new Error('El cliente se registró, pero el servidor aún no admite el teléfono secundario. Actualiza el backend antes de continuar con ese dato.');
  }
  return client;
};

export const addClientVehicles = async (
  clientId: number,
  payload: AddClientVehiclesRequest
): Promise<Client> => {
  return axiosInstance.post(`${CLIENTS_ENDPOINT}/${clientId}/vehicles`, payload);
};
