import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount every render between tests so mounted components (and their duplicate
// DOM/aria roles) never leak across test cases.
afterEach(() => cleanup());

// jsdom under Node ≥22 no longer exposes a working `localStorage` (Node's experimental
// global shadows jsdom's and is disabled without a backing file). Provide a tiny
// in-memory shim so app code that persists the auth token under test (getToken /
// setToken / clearToken) works exactly as it does in the browser.
if (typeof globalThis.localStorage === "undefined" || globalThis.localStorage === null) {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: shim,
    configurable: true,
    writable: true,
  });
}
