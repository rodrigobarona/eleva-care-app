import { detectLocaleFromHeaders } from '@/lib/i18n/utils';
import { describe, expect, test } from '@jest/globals';

class MockHeaders {
  private headers: Map<string, string>;

  constructor(headers: Record<string, string>) {
    this.headers = new Map(Object.entries(headers));
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
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
    const result = detectLocaleFromHeaders(mockHeaders);
    expect(result).toBe(expected);
  });

  describe('Edge Cases', () => {
    test('should handle missing accept-language header', () => {
      const mockHeaders = new MockHeaders({
        'x-vercel-ip-country': 'PT',
      });
      const result = detectLocaleFromHeaders(mockHeaders);
      expect(result).toBe('pt'); // Should still detect PT based on country
    });

    test('should handle invalid accept-language format', () => {
      const mockHeaders = new MockHeaders({
        'accept-language': 'invalid-format',
      });
      const result = detectLocaleFromHeaders(mockHeaders);
      expect(result).toBeNull(); // Should fallback to default
    });

    test('should handle empty headers', () => {
      const mockHeaders = new MockHeaders({});
      const result = detectLocaleFromHeaders(mockHeaders);
      expect(result).toBeNull(); // Should fallback to default
    });
  });

  describe('Country-Language Mapping', () => {
    test('should prioritize country header for Portuguese', () => {
      const mockHeaders = new MockHeaders({
        'x-vercel-ip-country': 'PT',
        'accept-language': 'en-US,en;q=0.9', // User prefers English but is in Portugal
      });
      const result = detectLocaleFromHeaders(mockHeaders);
      expect(result).toBe('pt');
    });

    test('should prioritize country header for Brazilian Portuguese', () => {
      const mockHeaders = new MockHeaders({
        'x-vercel-ip-country': 'BR',
        'accept-language': 'en-US,en;q=0.9', // User prefers English but is in Brazil
      });
      const result = detectLocaleFromHeaders(mockHeaders);
      expect(result).toBe('pt-BR');
    });
  });
});
