"use client";

import { useState } from "react";
import { EnquireModal } from "@/components/pms/EnquireModal";
import type { LeadSource } from "@/app/actions/pms-leads";

/**
 * Self-contained "Enquire about {strategy}" button + modal for the
 * server-rendered /pms/[slug] pages — the one interactive island there.
 * Styled to sit inside the page's CTA flex row.
 */
export function EnquireButton({ strategy, source }: { strategy: string; source: LeadSource }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="font-ui flex-1 text-center rounded-xl py-3 px-5"
        style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--green)" }}>
        Enquire about {strategy}
      </button>
      {open && <EnquireModal strategy={strategy} source={source} onClose={() => setOpen(false)} />}
    </>
  );
}
