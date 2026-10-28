import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Gamepad2,
  GraduationCap,
  Layers,
  Play,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  ProgressRing,
} from '../components/ui.jsx';
import { formatMinutes } from '../utils/format.js';

export default function Practice() {
  const { data, loading, error, refresh } = useAsync(async () => {
    const [dashboard, due] = await Promise.all([api.dashboard(), api.flashcards.due({ limit: 4 })]);
    return { dashboard, due };
  });

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  const { dashboard, due } = data;
  const { resume, goals, flashcards, courses } = dashboard;
  const today = goals.today;
  const lessonsCompleted = courses.reduce((sum, course) => sum + course.progress.completedCount, 0);
  const recentAverage = dashboard.recentAttempts.length
    ? Math.round(dashboard.recentAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / dashboard.recentAttempts.length)
    : 0;

  const options = [
    {
      title: resume ? `Resume ${resume.courseTitle}` : 'Start a course',
      text: resume
        ? `Lesson ${resume.nextLessonNumber} of ${resume.totalLessons} is waiting. About ${formatMinutes(12)} of focused reading.`
        : 'Pick a starter course and open the first lesson.',
      href: resume?.lessonId ? `/lessons/${resume.lessonId}` : '/courses',
      icon: BookOpen,
      cta: resume ? 'Resume lesson' : 'Browse courses',
      tone: 'bg-accent/10 text-accent',
      meta: resume ? `${resume.percent}% complete` : 'New path',
    },
    {
      title: `Review ${flashcards.stats.dueCards} flashcard${flashcards.stats.dueCards === 1 ? '' : 's'}`,
      text: 'Spaced repetition is the cheapest way to keep earlier lessons from fading.',
      href: '/flashcards',
      icon: Layers,
      cta: 'Open flashcards',
      tone: 'bg-violet-500/10 text-violet-400',
      meta: `${flashcards.stats.reviewedToday} done today`,
    },
    {
      title: 'Take a checkpoint quiz',
      text: 'Prove recall with a server-scored quiz. Your best verified score feeds the knowledge board.',
      href: courses[0] ? `/courses/${courses[0].id}` : '/courses',
      icon: Trophy,
      cta: 'Find a quiz',
      tone: 'bg-warning/10 text-warning',
      meta: courses[0] ? courses[0].title : 'No course yet',
    },
    {
      title: 'Play a short mini-game',
      text: 'Match concepts or beat a 60-second challenge. Sessions are verified on the server.',
      href: '/games',
      icon: Gamepad2,
      cta: 'Play a game',
      tone: 'bg-success/10 text-success',
      meta: 'Up to 3 XP rewards/day',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Practice hub"
        title="Learn & Practice"
        subtitle="One screen for the next useful thing. Pick a small action that fits the time and energy you have right now."
        actions={
          <Link to="/accountability">
            <Button variant="secondary">
              <Target size={15} /> Today's plan
            </Button>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={today.completed ? 'success' : 'accent'}>
                {today.completed ? 'Daily goal complete' : `${today.remainingXp} XP remaining`}
              </Badge>
              <Badge tone="neutral">
                <Flame size={10} /> {goals.streak.currentStreak}-day streak
              </Badge>
            </div>
            <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-main">
              {today.completed ? 'Today is handled. Practice is optional now.' : 'A 10-minute session can close the gap.'}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">{goals.recovery.message}</p>
            <div className="mt-4 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
                <span>{today.xpEarned} XP earned</span>
                <span>{today.targetXp} XP target</span>
              </div>
              <ProgressBar value={today.percent} tone={today.completed ? 'success' : 'accent'} label="Daily goal progress" />
            </div>
          </div>
          <div className="flex items-center justify-center border-t border-line p-5 md:border-l md:border-t-0 md:px-8">
            <ProgressRing value={today.percent} size={120} strokeWidth={9} tone={today.completed ? 'success' : 'accent'}>
              <span className="font-display text-2xl font-semibold text-main">{today.percent}%</span>
              <span className="text-[9px] uppercase tracking-wide text-muted">of goal</span>
            </ProgressRing>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.title} className="flex h-full flex-col p-5 transition hover:border-accent/30 hover:shadow-float">
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${option.tone}`}>
                  <Icon size={18} />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{option.meta}</span>
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-main">{option.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{option.text}</p>
              <Link to={option.href} className="mt-auto pt-4">
                <Button size="sm" variant="secondary" className="w-full">
                  {option.cta} <ArrowRight size={14} />
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Your enrolled courses"
              subtitle="Practice by course - lessons, quizzes, cards, and games."
              icon={GraduationCap}
            />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              {courses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No courses yet"
                  description="Enroll in a starter course to unlock practice activities."
                  action={<Link to="/courses"><Button size="sm">Browse courses</Button></Link>}
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div key={course.id} className="rounded-xl border border-line bg-elevated/40 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-main">{course.title}</p>
                            <Badge tone={course.progress.percent === 100 ? 'success' : 'accent'}>
                              {course.progress.percent}%
                            </Badge>
                          </div>
                          <div className="mt-2 max-w-sm">
                            <ProgressBar value={course.progress.percent} label={`${course.title} progress`} />
                          </div>
                          <p className="mt-1.5 text-[10px] text-muted">
                            {course.progress.completedCount}/{course.progress.totalCount} lessons · {course.quizCount} quiz
                            {course.quizCount === 1 ? '' : 'zes'} · {course.flashcardCount} cards
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/courses/${course.id}`}>
                            <Button size="sm" variant="secondary">
                              <Play size={13} /> Lessons
                            </Button>
                          </Link>
                          <Link to={`/flashcards?course=${course.id}`}>
                            <Button size="sm" variant="ghost">
                              <Layers size={13} /> Cards
                            </Button>
                          </Link>
                          <Link to={`/games?course=${course.id}`}>
                            <Button size="sm" variant="ghost">
                              <Gamepad2 size={13} /> Game
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Due right now"
              subtitle="A quick review keeps earlier lessons from slipping away."
              icon={Layers}
              action={
                <Link to="/flashcards" className="text-xs font-semibold text-accent">
                  Study all
                </Link>
              }
            />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              {due.cards.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No cards are due"
                  description="You are caught up. New cards will become available as their interval elapses."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {due.cards.map((card) => (
                    <Link
                      key={card.id}
                      to={`/flashcards?course=${card.course.id}`}
                      className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition hover:border-accent/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                        <Layers size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-medium text-main">{card.front}</p>
                        <p className="text-[10px] text-muted">{card.topic} · {card.course.title}</p>
                      </div>
                      <ChevronRight size={14} className="text-muted" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-accent" />
              <h2 className="font-display text-base font-semibold text-main">Suggested plan</h2>
            </div>
            <p className="mt-1 text-xs text-muted">A balanced 15-minute session.</p>
            <ol className="mt-4 space-y-3">
              {[
                { icon: BookOpen, title: 'Read one lesson', detail: '10 minutes · +10 XP', href: resume?.lessonId ? `/lessons/${resume.lessonId}` : '/courses' },
                { icon: Layers, title: 'Review five cards', detail: '3 minutes · +2 XP each', href: '/flashcards' },
                { icon: Trophy, title: 'Try one quiz', detail: '5 minutes · 5 + 2/correct', href: courses[0] ? `/courses/${courses[0].id}` : '/courses' },
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title}>
                    <Link to={step.href} className="flex items-start gap-3 rounded-xl border border-line bg-elevated/40 p-3 transition hover:border-accent/40">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[11px] font-bold text-accent">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-main">
                          <Icon size={12} className="text-muted" /> {step.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">{step.detail}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 flex items-center gap-1.5 text-[10px] text-muted">
              <Clock3 size={11} /> Stop after one item if that is all you have. Consistency beats volume.
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Zap size={17} className="text-warning" />
              <h2 className="font-display text-base font-semibold text-main">Level {dashboard.xp.level}</h2>
            </div>
            <div className="mt-3">
              <ProgressBar value={dashboard.xp.progressPercent} tone="warning" label="Level progress" />
              <p className="mt-1.5 text-[11px] text-muted">
                {dashboard.xp.xpToNextLevel} XP to level {dashboard.xp.level + 1} · {dashboard.xp.totalXp} XP total
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div>
                <p className="font-display text-lg font-semibold text-main">{lessonsCompleted}</p>
                <p className="text-[10px] text-muted">Lessons done</p>
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-main">{recentAverage}%</p>
                <p className="text-[10px] text-muted">Recent avg score</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
