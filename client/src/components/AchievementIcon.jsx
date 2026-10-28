import {
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  Footprints,
  Gamepad2,
  GraduationCap,
  Layers,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

const MAP = {
  Footprints,
  BookOpenCheck,
  ClipboardCheck,
  Sparkles,
  Target,
  Flame,
  CalendarCheck,
  Zap,
  Layers,
  Gamepad2,
  CheckCircle2,
  GraduationCap,
  Trophy,
};

export const TIER_STYLES = {
  BRONZE: 'border-amber-600/30 bg-amber-600/10 text-amber-600 dark:text-amber-400',
  SILVER: 'border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300',
  GOLD: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  PLATINUM: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
};

export default function AchievementIcon({ name, size = 20 }) {
  const Icon = MAP[name] || Trophy;
  return <Icon size={size} />;
}
