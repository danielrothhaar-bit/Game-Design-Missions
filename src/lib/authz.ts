import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/** The signed-in user's current DB row (authoritative role), or null. */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  return user ?? null;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/**
 * Throws unless the signed-in user is an admin per the *database* role
 * (not the JWT), so role changes take effect without forcing a re-login.
 */
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  if (!isAdminRole(user.role)) throw new Error("Admins only");
  return user;
}
