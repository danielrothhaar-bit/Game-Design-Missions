"use server";

import { cookies } from "next/headers";
import { signOut } from "@/lib/auth";
import { IMPERSONATE_COOKIE } from "@/lib/impersonation";

/**
 * Full logout: drop any impersonation cookie, clear the session, and send the
 * user to the login screen.
 */
export async function logoutAction() {
  (await cookies()).delete(IMPERSONATE_COOKIE);
  await signOut({ redirectTo: "/login" });
}
