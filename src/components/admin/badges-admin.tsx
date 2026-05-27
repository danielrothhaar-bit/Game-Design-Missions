"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createBadge, updateBadge } from "@/server/actions/config";

type Badge = {
  code: string;
  name: string;
  description: string;
  color: string;
  imageUrl: string | null;
  threshold: number | null;
  criteriaType: string;
};

const CRITERIA_TYPES = [
  "TASK_CLOSED_COUNT",
  "ON_TIME_CLOSES",
  "DISCIPLINE_CLOSES",
  "STREAK",
] as const;

/** Reads an image file, downscales to a small square PNG data URL. */
function fileToDataUrl(file: File, size = 96): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function BadgeMark({ badge }: { badge: Badge }) {
  if (badge.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small data-URL avatar
      <img
        src={badge.imageUrl}
        alt={badge.name}
        className="size-9 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <span
      className="size-9 shrink-0 rounded-md border"
      style={{ borderColor: badge.color, backgroundColor: `${badge.color}22` }}
    />
  );
}

export function BadgesAdmin({ initial }: { initial: Badge[] }) {
  const [badges, setBadges] = useState<Badge[]>(initial);
  const [pending, start] = useTransition();

  // create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] =
    useState<(typeof CRITERIA_TYPES)[number]>("TASK_CLOSED_COUNT");
  const [newThreshold, setNewThreshold] = useState(1);
  const [newColor, setNewColor] = useState("#7c3aed");
  const [showCreate, setShowCreate] = useState(false);

  function patch(code: string, p: Partial<Badge>) {
    setBadges((prev) => prev.map((b) => (b.code === code ? { ...b, ...p } : b)));
  }

  function save(b: Badge) {
    start(async () => {
      try {
        await updateBadge({
          code: b.code,
          name: b.name,
          description: b.description,
          color: b.color,
          threshold: b.threshold ?? undefined,
        });
        toast.success(`Saved "${b.name}"`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save badge");
      }
    });
  }

  async function uploadImage(code: string, file: File) {
    try {
      const dataUrl = await fileToDataUrl(file);
      patch(code, { imageUrl: dataUrl });
      await updateBadge({ code, imageUrl: dataUrl });
      toast.success("Badge image updated");
    } catch {
      toast.error("Could not process image");
    }
  }

  async function clearImage(code: string) {
    patch(code, { imageUrl: null });
    try {
      await updateBadge({ code, imageUrl: null });
    } catch {
      toast.error("Could not remove image");
    }
  }

  function create() {
    if (!newName.trim()) return;
    start(async () => {
      try {
        await createBadge({
          name: newName.trim(),
          description: newDesc.trim() || "Custom badge.",
          color: newColor,
          criteriaType: newType,
          threshold: newThreshold,
        });
        toast.success(`Created "${newName}"`);
        setBadges((prev) => [
          ...prev,
          {
            code: newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name: newName.trim(),
            description: newDesc.trim() || "Custom badge.",
            color: newColor,
            imageUrl: null,
            threshold: newThreshold,
            criteriaType: newType,
          },
        ]);
        setNewName("");
        setNewDesc("");
        setShowCreate(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create badge");
      }
    });
  }

  return (
    <div className="space-y-4">
      {showCreate ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Speed Demon"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded border border-border bg-transparent"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What earns this badge?"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Criteria</Label>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as (typeof CRITERIA_TYPES)[number])
                }
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                {CRITERIA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Threshold</Label>
              <Input
                type="number"
                value={newThreshold}
                onChange={(e) => setNewThreshold(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={create} disabled={pending}>
              Create badge
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" />
          New badge
        </Button>
      )}

      {badges.map((b) => (
        <BadgeEditor
          key={b.code}
          badge={b}
          pending={pending}
          onPatch={(p) => patch(b.code, p)}
          onSave={() => save(b)}
          onUpload={(file) => uploadImage(b.code, file)}
          onClearImage={() => clearImage(b.code)}
        />
      ))}
      <p className="text-xs text-muted-foreground">
        Badges are awarded automatically when a member hits the threshold.
        Upload an image to replace the colored placeholder.
      </p>
    </div>
  );
}

function BadgeEditor({
  badge,
  pending,
  onPatch,
  onSave,
  onUpload,
  onClearImage,
}: {
  badge: Badge;
  pending: boolean;
  onPatch: (p: Partial<Badge>) => void;
  onSave: () => void;
  onUpload: (file: File) => void;
  onClearImage: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <BadgeMark badge={badge} />
        <Input
          value={badge.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          className="flex-1 font-medium"
        />
        <input
          type="color"
          value={badge.color}
          onChange={(e) => onPatch({ color: e.target.value })}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
          aria-label={`${badge.name} color`}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => fileRef.current?.click()}
          title="Upload badge image"
        >
          <ImagePlus className="size-4" />
        </Button>
        {badge.imageUrl ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-destructive"
            onClick={onClearImage}
            title="Remove image"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      <Textarea
        value={badge.description}
        onChange={(e) => onPatch({ description: e.target.value })}
        rows={2}
        className="text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-2 py-1 font-mono">
            {badge.criteriaType}
          </span>
          <span>threshold</span>
          <Input
            type="number"
            value={badge.threshold ?? 1}
            onChange={(e) => onPatch({ threshold: Number(e.target.value) })}
            className="h-8 w-24"
          />
        </div>
        <Button size="sm" onClick={onSave} disabled={pending}>
          Save
        </Button>
      </div>
    </div>
  );
}
