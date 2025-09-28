'use client';

import { BulletList } from '@tiptap/extension-bullet-list';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { ListItem } from '@tiptap/extension-list-item';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Typography } from '@tiptap/extension-typography';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import React from 'react';

interface MarkdownViewerProps {
  content: string; // Markdown content
  className?: string;
}

/**
 * MarkdownViewer Component
 *
 * Renders Markdown content using TipTap editor in read-only mode for consistent styling
 * with the RichTextEditor. This ensures that content created in the editor
 * displays exactly the same way when viewed.
 *
 * Features:
 * - Uses the same extensions as RichTextEditor for consistency
 * - Read-only TipTap editor instance for proper Markdown parsing
 * - Supports all rich text features: tables, images, links, etc.
 * - Consistent styling with the editing experience
 */
const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => {
  // Use the same extensions as RichTextEditor for consistency
  const extensions = React.useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      // Professional Typography
      Typography,
      // Text Styling Foundation
      TextStyle,
      // Enhanced Text Formatting
      Underline,
      Color.configure({
        types: ['textStyle'],
      }),
      // Text Alignment for Professional Documents
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      // Enhanced List Extensions
      BulletList,
      ListItem,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start my-1',
        },
      }),
      // Table Extensions for Medical Records
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse m-0 overflow-hidden table-fixed w-full border-2 border-gray-300',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class:
            'bg-gray-100 font-bold border-2 border-gray-300 box-border min-w-4 p-1 relative align-top',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border-2 border-gray-300 box-border min-w-4 p-1 relative align-top',
        },
      }),
      // Image Support for Medical Diagrams
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg border border-gray-200',
        },
      }),
      // Text Enhancement
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'bg-yellow-200 px-1 py-0.5 rounded',
        },
      }),
      // Link with better configuration
      Link.configure({
        openOnClick: true, // Allow clicking links in read-only mode
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
    ],
    [],
  );

  // Create a read-only TipTap editor instance to properly parse and display Markdown
  const editor = useEditor({
    extensions,
    content: content || '', // Set the Markdown content directly
    editable: false, // Read-only mode
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none ${className}`,
      },
    },
    immediatelyRender: false,
  });

  // Update content when it changes
  React.useEffect(() => {
    if (editor && content !== undefined) {
      const currentHTML = editor.getHTML();
      // Only update if content is actually different to avoid unnecessary re-renders
      if (currentHTML !== content) {
        editor.commands.setContent(content || '', { emitUpdate: false });
      }
    }
  }, [editor, content]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  // Return empty if no content
  if (!content || content.trim() === '') {
    return null;
  }

  // Return null while editor is loading
  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
};

export default MarkdownViewer;
