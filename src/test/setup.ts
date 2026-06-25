// Minimal polyfills so components that rely on ResizeObserver (e.g. Recharts'
// ResponsiveContainer) can render under jsdom without throwing.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub
}
