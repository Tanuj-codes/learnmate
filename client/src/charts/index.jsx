import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '../components/ui.jsx';
const COLORS = {
  accent: '#818cf8',
  accentStrong: '#6366f1',
  violet: '#a78bfa',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  grid: 'rgba(148, 163, 184, 0.14)',
  axis: '#94a3b8',
};

const tooltipStyle = {
  backgroundColor: 'rgb(var(--c-surface))',
  border: '1px solid rgb(var(--c-line))',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'rgb(var(--c-text))',
  boxShadow: '0 16px 40px -20px rgba(2,6,23,0.6)',
};

function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="font-semibold text-main">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey || entry.name} className="mt-0.5 text-[11px] text-muted">
          {entry.name}: <span className="font-semibold text-main">{entry.value}{suffix}</span>
        </p>
      ))}
    </div>
  );
}

function hasData(rows, key) {
  return Array.isArray(rows) && rows.some((row) => Number(row[key]) > 0);
}

function ChartEmpty({ title, description }) {
  return (
    <EmptyState
      icon={BarChart3}
      title={title}
      description={description}
      className="h-64 border-line/60"
    />
  );
}

export function WeeklyActivityChart({ rows = [] }) {
  if (!hasData(rows, 'xp')) {
    return <ChartEmpty title="No activity in this period" description="Complete a lesson, quiz, flashcard review, or game to see your weekly activity here." />;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <Tooltip content={<ChartTooltip suffix=" XP" />} cursor={{ fill: 'rgba(129,140,248,0.08)' }} />
          <Bar dataKey="xp" name="XP earned" fill={COLORS.accent} radius={[6, 6, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function QuizTrendChart({ rows = [] }) {
  const data = rows.filter((row) => row.quizzes > 0);
  if (!data.length) {
    return <ChartEmpty title="No quiz data yet" description="Take a course assessment to start a performance trend." />;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <Tooltip content={<ChartTooltip suffix="%" />} />
          <Line
            type="monotone"
            dataKey="averageQuizScore"
            name="Average score"
            stroke={COLORS.violet}
            strokeWidth={2.5}
            dot={{ r: 4, fill: COLORS.violet, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopicAccuracyChart({ topics = [] }) {
  if (!topics.length) {
    return <ChartEmpty title="Topic accuracy is waiting" description="Once you answer quiz questions, you will see which topics are strong and which need revision." />;
  }
  const data = topics.slice(0, 6);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
          <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="topic"
            width={112}
            tickLine={false}
            axisLine={false}
            tick={{ fill: COLORS.axis, fontSize: 10 }}
          />
          <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: 'rgba(129,140,248,0.06)' }} />
          <Bar dataKey="accuracy" name="Accuracy" radius={[0, 6, 6, 0]} maxBarSize={18}>
            {data.map((entry) => (
              <Cell
                key={entry.topic}
                fill={entry.accuracy >= 75 ? COLORS.success : entry.accuracy >= 50 ? COLORS.warning : COLORS.danger}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CourseCompletionChart({ courses = [] }) {
  if (!courses.length) {
    return <ChartEmpty title="No enrolled courses yet" description="Enroll in a course to track completion progress." />;
  }
  const data = courses.map((course) => ({
    label: course.title.length > 22 ? `${course.title.slice(0, 22)}...` : course.title,
    percent: course.percent,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 10 }} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: 'rgba(52,211,153,0.06)' }} />
          <Bar dataKey="percent" name="Completed" fill={COLORS.success} radius={[6, 6, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function XpProgressionChart({ rows = [] }) {
  if (!hasData(rows, 'cumulativeXp')) {
    return <ChartEmpty title="Your XP journey starts with one step" description="Complete your first lesson or quiz to begin the progression chart." />;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <Tooltip content={<ChartTooltip suffix=" XP" />} />
          <Area
            type="monotone"
            dataKey="cumulativeXp"
            name="Total XP"
            stroke={COLORS.accent}
            strokeWidth={2.5}
            fill="url(#xpGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GoalRateChart({ rate = 0, completed = 0, days = 7 }) {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="relative h-56 w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'Goals met', value: completed },
                { name: 'Remaining', value: Math.max(0, days - completed) },
              ]}
              dataKey="value"
              innerRadius="72%"
              outerRadius="94%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              paddingAngle={2}
            >
              <Cell fill={COLORS.success} />
              <Cell fill={COLORS.grid} />
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold text-main">{rate}%</span>
          <span className="mt-1 text-[11px] text-muted">goal completion</span>
        </div>
      </div>
    </div>
  );
}

export function GoalStreakChart({ rows = [] }) {
  const data = rows.map((row) => ({
    label: row.label,
    minutes: row.lessons * 12 + row.flashcards * 2 + row.games * 3,
  }));
  if (!rows.length) {
    return <ChartEmpty title="No study rhythm yet" description="Your daily study activity will appear as you learn." />;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <Tooltip content={<ChartTooltip suffix=" min" />} cursor={{ fill: 'rgba(167,139,250,0.08)' }} />
          <Bar dataKey="minutes" name="Estimated study" fill={COLORS.violet} radius={[6, 6, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { COLORS };
