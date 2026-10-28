import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Layers, Trophy } from 'lucide-react';
import { Badge, ProgressBar } from './ui.jsx';
import { DIFFICULTY_LABELS, DIFFICULTY_STYLES, formatMinutes } from '../utils/format.js';

export default function CourseCard({ course, onEnroll, enrolling = false, compact = false }) {
  const progress = course.progress || { percent: 0, completedCount: 0, totalCount: course.lessonCount || 0 };
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:border-accent/30 hover:shadow-float">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={DIFFICULTY_STYLES[course.difficulty] || 'neutral'}>
            {DIFFICULTY_LABELS[course.difficulty] || course.difficulty}
          </Badge>
          <Badge tone="neutral">{course.category}</Badge>
          {course.enrolled ? <Badge tone="accent">Enrolled</Badge> : null}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <BookOpen size={17} />
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-main">
        <Link to={`/courses/${course.id}`} className="transition hover:text-accent">
          {course.title}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
        {course.tagline || course.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <BookOpen size={13} /> {course.lessonCount ?? progress.totalCount} lessons
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Layers size={13} /> {course.flashcardCount ?? 0} cards
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={13} /> {formatMinutes(course.estimatedMinutes)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Trophy size={13} /> {course.quizCount ?? 0} quiz
        </span>
      </div>

      {course.enrolled ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted">
              {progress.completedCount}/{progress.totalCount} complete
            </span>
            <span className="font-semibold text-main">{progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} label={`${course.title} progress`} />
          {progress.percent === 100 ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircle2 size={13} /> Course complete
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-5">
        {course.enrolled ? (
          <>
            <Link
              to={`/courses/${course.id}`}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-white transition hover:bg-accent-strong"
            >
              {progress.completedCount > 0 ? 'Continue learning' : 'Start course'}
              <ArrowRight size={14} />
            </Link>
            {!compact ? (
              <Link
                to={`/courses/${course.id}#leaderboard`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-main"
              >
                <Trophy size={14} /> Rank
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEnroll?.(course.id)}
              disabled={enrolling}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
            >
              {enrolling ? 'Enrolling...' : 'Enroll free'}
              <ArrowRight size={14} />
            </button>
            <Link
              to={`/courses/${course.id}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-line px-3 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-main"
            >
              Preview
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
