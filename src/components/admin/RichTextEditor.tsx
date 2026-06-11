import { useEffect, useRef, useState } from 'react';
import { Bold, Eraser, Italic, Link as LinkIcon, List, ListOrdered, Pilcrow, Type, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEditableRichText } from '@/lib/richText';

type FormatCommand = 'bold' | 'italic' | 'underline' | 'bullet' | 'numbered' | 'link' | 'clear';

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'Write here...',
  minHeightClassName = 'min-h-[220px]',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || isFocused) return;

    const nextHtml = value ? getEditableRichText(value) : '';
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
  }, [value, isFocused]);

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const applyCommand = (command: FormatCommand) => {
    focusEditor();

    if (command === 'link') {
      const url = window.prompt('Enter the link URL');
      if (!url) return;
      document.execCommand('createLink', false, url);
    } else if (command === 'bullet') {
      document.execCommand('insertUnorderedList');
    } else if (command === 'numbered') {
      document.execCommand('insertOrderedList');
    } else if (command === 'clear') {
      document.execCommand('removeFormat');
      document.execCommand('unlink');
    } else {
      document.execCommand(command);
    }

    emitChange();
  };

  const applyBlock = (tagName: 'P' | 'H2' | 'H3') => {
    focusEditor();
    document.execCommand('formatBlock', false, tagName);
    emitChange();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-md border border-border bg-secondary/20 p-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => applyBlock('P')} aria-label="Paragraph" title="Paragraph">
          <Pilcrow size={16} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyBlock('H2')} aria-label="Heading" title="Heading">
          <Type size={16} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyBlock('H3')} aria-label="Subheading" title="Subheading">
          <span className="text-xs font-semibold">H3</span>
        </Button>
        <span className="mx-1 h-8 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" onClick={() => applyCommand('bold')} aria-label="Bold" title="Bold">
          <Bold size={16} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyCommand('italic')} aria-label="Italic" title="Italic">
          <Italic size={16} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyCommand('underline')} aria-label="Underline" title="Underline">
          <Underline size={16} />
        </Button>
        <span className="mx-1 h-8 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" onClick={() => applyCommand('bullet')} aria-label="Bullet list" title="Bullet list">
          <List size={16} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyCommand('numbered')} aria-label="Numbered list" title="Numbered list">
          <ListOrdered size={16} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyCommand('link')} aria-label="Add link" title="Add link">
          <LinkIcon size={16} />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyCommand('clear')} aria-label="Clear formatting" title="Clear formatting">
          <Eraser size={16} />
        </Button>
      </div>
      <div
        ref={editorRef}
        id={id}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={() => {
          setIsFocused(false);
          emitChange();
        }}
        onFocus={() => setIsFocused(true)}
        className={`${minHeightClassName} w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5`}
      />
    </div>
  );
}
