import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';
import { PUBLIC_USER_SELECT } from '../utils/serializers.js';

export async function registerUser({ name, email, password, timezone }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw ApiError.conflict('An account with that email already exists.');

  const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      timezone: timezone || 'UTC',
    },
    select: PUBLIC_USER_SELECT,
  });

  return user;
}

export async function authenticateUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // A constant-ish response regardless of whether the email exists.
  const hash = user?.passwordHash || '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi';
  const valid = await bcrypt.compare(password, hash).catch(() => false);

  if (!user || !valid) throw ApiError.unauthorized('Email or password is incorrect.');

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Your current password is incorrect.');

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw ApiError.badRequest('Choose a password that is different from your current one.');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function updateProfile(userId, data) {
  const allowed = {
    name: data.name,
    timezone: data.timezone,
    theme: data.theme,
    avatarColor: data.avatarColor,
    dailyGoalXp: data.dailyGoalXp,
    weeklyGoalDays: data.weeklyGoalDays,
    emailNotifications: data.emailNotifications,
  };
  Object.keys(allowed).forEach((key) => allowed[key] === undefined && delete allowed[key]);

  return prisma.user.update({
    where: { id: userId },
    data: allowed,
    select: PUBLIC_USER_SELECT,
  });
}
