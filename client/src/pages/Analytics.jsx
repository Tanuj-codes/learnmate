import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Flame,
  Layers,
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
  StatCard,
  Tabs,
} from '../components/ui.jsx';
import {
  CourseCompletionChart,
  GoalRateChart,
  QuizTrendChart,
  TopicAccuracyChart,
  WeeklyActivityChart,
  XpProgressionChart,
} from '../charts/index.jsx';
import { formatDate, formatNumber } from '../utils/format.js';

export default function Analytics() {
  const [days, setDays] = useState(7);
  const { data, loading, error, refresh } = useAsync(async () => {
    const [overview, weekly] = await Promise.all([api.analytics.overview(), api.analytics.weekly(days)]);
    return { overview, weekly };
  }, [days]);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  const { overview, weekly } = data;
  const { xp, learning, courses, topicAccuracy, consistency, streak, todayGoal } = overview;
  const summary = weekly.summary;
  const hasActivity = summary.xp > 0 || summary.lessons > 0 || summary.quizzes > 0 || summary.flashcards > 0 || summary.games > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your learning data"
        title="Analytics"
        subtitle="A calm view of what you actually did: time on task, assessment performance, topic accuracy, and the consistency behind your knowledge score."
        actions={
          <Tabs
            value={String(days)}
            onChange={(value) => setDays(Number(value))}
            tabs={[
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total XP"
          value={formatNumber(xp.totalXp)}
          hint={`Level ${xp.level} · ${xp.xpToNextLevel} XP to next`}
          icon={Zap}
          tone="violet"
        />
        <StatCard
          label="Average quiz score"
          value={`${learning.averageQuizScore}%`}
          hint={`${learning.quizzesTaken} verified attempt${learning.quizzesTaken === 1 ? '' : 's'} · best ${learning.bestQuizScore}%`}
          icon={Trophy}
          tone="accent"
        />
        <StatCard
          label="Lessons completed"
          value={`${learning.lessonsCompleted}/${learning.totalLessons}`}
          hint={`${learning.lessonCompletionPercent}% of enrolled lesson content`}
          icon={BookOpen}
          tone="success"
        />
        <StatCard
          label="30-day consistency"
          value={`${consistency.consistency}%`}
          hint={`${consistency.completedGoals} goal days / ${consistency.eligibleDays} eligible`}
          icon={Flame}
          tone="warning"
        />
      </div>

      {!hasActivity ? (
        <Card className="p-6">
          <EmptyState
            icon={BarChart3}
            title="Your charts are waiting for real activity"
            description="Complete a lesson, take a quiz, review a flashcard, or play a game. Everything here is built from verified records, so the first data point is one small action away."
            action={<Link to="/practice"><Button>Start a session</Button></Link>}
          />
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`XP activity · last ${days} days`}
            subtitle={`${summary.xp} XP earned · ${summary.activeDays} active day(s)`}
            icon={BarChart3}
            action={<Badge tone="accent">{weekly.timezone}</Badge>}
          />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <WeeklyActivityChart rows={weekly.rows} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Goal completion" subtitle={`${summary.completedGoals} of ${days} days`} icon={Target} />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <GoalRateChart rate={summary.goalCompletionRate} completed={summary.completedGoals} days={days} />
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-center">
              <div>
                <p className="font-display text-lg font-semibold text-main">{streak.currentStreak}</p>
                <p className="text-[10px] text-muted">Current streak</p>
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-main">{streak.bestStreak}</p>
                <p className="text-[10px] text-muted">Best streak</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Quiz score trend" subtitle="Daily average across verified attempts." icon={Trophy} />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <QuizTrendChart rows={weekly.rows} />
          </div>
        </Card>

        <Card>
          <CardHeader title="XP progression" subtitle="Cumulative total across the selected window." icon={Zap} />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <XpProgressionChart rows={weekly.rows} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Topic accuracy" subtitle="Where your quiz recall is strong and where to review." icon={Target} />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <TopicAccuracyChart topics={topicAccuracy} />
            {topicAccuracy.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topicAccuracy.slice(0, 3).map((topic) => (
                  <Badge key={topic.topic} tone={topic.accuracy >= 75 ? 'success' : topic.accuracy >= 50 ? 'warning' : 'danger'}>
                    {topic.topic}: {topic.accuracy}%
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Course completion" subtitle="Lesson completion by enrolled course." icon={BookOpen} />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <CourseCompletionChart courses={courses} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader
            title="Course progress detail"
            subtitle="Every enrolled course, sorted by enrollment."
            icon={CheckCircle2}
            action={<Badge tone="neutral">{courses.length} courses</Badge>}
          />
          <div className="p-5 pt-4 sm:p-6 sm:pt-4">
            {courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No enrolled courses"
                description="Enroll in a course to start tracking lesson completion here."
                action={<Link to="/courses"><Button size="sm">Browse courses</Button></Link>}
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <div key={course.courseId} className="rounded-xl border border-line bg-elevated/40 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <Link to={`/courses/${course.courseId}`} className="min-w-0 flex-1 truncate text-xs font-semibold text-main hover:text-accent">
                        {course.title}
                      </Link>
                      <span className="shrink-0 text-[11px] font-semibold text-main">
                        {course.completedLessons}/{course.totalLessons} · {course.percent}%
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={course.percent} tone={course.percent === 100 ? 'success' : 'accent'} label={`${course.title} completion`} />
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted">
                      Enrolled {formatDate(course.enrolledAt)} · last activity {formatDate(course.lastActivity)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold text-main">Activity totals</h2>
            <p className="mt-0.5 text-[10px] text-muted">Last {days} days</p>
            <div className="mt-4 space-y-3">
              {[
                ['XP earned', summary.xp, 'text-accent'],
                ['Lessons', summary.lessons, 'text-success'],
                ['Quizzes', summary.quizzes, 'text-warning'],
                ['Flashcard reviews', summary.flashcards, 'text-violet-400'],
                ['Mini-games', summary.games, 'text-accent'],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className={`font-display text-sm font-semibold ${tone}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-muted">Today&apos;s goal</span>
                <span className="font-semibold text-main">{todayGoal.xpEarned}/{todayGoal.targetXp} XP</span>
              </div>
              <ProgressBar value={todayGoal.percent} tone={todayGoal.completed ? 'success' : 'accent'} label="Today's goal" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-violet-400" />
              <h2 className="font-display text-sm font-semibold text-main">Lifetime learning</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              {[
                ['Courses', learning.coursesEnrolled],
                ['Finished', learning.coursesCompleted],
                ['Reviews', learning.flashcardsReviewed],
                ['Games', learning.gamesCompleted],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-elevated/40 p-2.5">
                  <p className="font-display text-lg font-semibold text-main">{value}</p>
                  <p className="text-[10px] text-muted">{label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-warning" />
              <h2 className="font-display text-sm font-semibold text-main">Put this to work</h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              Topic accuracy under 60% is a signal to revisit the lesson and its flashcards before retaking a quiz.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/flashcards">
                <Button size="sm" variant="secondary" className="w-full">
                  Review weak topics
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button size="sm" variant="ghost" className="w-full">
                  See knowledge rank <ArrowRight size={12} />
                </Button>
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
