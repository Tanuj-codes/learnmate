import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Flame,
  Gamepad2,
  Layers,
  Play,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
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
  StatCard,
} from '../components/ui.jsx';
import AchievementIcon, { TIER_STYLES } from '../components/AchievementIcon.jsx';
import { WeeklyActivityChart } from '../charts/index.jsx';
import { formatDateTime, formatNumber, greeting, percent, scoreTone } from '../utils/format.js';
import CourseCard from '../components/CourseCard.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useAsync(() => api.dashboard());
  const { data: coursesData } = useAsync(() => api.courses.list());

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  const { xp, goals, courses, suggestedCourses, resume, flashcards, achievements, recentAttempts, weekly } = data;
  const today = goals.today;
  const streak = goals.streak;
  const enrolledCourses = courses || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={greeting()}
        title={`${user?.name?.split(' ')[0] || 'Learner'}, ready for one small step?`}
        subtitle={
          today.completed
            ? 'Today is already complete. Anything else you do now is a bonus, not a requirement.'
            : today.percent >= 50
              ? `You are ${today.remainingXp} XP from today's goal. One focused activity is enough.`
              : 'Pick the smallest useful activity below and let momentum do the rest.'
        }
        actions={
          <>
            <Link to="/practice">
              <Button>
                <Play size={15} /> Start practice
              </Button>
            </Link>
            <Link to="/accountability">
              <Button variant="secondary">
                <Target size={15} /> Adjust goal
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Level"
          value={`Level ${xp.level}`}
          hint={`${formatNumber(xp.xpIntoLevel)} / 250 XP into level`}
          icon={Zap}
          tone="violet"
        />
        <StatCard
          label="XP today"
          value={`${formatNumber(today.xpEarned)} XP`}
          hint={`${percent(today.xpEarned, today.targetXp)}% of ${today.targetXp} XP goal`}
          icon={Target}
          tone="accent"
        />
        <StatCard
          label="Current streak"
          value={`${streak.currentStreak} day${streak.currentStreak === 1 ? '' : 's'}`}
          hint={streak.missedYesterday ? 'Yesterday was missed - today can restart it' : `Best streak: ${streak.bestStreak} days`}
          icon={Flame}
          tone="warning"
        />
        <StatCard
          label="Cards due"
          value={flashcards.stats.dueCards}
          hint={`${flashcards.stats.reviewedToday} reviewed today`}
          icon={Layers}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-violet-500/10"
                aria-hidden="true"
              />
              <div className="relative p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                      <BookOpen size={13} /> Continue learning
                    </p>
                    {resume ? (
                      <>
                        <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-main">
                          {resume.courseTitle}
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                          {resume.percent === 100
                            ? 'Every lesson is complete. Revisit a lesson or take the checkpoint again.'
                            : `Next up: lesson ${resume.nextLessonNumber} of ${resume.totalLessons}.`}
                        </p>
                        <div className="mt-3 max-w-md">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-muted">{resume.percent}% complete</span>
                            <span className="font-semibold text-main">
                              {resume.totalLessons - resume.nextLessonNumber + 1} step(s) left
                            </span>
                          </div>
                          <ProgressBar value={resume.percent} label="Current course progress" />
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-main">
                          Choose your first course
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                          Enroll in a starter course to unlock lessons, quizzes, and flashcards.
                        </p>
                      </>
                    )}
                  </div>
                  <ProgressRing value={resume?.percent || 0} size={96} strokeWidth={8}>
                    <span className="font-display text-lg font-semibold text-main">{resume?.percent || 0}%</span>
                    <span className="text-[9px] uppercase tracking-wide text-muted">course</span>
                  </ProgressRing>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {resume ? (
                    <>
                      <Link to={resume.lessonId ? `/lessons/${resume.lessonId}` : `/courses/${resume.courseId}`}>
                        <Button size="sm">
                          {resume.percent === 100 ? 'Revisit a lesson' : 'Resume lesson'} <ArrowRight size={14} />
                        </Button>
                      </Link>
                      <Link to={`/courses/${resume.courseId}`}>
                        <Button size="sm" variant="secondary">
                          Course overview
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link to="/courses">
                      <Button size="sm">
                        Browse courses <ArrowRight size={14} />
                      </Button>
                    </Link>
                  )}
                  <Link to="/flashcards">
                    <Button size="sm" variant="ghost">
                      <Layers size={14} /> Review {flashcards.stats.dueCards} cards
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="This week's activity"
              subtitle="XP earned from verified lessons, quizzes, flashcards, and games."
              action={<Badge tone="accent">{weekly.summary.xp} XP this week</Badge>}
            />
            <div className="p-4 pt-3 sm:p-5 sm:pt-3">
              <WeeklyActivityChart rows={weekly.rows} />
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
                {[
                  ['Lessons', weekly.summary.lessons],
                  ['Quizzes', weekly.summary.quizzes],
                  ['Reviews', weekly.summary.flashcards],
                  ['Games', weekly.summary.games],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="font-display text-lg font-semibold text-main">{value}</p>
                    <p className="text-[11px] text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent assessments"
              subtitle="Your latest server-verified quiz attempts."
              action={
                <Link to="/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                  Full analytics <ArrowRight size={13} />
                </Link>
              }
            />
            <div className="p-5 pt-3 sm:p-6 sm:pt-3">
              {recentAttempts.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No quiz attempts yet"
                  description="Open a course and take its checkpoint to start a verified performance history."
                  className="py-8"
                  action={
                    <Link to="/courses">
                      <Button size="sm" variant="secondary">Find a quiz</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-line/70">
                  {recentAttempts.map((attempt) => (
                    <Link
                      key={attempt.id}
                      to={`/attempts/${attempt.id}`}
                      className="flex items-center gap-3 py-3 transition first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Trophy size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-main">{attempt.quiz.title}</p>
                        <p className="truncate text-[11px] text-muted">
                          {attempt.quiz.course.title} · {formatDateTime(attempt.submittedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={scoreTone(attempt.score)}>{attempt.score}%</Badge>
                        <p className="mt-1 text-[10px] text-muted">
                          {attempt.correctCount}/{attempt.totalCount} correct
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Daily goal</p>
                <h2 className="mt-1 font-display text-base font-semibold text-main">
                  {today.completed ? 'Goal complete' : `${today.remainingXp} XP to go`}
                </h2>
              </div>
              <Badge tone={today.completed ? 'success' : 'warning'}>
                {today.completed ? 'Done' : `${today.percent}%`}
              </Badge>
            </div>
            <div className="mt-5 flex justify-center">
              <ProgressRing value={today.percent} size={148} strokeWidth={11} tone={today.completed ? 'success' : 'accent'}>
                <span className="font-display text-3xl font-semibold text-main">{today.xpEarned}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted">of {today.targetXp} XP</span>
              </ProgressRing>
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-muted">{goals.recovery.message}</p>
            <div className="mt-5 space-y-2">
              {goals.recovery.quickWins.length ? (
                goals.recovery.quickWins.map((win) => (
                  <Link
                    key={win.label}
                    to={win.href}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-elevated/50 px-3 py-2.5 text-xs transition hover:border-accent/40"
                  >
                    <span className="truncate text-main">{win.label}</span>
                    <span className="shrink-0 font-semibold text-warning">+{win.xp} XP</span>
                  </Link>
                ))
              ) : (
                <Link
                  to="/leaderboard"
                  className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/10 px-3 py-2.5 text-xs text-success transition hover:bg-success/15"
                >
                  <span>See where your consistency puts you</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-center">
              <div>
                <p className="font-display text-base font-semibold text-main">{streak.currentStreak}</p>
                <p className="text-[10px] text-muted">Current streak</p>
              </div>
              <div>
                <p className="font-display text-base font-semibold text-main">
                  {goals.weekly.completed}/{goals.weekly.target}
                </p>
                <p className="text-[10px] text-muted">Weekly goal days</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent achievements" icon={Sparkles} />
            <div className="p-5 pt-3 sm:p-6 sm:pt-3">
              {achievements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
                  <Trophy size={20} className="mx-auto text-muted" />
                  <p className="mt-2 text-xs text-muted">Complete a lesson or quiz to unlock your first badge.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {achievements.map((achievement) => (
                    <div key={achievement.code} className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          TIER_STYLES[achievement.tier] || TIER_STYLES.BRONZE
                        }`}
                      >
                        <AchievementIcon name={achievement.icon} size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-main">{achievement.name}</p>
                        <p className="truncate text-[10px] text-muted">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link
                to="/achievements"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent"
              >
                View all achievements <ArrowRight size={13} />
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Your courses" icon={BookOpen} />
            <div className="p-5 pt-3 sm:p-6 sm:pt-3">
              {enrolledCourses.length === 0 ? (
                <p className="text-xs text-muted">You have not enrolled in a course yet.</p>
              ) : (
                <div className="space-y-3">
                  {enrolledCourses.slice(0, 4).map((course) => (
                    <Link key={course.id} to={`/courses/${course.id}`} className="block group">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-main group-hover:text-accent">{course.title}</p>
                        <span className="shrink-0 text-[10px] font-semibold text-muted">{course.progress.percent}%</span>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar value={course.progress.percent} label={`${course.title} progress`} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <Link to="/courses" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                Manage all courses <ArrowRight size={13} />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {suggestedCourses?.length ? (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-main">Add another path</h2>
              <p className="text-xs text-muted">Starter courses you have not enrolled in yet.</p>
            </div>
            <Link to="/courses" className="text-xs font-semibold text-accent">
              Browse all
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {suggestedCourses.map((course) => (
              <CourseCard key={course.id} course={course} compact onEnroll={() => window.location.assign('/courses')} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            to: '/flashcards',
            icon: Layers,
            title: 'Review due cards',
            text: `${flashcards.stats.dueCards} card${flashcards.stats.dueCards === 1 ? '' : 's'} ready across your courses.`,
            tone: 'text-accent bg-accent/10',
          },
          {
            to: '/games',
            icon: Gamepad2,
            title: 'Play a mini-game',
            text: 'A short, server-verified challenge to reinforce recall.',
            tone: 'text-violet-500 bg-violet-500/10',
          },
          {
            to: '/leaderboard',
            icon: Trophy,
            title: 'Check your rank',
            text: 'See how performance, improvement, and consistency combine.',
            tone: 'text-warning bg-warning/10',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <Card className="h-full p-5 transition hover:border-accent/30 hover:shadow-float">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                  <Icon size={18} />
                </span>
                <h3 className="mt-3 font-display text-sm font-semibold text-main">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{item.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                  Open <ArrowRight size={12} />
                </span>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-[11px] text-muted">
        <Clock3 size={12} /> All rewards and rankings are calculated from server-verified records.
      </p>
    </div>
  );
}
