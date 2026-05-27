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
import { cn } from "@/lib/utils";

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
                  className="inline-flex max-w-[88px] items-center gap-1 rounded px-1 py-0.5 text-[10px]"
                  style={{ backgroundColor: `${s.color}22`, color: s.color }}
                >
                  <span className="truncate">{s.name}</span>
                  {lvl ? (
                    <span className="opacity-70">{skillLevelLabel(lvl)[0]}</span>
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
      <PopoverContent align="start" className="max-h-96 w-64 overflow-y-auto p-1">
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
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate">{s.name}</span>
                  {sel ? <Check className="ml-auto size-3" /> : null}
                </button>
                {sel ? (
                  <div className="mt-1 flex gap-1 pl-5">
                    {SKILL_LEVELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(s.id, l)}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] transition-colors",
                          sel === l
                            ? "bg-foreground/15 text-foreground"
                            : "text-muted-foreground hover:bg-accent",
                        )}
                        title={skillLevelLabel(l)}
                      >
                        {skillLevelLabel(l)}
                      </button>
                    ))}
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
