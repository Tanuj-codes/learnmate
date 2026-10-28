import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
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
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  ProgressRing,
  StatCard,
  Tabs,
} from '../components/ui.jsx';
import AchievementIcon, { TIER_STYLES } from '../components/AchievementIcon.jsx';
import { formatDate } from '../utils/format.js';

function criteriaText(achievement) {
  const value = achievement.criteriaValue;
  switch (achievement.criteriaType) {
    case 'LESSONS_COMPLETED':
      return `Complete ${value} lesson${value === 1 ? '' : 's'}.`;
    case 'QUIZ_ATTEMPTS':
      return `Submit ${value} verified quiz attempt${value === 1 ? '' : 's'}.`;
    case 'PERFECT_QUIZZES':
      return `Score 100% on ${value === 1 ? 'a quiz' : `${value} quizzes`}.`;
    case 'STREAK_DAYS':
      return `Meet your daily goal ${value} days in a row.`;
    case 'TOTAL_XP':
      return `Earn ${value} total XP.`;
    case 'FLASHCARD_REVIEWS':
      return `Review ${value} flashcard${value === 1 ? '' : 's'}.`;
    case 'GAME_SESSIONS':
      return `Complete ${value} verified mini-game${value === 1 ? '' : 's'}.`;
    case 'GOALS_COMPLETED':
      return `Complete ${value} daily goals.`;
    case 'COURSE_COMPLETIONS':
      return `Finish every lesson in ${value === 1 ? 'a course' : `${value} courses`}.`;
    default:
      return achievement.description;
  }
}

const TIER_ORDER = { BRONZE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3 };

export default function Achievements() {
  const { data, loading, error, refresh } = useAsync(() => api.achievements.list());
  const [filter, setFilter] = useState('all');

  const achievements = data?.achievements || [];
  const unlocked = useMemo(() => achievements.filter((item) => item.unlocked), [achievements]);
  const locked = useMemo(() => achievements.filter((item) => !item.unlocked), [achievements]);
  const percent = data?.totalCount ? Math.round((data.unlockedCount / data.totalCount) * 100) : 0;
  const xpFromAchievements = unlocked.reduce((sum, item) => sum + item.xpReward, 0);

  const visible = useMemo(() => {
    const rows = filter === 'unlocked' ? unlocked : filter === 'locked' ? locked : achievements;
    return [...rows].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return (TIER_ORDER[b.tier] ?? 0) - (TIER_ORDER[a.tier] ?? 0);
    });
  }, [achievements, filter, locked, unlocked]);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Milestones"
        title="Achievements"
        subtitle="Badges unlock automatically when your verified activity crosses a threshold. Each one grants a one-time XP bonus."
        actions={
          <Link to="/practice">
            <Button variant="secondary">
              <Target size={15} /> Earn the next one
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unlocked" value={`${data.unlockedCount}/${data.totalCount}`} hint={`${percent}% of the catalog`} icon={Trophy} tone="warning" />
        <StatCard label="XP from badges" value={xpFromAchievements} hint="One-time bonuses already earned" icon={Zap} tone="violet" />
        <StatCard label="Still locked" value={locked.length} hint="Keep learning to reveal them" icon={Lock} tone="accent" />
        <StatCard label="Latest badge" value={unlocked[0]?.name || '—'} hint={unlocked[0]?.unlockedAt ? formatDate(unlocked[0].unlockedAt) : 'Complete your first activity'} icon={Sparkles} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col items-center text-center">
            <ProgressRing value={percent} size={156} strokeWidth={11} tone="warning">
              <span className="font-display text-3xl font-semibold text-main">{percent}%</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">catalog</span>
            </ProgressRing>
            <p className="mt-4 text-sm font-semibold text-main">{data.unlockedCount} of {data.totalCount} unlocked</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Achievements are evaluated from persisted lessons, quizzes, reviews, games, goals, and XP.
            </p>
          </div>
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            {Object.entries(TIER_ORDER).map(([tier]) => {
              const total = achievements.filter((item) => item.tier === tier).length;
              const earned = unlocked.filter((item) => item.tier === tier).length;
              if (!total) return null;
              return (
                <div key={tier}>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold ${TIER_STYLES[tier]}`}>
                      {tier}
                    </span>
                    <span className="text-muted">{earned}/{total}</span>
                  </div>
                  <ProgressBar value={(earned / total) * 100} tone={tier === 'GOLD' ? 'warning' : tier === 'SILVER' ? 'accent' : 'success'} label={`${tier} achievements`} />
                </div>
              );
            })}
          </div>
          <Link to="/analytics" className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
            See what is driving progress <ArrowRight size={12} />
          </Link>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: 'all', label: `All (${achievements.length})` },
                { value: 'unlocked', label: `Unlocked (${unlocked.length})` },
                { value: 'locked', label: `Locked (${locked.length})` },
              ]}
            />
            <Badge tone="neutral">Auto-evaluated</Badge>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title={filter === 'unlocked' ? 'No badges yet' : 'Nothing locked'}
              description={
                filter === 'unlocked'
                  ? 'Complete your first lesson or quiz to unlock a badge.'
                  : 'You have unlocked everything in this catalog.'
              }
              action={<Link to="/practice"><Button size="sm">Start practising</Button></Link>}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                    achievement.unlocked
                      ? 'border-line bg-surface shadow-card'
                      : 'border-dashed border-line bg-elevated/30 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                        achievement.unlocked
                          ? TIER_STYLES[achievement.tier] || TIER_STYLES.BRONZE
                          : 'border-line bg-elevated text-muted'
                      }`}
                    >
                      {achievement.unlocked ? (
                        <AchievementIcon name={achievement.icon} size={20} />
                      ) : (
                        <Lock size={17} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-main">{achievement.name}</h3>
                        <Badge tone="neutral">{achievement.tier}</Badge>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">{achievement.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
                    <p className="text-[10px] text-muted">{criteriaText(achievement)}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning">
                      <Zap size={10} /> +{achievement.xpReward} XP
                    </span>
                  </div>
                  <div className="mt-2">
                    {achievement.unlocked ? (
                      <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                        <CheckCircle2 size={11} /> Unlocked {achievement.unlockedAt ? formatDate(achievement.unlockedAt) : ''}
                      </p>
                    ) : (
                      <p className="inline-flex items-center gap-1 text-[10px] text-muted">
                        <Lock size={10} /> Not unlocked yet
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
