# Scripts

## `extract-recent-attachments.mjs`

Pulls user-attached images from the current Claude Code chat transcript and
writes them to `public/brand/` so the running app can serve them.

The transcript only persists after a turn finishes, so attachments from the
*current* in-flight message are not available — they show up after the user
hits send. From the next message onwards, run:

```bash
node scripts/extract-recent-attachments.mjs
# or with explicit names
node scripts/extract-recent-attachments.mjs --name=logo,logo-light
```

Files land at e.g. `public/brand/logo.png`. The `<Logo>` component in
`src/components/brand/logo.tsx` automatically prefers `/brand/logo.png` over
the SVG fallback, so the new images appear everywhere as soon as they exist.
