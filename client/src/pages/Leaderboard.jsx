import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  Info,
  Medal,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import {
  Avatar,
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
  Tabs,
} from '../components/ui.jsx';
import { formatDateTime } from '../utils/format.js';

const MEDALS = [
  { icon: Crown, tone: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/25' },
  { icon: Medal, tone: 'text-slate-400 bg-slate-400/10 border-slate-400/25' },
  { icon: Medal, tone: 'text-amber-600 bg-amber-600/10 border-amber-600/25' },
];

export default function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseParam = searchParams.get('course') || '';
  const { data: courseData, loading: coursesLoading, error: coursesError, refresh: refreshCourses } = useAsync(() =>
    api.courses.list()
  );
  const [courseId, setCourseId] = useState(courseParam);
  const [board, setBoard] = useState('knowledge');
  const [page, setPage] = useState(1);

  const enrolled = useMemo(() => (courseData?.courses || []).filter((course) => course.enrolled), [courseData]);

  useEffect(() => {
    if (courseId) return;
    const fallback = enrolled.find((course) => course.id === courseParam) || enrolled[0];
    if (fallback) setCourseId(fallback.id);
  }, [courseId, courseParam, enrolled]);

  const {
    data: boardData,
    loading: boardLoading,
    error: boardError,
    refresh: refreshBoard,
  } = useAsync(async () => {
    if (!courseId) return null;
    return api.courses.leaderboard(courseId, { board, page, pageSize: 10 });
  }, [courseId, board, page]);

  const changeCourse = (id) => {
    setCourseId(id);
    setPage(1);
    if (id) setSearchParams({ course: id });
    else setSearchParams({});
  };

  if (coursesLoading && !courseData) return <PageSkeleton />;
  if (coursesError && !courseData) return <ErrorState error={coursesError} onRetry={refreshCourses} />;

  const entries = boardData?.entries || [];
  const me = boardData?.me;
  const policy = boardData?.policy;
  const isKnowledge = board === 'knowledge';
  const podium = page === 1 ? entries.slice(0, 3) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Merit, not noise"
        title="Leaderboard"
        subtitle="Course ranking is recalculated from verified attempts and completed goals. Missing history is scored as incomplete - never as perfect."
        actions={
          <Badge tone="success">
            <ShieldCheck size={11} /> Server computed
          </Badge>
        }
      />

      {enrolled.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No course boards yet"
          description="Enroll in a course to unlock its knowledge and XP leaderboards."
          action={<Link to="/courses"><Button>Browse courses</Button></Link>}
        />
      ) : (
        <>
          <Card className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  label="Course"
                  name="leaderboard-course"
                  value={courseId}
                  onChange={(event) => changeCourse(event.target.value)}
                  className="h-10 py-0 text-sm sm:w-80"
                >
                  {enrolled.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </Select>
                <Tabs
                  value={board}
                  onChange={(value) => {
                    setBoard(value);
                    setPage(1);
                  }}
                  tabs={[
                    { value: 'knowledge', label: 'Knowledge' },
                    { value: 'xp', label: 'Course XP' },
                  ]}
                  className="mt-1 h-10 sm:mt-5"
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <Users size={13} />
                {boardData?.total ?? 0} ranked learner{(boardData?.total ?? 0) === 1 ? '' : 's'}
              </div>
            </div>
          </Card>

          {boardLoading && !boardData ? (
            <PageSkeleton />
          ) : boardError ? (
            <ErrorState error={boardError} onRetry={refreshBoard} />
          ) : !boardData ? null : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-6">
                {isKnowledge && podium.length === 3 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[podium[1], podium[0], podium[2]].map((entry) => {
                      if (!entry) return null;
                      const medal = MEDALS[entry.rank - 1];
                      const Icon = medal?.icon || Medal;
                      const isFirst = entry.rank === 1;
                      return (
                        <Card
                          key={entry.userId}
                          className={`relative overflow-hidden p-4 text-center ${
                            isFirst ? 'border-yellow-500/30 bg-yellow-500/[0.04] sm:-mt-3' : ''
                          } ${entry.isMe ? 'ring-1 ring-accent/40' : ''}`}
                        >
                          <span
                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl border ${
                              medal?.tone || 'text-muted bg-elevated border-line'
                            }`}
                          >
                            <Icon size={17} />
                          </span>
                          <div className="mt-3 flex justify-center">
                            <Avatar name={entry.name} color={entry.avatarColor} size={isFirst ? 'lg' : 'md'} />
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-main">
                            {entry.name}{entry.isMe ? ' (you)' : ''}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {isKnowledge ? `${entry.metrics.completedGoalDays}/${entry.metrics.eligibleDays} goal days` : `${entry.courseXp} course XP`}
                          </p>
                          <p className="mt-2 font-display text-2xl font-semibold text-main">
                            {isKnowledge ? entry.knowledgeScore : entry.courseXp}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-muted">
                            {isKnowledge ? 'knowledge score' : 'XP'}
                          </p>
                          {isKnowledge && entry.insufficientAssessmentHistory ? (
                            <p className="mt-2 text-[9px] text-warning">No verified attempt yet</p>
                          ) : null}
                        </Card>
                      );
                    })}
                  </div>
                ) : null}

                <Card>
                  <CardHeader
                    title={isKnowledge ? 'Knowledge ranking' : 'Course XP ranking'}
                    subtitle={
                      isKnowledge
                        ? 'Performance, improvement, and consistency in one score.'
                        : 'Sum of verified XP earned inside this course.'
                    }
                    icon={Trophy}
                    action={<Badge tone="neutral">Page {boardData.page} of {boardData.totalPages}</Badge>}
                  />
                  <div className="p-5 pt-4 sm:p-6 sm:pt-4">
                    {entries.length === 0 ? (
                      <EmptyState
                        icon={Trophy}
                        title="No ranked learners on this page"
                        description="Try the first page, or invite a study partner to join the course."
                        className="py-8"
                      />
                    ) : (
                      <>
                        <div className="hidden overflow-hidden rounded-xl border border-line md:block">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-elevated/70 text-[10px] uppercase tracking-[0.1em] text-muted">
                              <tr>
                                <th className="px-4 py-2.5 font-semibold">Rank</th>
                                <th className="px-4 py-2.5 font-semibold">Learner</th>
                                {isKnowledge ? (
                                  <>
                                    <th className="px-4 py-2.5 font-semibold">Performance</th>
                                    <th className="px-4 py-2.5 font-semibold">Improvement</th>
                                    <th className="px-4 py-2.5 font-semibold">Consistency</th>
                                    <th className="px-4 py-2.5 text-right font-semibold">Score</th>
                                  </>
                                ) : (
                                  <>
                                    <th className="px-4 py-2.5 font-semibold">Last XP</th>
                                    <th className="px-4 py-2.5 text-right font-semibold">Course XP</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line/70">
                              {entries.map((entry) => (
                                <tr key={entry.userId} className={`table-row-hover ${entry.isMe ? 'bg-accent/[0.05]' : ''}`}>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-[10px] font-bold ${
                                      entry.rank === 1 ? 'bg-warning/15 text-warning' : 'bg-elevated text-muted'
                                    }`}>
                                      {entry.rank}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Avatar name={entry.name} color={entry.avatarColor} size="xs" />
                                      <span className="font-medium text-main">
                                        {entry.name}{entry.isMe ? ' (you)' : ''}
                                      </span>
                                      {isKnowledge && entry.insufficientAssessmentHistory ? (
                                        <Badge tone="warning"><Info size={9} /> No attempts</Badge>
                                      ) : null}
                                    </div>
                                  </td>
                                  {isKnowledge ? (
                                    <>
                                      <td className="px-4 py-3 text-muted">{entry.components.performance}</td>
                                      <td className="px-4 py-3 text-muted">{entry.components.improvement}</td>
                                      <td className="px-4 py-3 text-muted">{entry.components.consistency}%</td>
                                      <td className="px-4 py-3 text-right font-display text-sm font-semibold text-main">
                                        {entry.knowledgeScore}
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-4 py-3 text-muted">
                                        {entry.lastXpAt ? formatDateTime(entry.lastXpAt) : '—'}
                                      </td>
                                      <td className="px-4 py-3 text-right font-display text-sm font-semibold text-main">
                                        {entry.courseXp}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-2 md:hidden">
                          {entries.map((entry) => (
                            <div
                              key={entry.userId}
                              className={`rounded-xl border p-3 ${entry.isMe ? 'border-accent/30 bg-accent/[0.05]' : 'border-line'}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 text-center text-[10px] font-bold text-muted">{entry.rank}</span>
                                <Avatar name={entry.name} color={entry.avatarColor} size="xs" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-main">
                                    {entry.name}{entry.isMe ? ' (you)' : ''}
                                  </p>
                                  <p className="text-[10px] text-muted">
                                    {isKnowledge
                                      ? `${entry.components.performance} perf · ${entry.components.improvement} impr · ${entry.components.consistency}% cons`
                                      : `${entry.courseXp} course XP`}
                                  </p>
                                </div>
                                <span className="font-display text-sm font-semibold text-main">
                                  {isKnowledge ? entry.knowledgeScore : entry.courseXp}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                      >
                        <ChevronLeft size={14} /> Previous
                      </Button>
                      <span className="text-[11px] text-muted">
                        Page {boardData.page} of {boardData.totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={page >= boardData.totalPages}
                        onClick={() => setPage((value) => value + 1)}
                      >
                        Next <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                {me ? (
                  <Card className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Your position</p>
                      <Badge tone="accent">#{me.rank} of {boardData.total}</Badge>
                    </div>
                    <p className="mt-2 font-display text-3xl font-semibold text-main">
                      {isKnowledge ? me.knowledgeScore : me.courseXp}
                      <span className="ml-1 text-xs font-medium text-muted">
                        {isKnowledge ? 'knowledge score' : 'course XP'}
                      </span>
                    </p>
                    {isKnowledge ? (
                      <div className="mt-4 space-y-3">
                        {[
                          ['Performance', me.components.performance, 'accent', 'Best verified score per quiz'],
                          ['Improvement', me.components.improvement, 'warning', 'Gain over first-attempt baseline'],
                          ['Consistency', me.components.consistency, 'success', 'Completed goal days'],
                        ].map(([label, value, tone, hint]) => (
                          <div key={label}>
                            <div className="mb-1 flex items-center justify-between text-[11px]">
                              <span className="text-muted" title={hint}>{label}</span>
                              <span className="font-semibold text-main">{value}</span>
                            </div>
                            <ProgressBar value={value} tone={tone} label={label} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] text-muted">
                        Knowledge rank is separate from raw XP. Switch boards to see the composite score.
                      </p>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[10px] text-muted">
                      <div>
                        <p className="font-display text-base font-semibold text-main">{me.metrics?.completedGoalDays ?? 0}</p>
                        <p>completed goal days</p>
                      </div>
                      <div>
                        <p className="font-display text-base font-semibold text-main">{me.metrics?.eligibleDays ?? 0}</p>
                        <p>eligible days</p>
                      </div>
                    </div>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader title="How ranking works" icon={Sparkles} />
                  <div className="space-y-3 p-5 pt-3 sm:p-6 sm:pt-3">
                    <p className="rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2 text-[11px] font-semibold text-accent">
                      {policy?.formula}
                    </p>
                    {isKnowledge ? (
                      <ul className="space-y-3 text-[11px] leading-relaxed text-muted">
                        <li>
                          <span className="font-semibold text-main">Performance.</span> {policy?.performance}
                        </li>
                        <li>
                          <span className="font-semibold text-main">Improvement.</span> {policy?.improvement}
                        </li>
                        <li>
                          <span className="font-semibold text-main">Consistency.</span> {policy?.consistency}
                        </li>
                        <li className="rounded-lg border border-line bg-elevated/50 px-3 py-2 text-[10px]">
                          {policy?.insufficientHistory}
                        </li>
                      </ul>
                    ) : (
                      <div className="space-y-2 text-[11px] leading-relaxed text-muted">
                        <p>{policy?.formula}</p>
                        <p>Knowledge ranking remains the primary measure of learning; course XP measures effort in this course.</p>
                      </div>
                    )}
                    <p className="text-[10px] text-muted">
                      Window: {policy?.windowDays || 30} days · recalculated {boardData.generatedAt ? formatDateTime(boardData.generatedAt) : 'on request'}
                    </p>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-2">
                    <Target size={15} className="text-accent" />
                    <p className="text-xs font-semibold text-main">Improve your score</p>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-muted">
                    <li className="flex items-start gap-1.5"><Flame size={12} className="mt-0.5 shrink-0 text-warning" /> Hit a daily goal often - consistency is 10%.</li>
                    <li className="flex items-start gap-1.5"><Trophy size={12} className="mt-0.5 shrink-0 text-accent" /> Retake quizzes to lift performance and improvement.</li>
                    <li className="flex items-start gap-1.5"><Zap size={12} className="mt-0.5 shrink-0 text-violet-400" /> Complete lessons to unlock more verified material.</li>
                  </ul>
                  <Link to={`/courses/${courseId}`} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                    Open course <ArrowRight size={12} />
                  </Link>
                </Card>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
