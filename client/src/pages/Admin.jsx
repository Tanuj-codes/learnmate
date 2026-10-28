import { useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Search,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
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
  Select,
  StatCard,
} from '../components/ui.jsx';
import { formatDate, formatNumber } from '../utils/format.js';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const { data: stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useAsync(() =>
    api.admin.stats()
  );
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
    refresh: refreshUsers,
  } = useAsync(() => api.admin.users({ search, page, pageSize: 10 }), [search, page]);

  const changeRole = async (target, role) => {
    setBusyId(target.id);
    try {
      await api.admin.setRole(target.id, role);
      toast.success(`${target.name} is now ${role === 'ADMIN' ? 'an administrator' : 'a student'}.`);
      await Promise.all([refreshUsers(), refreshStats()]);
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setBusyId(null);
    }
  };

  if (statsLoading && !stats) return <PageSkeleton />;
  if (statsError && !stats) return <ErrorState error={statsError} onRetry={refreshStats} />;
  if (!stats) return null;

  const users = usersData?.users || [];
  const totalPages = usersData ? Math.max(1, Math.ceil(usersData.total / usersData.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Admin console"
        subtitle="Read-only platform health plus role management. Admin actions are protected by server-side RBAC."
        actions={<Badge tone="violet"><Shield size={11} /> Administrator</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Learners" value={formatNumber(stats.users)} hint={`${stats.activeLearners24h} active in 24h`} icon={Users} tone="accent" />
        <StatCard label="Courses" value={stats.courses} hint={`${stats.enrollments} enrollments`} icon={BookOpen} tone="success" />
        <StatCard label="Quiz attempts" value={formatNumber(stats.quizAttempts)} hint={`${stats.completedGames} games completed`} icon={TrendingUp} tone="violet" />
        <StatCard label="XP awarded" value={formatNumber(stats.totalXpAwarded)} hint="Verified ledger total" icon={Zap} tone="warning" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Users size={17} />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-main">{stats.activeLearners24h}</p>
            <p className="text-[10px] text-muted">Active learners (24h)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <Gamepad2 size={17} />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-main">{stats.completedGames}</p>
            <p className="text-[10px] text-muted">Completed mini-games</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
            <ShieldCheck size={17} />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-main">{stats.enrollments}</p>
            <p className="text-[10px] text-muted">Course enrollments</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Learner directory"
          subtitle="Search by name or email. Role changes take effect on the next request."
          icon={Users}
          action={<Badge tone="neutral">{usersData?.total ?? 0} total</Badge>}
        />
        <div className="p-5 pt-4 sm:p-6 sm:pt-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="relative w-full sm:max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                name="adminSearch"
                placeholder="Search learners..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="h-10 py-0 pl-9"
                aria-label="Search learners"
              />
            </div>
            <Button type="submit" size="md" variant="secondary">
              Search
            </Button>
            {search ? (
              <Button
                type="button"
                size="md"
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
              >
                Clear
              </Button>
            ) : null}
          </form>

          <div className="mt-4">
            {usersLoading && !usersData ? (
              <p className="py-10 text-center text-xs text-muted">Loading learners...</p>
            ) : usersError ? (
              <ErrorState error={usersError} onRetry={refreshUsers} />
            ) : users.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No learners match"
                description="Try a different name or email fragment."
                className="py-8"
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[44rem] text-left text-xs">
                  <thead className="bg-elevated/70 text-[10px] uppercase tracking-[0.1em] text-muted">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold">Learner</th>
                      <th className="px-3.5 py-2.5 font-semibold">Joined</th>
                      <th className="px-3.5 py-2.5 font-semibold">Activity</th>
                      <th className="px-3.5 py-2.5 font-semibold">XP</th>
                      <th className="px-3.5 py-2.5 font-semibold">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {users.map((row) => {
                      const isSelf = row.id === currentUser?.id;
                      return (
                        <tr key={row.id} className="table-row-hover">
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={row.name} color={row.avatarColor} size="sm" />
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-main">
                                  {row.name}
                                  {isSelf ? <Badge tone="accent">You</Badge> : null}
                                </p>
                                <p className="truncate text-[10px] text-muted">{row.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-muted">{formatDate(row.createdAt)}</td>
                          <td className="px-3.5 py-3 text-muted">
                            <span title="Enrollments">{row._count.enrollments} courses</span>
                            {' · '}
                            <span title="Quiz attempts">{row._count.quizAttempts} quizzes</span>
                            {' · '}
                            <span title="Achievements">{row._count.userAchievements} badges</span>
                          </td>
                          <td className="px-3.5 py-3 font-semibold text-warning">{formatNumber(row.totalXp)}</td>
                          <td className="px-3.5 py-3">
                            <Select
                              name={`role-${row.id}`}
                              value={row.role}
                              onChange={(event) => changeRole(row, event.target.value)}
                              disabled={isSelf || busyId === row.id}
                              className="h-8 py-0 text-[11px]"
                              aria-label={`Role for ${row.name}`}
                            >
                              <option value="STUDENT">Student</option>
                              <option value="ADMIN">Admin</option>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft size={13} /> Previous
              </Button>
              <span className="text-[10px] text-muted">Page {page} of {totalPages}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
        <ShieldCheck size={12} /> All admin endpoints require a valid ADMIN role on the server.
      </p>
    </div>
  );
}
