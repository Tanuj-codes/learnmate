import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Flame,
  Gamepad2,
  Layers,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, buttonStyles } from '../components/ui.jsx';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Guided courses',
    description: 'Short lessons with clear takeaways, checkpoints, and a visible next step so you always know what to do.',
  },
  {
    icon: BrainCircuit,
    title: 'Server-scored quizzes',
    description: 'The API grades every answer. Scores, XP, and rankings are verified server-side and never trusted from the browser.',
  },
  {
    icon: Layers,
    title: 'Spaced flashcards',
    description: 'Smart review intervals bring concepts back right before you forget them, with a daily XP cap to keep it healthy.',
  },
  {
    icon: Gamepad2,
    title: 'Mini-games',
    description: 'Match pairs or race a timed challenge. Sessions are created and re-verified on the server.',
  },
  {
    icon: Trophy,
    title: 'Knowledge leaderboard',
    description: 'Transparent ranking built from verified performance, genuine improvement, and daily consistency.',
  },
  {
    icon: CalendarCheck,
    title: 'Accountability',
    description: 'Daily goals, streak recovery, and optional partners who see only what you consent to share.',
  },
];

const STEPS = [
  { step: '01', title: 'Pick a course', description: 'Enroll and follow the lesson path at your own pace.' },
  { step: '02', title: 'Practice and prove it', description: 'Take quizzes and review cards. The server verifies every result.' },
  { step: '03', title: 'Build momentum', description: 'Hit a small daily goal, earn XP, and climb the knowledge board.' },
];

const PERSONAS = [
  { icon: Target, title: 'Career switchers', text: 'A structured path from fundamentals to confident practice.' },
  { icon: Users, title: 'Study partners', text: 'Encouragement and shared goals without public score pressure.' },
  { icon: Flame, title: 'Consistency builders', text: 'Small daily wins designed to survive real life and busy weeks.' },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm shadow-accent/30">
        <Zap size={19} strokeWidth={2.4} />
      </span>
      <span>
        <span className="block font-display text-base font-semibold tracking-tight text-main">LearnMate</span>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">Learn with momentum</span>
      </span>
    </Link>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 rounded-[2rem] bg-accent/10 blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-float">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <BarChart3 size={17} />
            </span>
            <div>
              <p className="text-xs font-semibold text-main">Today&apos;s focus</p>
              <p className="text-[10px] text-muted">Verified practice, not busywork</p>
            </div>
          </div>
          <Badge tone="success">
            <CheckCircle2 size={11} /> On track
          </Badge>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-elevated/60 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Daily goal</span>
            <span className="font-semibold text-main">42 / 60 XP</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/70">
            <div className="h-full w-[70%] rounded-full bg-accent" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-muted">Web Development Foundations</span>
            <span className="font-semibold text-accent">70%</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Level', value: '7', icon: Zap, tone: 'text-warning' },
            { label: 'Streak', value: '9d', icon: Flame, tone: 'text-danger' },
            { label: 'Rank', value: '#1', icon: Trophy, tone: 'text-accent' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-line bg-elevated/50 p-3">
                <Icon size={14} className={stat.tone} />
                <p className="mt-1.5 font-display text-lg font-semibold text-main">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-main">Knowledge score</p>
            <span className="font-display text-lg font-semibold text-main">85.7</span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              ['Performance', 85, 'bg-accent'],
              ['Improvement', 100, 'bg-violet-400'],
              ['Consistency', 62, 'bg-success'],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line/70">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-float sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success">
          <Award size={14} />
        </span>
        <div>
          <p className="text-[10px] font-semibold text-main">Achievement unlocked</p>
          <p className="text-[9px] text-muted">Focus Starter · +20 XP</p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-40 border-b border-line/70 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex" aria-label="Landing navigation">
            <a href="#features" className="transition hover:text-main">Features</a>
            <a href="#how-it-works" className="transition hover:text-main">How it works</a>
            <a href="#ranking" className="transition hover:text-main">Ranking</a>
            <a href="#who" className="transition hover:text-main">Who it&apos;s for</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-main"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {user ? (
              <Link to="/dashboard" className={buttonStyles({ size: 'sm', className: 'ml-1' })}>
                Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-main sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link to="/register" className={buttonStyles({ size: 'sm', className: 'ml-1' })}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="landing-grid relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                <Sparkles size={13} /> Verified progress, real momentum
              </span>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-main sm:text-5xl lg:text-[3.4rem]">
                Learn something real.
                <span className="block bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
                  Prove it every day.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                LearnMate combines focused courses, server-verified quizzes, spaced flashcards, and a transparent
                knowledge leaderboard. Small daily goals keep you moving without turning learning into a grind.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={user ? '/dashboard' : '/register'} className={buttonStyles({ size: 'lg' })}>
                  {user ? 'Continue learning' : 'Start learning free'} <ArrowRight size={18} />
                </Link>
                <a href="#features" className={buttonStyles({ size: 'lg', variant: 'secondary' })}>
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted">
                {['No credit card', 'Server-verified scores', 'Daily goals that adapt'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-success" /> {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="animate-fade-up">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface/60">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6">
            {[
              ['3', 'Starter courses'],
              ['18', 'Guided lessons'],
              ['100%', 'Server-scored'],
              ['0', 'Public score pressure'],
            ].map(([value, label]) => (
              <div key={label} className="text-center">
                <p className="font-display text-2xl font-semibold text-main sm:text-3xl">{value}</p>
                <p className="mt-1 text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Everything in one loop</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-main">
              A learning system that remembers what matters
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Read, practice, review, and check in. Each part feeds the next, and the server keeps the whole loop
              honest.
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:border-accent/30"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon size={19} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-main">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">How it works</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-main">
                  Three steps, repeated until it sticks
                </h2>
              </div>
              <Link to="/register" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                Create your free account <ChevronRight size={15} />
              </Link>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.step} className="rounded-2xl border border-line bg-surface p-6">
                  <span className="font-display text-xs font-semibold tracking-[0.2em] text-accent">{step.step}</span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-main">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ranking" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Transparent by design</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-main">
                A leaderboard that rewards the right things
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Rankings are recalculated from persisted, verified attempts and completed goals. Nobody can post a
                score from the browser, and missing history never counts as a perfect result.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  ['70%', 'Performance', 'Best verified score per quiz in the 30-day window.'],
                  ['20%', 'Improvement', 'Real percentage-point gain over your first-attempt baseline.'],
                  ['10%', 'Consistency', 'Completed daily goals divided by eligible days. Missing days count.'],
                ].map(([weight, label, text]) => (
                  <div key={label} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
                    <span className="font-display text-lg font-semibold text-accent">{weight}</span>
                    <div>
                      <p className="text-sm font-semibold text-main">{label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-success" />
                  <p className="text-sm font-semibold text-main">Course knowledge board</p>
                </div>
                <Badge tone="neutral">30-day window</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { rank: 1, name: 'Demo Learner', score: 85.7, width: 86 },
                  { rank: 2, name: 'Maya Patel', score: 69.7, width: 70 },
                  { rank: 3, name: 'Leo Martins', score: 62.4, width: 62 },
                ].map((row) => (
                  <div key={row.rank} className="flex items-center gap-3 rounded-xl border border-line bg-elevated/50 p-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                        row.rank === 1 ? 'bg-warning/15 text-warning' : 'bg-elevated text-muted'
                      }`}
                    >
                      {row.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-main">{row.name}</p>
                        <p className="text-xs font-semibold text-main">{row.score}</p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/70">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${row.width}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted">
                Illustrative scores from the seeded demo environment. Your board is recalculated live from verified
                activity.
              </p>
            </div>
          </div>
        </section>

        <section id="who" className="scroll-mt-20 border-t border-line bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="grid gap-4 md:grid-cols-3">
              {PERSONAS.map((persona) => {
                const Icon = persona.icon;
                return (
                  <div key={persona.title} className="rounded-2xl border border-line bg-surface p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                      <Icon size={19} />
                    </span>
                    <h3 className="mt-4 font-display text-base font-semibold text-main">{persona.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{persona.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/15 via-surface to-violet-500/10 p-8 sm:p-10">
              <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-main sm:text-3xl">
                    Your next small step is waiting
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                    Create an account, pick a course, and set a daily goal you can actually keep. Momentum starts
                    smaller than you think.
                  </p>
                </div>
                <Link to={user ? '/dashboard' : '/register'} className={buttonStyles({ size: 'lg', className: 'shrink-0' })}>
                  {user ? 'Go to dashboard' : 'Get started free'} <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="text-xs text-muted">
            Built with React, Express, Prisma, and PostgreSQL. Verified learning, by design.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted">
            <Link to="/login" className="transition hover:text-main">Sign in</Link>
            <Link to="/register" className="transition hover:text-main">Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
