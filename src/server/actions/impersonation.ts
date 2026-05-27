"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { IMPERSONATE_COOKIE } from "@/lib/impersonation";

export async function startImpersonation(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: true };
  (await cookies()).set(IMPERSONATE_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h safety expiry
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function stopImpersonation() {
  // No admin check needed — exiting impersonation is always safe.
  (await cookies()).delete(IMPERSONATE_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true };
}
