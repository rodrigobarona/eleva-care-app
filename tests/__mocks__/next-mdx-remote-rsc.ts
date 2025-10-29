/**
 * Mock for next-mdx-remote/rsc to prevent ESM parsing issues in Jest
 */

export const MDXRemote = jest.fn(() => null);
