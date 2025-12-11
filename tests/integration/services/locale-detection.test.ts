import { detectLocaleFromHeaders } from '@/lib/i18n/utils';

class MockHeaders {
  private headers: Map<string, string[]>;

  constructor(headers: Record<string, string | undefined>) {
    this.headers = new Map(
      Object.entries(headers)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k.toLowerCase(), [v as string]]),
    );
  }

  get(name: string): string | null {
    const values = this.headers.get(name.toLowerCase());
    return values && values.length > 0 ? values[0] : null;
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  forEach(callbackfn: (value: string, key: string, parent: Headers) => void): void {
    this.headers.forEach((values, key) => {
      // For forEach, we return the concatenated values (standard Headers behavior)
      callbackfn(values.join(', '), key, this as unknown as Headers);
    });
  }

  append(name: string, value: string): void {
    const normalizedName = name.toLowerCase();
    const existing = this.headers.get(normalizedName);
    if (existing) {
      existing.push(value);
    } else {
      this.headers.set(normalizedName, [value]);
    }
  }

  delete(name: string): void {
    this.headers.delete(name.toLowerCase());
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), [value]);
  }

  entries(): IterableIterator<[string, string]> {
    // Convert Map<string, string[]> to IterableIterator<[string, string]>
    const entriesArray: [string, string][] = [];
    this.headers.forEach((values, key) => {
      entriesArray.push([key, values.join(', ')]);
    });
    return entriesArray[Symbol.iterator]();
  }

  keys(): IterableIterator<string> {
    return this.headers.keys();
  }

  values(): IterableIterator<string> {
    const valuesArray: string[] = [];
    this.headers.forEach((values) => {
      valuesArray.push(values.join(', '));
    });
    return valuesArray[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }

  getSetCookie(): string[] {
    return [];
  }
}

describe('Locale Detection Integration Tests', () => {
  const testCases = [
    {
      name: 'Portuguese visitor from Portugal (geolocation)',
      headers: {
        'x-vercel-ip-country': 'PT',
        'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8',
      },
      expected: 'pt',
    },
    {
      name: 'Brazilian visitor (geolocation)',
      headers: {
        'x-vercel-ip-country': 'BR',
        'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      expected: 'pt-BR',
    },
    {
      name: 'Portuguese language preference without country header',
      headers: {
        'accept-language': 'pt,en;q=0.9',
      },
      expected: 'pt',
    },
    {
      name: 'Explicit pt-PT language preference',
      headers: {
        'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8',
      },
      expected: 'pt',
    },
    {
      name: 'Explicit pt-BR language preference',
      headers: {
        'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      expected: 'pt-BR',
    },
    {
      name: 'US visitor with English',
      headers: {
        'x-vercel-ip-country': 'US',
        'accept-language': 'en-US,en;q=0.9',
      },
      expected: null, // Should use default (en)
    },
  ];

  test.each(testCases)('$name', ({ headers, expected }) => {
    const mockHeaders = new MockHeaders(headers);
    const result = detectLocaleFromHeaders(mockHeaders as unknown as Headers);
    expect(result).toBe(expected);
  });

  describe('Edge Cases', () => {
    test('should handle missing accept-language header', () => {
      const mockHeaders = new MockHeaders({
        'x-vercel-ip-country': 'PT',
      });
      const result = detectLocaleFromHeaders(mockHeaders as unknown as Headers);
      expect(result).toBe('pt'); // Should still detect PT based on country
    });

    test('should handle invalid accept-language format', () => {
      const mockHeaders = new MockHeaders({
        'accept-language': 'invalid-format',
      });
      const result = detectLocaleFromHeaders(mockHeaders as unknown as Headers);
      expect(result).toBeNull(); // Should fallback to default
    });

    test('should handle empty headers', () => {
      const mockHeaders = new MockHeaders({});
      const result = detectLocaleFromHeaders(mockHeaders as unknown as Headers);
      expect(result).toBeNull(); // Should fallback to default
    });
  });

  describe('Country-Language Mapping', () => {
    test('should prioritize country header for Portuguese', () => {
      const mockHeaders = new MockHeaders({
        'x-vercel-ip-country': 'PT',
        'accept-language': 'en-US,en;q=0.9', // User prefers English but is in Portugal
      });
      const result = detectLocaleFromHeaders(mockHeaders as unknown as Headers);
      expect(result).toBe('pt');
    });

    test('should prioritize country header for Brazilian Portuguese', () => {
      const mockHeaders = new MockHeaders({
        'x-vercel-ip-country': 'BR',
        'accept-language': 'en-US,en;q=0.9', // User prefers English but is in Brazil
      });
      const result = detectLocaleFromHeaders(mockHeaders as unknown as Headers);
      expect(result).toBe('pt-BR');
    });
  });
});
