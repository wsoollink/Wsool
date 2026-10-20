"use client";

import { useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import { Bold, Heading2, ImagePlus, Link2, List, Loader2, Minus } from "lucide-react";
import { UPLOAD_KINDS } from "@/config/uploads";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { newsletterImageUrl, requestNewsletterUpload } from "../actions";

type Props = {
  target: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const button = "inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-navy/5 hover:text-navy disabled:opacity-40 pointer-fine:size-9";

/**
 * Formatting buttons for the newsletter body. They write the small format in src/lib/email/markup.ts
 * (## heading, **bold**, - list, [text](link), ![](image), ---) into the text, and the live preview
 * shows the real email. Images are uploaded to storage and inserted as their own block.
 */
export function MarkupToolbar({ target, value, onChange, disabled }: Props) {
  const t = useTranslations("Admin.newsletter.toolbar");
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  /** Replaces the selection and puts the cursor/selection back where it belongs. */
  const apply = (edit: (sel: string, before: string, after: string) => { text: string; select?: [number, number] }) => {
    const el = target.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start), after = value.slice(end);
    const { text, select } = edit(value.slice(start, end), before, after);
    const [a, b] = select ?? [text.length, text.length];
    // Render the new text now, so the cursor lands before the next key press.
    flushSync(() => onChange(before + text + after));
    el?.focus();
    el?.setSelectionRange(start + a, start + b);
  };

  const wrap = (mark: string, placeholder: string) =>
    apply((sel) => {
      const inner = sel || placeholder;
      return { text: `${mark}${inner}${mark}`, select: [mark.length, mark.length + inner.length] };
    });

  /** Puts a prefix at the start of every selected line (headings, list items). */
  const prefix = (mark: string, placeholder: string) =>
    apply((sel, before) => {
      const lead = before && !before.endsWith("\n") ? "\n" : "";
      const lines = (sel || placeholder).split("\n").map((l) => (l.startsWith(mark) ? l : mark + l));
      const text = lead + lines.join("\n");
      return { text, select: [lead.length + mark.length, text.length] };
    });

  /** A block on its own (image, divider): blank lines around it. */
  const block = (content: string) =>
    apply((_sel, before, after) => {
      const lead = !before ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
      const tail = !after ? "\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
      const text = lead + content + tail;
      return { text, select: [text.length, text.length] };
    });

  const link = () => {
    const url = window.prompt(t("linkPrompt"), "https://")?.trim();
    if (!url || !/^(https?:\/\/|mailto:)\S+$/.test(url)) return;
    apply((sel) => {
      const label = sel || t("linkText");
      return { text: `[${label}](${url})`, select: [1, 1 + label.length] };
    });
  };

  const pickImage = async (picked: File | undefined) => {
    if (!picked) return;
    setError("");
    setUploading(true);
    try {
      // PNG and GIF keep transparency / animation; everything else becomes a light JPEG.
      const ready = picked.type === "image/gif" ? picked : await shrinkImage(picked, 1200, 0.85, picked.type === "image/png" ? "image/png" : "image/jpeg");
      const up = await uploadFile("newsletterImage", ready, requestNewsletterUpload);
      if ("error" in up) return setError(t(`upload.${up.error}`));
      const res = await newsletterImageUrl(up.path);
      if (!res.url) return setError(t("upload.failed"));
      block(`![](${res.url})`);
    } finally {
      setUploading(false);
    }
  };

  const tools = [
    { label: t("heading"), icon: Heading2, run: () => prefix("## ", t("headingText")) },
    { label: t("bold"), icon: Bold, run: () => wrap("**", t("boldText")) },
    { label: t("list"), icon: List, run: () => prefix("- ", t("listText")) },
    { label: t("link"), icon: Link2, run: link },
    { label: t("divider"), icon: Minus, run: () => block("---") },
  ];

  return (
    <div className="flex flex-col gap-1">
      <div role="toolbar" aria-label={t("label")} className="flex flex-wrap items-center gap-0.5 rounded-[10px] border border-navy/10 bg-navy/[0.02] p-1">
        {tools.map(({ label, icon: Icon, run }) => (
          <button key={label} type="button" onClick={run} disabled={disabled} aria-label={label} title={label} className={button}>
            <Icon aria-hidden="true" size={17} />
          </button>
        ))}
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-navy/10" />
        <button type="button" onClick={() => file.current?.click()} disabled={disabled || uploading} aria-busy={uploading} className={`${button} w-auto gap-1.5 px-3 text-[13px] font-bold pointer-fine:w-auto`}>
          {uploading ? <Loader2 aria-hidden="true" size={17} className="motion-safe:animate-spin" /> : <ImagePlus aria-hidden="true" size={17} />}
          {uploading ? t("uploading") : t("image")}
        </button>
        <input
          ref={file} type="file" accept={UPLOAD_KINDS.newsletterImage.types.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true"
          onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>
      {error && <p role="alert" className="text-xs text-bad">{error}</p>}
    </div>
  );
}
