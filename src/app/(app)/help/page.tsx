import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Help · How XP works" };

const TIMING = [
  { when: "Early — more than a day before it's due", get: "+25% bonus", color: "#22c55e" },
  { when: "On time — around the due date (or no due date)", get: "Normal (100%)", color: "#71717a" },
  { when: "Late — more than a day after it's due", get: "−25%", color: "#ef4444" },
];

const TITLES = [
  "Apprentice",
  "Journeyman",
  "Designer",
  "Senior Designer",
  "Architect",
  "Game Master",
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          How XP works
        </h1>
        <p className="text-sm text-muted-foreground">
          A plain-English guide to experience points, levels, and badges.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">The big idea</h2>
          <p className="text-sm text-muted-foreground">
            Missions turns finishing work into a little game. Every time you
            complete a task, you earn <strong className="text-foreground">XP</strong>{" "}
            (experience points). Earn enough and you{" "}
            <strong className="text-foreground">level up</strong> and unlock new
            titles and badges. It&rsquo;s purely for motivation and a bit of
            friendly competition — nobody&rsquo;s paid in XP.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">How you earn XP</h2>
          <p className="text-sm text-muted-foreground">
            You earn XP by closing a task (moving it to{" "}
            <strong className="text-foreground">Done</strong>). The amount
            depends on the task&rsquo;s <strong className="text-foreground">estimate</strong>{" "}
            in points (1 = tiny, 8 = big):
          </p>
          <div className="rounded-md bg-muted/40 p-4 text-center font-mono text-sm">
            XP = estimate points × 10
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• A 1-point task → 10 XP</li>
            <li>• A 5-point task → 50 XP</li>
            <li>• An 8-point task → 80 XP</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Bigger, harder tasks are worth more — on purpose (see Fair play).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">The timing bonus</h2>
          <p className="text-sm text-muted-foreground">
            When you finish matters too. Missions checks the due date:
          </p>
          <ul className="space-y-2">
            {TIMING.map((t) => (
              <li
                key={t.when}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <span>{t.when}</span>
                <span className="shrink-0 font-medium" style={{ color: t.color }}>
                  {t.get}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            So a 50-XP task is worth ~63 XP finished early, or ~38 XP finished
            late. Hitting deadlines pays off.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">Helping out (assists)</h2>
          <p className="text-sm text-muted-foreground">
            If a task has more than one person assigned, the lead gets the full
            XP and everyone else who pitched in gets an{" "}
            <strong className="text-foreground">assist</strong> worth 25% of it.
            Reviewing or helping still earns you something.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">Levels &amp; titles</h2>
          <p className="text-sm text-muted-foreground">
            Your XP adds up into a total that puts you at a level. Each level
            takes a bit more XP than the last, so early levels come quick and
            later ones are a grind. As you climb you earn titles:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {TITLES.map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                <span className="rounded-full border border-border px-2.5 py-0.5">
                  {t}
                </span>
                {i < TITLES.length - 1 ? (
                  <span className="text-muted-foreground">→</span>
                ) : null}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Your sidebar and profile show your level, title, and progress to the
            next one.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">Streaks &amp; badges</h2>
          <p className="text-sm text-muted-foreground">
            Close a task on consecutive days to build a{" "}
            <strong className="text-foreground">streak</strong> 🔥 — miss a day
            and it resets. <strong className="text-foreground">Badges</strong>{" "}
            are one-time achievements that pop automatically at milestones (your
            first task, hitting due dates, a 7-day streak, and more) and show on
            your profile.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">Fair play</h2>
          <p className="text-sm text-muted-foreground">
            A few guardrails keep XP honest:
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Points, not task count.</strong>{" "}
              Splitting one big task into ten tiny ones doesn&rsquo;t earn more —
              the points are what count.
            </li>
            <li>
              <strong className="text-foreground">Estimates lock when work starts.</strong>{" "}
              Once a task hits In Progress its points are frozen, so set the
              estimate up front.
            </li>
            <li>
              <strong className="text-foreground">Reopening reverses XP.</strong>{" "}
              Reopen a finished task within about a week and its XP is taken
              back — no closing-and-reopening for repeat points.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">XP vs. skill proficiency</h2>
          <p className="text-sm text-muted-foreground">
            These are two different things:
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">XP / levels</strong> — overall
              momentum from finishing any work (this guide).
            </li>
            <li>
              <strong className="text-foreground">Skill proficiency</strong> —
              how good you are at a specific craft (3D Printing, Puzzle Design,
              …), set by admins and shown as your RPG radar. Completing
              skill-tagged tasks builds toward promotions in those skills — a
              separate system in the Summary tab.
            </li>
          </ul>
          <p className="pt-1 text-xs text-muted-foreground">
            Admins can tune every XP number (per-point value, timing bonuses,
            assist %, level costs, titles) in Admin → XP &amp; Levels, and
            badges in Admin → Badges.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
