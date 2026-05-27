"use client";

import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

const SKILL_LEVEL_ABBR: Record<string, string> = {
  BEGINNER: "Beg",
  INTERMEDIATE: "Int",
  ADVANCED: "Adv",
  EXPERT: "Exp",
};
export const skillLevelAbbr = (l: string) => SKILL_LEVEL_ABBR[l] ?? l;

// Difficulty → color: green / yellow / red / purple.
export const SKILL_LEVEL_COLOR: Record<string, string> = {
  BEGINNER: "#22c55e",
  INTERMEDIATE: "#eab308",
  ADVANCED: "#ef4444",
  EXPERT: "#a855f7",
};

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

export type TaskSkill = { skillId: string; level: SkillLevel };

/**
 * Multi-skill picker. Each selected skill carries its own difficulty.
 */
export function SkillSelect({
  skills,
  value,
  onChange,
}: {
  skills: SkillOption[];
  value: TaskSkill[];
  onChange: (next: TaskSkill[]) => void;
}) {
  const selectedById = new Map(value.map((v) => [v.skillId, v.level]));

  function toggle(skillId: string) {
    if (selectedById.has(skillId)) {
      onChange(value.filter((v) => v.skillId !== skillId));
    } else {
      onChange([...value, { skillId, level: "INTERMEDIATE" }]);
    }
  }

  function setLevel(skillId: string, level: SkillLevel) {
    onChange(value.map((v) => (v.skillId === skillId ? { ...v, level } : v)));
  }

  const selectedSkills = value
    .map((v) => skills.find((s) => s.id === v.skillId))
    .filter(Boolean) as SkillOption[];

  return (
    <Popover>
      <PopoverTrigger className="flex h-7 w-full items-center gap-1 overflow-hidden rounded px-1.5 text-xs hover:bg-accent">
        {selectedSkills.length === 0 ? (
          <span className="text-muted-foreground">— skills —</span>
        ) : (
          <span className="flex items-center gap-1 overflow-hidden">
            {selectedSkills.slice(0, 2).map((s) => {
              const lvl = selectedById.get(s.id);
              return (
                <span
                  key={s.id}
                  className="inline-flex max-w-[130px] items-center gap-1 rounded py-0.5 pl-1.5 pr-0.5 text-[10px]"
                  style={{ backgroundColor: `${s.color}22`, color: s.color }}
                >
                  <span className="truncate">{s.name}</span>
                  {lvl ? (
                    <span
                      className="rounded px-1 text-[9px] font-bold"
                      style={{
                        backgroundColor: SKILL_LEVEL_COLOR[lvl],
                        color: "#0a0a0a",
                      }}
                    >
                      {skillLevelAbbr(lvl)}
                    </span>
                  ) : null}
                </span>
              );
            })}
            {selectedSkills.length > 2 ? (
              <span className="text-[10px] text-muted-foreground">
                +{selectedSkills.length - 2}
              </span>
            ) : null}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[28rem] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto p-1"
      >
        {skills.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No skills defined. Add them in Admin → Skills.
          </p>
        ) : (
          skills.map((s) => {
            const sel = selectedById.get(s.id);
            return (
              <div key={s.id} className="rounded-md px-1 py-1">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate">{s.name}</span>
                  {sel ? <Check className="ml-auto size-3.5" /> : null}
                </button>
                {sel ? (
                  <div className="mt-1 flex flex-wrap gap-1.5 pl-5">
                    {SKILL_LEVELS.map((l) => {
                      const active = sel === l;
                      const color = SKILL_LEVEL_COLOR[l];
                      return (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLevel(s.id, l)}
                          className="rounded px-2 py-0.5 text-xs font-medium transition-colors"
                          style={
                            active
                              ? { backgroundColor: color, color: "#0a0a0a" }
                              : { color, border: `1px solid ${color}55` }
                          }
                        >
                          {skillLevelLabel(l)}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}
