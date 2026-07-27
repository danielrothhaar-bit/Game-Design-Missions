"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { designSuiteUserMap, games } from "@/db/schema";
import { auth } from "@/lib/auth";
import { runDesignSuiteSync, type SyncSummary } from "@/lib/design-suite";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const me = await db.query.users.findFirst({
    where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
  });
  if (!me || (me.role !== "OWNER" && me.role !== "ADMIN")) {
    throw new Error("Forbidden");
  }
  return me.id;
}

export async function syncFromDesignSuite(): Promise<SyncSummary> {
  await requireAdmin();
  const summary = await runDesignSuiteSync();
  revalidatePath("/admin");
  revalidatePath("/portfolio");
  revalidatePath("/my-work");
  return summary;
}

export async function upsertUserMap(designSuiteName: string, email: string) {
  await requireAdmin();
  const name = designSuiteName.trim();
  const mail = email.trim().toLowerCase();
  if (!name || !mail) throw new Error("Name and email are required");
  await db
    .insert(designSuiteUserMap)
    .values({ designSuiteName: name, email: mail })
    .onConflictDoUpdate({
      target: designSuiteUserMap.designSuiteName,
      set: { email: mail },
    });
  revalidatePath("/admin");
}

export async function deleteUserMap(designSuiteName: string) {
  await requireAdmin();
  await db
    .delete(designSuiteUserMap)
    .where(eq(designSuiteUserMap.designSuiteName, designSuiteName));
  revalidatePath("/admin");
}

export async function setGameDesignSuiteLink(
  questsGameId: string,
  designSuiteGameId: string | null,
) {
  await requireAdmin();
  await db
    .update(games)
    .set({ designSuiteGameId: designSuiteGameId || null })
    .where(eq(games.id, questsGameId));
  revalidatePath("/admin");
}
