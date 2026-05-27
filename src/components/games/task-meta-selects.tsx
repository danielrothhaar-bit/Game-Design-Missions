"use client";

import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TeamOption = { id: string; name: string; color: string };
export type SkillOption = { id: string; name: string; color: string };

export const SKILL_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const skillLevelLabel = (l: string) =>
  l.charAt(0) + l.slice(1).toLowerCase();

export function TeamSelect({
  teams,
  value,
  onChange,
}: {
  teams: TeamOption[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const team = teams.find((t) => t.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-7 w-full items-center justify-center rounded px-2 text-xs font-medium transition-opacity hover:opacity-90"
        style={
          team
            ? { backgroundColor: team.color, color: "#fff" }
            : undefined
        }
      >
        {team ? (
          <span className="truncate">{team.name}</span>
        ) : (
          <span className="text-muted-foreground">— team —</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange(null)} className="text-xs">
          <span className="text-muted-foreground">Unassigned</span>
          {value === null ? <Check className="ml-auto size-3" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {teams.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => onChange(t.id)}
            className="gap-2 text-xs"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <span className="truncate">{t.name}</span>
            {t.id === value ? <Check className="ml-auto size-3" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SkillSelect({
  skills,
  skillId,
  level,
  onChange,
}: {
  skills: SkillOption[];
  skillId: string | null;
  level: SkillLevel | null;
  onChange: (skillId: string | null, level: SkillLevel | null) => void;
}) {
  const skill = skills.find((s) => s.id === skillId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 w-full items-center gap-1.5 rounded px-1.5 text-xs hover:bg-accent">
        {skill ? (
          <>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: skill.color }}
            />
            <span className="truncate">{skill.name}</span>
            {level ? (
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                {skillLevelLabel(level)[0]}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">— skill —</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => onChange(null, null)}
          className="text-xs"
        >
          <span className="text-muted-foreground">No skill</span>
          {skillId === null ? <Check className="ml-auto size-3" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {skills.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => onChange(s.id, level ?? "INTERMEDIATE")}
            className="gap-2 text-xs"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="truncate">{s.name}</span>
            {s.id === skillId ? <Check className="ml-auto size-3" /> : null}
          </DropdownMenuItem>
        ))}
        {skill ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Experience level
            </div>
            {SKILL_LEVELS.map((l) => (
              <DropdownMenuItem
                key={l}
                onClick={() => onChange(skillId, l)}
                className="text-xs"
              >
                {skillLevelLabel(l)}
                {l === level ? <Check className="ml-auto size-3" /> : null}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
