import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Flame, ShieldCheck, Trophy, Zap } from 'lucide-react';
import { useState } from 'react';
import LoginForm from '../components/AuthForm.jsx';

const POINTS = [
  { icon: ShieldCheck, text: 'Server-verified scores and rewards' },
  { icon: Flame, text: 'Daily goals with recovery, not guilt' },
  { icon: Trophy, text: 'Transparent course knowledge ranking' },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState(location.state?.notice || '');
  const redirectTo = location.state?.from || '/dashboard';

  return (
    <div className="grid min-h-screen bg-app lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="landing-grid absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-sm shadow-accent/30">
              <Zap size={21} strokeWidth={2.4} />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold tracking-tight text-main">LearnMate</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">Learn with momentum</span>
            </span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-main">
            Welcome back.
            <span className="block text-accent">Pick up where you left off.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Your lessons, flashcard schedule, streak, and verified results are exactly where you left them.
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <li key={point.text} className="flex items-center gap-3 text-sm text-main/90">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon size={15} />
                  </span>
                  {point.text}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-muted">
          <CheckCircle2 size={14} className="text-success" />
          Demo account available on the form - no setup required.
        </div>
      </div>

      <div className="flex min-h-screen flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
                <Zap size={18} />
              </span>
              <span className="font-display text-base font-semibold text-main">LearnMate</span>
            </Link>
            <Link to="/register" className="text-xs font-semibold text-accent">
              Create account
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-main">Sign in</h2>
            <p className="mt-1.5 text-sm text-muted">Continue your learning streak.</p>
            {notice ? (
              <p className="mt-4 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-xs text-success">
                {notice}
              </p>
            ) : null}
            <div className="mt-6">
              <LoginForm redirectTo={redirectTo} onDemo={(message) => setNotice(message)} />
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            New to LearnMate?{' '}
            <Link to="/register" className="font-semibold text-accent hover:underline">
              Create a free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
