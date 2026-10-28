import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle2,
  Flame,
  HeartHandshake,
  Mail,
  Minus,
  Plus,
  Target,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  ProgressRing,
  Toggle,
} from '../components/ui.jsx';
import { cn } from '../utils/cn.js';

const STATUS_STYLES = {
  complete: 'bg-success border-success/40',
  incomplete: 'bg-warning/40 border-warning/50',
  'no-goal': 'bg-line/50 border-line',
};

const STATUS_LABELS = {
  complete: 'Goal met',
  incomplete: 'Goal missed',
  'no-goal': 'No goal set',
};

export default function Accountability() {
  const toast = useToast();
  const { refresh: refreshSession } = useAuth();
  const { data, loading, error, refresh } = useAsync(async () => {
    const [goals, partners] = await Promise.all([api.goals.get({ days: 14 }), api.partners.list()]);
    return { goals, partners };
  });
  const [target, setTarget] = useState(60);
  const [savingTarget, setSavingTarget] = useState(false);
  const [invite, setInvite] = useState({ email: '', shareProgress: true });
  const [inviting, setInviting] = useState(false);
  const [busyPartner, setBusyPartner] = useState(null);
  const [shareBusy, setShareBusy] = useState(null);

  useEffect(() => {
    if (data?.goals?.today) setTarget(data.goals.today.targetXp);
  }, [data]);

  const saveTarget = async (value) => {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 10 || next > 1000) {
      toast.error('Choose a daily target between 10 and 1000 XP.');
      return;
    }
    setSavingTarget(true);
    try {
      await api.goals.create(next);
      toast.success(`Daily target set to ${next} XP.`, { title: 'Goal updated' });
      await refresh();
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setSavingTarget(false);
    }
  };

  const sendInvite = async (event) => {
    event.preventDefault();
    if (!invite.email.trim()) return;
    setInviting(true);
    try {
      await api.partners.invite(invite.email.trim(), invite.shareProgress);
      toast.success('Partner request sent. They can accept from their Accountability page.');
      setInvite({ email: '', shareProgress: true });
      await refresh();
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setInviting(false);
    }
  };

  const respond = async (relation, status, shareProgress = true) => {
    setBusyPartner(relation.id);
    try {
      await api.partners.update(relation.id, { status, shareProgress });
      toast.success(
        status === 'ACCEPTED'
          ? 'Partner request accepted. Share only what you are comfortable with.'
          : 'Request declined.'
      );
      await refresh();
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setBusyPartner(null);
    }
  };

  const updateSharing = async (relation, shareProgress) => {
    setShareBusy(relation.id);
    try {
      await api.partners.update(relation.id, { shareProgress });
      toast.success(shareProgress ? 'Your progress is now shared with this partner.' : 'Sharing turned off for this partner.');
      await refresh();
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setShareBusy(null);
    }
  };

  const removePartner = async (relation) => {
    setBusyPartner(relation.id);
    try {
      await api.partners.remove(relation.id);
      toast.success('Partner connection removed.');
      await refresh();
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setBusyPartner(null);
    }
  };

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;
  if (!data) return null;

  const { goals, partners } = data;
  const today = goals.today;
  const streak = goals.streak;
  const recovery = goals.recovery;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support without pressure"
        title="Accountability"
        subtitle="Set a daily target you can actually keep, see your recent rhythm, and optionally partner with someone who will gently check in."
        actions={
          <Link to="/practice">
            <Button variant="secondary">
              <Target size={15} /> Start a session
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Today</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-main">
                {today.completed ? 'Goal complete. Well done.' : `${today.remainingXp} XP left`}
              </h2>
              <p className="mt-1 text-xs text-muted">{today.date} · timezone-aware goal</p>
            </div>
            <Badge tone={today.completed ? 'success' : 'warning'}>
              {today.completed ? <CheckCircle2 size={11} /> : <Target size={11} />}
              {today.percent}%
            </Badge>
          </div>

          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <ProgressRing value={today.percent} size={136} strokeWidth={10} tone={today.completed ? 'success' : 'accent'}>
              <span className="font-display text-3xl font-semibold text-main">{today.xpEarned}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted">of {today.targetXp} XP</span>
            </ProgressRing>
            <div className="w-full min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-muted">{recovery.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-line bg-elevated/50 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setTarget((value) => Math.max(10, Number(value) - 10))}
                    className="rounded-md p-1 text-muted hover:bg-surface hover:text-main"
                    aria-label="Decrease target"
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    className="w-14 border-0 bg-transparent text-center text-sm font-semibold text-main focus:outline-none"
                    aria-label="Daily XP target"
                  />
                  <button
                    type="button"
                    onClick={() => setTarget((value) => Math.min(1000, Number(value) + 10))}
                    className="rounded-md p-1 text-muted hover:bg-surface hover:text-main"
                    aria-label="Increase target"
                  >
                    <Plus size={13} />
                  </button>
                  <span className="pr-1 text-[10px] text-muted">XP</span>
                </label>
                <Button size="sm" onClick={() => saveTarget(target)} loading={savingTarget}>
                  Save target
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[30, 60, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTarget(preset)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[10px] font-medium transition',
                      Number(target) === preset
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line text-muted hover:border-accent/40 hover:text-main'
                    )}
                  >
                    {preset} XP
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            <div>
              <p className="flex items-center justify-center gap-1 font-display text-lg font-semibold text-main">
                <Flame size={15} className="text-warning" /> {streak.currentStreak}
              </p>
              <p className="text-[10px] text-muted">Current streak</p>
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-main">{streak.bestStreak}</p>
              <p className="text-[10px] text-muted">Best streak</p>
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-main">{goals.weekly.completed}/{goals.weekly.target}</p>
              <p className="text-[10px] text-muted">This week</p>
            </div>
          </div>
          {streak.missedYesterday ? (
            <p className="mt-3 rounded-lg border border-warning/25 bg-warning/[0.06] px-3 py-2 text-[11px] text-warning">
              Yesterday was missed. Today can start a new streak - no need to catch up on everything.
            </p>
          ) : null}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-main">Quick wins</h2>
              <p className="text-xs text-muted">Small actions that close today&apos;s gap.</p>
            </div>
            <Badge tone="accent"><Zap size={10} /> {today.remainingXp} XP needed</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {recovery.quickWins.length ? (
              recovery.quickWins.map((win) => (
                <Link
                  key={win.label}
                  to={win.href}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line bg-elevated/40 px-3 py-2.5 text-xs transition hover:border-accent/40"
                >
                  <span className="text-main">{win.label}</span>
                  <span className="shrink-0 font-semibold text-warning">+{win.xp} XP</span>
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-success/25 bg-success/[0.06] px-3 py-3 text-xs text-success">
                Today is handled. Rest is part of the plan.
              </p>
            )}
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted">Weekly goal days</span>
              <span className="font-semibold text-main">{goals.weekly.completed}/{goals.weekly.target}</span>
            </div>
            <ProgressBar value={goals.weekly.percent} tone="success" label="Weekly goal days" />
            <p className="mt-1.5 text-[10px] text-muted">
              {goals.weekly.xp} XP recorded across this week&apos;s goals.
            </p>
          </div>
          {recovery.weeklyTarget ? (
            <p className="mt-3 text-[10px] text-muted">
              Your settings target {recovery.weeklyTarget} goal day(s) per week. You can change it in Profile.
            </p>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Last 14 days"
          subtitle="Missing goals stay visible - consistency is built on an honest record."
          icon={CalendarCheck}
          action={
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-success" /> Met</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-warning/50" /> Missed</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-line" /> None</span>
            </div>
          }
        />
        <div className="p-5 pt-4 sm:p-6 sm:pt-4">
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
            {goals.history.map((day) => (
              <div
                key={day.date}
                className={cn('rounded-lg border p-2 text-center', STATUS_STYLES[day.status] || STATUS_STYLES['no-goal'])}
                title={`${day.date}: ${STATUS_LABELS[day.status]} (${day.xpEarned}/${day.targetXp} XP)`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-wide text-main/70">
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-main">{day.date.slice(8)}</p>
                {day.status === 'complete' ? (
                  <CheckCircle2 size={11} className="mx-auto mt-1 text-success" />
                ) : (
                  <span className="mx-auto mt-1 block h-2.5 w-2.5 rounded-full bg-main/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Your accountability partners"
              subtitle="Progress is only shown when both of you accept and the person chooses to share."
              icon={Users}
              action={<Badge tone="neutral">{partners.accepted.length} active</Badge>}
            />
            <div className="space-y-3 p-5 pt-4 sm:p-6 sm:pt-4">
              {partners.accepted.length === 0 ? (
                <EmptyState
                  icon={HeartHandshake}
                  title="No active partners yet"
                  description="Invite a friend who is already learning on LearnMate. You can agree on a small shared goal."
                  className="py-8"
                />
              ) : (
                partners.accepted.map((partner) => (
                  <div key={partner.id} className="rounded-xl border border-line bg-elevated/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={partner.user.name} color={partner.user.avatarColor} size="md" />
                        <div>
                          <p className="text-sm font-semibold text-main">{partner.user.name}</p>
                          <p className="text-[10px] text-muted">
                            {partner.otherConsent ? 'Sharing progress with you' : 'Not sharing progress right now'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePartner(partner)}
                        disabled={busyPartner === partner.id}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                        aria-label={`Remove ${partner.user.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {partner.progress ? (
                      <div className="mt-3 grid gap-3 rounded-lg border border-line bg-surface/60 p-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[9px] uppercase tracking-wide text-muted">Today</p>
                          <p className="mt-0.5 text-xs font-semibold text-main">
                            {partner.progress.today.xpEarned}/{partner.progress.today.targetXp} XP
                          </p>
                          <div className="mt-1.5">
                            <ProgressBar
                              value={Math.min(100, Math.round((partner.progress.today.xpEarned / Math.max(1, partner.progress.today.targetXp)) * 100))}
                              tone={partner.progress.today.completed ? 'success' : 'accent'}
                              label={`${partner.user.name} today progress`}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wide text-muted">Streak</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-main">
                            <Flame size={12} className="text-warning" /> {partner.progress.currentStreak} day(s)
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wide text-muted">Total XP</p>
                          <p className="mt-0.5 text-xs font-semibold text-main">{partner.progress.totalXp} XP</p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg border border-line bg-surface/60 px-3 py-2 text-[11px] text-muted">
                        They have not turned on progress sharing. Your own sharing setting is below.
                      </p>
                    )}

                    <div className="mt-3">
                      <Toggle
                        checked={Boolean(partner.myConsent)}
                        onChange={(value) => updateSharing(partner, value)}
                        disabled={shareBusy === partner.id}
                        label="Share my progress with this partner"
                        description="Today's goal, streak, and total XP only. Lessons and quiz answers stay private."
                      />
                    </div>
                  </div>
                ))
              )}

              {partners.incoming.length > 0 ? (
                <div className="pt-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Incoming requests</p>
                  <div className="space-y-2">
                    {partners.incoming.map((request) => (
                      <div key={request.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.05] p-3">
                        <Avatar name={request.user.name} color={request.user.avatarColor} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-main">{request.user.name}</p>
                          <p className="text-[10px] text-muted">Would like to be accountability partners.</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="success"
                            loading={busyPartner === request.id}
                            onClick={() => respond(request, 'ACCEPTED', true)}
                          >
                            <Check size={13} /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyPartner === request.id}
                            onClick={() => respond(request, 'DECLINED')}
                          >
                            <X size={13} /> Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {partners.outgoing.length > 0 ? (
                <div className="pt-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Sent requests</p>
                  <div className="space-y-2">
                    {partners.outgoing.map((request) => (
                      <div key={request.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                        <Avatar name={request.user.name} color={request.user.avatarColor} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-main">{request.user.name}</p>
                          <p className="text-[10px] text-muted">Waiting for a response.</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePartner(request)}
                          disabled={busyPartner === request.id}
                        >
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-accent" />
              <h2 className="font-display text-sm font-semibold text-main">Invite a partner</h2>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              They must already have a LearnMate account. Only their email is used to find them.
            </p>
            <form onSubmit={sendInvite} className="mt-3 space-y-3">
              <Input
                label="Partner email"
                name="partnerEmail"
                type="email"
                placeholder="friend@example.com"
                value={invite.email}
                onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <Toggle
                checked={invite.shareProgress}
                onChange={(value) => setInvite((current) => ({ ...current, shareProgress: value }))}
                label="Share my progress when accepted"
                description="You can change this later per partner."
              />
              <Button type="submit" size="sm" className="w-full" loading={inviting}>
                <Mail size={14} /> Send request
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-warning" />
              <h2 className="font-display text-sm font-semibold text-main">A good partner check-in</h2>
            </div>
            <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted">
              <li>&ldquo;What is one small thing you can finish today?&rdquo;</li>
              <li>&ldquo;Do you want company for a 10-minute session?&rdquo;</li>
              <li>&ldquo;What got in the way yesterday - and what would make today easier?&rdquo;</li>
            </ul>
            <p className="mt-3 rounded-lg border border-line bg-elevated/50 px-3 py-2 text-[10px] text-muted">
              {partners.sharingNote}
            </p>
          </Card>

          <Link to="/profile">
            <Button variant="secondary" className="w-full">
              Change weekly goal <ArrowRight size={14} />
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
