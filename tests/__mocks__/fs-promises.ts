/**
 * Mock for fs/promises to prevent file system access during tests
 */

export const readFile = jest.fn();
export const access = jest.fn();
export const readdir = jest.fn();

const fsMock = {
  readFile,
  access,
  readdir,
};

export default fsMock;
