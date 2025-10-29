/**
 * Mock for remark-gfm to prevent ESM parsing issues in Jest
 */

const remarkGfm = jest.fn(() => () => {});

export default remarkGfm;
