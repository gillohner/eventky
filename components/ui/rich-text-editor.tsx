"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading2,
    Quote,
    Undo,
    Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    className?: string;
}

export function RichTextEditor({
    value = "",
    onChange,
    placeholder = "Start typing...",
    minHeight = "200px",
    className,
}: RichTextEditorProps) {
    // Track whether changes are coming from the editor itself
    const isInternalChange = useRef(false);
    // Track the last value we received from the parent to detect real external changes
    const lastExternalValue = useRef(value);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none px-4 py-3`,
                style: `min-height: ${minHeight}`,
            },
        },
        onUpdate: ({ editor: e }) => {
            isInternalChange.current = true;
            const html = e.getHTML();
            const isEmpty = e.isEmpty;
            const newValue = isEmpty ? "" : html;
            lastExternalValue.current = newValue;
            onChange?.(newValue);
        },
    });

    // Sync external value changes into the editor (e.g. when form.reset() fires in edit mode)
    useEffect(() => {
        if (!editor) return;

        // Skip if this change originated from the editor itself
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }

        // Skip if the value hasn't actually changed from what we last received/sent
        if (value === lastExternalValue.current) return;

        // Update our tracking ref
        lastExternalValue.current = value;

        const currentContent = editor.getHTML();
        const isEmpty = editor.isEmpty;

        // Only update if the external value differs from current editor content
        if (value === "" && isEmpty) return;
        if (value === currentContent) return;

        editor.commands.setContent(value || "", { emitUpdate: false });
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className={cn("border rounded-lg overflow-hidden", className)}>
            {/* Toolbar */}
            <RichTextToolbar editor={editor} />

            {/* Editor */}
            <EditorContent editor={editor} className="bg-background" />
        </div>
    );
}

interface RichTextToolbarProps {
    editor: Editor;
}

function RichTextToolbar({ editor }: RichTextToolbarProps) {
    return (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                    "h-8 px-2",
                    editor.isActive("bold") && "bg-accent"
                )}
                aria-label="Bold"
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                    "h-8 px-2",
                    editor.isActive("italic") && "bg-accent"
                )}
                aria-label="Italic"
            >
                <Italic className="h-4 w-4" />
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                className={cn(
                    "h-8 px-2",
                    editor.isActive("heading", { level: 2 }) && "bg-accent"
                )}
                aria-label="Heading"
            >
                <Heading2 className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                    "h-8 px-2",
                    editor.isActive("bulletList") && "bg-accent"
                )}
                aria-label="Bullet list"
            >
                <List className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(
                    "h-8 px-2",
                    editor.isActive("orderedList") && "bg-accent"
                )}
                aria-label="Numbered list"
            >
                <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={cn(
                    "h-8 px-2",
                    editor.isActive("blockquote") && "bg-accent"
                )}
                aria-label="Quote"
            >
                <Quote className="h-4 w-4" />
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8 px-2"
                aria-label="Undo"
            >
                <Undo className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8 px-2"
                aria-label="Redo"
            >
                <Redo className="h-4 w-4" />
            </Button>
        </div>
    );
}
