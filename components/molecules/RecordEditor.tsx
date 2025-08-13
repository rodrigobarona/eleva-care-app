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
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown';
import {
  Bold,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  Table as TableIcon,
} from 'lucide-react';
import { marked } from 'marked';
import React from 'react';

interface RecordEditorProps {
  value: string; // Markdown content
  onChange: (value: string) => void; // Returns Markdown content
  readOnly?: boolean;
  autoFocus?: boolean;
}

// Convert Markdown to HTML for display in editor
const markdownToHtml = async (markdown: string): Promise<string> => {
  try {
    // Configure marked for better compatibility with medical content
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Line breaks
    });

    return await marked.parse(markdown);
  } catch (error) {
    console.warn('Failed to parse Markdown, using as-is:', error);
    return markdown; // Fallback to original content
  }
};

const RecordEditor: React.FC<RecordEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
}) => {
  // All extensions used by the editor
  const extensions = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    BulletList,
    ListItem,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline hover:text-primary/80',
      },
    }),
    Highlight.configure({
      multicolor: true,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ];

  const editor = useEditor({
    extensions,
    content: '', // Start with empty content, will be set via useEffect
    editable: !readOnly,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] h-full px-3 py-2',
      },
    },
    // Convert editor content to Markdown before calling onChange
    onUpdate: ({ editor }) => {
      // ✅ BEST PRACTICE: Store as Markdown for scalability and platform agnosticism
      try {
        const markdownContent = renderToMarkdown({
          extensions,
          content: editor.getJSON(),
        });
        onChange(markdownContent);
      } catch (error) {
        console.warn('Failed to convert to Markdown, falling back to HTML:', error);
        // Fallback to HTML if Markdown conversion fails
        const htmlContent = editor.getHTML();
        onChange(htmlContent);
      }
    },
  });

  // Handle external content updates
  React.useEffect(() => {
    if (!editor || !value) return;

    // Convert Markdown to HTML for editor display
    markdownToHtml(value)
      .then((htmlContent) => {
        if (editor && !editor.isDestroyed) {
          const currentHTML = editor.getHTML();

          // Only update if content is actually different
          if (currentHTML !== htmlContent) {
            editor.commands.setContent(htmlContent, { emitUpdate: false });
          }
        }
      })
      .catch((error) => {
        console.warn('Failed to convert Markdown to HTML:', error);
        // Fallback: try to set content directly
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(value, { emitUpdate: false });
        }
      });
  }, [value, editor]);

  // Initialize editor content from props
  React.useEffect(() => {
    if (!editor || !value) return;

    // Convert initial Markdown to HTML
    markdownToHtml(value).then((htmlContent) => {
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(htmlContent, { emitUpdate: false });
      }
    });
  }, [editor]); // Only run when editor is created

  if (!editor) {
    return null;
  }

  if (readOnly) {
    return <EditorContent editor={editor} className="h-full" />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none border-b bg-muted/30">
        <div className="flex items-center gap-1 overflow-x-auto p-2">
          <div className="flex items-center gap-1 border-r border-border/50 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
              data-active={editor.isActive('bold')}
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
              title="Highlight"
              style={{
                backgroundColor: editor.isActive('highlight')
                  ? 'hsl(var(--accent))'
                  : 'transparent',
              }}
            >
              <Highlighter className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border-r border-border/50 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
              style={{
                backgroundColor: editor.isActive('heading', { level: 1 })
                  ? 'hsl(var(--accent))'
                  : 'transparent',
              }}
            >
              <Heading1 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
              style={{
                backgroundColor: editor.isActive('heading', { level: 2 })
                  ? 'hsl(var(--accent))'
                  : 'transparent',
              }}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
              style={{
                backgroundColor: editor.isActive('heading', { level: 3 })
                  ? 'hsl(var(--accent))'
                  : 'transparent',
              }}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border-r border-border/50 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
              style={{
                backgroundColor: editor.isActive('bulletList')
                  ? 'hsl(var(--accent))'
                  : 'transparent',
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
              title="Task List"
              style={{
                backgroundColor: editor.isActive('taskList') ? 'hsl(var(--accent))' : 'transparent',
              }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              }}
              title="Insert Table"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};

export default RecordEditor;
