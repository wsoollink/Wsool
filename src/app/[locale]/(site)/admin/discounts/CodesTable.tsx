"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { deleteCodes } from "./actions";
import { DeleteRevokedButton, RevokeButton } from "./CodesManager";

type Status = "unused" | "used" | "expired" | "revoked";
export type CodeRow = {
  id: string; code: string; discount: string; note: string; email: string | null;
  created: string; expires: string; status: Status; usedLine: string | null;
};
const tone: Record<Status, string> = { unused: "bg-blue/10 text-blue", used: "bg-good/10 text-good", expired: "bg-navy/5 text-muted", revoked: "bg-bad/8 text-bad" };
const box = "size-5 cursor-pointer accent-blue disabled:cursor-not-allowed disabled:opacity-30";

/** The codes table: a checkbox per code (used codes can't be picked) and a bar to delete the picked ones at once. */
export function CodesTable({ rows }: { rows: CodeRow[] }) {
  const t = useTranslations("Admin.discounts");
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const pickable = rows.filter((r) => r.status !== "used").map((r) => r.id);
  const chosen = pickable.filter((id) => picked.has(id));
  const allOn = pickable.length > 0 && chosen.length === pickable.length;

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const remove = () => {
    if (!window.confirm(t("confirmDeleteSelected", { n: chosen.length }))) return;
    setNote("");
    startTransition(async () => {
      const res = await deleteCodes(chosen);
      if (res.error) setNote(t("errors.failed"));
      else if (res.skipped) setNote(t("deletedSome", { count: res.count ?? 0, skipped: res.skipped }));
      setPicked(new Set());
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {(chosen.length > 0 || note) && (
        <div role="status" className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card p-2 ps-4 shadow-card">
          {chosen.length > 0 ? (
            <>
              <span className="text-sm font-bold">{t("selected", { n: chosen.length })}</span>
              <span className="ms-auto flex flex-wrap gap-2">
                <button type="button" onClick={() => setPicked(new Set())} className="inline-flex min-h-11 items-center rounded-full px-4 text-[13.5px] font-bold text-muted hover:bg-hover">{t("clearSelection")}</button>
                <button type="button" disabled={pending} onClick={remove} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-bad px-4 text-[13.5px] font-bold text-on-blue hover:bg-bad/90 disabled:opacity-60">
                  <Trash2 aria-hidden="true" size={16} /> {t("deleteSelected")} ({chosen.length})
                </button>
              </span>
            </>
          ) : <span className="text-sm text-muted">{note}</span>}
        </div>
      )}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-bg text-[11.5px] text-muted">
            <tr className="border-b border-line-soft">
              <th scope="col" className="w-12 px-4 py-3 text-start">
                <input type="checkbox" className={box} aria-label={t("selectAll")} checked={allOn} disabled={!pickable.length}
                  onChange={() => setPicked(allOn ? new Set() : new Set(pickable))} />
              </th>
              {["code", "percent", "for", "created", "expires", "status", ""].map((h) => <th key={h} scope="col" className="px-4 py-3 text-start font-semibold">{h && t(`table.${h}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-navy/6 last:border-0 ${picked.has(r.id) ? "bg-blue/5" : ""}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" className={box} checked={picked.has(r.id)} disabled={r.status === "used"}
                    aria-label={t("selectCode", { code: r.code })} title={r.status === "used" ? t("usedLocked") : undefined}
                    onChange={() => toggle(r.id)} />
                </td>
                <td className="px-4 py-3"><code dir="ltr" className="font-bold">{r.code}</code></td>
                <td className="px-4 py-3 font-bold">{r.discount}</td>
                <td className="px-4 py-3">
                  <span className="block">{r.note || "—"}</span>
                  {r.email && <span dir="ltr" className="block text-xs text-muted rtl:text-end">{r.email}</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{r.created}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{r.expires}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${tone[r.status]}`}>{t(`status.${r.status}`)}</span>
                  {r.usedLine && <span className="mt-1 block text-xs text-muted"><bdi dir="ltr">{r.usedLine}</bdi></span>}
                </td>
                <td className="px-4 py-3">
                  {r.status === "unused" && <RevokeButton id={r.id} code={r.code} />}
                  {r.status === "revoked" && <DeleteRevokedButton id={r.id} code={r.code} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
