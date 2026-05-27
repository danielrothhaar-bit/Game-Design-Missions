import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "ADMIN" | "DESIGNER" | "VIEWER";
    } & DefaultSession["user"];
  }
}

function emailAllowlist(): string[] {
  return (process.env.EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowed(email: string | null | undefined): boolean {
  const list = emailAllowlist();
  if (!email) return false;
  if (list.length === 0) return true;
  const lower = email.toLowerCase();
  return list.some(
    (entry) => lower === entry || lower.endsWith(`@${entry.replace(/^@/, "")}`),
  );
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.toLowerCase());
}

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Self-hosted behind Railway's proxy — trust the forwarded host instead of
  // requiring AUTH_TRUST_HOST to be set as an env var.
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the cookie at most once a day
  },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
        passcode: { label: "Passcode", type: "password" },
      },
      authorize: async (raw) => {
        const email = String(raw?.email ?? "").trim().toLowerCase();
        const passcode = String(raw?.passcode ?? "");
        if (!email || !passcode) return null;
        if (!isAllowed(email)) return null;
        const expected = process.env.DEV_PASSCODE;
        if (!expected || passcode !== expected) return null;

        const wantOwner = isAdminEmail(email);

        const existing = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (existing) {
          // Promote to OWNER if they've been added to ADMIN_EMAILS.
          if (wantOwner && existing.role !== "OWNER") {
            await db
              .update(users)
              .set({ role: "OWNER" })
              .where(eq(users.id, existing.id));
            return { ...existing, role: "OWNER" };
          }
          return existing;
        }

        // First user ever, or an admin email, becomes OWNER.
        const userCount = await db.$count(users);
        const role = wantOwner || userCount === 0 ? "OWNER" : "DESIGNER";
        const [created] = await db
          .insert(users)
          .values({ email, name: email.split("@")[0], role })
          .returning();
        return created;
      },
    }),
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      if (account?.provider === "google") return isAllowed(user.email);
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role ?? "DESIGNER";
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      if (token.role)
        session.user.role = token.role as
          | "OWNER"
          | "ADMIN"
          | "DESIGNER"
          | "VIEWER";
      return session;
    },
  },
});
