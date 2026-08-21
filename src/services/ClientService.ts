import type {
  AddClientVehiclesRequest,
  Client,
  ClientCreateRequest,
  ClientListResponse,
  ClientSearchParams,
} from '../types/client.types';
import axiosInstance from './axiosConfig';

const CLIENTS_ENDPOINT = '/clients';

export const searchClients = async (
  filters: ClientSearchParams = {}
): Promise<ClientListResponse> => {
  return axiosInstance.get(CLIENTS_ENDPOINT, { params: filters });
};

export const getClient = async (clientId: number): Promise<Client> => {
  return axiosInstance.get(`${CLIENTS_ENDPOINT}/${clientId}`);
};

export const createClient = async (payload: ClientCreateRequest): Promise<Client> => {
  return axiosInstance.post(CLIENTS_ENDPOINT, payload);
};

export const addClientVehicles = async (
  clientId: number,
  payload: AddClientVehiclesRequest
): Promise<Client> => {
  return axiosInstance.post(`${CLIENTS_ENDPOINT}/${clientId}/vehicles`, payload);
};
