import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  Lock,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import Markdown from '../components/Markdown.jsx';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  PageSkeleton,
  ProgressBar,
} from '../components/ui.jsx';

export default function Lesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh: refreshSession } = useAuth();
  const { data, loading, error, refresh, setData } = useAsync(() => api.lessons.get(lessonId), [lessonId]);
  const [completing, setCompleting] = useState(false);

  const complete = async () => {
    if (!data || data.completed || completing) return;
    setCompleting(true);
    try {
      const result = await api.lessons.complete(lessonId);
      setData((current) => ({
        ...current,
        completed: true,
        progress: result.progress,
        outline: current.outline.map((item) => (item.id === lessonId ? { ...item, completed: true } : item)),
      }));
      if (result.alreadyCompleted) {
        toast.info('This lesson was already complete. No duplicate XP was awarded.');
      } else {
        toast.success(`Lesson complete. +${result.xpAwarded} XP added.`, { title: 'Progress verified' });
      }
      await refreshSession().catch(() => {});
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading && !data) return <PageSkeleton />;

  if (error && !data) {
    const forbidden = error.status === 403;
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-main">
          <ArrowLeft size={14} /> Back to courses
        </Link>
        {forbidden ? (
          <Card className="p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <Lock size={22} />
            </span>
            <h1 className="mt-4 font-display text-xl font-semibold text-main">Enroll to open this lesson</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Lessons are available to enrolled learners. Open the course overview and enroll for free.
            </p>
            <Link to="/courses" className="mt-5 inline-block">
              <Button>Browse my courses</Button>
            </Link>
          </Card>
        ) : (
          <ErrorState error={error} onRetry={refresh} />
        )}
      </div>
    );
  }
  if (!data) return null;

  const { lesson, course, completed, progress, outline, navigation } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <Link to="/courses" className="inline-flex items-center gap-1 transition hover:text-main">
          <ArrowLeft size={12} /> Courses
        </Link>
        <ChevronRight size={10} />
        <Link to={`/courses/${course.id}`} className="transition hover:text-main">{course.title}</Link>
        <ChevronRight size={10} />
        <span className="text-main">Lesson {lesson.order}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-gradient-to-br from-accent/10 via-surface to-violet-500/5 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                {lesson.topic ? <Badge tone="accent">{lesson.topic.title}</Badge> : null}
                <Badge tone="neutral">
                  <Clock3 size={10} /> {lesson.estimatedMinutes} min read
                </Badge>
                {completed ? (
                  <Badge tone="success">
                    <CheckCircle2 size={10} /> Completed
                  </Badge>
                ) : (
                  <Badge tone="warning">
                    <Zap size={10} /> +{lesson.xpReward} XP
                  </Badge>
                )}
              </div>
              <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-main sm:text-3xl">
                {lesson.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{lesson.summary}</p>
              <div className="mt-4 max-w-md">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
                  <span>Course progress</span>
                  <span className="font-semibold text-main">{progress.percent}%</span>
                </div>
                <ProgressBar value={progress.percent} label="Course progress" />
              </div>
            </div>

            <article className="p-5 sm:p-7">
              <Markdown content={lesson.content} />

              <div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                {completed ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-success/25 bg-success/10 px-3.5 py-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                    <div>
                      <p className="text-sm font-semibold text-success">Lesson complete</p>
                      <p className="text-[11px] text-success/80">XP was awarded once. Reopening it will not grant more.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
                    <p className="text-xs leading-relaxed text-muted">
                      Finished reading? Mark the lesson complete to earn <span className="font-semibold text-main">+{lesson.xpReward} XP</span> once.
                    </p>
                  </div>
                )}
                <Button onClick={complete} loading={completing} disabled={completed} className="shrink-0">
                  {completed ? (
                    <>
                      <CheckCircle2 size={15} /> Completed
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Mark lesson complete
                    </>
                  )}
                </Button>
              </div>
            </article>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {navigation.previous ? (
              <Link
                to={`/lessons/${navigation.previous.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-main"
              >
                <ChevronLeft size={15} />
                <span className="truncate">{navigation.previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {navigation.next ? (
              <Link
                to={`/lessons/${navigation.next.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-main"
              >
                <span className="truncate">{navigation.next.title}</span>
                <ChevronRight size={15} />
              </Link>
            ) : (
              <Link
                to={`/courses/${course.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-xs font-semibold text-accent"
              >
                <Trophy size={14} /> Take the checkpoint quiz
              </Link>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-accent" />
              <h2 className="font-display text-sm font-semibold text-main">Lesson outline</h2>
            </div>
            <p className="mt-1 text-[10px] text-muted">
              {progress.completedCount}/{progress.totalCount} complete
            </p>
            <div className="mt-3 max-h-[24rem] space-y-1 overflow-y-auto pr-1">
              {outline.map((item) => (
                <Link
                  key={item.id}
                  to={`/lessons/${item.id}`}
                  className={`flex items-start gap-2 rounded-lg px-2 py-2 text-[11px] transition ${
                    item.current
                      ? 'bg-accent/10 font-semibold text-accent'
                      : 'text-muted hover:bg-elevated hover:text-main'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                      item.completed ? 'bg-success/15 text-success' : 'bg-elevated text-muted'
                    }`}
                  >
                    {item.completed ? <CheckCircle2 size={10} /> : item.order}
                  </span>
                  <span className="leading-relaxed">{item.title}</span>
                </Link>
              ))}
            </div>
            <Link to={`/courses/${course.id}`} className="mt-3 block">
              <Button variant="secondary" size="sm" className="w-full">
                <BookOpen size={14} /> Course overview
              </Button>
            </Link>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-sm font-semibold text-main">After this lesson</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Checkpoint quizzes and flashcards are the fastest way to make this stick.
            </p>
            <div className="mt-3 space-y-2">
              <Link
                to={`/courses/${course.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-elevated/50 px-3 py-2 text-[11px] text-main transition hover:border-accent/40"
              >
                <span className="inline-flex items-center gap-1.5"><Trophy size={13} className="text-accent" /> Open course quizzes</span>
                <ArrowRight size={12} />
              </Link>
              <Link
                to={`/flashcards?course=${course.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-elevated/50 px-3 py-2 text-[11px] text-main transition hover:border-accent/40"
              >
                <span className="inline-flex items-center gap-1.5"><BookOpen size={13} className="text-violet-400" /> Review this course's cards</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
