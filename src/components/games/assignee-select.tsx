"use client";

import { Check, UserPlus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { initials } from "@/lib/format";

export type AssigneeUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export function AssigneeSelect({
  users,
  assignedId,
  onChange,
}: {
  users: AssigneeUser[];
  assignedId: string | null;
  onChange: (next: string | null) => void;
}) {
  const assigned = users.find((u) => u.id === assignedId);

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-7 items-center gap-1.5 rounded-full pl-0.5 pr-2 transition-colors hover:bg-accent"
        aria-label="Set assignee"
      >
        {assigned ? (
          <>
            <Avatar className="size-6">
              {assigned.image ? (
                <AvatarImage src={assigned.image} alt={assigned.name ?? ""} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials(assigned.name ?? assigned.email)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">
              {(assigned.name ?? assigned.email).split(" ")[0]}
            </span>
          </>
        ) : (
          <span className="grid size-6 place-items-center rounded-full border border-dashed text-muted-foreground">
            <UserPlus className="size-3" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <Command>
          <CommandInput placeholder="Find teammate…" />
          <CommandList>
            <CommandEmpty>No teammates found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__unassigned__"
                onSelect={() => onChange(null)}
              >
                <span className="grid size-6 place-items-center rounded-full border border-dashed text-muted-foreground">
                  <UserPlus className="size-3" />
                </span>
                Unassigned
                {assignedId === null ? (
                  <Check className="ml-auto size-3" />
                ) : null}
              </CommandItem>
              {users.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.name ?? ""} ${u.email}`}
                  onSelect={() => onChange(u.id)}
                >
                  <Avatar className="size-6">
                    {u.image ? (
                      <AvatarImage src={u.image} alt={u.name ?? ""} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials(u.name ?? u.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm">{u.name ?? u.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.email}
                    </span>
                  </div>
                  {u.id === assignedId ? (
                    <Check className="ml-auto size-3" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
