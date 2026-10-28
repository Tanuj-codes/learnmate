import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { AVATAR_STYLES, initials } from '../utils/format.js';

const BUTTON_VARIANTS = {
  primary:
    'bg-accent text-white shadow-sm shadow-accent/25 hover:bg-accent-strong focus-visible:ring-accent/40',
  secondary:
    'border border-line bg-elevated text-main hover:border-accent/40 hover:text-main focus-visible:ring-accent/30',
  ghost: 'text-muted hover:bg-elevated hover:text-main focus-visible:ring-accent/30',
  outline:
    'border border-accent/40 bg-transparent text-accent hover:bg-accent/10 focus-visible:ring-accent/30',
  danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/40',
  success: 'bg-success text-white hover:bg-success/90 focus-visible:ring-success/40',
};

const BUTTON_SIZES = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-6 text-sm sm:text-base',
  icon: 'h-9 w-9 rounded-lg',
};

export function buttonStyles({ variant = 'primary', size = 'md', className = '' } = {}) {
  return cn(
    'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:cursor-not-allowed disabled:opacity-50',
    BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
    BUTTON_SIZES[size] || BUTTON_SIZES.md,
    className
  );
}

const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', loading = false, className, disabled, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export const Card = forwardRef(function Card({ children, className, as: Tag = 'div', ...props }, ref) {
  return (
    <Tag ref={ref} className={cn('rounded-2xl border border-line bg-surface shadow-card', className)} {...props}>
      {children}
    </Tag>
  );
});

export function CardHeader({ title, subtitle, action, icon: Icon, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 p-5 pb-0 sm:p-6 sm:pb-0', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Icon size={16} />
            </span>
          ) : null}
          <h2 className="font-display text-base font-semibold tracking-tight text-main">{title}</h2>
        </div>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export const BADGE_TONES = {
  neutral: 'border-line bg-elevated text-muted',
  accent: 'border-accent/25 bg-accent/10 text-accent',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  danger: 'border-danger/25 bg-danger/10 text-danger',
  violet: 'border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300',
};

export function Badge({ children, tone = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        BADGE_TONES[tone] || BADGE_TONES.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value = 0, className, tone = 'accent', label }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const tones = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };
  return (
    <div className={cn('w-full', className)}>
      <div
        className="h-2 overflow-hidden rounded-full bg-line/70"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', tones[tone] || tones.accent)}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressRing({
  value = 0,
  size = 120,
  strokeWidth = 10,
  children,
  className,
  tone = 'accent',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const offset = circumference - (safe / 100) * circumference;
  const colors = { accent: 'rgb(var(--c-accent))', success: 'rgb(var(--c-success))', warning: 'rgb(var(--c-warning))' };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--c-line))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors[tone] || colors.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-line/60', className)} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function Spinner({ className, size = 20 }) {
  return <Loader2 className={cn('animate-spin text-accent', className)} size={size} aria-label="Loading" />;
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'accent', className }) {
  const tones = {
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  };
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-main">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone] || tones.accent)}>
            <Icon size={19} />
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow, className }) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-main sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/80 px-6 py-12 text-center', className)}>
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Icon size={22} />
        </span>
      ) : null}
      <h3 className="font-display text-base font-semibold text-main">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  const details = error?.details || [];
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
          <span className="text-lg font-bold">!</span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-main">Something went wrong</h3>
          <p className="mt-1 text-sm text-muted">{error?.message || 'The request could not be completed.'}</p>
          {details.length ? (
            <ul className="mt-3 space-y-1 text-xs text-danger">
              {details.map((detail, index) => (
                <li key={`${detail.field}-${index}`}>
                  {detail.field ? <span className="font-semibold">{detail.field}: </span> : null}
                  {detail.message}
                </li>
              ))}
            </ul>
          ) : null}
          {onRetry ? (
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => onRetry()}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function Input({ label, error, hint, id, className, required, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-main">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-line bg-elevated px-3.5 py-2.5 text-sm text-main placeholder:text-muted/60 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60',
          error && 'border-danger/60 focus:border-danger focus:ring-danger/20',
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Select({ label, error, hint, id, children, className, ...props }) {
  const selectId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={selectId} className="block text-sm font-medium text-main">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={cn(
          'w-full appearance-none rounded-xl border border-line bg-elevated px-3.5 py-2.5 text-sm text-main transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
          error && 'border-danger/60',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-main">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50',
          checked ? 'border-accent bg-accent' : 'border-line bg-line/70'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-1'
          )}
        />
      </button>
    </label>
  );
}

export function Avatar({ name, color = 'indigo', size = 'md', className }) {
  const sizes = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border font-semibold uppercase tracking-wide',
        AVATAR_STYLES[color] || AVATAR_STYLES.indigo,
        sizes[size] || sizes.md,
        className
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-elevated p-1', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm',
            value === tab.value ? 'bg-surface text-main shadow-sm' : 'text-muted hover:text-main'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export { Button };
export default Button;
