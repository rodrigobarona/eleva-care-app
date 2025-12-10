/**
 * Highlight extension with Markdown support
 *
 * Extends @tiptap/extension-highlight to support markdown serialization
 * using the ==text== syntax (standard for highlights in extended markdown).
 *
 * @example
 * // In markdown: ==highlighted text==
 * // Renders as: <mark>highlighted text</mark>
 */
import { Highlight } from '@tiptap/extension-highlight';
import type MarkdownIt from 'markdown-it';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const markdownitMark: any = require('markdown-it-mark');

/**
 * Highlight extension configured for markdown serialization with tiptap-markdown.
 *
 * Uses the `addStorage()` pattern required by tiptap-markdown to define:
 * - serialize: How to convert highlight marks to markdown (==text==)
 * - parse: How to parse ==text== syntax back to highlight marks
 */
export const HighlightMarkdown = Highlight.extend({
  addStorage() {
    return {
      markdown: {
        serialize: {
          open: '==',
          close: '==',
        },
        parse: {
          setup(markdownit: MarkdownIt) {
            // Register markdown-it-mark plugin to parse ==text== syntax
            markdownit.use(markdownitMark);
          },
        },
      },
    };
  },
});

export default HighlightMarkdown;
