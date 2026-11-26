import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import {
  resetMockClients,
  resetMockProducts,
  resetMockProviders,
  resetMockVehicleNotes,
} from './mocks/handlers';
import { server } from './mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetMockProviders();
  resetMockProducts();
  resetMockVehicleNotes();
  resetMockClients();
});

afterAll(() => {
  server.close();
});

// jsdom has no layout; ProseMirror asks text ranges for their rectangles when it scrolls to the cursor.
const emptyRects = () => Object.assign([] as DOMRect[], { item: () => null }) as unknown as DOMRectList;
if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = emptyRects;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}
