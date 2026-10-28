/** Fields safe to send to the client. passwordHash is never selected here. */
export const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarColor: true,
  timezone: true,
  theme: true,
  dailyGoalXp: true,
  weeklyGoalDays: true,
  emailNotifications: true,
  createdAt: true,
  updatedAt: true,
};

export const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  avatarColor: true,
};

export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
