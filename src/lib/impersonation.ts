import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isAdminRole } from "./authz";

export const IMPERSONATE_COOKIE = "mq_impersonate";

type DbUser = typeof users.$inferSelect;

/**
 * Resolves the real signed-in user and the "effective" user the app should
 * render for. An admin can impersonate another user via a cookie; the cookie
 * is only honored when the real user is genuinely an admin, so it can't be
 * forged by a non-admin.
 */
export async function resolveUsers(): Promise<{
  real: DbUser | null;
  effective: DbUser | null;
  impersonating: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { real: null, effective: null, impersonating: false };
  }
  const real = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!real) return { real: null, effective: null, impersonating: false };
  if (!isAdminRole(real.role)) {
    return { real, effective: real, impersonating: false };
  }

  const target = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
  if (!target || target === real.id) {
    return { real, effective: real, impersonating: false };
  }
  const effective = await db.query.users.findFirst({
    where: eq(users.id, target),
  });
  if (!effective) return { real, effective: real, impersonating: false };
  return { real, effective, impersonating: true };
}

/** The user id the current view should act as (effective). */
export async function effectiveUserId(): Promise<string | null> {
  const { effective } = await resolveUsers();
  return effective?.id ?? null;
}
