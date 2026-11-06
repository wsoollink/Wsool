"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";

/** Share an article: WhatsApp, X, copy the link. */
export function Share({ url, title, labels }: { url: string; title: string; labels: { share: string; copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  const btn = "inline-flex size-11 items-center justify-center rounded-full border border-line bg-card text-navy hover:border-navy/30";
  const text = encodeURIComponent(`${title}\n${url}`);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-muted">{labels.share}</span>
      <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer" className={btn} aria-label="WhatsApp"><PlatformIcon platform="whatsapp" size={17} /></a>
      <a href={`https://x.com/intent/post?text=${text}`} target="_blank" rel="noopener noreferrer" className={btn} aria-label="X"><PlatformIcon platform="x" size={16} /></a>
      <button type="button" className={btn} aria-label={copied ? labels.copied : labels.copy}
        onClick={() => { navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }}>
        {copied ? <Check aria-hidden="true" size={17} className="text-good" /> : <Link2 aria-hidden="true" size={17} />}
      </button>
    </div>
  );
}
