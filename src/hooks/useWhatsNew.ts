import { useCallback, useState } from 'react';
import { CURRENT_RELEASE } from '../constants/releases';
import { getStoredUser } from '../services/AuthService';

const storageKey = (userId: string) => `refadiaz:release-seen:${userId}`;

const currentUserId = () => getStoredUser()?.id ?? 'anonymous';

export const readSeenRelease = (userId = currentUserId()): string | null => {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
};

export const markReleaseSeen = (version: string, userId = currentUserId()) => {
  try {
    localStorage.setItem(storageKey(userId), version);
  } catch {
    // Sin almacenamiento disponible la ventana volverá a mostrarse; no es crítico.
  }
};

/** Abre las novedades una sola vez por usuario y versión. */
export const useWhatsNew = () => {
  const [open, setOpen] = useState(
    () => CURRENT_RELEASE.changes.length > 0 && readSeenRelease() !== CURRENT_RELEASE.version,
  );

  const close = useCallback(() => {
    markReleaseSeen(CURRENT_RELEASE.version);
    setOpen(false);
  }, []);

  return { open, release: CURRENT_RELEASE, close };
};
