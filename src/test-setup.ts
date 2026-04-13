import "@testing-library/jest-dom/vitest";

// jsdom doesn't include ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;
