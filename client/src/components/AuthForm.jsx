import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input } from './ui.jsx';

export default function LoginForm({ redirectTo = '/dashboard', onDemo }) {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
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
    if (!form.email.trim()) next.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Enter your password.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate() || loading) return;
    setLoading(true);
    setError('');
    try {
      await login({ email: form.email.trim(), password: form.password });
      toast.success('Signed in. Your progress is ready.');
      navigate(redirectTo, { replace: true });
    } catch (apiError) {
      setError(apiError.message || 'Sign in failed. Please try again.');
      const details = apiError.details || [];
      if (details.length) {
        setFieldErrors(Object.fromEntries(details.map((detail) => [detail.field, detail.message])));
      }
    } finally {
      setLoading(false);
    }
  };

  const useDemo = () => {
    setForm({ email: 'demo@learnmate.dev', password: 'Demo1234!' });
    setError('');
    setFieldErrors({});
    onDemo?.('Demo credentials filled in. Press Sign in to continue.');
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
          {error}
        </p>
      ) : null}

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
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={update('password')}
          error={fieldErrors.password}
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

      <Button type="submit" className="w-full" loading={loading}>
        {loading ? 'Signing in...' : (
          <>
            <LogIn size={16} /> Sign in
          </>
        )}
      </Button>

      <button
        type="button"
        onClick={useDemo}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-main disabled:opacity-50"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : null}
        Fill demo credentials
      </button>

      <p className="text-center text-[11px] leading-relaxed text-muted">
        By signing in you agree to use your own account responsibly. Sessions use secure HttpOnly cookies.
      </p>
    </form>
  );
}
