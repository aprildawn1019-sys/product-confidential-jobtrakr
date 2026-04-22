import "@testing-library/jest-dom";

// Guard for tests opting into the `node` environment (e.g. pure utility tests
// like `localDate.test.ts`) — `window` only exists under jsdom.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
