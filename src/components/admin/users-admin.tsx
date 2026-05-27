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
  setUserSkillLevel,
  updateUserName,
  updateUserRole,
} from "@/server/actions/users";

type Role = "OWNER" | "ADMIN" | "DESIGNER" | "VIEWER";
const ROLES: Role[] = ["OWNER", "ADMIN", "DESIGNER", "VIEWER"];

type SkillOpt = { id: string; name: string; color: string };
type User = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  skills: Record<string, number>; // skillId -> level 0..4
};

const LEVEL_LABEL = ["None", "Beg", "Int", "Adv", "Exp"];
const LEVEL_COLOR = ["#52525b", "#22c55e", "#eab308", "#ef4444", "#a855f7"];

export function UsersAdmin({
  initialUsers,
  skills,
}: {
  initialUsers: User[];
  skills: SkillOpt[];
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
            onChangeName={(n) => changeName(u.id, n)}
            onChangeRole={(r) => changeRole(u.id, r)}
            onSetSkill={(skillId, level) => setSkill(u.id, skillId, level)}
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
  onChangeName,
  onChangeRole,
  onSetSkill,
  onViewAs,
}: {
  user: User;
  skills: SkillOpt[];
  onChangeName: (name: string) => void;
  onChangeRole: (r: Role) => void;
  onSetSkill: (skillId: string, level: number) => void;
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
        <div className="grid gap-x-6 gap-y-3 border-t border-border px-4 py-3 sm:grid-cols-2">
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
      ) : null}
    </li>
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
