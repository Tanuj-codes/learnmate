import { completeLesson, enrollInCourse, getCourseDetail, getCourseProgress, getLessonForUser, listCourses } from '../services/courseService.js';
import { finalizeProgress } from '../services/progressService.js';
import { getXpSummary } from '../services/xpService.js';

export async function list(req, res) {
  const result = await listCourses({
    ...req.validatedQuery,
    userId: req.user?.id,
  });
  res.json({ success: true, data: result });
}

export async function detail(req, res) {
  const result = await getCourseDetail(req.params.courseId, req.user);
  res.json({ success: true, data: result });
}

export async function enroll(req, res) {
  const result = await enrollInCourse(req.user.id, req.params.courseId);
  res.status(201).json({ success: true, data: result });
}

export async function progress(req, res) {
  const result = await getCourseProgress(req.user.id, req.params.courseId);
  res.json({ success: true, data: result });
}

export async function lesson(req, res) {
  const result = await getLessonForUser(req.params.lessonId, req.user);
  res.json({ success: true, data: result });
}

export async function complete(req, res) {
  const result = await completeLesson(req.user.id, req.params.lessonId);
  const { goal, unlocked } = await finalizeProgress(req.user.id);
  const xp = await getXpSummary(req.user.id);
  res.json({
    success: true,
    data: {
      ...result,
      xpAwarded: result.xpAwarded + goal.goalXpAwarded,
      goal,
      achievementsUnlocked: unlocked,
      xp,
    },
  });
}
