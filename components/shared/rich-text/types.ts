/**
 * Shared type declarations for TipTap markdown editors
 *
 * This module augments the @tiptap/core module to include
 * the markdown storage type from the tiptap-markdown extension.
 */

// Type declaration for the markdown storage extension
declare module '@tiptap/core' {
  interface Storage {
    markdown: {
      getMarkdown: () => string;
    };
  }
}

export {};
