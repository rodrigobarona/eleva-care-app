// Mock for next-intl/navigation to prevent ESM parsing issues in Jest

interface RouterMock {
  push: jest.MockedFunction<() => void>;
  replace: jest.MockedFunction<() => void>;
  back: jest.MockedFunction<() => void>;
  forward: jest.MockedFunction<() => void>;
  refresh: jest.MockedFunction<() => void>;
  prefetch: jest.MockedFunction<() => void>;
}

export const createNavigation = jest.fn((_routing: unknown) => ({
  Link: jest.fn(({ children }: { children: React.ReactNode }) => children),
  redirect: jest.fn((_href: string) => undefined),
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(
    (): RouterMock => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }),
  ),
  getPathname: jest.fn(() => '/'),
  permanentRedirect: jest.fn((_href: string) => undefined),
}));

// Export default createNavigation
const navigationMock = { createNavigation };
export default navigationMock;
