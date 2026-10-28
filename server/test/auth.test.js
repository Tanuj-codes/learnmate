import { describe, expect, it } from 'vitest';
import { api, registerUser } from './helpers.js';

describe('authentication and access control', () => {
  it('registers a learner, returns cookies, and rejects duplicate emails', async () => {
    const agent = api();
    const { res, csrf, email } = await registerUser(agent);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe('STUDENT');
    expect(csrf).toBeTruthy();

    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toContain('lm_token=');
    expect(cookies).toContain('lm_csrf=');
    expect(cookies.toLowerCase()).toContain('httponly');

    const duplicate = await api().post('/api/v1/auth/register').send({
      name: 'Another Learner',
      email,
      password: 'Passw0rd!',
      timezone: 'UTC',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('rejects bad credentials, missing CSRF tokens, and unauthenticated requests', async () => {
    const agent = api();
    const { csrf, email } = await registerUser(agent);

    const wrongPassword = await api().post('/api/v1/auth/login').send({
      email,
      password: 'WrongPassw0rd!',
    });
    expect(wrongPassword.status).toBe(401);

    const missingCsrf = await agent.post('/api/v1/users/me/password').send({
      currentPassword: 'Passw0rd!',
      newPassword: 'NewPassw0rd!',
    });
    expect(missingCsrf.status).toBe(403);
    expect(missingCsrf.body.error.code).toBe('CSRF_MISSING');

    const mismatchedCsrf = await agent
      .post('/api/v1/users/me/password')
      .set('x-csrf-token', 'not-the-signed-cookie-value')
      .send({ currentPassword: 'Passw0rd!', newPassword: 'NewPassw0rd!' });
    expect(mismatchedCsrf.status).toBe(403);
    expect(mismatchedCsrf.body.error.code).toBe('CSRF_INVALID');

    const validCsrf = await agent
      .post('/api/v1/users/me/password')
      .set('x-csrf-token', csrf)
      .send({ currentPassword: 'Passw0rd!', newPassword: 'NewPassw0rd!' });
    expect(validCsrf.status).toBe(200);

    const anonymous = await api().get('/api/v1/dashboard');
    expect(anonymous.status).toBe(401);
  });

  it('enforces RBAC on admin endpoints', async () => {
    const agent = api();
    await registerUser(agent);

    const forbidden = await agent.get('/api/v1/admin/stats');
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(200);
    const afterLogout = await agent.get('/api/v1/auth/me');
    expect(afterLogout.status).toBe(401);
  });
});
