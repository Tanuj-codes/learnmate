import { createOrUpdateTodayGoal, getGoalDashboard, updateGoal } from '../services/goalService.js';

export async function dashboard(req, res) {
  const goals = await getGoalDashboard(req.user.id, { days: req.validatedQuery?.days || 14 });
  res.json({ success: true, data: goals });
}

export async function create(req, res) {
  const goals = await createOrUpdateTodayGoal(req.user.id, req.body.targetXp);
  res.status(201).json({ success: true, data: goals });
}

export async function update(req, res) {
  const goals = await updateGoal(req.user.id, req.params.goalId, req.body.targetXp);
  res.json({ success: true, data: goals });
}
