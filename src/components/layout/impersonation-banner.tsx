"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { stopImpersonation } from "@/server/actions/impersonation";

export function ImpersonationBanner({ name }: { name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function exit() {
    start(async () => {
      await stopImpersonation();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950">
      <span className="flex items-center gap-1.5">
        <Eye className="size-3.5" />
        Viewing as <strong>{name}</strong>
      </span>
      <button
        onClick={exit}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded bg-amber-950/15 px-2 py-0.5 hover:bg-amber-950/25"
      >
        <X className="size-3" />
        Exit
      </button>
    </div>
  );
}
