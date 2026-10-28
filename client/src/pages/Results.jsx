import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  PageSkeleton,
  ProgressBar,
  ProgressRing,
} from '../components/ui.jsx';
import { formatDateTime, scoreTone } from '../utils/format.js';

export default function Results() {
  const { attemptId } = useParams();
  const { data, loading, error, refresh } = useAsync(() => api.quizzes.results(attemptId), [attemptId]);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-main">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <ErrorState error={error} onRetry={refresh} />
      </div>
    );
  }
  if (!data) return null;

  const { attempt, answers, topicBreakdown } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <Link to={`/courses/${attempt.courseId}`} className="inline-flex items-center gap-1 transition hover:text-main">
          <ArrowLeft size={12} /> Back to course
        </Link>
        <span>/</span>
        <span className="text-main">Results</span>
      </div>

      <Card className="overflow-hidden">
        <div className="relative border-b border-line p-6 sm:p-8">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Server-verified result</p>
              <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-main sm:text-3xl">
                {attempt.quizTitle}
              </h1>
              <p className="mt-1.5 text-xs text-muted">
                Attempt #{attempt.attemptNumber} · {formatDateTime(attempt.submittedAt)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={attempt.passed ? 'success' : 'warning'}>
                  {attempt.passed ? <CheckCircle2 size={11} /> : <Target size={11} />}
                  {attempt.passed ? 'Passed' : 'Below passing score'}
                </Badge>
                <Badge tone="neutral">Pass mark {attempt.passingScore}%</Badge>
                {attempt.xpAwarded > 0 ? (
                  <Badge tone="warning">
                    <Zap size={11} /> +{attempt.xpAwarded} XP
                  </Badge>
                ) : (
                  <Badge tone="neutral">No XP this attempt</Badge>
                )}
              </div>
            </div>
            <ProgressRing
              value={attempt.score}
              size={148}
              strokeWidth={11}
              tone={attempt.passed ? 'success' : 'warning'}
            >
              <span className="font-display text-4xl font-semibold text-main">{attempt.score}%</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                {attempt.correctCount}/{attempt.totalCount} correct
              </span>
            </ProgressRing>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-5 sm:p-6">
          <Link to={`/quizzes/${attempt.quizId}`}>
            <Button size="sm">
              <RotateCcw size={14} /> Retake quiz
            </Button>
          </Link>
          <Link to={`/leaderboard?course=${attempt.courseId}`}>
            <Button size="sm" variant="secondary">
              <Trophy size={14} /> View leaderboard
            </Button>
          </Link>
          <Link to={`/courses/${attempt.courseId}`}>
            <Button size="sm" variant="secondary">
              Course overview
            </Button>
          </Link>
          {!attempt.passed ? (
            <Link to={`/courses/${attempt.courseId}`}>
              <Button size="sm" variant="ghost">
                Revisit lessons <ArrowRight size={13} />
              </Button>
            </Link>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Question review"
              subtitle="Every response was graded against the stored correct answer."
              icon={CheckCircle2}
              action={
                <Badge tone={scoreTone(attempt.score)}>
                  {attempt.correctCount} correct · {attempt.totalCount - attempt.correctCount} incorrect
                </Badge>
              }
            />
            <div className="space-y-4 p-5 pt-4 sm:p-6 sm:pt-4">
              {answers.map((answer, index) => {
                const selectedText = answer.selectedIndex === null ? 'No answer' : answer.options[answer.selectedIndex];
                return (
                  <div
                    key={answer.questionId}
                    className={`rounded-xl border p-4 ${
                      answer.isCorrect ? 'border-success/25 bg-success/[0.04]' : 'border-danger/25 bg-danger/[0.04]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                          answer.isCorrect ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-relaxed text-main">{answer.prompt}</p>
                        <div className="mt-2 space-y-1.5 text-xs">
                          <p className={answer.isCorrect ? 'text-success' : 'text-danger'}>
                            <span className="font-semibold">Your answer:</span> {selectedText}
                          </p>
                          {!answer.isCorrect ? (
                            <p className="text-success">
                              <span className="font-semibold">Correct answer:</span> {answer.options[answer.correctIndex]}
                            </p>
                          ) : null}
                        </div>
                        {answer.explanation ? (
                          <p className="mt-2 rounded-lg border border-line bg-surface/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
                            {answer.explanation}
                          </p>
                        ) : null}
                        {answer.topic ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge tone="neutral">{answer.topic}</Badge>
                            <Badge tone="neutral">{answer.difficulty}</Badge>
                            {answer.isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                                <CheckCircle2 size={10} /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-danger">
                                <XCircle size={10} /> Review
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Topic accuracy" icon={BarChart3} />
            <div className="space-y-3 p-5 pt-3 sm:p-6 sm:pt-3">
              {topicBreakdown.length === 0 ? (
                <p className="text-xs text-muted">No topic data for this attempt.</p>
              ) : (
                topicBreakdown.map((topic) => (
                  <div key={topic.topic}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-muted">{topic.topic}</span>
                      <span className="font-semibold text-main">{topic.accuracy}%</span>
                    </div>
                    <ProgressBar
                      value={topic.accuracy}
                      tone={topic.accuracy >= 75 ? 'success' : topic.accuracy >= 50 ? 'warning' : 'danger'}
                      label={`${topic.topic} accuracy`}
                    />
                    <p className="mt-0.5 text-[9px] text-muted">
                      {topic.correct}/{topic.total} correct
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-accent" />
              <h2 className="font-display text-sm font-semibold text-main">What happens next</h2>
            </div>
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted">
              <li>The attempt is persisted and feeds your course knowledge score.</li>
              <li>Your best score per quiz is used for performance.</li>
              <li>Improvement compares this window with your first-attempt baseline.</li>
              <li>Flashcards are the fastest way to fix the topics marked for review.</li>
            </ul>
            <Link to="/flashcards" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
              Review flashcards <ArrowRight size={12} />
            </Link>
          </Card>

          <Link to="/practice">
            <Button variant="secondary" className="w-full">
              Plan the next session
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
