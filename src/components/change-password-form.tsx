"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setOwnPassword } from "@/server/actions/users";

export function ChangePasswordForm() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (pw !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    start(async () => {
      try {
        await setOwnPassword(pw);
        setPw("");
        setConfirm("");
        toast.success("Password updated");
      } catch {
        toast.error("Could not update password");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <Input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="New password"
        autoComplete="new-password"
        className="max-w-[200px]"
      />
      <Input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm"
        autoComplete="new-password"
        className="max-w-[200px]"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
