import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  Loader2,
  Send,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge, Button, Card, ErrorState, PageSkeleton, ProgressBar } from '../components/ui.jsx';
import { formatDuration } from '../utils/format.js';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizPlay() {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const initialAttempt = location.state?.attempt || null;

  const [attempt, setAttempt] = useState(initialAttempt);
  const [meta, setMeta] = useState(location.state?.quiz || null);
  const [loading, setLoading] = useState(!initialAttempt);
  const [loadError, setLoadError] = useState(null);
  const [answers, setAnswers] = useState(() => {
    if (!initialAttempt) return {};
    return Object.fromEntries(initialAttempt.questions.map((question) => [question.id, null]));
  });
  const [current, setCurrent] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const quizMeta = meta?.id ? meta : (await api.quizzes.meta(quizId)).quiz;
        if (cancelled) return;
        setMeta(quizMeta);
        if (initialAttempt) {
          setLoading(false);
          return;
        }
        const requested = Math.min(5, quizMeta.questionCount || 5);
        const result = await api.quizzes.start(quizId, requested);
        if (cancelled) return;
        setAttempt(result.attempt);
        setAnswers(Object.fromEntries(result.attempt.questions.map((question) => [question.id, null])));
        setLoading(false);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // The attempt is intentionally created once per mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const questions = attempt?.questions || [];
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id] !== null && answers[question.id] !== undefined).length,
    [questions, answers]
  );

  const submit = useCallback(async () => {
    if (!attempt || submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = questions.map((question) => {
        const selected = answers[question.id];
        return { questionId: question.id, selectedIndex: Number.isInteger(selected) ? selected : null };
      });
      const result = await api.quizzes.submit(attempt.id, payload);
      toast.success(`Attempt submitted. Score: ${result.attempt.score}%.`, { title: 'Graded on the server' });
      navigate(`/attempts/${attempt.id}`, { replace: true });
    } catch (error) {
      submittedRef.current = false;
      setSubmitting(false);
      toast.error(error.message);
    }
  }, [attempt, answers, navigate, questions, submitting, toast]);

  const timeLimitSec = meta?.timeLimitSec || 0;
  useEffect(() => {
    if (!attempt || !timeLimitSec) return;
    const startedAt = new Date(attempt.startedAt).getTime();
    const deadline = startedAt + timeLimitSec * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        toast.info('Time is up. Submitting your saved answers.', { title: 'Timer ended' });
        submit();
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [attempt, timeLimitSec, submit, toast]);

  useEffect(() => {
    if (!attempt || submitting) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [attempt, submitting]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-accent" size={28} />
        <p className="text-sm text-muted">Preparing a fresh set of questions...</p>
        <p className="text-[11px] text-muted">The question order and timer are controlled by the server.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-main">
          <ArrowLeft size={14} /> Back to courses
        </Link>
        <ErrorState error={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!attempt || questions.length === 0) {
    return (
      <ErrorState
        error={{ message: 'This attempt does not contain any questions. Return to the quiz page and try again.' }}
        onRetry={() => navigate(`/quizzes/${quizId}`)}
      />
    );
  }

  const question = questions[current];
  const selected = answers[question.id];
  const progressPercent = Math.round((answeredCount / questions.length) * 100);
  const lowTime = secondsLeft !== null && secondsLeft <= 60;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/quizzes/${quizId}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition hover:text-main"
          >
            <ArrowLeft size={12} /> Leave without submitting
          </Link>
          <h1 className="mt-1 truncate font-display text-lg font-semibold tracking-tight text-main">
            {meta?.title || attempt.quizTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">
            <ListChecks size={10} /> {answeredCount}/{questions.length} answered
          </Badge>
          {secondsLeft !== null ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                lowTime
                  ? 'animate-pulse-soft border-danger/30 bg-danger/10 text-danger'
                  : 'border-line bg-elevated text-main'
              }`}
            >
              <Clock3 size={12} /> {formatDuration(secondsLeft * 1000)}
            </span>
          ) : null}
        </div>
      </div>

      <ProgressBar value={progressPercent} label="Answered questions" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <Card className="p-5 sm:p-7">
          {!reviewing ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                  Question {current + 1} of {questions.length}
                </span>
                <div className="flex items-center gap-1.5">
                  {question.topic ? <Badge tone="neutral">{question.topic}</Badge> : null}
                  <Badge tone="neutral">{question.difficulty}</Badge>
                </div>
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold leading-relaxed text-main sm:text-xl">
                {question.prompt}
              </h2>
              <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Answer options">
                {question.options.map((option, index) => {
                  const isSelected = selected === index;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: index }))}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                        isSelected
                          ? 'border-accent bg-accent/[0.08] text-main shadow-sm'
                          : 'border-line bg-elevated/40 text-main hover:border-accent/40'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                          isSelected ? 'bg-accent text-white' : 'bg-surface text-muted'
                        }`}
                      >
                        {OPTION_LETTERS[index] || index + 1}
                      </span>
                      <span className="leading-relaxed">{option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrent((index) => Math.max(0, index - 1))}
                  disabled={current === 0}
                >
                  <ChevronLeft size={14} /> Previous
                </Button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: null }))}
                    className="text-[11px] text-muted transition hover:text-main"
                  >
                    Clear answer
                  </button>
                  {current < questions.length - 1 ? (
                    <Button size="sm" onClick={() => setCurrent((index) => Math.min(questions.length - 1, index + 1))}>
                      Next <ChevronRight size={14} />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setReviewing(true)}>
                      Review & submit <Send size={13} />
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Review</p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-main">Check before you submit</h2>
                </div>
                <Badge tone={answeredCount === questions.length ? 'success' : 'warning'}>
                  {answeredCount}/{questions.length} answered
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                Unanswered questions are graded incorrect. You can jump back to any question.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {questions.map((item, index) => {
                  const value = answers[item.id];
                  const answered = Number.isInteger(value);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCurrent(index);
                        setReviewing(false);
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                        answered
                          ? 'border-success/25 bg-success/[0.06]'
                          : 'border-warning/30 bg-warning/[0.06]'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                          answered ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="line-clamp-2 flex-1 text-main">{item.prompt}</span>
                      {answered ? <CheckCircle2 size={13} className="shrink-0 text-success" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                <Button variant="secondary" size="sm" onClick={() => setReviewing(false)}>
                  <ChevronLeft size={14} /> Back to questions
                </Button>
                <Button onClick={submit} loading={submitting}>
                  <Send size={14} /> Submit final answers
                </Button>
              </div>
              {answeredCount < questions.length ? (
                <p className="mt-3 flex items-start gap-1.5 text-[11px] text-warning">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {questions.length - answeredCount} question(s) have no answer. They will be marked incorrect.
                </p>
              ) : null}
            </div>
          )}
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-4">
            <p className="text-xs font-semibold text-main">Question map</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {questions.map((item, index) => {
                const answered = Number.isInteger(answers[item.id]);
                const isCurrent = index === current && !reviewing;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCurrent(index);
                      setReviewing(false);
                    }}
                    aria-label={`Go to question ${index + 1}`}
                    className={`flex h-8 items-center justify-center rounded-lg text-[11px] font-semibold transition ${
                      isCurrent
                        ? 'bg-accent text-white'
                        : answered
                          ? 'bg-success/15 text-success'
                          : 'bg-elevated text-muted hover:text-main'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-[10px] text-muted">
              <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-accent" /> Current</p>
              <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-success/50" /> Answered</p>
              <p className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-line" /> Open</p>
            </div>
          </Card>

          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-main">
              <ShieldCheck size={13} className="text-success" /> Integrity
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              Answers are graded on the server against stored questions. Your browser never sends a score.
            </p>
          </Card>

          <Button variant="secondary" className="w-full" size="sm" onClick={() => setReviewing(true)}>
            Review answers <ArrowRight size={13} />
          </Button>
        </aside>
      </div>
    </div>
  );
}
