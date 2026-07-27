"use client";

import { useState, useTransition } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteUserMap,
  syncFromDesignSuite,
  upsertUserMap,
} from "@/server/actions/design-suite-sync";
import type { SyncSummary } from "@/lib/design-suite";

type MapRow = { designSuiteName: string; email: string };

export function DesignSuiteAdmin({
  initialMap,
  configured,
  lastSync,
}: {
  initialMap: MapRow[];
  configured: boolean;
  lastSync: string | null;
}) {
  const [rows, setRows] = useState<MapRow[]>(initialMap);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [syncing, startSync] = useTransition();
  const [, startEdit] = useTransition();

  function runSync() {
    startSync(async () => {
      try {
        const result = await syncFromDesignSuite();
        setSummary(result);
        toast.success(
          `Synced: ${result.created} new, ${result.updated} updated` +
            (result.skippedNoGame.length
              ? `, ${result.skippedNoGame.length} skipped`
              : ""),
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Sync failed");
      }
    });
  }

  function addRow() {
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    if (!name || !email) return;
    const before = rows;
    setRows((prev) => [
      ...prev.filter((r) => r.designSuiteName !== name),
      { designSuiteName: name, email },
    ]);
    setNewName("");
    setNewEmail("");
    startEdit(async () => {
      try {
        await upsertUserMap(name, email);
        toast.success(`Mapped "${name}"`);
      } catch (e) {
        setRows(before);
        toast.error(e instanceof Error ? e.message : "Could not save mapping");
      }
    });
  }

  function removeRow(name: string) {
    const before = rows;
    setRows((prev) => prev.filter((r) => r.designSuiteName !== name));
    startEdit(async () => {
      try {
        await deleteUserMap(name);
      } catch {
        setRows(before);
        toast.error("Could not remove mapping");
      }
    });
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Integration not configured — set <code>DESIGN_SUITE_URL</code> and{" "}
          <code>DESIGN_SUITE_KEY</code> in the environment. Sync is disabled
          until then.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={runSync} disabled={!configured || syncing}>
          <RefreshCw className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {lastSync
            ? `Last sync cursor: ${new Date(lastSync).toLocaleString()}`
            : "Never synced"}
        </span>
      </div>

      {summary && (
        <div className="rounded-md border p-3 text-sm">
          <p>
            Pulled {summary.pulled} · Created {summary.created} · Updated{" "}
            {summary.updated} · Assigned {summary.assigned}
          </p>
          {summary.skippedNoGame.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-amber-600 dark:text-amber-400">
                {summary.skippedNoGame.length} skipped (no matching game)
              </summary>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {summary.skippedNoGame.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm font-medium">Assignee mapping</h4>
        <p className="mb-3 text-sm text-muted-foreground">
          Design Suite stores an assignee as a name. Map each name to a Quests
          user&apos;s email so synced tasks get assigned.
        </p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.designSuiteName} className="flex items-center gap-2">
              <Input value={r.designSuiteName} readOnly className="max-w-[220px]" />
              <span className="text-muted-foreground">→</span>
              <Input value={r.email} readOnly className="max-w-[280px]" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(r.designSuiteName)}
                aria-label="Remove mapping"
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Design Suite name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-[220px]"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              placeholder="quests-user@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRow()}
              className="max-w-[280px]"
            />
            <Button variant="outline" size="icon" onClick={addRow} aria-label="Add mapping">
              <Plus />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
