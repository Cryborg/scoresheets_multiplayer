import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.matchMedia only in jsdom environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Suppress console logs during tests unless in verbose mode
if (!process.env.VERBOSE_TESTS) {
  const originalConsoleError = console.error;
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn((...args) => {
      // Suppress known test warnings but keep real errors for debugging
      const message = args[0]?.toString?.() || '';
      if (
        message.includes('Not implemented: navigation') ||
        message.includes('Error fetching players') ||
        message.includes('Error reading stored sessions') ||
        message.includes('Session reconnection check failed')
      ) {
        return; // Suppress expected test errors
      }
      // For unexpected errors, call original
      return originalConsoleError.apply(console, args);
    }),
  };
}