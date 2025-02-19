'use client';

import React from 'react';

import { BulletList } from '@tiptap/extension-bullet-list';
import { Link } from '@tiptap/extension-link';
import { ListItem } from '@tiptap/extension-list-item';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Bold, Italic, LinkIcon, List } from 'lucide-react';
import { Markdown } from 'tiptap-markdown';

import { Button } from '@/components/atoms/button';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({ value, onChange }) => {
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
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] px-3 py-2',
      },
    },
  });

  React.useEffect(() => {
    if (editor && value !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  React.useEffect(() => {
    if (editor) {
      editor.on('update', () => {
        const markdownContent = editor.storage.markdown.getMarkdown();
        onChange(markdownContent);
      });
    }
  }, [editor, onChange]);

  if (!editor) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex gap-2 border-b bg-muted/50 p-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            const url = window.prompt('Enter the URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={editor.isActive('link') ? 'bg-muted' : ''}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default SimpleRichTextEditor;
