import type {
  ReportedFailureType,
  ServiceOrder,
  ServiceOrderCreateRequest,
  ServiceOrderListResponse,
  ServiceOrderSearchParams,
  ServiceOrderUpdateRequest,
  ServiceQuickPhrase,
  ServiceQuickPhraseInput,
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

export const listQuickPhrases = async (): Promise<ServiceQuickPhrase[]> => {
  return axiosInstance.get(`${SERVICES_ENDPOINT}/quick-phrases`);
};

/** Replaces the whole shared list: edits, order, additions and removals in one call. */
export const replaceQuickPhrases = async (phrases: ServiceQuickPhraseInput[]): Promise<ServiceQuickPhrase[]> => {
  return axiosInstance.put(`${SERVICES_ENDPOINT}/quick-phrases`, { field: 'IMPORTANT_INFORMATION', phrases });
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

/** Brings a deleted order back to where it was (completed or in progress). */
export const restoreServiceOrder = async (
  externalId: string,
  expectedVersion: number
): Promise<ServiceOrder> => {
  return axiosInstance.post(`${SERVICES_ENDPOINT}/${externalId}/restore`, { expectedVersion });
};

/** Deletes the order from lists and searches; the server keeps it, with the reason, for the folio trail. */
export const deleteServiceOrder = async (
  externalId: string,
  expectedVersion: number,
  reason: string
): Promise<ServiceOrder> => {
  return axiosInstance.post(`${SERVICES_ENDPOINT}/${externalId}/cancel`, { expectedVersion, reason });
};
