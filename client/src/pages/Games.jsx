import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gamepad2,
  Layers,
  Link2,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  XCircle,
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
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  Select,
  StatCard,
} from '../components/ui.jsx';
import { cn } from '../utils/cn.js';
import { formatDateTime, formatDuration, GAME_LABELS } from '../utils/format.js';

const GAME_CARDS = [
  {
    type: 'MATCH_PAIRS',
    title: 'Match the Pairs',
    description: 'Connect each concept with its definition. Fewer mistakes, higher accuracy.',
    icon: Layers,
    tone: 'bg-violet-500/10 text-violet-400',
    meta: '6 pairs · up to 20 minutes',
  },
  {
    type: 'TIMED_CHALLENGE',
    title: 'Timed Knowledge Challenge',
    description: 'Five questions, sixty seconds. A fast, honest recall check.',
    icon: Timer,
    tone: 'bg-accent/10 text-accent',
    meta: '5 questions · 60 seconds',
  },
];

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export default function Games() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseParam = searchParams.get('course') || '';
  const toast = useToast();
  const { refresh: refreshSession } = useAuth();

  const { data, loading, error, refresh } = useAsync(async () => {
    const [coursesData, historyData] = await Promise.all([
      api.courses.list(),
      api.games.history({ limit: 12 }),
    ]);
    return { courses: coursesData.courses, history: historyData.sessions };
  });

  const enrolled = useMemo(() => (data?.courses || []).filter((course) => course.enrolled), [data]);
  const [courseId, setCourseId] = useState(courseParam || '');
  const [gameType, setGameType] = useState('MATCH_PAIRS');
  const [starting, setStarting] = useState(false);
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  // Match-the-pairs state
  const [leftOrder, setLeftOrder] = useState([]);
  const [rightOrder, setRightOrder] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matches, setMatches] = useState({});
  const [matchSeconds, setMatchSeconds] = useState(0);

  // Timed challenge state
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    if (!courseId && enrolled.length) setCourseId(enrolled[0].id);
  }, [courseId, enrolled]);

  useEffect(() => {
    if (courseParam) setCourseId(courseParam);
  }, [courseParam]);

  const chooseCourse = (id) => {
    setCourseId(id);
    if (id) setSearchParams({ course: id });
    else setSearchParams({});
  };

  const resetBoard = () => {
    setSession(null);
    setResult(null);
    setSelectedLeft(null);
    setMatches({});
    setAnswers({});
    setCurrentQuestion(0);
    setSecondsLeft(null);
    setMatchSeconds(0);
    submittedRef.current = false;
  };

  const startGame = async (type = gameType) => {
    const selectedCourse = courseId || enrolled[0]?.id;
    if (!selectedCourse) {
      toast.error('Enroll in a course before playing its games.');
      return;
    }
    setStarting(true);
    resetBoard();
    try {
      const response = await api.games.start(selectedCourse, type);
      const gameSession = response.session;
      setSession(gameSession);
      setGameType(type);
      if (type === 'MATCH_PAIRS') {
        setLeftOrder(shuffle(gameSession.leftCards));
        setRightOrder(shuffle(gameSession.rightCards));
        setMatchSeconds(0);
      } else {
        setAnswers(Object.fromEntries(gameSession.questions.map((question) => [question.id, null])));
        const startedAt = new Date(gameSession.startedAt).getTime();
        setSecondsLeft(Math.max(0, Math.ceil((startedAt + gameSession.timeLimitSec * 1000 - Date.now()) / 1000)));
      }
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setStarting(false);
    }
  };

  const submitMatch = useCallback(async () => {
    if (!session || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = Object.values(matches);
      const response = await api.games.submitMatch(session.id, payload);
      setResult(response);
      if (response.session.xpAwarded > 0) {
        toast.success(`+${response.session.xpAwarded} XP · ${response.session.accuracy}% accuracy.`);
        await refreshSession().catch(() => {});
      } else if (response.session.passed) {
        toast.info('A strong game. The daily game XP limit or a cooldown applied.');
      }
      refresh().catch(() => {});
    } catch (apiError) {
      submittedRef.current = false;
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }, [session, matches, refreshSession, refresh, toast]);

  const submitTimed = useCallback(async () => {
    if (!session || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = session.questions.map((question) => ({
        questionId: question.id,
        selectedIndex: Number.isInteger(answers[question.id]) ? answers[question.id] : null,
      }));
      const response = await api.games.submitTimed(session.id, payload);
      setResult(response);
      if (response.session.xpAwarded > 0) {
        toast.success(`+${response.session.xpAwarded} XP · ${response.session.accuracy}% accuracy.`);
        await refreshSession().catch(() => {});
      } else if (response.session.passed) {
        toast.info('A strong game. The daily game XP limit or a time check applied.');
      }
      refresh().catch(() => {});
    } catch (apiError) {
      submittedRef.current = false;
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }, [session, answers, refreshSession, refresh, toast]);

  useEffect(() => {
    if (!session || result || gameType !== 'MATCH_PAIRS') return undefined;
    const interval = window.setInterval(() => setMatchSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [session, result, gameType]);

  useEffect(() => {
    if (!session || result || gameType !== 'TIMED_CHALLENGE' || secondsLeft === null) return undefined;
    if (secondsLeft <= 0) {
      submitTimed();
      return undefined;
    }
    const timeout = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [session, result, gameType, secondsLeft, submitTimed]);

  const matchedLeftIds = new Set(Object.keys(matches));
  const matchedTokens = new Set(Object.values(matches).map((match) => match.token));
  const allMatched = session?.gameType === 'MATCH_PAIRS' && matchedLeftIds.size === session.pairs;

  const pickLeft = (card) => {
    if (matchedLeftIds.has(card.pairId)) return;
    setSelectedLeft(card);
  };

  const pickRight = (card) => {
    if (matchedTokens.has(card.token)) return;
    if (!selectedLeft) {
      toast.info('Pick a concept on the left first.');
      return;
    }
    setMatches((current) => ({ ...current, [selectedLeft.pairId]: { pairId: selectedLeft.pairId, token: card.token } }));
    setSelectedLeft(null);
  };

  const removeMatch = (pairId) => {
    setMatches((current) => {
      const next = { ...current };
      delete next[pairId];
      return next;
    });
  };

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  const selectedCourse = enrolled.find((course) => course.id === courseId) || enrolled[0] || null;
  const matchProgress = session?.gameType === 'MATCH_PAIRS' && session.pairs
    ? Math.round((matchedLeftIds.size / session.pairs) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Practice plays"
        title="Mini-Games"
        subtitle="Short, server-verified challenges. Sessions are created on the server, scored there, and rewarded at most three times a day."
        actions={
          <Link to="/flashcards">
            <Button variant="secondary">
              <Layers size={15} /> Review cards
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Games completed"
          value={data.history.length}
          hint="Recent verified sessions"
          icon={Gamepad2}
          tone="accent"
        />
        <StatCard
          label="Best accuracy"
          value={`${data.history.length ? Math.max(...data.history.map((game) => game.accuracy)) : 0}%`}
          hint="From recent completed games"
          icon={Trophy}
          tone="warning"
        />
        <StatCard
          label="XP from games"
          value={data.history.reduce((sum, game) => sum + (game.xpAwarded || 0), 0)}
          hint="Recent sessions, capped daily"
          icon={Zap}
          tone="violet"
        />
      </div>

      {enrolled.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="Enroll to unlock games"
          description="Games use the flashcards and quiz questions from a course you are enrolled in."
          action={<Link to="/courses"><Button>Browse courses</Button></Link>}
        />
      ) : !session ? (
        <>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Select
                label="Course"
                name="game-course"
                value={selectedCourse?.id || ''}
                onChange={(event) => chooseCourse(event.target.value)}
                className="h-10 py-0 text-sm sm:w-80"
              >
                {enrolled.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </Select>
              <Badge tone="neutral">
                <Zap size={10} /> 8 XP per strong game · max 3/day
              </Badge>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {GAME_CARDS.map((game) => {
              const Icon = game.icon;
              return (
                <Card key={game.type} className="flex h-full flex-col p-5 sm:p-6">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${game.tone}`}>
                    <Icon size={20} />
                  </span>
                  <h2 className="mt-3 font-display text-lg font-semibold text-main">{game.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{game.description}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted">{game.meta}</p>
                  <Button
                    className="mt-auto w-full sm:w-auto"
                    size="sm"
                    onClick={() => startGame(game.type)}
                    loading={starting && gameType === game.type}
                  >
                    <Play size={14} /> Play {game.title}
                  </Button>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader
              title="Recent game history"
              subtitle="Completed and verified sessions only."
              icon={Trophy}
              action={<Badge tone="neutral">{data.history.length} sessions</Badge>}
            />
            <div className="p-5 pt-3 sm:p-6 sm:pt-3">
              {data.history.length === 0 ? (
                <EmptyState
                  icon={Gamepad2}
                  title="No games played yet"
                  description="Pick a game above. Your first session sets a baseline."
                  className="py-8"
                />
              ) : (
                <div className="divide-y divide-line/70">
                  {data.history.map((game) => (
                    <div key={game.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        {game.gameType === 'MATCH_PAIRS' ? <Layers size={16} /> : <Timer size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-main">{GAME_LABELS[game.gameType]}</p>
                        <p className="truncate text-[10px] text-muted">
                          {game.course.title} · {formatDateTime(game.completedAt)} · {formatDuration(game.durationMs)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={game.accuracy >= 60 ? 'success' : 'warning'}>{game.accuracy}%</Badge>
                        <p className="mt-1 text-[10px] text-muted">
                          {game.score}/{game.maxScore}{game.xpAwarded ? ` · +${game.xpAwarded} XP` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      ) : result ? (
        <GameResult
          result={result}
          gameType={gameType}
          onReplay={() => startGame(gameType)}
          onExit={resetBoard}
          selectedCourse={selectedCourse}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                {GAME_LABELS[gameType]}
              </p>
              <p className="text-xs text-muted">{selectedCourse?.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {gameType === 'MATCH_PAIRS' ? (
                <Badge tone="neutral"><Clock3 size={10} /> {formatDuration(matchSeconds * 1000)}</Badge>
              ) : (
                <Badge tone={secondsLeft !== null && secondsLeft <= 15 ? 'danger' : 'neutral'}>
                  <Timer size={10} /> {secondsLeft}s left
                </Badge>
              )}
              <Button size="sm" variant="ghost" onClick={resetBoard}>
                Quit
              </Button>
            </div>
          </div>

          {gameType === 'MATCH_PAIRS' ? (
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-main">Match each concept with its definition</h2>
                <Badge tone="accent">{matchedLeftIds.size}/{session.pairs} matched</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">Select a concept on the left, then its matching definition on the right.</p>
              <div className="mt-3">
                <ProgressBar value={matchProgress} label="Pairs matched" />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Concepts</p>
                  {leftOrder.map((card) => {
                    const match = matches[card.pairId];
                    const isMatched = Boolean(match);
                    return (
                      <div key={card.pairId} className="relative">
                        <button
                          type="button"
                          disabled={isMatched}
                          onClick={() => pickLeft(card)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-xs transition',
                            isMatched
                              ? 'border-success/25 bg-success/[0.06] text-muted'
                              : selectedLeft?.pairId === card.pairId
                                ? 'border-accent bg-accent/[0.08] text-main'
                                : 'border-line bg-elevated/40 text-main hover:border-accent/40'
                          )}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface text-[10px] font-bold text-muted">
                            {card.topic ? card.topic.slice(0, 1) : '?'}
                          </span>
                          <span className="flex-1 leading-relaxed">{card.text}</span>
                          {isMatched ? <CheckCircle2 size={14} className="shrink-0 text-success" /> : null}
                        </button>
                        {isMatched ? (
                          <button
                            type="button"
                            onClick={() => removeMatch(card.pairId)}
                            className="absolute -right-1 -top-1 rounded-full border border-line bg-surface px-1 text-[9px] text-muted hover:text-danger"
                            aria-label="Remove match"
                          >
                            undo
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Definitions</p>
                  {rightOrder.map((card) => {
                    const isMatched = matchedTokens.has(card.token);
                    return (
                      <button
                        key={card.token}
                        type="button"
                        disabled={isMatched}
                        onClick={() => pickRight(card)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-xs transition',
                          isMatched
                            ? 'border-success/25 bg-success/[0.06] text-muted'
                            : 'border-line bg-elevated/40 text-main hover:border-accent/40'
                        )}
                      >
                        <Link2 size={13} className={isMatched ? 'text-success' : 'text-muted'} />
                        <span className="flex-1 leading-relaxed">{card.text}</span>
                        {isMatched ? <CheckCircle2 size={14} className="shrink-0 text-success" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                <p className="text-[11px] text-muted">
                  {selectedLeft ? 'Now pick a definition on the right.' : 'Select a concept to begin.'}
                </p>
                <Button onClick={submitMatch} disabled={!allMatched} loading={submitting}>
                  Submit {matchedLeftIds.size}/{session.pairs} matches
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-main">Timed Knowledge Challenge</h2>
                <Badge tone="neutral">
                  {currentQuestion + 1} / {session.questions.length}
                </Badge>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={session.questions.length ? ((currentQuestion + 1) / session.questions.length) * 100 : 0}
                  tone={secondsLeft !== null && secondsLeft <= 15 ? 'danger' : 'accent'}
                  label="Question progress"
                />
              </div>

              {(() => {
                const question = session.questions[currentQuestion];
                return (
                  <div className="mt-5">
                    <div className="flex flex-wrap gap-2">
                      {question.topic ? <Badge tone="neutral">{question.topic}</Badge> : null}
                      <Badge tone="neutral">{question.difficulty}</Badge>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold leading-relaxed text-main">{question.prompt}</h3>
                    <div className="mt-4 space-y-2">
                      {question.options.map((option, index) => {
                        const selected = answers[question.id] === index;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setAnswers((current) => ({ ...current, [question.id]: index }))}
                            className={cn(
                              'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition',
                              selected
                                ? 'border-accent bg-accent/[0.08] text-main'
                                : 'border-line bg-elevated/40 text-main hover:border-accent/40'
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold',
                                selected ? 'bg-accent text-white' : 'bg-surface text-muted'
                              )}
                            >
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className="leading-relaxed">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={currentQuestion === 0}
                        onClick={() => setCurrentQuestion((index) => Math.max(0, index - 1))}
                      >
                        <ArrowLeft size={14} /> Previous
                      </Button>
                      {currentQuestion < session.questions.length - 1 ? (
                        <Button
                          size="sm"
                          onClick={() => setCurrentQuestion((index) => Math.min(session.questions.length - 1, index + 1))}
                        >
                          Next <ArrowRight size={14} />
                        </Button>
                      ) : (
                        <Button size="sm" onClick={submitTimed} loading={submitting}>
                          Submit challenge <CheckCircle2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function GameResult({ result, gameType, onReplay, onExit, selectedCourse }) {
  const { session, results, correctCount, totalCount } = result;
  const timed = gameType === 'TIMED_CHALLENGE';
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-gradient-to-br from-accent/12 via-surface to-violet-500/5 p-6">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <Badge tone={session.passed ? 'success' : 'warning'}>
                {session.passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {session.passed ? 'Strong session' : 'Keep practising'}
              </Badge>
              <h1 className="mt-2 font-display text-2xl font-semibold text-main">
                {session.accuracy}% accuracy
              </h1>
              <p className="mt-1 text-xs text-muted">
                {session.score}/{session.maxScore} correct · {formatDuration(session.durationMs)} · {selectedCourse?.title}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {session.xpAwarded > 0 ? (
                  <Badge tone="warning"><Zap size={10} /> +{session.xpAwarded} XP</Badge>
                ) : (
                  <Badge tone="neutral">No XP this session</Badge>
                )}
                {!session.withinTime ? <Badge tone="danger">Outside time window</Badge> : null}
                {session.rewardEligible && session.xpAwarded === 0 ? (
                  <Badge tone="neutral">Daily game XP limit reached</Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onReplay}>
                <RotateCcw size={14} /> Play again
              </Button>
              <Button variant="secondary" onClick={onExit}>Back to games</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Answer review"
          subtitle={timed ? 'Correct answers are shown for every question.' : 'Your pairings and the correct definitions.'}
          icon={Sparkles}
          action={<Badge tone="neutral">{correctCount}/{totalCount} correct</Badge>}
        />
        <div className="space-y-2 p-5 pt-4 sm:p-6 sm:pt-4">
          {(results || []).map((row, index) => (
            <div
              key={row.pairId || row.questionId || index}
              className={cn(
                'rounded-xl border p-3.5',
                row.isCorrect ? 'border-success/25 bg-success/[0.04]' : 'border-danger/25 bg-danger/[0.04]'
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold',
                    row.isCorrect ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-main">{row.prompt || row.front}</p>
                  {timed ? (
                    <p className={cn('mt-1 text-[11px]', row.isCorrect ? 'text-success' : 'text-danger')}>
                      {row.isCorrect ? 'Correct' : `Your answer: ${row.options?.[row.selectedIndex] ?? 'No answer'}`}
                      {!row.isCorrect ? ` · Correct: ${row.options?.[row.correctIndex]}` : ''}
                    </p>
                  ) : (
                    <p className={cn('mt-1 text-[11px]', row.isCorrect ? 'text-success' : 'text-danger')}>
                      {row.isCorrect ? 'Matched' : `Your match: ${row.matchedBack || 'None'} · Correct: ${row.back}`}
                    </p>
                  )}
                  {row.explanation ? (
                    <p className="mt-1 text-[10px] leading-relaxed text-muted">{row.explanation}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/leaderboard"><Button size="sm" variant="secondary">Check leaderboard</Button></Link>
            <Link to="/flashcards"><Button size="sm" variant="ghost">Review weak cards</Button></Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
