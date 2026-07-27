"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/server/actions/auth-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";
import Link from "next/link";

export function UserMenu({
  name,
  email,
  image,
  level,
}: {
  name: string | null;
  email: string;
  image: string | null;
  level: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        className="flex items-center gap-2 rounded-full p-0.5 outline-none ring-offset-background transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="size-8">
          {image ? <AvatarImage src={image} alt={name ?? email} /> : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            {initials(name ?? email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium leading-tight">
            {name ?? email.split("@")[0]}
          </span>
          <span className="text-xs font-normal text-muted-foreground leading-tight">
            {email}
          </span>
          <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            Level {level}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/profile">
              <UserIcon className="size-4" />
              Profile
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logoutAction()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
