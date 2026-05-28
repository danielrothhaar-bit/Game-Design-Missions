#!/usr/bin/env node
/**
 * Pulls user-attached images out of the current Claude Code chat transcript
 * and writes them into ./public/brand/ so the app can serve them directly.
 *
 * Usage:
 *   node scripts/extract-recent-attachments.mjs                     # last user msg
 *   node scripts/extract-recent-attachments.mjs --message=last      # explicit
 *   node scripts/extract-recent-attachments.mjs --name=logo,logo-light
 *
 * The transcript JSONL lives at:
 *   ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
 *
 * Each user message is one line of JSON; image attachments appear as
 * { type: "image", source: { type: "base64", media_type, data } } content
 * blocks. We grab the most recent user message that contains any images,
 * decode each, and write to public/brand/{name}.{ext}.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [[m[1], m[2]]] : a.startsWith("--") ? [[a.slice(2), true]] : [];
  }),
);

const cwd = process.cwd();
const encoded = "-" + cwd.replace(/^\//, "").replace(/\//g, "-");
const projectDir = join(homedir(), ".claude", "projects", encoded);

function newestSessionFile() {
  const entries = readdirSync(projectDir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({ f, t: statSync(join(projectDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!entries.length) {
    throw new Error(`No transcript JSONL found in ${projectDir}`);
  }
  return join(projectDir, entries[0].f);
}

const transcript = newestSessionFile();
console.log(`reading transcript: ${transcript}`);

const lines = readFileSync(transcript, "utf8").split("\n").filter(Boolean);
let images = null; // images from the most-recent user message with attachments
let foundOnLine = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  let row;
  try {
    row = JSON.parse(lines[i]);
  } catch {
    continue;
  }
  const msg = row.message || row;
  if (!msg || msg.role !== "user") continue;
  const content = msg.content;
  if (!Array.isArray(content)) continue;
  const found = content.filter(
    (b) =>
      b &&
      b.type === "image" &&
      b.source &&
      b.source.type === "base64" &&
      typeof b.source.data === "string",
  );
  if (found.length > 0) {
    images = found;
    foundOnLine = i + 1;
    break;
  }
}
if (!images) {
  console.error(
    "No image attachments found in any user message in this session.",
  );
  process.exit(1);
}
console.log(`found ${images.length} image(s) on line ${foundOnLine}`);

const outDir = resolve(cwd, "public", "brand");
mkdirSync(outDir, { recursive: true });

// Optional --name=logo,logo-light maps to per-image base filenames.
const names = (args.name && typeof args.name === "string"
  ? args.name.split(",")
  : ["logo", "logo-light", "logo-extra-1", "logo-extra-2", "logo-extra-3"]
).map((s) => s.trim());

images.forEach((img, idx) => {
  const ext = (img.source.media_type || "image/png").split("/").pop() || "png";
  const name = names[idx] || `image-${idx}`;
  const out = join(outDir, `${name}.${ext}`);
  writeFileSync(out, Buffer.from(img.source.data, "base64"));
  const kb = Math.round(Buffer.byteLength(img.source.data, "base64") / 1024);
  console.log(`  → ${out}  (${kb} KB)`);
});

console.log("done.");
