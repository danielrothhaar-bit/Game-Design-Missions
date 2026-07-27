import { NextResponse } from "next/server";
import { runDesignSuiteSync } from "@/lib/design-suite";

// Machine trigger for the Design Suite action sync (for a Railway cron / external
// scheduler). Auth: Bearer DESIGN_SUITE_CRON_SECRET. The admin "Sync now" button
// uses the server action instead; this exists for unattended runs.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.DESIGN_SUITE_CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runDesignSuiteSync();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
