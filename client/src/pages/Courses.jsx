import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Compass, GraduationCap, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api.js';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  Tabs,
} from '../components/ui.jsx';
import CourseCard from '../components/CourseCard.jsx';
import { DIFFICULTY_LABELS } from '../utils/format.js';

export default function Courses() {
  const toast = useToast();
  const { data, loading, error, refresh } = useAsync(() => api.courses.list());
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [enrollingId, setEnrollingId] = useState(null);

  const courses = data?.courses || [];
  const categories = data?.categories || [];

  const enrolled = courses.filter((course) => course.enrolled);
  const completed = enrolled.filter((course) => course.progress.percent === 100);
  const inProgress = enrolled.filter((course) => course.progress.percent > 0 && course.progress.percent < 100);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (tab === 'enrolled' && !course.enrolled) return false;
      if (tab === 'discover' && course.enrolled) return false;
      if (difficulty && course.difficulty !== difficulty) return false;
      if (category && course.category !== category) return false;
      if (!query) return true;
      return [course.title, course.tagline, course.description, course.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [courses, tab, search, difficulty, category]);

  const enroll = async (courseId) => {
    setEnrollingId(courseId);
    try {
      await api.courses.enroll(courseId);
      toast.success('Enrolled. Your first lesson is ready.', { title: 'Course unlocked' });
      await refresh();
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your library"
        title="My Courses"
        subtitle="Continue where you left off, or add a new path. Enrolling is free and unlocks every lesson, quiz, and flashcard in that course."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="accent">
              <BookOpen size={11} /> {enrolled.length} enrolled
            </Badge>
            <Badge tone="success">
              <CheckCircle2 size={11} /> {completed.length} complete
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Enrolled courses', value: enrolled.length, icon: BookOpen, tone: 'text-accent bg-accent/10' },
          { label: 'In progress', value: inProgress.length, icon: GraduationCap, tone: 'text-warning bg-warning/10' },
          { label: 'Completed', value: completed.length, icon: CheckCircle2, tone: 'text-success bg-success/10' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                <Icon size={18} />
              </span>
              <div>
                <p className="font-display text-xl font-semibold text-main">{stat.value}</p>
                <p className="text-[11px] text-muted">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${courses.length})` },
            { value: 'enrolled', label: `Enrolled (${enrolled.length})` },
            { value: 'discover', label: `Discover (${courses.length - enrolled.length})` },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              name="course-search"
              placeholder="Search courses..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 py-0 pl-9 sm:w-60"
              aria-label="Search courses"
            />
          </div>
          <div className="flex gap-2">
            <Select
              name="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="h-10 py-0 text-xs"
              aria-label="Filter by difficulty"
            >
              <option value="">All levels</option>
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 py-0 text-xs"
              aria-label="Filter by category"
            >
              <option value="">All topics</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={courses.length === 0 ? Compass : SlidersHorizontal}
          title={courses.length === 0 ? 'No courses are published yet' : 'No courses match these filters'}
          description={
            courses.length === 0
              ? 'Once an administrator publishes a course, it will appear here.'
              : 'Try clearing the search or choosing a different level or topic.'
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setDifficulty('');
                setCategory('');
                setTab('all');
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEnroll={enroll}
              enrolling={enrollingId === course.id}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/[0.06] p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold text-main">Every course follows the same honest loop</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Read a lesson, prove it in a server-scored quiz, review flashcards, and keep a daily goal.
            </p>
          </div>
        </div>
        <Link to="/practice" className="shrink-0">
          <Button size="sm" variant="secondary">Open practice hub</Button>
        </Link>
      </div>
    </div>
  );
}
