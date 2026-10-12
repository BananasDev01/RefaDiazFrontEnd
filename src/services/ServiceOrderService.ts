import type {
  ReportedFailureType,
  ServiceOrder,
  ServiceOrderCreateRequest,
  ServiceOrderListResponse,
  ServiceOrderSearchParams,
  ServiceOrderUpdateRequest,
} from '../types/serviceOrder.types';
import axiosInstance from './axiosConfig';

const SERVICES_ENDPOINT = '/services';

export const searchServiceOrders = async (
  filters: ServiceOrderSearchParams = {}
): Promise<ServiceOrderListResponse> => {
  return axiosInstance.get(SERVICES_ENDPOINT, { params: filters });
};

export const getServiceOrder = async (externalId: string): Promise<ServiceOrder> => {
  return axiosInstance.get(`${SERVICES_ENDPOINT}/${externalId}`);
};

export const listReportedFailureTypes = async (): Promise<ReportedFailureType[]> => {
  return axiosInstance.get(`${SERVICES_ENDPOINT}/failure-types`);
};

export const createServiceOrder = async (
  payload: ServiceOrderCreateRequest
): Promise<ServiceOrder> => {
  return axiosInstance.post(SERVICES_ENDPOINT, payload);
};

export const updateServiceOrder = async (
  externalId: string,
  payload: ServiceOrderUpdateRequest
): Promise<ServiceOrder> => {
  return axiosInstance.put(`${SERVICES_ENDPOINT}/${externalId}`, payload);
};

export const completeServiceOrder = async (
  externalId: string,
  expectedVersion: number
): Promise<ServiceOrder> => {
  return axiosInstance.post(`${SERVICES_ENDPOINT}/${externalId}/complete`, { expectedVersion });
};

export const startServiceOrder = async (
  externalId: string,
  expectedVersion: number
): Promise<ServiceOrder> => {
  return axiosInstance.post(`${SERVICES_ENDPOINT}/${externalId}/start`, { expectedVersion });
};

export const cancelServiceOrder = async (
  externalId: string,
  expectedVersion: number
): Promise<ServiceOrder> => {
  return axiosInstance.post(`${SERVICES_ENDPOINT}/${externalId}/cancel`, { expectedVersion });
};
