import { useEffect, useState } from 'react';
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  KeyRound,
  LogOut,
  Moon,
  Palette,
  Save,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  Select,
  StatCard,
  Toggle,
} from '../components/ui.jsx';
import { cn } from '../utils/cn.js';
import { AVATAR_STYLES, formatDate, formatDateTime, XP_REASON_LABELS } from '../utils/format.js';
import { levelFromXp } from '../utils/level.js';

const AVATAR_COLORS = ['indigo', 'violet', 'emerald', 'amber', 'rose', 'sky'];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export default function Profile() {
  const toast = useToast();
  const navigate = useNavigate();
  const { updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data, loading, error, refresh } = useAsync(() => api.users.profile());
  const [xpPage, setXpPage] = useState(1);
  const { data: xpData, loading: xpLoading } = useAsync(
    () => api.users.xp({ page: xpPage, pageSize: 8 }),
    [xpPage]
  );

  const [form, setForm] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (data?.user) {
      setForm({
        name: data.user.name,
        timezone: data.user.timezone,
        theme: data.user.theme || theme,
        avatarColor: data.user.avatarColor,
        dailyGoalXp: data.user.dailyGoalXp,
        weeklyGoalDays: data.user.weeklyGoalDays,
        emailNotifications: data.user.emailNotifications,
      });
    }
  }, [data, theme]);

  const save = async (event) => {
    event?.preventDefault?.();
    if (!form || saving) return;
    setSaving(true);
    try {
      const result = await api.users.update({
        ...form,
        dailyGoalXp: Number(form.dailyGoalXp),
        weeklyGoalDays: Number(form.weeklyGoalDays),
      });
      updateUser(result.user);
      setTheme(result.user.theme);
      toast.success('Profile settings saved.', { title: 'Settings updated' });
      refresh().catch(() => {});
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (passwords.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (!/[A-Za-z]/.test(passwords.newPassword) || !/[0-9]/.test(passwords.newPassword)) {
      setPasswordError('Include at least one letter and one number.');
      return;
    }
    setChangingPassword(true);
    try {
      const result = await api.users.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      updateUser(result.user);
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated. Existing sessions remain valid.');
    } catch (apiError) {
      setPasswordError(apiError.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;
  if (!data || !form) return null;

  const { user, xp, streak } = data;
  const level = levelFromXp(xp.totalXp);
  const transactions = xpData?.transactions || [];
  const totalPages = xpData ? Math.max(1, Math.ceil(xpData.total / xpData.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your account"
        title="Profile & Settings"
        subtitle="Control how LearnMate looks and feels, set realistic goals, and see the verified record behind your XP."
        actions={<Badge tone="success"><ShieldCheck size={11} /> Secure session</Badge>}
      />

      <Card className="overflow-hidden">
        <div className="relative p-6">
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} color={user.avatarColor} size="lg" />
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-main">{user.name}</h2>
                <p className="truncate text-xs text-muted">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="accent">Level {level.level}</Badge>
                  <Badge tone="neutral">{user.role === 'ADMIN' ? 'Administrator' : 'Student'}</Badge>
                  <Badge tone="neutral">Joined {formatDate(user.createdAt)}</Badge>
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-display text-3xl font-semibold text-main">{xp.totalXp} XP</p>
              <p className="text-[11px] text-muted">{xp.xpToNextLevel} XP to level {level.level + 1}</p>
              <div className="mt-2 w-48 max-w-full">
                <ProgressBar value={xp.progressPercent} label="Level progress" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current streak" value={`${streak.currentStreak} days`} hint={`Best ${streak.bestStreak} days`} icon={Flame} tone="warning" />
        <StatCard label="Lifetime goal days" value={streak.lifetimeGoalDays} hint="Completed daily goals" icon={Award} tone="success" />
        <StatCard label="Total XP" value={xp.totalXp} hint={`Level ${level.level}`} icon={Zap} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile details" subtitle="Shown to accountability partners and on leaderboards." icon={User} />
            <form onSubmit={save} className="space-y-4 p-5 pt-4 sm:p-6 sm:pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
                <Input label="Email" name="email" value={user.email} disabled hint="Email changes are not enabled in this MVP." />
              </div>

              <div>
                <p className="mb-1.5 text-sm font-medium text-main">Avatar colour</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, avatarColor: color }))}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border transition',
                        AVATAR_STYLES[color],
                        form.avatarColor === color ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
                      )}
                      aria-label={`Use ${color} avatar colour`}
                    >
                      {form.avatarColor === color ? <Check size={14} /> : <span className="text-[10px] font-semibold uppercase">{color.slice(0, 1)}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Timezone"
                  name="timezone"
                  value={form.timezone}
                  onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                  hint="Daily goals reset at midnight in this timezone."
                >
                  {[...new Set([form.timezone, ...TIMEZONES])].filter(Boolean).map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </Select>
                <Select
                  label="Weekly goal"
                  name="weeklyGoalDays"
                  value={form.weeklyGoalDays}
                  onChange={(event) => setForm((current) => ({ ...current, weeklyGoalDays: Number(event.target.value) }))}
                  hint="How many goal days you aim for each week."
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                    <option key={count} value={count}>{count} day{count === 1 ? '' : 's'} per week</option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Default daily target (XP)"
                  name="dailyGoalXp"
                  type="number"
                  min={10}
                  max={1000}
                  value={form.dailyGoalXp}
                  onChange={(event) => setForm((current) => ({ ...current, dailyGoalXp: event.target.value }))}
                  hint="Used for new daily goals. Today's target is set on Accountability."
                />
                <div className="rounded-xl border border-line bg-elevated/50 p-3">
                  <Toggle
                    checked={form.emailNotifications}
                    onChange={(value) => setForm((current) => ({ ...current, emailNotifications: value }))}
                    label="Email reminders"
                    description="Only sends when the server has email configured. In-app notices are always on."
                  />
                </div>
              </div>

              <Button type="submit" loading={saving}>
                <Save size={15} /> Save profile
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Appearance" subtitle="Applies instantly and is saved to your account." icon={Palette} />
            <div className="grid gap-3 p-5 pt-4 sm:grid-cols-2 sm:p-6 sm:pt-4">
              {[
                { value: 'dark', label: 'Deep navy', description: 'Low-light, focused, indigo accents.', icon: Moon },
                { value: 'light', label: 'Soft light', description: 'Bright surfaces with the same structure.', icon: Sun },
              ].map((option) => {
                const Icon = option.icon;
                const active = form.theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, theme: option.value }))}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
                      active ? 'border-accent bg-accent/[0.06]' : 'border-line bg-elevated/40 hover:border-accent/40'
                    )}
                  >
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-accent/15 text-accent' : 'bg-surface text-muted')}>
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-main">{option.label}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{option.description}</span>
                    </span>
                    {active ? <Check size={15} className="ml-auto mt-0.5 shrink-0 text-accent" /> : null}
                  </button>
                );
              })}
              <p className="text-[10px] leading-relaxed text-muted sm:col-span-2">
                Save the profile to persist the theme on your account. The theme button in the top bar still switches
                instantly on this device.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="XP history" subtitle="Every reward is a persisted, idempotent transaction." icon={Zap} />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              {xpLoading && !xpData ? (
                <p className="py-6 text-center text-xs text-muted">Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line py-8 text-center text-xs text-muted">
                  No XP transactions yet. Complete a lesson to start.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-line">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-elevated/70 text-[10px] uppercase tracking-[0.1em] text-muted">
                        <tr>
                          <th className="px-3.5 py-2.5 font-semibold">Reason</th>
                          <th className="px-3.5 py-2.5 font-semibold">Course</th>
                          <th className="px-3.5 py-2.5 font-semibold">When</th>
                          <th className="px-3.5 py-2.5 text-right font-semibold">XP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/70">
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="table-row-hover">
                            <td className="px-3.5 py-2.5 text-main">{XP_REASON_LABELS[transaction.reason] || transaction.reason}</td>
                            <td className="px-3.5 py-2.5 text-muted">{transaction.course?.title || '—'}</td>
                            <td className="px-3.5 py-2.5 text-muted">{formatDateTime(transaction.createdAt)}</td>
                            <td className="px-3.5 py-2.5 text-right font-semibold text-warning">+{transaction.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={xpPage <= 1}
                      onClick={() => setXpPage((value) => Math.max(1, value - 1))}
                    >
                      <ChevronLeft size={13} /> Previous
                    </Button>
                    <span className="text-[10px] text-muted">Page {xpPage} of {totalPages}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={xpPage >= totalPages}
                      onClick={() => setXpPage((value) => value + 1)}
                    >
                      Next <ChevronRight size={13} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Change password" subtitle="Use at least 8 characters with a letter and a number." icon={KeyRound} />
            <form onSubmit={changePassword} className="space-y-3 p-5 pt-4 sm:p-6 sm:pt-4">
              {passwordError ? (
                <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[11px] text-danger">{passwordError}</p>
              ) : null}
              <Input
                label="Current password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
              <Input
                label="New password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                required
              />
              <Input
                label="Confirm new password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
                required
              />
              <Button type="submit" size="sm" className="w-full" loading={changingPassword}>
                <KeyRound size={14} /> Update password
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-muted" />
              <h2 className="font-display text-sm font-semibold text-main">Privacy & data</h2>
            </div>
            <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted">
              <li>Only your name, avatar colour, and shared progress are visible to partners.</li>
              <li>Leaderboards use display name and avatar colour only.</li>
              <li>Quiz answers and lesson activity stay private to you.</li>
              <li>Sessions use HttpOnly cookies with CSRF protection on writes.</li>
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold text-main">Session</h2>
            <p className="mt-1 text-[11px] text-muted">Sign out on this device. Your progress stays saved.</p>
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={signOut}>
              <LogOut size={14} /> Sign out
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
