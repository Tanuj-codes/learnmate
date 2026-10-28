import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogOut,
  Settings,
  Shield,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, ProgressBar } from './ui.jsx';
import { cn } from '../utils/cn.js';
import { levelFromXp } from '../utils/level.js';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/courses', label: 'My Courses', icon: BookOpen },
      { to: '/practice', label: 'Learn & Practice', icon: GraduationCap },
    ],
  },
  {
    label: 'Build knowledge',
    items: [
      { to: '/flashcards', label: 'Flashcards', icon: Layers },
      { to: '/games', label: 'Mini-Games', icon: Gamepad2 },
      { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'Progress',
    items: [
      { to: '/accountability', label: 'Accountability', icon: CalendarCheck },
      { to: '/achievements', label: 'Achievements', icon: Zap },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/profile', label: 'Profile & Settings', icon: Settings },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user, xp, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const level = levelFromXp(xp?.totalXp || 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface transition-transform duration-300 lg:w-64 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between gap-2 px-5">
          <NavLink to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm shadow-accent/30">
              <Zap size={19} strokeWidth={2.4} />
            </span>
            <span>
              <span className="block font-display text-base font-semibold tracking-tight text-main">LearnMate</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">Learn with momentum</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition hover:bg-elevated hover:text-main lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mt-5 first:mt-2">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/80">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-accent/10 text-accent'
                            : 'text-muted hover:bg-elevated hover:text-main'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={17}
                            className={cn('shrink-0 transition-colors', isActive ? 'text-accent' : 'text-muted group-hover:text-main')}
                          />
                          <span className="truncate">{item.label}</span>
                          {item.to === '/achievements' && location.pathname === '/achievements' ? (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {user?.role === 'ADMIN' ? (
            <div className="mt-5">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/80">Administration</p>
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-elevated hover:text-main'
                  )
                }
              >
                <Shield size={17} />
                Admin console
              </NavLink>
            </div>
          ) : null}
        </nav>

        <div className="border-t border-line p-3">
          <NavLink
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-elevated"
          >
            <Avatar name={user?.name} color={user?.avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-main">{user?.name}</p>
              <p className="text-[11px] text-muted">
                Level {level.level} · {xp?.totalXp || 0} XP
              </p>
            </div>
          </NavLink>
          <div className="mt-2 px-2">
            <ProgressBar value={level.progressPercent} label="Level progress" />
            <p className="mt-1.5 text-[10px] text-muted">{level.xpToNextLevel} XP to level {level.level + 1}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition hover:bg-elevated hover:text-main"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
