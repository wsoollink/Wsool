"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { NodeSelection } from "@tiptap/pm/state";
import {
  AlignCenter, AlignLeft, AlignRight, Baseline, Bold, CheckSquare, Heading2, Heading3, Highlighter, ImagePlus, Italic, Link2, List,
  ListOrdered, Loader2, Minus, MousePointerClick, MoveVertical, Pilcrow, Quote, Redo2, SquareDashed, Strikethrough, Trash2, Type,
  Underline as UnderlineIcon, Undo2,
} from "lucide-react";
import { EmojiPicker } from "@/components/admin/EmojiPicker";
import { UPLOAD_KINDS } from "@/config/uploads";
import { BOX_TONES, BUTTON_COLORS, RICH_COLORS, RICH_HIGHLIGHTS, RICH_SIZES, SPACER_SIZES, toDoc } from "@/lib/rich-text";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { Box, ButtonNode, CheckableBulletList, RichImage, Spacer } from "./rich-extensions";

/** Where images go: each editor passes its upload kind and the two server actions (signed upload + checked public URL). */
export type ImageUpload = {
  kind: "newsletterImage" | "academyImage";
  request: Parameters<typeof uploadFile>[2];
  url: (path: string) => Promise<{ url?: string; error?: string }>;
};

type Props = {
  id: string;
  /** Stored body: rich JSON, or the old text format (converted when the editor opens). */
  value: string;
  onChange: (json: string) => void;
  lang: "ar" | "en";
  upload: ImageUpload;
  disabled?: boolean;
  labelledBy?: string;
};

const btn = "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-navy/5 hover:text-navy disabled:opacity-40 aria-pressed:bg-blue/10 aria-pressed:text-blue pointer-fine:size-9";
const sep = <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-navy/10" />;
const field = "h-11 w-full rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] outline-none focus:border-blue focus:ring-3 focus:ring-blue/15";
const URL_OK = /^(https?:\/\/|mailto:)\S+$/i;
/** Buttons in the toolbars keep the editor's focus and selection; fields inside the menus (link, button) still take focus. */
const keepFocus = (e: ReactMouseEvent) => {
  if ((e.target as HTMLElement).closest("button") && !(e.target as HTMLElement).closest("form")) e.preventDefault();
};

/** A toolbar button that opens a small panel (colours, sizes, forms). Closes on outside tap or Escape. */
function Menu({ label, icon, children, disabled, wide }: { label: string; icon: ReactNode; children: (close: () => void) => ReactNode; disabled?: boolean; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as globalThis.Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} disabled={disabled} aria-expanded={open} aria-haspopup="true" aria-label={label} title={label} className={btn}>
        {icon}
      </button>
      {open && (
        <div className={`absolute start-0 top-full z-40 mt-1 flex flex-col gap-1 rounded-[12px] border border-line bg-card p-2 shadow-lg ${wide ? "w-72 max-w-[85vw]" : "min-w-40"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Item({ onClick, children, active }: { onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-bold whitespace-nowrap hover:bg-navy/5 aria-pressed:bg-blue/10 pointer-fine:min-h-9">
      {children}
    </button>
  );
}

/**
 * Word-like editor for newsletter issues and Academy articles (owner, Nov 2026): headings, bold/italic/underline/strike,
 * text colour, highlighter, size, alignment, lists (incl. ✓), quote, coloured boxes, divider, space, links, buttons and
 * images (size, alignment, caption, link). Saves rich JSON that src/lib/rich-text.ts cleans on the server and renders.
 */
export function RichEditor({ id, value, onChange, lang, upload, disabled, labelledBy }: Props) {
  const t = useTranslations("Admin.newsletter.toolbar");
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: false,
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["mailto"], HTMLAttributes: { class: "ac-link", rel: null, target: null } },
      }),
      CheckableBulletList,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
      RichImage,
      Box,
      Spacer,
      ButtonNode,
    ],
    content: toDoc(value),
    editorProps: {
      attributes: {
        id, dir: lang === "ar" ? "rtl" : "ltr", lang, role: "textbox", "aria-multiline": "true",
        ...(labelledBy && { "aria-labelledby": labelledBy }),
        class: "ac-body min-h-72 px-4 py-3 outline-none text-[16px]",
      },
    },
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
  });

  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }: { editor: Editor | null }) => {
      if (!e) return null;
      const sel = e.state.selection;
      const node = sel instanceof NodeSelection ? sel.node : null;
      return {
        bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
        h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
        bullet: e.isActive("bulletList", { check: false }), check: e.isActive("bulletList", { check: true }), ordered: e.isActive("orderedList"),
        quote: e.isActive("blockquote"), box: e.isActive("box"), link: e.isActive("link"),
        alignL: e.isActive({ textAlign: "left" }), alignC: e.isActive({ textAlign: "center" }), alignR: e.isActive({ textAlign: "right" }),
        color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
        size: (e.getAttributes("textStyle").fontSize as string | undefined) ?? null,
        image: node?.type.name === "image" ? (node.attrs as Record<string, string>) : null,
        button: node?.type.name === "button" ? (node.attrs as Record<string, string>) : null,
        canUndo: e.can().undo(), canRedo: e.can().redo(),
      };
    },
  });

  if (!editor || !s) return <div className="min-h-80 animate-pulse rounded-[10px] border border-navy/15 bg-card" />;
  const chain = () => editor.chain().focus();
  const off = disabled;

  const pickImage = async (picked: File | undefined) => {
    if (!picked) return;
    setError("");
    setUploading(true);
    try {
      const ready = picked.type === "image/gif" ? picked : await shrinkImage(picked, 1200, 0.85, picked.type === "image/png" ? "image/png" : "image/jpeg");
      const up = await uploadFile(upload.kind, ready, upload.request);
      if ("error" in up) return setError(t(`upload.${up.error}`));
      const res = await upload.url(up.path);
      if (!res.url) return setError(t("upload.failed"));
      chain().insertContent({ type: "image", attrs: { src: res.url, alt: "", size: "full", align: "center", caption: "", href: "" } }).run();
    } finally {
      setUploading(false);
    }
  };

  const setImage = (attrs: Record<string, string>) => chain().updateAttributes("image", attrs).run();
  const setButton = (attrs: Record<string, string>) => chain().updateAttributes("button", attrs).run();
  const aligns = [
    { key: "right", icon: AlignRight, active: s.alignR },
    { key: "center", icon: AlignCenter, active: s.alignC },
    { key: "left", icon: AlignLeft, active: s.alignL },
  ] as const;

  return (
    <div className="flex flex-col gap-1">
      <div className="rounded-[10px] border border-navy/15 bg-card shadow-card focus-within:border-blue focus-within:ring-3 focus-within:ring-blue/15">
        {/* Pressing a toolbar button must not take the cursor out of the text, or the next letter typed is lost. */}
        <div role="toolbar" aria-label={t("label")} onMouseDown={keepFocus} className="z-20 flex flex-wrap items-center gap-0.5 rounded-t-[10px] border-b border-navy/10 bg-card/95 p-1 backdrop-blur md:sticky md:top-16">
          <button type="button" disabled={off} aria-pressed={!s.h2 && !s.h3} aria-label={t("paragraph")} title={t("paragraph")} onClick={() => chain().setParagraph().run()} className={btn}><Pilcrow aria-hidden="true" size={17} /></button>
          <button type="button" disabled={off} aria-pressed={s.h2} aria-label={t("heading")} title={t("heading")} onClick={() => chain().toggleHeading({ level: 2 }).run()} className={btn}><Heading2 aria-hidden="true" size={17} /></button>
          <button type="button" disabled={off} aria-pressed={s.h3} aria-label={t("heading3")} title={t("heading3")} onClick={() => chain().toggleHeading({ level: 3 }).run()} className={btn}><Heading3 aria-hidden="true" size={17} /></button>
          {sep}
          <button type="button" disabled={off} aria-pressed={s.bold} aria-label={t("bold")} title={`${t("bold")} (Ctrl+B)`} onClick={() => chain().toggleBold().run()} className={btn}><Bold aria-hidden="true" size={17} /></button>
          <button type="button" disabled={off} aria-pressed={s.italic} aria-label={t("italic")} title={`${t("italic")} (Ctrl+I)`} onClick={() => chain().toggleItalic().run()} className={btn}><Italic aria-hidden="true" size={17} /></button>
          <button type="button" disabled={off} aria-pressed={s.underline} aria-label={t("underline")} title={`${t("underline")} (Ctrl+U)`} onClick={() => chain().toggleUnderline().run()} className={btn}><UnderlineIcon aria-hidden="true" size={17} /></button>
          <button type="button" disabled={off} aria-pressed={s.strike} aria-label={t("strike")} title={t("strike")} onClick={() => chain().toggleStrike().run()} className={btn}><Strikethrough aria-hidden="true" size={17} /></button>
          <Menu label={t("color")} disabled={off} icon={<Baseline aria-hidden="true" size={17} style={s.color ? { color: s.color } : undefined} />}>
            {(close) => (
              <>
                <div className="grid grid-cols-4 gap-1">
                  {(Object.keys(RICH_COLORS) as (keyof typeof RICH_COLORS)[]).map((c) => (
                    <button key={c} type="button" aria-label={t(`colors.${c}`)} title={t(`colors.${c}`)} aria-pressed={s.color?.toLowerCase() === RICH_COLORS[c].toLowerCase()}
                      onClick={() => { chain().setColor(RICH_COLORS[c]).run(); close(); }}
                      className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-navy/5 aria-pressed:ring-2 aria-pressed:ring-blue pointer-fine:size-9">
                      <span aria-hidden="true" className="size-6 rounded-full" style={{ background: RICH_COLORS[c] }} />
                    </button>
                  ))}
                </div>
                <Item onClick={() => { chain().unsetColor().run(); close(); }}>{t("noColor")}</Item>
              </>
            )}
          </Menu>
          <Menu label={t("highlight")} disabled={off} icon={<Highlighter aria-hidden="true" size={17} />}>
            {(close) => (
              <>
                <div className="grid grid-cols-5 gap-1">
                  {(Object.keys(RICH_HIGHLIGHTS) as (keyof typeof RICH_HIGHLIGHTS)[]).map((c) => (
                    <button key={c} type="button" aria-label={t(`highlights.${c}`)} title={t(`highlights.${c}`)}
                      onClick={() => { chain().setHighlight({ color: RICH_HIGHLIGHTS[c] }).run(); close(); }}
                      className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-navy/5 pointer-fine:size-9">
                      <span aria-hidden="true" className="size-6 rounded-md border border-navy/10" style={{ background: RICH_HIGHLIGHTS[c] }} />
                    </button>
                  ))}
                </div>
                <Item onClick={() => { chain().unsetHighlight().run(); close(); }}>{t("noHighlight")}</Item>
              </>
            )}
          </Menu>
          <Menu label={t("size")} disabled={off} icon={<Type aria-hidden="true" size={17} />}>
            {(close) => (
              <>
                <Item active={s.size === RICH_SIZES.small} onClick={() => { chain().setFontSize(RICH_SIZES.small).run(); close(); }}><span className="text-xs">{t("sizes.small")}</span></Item>
                <Item active={!s.size} onClick={() => { chain().unsetFontSize().run(); close(); }}>{t("sizes.normal")}</Item>
                <Item active={s.size === RICH_SIZES.large} onClick={() => { chain().setFontSize(RICH_SIZES.large).run(); close(); }}><span className="text-lg">{t("sizes.large")}</span></Item>
              </>
            )}
          </Menu>
          {sep}
          {aligns.map(({ key, icon: Icon, active }) => (
            <button key={key} type="button" disabled={off} aria-pressed={active} aria-label={t(`align.${key}`)} title={t(`align.${key}`)} onClick={() => chain().setTextAlign(key).run()} className={btn}>
              <Icon aria-hidden="true" size={17} />
            </button>
          ))}
          {sep}
          <button type="button" disabled={off} aria-pressed={s.bullet} aria-label={t("list")} title={t("list")} onClick={() => (s.check ? chain().updateAttributes("bulletList", { check: false }).run() : chain().toggleBulletList().run())} className={btn}><List aria-hidden="true" size={17} /></button>
          <button type="button" disabled={off} aria-pressed={s.ordered} aria-label={t("numbered")} title={t("numbered")} onClick={() => chain().toggleOrderedList().run()} className={btn}><ListOrdered aria-hidden="true" size={17} /></button>
          <button
            type="button" disabled={off} aria-pressed={s.check} aria-label={t("checklist")} title={t("checklist")} className={btn}
            onClick={() => {
              if (s.check) return chain().toggleBulletList().run();
              if (s.bullet) return chain().updateAttributes("bulletList", { check: true }).run();
              chain().toggleBulletList().updateAttributes("bulletList", { check: true }).run();
            }}
          ><CheckSquare aria-hidden="true" size={17} /></button>
          {sep}
          <button type="button" disabled={off} aria-pressed={s.quote} aria-label={t("quote")} title={t("quote")} onClick={() => chain().toggleBlockquote().run()} className={btn}><Quote aria-hidden="true" size={17} /></button>
          <Menu label={t("box")} disabled={off} icon={<SquareDashed aria-hidden="true" size={17} />}>
            {(close) => (
              <>
                {(Object.keys(BOX_TONES) as (keyof typeof BOX_TONES)[]).map((tone) => (
                  <Item key={tone} onClick={() => { (s.box ? chain().updateAttributes("box", { tone }) : chain().wrapIn("box", { tone })).run(); close(); }}>
                    <span aria-hidden="true" className="size-4 rounded" style={{ background: BOX_TONES[tone].bg, border: `1px solid ${BOX_TONES[tone].border}` }} />
                    {t(`tones.${tone}`)}
                  </Item>
                ))}
                {s.box && <Item onClick={() => { chain().lift("box").run(); close(); }}>{t("removeBox")}</Item>}
              </>
            )}
          </Menu>
          <button type="button" disabled={off} aria-label={t("divider")} title={t("divider")} onClick={() => chain().setHorizontalRule().run()} className={btn}><Minus aria-hidden="true" size={17} /></button>
          <Menu label={t("space")} disabled={off} icon={<MoveVertical aria-hidden="true" size={17} />}>
            {(close) => (Object.keys(SPACER_SIZES) as (keyof typeof SPACER_SIZES)[]).map((size) => (
              <Item key={size} onClick={() => { chain().insertContent({ type: "spacer", attrs: { size } }).run(); close(); }}>{t(`spaces.${size}`)}</Item>
            ))}
          </Menu>
          {sep}
          <Menu label={t("link")} disabled={off} wide icon={<Link2 aria-hidden="true" size={17} className={s.link ? "text-blue" : ""} />}>
            {(close) => <LinkForm editor={editor} active={s.link} close={close} />}
          </Menu>
          <Menu label={t("button")} disabled={off} wide icon={<MousePointerClick aria-hidden="true" size={17} />}>
            {(close) => <ButtonForm onSave={(attrs) => { chain().insertContent({ type: "button", attrs }).run(); close(); }} />}
          </Menu>
          <button type="button" onClick={() => file.current?.click()} disabled={off || uploading} aria-busy={uploading} aria-label={t("image")} title={t("image")} className={btn}>
            {uploading ? <Loader2 aria-hidden="true" size={17} className="motion-safe:animate-spin" /> : <ImagePlus aria-hidden="true" size={17} />}
          </button>
          <EmojiPicker disabled={off} onPick={(e) => chain().insertContent(e).run()} />
          <span className="ms-auto flex">
            <button type="button" disabled={off || !s.canUndo} aria-label={t("undo")} title={`${t("undo")} (Ctrl+Z)`} onClick={() => chain().undo().run()} className={btn}><Undo2 aria-hidden="true" size={17} className="rtl:-scale-x-100" /></button>
            <button type="button" disabled={off || !s.canRedo} aria-label={t("redo")} title={t("redo")} onClick={() => chain().redo().run()} className={btn}><Redo2 aria-hidden="true" size={17} className="rtl:-scale-x-100" /></button>
          </span>
          <input
            ref={file} type="file" accept={UPLOAD_KINDS[upload.kind].types.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }}
          />
        </div>

        {(s.image || s.button) && !off && (
          <div onMouseDown={keepFocus} className="flex flex-wrap items-center gap-1 border-b border-navy/10 bg-blue/[0.03] px-2 py-1.5 text-[13px]">
            <b className="me-1">{t(s.image ? "imageTools" : "buttonTools")}</b>
            {s.image && (["small", "medium", "full"] as const).map((size) => (
              <button key={size} type="button" aria-pressed={s.image?.size === size} onClick={() => setImage({ size })} className="min-h-11 rounded-full px-3 font-bold text-muted aria-pressed:bg-blue/10 aria-pressed:text-blue pointer-fine:min-h-8">{t(`imageSizes.${size}`)}</button>
            ))}
            {s.button && (Object.keys(BUTTON_COLORS) as (keyof typeof BUTTON_COLORS)[]).map((c) => (
              <button key={c} type="button" aria-pressed={s.button?.color === c} aria-label={t(`colors.${c}`)} title={t(`colors.${c}`)} onClick={() => setButton({ color: c })} className="inline-flex size-11 items-center justify-center rounded-lg aria-pressed:ring-2 aria-pressed:ring-blue pointer-fine:size-8">
                <span aria-hidden="true" className="size-5 rounded-full" style={{ background: BUTTON_COLORS[c] }} />
              </button>
            ))}
            {sep}
            {aligns.map(({ key, icon: Icon }) => (
              <button key={key} type="button" aria-pressed={(s.image?.align ?? s.button?.align) === key} aria-label={t(`align.${key}`)} onClick={() => (s.image ? setImage({ align: key }) : setButton({ align: key }))} className={btn}>
                <Icon aria-hidden="true" size={16} />
              </button>
            ))}
            {sep}
            {s.image ? (
              <>
                <button type="button" onClick={() => { const c = window.prompt(t("captionPrompt"), s.image!.caption ?? ""); if (c !== null) setImage({ caption: c.trim().slice(0, 200), alt: c.trim().slice(0, 200) }); }} className="min-h-11 rounded-full px-3 font-bold text-blue pointer-fine:min-h-8">{t("caption")}</button>
                <button type="button" onClick={() => { const u = window.prompt(t("linkPrompt"), s.image!.href || "https://"); if (u === null) return; const v = u.trim(); setImage({ href: URL_OK.test(v) ? v : "" }); }} className="min-h-11 rounded-full px-3 font-bold text-blue pointer-fine:min-h-8">{t(s.image.href ? "editLink" : "link")}</button>
              </>
            ) : (
              <Menu label={t("editButton")} wide icon={<span className="px-1 text-[13px] font-bold text-blue">{t("editButton")}</span>}>
                {(close) => <ButtonForm initial={s.button!} onSave={(attrs) => { setButton(attrs); close(); }} />}
              </Menu>
            )}
            <button type="button" onClick={() => chain().deleteSelection().run()} aria-label={t("delete")} title={t("delete")} className={`${btn} ms-auto text-bad`}><Trash2 aria-hidden="true" size={16} /></button>
          </div>
        )}

        <EditorContent editor={editor} />
      </div>
      {error && <p role="alert" className="text-xs text-bad">{error}</p>}
    </div>
  );
}

function LinkForm({ editor, active, close }: { editor: Editor; active: boolean; close: () => void }) {
  const t = useTranslations("Admin.newsletter.toolbar");
  const [url, setUrl] = useState<string>((editor.getAttributes("link").href as string) || "https://");
  const save = () => {
    const v = url.trim();
    if (!URL_OK.test(v)) return;
    const c = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !active) c.insertContent({ type: "text", text: t("linkText"), marks: [{ type: "link", attrs: { href: v } }] }).run();
    else c.setLink({ href: v }).run();
    close();
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-2">
      <label className="text-[12.5px] font-medium" htmlFor="rich-link">{t("linkPrompt")}</label>
      <input id="rich-link" dir="ltr" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} className={field} />
      <div className="flex gap-2">
        <button type="submit" className="min-h-11 flex-1 rounded-full bg-blue px-4 text-sm font-bold text-on-blue pointer-fine:min-h-9">{t("apply")}</button>
        {active && <button type="button" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); close(); }} className="min-h-11 rounded-full px-4 text-sm font-bold text-bad pointer-fine:min-h-9">{t("removeLink")}</button>}
      </div>
    </form>
  );
}

function ButtonForm({ initial, onSave }: { initial?: Record<string, string>; onSave: (attrs: Record<string, string>) => void }) {
  const t = useTranslations("Admin.newsletter.toolbar");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "https://");
  const [color, setColor] = useState(initial?.color ?? "navy");
  const ok = label.trim() && URL_OK.test(url.trim());
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ label: label.trim().slice(0, 60), url: url.trim(), color, align: initial?.align ?? "center" }); }} className="flex flex-col gap-2">
      <label className="text-[12.5px] font-medium" htmlFor="rich-btn-label">{t("buttonLabel")}</label>
      <input id="rich-btn-label" autoFocus value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} className={field} />
      <label className="text-[12.5px] font-medium" htmlFor="rich-btn-url">{t("buttonUrl")}</label>
      <input id="rich-btn-url" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} className={field} />
      <div className="flex gap-1" role="group" aria-label={t("color")}>
        {(Object.keys(BUTTON_COLORS) as (keyof typeof BUTTON_COLORS)[]).map((c) => (
          <button key={c} type="button" aria-pressed={color === c} aria-label={t(`colors.${c}`)} onClick={() => setColor(c)} className="inline-flex size-11 items-center justify-center rounded-lg aria-pressed:ring-2 aria-pressed:ring-blue pointer-fine:size-9">
            <span aria-hidden="true" className="size-6 rounded-full" style={{ background: BUTTON_COLORS[c] }} />
          </button>
        ))}
      </div>
      <button type="submit" disabled={!ok} className="min-h-11 rounded-full bg-blue px-4 text-sm font-bold text-on-blue disabled:opacity-40 pointer-fine:min-h-9">{t(initial ? "apply" : "insertButton")}</button>
    </form>
  );
}
