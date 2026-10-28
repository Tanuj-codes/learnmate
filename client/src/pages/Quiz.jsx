import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock3,
  History,
  Play,
  RotateCcw,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageSkeleton,
  Select,
} from '../components/ui.jsx';
import { formatDateTime, scoreTone } from '../utils/format.js';

export default function Quiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refresh } = useAsync(() => api.quizzes.meta(quizId), [quizId]);
  const [questionCount, setQuestionCount] = useState(5);
  const [starting, setStarting] = useState(false);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-main">
          <ArrowLeft size={14} /> Back to courses
        </Link>
        <ErrorState error={error} onRetry={refresh} />
      </div>
    );
  }
  if (!data) return null;

  const { quiz, attempts, bestScore } = data;
  const maxQuestions = quiz.questionCount;
  const selectedCount = Math.min(questionCount, maxQuestions);

  const start = async () => {
    setStarting(true);
    try {
      const result = await api.quizzes.start(quizId, selectedCount);
      navigate(`/quizzes/${quizId}/attempt`, { state: { attempt: result.attempt, quiz } });
    } catch (apiError) {
      toast.error(apiError.message);
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <Link to={`/courses/${quiz.course.id}`} className="inline-flex items-center gap-1 transition hover:text-main">
          <ArrowLeft size={12} /> {quiz.course.title}
        </Link>
        <span>/</span>
        <span className="text-main">Quiz</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-gradient-to-br from-accent/12 via-surface to-violet-500/5 p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">
                  <ShieldCheck size={10} /> Server scored
                </Badge>
                <Badge tone="neutral">{quiz.difficulty}</Badge>
                {bestScore !== null ? <Badge tone={scoreTone(bestScore)}>Best {bestScore}%</Badge> : null}
              </div>
              <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-main sm:text-3xl">
                {quiz.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{quiz.description}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><Target size={13} /> {quiz.questionCount} question bank</span>
                <span className="inline-flex items-center gap-1.5"><Award size={13} /> Pass at {quiz.passingScore}%</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> {Math.round(quiz.timeLimitSec / 60)} min limit</span>
                <span className="inline-flex items-center gap-1.5"><History size={13} /> {attempts.length} attempt(s)</span>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <h2 className="font-display text-base font-semibold text-main">Before you begin</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {[
                  'The server grades every answer - the browser cannot post a score.',
                  'Each attempt serves a random selection from the question bank.',
                  'Quiz XP is awarded once per quiz per local day, even across retakes.',
                  'Your best verified score is what counts toward the course leaderboard.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-line bg-elevated/50 p-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full sm:w-44">
                  <Select
                    label="Questions"
                    name="questionCount"
                    value={selectedCount}
                    onChange={(event) => setQuestionCount(Number(event.target.value))}
                    hint={`Max ${maxQuestions}`}
                    className="h-10 py-0 text-sm"
                  >
                    {Array.from({ length: Math.min(maxQuestions, 10) }, (_, index) => index + 1).map((count) => (
                      <option key={count} value={count}>{count} question{count === 1 ? '' : 's'}</option>
                    ))}
                  </Select>
                </div>
                <Button onClick={start} loading={starting} size="lg" className="sm:w-auto">
                  <Play size={16} /> Start quiz
                </Button>
              </div>
              <p className="mt-3 text-[10px] text-muted">
                Timer starts when the attempt is created. Unanswered questions are graded as incorrect, so submit what you know.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Attempt history"
              subtitle="Only submitted, verified attempts are stored."
              icon={History}
              action={<Badge tone="neutral">{attempts.length} attempts</Badge>}
            />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              {attempts.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No attempts yet"
                  description="Your first attempt sets a baseline. Later attempts can show real improvement."
                  className="py-8"
                />
              ) : (
                <div className="divide-y divide-line/70">
                  {attempts.map((attempt) => (
                    <Link
                      key={attempt.id}
                      to={`/attempts/${attempt.id}`}
                      className="flex items-center gap-3 py-3 transition first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
                        #{attempt.attemptNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-main">
                          {attempt.correctCount}/{attempt.totalCount} correct
                        </p>
                        <p className="text-[10px] text-muted">{formatDateTime(attempt.submittedAt)}</p>
                      </div>
                      <div className="text-right">
                        <Badge tone={scoreTone(attempt.score)}>{attempt.score}%</Badge>
                        {attempt.xpAwarded > 0 ? (
                          <p className="mt-1 text-[10px] text-warning">+{attempt.xpAwarded} XP</p>
                        ) : (
                          <p className="mt-1 text-[10px] text-muted">No XP</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold text-main">Reward rules</h2>
            <div className="mt-3 space-y-3 text-[11px] text-muted">
              <div className="flex items-center justify-between gap-2">
                <span>Base completion</span>
                <span className="font-semibold text-main">+5 XP</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Each correct answer</span>
                <span className="font-semibold text-main">+2 XP</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Daily quiz reward</span>
                <span className="font-semibold text-main">Once per quiz</span>
              </div>
            </div>
            <p className="mt-3 rounded-lg border border-line bg-elevated/50 px-3 py-2 text-[10px] leading-relaxed text-muted">
              Retakes still update your best score and leaderboard performance. They simply cannot farm XP.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold text-main">Course knowledge score</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              70% performance + 20% improvement + 10% consistency. Missing history counts as zero, not perfect.
            </p>
            <Link
              to={`/leaderboard?course=${quiz.course.id}`}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
            >
              View leaderboard <ArrowRight size={12} />
            </Link>
          </Card>

          <Link to={`/courses/${quiz.course.id}`}>
            <Button variant="secondary" className="w-full">
              <RotateCcw size={14} /> Back to course
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
