import { mergeAttributes, Node } from "@tiptap/core";
import BulletList from "@tiptap/extension-bullet-list";
import Image from "@tiptap/extension-image";

/**
 * Custom pieces of the admin rich editor (src/components/admin/RichEditor.tsx). Their JSON is what src/lib/rich-text.ts
 * cleans and renders (email + Academy); the HTML here is only how they look while editing (same `.ac-*` classes).
 */

/** Bullet list with an optional "check" style (✓ instead of dots). */
export const CheckableBulletList = BulletList.extend({
  addAttributes() {
    return {
      check: {
        default: false,
        parseHTML: (el) => el.classList.contains("ac-check"),
        renderHTML: (attrs) => ({ class: attrs.check ? "ac-check" : "ac-ul" }),
      },
    };
  },
});

/** Images with a size, alignment, caption and optional link. */
export const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: { default: "full" },
      align: { default: "center" },
      caption: { default: "" },
      href: { default: "" },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { size, align, caption, href, ...img } = HTMLAttributes as Record<string, string>;
    const picture: [string, Record<string, string>] = ["img", mergeAttributes(img, { draggable: "false" })];
    return [
      "figure", { class: `ac-figure ac-img-${size} ac-align-${align}${href ? " ac-linked" : ""}` },
      picture,
      ...(caption ? [["figcaption", {}, caption] as [string, Record<string, string>, string]] : []),
    ];
  },
}).configure({ inline: false, allowBase64: false });

/** A highlighted box around a few blocks (four tones). */
export const Box = Node.create({
  name: "box",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { tone: { default: "blue" } };
  },
  parseHTML() {
    return [{ tag: "div.ac-box" }];
  },
  renderHTML({ node }) {
    return ["div", { class: `ac-box ac-box-${node.attrs.tone}` }, 0];
  },
});

/** Empty vertical space (small / medium / large). */
export const Spacer = Node.create({
  name: "spacer",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { size: { default: "md" } };
  },
  parseHTML() {
    return [{ tag: "div[data-spacer]" }];
  },
  renderHTML({ node }) {
    return ["div", { "data-spacer": "", class: `ac-space-${node.attrs.size} ac-editor-spacer` }];
  },
});

/** A call-to-action button inside the text (label, link, colour, alignment). */
export const ButtonNode = Node.create({
  name: "button",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { label: { default: "" }, url: { default: "" }, color: { default: "navy" }, align: { default: "center" } };
  },
  parseHTML() {
    return [{ tag: "p[data-button]" }];
  },
  renderHTML({ node }) {
    return ["p", { "data-button": "", class: `ac-btn-row ac-align-${node.attrs.align}` }, ["span", { class: `ac-btn ac-btn-${node.attrs.color}` }, node.attrs.label]];
  },
});
