'use client';

import { Button } from '@/components/atoms/button';
import { BulletList } from '@tiptap/extension-bullet-list';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { ListItem } from '@tiptap/extension-list-item';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
  Bold,
  CheckSquare,
  Highlighter,
  Italic,
  LinkIcon,
  List,
  Table as TableIcon,
} from 'lucide-react';
import React, { useRef } from 'react';

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
      // Enhanced List Extensions
      BulletList,
      ListItem,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      // Table Extensions for Medical Records
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'medical-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      // Text Enhancement
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight',
        },
      }),
      // Link with better configuration
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
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] h-full px-3 py-2 medical-editor',
      },
    },
    immediatelyRender: false,
    // Use onUpdate callback instead of event listener for better performance
    onUpdate: ({ editor }) => {
      // Don't emit changes if we're currently updating from external prop
      if (isUpdatingFromProp.current) {
        return;
      }

      const htmlContent = editor.getHTML();
      if (htmlContent !== undefined) {
        onChangeRef.current(htmlContent);
      }
    },
  });

  // Handle external content updates (from autosave) while preserving cursor position
  React.useEffect(() => {
    if (!editor) return;

    // Get current HTML content from editor
    const currentHTML = editor.getHTML();

    // Only update if content is actually different
    if (currentHTML === value) {
      return;
    }

    // Store current selection/cursor position and focus state
    const { from, to } = editor.state.selection;
    const wasFocused = editor.isFocused;

    // Flag that we're updating from external source
    isUpdatingFromProp.current = true;

    try {
      // ✅ CRITICAL: Improved cursor preservation during autosave

      // Update content first without triggering onUpdate
      editor.commands.setContent(value, { emitUpdate: false });

      // Restore cursor position after content update if editor was focused
      if (wasFocused) {
        // Use nextTick for reliable timing after content update
        Promise.resolve().then(() => {
          if (editor && !editor.isDestroyed) {
            const newDocSize = editor.state.doc.content.size;

            // Calculate safe cursor positions
            const safeFrom = Math.min(from, Math.max(0, newDocSize - 1));
            const safeTo = Math.min(to, Math.max(0, newDocSize - 1));

            try {
              // Restore selection using setTextSelection command
              if (safeFrom === safeTo) {
                // Simple cursor position
                editor.commands.setTextSelection(safeFrom);
              } else {
                // Text selection range
                editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
              }

              // Restore focus
              editor.commands.focus();
            } catch (selectionError) {
              // Fallback: focus at end if position restoration fails
              console.warn('Cursor position restoration failed, focusing at end:', selectionError);
              editor.commands.focus('end');
            }
          }
        });
      }
    } catch (error) {
      // Fallback: simple content update without cursor preservation
      console.warn('Advanced cursor preservation failed, using fallback:', error);
      editor.commands.setContent(value, { emitUpdate: false });
      if (wasFocused) {
        editor.commands.focus('end');
      }
    } finally {
      // Reset the flag after the microtask queue completes
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
      {/* Enhanced Professional Toolbar for Medical Experts */}
      <div className="flex-none border-b bg-muted/30">
        <div className="flex flex-wrap items-center gap-1 p-2">
          {/* Text Formatting Group */}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="Highlight Text"
            style={{
              backgroundColor: editor.isActive('highlight') ? 'hsl(var(--accent))' : 'transparent',
            }}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Lists Group */}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task List / Checklist"
            style={{
              backgroundColor: editor.isActive('taskList') ? 'hsl(var(--accent))' : 'transparent',
            }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Table Group - Essential for Medical Records */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="Insert Table (3x3)"
            disabled={!editor.can().insertTable()}
          >
            <TableIcon className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Link Group */}
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

      {/* 
        TODO: Add these CSS styles to your global stylesheet:
        
        .medical-editor .medical-table {
          border-collapse: collapse;
          margin: 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }
        
        .medical-editor .medical-table td,
        .medical-editor .medical-table th {
          border: 2px solid #ced4da;
          box-sizing: border-box;
          min-width: 1em;
          padding: 3px 5px;
          position: relative;
          vertical-align: top;
        }
        
        .medical-editor .medical-table th {
          background-color: #f1f3f4;
          font-weight: bold;
        }
        
        .medical-editor .task-item {
          display: flex;
          align-items: flex-start;
          margin: 0.2rem 0;
        }
        
        .medical-editor .highlight {
          background-color: #fff3cd;
          padding: 0.1em 0.3em;
          border-radius: 0.25em;
        }
        
        .medical-editor .task-item input[type="checkbox"] {
          margin-right: 0.5rem;
          margin-top: 0.25rem;
        }
      */}
    </div>
  );
};

export default SimpleRichTextEditor;
