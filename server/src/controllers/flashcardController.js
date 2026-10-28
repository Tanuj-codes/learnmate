import {
  getCourseFlashcards,
  getDueFlashcards,
  getFlashcardOverview,
  reviewFlashcard,
} from '../services/flashcardService.js';
import { finalizeProgress } from '../services/progressService.js';
import { getXpSummary } from '../services/xpService.js';

export async function courseDeck(req, res) {
  const result = await getCourseFlashcards(req.user.id, req.params.courseId);
  res.json({ success: true, data: result });
}

export async function review(req, res) {
  const reviewResult = await reviewFlashcard(req.user.id, req.params.flashcardId, req.body.rating);
  const { goal, unlocked } = await finalizeProgress(req.user.id);
  const xp = await getXpSummary(req.user.id);
  res.status(201).json({
    success: true,
    data: {
      ...reviewResult,
      goal,
      achievementsUnlocked: unlocked,
      xp,
    },
  });
}

export async function due(req, res) {
  const result = await getDueFlashcards(req.user.id, req.validatedQuery);
  res.json({ success: true, data: result });
}

export async function overview(req, res) {
  const result = await getFlashcardOverview(req.user.id);
  res.json({ success: true, data: result });
}
