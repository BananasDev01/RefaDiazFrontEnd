import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { WhatsNewDialog } from './WhatsNewDialog';
import { CURRENT_RELEASE, RELEASES } from '../../constants/releases';
import { markReleaseSeen, readSeenRelease, useWhatsNew } from '../../hooks/useWhatsNew';

describe('novedades de versión', () => {
  beforeEach(() => localStorage.clear());

  it('las versiones van de la más reciente a la más antigua y la actual tiene cambios', () => {
    expect(CURRENT_RELEASE).toBe(RELEASES[0]);
    expect(CURRENT_RELEASE.changes.length).toBeGreaterThan(0);
    const dates = RELEASES.map((release) => release.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    const ids = CURRENT_RELEASE.changes.map((change) => change.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('recorre los cambios y cierra con Entendido', () => {
    const onClose = vi.fn();
    render(<WhatsNewDialog open release={CURRENT_RELEASE} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Qué hay de nuevo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: CURRENT_RELEASE.changes[0].title, level: 3 })).toBeInTheDocument();
    expect(screen.getByText(`1 de ${CURRENT_RELEASE.changes.length}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: CURRENT_RELEASE.changes[3].title }));
    expect(screen.getByRole('heading', { name: CURRENT_RELEASE.changes[3].title, level: 3 })).toBeInTheDocument();

    for (let step = 3; step < CURRENT_RELEASE.changes.length - 1; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('se muestra una sola vez por usuario y versión', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'user-1' }));
    const first = renderHook(() => useWhatsNew());
    expect(first.result.current.open).toBe(true);

    act(() => first.result.current.close());
    expect(first.result.current.open).toBe(false);
    expect(readSeenRelease('user-1')).toBe(CURRENT_RELEASE.version);
    expect(renderHook(() => useWhatsNew()).result.current.open).toBe(false);

    localStorage.setItem('user', JSON.stringify({ id: 'user-2' }));
    expect(renderHook(() => useWhatsNew()).result.current.open).toBe(true);

    markReleaseSeen('0.99', 'user-2');
    expect(renderHook(() => useWhatsNew()).result.current.open).toBe(true);
  });
});
