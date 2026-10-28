import {
  createGameSession,
  getGameHistory,
  submitMatchPairs,
  submitTimedChallenge,
} from '../services/gameService.js';
import { finalizeProgress } from '../services/progressService.js';
import { getXpSummary } from '../services/xpService.js';

export async function history(req, res) {
  const sessions = await getGameHistory(req.user.id, req.validatedQuery);
  res.json({ success: true, data: { sessions } });
}

export async function create(req, res) {
  const result = await createGameSession(req.user.id, req.body.courseId, req.body.gameType);
  res.status(201).json({ success: true, data: result });
}

export async function submitMatch(req, res) {
  const result = await submitMatchPairs(req.user.id, req.params.sessionId, req.body.matches);
  const { goal, unlocked } = await finalizeProgress(req.user.id);
  const xp = await getXpSummary(req.user.id);
  res.json({
    success: true,
    data: {
      ...result,
      goal,
      achievementsUnlocked: unlocked,
      xp,
    },
  });
}

export async function submitTimed(req, res) {
  const result = await submitTimedChallenge(req.user.id, req.params.sessionId, req.body.answers);
  const { goal, unlocked } = await finalizeProgress(req.user.id);
  const xp = await getXpSummary(req.user.id);
  res.json({
    success: true,
    data: {
      ...result,
      goal,
      achievementsUnlocked: unlocked,
      xp,
    },
  });
}
