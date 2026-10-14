"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { runNewsletterLink, type LinkOutcome } from "./actions";

type Texts = Record<"title" | "body" | "cta" | "home", string> & Record<LinkOutcome, { title: string; body: string }>;

/** Asks for one press before confirming / unsubscribing, then shows the result. */
export function LinkAction({ kind, id, token, texts }: { kind: "confirm" | "unsubscribe"; id: string; token: string; texts: Texts }) {
  const [outcome, setOutcome] = useState<LinkOutcome | null>(null);
  const [pending, start] = useTransition();
  const shown = outcome ? texts[outcome] : texts;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Card className="flex flex-col items-start gap-3 p-6">
        <h1 className="text-2xl font-bold">{shown.title}</h1>
        <p role="status" className="text-sm text-muted">{shown.body}</p>
        {outcome ? (
          <Link href="/" className={buttonClasses("secondary")}>{texts.home}</Link>
        ) : (
          <button type="button" disabled={pending} aria-busy={pending} onClick={() => start(async () => setOutcome(await runNewsletterLink(kind, id, token)))} className={buttonClasses("primary")}>
            {texts.cta}
          </button>
        )}
      </Card>
    </main>
  );
}
