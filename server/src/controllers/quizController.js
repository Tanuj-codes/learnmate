import {
  getAttemptResult,
  getQuizAttemptHistory,
  getQuizMeta,
  listQuizzesForCourse,
  startAttempt,
  submitAttempt,
} from '../services/quizService.js';
import { finalizeProgress } from '../services/progressService.js';
import { getXpSummary } from '../services/xpService.js';

export async function list(req, res) {
  const quizzes = await listQuizzesForCourse(req.params.courseId, req.user.id);
  res.json({ success: true, data: { quizzes } });
}

export async function start(req, res) {
  const result = await startAttempt(req.user.id, req.params.quizId, req.body.questionCount);
  res.status(201).json({ success: true, data: result });
}

export async function submit(req, res) {
  const result = await submitAttempt(req.user.id, req.params.attemptId, req.body.answers);
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

export async function results(req, res) {
  const result = await getAttemptResult(req.user.id, req.params.attemptId);
  res.json({ success: true, data: result });
}

export async function history(req, res) {
  const result = await getQuizAttemptHistory(req.user.id, req.params.quizId);
  res.json({ success: true, data: result });
}

export async function meta(req, res) {
  const result = await getQuizMeta(req.user.id, req.params.quizId);
  res.json({ success: true, data: result });
}
