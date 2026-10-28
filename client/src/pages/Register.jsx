import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, Sparkles, UserPlus, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input } from '../components/ui.jsx';

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const BENEFITS = [
  'Short guided lessons with visible progress',
  'Quizzes graded and rewarded by the server',
  'Spaced flashcards and daily goals',
  'Course knowledge leaderboard and achievements',
];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const timezone = useMemo(detectTimezone, []);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Include at least one letter and one number.';
    }
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate() || loading) return;
    setLoading(true);
    setError('');
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        timezone,
      });
      toast.success('Account created. Let us set up your first goal.');
      navigate('/dashboard', { replace: true });
    } catch (apiError) {
      setError(apiError.message || 'Could not create your account.');
      const details = apiError.details || [];
      if (details.length) {
        setFieldErrors(Object.fromEntries(details.map((detail) => [detail.field, detail.message])));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-app lg:grid-cols-[1fr_1fr]">
      <div className="flex min-h-screen flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
                <Zap size={18} />
              </span>
              <span className="font-display text-base font-semibold text-main">LearnMate</span>
            </Link>
            <Link to="/login" className="text-xs font-semibold text-accent">
              Sign in instead
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              <Sparkles size={11} /> Free starter account
            </span>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-main">Create your account</h1>
            <p className="mt-1.5 text-sm text-muted">Start with one course and one small daily goal.</p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {error ? (
                <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
                  {error}
                </p>
              ) : null}

              <Input
                label="Full name"
                name="name"
                autoComplete="name"
                placeholder="Alex Morgan"
                value={form.name}
                onChange={update('name')}
                error={fieldErrors.name}
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update('email')}
                error={fieldErrors.email}
                required
              />
              <div className="relative">
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={update('password')}
                  error={fieldErrors.password}
                  hint="Use at least one letter and one number."
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-[34px] rounded-md p-1 text-muted transition hover:text-main"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Input
                label="Confirm password"
                name="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={update('confirm')}
                error={fieldErrors.confirm}
                required
              />

              <div className="rounded-xl border border-line bg-elevated/60 px-3.5 py-2.5 text-[11px] text-muted">
                Timezone detected: <span className="font-semibold text-main">{timezone}</span>. You can change it later
                in settings.
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                {loading ? 'Creating account...' : (
                  <>
                    <UserPlus size={16} /> Create free account
                  </>
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
              No credit card required. Your progress, XP, and goals are stored securely on the server.
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:p-12">
        <div className="landing-grid absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="relative mx-auto max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-main">
            Small steps.
            <span className="block text-accent">Verified progress.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            LearnMate is built for people who want to keep learning when motivation dips. Everything you see is backed
            by server-side records, not self-reported streaks.
          </p>
          <ul className="mt-7 space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm text-main/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check size={12} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-2xl border border-line bg-app/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">A healthy XP loop</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {[
                ['Lesson', '+10 XP'],
                ['Quiz', '5 + 2/correct'],
                ['Flashcards', '2 XP · capped'],
                ['Mini-game', '8 XP · 3/day'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <p className="text-[11px] text-muted">{label}</p>
                  <p className="text-xs font-semibold text-main">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              Rewards are idempotent on the server, so repeating an action cannot duplicate XP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
