// MSW lifecycle for the integration tier. Unlike the unit/component tests (which
// `vi.mock` the api/* modules), these tests exercise the REAL fetch client stack
// (config base URL → apiGet/apiPost → fetch → ApiError mapping) against a mock HTTP
// server. Any request a test forgot to stub fails loudly (`onUnhandledRequest: error`)
// so a silent real network call can never pass.
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";

// Started with no default handlers — each test declares its own via `server.use(...)`.
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
