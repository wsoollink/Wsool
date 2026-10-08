#!/usr/bin/env python3
"""
Converts the owner's approved marketing design (design/marketing/*.dc.html,
exported from the Claude design canvas) into React components, so the site
matches the design exactly.

    python3 scripts/design-to-tsx.py

For each page it reads four artboards (Arabic/English x desktop/mobile):
- The Arabic desktop artboard gives the markup and inline styles.
- Arabic and English have the same structure: their texts are paired into
  `<page>.text.ts` ({ ar: [...], en: [...] }), used through t(i).
- The mobile artboard is the desktop one with some elements removed and some
  styles changed: removed elements get a "hide on mobile" class and changed
  styles become `@media (max-width: 767px)` rules in `<page>.css`.
- Design-canvas template holes ({{x}}, <sc-for>, <sc-if>) become reads of a
  `v` object that a hand-written wrapper computes (like the canvas's
  renderVals), so behavior stays in normal code.

Generated files go to src/components/marketing/generated/. Don't edit them by
hand: change the design (or this script) and run it again.
"""
import json
import os
import re
import sys
from difflib import SequenceMatcher
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGN = os.path.join(ROOT, "design", "marketing")
OUT = os.path.join(ROOT, "src", "components", "marketing", "generated")
ASSETS = os.path.join(DESIGN, "assets")
PUBLIC_PREFIX = "/marketing/"

PAGES = {
    # name: (ar desktop, en desktop, ar mobile, en mobile)
    "Home": ("Main", "Home-en", "Home-mobile", "Home-mobile-en"),
    "Pricing": ("Pricing", "Pricing-en", "Pricing-mobile", "Pricing-mobile-en"),
    "NotFound": ("State-404", "State-404-en", "State-404-mobile", "State-404-mobile-en"),
    "Hidden": ("State-private", "State-private-en", "State-private-mobile", "State-private-mobile-en"),
    "ServerError": ("State-500", "State-500-en", "State-500-mobile", "State-500-mobile-en"),
}

VOID = {"img", "input", "br", "hr", "meta", "link", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "source"}
ATTR_NAMES = {
    "class": "className", "for": "htmlFor", "viewbox": "viewBox", "autocomplete": "autoComplete",
    "spellcheck": "spellCheck", "inputmode": "inputMode", "tabindex": "tabIndex", "hreflang": "hrefLang",
    "readonly": "readOnly", "maxlength": "maxLength", "onclick": "onClick", "oninput": "onChange",
    "onkeydown": "onKeyDown", "onmouseenter": "onMouseEnter", "onmouseleave": "onMouseLeave",
    "onfocus": "onFocus", "onblur": "onBlur", "onchange": "onChange", "colspan": "colSpan", "rowspan": "rowSpan",
    "srcset": "srcSet", "crossorigin": "crossOrigin",
}
TEXT_ATTRS = {"aria-label", "alt", "placeholder", "title", "aria-roledescription"}
FONT_TEXT = re.compile(r"'GT America Arabic',\s*Tahoma,\s*sans-serif")
FONT_NUMBERS = re.compile(r"'Menda',\s*'GT America Arabic',\s*sans-serif")
HOLE = re.compile(r"\{\{\s*([^}]+?)\s*\}\}")


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", [])
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        if data.strip():
            self.cur.children.append(data)


def load(name):
    src = open(os.path.join(DESIGN, name + ".dc.html"), encoding="utf-8").read()
    body = src[src.index("</helmet>") + len("</helmet>"):src.index("</x-dc>")]
    p = Parser()
    p.feed(body)
    root = [c for c in p.root.children if isinstance(c, Node)][0]
    return root


def elements(node):
    """Pre-order list of element nodes."""
    out = [node]
    for c in node.children:
        if isinstance(c, Node):
            out.extend(elements(c))
    return out


def parse_style(style):
    props = {}
    for part in re.split(r";(?![^(]*\))", style or ""):
        if ":" not in part:
            continue
        k, v = part.split(":", 1)
        props[k.strip()] = v.strip()
    return props


def camel(prop):
    if prop.startswith("-webkit-"):
        prop = "Webkit-" + prop[8:]
    parts = prop.split("-")
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:])


def asset_url(blob_id):
    for f in os.listdir(ASSETS):
        if f.startswith(blob_id):
            return PUBLIC_PREFIX + f
    return PUBLIC_PREFIX + blob_id


def fix_value(v):
    v = FONT_NUMBERS.sub("var(--font-numbers)", v)
    v = FONT_TEXT.sub("var(--font-text)", v)
    return re.sub(r"/_blob/([0-9a-f]{32})", lambda m: asset_url(m.group(1)), v)


def js_expr(hole, scope):
    """{{d.name}} -> d.name inside a loop over `d`, else v.name."""
    root = hole.split(".")[0].strip()
    if hole.strip() in ("true", "false"):
        return hole.strip()
    return hole if root in scope else "v." + hole


def value_jsx(v, scope):
    """An attribute/style value that may contain holes -> JSX expression text."""
    holes = list(HOLE.finditer(v))
    if not holes:
        return json.dumps(v, ensure_ascii=False)
    if len(holes) == 1 and holes[0].group(0) == v.strip():
        return js_expr(holes[0].group(1), scope)
    out = HOLE.sub(lambda m: "${" + js_expr(m.group(1), scope) + "}", v.replace("`", "\\`"))
    return "`" + out + "`"


def align(page, desktop, mobile):
    """Maps desktop elements to mobile ones; returns (map, ids removed on mobile)."""
    dsk, mbl = elements(desktop), elements(mobile)
    sm = SequenceMatcher(None, [n.tag for n in dsk], [n.tag for n in mbl], autojunk=False)
    mob_of, hidden = {}, set()
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                mob_of[id(dsk[i1 + k])] = mbl[j1 + k]
        elif op == "delete":
            hidden.update(id(dsk[k]) for k in range(i1, i2))
        else:
            raise SystemExit(f"{page}: mobile artboard changes structure at desktop #{i1} ({op}); update the script")
    return mob_of, hidden


class Gen:
    def __init__(self, page, ar, en, mob, mob_en):
        self.page = page
        self.texts_ar, self.texts_en = [], []
        self.css = []
        self.counter = 0
        self.ar, self.en = ar, en
        # Pair Arabic and English elements (same structure), and desktop with mobile.
        self.en_of = dict(zip(map(id, elements(ar)), elements(en)))
        self.mob_of, self.hidden = align(page, ar, mob)
        self.mob_en_of, self.hidden_en = align(page, en, mob_en)
        self.root_id = id(ar)

    def text(self, ar_text, en_text):
        self.texts_ar.append(ar_text)
        self.texts_en.append(en_text)
        return len(self.texts_ar) - 1

    def klass(self):
        self.counter += 1
        return f"mk-{self.page.lower()}-{self.counter}"

    def mobile_rules(self, node, cls_list):
        rules = self.mobile_diff(node, self.mob_of, self.hidden, self.root_id)
        en_node = self.en_of.get(id(node))
        rules_en = self.mobile_diff(en_node, self.mob_en_of, self.hidden_en, id(self.en)) if en_node is not None else rules
        if not rules and not rules_en:
            return
        c = self.klass()
        cls_list.append(c)
        if rules == rules_en:
            self.css.append(f".{c}{{{rules}}}")
        else:
            if rules:
                self.css.append(f":is([dir=rtl] .{c},.{c}[dir=rtl]){{{rules}}}")
            if rules_en:
                self.css.append(f":is([dir=ltr] .{c},.{c}[dir=ltr]){{{rules_en}}}")

    def mobile_diff(self, node, mob_of, hidden, root_id):
        if id(node) in hidden:
            # Hide on mobile only if its parent isn't hidden already.
            return "" if id(node.parent) in hidden else "display:none!important"
        mob = mob_of.get(id(node))
        if mob is None:
            return ""
        d, m = parse_style(node.attrs.get("style")), parse_style(mob.attrs.get("style"))
        if id(node) == root_id:
            for k in ("width", "min-height"):
                d.pop(k, None)
                m.pop(k, None)
        diff = []
        for k in sorted(set(d) | set(m)):
            if d.get(k) != m.get(k):
                if "{{" in (m.get(k) or "") or "{{" in (d.get(k) or ""):
                    continue
                diff.append(f"{k}:{fix_value(m[k]) if k in m else 'unset'}!important")
        return ";".join(diff)

    def attrs_jsx(self, node, en_node, scope, extra_cls):
        out = []
        cls = [c for c in (node.attrs.get("class") or "").split() if c]
        cls += extra_cls
        en_attrs = en_node.attrs if en_node is not None else node.attrs
        if node.tag == "a" and node.attrs.get("href") == "#":
            social = next((c[5:] for c in cls if c.startswith("wsoc-")), None)
            if node.attrs.get("hreflang"):
                node.attrs["href"] = None
                out.append('href="#" onClick={v.switchLang}')
            elif social:
                node.attrs["href"] = None
                out.append(f"href={{v.social.{social}}}")
            else:
                key = link_text(node) or node.attrs.get("aria-label", "")
                if key not in LINKS:
                    raise SystemExit(f"{self.page}: no link target for {key!r}; add it to LINKS")
                node.attrs["href"] = None
                out.append(f"href={json.dumps(LINKS[key], ensure_ascii=False)}")
        elif node.tag == "button" and not any(k.startswith("on") for k in node.attrs):
            action = BUTTONS.get(link_text(node))
            if action:
                out.append(f"onClick={{{action}}}")
        elif node.tag == "a" and (node.attrs.get("href") or "").startswith("#") and self.page != "Home":
            node.attrs["href"] = "/" + node.attrs["href"]
        for k in list(node.attrs):
            if k in ("style", "class") or k in TEXT_ATTRS or node.attrs[k] is None:
                continue
            ev = en_attrs.get(k)
            if ev is not None and ev != node.attrs[k] and "{{" not in node.attrs[k]:
                a, b = fix_value(node.attrs[k]), fix_value(ev)
                name = ATTR_NAMES.get(k, camel(k) if node.tag in SVG_TAGS and "-" in k else k)
                out.append(f"{name}={{v.en ? {json.dumps(b, ensure_ascii=False)} : {json.dumps(a, ensure_ascii=False)}}}")
                node.attrs[k] = None
        for k, v in node.attrs.items():
            if v is None and k in ("href", "dir", "lang", "hreflang", "src", "d"):
                continue
            if k.startswith("hint-") or k == "class" or v is None and k not in ("disabled",):
                if k == "class" or k.startswith("hint-"):
                    continue
            name = ATTR_NAMES.get(k, k)
            if k == "style":
                props, en_props = parse_style(v), parse_style(en_attrs.get("style"))
                items = []
                for p in list(props) + [p for p in en_props if p not in props]:
                    a, b = props.get(p), en_props.get(p)
                    if a == b or "{{" in (a or "") + (b or ""):
                        items.append(f"{json.dumps(camel(p))}: {value_jsx(fix_value(a if a is not None else b), scope)}")
                    else:
                        ja = json.dumps(fix_value(a)) if a is not None else "undefined"
                        jb = json.dumps(fix_value(b)) if b is not None else "undefined"
                        items.append(f"{json.dumps(camel(p))}: v.en ? {jb} : {ja}")
                out.append("style={{" + ", ".join(items) + "}}")
                continue
            if k in ("src", "href") and v and "/_blob/" in v:
                v = fix_value(v)
            if name.startswith("on") and name[2:3].isupper():
                out.append(f"{name}={{{value_jsx(v, scope)}}}")
                continue
            if k in TEXT_ATTRS and v and "{{" not in v:
                ev = en_node.attrs.get(k) if en_node is not None else v
                if ev != v:
                    i = self.text(v, ev)
                    out.append(f"{name}={{t({i})}}")
                    continue
            if v is None:
                out.append(name)
            elif "-" in name and not name.startswith(("aria-", "data-")) and node.tag in SVG_TAGS:
                out.append(f"{camel(name)}={value_jsx(v, scope) if '{{' in v else json.dumps(v)}")
            elif "{{" in v:
                out.append(f"{name}={{{value_jsx(v, scope)}}}")
            else:
                out.append(f"{name}={json.dumps(v, ensure_ascii=False)}")
        if cls:
            out.append(f"className={json.dumps(' '.join(cls))}")
        return (" " + " ".join(out)) if out else ""

    def node(self, node, en_node, scope, indent):
        pad = "  " * indent
        tag = node.tag
        if tag == "sc-for":
            lst = HOLE.search(node.attrs["list"]).group(1)
            var = node.attrs["as"]
            inner = self.children(node, en_node, scope | {var}, indent + 2)
            return (f"{pad}{{({js_expr(lst, scope)} as any[]).map(({var}: any, {var}Index: number) => (\n"
                    f"{pad}  <Fragment key={{{var}Index}}>\n{inner}\n{pad}  </Fragment>\n{pad}))}}")
        if tag == "sc-if":
            cond = HOLE.search(node.attrs["value"]).group(1)
            inner = self.children(node, en_node, scope, indent + 2)
            return f"{pad}{{{js_expr(cond, scope)} && (\n{pad}  <>\n{inner}\n{pad}  </>\n{pad})}}"
        kids = [c for c in node.children if isinstance(c, Node)]
        if kids and all("wsoc" in (c.attrs.get("class") or "").split() for c in kids):
            # Wsool's social icons: one anchor per link in SOCIAL_LINKS (v.socialList),
            # styled like the design's first icon.
            extra = []
            self.mobile_rules(node, extra)
            attrs = self.attrs_jsx(node, en_node, scope, extra)
            first = kids[0]
            span = [c for c in first.children if isinstance(c, Node)][0]
            span_style = self.attrs_jsx(span, None, scope, []).strip()
            a_style = " ".join(x for x in [self.attrs_jsx(Node("a", {"style": first.attrs.get("style", "")}), None, scope, []).strip()] if x)
            return (f"{pad}<{node.tag}{attrs}>\n{pad}  {{(v.socialList as any[]).map((s: any) => (\n"
                    f'{pad}    <a key={{s.key}} className={{"wsoc wsoc-" + s.key}} href={{s.href}} target="_blank" rel="noopener noreferrer" aria-label={{s.label}} title={{s.name}} {a_style}>\n'
                    f"{pad}      <span {span_style}></span>\n{pad}    </a>\n{pad}  ))}}\n{pad}</{node.tag}>")
        extra = []
        self.mobile_rules(node, extra)
        social = next((c[5:] for c in (node.attrs.get("class") or "").split() if c.startswith("wsoc-")), None)
        attrs = self.attrs_jsx(node, en_node, scope, extra)
        if tag == "a" and ' href="/' in attrs:
            tag = "Link"  # internal links use client-side navigation
        if social:
            inner = self.children(node, en_node, scope, indent + 2)
            return f"{pad}{{v.social.{social} && (\n{pad}  <{tag}{attrs}>\n{inner}\n{pad}  </{tag}>\n{pad})}}"
        if tag in VOID:
            return f"{pad}<{tag}{attrs} />"
        inner = self.children(node, en_node, scope, indent + 1)
        if not inner.strip():
            return f"{pad}<{tag}{attrs}></{tag}>"
        return f"{pad}<{tag}{attrs}>\n{inner}\n{pad}</{tag}>"

    def children(self, node, en_node, scope, indent):
        pad = "  " * indent
        en_children = en_node.children if en_node is not None else []
        en_texts = [c for c in en_children if isinstance(c, str)]
        mob = self.mob_of.get(id(node))
        mob_texts = [c for c in mob.children if isinstance(c, str)] if mob is not None else None
        lines, ti = [], 0
        for c in node.children:
            if isinstance(c, Node):
                lines.append(self.node(c, self.en_of.get(id(c)), scope, indent))
                continue
            ar_t = " ".join(c.split())
            en_t = " ".join(en_texts[ti].split()) if ti < len(en_texts) else ar_t
            mob_t = " ".join(mob_texts[ti].split()) if mob_texts and ti < len(mob_texts) else ar_t
            ti += 1
            if not ar_t:
                # Whitespace between two inline elements still separates words.
                if c.strip(" \t") == "" and c and len(node.children) > 1:
                    lines.append(pad + '{" "}')
                continue
            # Keep the spaces that separate this text from a neighbouring inline element.
            lead = '{" "}' if c[:1].isspace() and c is not node.children[0] else ""
            trail = '{" "}' if c[-1:].isspace() and c is not node.children[-1] else ""
            lines.append(pad + lead + self.text_jsx(ar_t, en_t, scope, mob_t) + trail)
        return "\n".join(lines)

    def text_jsx(self, ar_t, en_t, scope, mob_t):
        if HOLE.search(ar_t):
            # Holes keep their surrounding literal text (same in both languages in the design).
            parts = HOLE.split(ar_t)
            out = []
            for i, p in enumerate(parts):
                if i % 2:
                    out.append("{" + js_expr(p, scope) + "}")
                elif p:
                    out.append("{" + json.dumps(p, ensure_ascii=False) + "}")
            return "".join(out)
        i = self.text(ar_t, en_t)
        if mob_t != ar_t:
            # A shorter mobile label: two spans, one per breakpoint.
            j = self.text(mob_t, mob_t)  # English mobile text is filled in by run()
            self.mobile_text.append(j)
            return f'<span className="mk-dsk">{{t({i})}}</span><span className="mk-mob">{{t({j})}}</span>'
        return f"{{t({i})}}"


SVG_TAGS = {"svg", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "g"}

# Where the design's placeholder links (href="#") go, by the link's Arabic text
# or aria-label. Social icons use SOCIAL_LINKS (v.social); the globe toggles language.
LINKS = {
    "ابدأ مجانًا": "/login", "ابدأ تجربتك المجانية": "/login", "تسجيل الدخول": "/login",
    "المزايا": "/#features", "القوالب": "/#templates", "الأسعار": "/pricing", "الأسئلة الشائعة": "/#faq",
    "الأسئلة": "/#faq", "تواصل معنا": "mailto:support@wsool.link", "سياسة الخصوصية": "/privacy",
    "شروط الاستخدام": "/terms", "وصول": "/", "الرجوع للرئيسية": "/", "اشترك في Pro": "/login",
    "تعرّف على وصول": "/", "سوّ صفحتك مجانًا": "/login", "راسلنا": "mailto:support@wsool.link",
}


# Buttons the design left without a handler: their action, by Arabic text.
BUTTONS = {"حدّث الصفحة": "v.reload"}


def link_text(node):
    out = []
    for c in node.children:
        out.append(" ".join(c.split()) if isinstance(c, str) else link_text(c))
    return " ".join(x for x in out if x).strip()


def run():
    os.makedirs(OUT, exist_ok=True)
    shared_css = ["/* AUTO-GENERATED by scripts/design-to-tsx.py from design/marketing. */",
                  "@media (min-width: 768px){.mk-mob{display:none!important}}",
                  "@media (max-width: 767px){.mk-dsk{display:none!important}}"]
    for page, (ar_d, en_d, ar_m, en_m) in PAGES.items():
        ar, en, mob, mob_en = load(ar_d), load(en_d), load(ar_m), load(en_m)
        g = Gen(page, ar, en, mob, mob_en)
        g.mobile_text = []
        body = g.node(ar, en, set(), 2)
        # English versions of mobile-only labels: pair mobile ar/en texts in order.
        mob_ar_texts = [" ".join(t.split()) for n in elements(mob) for t in n.children if isinstance(t, str)]
        mob_en_texts = [" ".join(t.split()) for n in elements(mob_en) for t in n.children if isinstance(t, str)]
        pairs = dict(zip(mob_ar_texts, mob_en_texts))
        for j in g.mobile_text:
            g.texts_en[j] = pairs.get(g.texts_ar[j], g.texts_ar[j])
        tsx = f'''// AUTO-GENERATED by scripts/design-to-tsx.py from design/marketing/{ar_d}.dc.html.
// Do not edit: change the design or the script, then run `python3 scripts/design-to-tsx.py`.
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, jsx-a11y/alt-text */
import Link from "next/link";
import {{ Fragment }} from "react";
import "./{page.lower()}.css";

export function {page}View({{ v, t }}: {{ v: any; t: (i: number) => string }}) {{
  void Fragment;
  void Link;
  return (
{body}
  );
}}
'''
        open(os.path.join(OUT, f"{page}View.tsx"), "w", encoding="utf-8").write(tsx)
        texts = "// AUTO-GENERATED by scripts/design-to-tsx.py. Texts in design order.\n" \
                f"export const {page.upper()}_TEXT = {json.dumps({'ar': g.texts_ar, 'en': g.texts_en}, ensure_ascii=False, indent=1)} as const;\n"
        open(os.path.join(OUT, f"{page.lower()}.text.ts"), "w", encoding="utf-8").write(texts)
        css = "/* AUTO-GENERATED by scripts/design-to-tsx.py (mobile overrides). */\n@media (max-width: 767px){\n" + "\n".join(g.css) + "\n}\n"
        open(os.path.join(OUT, f"{page.lower()}.css"), "w", encoding="utf-8").write(css)
        print(f"{page}: {len(g.texts_ar)} texts, {len(g.css)} mobile rules")
    open(os.path.join(OUT, "shared.css"), "w", encoding="utf-8").write("\n".join(shared_css) + "\n")


if __name__ == "__main__":
    sys.exit(run())
