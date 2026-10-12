import type { components, operations } from '../api/refadiaz-api';
import api from './axiosConfig';
export type SignedServiceDocument = components['schemas']['SignedServiceDocument'];
export type ServiceUploadSession = components['schemas']['ServiceUploadSession'];
export type ServiceUploadInfo = components['schemas']['ServiceUploadInfo'];
type DocumentUrl = operations['getSignedServiceDocumentUrl']['responses'][200]['content']['application/json'];
const endpoint = '/service-documents';
export const listServiceDocuments = (externalId: string): Promise<SignedServiceDocument[]> => api.get(endpoint,{params:{serviceExternalId:externalId}});
export const createUploadSession = (serviceExternalId: string, expectedVersion: number): Promise<ServiceUploadSession> => api.post(`${endpoint}/sessions`,{serviceExternalId,expectedVersion});
export const revokeUploadSession = (id: string): Promise<unknown> => api.post(`${endpoint}/sessions/${id}/revoke`);
export const getServiceDocumentUrl = async (id: string): Promise<DocumentUrl> => {
  const result: DocumentUrl = await api.get(`${endpoint}/${id}/url`);
  return {...result,url:new URL(result.url,import.meta.env.VITE_SUPABASE_URL).toString()};
};
// A capability request must not clear the staff login on expiry or redirect it.
async function publicRequest<T>(path: string, body: BodyInit, headers?: HeadersInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${import.meta.env.VITE_API_REFA_BASE_PATH}${endpoint}/${path}`, {
      method: 'POST', body, headers, referrerPolicy: 'no-referrer', signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'No se pudo completar la carga. Vuelve a intentarlo.');
    return result as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('El servidor tardó demasiado. Conserva el archivo y vuelve a intentarlo.');
    if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('No se pudo conectar con el servidor. Vuelve a intentarlo.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
export const inspectUploadSession = (token: string) => publicRequest<ServiceUploadInfo>('session',JSON.stringify({token}),{'Content-Type':'application/json'});
export const uploadSignedDocument = (token: string, file: File) => {
  const body = new FormData(); body.append('token',token); body.append('file',file);
  return publicRequest<unknown>('upload',body);
};
export function mobileUploadUrl(token: string): string {
  const origin = import.meta.env.VITE_DOCUMENT_UPLOAD_ORIGIN || window.location.origin;
  return `${origin.replace(/\/$/,'')}/document-upload#${token}`;
}
