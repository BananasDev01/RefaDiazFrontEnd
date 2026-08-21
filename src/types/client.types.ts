import type { components, operations } from '../api/refadiaz-api';

export type Pagination = components['schemas']['Pagination'];
export type Client = components['schemas']['ClientResponse'];
export type ClientListResponse = components['schemas']['ClientListResponse'];
export type ClientCreateRequest = components['schemas']['ClientCreateRequest'];
export type ClientVehicle = components['schemas']['VehicleResponse'];
export type ClientVehicleInput = components['schemas']['VehicleInput'];
export type AddClientVehiclesRequest = components['schemas']['AddClientVehiclesRequest'];
export type ClientSearchParams = NonNullable<
  operations['searchClients']['parameters']['query']
>;

export interface ClientVehicleFormValues {
  brandId: number | null;
  carModelId: number | null;
  modelYear: number | null;
  version: string;
  color: string;
  plate: string;
  comments: string;
}

export interface ClientFormValues {
  clientName: string;
  phoneNumber: string;
  comments: string;
}
