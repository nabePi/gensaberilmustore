'use client';

import Image from '@tiptap/extension-image';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRef, useState } from 'react';

const toolbarButtonBase =
  'inline-flex items-center justify-center rounded-sm px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const toolbarButtonIdle = 'text-neutral-600 hover:bg-neutral-100';
const toolbarButtonActive = 'bg-brand-50 text-brand';

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolbarButton({ label, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${toolbarButtonBase} ${active ? toolbarButtonActive : toolbarButtonIdle}`}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Tulis konten artikel...',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Image,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[240px] px-3.5 py-2.5 text-sm text-foreground outline-none [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-bold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-200 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-brand [&_a]:underline [&_img]:my-3 [&_img]:rounded-md',
      },
    },
  });

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return null;
      return {
        bold: ctx.editor.isActive('bold'),
        italic: ctx.editor.isActive('italic'),
        strike: ctx.editor.isActive('strike'),
        h2: ctx.editor.isActive('heading', { level: 2 }),
        h3: ctx.editor.isActive('heading', { level: 3 }),
        bulletList: ctx.editor.isActive('bulletList'),
        orderedList: ctx.editor.isActive('orderedList'),
        blockquote: ctx.editor.isActive('blockquote'),
        link: ctx.editor.isActive('link'),
        canUndo: ctx.editor.can().undo(),
        canRedo: ctx.editor.can().redo(),
      };
    },
  });

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Masukkan URL tautan:', previousUrl ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/admin/uploads', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setUploadError(data.error ?? 'Gagal mengunggah gambar');
      setUploading(false);
      return;
    }

    const data: { url: string } = await response.json();
    editor.chain().focus().setImage({ src: data.url }).run();
    setUploading(false);
    event.target.value = '';
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-sm border border-neutral-200 bg-white focus-within:border-brand">
        <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 px-2 py-1.5">
          <ToolbarButton
            label="B"
            active={editorState?.bold}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="I"
            active={editorState?.italic}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="S"
            active={editorState?.strike}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          />
          <span className="mx-1 h-4 w-px bg-neutral-200" />
          <ToolbarButton
            label="H2"
            active={editorState?.h2}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="H3"
            active={editorState?.h3}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <span className="mx-1 h-4 w-px bg-neutral-200" />
          <ToolbarButton
            label="• List"
            active={editorState?.bulletList}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="1. List"
            active={editorState?.orderedList}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="❝"
            active={editorState?.blockquote}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <span className="mx-1 h-4 w-px bg-neutral-200" />
          <ToolbarButton label="Link" active={editorState?.link} onClick={setLink} />
          <ToolbarButton
            label="Gambar"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          />
          <span className="mx-1 h-4 w-px bg-neutral-200" />
          <ToolbarButton
            label="↺"
            disabled={!editorState?.canUndo}
            onClick={() => editor?.chain().focus().undo().run()}
          />
          <ToolbarButton
            label="↻"
            disabled={!editorState?.canRedo}
            onClick={() => editor?.chain().focus().redo().run()}
          />
          {uploading ? (
            <span className="text-xs text-neutral-400">Mengunggah gambar...</span>
          ) : null}
        </div>
        <EditorContent editor={editor} placeholder={placeholder} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
      {uploadError ? <p className="text-xs text-red">{uploadError}</p> : null}
    </div>
  );
}
