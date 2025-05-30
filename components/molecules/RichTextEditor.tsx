'use client';

import { Button } from '@/components/atoms/button';
import { BulletList } from '@tiptap/extension-bullet-list';
import { Link } from '@tiptap/extension-link';
import { ListItem } from '@tiptap/extension-list-item';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Bold, Italic, LinkIcon, List } from 'lucide-react';
import React, { useRef } from 'react';
import { Markdown } from 'tiptap-markdown';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({ value, onChange }) => {
  // Use refs to avoid stale closures and unnecessary re-renders
  const onChangeRef = useRef(onChange);
  const isUpdatingFromProp = useRef(false);

  // Update the onChange ref when it changes
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        breaks: true,
        transformPastedText: true,
      }),
      BulletList,
      ListItem,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] h-full px-3 py-2',
      },
    },
    immediatelyRender: false,
    // Use onUpdate callback instead of event listener for better performance
    onUpdate: ({ editor }) => {
      // Don't emit changes if we're currently updating from external prop
      if (isUpdatingFromProp.current) {
        return;
      }

      const markdownContent = editor.storage.markdown.getMarkdown();
      if (markdownContent !== undefined) {
        onChangeRef.current(markdownContent);
      }
    },
  });

  // Handle external content updates (from autosave) while preserving cursor position
  React.useEffect(() => {
    if (!editor) return;

    // Get current markdown content from editor
    const currentMarkdown = editor.storage.markdown.getMarkdown();

    // Only update if content is actually different
    if (currentMarkdown === value) {
      return;
    }

    // Store current selection/cursor position
    const { from, to } = editor.state.selection;
    const wasFocused = editor.isFocused;

    // Flag that we're updating from external source
    isUpdatingFromProp.current = true;

    try {
      // Update content without emitting update event
      editor.commands.setContent(value, false);

      // Restore cursor position if the editor was focused
      if (wasFocused) {
        // Use requestAnimationFrame to ensure DOM is updated before restoring selection
        requestAnimationFrame(() => {
          try {
            const newDocSize = editor.state.doc.content.size;

            // Ensure the position is still valid in the new document
            const safeFrom = Math.min(from, newDocSize);
            const safeTo = Math.min(to, newDocSize);

            // Restore selection and focus
            editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
            editor.commands.focus();
          } catch (error) {
            // If position restoration fails, just focus at the end
            console.warn('Could not restore cursor position:', error);
            editor.commands.focus('end');
          }
        });
      }
    } finally {
      // Reset the flag after the microtask queue completes for more predictable timing
      queueMicrotask(() => {
        isUpdatingFromProp.current = false;
      });
    }
  }, [value, editor]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-md border">
      {/* Improved Compact Toolbar */}
      <div className="flex-none border-b bg-muted/30">
        <div className="flex items-center gap-1 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
            style={{
              backgroundColor: editor.isActive('bold') ? 'hsl(var(--accent))' : 'transparent',
            }}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
            style={{
              backgroundColor: editor.isActive('italic') ? 'hsl(var(--accent))' : 'transparent',
            }}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
            style={{
              backgroundColor: editor.isActive('bulletList') ? 'hsl(var(--accent))' : 'transparent',
            }}
          >
            <List className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              const url = window.prompt('Enter the URL');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            title="Insert Link"
            style={{
              backgroundColor: editor.isActive('link') ? 'hsl(var(--accent))' : 'transparent',
            }}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

export default SimpleRichTextEditor;
