import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Help · How Quests works" };

const SKILL_LEVELS = [
  { label: "Beginner", color: "#22c55e" },
  { label: "Intermediate", color: "#eab308" },
  { label: "Advanced", color: "#ef4444" },
  { label: "Expert", color: "#a855f7" },
];

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
        <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
        <p className="text-sm text-muted-foreground">
          A plain-English guide to experience points and skills.
        </p>
      </header>

      <h2 className="border-b border-border pb-1 text-lg font-semibold">
        Experience points (XP)
      </h2>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">The big idea</h2>
          <p className="text-sm text-muted-foreground">
            Quests turns finishing work into a little game. Every time you
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
            <strong className="text-foreground">Done</strong>). There&rsquo;s no
            points number to type — a task&rsquo;s value is figured out
            automatically from how it was set up:
          </p>
          <div className="rounded-md bg-muted/40 p-4 text-center font-mono text-sm">
            XP = difficulty × scope × priority × timing
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Difficulty</strong> — each
              skill tagged on the task adds weight by its level (Beginner →
              Expert). More skills, or harder ones, mean more XP.
            </li>
            <li>
              <strong className="text-foreground">Scope</strong> — a quick S vs.
              a massive XL. Set when the task is scoped (and it locks once work
              starts).
            </li>
            <li>
              <strong className="text-foreground">Priority</strong> — urgent,
              high-impact work is worth a bit more than low-priority work.
            </li>
            <li>
              <strong className="text-foreground">Timing</strong> — see below.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Bigger, harder, more important tasks are worth more — on purpose
            (see Fair play). The Scope picker on each task shows a live
            &ldquo;≈ XP&rdquo; so you know what it&rsquo;s worth.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-base font-semibold">The timing bonus</h2>
          <p className="text-sm text-muted-foreground">
            When you finish matters too. Quests checks the due date:
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
            Close a task on consecutive working days to build a{" "}
            <strong className="text-foreground">streak</strong> 🔥 — weekends are
            off, so closing on Friday and the next Monday keeps it going; skip a
            working day and it resets.{" "}
            <strong className="text-foreground">Badges</strong>{" "}
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
              <strong className="text-foreground">You don&rsquo;t set your own reward.</strong>{" "}
              XP comes from the task&rsquo;s skills, scope, and priority — all
              set when it&rsquo;s scoped — not from a number you type when you
              finish.
            </li>
            <li>
              <strong className="text-foreground">Scope locks when work starts.</strong>{" "}
              Once a task hits In Progress its scope is frozen, so it can&rsquo;t
              be bumped up right before closing.
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
        <CardContent className="space-y-2 p-6">
          <h2 className="text-base font-semibold">Tuning XP (admins)</h2>
          <p className="text-sm text-muted-foreground">
            Admins can change every XP number — per-point value, the timing
            bonuses, assist %, how much each level costs, and the title names —
            in <strong className="text-foreground">Admin → XP &amp; Levels</strong>,
            and badges in <strong className="text-foreground">Admin → Badges</strong>.
            Changes take effect on the next task close.
          </p>
        </CardContent>
      </Card>

      <h2 className="border-b border-border pb-1 pt-2 text-lg font-semibold">
        Skills &amp; proficiency
      </h2>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h3 className="text-base font-semibold">What skills are</h3>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">XP</strong> measures overall
            momentum; <strong className="text-foreground">skills</strong> measure
            what you&rsquo;re good at. Skills are the crafts your studio works in
            — 3D Printing, Puzzle Design, Documentation, Electronics, and so on.
            Admins manage the list in{" "}
            <strong className="text-foreground">Admin → Skills</strong> (add,
            rename, recolor).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h3 className="text-base font-semibold">Tagging tasks with skills</h3>
          <p className="text-sm text-muted-foreground">
            Any task can be tagged with one or more skills from the{" "}
            <strong className="text-foreground">Skills</strong> column on a
            game&rsquo;s task list, and each one gets a difficulty — how hard
            that task is for that skill:
          </p>
          <div className="flex flex-wrap gap-2">
            {SKILL_LEVELS.map((l) => (
              <span
                key={l.label}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${l.color}22`, color: l.color }}
              >
                {l.label}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Beginner → Expert (green → purple). It says &ldquo;doing this task
            well takes about this level of skill.&rdquo;
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h3 className="text-base font-semibold">
            Your proficiency (the character sheet)
          </h3>
          <p className="text-sm text-muted-foreground">
            Each person has a proficiency in each skill — None, Beginner,
            Intermediate, Advanced, or Expert. Admins set these with sliders in{" "}
            <strong className="text-foreground">Admin → Users → Settings</strong>.
            Your proficiencies render as an RPG-style{" "}
            <strong className="text-foreground">radar chart</strong> on your
            Profile and My Work — a quick read of your strengths.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h3 className="text-base font-semibold">Building your record</h3>
          <p className="text-sm text-muted-foreground">
            Every skill-tagged task you complete is tallied. The{" "}
            <strong className="text-foreground">Summary</strong> tab on My Work
            shows, for each skill, how many tasks you&rsquo;ve finished at each
            difficulty — the evidence of what you&rsquo;ve actually been doing.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h3 className="text-base font-semibold">Getting promoted</h3>
          <p className="text-sm text-muted-foreground">
            Each skill has a <strong className="text-foreground">promotion
            threshold</strong> (set by admins in Admin → Skills). Once
            you&rsquo;ve completed at least that many tasks at a difficulty above
            your current proficiency, you appear in the admin&rsquo;s{" "}
            <strong className="text-foreground">Promotion check</strong>. An
            admin then bumps your proficiency, and your radar grows. Promotions
            are a human decision — the system just flags when you&rsquo;re
            ready.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
