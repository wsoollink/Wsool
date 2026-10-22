"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import {
  AlignCenter, Bold, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Minus, Palette, Redo2, SquareDashed, Undo2,
} from "lucide-react";
import { EmojiPicker } from "@/components/admin/EmojiPicker";
import { UPLOAD_KINDS } from "@/config/uploads";
import { TEXT_COLORS } from "@/lib/email/markup";
import { insertText } from "@/lib/text-insert";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { newsletterImageUrl, requestNewsletterUpload } from "../actions";

type Props = {
  target: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};
type Color = keyof typeof TEXT_COLORS;

const button = "inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-navy/5 hover:text-navy disabled:opacity-40 pointer-fine:size-9";
const divider = <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-navy/10" />;

/**
 * Formatting buttons for the newsletter body. They write the small format in src/lib/email/markup.ts
 * (## heading, **bold**, *italic*, [blue]…[/blue], lists, links, images, [center], [box], ---) into the
 * text, and the live preview shows the real email. Edits go in like typing, so undo/redo works.
 */
export function MarkupToolbar({ target, value, onChange, disabled }: Props) {
  const t = useTranslations("Admin.newsletter.toolbar");
  const file = useRef<HTMLInputElement>(null);
  const colorBox = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [colors, setColors] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!colors) return;
    const away = (e: PointerEvent) => { if (!colorBox.current?.contains(e.target as Node)) setColors(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setColors(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [colors]);

  /** Replaces the selection and puts the cursor/selection back where it belongs. */
  const apply = (edit: (sel: string, before: string, after: string) => { text: string; select?: [number, number] }) => {
    const el = target.current;
    if (!el) return;
    const current = el.value ?? value;
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const { text, select } = edit(current.slice(start, end), current.slice(0, start), current.slice(end));
    const [a, b] = select ?? [text.length, text.length];
    // The fallback renders the new text at once, so the cursor lands before the next key press.
    insertText(el, text, (v) => flushSync(() => onChange(v)));
    el.focus();
    el.setSelectionRange(start + a, start + b);
  };

  const wrap = (open: string, close: string, placeholder: string) =>
    apply((sel) => {
      const inner = sel || placeholder;
      return { text: `${open}${inner}${close}`, select: [open.length, open.length + inner.length] };
    });

  /** Puts a prefix at the start of every selected line (headings, list items). */
  const prefix = (mark: (i: number) => string, placeholder: string) =>
    apply((sel, before) => {
      const lead = before && !before.endsWith("\n") ? "\n" : "";
      const lines = (sel || placeholder).split("\n").map((l, i) => mark(i) + l.replace(/^(## |- |\d{1,3}[.)] )/, ""));
      const text = lead + lines.join("\n");
      return { text, select: [lead.length + mark(0).length, text.length] };
    });

  /** Blank lines around a piece of its own (image, divider, centred or boxed part). */
  const around = (before: string, after: string) => ({
    lead: !before ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n",
    tail: !after ? "\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n",
  });

  const block = (content: string) =>
    apply((_sel, before, after) => {
      const { lead, tail } = around(before, after);
      const text = lead + content + tail;
      return { text, select: [text.length, text.length] };
    });

  /** [center] / [box] marks on their own lines around the selected lines. */
  const section = (mark: "center" | "box", placeholder: string) =>
    apply((sel, before, after) => {
      const { lead, tail } = around(before, after);
      const inner = sel.trim() || placeholder;
      const text = `${lead}[${mark}]\n${inner}\n[/${mark}]${tail}`;
      const from = lead.length + mark.length + 3;
      return { text, select: [from, from + inner.length] };
    });

  const link = () => {
    const url = window.prompt(t("linkPrompt"), "https://")?.trim();
    if (!url || !/^(https?:\/\/|mailto:)\S+$/.test(url)) return;
    apply((sel) => {
      const label = sel || t("linkText");
      return { text: `[${label}](${url})`, select: [1, 1 + label.length] };
    });
  };

  const color = (c: Color) => {
    setColors(false);
    wrap(`[${c}]`, `[/${c}]`, t("colorText"));
  };

  const history = (command: "undo" | "redo") => {
    target.current?.focus();
    try { document.execCommand(command); } catch { /* not supported: nothing to do */ }
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

  const groups = [
    [
      { label: t("heading"), icon: Heading2, run: () => prefix(() => "## ", t("headingText")) },
      { label: t("bold"), icon: Bold, run: () => wrap("**", "**", t("boldText")) },
      { label: t("italic"), icon: Italic, run: () => wrap("*", "*", t("italicText")) },
    ],
    [
      { label: t("list"), icon: List, run: () => prefix(() => "- ", t("listText")) },
      { label: t("numbered"), icon: ListOrdered, run: () => prefix((i) => `${i + 1}. `, t("listText")) },
      { label: t("center"), icon: AlignCenter, run: () => section("center", t("centerText")) },
      { label: t("box"), icon: SquareDashed, run: () => section("box", t("boxText")) },
    ],
    [
      { label: t("link"), icon: Link2, run: link },
      { label: t("divider"), icon: Minus, run: () => block("---") },
    ],
  ];

  return (
    <div className="flex flex-col gap-1">
      <div role="toolbar" aria-label={t("label")} className="flex flex-wrap items-center gap-0.5 rounded-[10px] border border-navy/10 bg-navy/[0.02] p-1">
        {groups.map((tools, i) => (
          <span key={i} className="contents">
            {i > 0 && divider}
            {tools.map(({ label, icon: Icon, run }) => (
              <button key={label} type="button" onClick={run} disabled={disabled} aria-label={label} title={label} className={button}>
                <Icon aria-hidden="true" size={17} />
              </button>
            ))}
            {i === 0 && (
              <div ref={colorBox} className="relative">
                <button type="button" onClick={() => setColors(!colors)} disabled={disabled} aria-expanded={colors} aria-label={t("color")} title={t("color")} className={button}>
                  <Palette aria-hidden="true" size={17} />
                </button>
                {colors && (
                  <div role="menu" aria-label={t("color")} className="absolute start-0 top-full z-30 mt-1 flex flex-col rounded-[12px] border border-line bg-card p-1 shadow-lg">
                    {(Object.keys(TEXT_COLORS) as Color[]).map((c) => (
                      <button key={c} type="button" role="menuitem" onClick={() => color(c)} className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-bold whitespace-nowrap hover:bg-navy/5 pointer-fine:min-h-9">
                        <span aria-hidden="true" className="size-4 rounded-full" style={{ background: TEXT_COLORS[c] }} />
                        <span style={{ color: TEXT_COLORS[c] }}>{t(`colors.${c}`)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </span>
        ))}
        {divider}
        <EmojiPicker disabled={disabled} onPick={(e) => apply(() => ({ text: e }))} />
        <button type="button" onClick={() => file.current?.click()} disabled={disabled || uploading} aria-busy={uploading} className={`${button} w-auto gap-1.5 px-3 text-[13px] font-bold pointer-fine:w-auto`}>
          {uploading ? <Loader2 aria-hidden="true" size={17} className="motion-safe:animate-spin" /> : <ImagePlus aria-hidden="true" size={17} />}
          {uploading ? t("uploading") : t("image")}
        </button>
        <span className="ms-auto flex">
          <button type="button" onClick={() => history("undo")} disabled={disabled} aria-label={t("undo")} title={t("undo")} className={button}>
            <Undo2 aria-hidden="true" size={17} className="rtl:-scale-x-100" />
          </button>
          <button type="button" onClick={() => history("redo")} disabled={disabled} aria-label={t("redo")} title={t("redo")} className={button}>
            <Redo2 aria-hidden="true" size={17} className="rtl:-scale-x-100" />
          </button>
        </span>
        <input
          ref={file} type="file" accept={UPLOAD_KINDS.newsletterImage.types.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true"
          onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>
      {error && <p role="alert" className="text-xs text-bad">{error}</p>}
    </div>
  );
}
