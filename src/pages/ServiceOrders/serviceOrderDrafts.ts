import type { ServiceOrder, ServiceOrderFormValues } from '../../types/serviceOrder.types';

export interface ServiceDraft {
  format: 1;
  externalId: string;
  updatedAt: string;
  values: ServiceOrderFormValues;
  server?: ServiceOrder;
  syncedValues?: string;
  noteId?: string;
}

export function draftPrefix(): string {
  let user: unknown = null;
  try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch { /* Failed checkpoints are reported by the form. */ }
  const id = user && typeof user === 'object' && 'id' in user ? String(user.id) : 'preview';
  return `refadiaz:service-draft:v1:${id}:`;
}

export const draftKey = (id: string) => `${draftPrefix()}${id}`;

export function readDraft(key: string): ServiceDraft | null {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null') as ServiceDraft | null;
    if (data?.format !== 1 || typeof data.externalId !== 'string' || !data.values ||
      typeof data.values.reportedFailureSummary !== 'string' || !Array.isArray(data.values.reportedFailures)) return null;
    return data;
  } catch { return null; }
}

export function writeDraft(key: string, draft: ServiceDraft): void {
  localStorage.setItem(key, JSON.stringify(draft));
  window.dispatchEvent(new Event('service-drafts-changed'));
}

export function listDrafts(): ServiceDraft[] {
  try {
    const prefix = draftPrefix();
    return Object.keys(localStorage).filter((key) => key.startsWith(prefix))
      .map(readDraft).filter((draft): draft is ServiceDraft => Boolean(draft))
      .filter((draft) => !draft.server || draft.syncedValues !== JSON.stringify(draft.values))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch { return []; }
}

export function removeDraft(key: string): void {
  localStorage.removeItem(key);
  window.dispatchEvent(new Event('service-drafts-changed'));
}
