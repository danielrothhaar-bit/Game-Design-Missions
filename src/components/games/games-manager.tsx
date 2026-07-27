"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  ImageUp,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameShield } from "./game-shield";
import {
  deleteGame,
  setGameArchived,
  updateGame,
  updateGameCover,
} from "@/server/actions/games";
import { cn } from "@/lib/utils";

type Status = { slug: string; label: string };
export type ManagedGame = {
  id: string;
  slug: string;
  name: string;
  division: string;
  coverColor: string;
  coverImage: string | null;
  statusSlug: string;
  archived: boolean;
};
type Division = { slug: string; label: string; color: string };

/** Read a file, downscale it to a small square-ish icon, return a data URL. */
async function fileToIconDataUrl(file: File, max = 128): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  // webp where supported; browsers fall back to png automatically.
  return canvas.toDataURL("image/webp", 0.9);
}

export function GamesManager({
  divisions,
  games,
  statuses,
}: {
  divisions: Division[];
  games: ManagedGame[];
  statuses: Status[];
}) {
  const known = new Set(divisions.map((d) => d.slug));
  const grouped = divisions
    .map((d) => ({
      division: d,
      rows: games.filter((g) => g.division === d.slug),
    }))
    .filter((g) => g.rows.length > 0);
  const orphans = games.filter((g) => !known.has(g.division));
  if (orphans.length > 0) {
    grouped.push({
      division: { slug: "__other", label: "Other", color: "#9ca3af" },
      rows: orphans,
    });
  }

  return (
    <div className="space-y-8">
      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        grouped.map(({ division, rows }) => (
          <section key={division.slug} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: division.color }}
              />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {division.label}
              </h2>
              <span className="text-sm text-muted-foreground">{rows.length}</span>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {rows.map((g) => (
                <GameRow key={g.id} game={g} statuses={statuses} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function GameRow({
  game,
  statuses,
}: {
  game: ManagedGame;
  statuses: Status[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, startBusy] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function run(fn: () => Promise<unknown>, okMsg?: string) {
    startBusy(async () => {
      try {
        await fn();
        if (okMsg) toast.success(okMsg);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToIconDataUrl(file);
      await updateGameCover({ id: game.id, coverImage: dataUrl });
      toast.success("Icon updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload icon");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5",
        game.archived && "opacity-60",
      )}
    >
      {/* Icon + upload */}
      <div className="relative shrink-0">
        <div
          className="grid size-11 place-items-center rounded-md"
          style={{ backgroundColor: `${game.coverColor}22` }}
        >
          <GameShield slug={game.slug} coverImage={game.coverImage} size={36} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/games/${game.slug}`}
          className="block truncate font-semibold hover:underline"
        >
          {game.name}
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ImageUp className="size-3" />
            )}
            {game.coverImage ? "Change icon" : "Upload icon"}
          </button>
          {game.coverImage ? (
            <button
              type="button"
              onClick={() =>
                run(() => updateGameCover({ id: game.id, coverImage: null }), "Icon removed")
              }
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {/* Status */}
      <select
        value={game.statusSlug}
        disabled={busy}
        onChange={(e) =>
          run(() => updateGame({ id: game.id, statusSlug: e.target.value }))
        }
        className="h-8 shrink-0 rounded-md border border-border bg-input px-2 text-sm"
        aria-label={`Status for ${game.name}`}
      >
        {statuses.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.label}
          </option>
        ))}
      </select>

      {game.archived ? (
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          Archived
        </span>
      ) : null}

      {/* Archive / unarchive */}
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        title={game.archived ? "Unarchive" : "Archive"}
        onClick={() =>
          run(
            () => setGameArchived(game.id, !game.archived),
            game.archived ? "Project restored" : "Project archived",
          )
        }
      >
        {game.archived ? (
          <ArchiveRestore className="size-4" />
        ) : (
          <Archive className="size-4" />
        )}
      </Button>

      {/* Delete */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          title="Delete"
          className="text-red-600 hover:text-red-600 dark:text-red-400"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {game.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the project and all of its phases and
              tasks. This can&rsquo;t be undone — consider archiving instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">Cancel</Button>}
            />
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await deleteGame(game.id);
                  setConfirmOpen(false);
                }, "Project deleted")
              }
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
