import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCheck,
  Flame,
  Menu,
  Moon,
  Sun,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import { Avatar, Spinner } from './ui.jsx';
import { cn } from '../utils/cn.js';
import { relativeTime } from '../utils/format.js';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/courses': 'My Courses',
  '/practice': 'Learn & Practice',
  '/flashcards': 'Flashcards',
  '/games': 'Mini-Games',
  '/leaderboard': 'Leaderboard',
  '/accountability': 'Accountability',
  '/achievements': 'Achievements',
  '/analytics': 'Analytics',
  '/profile': 'Profile & Settings',
  '/admin': 'Admin console',
};

const NOTIFICATION_ICONS = {
  GOAL_REMINDER: CalendarCheck,
  PENDING_LESSON: BookOpen,
  ACHIEVEMENT: Award,
  WEEKLY_SUMMARY: Flame,
  PARTNER: Users,
  SYSTEM: Bell,
};

function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading: false, error: null, notifications: [], unreadCount: 0 });
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await api.notifications.list();
      setState({ loading: false, error: null, notifications: data.notifications, unreadCount: data.unreadCount });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    load();
    // Load once so the unread badge is accurate before the menu is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const markAll = async () => {
    try {
      await api.notifications.readAll();
      setState((current) => ({
        ...current,
        unreadCount: 0,
        notifications: current.notifications.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
      }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openNotification = async (notification) => {
    try {
      if (!notification.readAt) {
        await api.notifications.read(notification.id);
        setState((current) => ({
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          notifications: current.notifications.map((item) =>
            item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
          ),
        }));
      }
    } catch (error) {
      console.warn('Could not mark notification read:', error.message);
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-main"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {state.unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {state.unreadCount > 9 ? '9+' : state.unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-float animate-scale-in">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-main">Notifications</p>
              <p className="text-[11px] text-muted">{state.unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={markAll}
              disabled={!state.unreadCount}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/10 disabled:opacity-40"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>
          <div className="max-h-[22rem] overflow-y-auto">
            {state.loading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : state.error ? (
              <p className="px-4 py-8 text-center text-sm text-danger">{state.error.message}</p>
            ) : state.notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                No reminders yet. Your in-app notices will appear here.
              </p>
            ) : (
              state.notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
                return (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left transition last:border-0 hover:bg-elevated',
                      !notification.readAt && 'bg-accent/[0.04]'
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-main">{notification.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{notification.message}</span>
                      <span className="mt-1 block text-[10px] text-muted/80">{relativeTime(notification.createdAt)}</span>
                    </span>
                    {!notification.readAt ? <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Topbar({ onMenuClick }) {
  const { user, xp } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  let title = PAGE_TITLES[location.pathname];
  if (!title) {
    if (location.pathname.startsWith('/courses/')) title = 'Course';
    else if (location.pathname.startsWith('/lessons/')) title = 'Lesson';
    else if (location.pathname.startsWith('/attempts/')) title = 'Quiz results';
    else title = 'LearnMate';
  }
  if (location.pathname.includes('/quizzes/')) title = 'Quiz';

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-main lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold tracking-tight text-main">{title}</p>
            <p className="hidden text-[11px] text-muted sm:block">Small steps, verified progress.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/profile"
            className="hidden items-center gap-1.5 rounded-full border border-line bg-elevated/70 px-3 py-1.5 text-xs font-semibold text-main transition hover:border-accent/40 sm:inline-flex"
            title="Total XP"
          >
            <Zap size={13} className="text-warning" fill="currentColor" />
            {xp?.totalXp || 0} XP
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-main"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <NotificationMenu />
          <Link to="/profile" className="ml-0.5 rounded-full focus-visible:ring-2 focus-visible:ring-accent/40">
            <Avatar name={user?.name} color={user?.avatarColor} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
