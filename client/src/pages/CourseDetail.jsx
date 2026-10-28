import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers,
  Lock,
  Play,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageSkeleton,
  ProgressBar,
  ProgressRing,
} from '../components/ui.jsx';
import { DIFFICULTY_LABELS, DIFFICULTY_STYLES, formatMinutes, scoreTone } from '../utils/format.js';

export default function CourseDetail() {
  const { courseId } = useParams();
  const toast = useToast();
  const { refresh: refreshSession } = useAuth();
  const { data, loading, error, refresh } = useAsync(async () => {
    const detail = await api.courses.detail(courseId);
    let leaderboard = null;
    if (detail.enrolled) {
      leaderboard = await api.courses.leaderboard(courseId, { board: 'knowledge', page: 1, pageSize: 5 }).catch(() => null);
    }
    return { detail, leaderboard };
  }, [courseId]);
  const [enrolling, setEnrolling] = useState(false);

  const detail = data?.detail;
  const leaderboard = data?.leaderboard;

  const enroll = async () => {
    setEnrolling(true);
    try {
      await api.courses.enroll(courseId);
      toast.success('Course unlocked. Start with the first lesson.', { title: 'You are enrolled' });
      await refresh();
      await refreshSession().catch(() => {});
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading && !detail) return <PageSkeleton />;
  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-main">
          <ArrowLeft size={14} /> Back to courses
        </Link>
        <ErrorState error={error} onRetry={refresh} />
      </div>
    );
  }
  if (!detail) return null;

  const { course, topics, lessons, quizzes, enrolled, progress, dueFlashcardCount } = detail;
  const standaloneLessons = lessons.filter((lesson) => !lesson.topicId || !topics.some((topic) => topic.id === lesson.topicId));
  const resumeLessonId = progress.resumeLessonId || lessons[0]?.id;
  const nextQuiz = quizzes[0];

  return (
    <div className="space-y-6">
      <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-main">
        <ArrowLeft size={14} /> Back to courses
      </Link>

      <Card className="overflow-hidden">
        <div className="relative border-b border-line p-6 sm:p-8">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={DIFFICULTY_STYLES[course.difficulty] || 'neutral'}>
                  {DIFFICULTY_LABELS[course.difficulty] || course.difficulty}
                </Badge>
                <Badge tone="neutral">{course.category}</Badge>
                {enrolled ? <Badge tone="accent">Enrolled</Badge> : <Badge tone="violet">Free to enroll</Badge>}
              </div>
              <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-main sm:text-3xl">
                {course.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">{course.description || course.tagline}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><BookOpen size={14} /> {lessons.length} lessons</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> {formatMinutes(course.estimatedMinutes)}</span>
                <span className="inline-flex items-center gap-1.5"><Layers size={14} /> {course.flashcardCount} flashcards</span>
                <span className="inline-flex items-center gap-1.5"><Users size={14} /> {course.learnerCount} learners</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-5 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur">
              <ProgressRing value={enrolled ? progress.percent : 0} size={104} strokeWidth={9}>
                <span className="font-display text-xl font-semibold text-main">{enrolled ? progress.percent : 0}%</span>
                <span className="text-[9px] uppercase tracking-wide text-muted">complete</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  {enrolled ? `${progress.completedCount} of ${progress.totalCount} lessons` : 'Not enrolled yet'}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {enrolled ? (
                    <Link to={resumeLessonId ? `/lessons/${resumeLessonId}` : `/courses/${course.id}`}>
                      <Button size="sm">
                        <Play size={14} /> {progress.completedCount > 0 ? 'Resume' : 'Start lesson'}
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" onClick={enroll} loading={enrolling}>
                      Enroll free <ArrowRight size={14} />
                    </Button>
                  )}
                  {enrolled ? (
                    <Link to={`/flashcards?course=${course.id}`}>
                      <Button size="sm" variant="secondary">
                        <Layers size={14} /> Review {dueFlashcardCount} due
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-[10px] leading-relaxed text-muted">Unlocks lessons, quizzes, games, and cards.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {enrolled ? (
          <div className="flex flex-wrap items-center gap-2 bg-elevated/40 px-6 py-3 text-xs sm:px-8">
            <CheckCircle2 size={14} className="text-success" />
            <span className="text-muted">Progress is saved automatically.</span>
            <span className="ml-auto font-semibold text-main">{progress.completedCount}/{progress.totalCount} lessons complete</span>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Curriculum"
              subtitle={enrolled ? 'Follow the path in order, or jump to any lesson.' : 'Enroll to open every lesson.'}
              icon={BookOpen}
              action={<Badge tone="neutral">{lessons.length} lessons</Badge>}
            />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              {lessons.length === 0 ? (
                <EmptyState icon={BookOpen} title="Lessons are being prepared" description="This course does not have published lessons yet." className="py-8" />
              ) : (
                <div className="space-y-6">
                  {topics.map((topic) => {
                    const topicLessons = lessons.filter((lesson) => lesson.topicId === topic.id);
                    if (!topicLessons.length) return null;
                    return (
                      <div key={topic.id}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{topic.title}</h3>
                          <span className="text-[10px] text-muted">
                            {topicLessons.filter((lesson) => lesson.completed).length}/{topicLessons.length}
                          </span>
                        </div>
                        <LessonRows lessons={topicLessons} enrolled={enrolled} />
                      </div>
                    );
                  })}
                  {standaloneLessons.length ? (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">More lessons</h3>
                      <LessonRows lessons={standaloneLessons} enrolled={enrolled} />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Checkpoint assessments"
              subtitle="Server-scored quizzes with a transparent passing threshold."
              icon={Award}
              action={<Badge tone="accent">{quizzes.length} quiz</Badge>}
            />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              {quizzes.length === 0 ? (
                <EmptyState icon={Award} title="No quizzes yet" description="This course has no published assessment." className="py-8" />
              ) : (
                <div className="space-y-3">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="rounded-xl border border-line bg-elevated/40 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-main">{quiz.title}</h3>
                            {quiz.bestScore !== null ? (
                              <Badge tone={scoreTone(quiz.bestScore)}>Best {quiz.bestScore}%</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted">{quiz.description}</p>
                          <p className="mt-1.5 text-[11px] text-muted">
                            {quiz.questionCount} questions · passing {quiz.passingScore}% · {quiz.attemptCount} attempt(s)
                          </p>
                        </div>
                        {enrolled ? (
                          <Link to={`/quizzes/${quiz.id}`} className="shrink-0">
                            <Button size="sm" variant={quiz.bestScore === null ? 'primary' : 'secondary'}>
                              {quiz.bestScore === null ? 'Take quiz' : 'Retake'} <ArrowRight size={13} />
                            </Button>
                          </Link>
                        ) : (
                          <Badge tone="neutral"><Lock size={10} /> Enroll to start</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card id="leaderboard">
            <CardHeader
              title="Knowledge board"
              subtitle="Top learners in this course."
              icon={Trophy}
              action={
                enrolled ? (
                  <Link to={`/leaderboard?course=${course.id}`} className="text-[11px] font-semibold text-accent">
                    Full board
                  </Link>
                ) : null
              }
            />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              {!enrolled ? (
                <p className="text-xs leading-relaxed text-muted">
                  Enroll to see the course leaderboard and how your verified performance, improvement, and consistency compare.
                </p>
              ) : !leaderboard || leaderboard.entries.length === 0 ? (
                <p className="text-xs text-muted">No ranked learners yet. Be the first.</p>
              ) : (
                <div className="space-y-2.5">
                  {leaderboard.entries.map((entry) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                        entry.isMe ? 'border-accent/30 bg-accent/[0.06]' : 'border-line bg-elevated/40'
                      }`}
                    >
                      <span className="w-5 text-center font-display text-xs font-bold text-muted">{entry.rank}</span>
                      <Avatar name={entry.name} color={entry.avatarColor} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-main">
                          {entry.name}{entry.isMe ? ' (you)' : ''}
                        </p>
                        <p className="text-[10px] text-muted">{entry.components.performance}% performance</p>
                      </div>
                      <span className="font-display text-sm font-semibold text-main">{entry.knowledgeScore}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[10px] leading-relaxed text-muted">
                    {leaderboard.policy.formula}. Missing history counts as incomplete, not perfect.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-accent" />
              <h2 className="font-display text-base font-semibold text-main">How this course rewards you</h2>
            </div>
            <ul className="mt-4 space-y-3 text-xs text-muted">
              {[
                ['+10 XP', 'for each lesson completed once'],
                ['5 + 2 per correct', 'for the first quiz reward each day'],
                ['2 XP', 'per flashcard review, capped daily'],
                ['8 XP', 'per strong mini-game, up to 3 per day'],
              ].map(([value, text]) => (
                <li key={value} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[9px] font-bold text-accent">
                    XP
                  </span>
                  <span>
                    <span className="font-semibold text-main">{value}</span> {text}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg border border-line bg-elevated/50 px-3 py-2 text-[10px] leading-relaxed text-muted">
              Rewards are idempotent: repeating the same action cannot grant duplicate XP.
            </p>
          </Card>

          {enrolled && nextQuiz ? (
            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold text-main">Ready to prove it?</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                The checkpoint quiz is scored on the server. Your best verified score feeds the course leaderboard.
              </p>
              <Link to={`/quizzes/${nextQuiz.id}`} className="mt-4 block">
                <Button className="w-full" size="sm">
                  Open {nextQuiz.title} <ChevronRight size={14} />
                </Button>
              </Link>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LessonRows({ lessons, enrolled }) {
  return (
    <div className="divide-y divide-line/70 overflow-hidden rounded-xl border border-line">
      {lessons.map((lesson) => {
        const content = (
          <div className="flex items-center gap-3 px-3.5 py-3 transition hover:bg-elevated/60">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${
                lesson.completed
                  ? 'bg-success/10 text-success'
                  : enrolled
                    ? 'bg-accent/10 text-accent'
                    : 'bg-elevated text-muted'
              }`}
            >
              {lesson.completed ? <CheckCircle2 size={14} /> : enrolled ? lesson.order : <Lock size={12} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-main">{lesson.title}</p>
              <p className="truncate text-[10px] text-muted">{lesson.summary}</p>
            </div>
            <span className="shrink-0 text-[10px] text-muted">{lesson.estimatedMinutes} min</span>
            {enrolled ? <ChevronRight size={14} className="shrink-0 text-muted" /> : null}
          </div>
        );

        return enrolled ? (
          <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="block">
            {content}
          </Link>
        ) : (
          <div key={lesson.id} className="cursor-not-allowed opacity-80">{content}</div>
        );
      })}
    </div>
  );
}
