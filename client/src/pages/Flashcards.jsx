import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  StatCard,
} from '../components/ui.jsx';
import { cn } from '../utils/cn.js';

export default function Flashcards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseFilter = searchParams.get('course') || '';
  const toast = useToast();
  const { refresh: refreshSession } = useAuth();

  const { data, loading, error, refresh } = useAsync(async () => {
    const [overview, due] = await Promise.all([
      api.flashcards.overview(),
      api.flashcards.due({ limit: 100, ...(courseFilter ? { courseId: courseFilter } : {}) }),
    ]);
    return { overview, due };
  }, [courseFilter]);

  const [queue, setQueue] = useState([]);
  const [flipped, setFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [session, setSession] = useState({ known: 0, revision: 0, xp: 0, reviewed: 0 });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (data?.due) {
      setQueue(data.due.cards);
      setFlipped(false);
      setSession({ known: 0, revision: 0, xp: 0, reviewed: 0 });
      setStarted(false);
    }
  }, [data]);

  const current = queue[0] || null;
  const total = queue.length + session.reviewed;
  const progress = total ? Math.round((session.reviewed / total) * 100) : 0;

  const switchCourse = (courseId) => {
    if (courseId) setSearchParams({ course: courseId });
    else setSearchParams({});
  };

  const review = useCallback(
    async (rating) => {
      if (!current || reviewing) return;
      setReviewing(true);
      try {
        const result = await api.flashcards.review(current.id, rating);
        setSession((previous) => ({
          known: previous.known + (rating === 'KNOWN' ? 1 : 0),
          revision: previous.revision + (rating === 'NEEDS_REVISION' ? 1 : 0),
          xp: previous.xp + (result.xpAwarded || 0),
          reviewed: previous.reviewed + 1,
        }));
        if (result.xpAwarded > 0) {
          toast.success(`+${result.xpAwarded} XP · next review in ${result.review.intervalDays} day(s).`);
          await refreshSession().catch(() => {});
        } else if (result.review.cooldownApplied) {
          toast.info('Reviewed. XP is on cooldown for this card; the schedule still updated.');
        }
        setQueue((previous) => previous.slice(1));
        setFlipped(false);
      } catch (apiError) {
        toast.error(apiError.message);
      } finally {
        setReviewing(false);
      }
    },
    [current, reviewing, refreshSession, toast]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!started || !current || reviewing) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      if (!flipped) return;
      if (event.key === '1') review('NEEDS_REVISION');
      if (event.key === '2') review('KNOWN');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started, current, reviewing, flipped, review]);

  const stats = data?.overview.stats;
  const courses = data?.overview.courses || [];
  const activeCourse = courses.find((course) => course.id === courseFilter);

  const restart = () => {
    setQueue(data?.due.cards || []);
    setSession({ known: 0, revision: 0, xp: 0, reviewed: 0 });
    setFlipped(false);
    setStarted(false);
  };

  const summary = useMemo(() => {
    if (!session.reviewed) return null;
    const accuracy = Math.round((session.known / session.reviewed) * 100);
    return { accuracy };
  }, [session]);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Spaced repetition"
        title="Flashcards"
        subtitle="Cards come back on a schedule that adapts to your recall. Mark honestly - a revision today saves a relearn later."
        actions={
          <Link to="/practice">
            <Button variant="secondary">
              <Target size={15} /> Practice hub
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Due now" value={stats.dueCards} hint="Across all enrolled courses" icon={Layers} tone="accent" />
        <StatCard label="Reviewed today" value={stats.reviewedToday} hint="Counts every scheduled review" icon={CheckCircle2} tone="success" />
        <StatCard label="Known cards" value={stats.knownCards} hint={`${stats.totalCards} cards in your deck`} icon={Sparkles} tone="violet" />
        <StatCard label="Total reviews" value={stats.totalReviews} hint="Lifetime spacing history" icon={RefreshCw} tone="warning" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Deck</span>
          <button
            type="button"
            onClick={() => switchCourse('')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              !courseFilter
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line text-muted hover:border-accent/40 hover:text-main'
            )}
          >
            All courses ({stats.dueCards})
          </button>
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => switchCourse(course.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                courseFilter === course.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line text-muted hover:border-accent/40 hover:text-main'
              )}
            >
              {course.title} ({course.dueCards})
            </button>
          ))}
        </div>
      </Card>

      {courses.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No flashcard decks yet"
          description="Enroll in a course to unlock its flashcard deck and spaced review schedule."
          action={<Link to="/courses"><Button size="sm">Browse courses</Button></Link>}
        />
      ) : !started ? (
        <Card className="p-6 sm:p-8">
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
              <Layers size={26} />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-main">
              {activeCourse ? activeCourse.title : 'Your due cards'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {queue.length === 0
                ? 'No cards are due right now. You are caught up - come back when the next interval elapses.'
                : `${queue.length} card${queue.length === 1 ? '' : 's'} ready. Flip each card, then rate your recall honestly.`}
            </p>
            {queue.length > 0 ? (
              <Button className="mt-5" onClick={() => setStarted(true)}>
                Start review session <ArrowRight size={16} />
              </Button>
            ) : (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={refresh}>
                  <RefreshCw size={15} /> Check again
                </Button>
                <Link to="/practice"><Button>Find another activity</Button></Link>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted">
              <Badge tone="neutral">Space to flip</Badge>
              <Badge tone="neutral">1 = needs revision</Badge>
              <Badge tone="neutral">2 = known</Badge>
            </div>
          </div>
        </Card>
      ) : current ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Card {session.reviewed + 1} of {total} · {session.known} known · {session.revision} to revise
            </p>
            <div className="flex items-center gap-2">
              {session.xp > 0 ? (
                <Badge tone="warning"><Zap size={10} /> +{session.xp} XP</Badge>
              ) : null}
              <button type="button" onClick={restart} className="text-[11px] text-muted transition hover:text-main">
                Reset session
              </button>
            </div>
          </div>
          <ProgressBar value={progress} label="Flashcard session progress" />

          <div className="mx-auto w-full max-w-2xl">
            <div className="flashcard-scene" style={{ minHeight: 320 }}>
              <button
                type="button"
                onClick={() => setFlipped((value) => !value)}
                className={cn('flashcard-inner relative block h-80 w-full text-left', flipped && 'is-flipped')}
                aria-label={flipped ? 'Show the card front' : 'Show the card answer'}
              >
                <div className="flashcard-face absolute inset-0 flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-float sm:p-8">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="accent">{current.topic}</Badge>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                      {current.status === 'new' ? 'New card' : 'Due review'}
                    </span>
                  </div>
                  <div className="flex flex-1 items-center justify-center py-6">
                    <p className="max-w-lg text-center font-display text-xl font-semibold leading-snug text-main sm:text-2xl">
                      {current.front}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-4 text-[11px] text-muted">
                    <span>{current.course.title}</span>
                    <span className="inline-flex items-center gap-1"><RotateCcw size={12} /> Tap to reveal</span>
                  </div>
                </div>
                <div className="flashcard-face flashcard-back absolute inset-0 flex flex-col rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/[0.09] via-surface to-violet-500/[0.07] p-6 shadow-float sm:p-8">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="violet">Answer</Badge>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted">{current.repetitions} prior review(s)</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center py-6">
                    <p className="max-w-lg text-center text-base leading-relaxed text-main sm:text-lg">{current.back}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-4 text-[11px] text-muted">
                    <span>{current.course.title}</span>
                    <span className="inline-flex items-center gap-1"><RotateCcw size={12} /> Tap to flip back</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6">
              {flipped ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="secondary"
                    onClick={() => review('NEEDS_REVISION')}
                    loading={reviewing}
                    className="h-12 border-warning/30 text-warning hover:border-warning/50 hover:bg-warning/10"
                  >
                    <RotateCcw size={16} /> Needs revision
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => review('KNOWN')}
                    loading={reviewing}
                    className="h-12"
                  >
                    <CheckCircle2 size={16} /> I knew this
                  </Button>
                </div>
              ) : (
                <Button className="h-12 w-full" onClick={() => setFlipped(true)}>
                  Show answer <ArrowRight size={16} />
                </Button>
              )}
              <p className="mt-2 text-center text-[10px] text-muted">
                Reviews earn 2 XP with a 12-hour per-card cooldown and a daily cap. The schedule updates either way.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-6 sm:p-8">
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 size={27} />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-main">Session complete</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              You reviewed {session.reviewed} card{session.reviewed === 1 ? '' : 's'}.
              {summary ? ` ${summary.accuracy}% felt known on the first rating.` : ''}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ['Known', session.known, 'text-success'],
                ['To revise', session.revision, 'text-warning'],
                ['XP earned', `+${session.xp}`, 'text-accent'],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl border border-line bg-elevated/50 p-3">
                  <p className={`font-display text-xl font-semibold ${tone}`}>{value}</p>
                  <p className="text-[10px] text-muted">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={restart}>
                <RotateCcw size={15} /> Review again
              </Button>
              <Button variant="secondary" onClick={refresh}>
                <RefreshCw size={15} /> Refresh due cards
              </Button>
              <Link to="/practice"><Button>Next activity <ArrowRight size={15} /></Button></Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
