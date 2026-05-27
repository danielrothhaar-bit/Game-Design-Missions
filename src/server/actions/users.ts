"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { userDivisions, userSkills, users } from "@/db/schema";
import { requireAdmin } from "@/lib/authz";

const RoleEnum = z.enum(["OWNER", "ADMIN", "DESIGNER", "VIEWER"]);

const CreateUserInput = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  role: RoleEnum.default("DESIGNER"),
});

export async function createUser(input: z.input<typeof CreateUserInput>) {
  await requireAdmin();
  const { email, name, role } = CreateUserInput.parse(input);
  const lower = email.toLowerCase();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, lower),
  });
  if (existing) throw new Error("A user with that email already exists.");
  await db.insert(users).values({
    email: lower,
    name: name?.trim() || lower.split("@")[0],
    role,
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateUserRole(
  userId: string,
  role: z.infer<typeof RoleEnum>,
) {
  const admin = await requireAdmin();
  RoleEnum.parse(role);
  // Don't let an owner accidentally strip their own last-owner access in a
  // way that locks everyone out — but allow normal role changes.
  if (admin.id === userId && role !== "OWNER" && admin.role === "OWNER") {
    const owners = await db.query.users.findMany({
      where: eq(users.role, "OWNER"),
    });
    if (owners.length <= 1) {
      throw new Error("You're the only owner — promote someone else first.");
    }
  }
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateUserName(userId: string, name: string) {
  await requireAdmin();
  const n = z.string().min(1).max(120).parse(name.trim());
  await db.update(users).set({ name: n }).where(eq(users.id, userId));
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setUserDivisionVisible(
  userId: string,
  divisionSlug: string,
  visible: boolean,
) {
  await requireAdmin();
  await db
    .insert(userDivisions)
    .values({ userId, divisionSlug, hidden: !visible })
    .onConflictDoUpdate({
      target: [userDivisions.userId, userDivisions.divisionSlug],
      set: { hidden: !visible },
    });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setUserSkillLevel(
  userId: string,
  skillId: string,
  level: number,
) {
  await requireAdmin();
  const clamped = Math.max(0, Math.min(4, Math.round(level)));
  await db
    .insert(userSkills)
    .values({ userId, skillId, level: clamped })
    .onConflictDoUpdate({
      target: [userSkills.userId, userSkills.skillId],
      set: { level: clamped },
    });
  revalidatePath("/admin");
  revalidatePath("/profile");
  revalidatePath("/my-work");
  return { ok: true };
}
