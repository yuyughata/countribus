"use client";

import { useEffect, useRef } from "react";

import { Bold, Italic, Link2, List, ListOrdered, Underline } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Minimal rich-text editor (contentEditable + execCommand). Uncontrolled after
 * mount to keep the caret stable; emits HTML on input. Remount via `key` to
 * load different content.
 */
export function RichText({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML);
  }
  function exec(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    emit();
  }

  const btn =
    "flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground";

  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      <div className="border-border bg-surface-muted/50 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        <select
          aria-label="Text style"
          className="bg-surface text-foreground border-border mr-1 rounded-md border px-2 py-1 text-xs"
          onChange={(e) => {
            exec("formatBlock", e.target.value);
            e.currentTarget.value = "p";
          }}
          defaultValue="p"
        >
          <option value="p">Normal text</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>
        <button type="button" className={btn} title="Bold" onClick={() => exec("bold")}>
          <Bold className="size-4" />
        </button>
        <button type="button" className={btn} title="Italic" onClick={() => exec("italic")}>
          <Italic className="size-4" />
        </button>
        <button type="button" className={btn} title="Underline" onClick={() => exec("underline")}>
          <Underline className="size-4" />
        </button>
        <span className="bg-border mx-1 h-5 w-px" />
        <button
          type="button"
          className={btn}
          title="Bulleted list"
          onClick={() => exec("insertUnorderedList")}
        >
          <List className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          title="Numbered list"
          onClick={() => exec("insertOrderedList")}
        >
          <ListOrdered className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          title="Link"
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) exec("createLink", url);
          }}
        >
          <Link2 className="size-4" />
        </button>
        <button
          type="button"
          className="text-muted hover:text-foreground ml-1 rounded-md px-2 py-1 text-xs"
          title="Clear formatting"
          onClick={() => exec("removeFormat")}
        >
          Clear
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        className={cn(
          "min-h-[220px] px-4 py-3 text-sm leading-relaxed focus:outline-none",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold",
          "[&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        )}
      />
    </div>
  );
}
