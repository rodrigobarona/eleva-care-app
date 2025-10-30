'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Using official TipTap extensions instead of custom sanitizer
import { BulletList } from '@tiptap/extension-bullet-list';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { ListItem } from '@tiptap/extension-list-item';
import { Placeholder } from '@tiptap/extension-placeholder';
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
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Highlighter,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  Loader2,
  Palette,
  Table as TableIcon,
  Type,
  Underline as UnderlineIcon,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Markdown } from 'tiptap-markdown';

interface RichTextEditorProps {
  value: string; // Markdown content
  onChange: (value: string) => void; // Returns Markdown content
  variant?: 'full' | 'simple' | 'minimal'; // Editor variant
  placeholder?: string; // Custom placeholder text
  className?: string; // Additional CSS classes
  features?: {
    images?: boolean;
    tables?: boolean;
    colors?: boolean;
    alignment?: boolean;
    typography?: boolean;
    links?: boolean;
  };
}

// Type declaration for the markdown storage extension
declare module '@tiptap/core' {
  interface Storage {
    markdown: {
      getMarkdown: () => string;
    };
  }
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  variant = 'full',
  placeholder,
  className = '',
  features = {},
}) => {
  // Default features based on variant
  const defaultFeatures = React.useMemo(() => {
    switch (variant) {
      case 'minimal':
        return {
          images: false,
          tables: false,
          colors: false,
          alignment: false,
          typography: false,
          links: false,
          ...features,
        };
      case 'simple':
        return {
          images: false,
          tables: false,
          colors: false,
          alignment: true,
          typography: true,
          links: true,
          ...features,
        };
      case 'full':
      default:
        return {
          images: true,
          tables: true,
          colors: true,
          alignment: true,
          typography: true,
          links: true,
          ...features,
        };
    }
  }, [variant, features]);
  // Use refs to avoid stale closures and unnecessary re-renders
  const onChangeRef = useRef(onChange);
  const isUpdatingFromProp = useRef(false);

  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update the onChange ref when it changes
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // All extensions used by the editor - memoized to prevent unnecessary re-renders
  const extensions = React.useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      // ✅ MARKDOWN SUPPORT: Enable proper markdown parsing and rendering
      Markdown.configure({
        html: false, // Disable HTML for security and iPhone Safari compatibility
        transformPastedText: true, // Allow pasting markdown text
        transformCopiedText: true, // Copied text is transformed to markdown
        breaks: false, // Don't convert \n to <br>
        linkify: false, // Don't auto-create links from URLs
        tightLists: true, // No <p> inside <li> for cleaner output
        bulletListMarker: '-', // Consistent list markers
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
      // Professional Placeholder
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (placeholder) {
            return placeholder;
          }
          if (node.type.name === 'heading') {
            return 'Enter heading...';
          }
          switch (variant) {
            case 'minimal':
              return 'Start typing...';
            case 'simple':
              return 'Write your content...';
            case 'full':
            default:
              return 'Start writing your medical notes...';
          }
        },
        includeChildren: true,
      }),
      // Link with better configuration
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
    ],
    [placeholder, variant],
  );

  const editor = useEditor({
    extensions,
    content: value, // Directly use Markdown content
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] h-full px-3 py-2',
      },
    },
    immediatelyRender: false,
    // Convert editor content to Markdown before calling onChange
    onUpdate: ({ editor }) => {
      // Don't emit changes if we're currently updating from external prop
      if (isUpdatingFromProp.current) {
        return;
      }

      // ✅ MARKDOWN EXTENSION: Use the tiptap-markdown extension's built-in method
      try {
        const markdownContent = editor.storage.markdown.getMarkdown();
        onChangeRef.current(markdownContent);
      } catch (error) {
        console.warn('Failed to convert to Markdown:', error);
        // Fallback to empty content to prevent corruption
        onChangeRef.current('');
      }
    },
  });

  // Handle image upload to Vercel Blob
  const handleImageUpload = async (file: File) => {
    if (!editor) return;

    // Validate file size (4.5MB limit to match project standard)
    if (file.size > 4.5 * 1024 * 1024) {
      toast.error('Image must be less than 4.5MB', {
        description: 'Please choose a smaller image file.',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Create filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filename = `medical-image-${timestamp}.${fileExtension}`;

      // Upload to Vercel Blob using the project's upload API
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(filename)}&folder=medical-images`,
        {
          method: 'POST',
          body: file,
        },
      );

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Insert the uploaded image into the editor
      editor.chain().focus().setImage({ src: data.url, alt: filename }).run();

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear the input value so the same file can be selected again
    e.target.value = '';

    handleImageUpload(file);
  };

  // Handle external content updates (from autosave) while preserving cursor position
  React.useEffect(() => {
    if (!editor || value === undefined) return;

    // Store current selection/cursor position and focus state
    const { from, to } = editor.state.selection;
    const wasFocused = editor.isFocused;

    // Flag that we're updating from external source
    isUpdatingFromProp.current = true;

    try {
      // ✅ MARKDOWN EXTENSION: Get current content as markdown for comparison
      const currentContent = editor.storage.markdown.getMarkdown();

      // Only update if content is actually different
      if (currentContent !== value) {
        // ✅ MARKDOWN EXTENSION: setContent properly parses markdown!
        editor.commands.setContent(value || '', { emitUpdate: false });

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
                console.warn(
                  'Cursor position restoration failed, focusing at end:',
                  selectionError,
                );
                editor.commands.focus('end');
              }
            }
          });
        }
      }
    } catch (error) {
      // Fallback: simple content update without cursor preservation
      console.warn('Advanced cursor preservation failed, using fallback:', error);
      editor.commands.setContent(value || '', { emitUpdate: false });
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

  // Determine which toolbar groups to show based on variant and features
  const showAdvancedFormatting =
    variant === 'full' && (defaultFeatures.colors || defaultFeatures.typography);
  const showAlignment = defaultFeatures.alignment;
  const showTables = defaultFeatures.tables;
  const showImages = defaultFeatures.images;
  const showLinks = defaultFeatures.links;
  const showBasicFormatting = variant !== 'minimal';

  return (
    <div className={`overflow-hidden rounded-md border ${className}`}>
      {/* Hidden file input for image uploads */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Enhanced Professional Toolbar for Medical Experts */}
      <div className="flex-none border-b bg-muted/30">
        <div className="flex flex-wrap items-center gap-1 p-2">
          {/* Basic Text Formatting Group */}
          {showBasicFormatting && (
            <>
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
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                title="Underline"
                style={{
                  backgroundColor: editor.isActive('underline')
                    ? 'hsl(var(--accent))'
                    : 'transparent',
                }}
              >
                <UnderlineIcon className="h-3.5 w-3.5" />
              </Button>
              {showAdvancedFormatting && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    title="Highlight Text"
                    style={{
                      backgroundColor: editor.isActive('highlight')
                        ? 'hsl(var(--accent))'
                        : 'transparent',
                    }}
                  >
                    <Highlighter className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const color = window.prompt('Enter color (e.g., #ff0000, red)');
                      if (color) {
                        editor.chain().focus().setColor(color).run();
                      }
                    }}
                    title="Text Color"
                    style={{
                      backgroundColor: editor.isActive('textStyle')
                        ? 'hsl(var(--accent))'
                        : 'transparent',
                    }}
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </>
          )}

          {(showBasicFormatting || showAlignment) && <div className="mx-1 h-5 w-px bg-border" />}

          {/* Text Alignment Group */}
          {showAlignment && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                title="Align Left"
                style={{
                  backgroundColor: editor.isActive({ textAlign: 'left' })
                    ? 'hsl(var(--accent))'
                    : 'transparent',
                }}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                title="Align Center"
                style={{
                  backgroundColor: editor.isActive({ textAlign: 'center' })
                    ? 'hsl(var(--accent))'
                    : 'transparent',
                }}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                title="Align Right"
                style={{
                  backgroundColor: editor.isActive({ textAlign: 'right' })
                    ? 'hsl(var(--accent))'
                    : 'transparent',
                }}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                title="Justify"
                style={{
                  backgroundColor: editor.isActive({ textAlign: 'justify' })
                    ? 'hsl(var(--accent))'
                    : 'transparent',
                }}
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {(showAlignment || showBasicFormatting) && <div className="mx-1 h-5 w-px bg-border" />}

          {/* Lists Group */}
          {showBasicFormatting && (
            <>
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
                title="Task List / Checklist"
                style={{
                  backgroundColor: editor.isActive('taskList')
                    ? 'hsl(var(--accent))'
                    : 'transparent',
                }}
              >
                <CheckSquare className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {(showBasicFormatting || showTables || showImages) && (
            <div className="mx-1 h-5 w-px bg-border" />
          )}

          {/* Table Group - Essential for Medical Records */}
          {showTables && (
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
          )}

          {/* Enhanced Image Upload Button */}
          {showImages && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => fileInputRef.current?.click()}
              title="Upload Image"
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          {defaultFeatures.typography && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                alert(
                  'Typography Features:\n• Smart quotes: " "\n• Fractions: 1/2, 1/4, 3/4\n• Math symbols: ±, ≠, ×\n• Superscripts: ², ³\n• Arrows: ←, →\n• Copyright: ©, ®, ™\n\n📝 Content stored as Markdown for maximum portability!',
                );
              }}
              title="Typography Help & Features"
            >
              <Type className="h-3.5 w-3.5" />
            </Button>
          )}

          {(defaultFeatures.typography || showLinks) && <div className="mx-1 h-5 w-px bg-border" />}

          {/* Link Group */}
          {showLinks && (
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
          )}
        </div>
      </div>

      <EditorContent editor={editor} />

      {/* 
        ✅ MARKDOWN-POWERED RICH TEXT EDITOR
        
        Features:
        ✅ Native Markdown Support: Uses tiptap-markdown extension for proper parsing
        ✅ Bidirectional Conversion: Seamlessly converts between Markdown and HTML
        ✅ Database-Ready: Content stored as markdown, displayed as rich HTML
        ✅ Copy/Paste Support: Handles markdown text pasting and copying
        ✅ Professional Styling: TailwindCSS utility classes for consistent design
        
        Styling Classes:
        - Medical Tables: border-collapse border-2 border-gray-300 w-full
        - Table Headers: bg-gray-100 font-bold border-2 border-gray-300 p-1
        - Table Cells: border-2 border-gray-300 p-1 align-top
        - Task Items: flex items-start my-1
        - Highlighted Text: bg-yellow-200 px-1 py-0.5 rounded
        - Medical Images: max-w-full h-auto rounded-lg border border-gray-200
        
        Benefits:
        ✅ Proper markdown parsing from database content
        ✅ Rich text editing with markdown storage
        ✅ Consistent rendering between edit and view modes
        ✅ Professional medical documentation features
        ✅ Responsive design with Tailwind utilities
      */}
    </div>
  );
};

export default RichTextEditor;
