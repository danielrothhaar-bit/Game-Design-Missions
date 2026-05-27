"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Eye, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { startImpersonation } from "@/server/actions/impersonation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import {
  createUser,
  setUserDivisionVisible,
  setUserPassword,
  setUserSkillLevel,
  updateUserName,
  updateUserRole,
} from "@/server/actions/users";

type Role = "OWNER" | "ADMIN" | "DESIGNER" | "VIEWER";
const ROLES: Role[] = ["OWNER", "ADMIN", "DESIGNER", "VIEWER"];

type SkillOpt = { id: string; name: string; color: string };
type DivisionOpt = { slug: string; label: string };
type User = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  skills: Record<string, number>; // skillId -> level 0..4
  hiddenDivisions: string[]; // division slugs the user does NOT see
  hasPassword: boolean;
};

const LEVEL_LABEL = ["None", "Beg", "Int", "Adv", "Exp"];
const LEVEL_COLOR = ["#52525b", "#22c55e", "#eab308", "#ef4444", "#a855f7"];

export function UsersAdmin({
  initialUsers,
  skills,
  divisions,
}: {
  initialUsers: User[];
  skills: SkillOpt[];
  divisions: DivisionOpt[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("DESIGNER");
  const [, start] = useTransition();

  function viewAs(id: string) {
    start(async () => {
      try {
        await startImpersonation(id);
        router.push("/my-work");
        router.refresh();
      } catch {
        toast.error("Could not start viewing as this user");
      }
    });
  }

  function add() {
    const e = email.trim().toLowerCase();
    if (!e) return;
    start(async () => {
      try {
        await createUser({ email: e, role });
        setUsers((prev) => [
          ...prev,
          {
            id: `tmp-${e}`,
            name: e.split("@")[0],
            email: e,
            role,
            skills: {},
            hiddenDivisions: [],
            hasPassword: false,
          },
        ]);
        setEmail("");
        toast.success(`Added ${e}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add user");
      }
    });
  }

  function changeName(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, name: trimmed } : u)),
    );
    start(async () => {
      try {
        await updateUserName(id, trimmed);
      } catch {
        toast.error("Could not rename user");
      }
    });
  }

  function changeRole(id: string, next: Role) {
    const before = users.find((u) => u.id === id)?.role;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: next } : u)));
    start(async () => {
      try {
        await updateUserRole(id, next);
      } catch (err) {
        if (before)
          setUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, role: before } : u)),
          );
        toast.error(err instanceof Error ? err.message : "Could not change role");
      }
    });
  }

  function setPassword(userId: string, password: string) {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, hasPassword: true } : u)),
    );
    start(async () => {
      try {
        await setUserPassword(userId, password);
        toast.success("Password set");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not set password");
      }
    });
  }

  function toggleDivision(userId: string, slug: string, visible: boolean) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              hiddenDivisions: visible
                ? u.hiddenDivisions.filter((s) => s !== slug)
                : [...new Set([...u.hiddenDivisions, slug])],
            }
          : u,
      ),
    );
    start(async () => {
      try {
        await setUserDivisionVisible(userId, slug, visible);
      } catch {
        toast.error("Could not update division visibility");
      }
    });
  }

  function setSkill(userId: string, skillId: string, level: number) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, skills: { ...u.skills, [skillId]: level } }
          : u,
      ),
    );
    start(async () => {
      try {
        await setUserSkillLevel(userId, skillId, level);
      } catch {
        toast.error("Could not save proficiency");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            Add user by email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@theescapegame.com"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.toLowerCase()}
            </option>
          ))}
        </select>
        <Button onClick={add}>
          <UserPlus className="size-4" />
          Add
        </Button>
      </div>

      <ul className="space-y-2">
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            skills={skills}
            divisions={divisions}
            onChangeName={(n) => changeName(u.id, n)}
            onChangeRole={(r) => changeRole(u.id, r)}
            onSetSkill={(skillId, level) => setSkill(u.id, skillId, level)}
            onToggleDivision={(slug, visible) =>
              toggleDivision(u.id, slug, visible)
            }
            onSetPassword={(pw) => setPassword(u.id, pw)}
            onViewAs={() => viewAs(u.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function UserRow({
  user,
  skills,
  divisions,
  onChangeName,
  onChangeRole,
  onSetSkill,
  onToggleDivision,
  onSetPassword,
  onViewAs,
}: {
  user: User;
  skills: SkillOpt[];
  divisions: DivisionOpt[];
  onChangeName: (name: string) => void;
  onChangeRole: (r: Role) => void;
  onSetSkill: (skillId: string, level: number) => void;
  onToggleDivision: (slug: string, visible: boolean) => void;
  onSetPassword: (password: string) => void;
  onViewAs: () => void;
}) {
  const [open, setOpen] = useState(false);
  const setCount = Object.values(user.skills).filter((l) => l > 0).length;

  return (
    <li className="rounded-lg border border-border">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials(user.name ?? user.email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Input
            defaultValue={user.name ?? ""}
            placeholder={user.email.split("@")[0]}
            className="h-7 border-transparent px-1 text-sm font-medium hover:border-border focus-visible:border-border"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== (user.name ?? "")) onChangeName(v);
            }}
          />
          <p className="truncate px-1 text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>
        <select
          value={user.role}
          onChange={(e) => onChangeRole(e.target.value as Role)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.toLowerCase()}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
          />
          Skills
          <span className="text-muted-foreground">({setCount})</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          title="View the app as this user"
          onClick={onViewAs}
        >
          <Eye className="size-4" />
        </Button>
      </div>
      {open ? (
        <div className="space-y-4 border-t border-border px-4 py-3">
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Visible divisions
            </p>
            <div className="flex flex-wrap gap-2">
              {divisions.map((d) => {
                const visible = !user.hiddenDivisions.includes(d.slug);
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => onToggleDivision(d.slug, !visible)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      visible
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-border text-muted-foreground line-through hover:bg-accent",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Password
            </p>
            <PasswordControl
              hasPassword={user.hasPassword}
              onSet={onSetPassword}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Skill proficiency
            </p>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {skills.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No skills defined yet.
            </p>
          ) : (
            skills.map((s) => (
              <SkillSlider
                key={s.id}
                name={s.name}
                color={s.color}
                value={user.skills[s.id] ?? 0}
                onCommit={(level) => onSetSkill(s.id, level)}
              />
            ))
          )}
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function PasswordControl({
  hasPassword,
  onSet,
}: {
  hasPassword: boolean;
  onSet: (password: string) => void;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder={hasPassword ? "Set a new password" : "Set a password"}
        className="h-8 max-w-xs"
        autoComplete="new-password"
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={pw.length < 6}
        onClick={() => {
          onSet(pw);
          setPw("");
        }}
      >
        {hasPassword ? "Reset" : "Set"}
      </Button>
      <span className="text-xs text-muted-foreground">
        {hasPassword
          ? "Password set"
          : "No password — user sets one on first login"}
      </span>
    </div>
  );
}

function SkillSlider({
  name,
  color,
  value,
  onCommit,
}: {
  name: string;
  color: string;
  value: number;
  onCommit: (level: number) => void;
}) {
  const [local, setLocal] = useState(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {name}
        </span>
        <span style={{ color: LEVEL_COLOR[local] }}>{LEVEL_LABEL[local]}</span>
      </div>
      <input
        type="range"
        min={0}
        max={4}
        step={1}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onPointerUp={() => local !== value && onCommit(local)}
        onKeyUp={() => local !== value && onCommit(local)}
        className="w-full accent-primary"
        style={{ accentColor: LEVEL_COLOR[local] }}
      />
    </div>
  );
}
