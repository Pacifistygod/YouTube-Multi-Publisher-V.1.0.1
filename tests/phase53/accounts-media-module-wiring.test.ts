import { describe, expect, test, vi } from 'vitest';

const baseEnv: Record<string, string> = {
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-32-chars-min!!',
  OAUTH_TOKEN_KEY: '12345678901234567890123456789012',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3000/callback',
  DATABASE_URL: 'postgresql://localhost/test',
  ADMIN_EMAIL: 'admin@test.com',
  ADMIN_PASSWORD_HASH: '$2b$10$fakehash',
};

// ── App creates and exposes AccountsModule ───────────────────────────────────

describe('createApp wires AccountsModule', () => {
  test('app instance exposes accountsModule', async () => {
    const { createApp } = await import('../../apps/api/src/app');
    const app = createApp({ env: baseEnv });

    expect(app.accountsModule).toBeDefined();
    expect(app.accountsModule.accountsController).toBeDefined();
    expect(app.accountsModule.accountsService).toBeDefined();
  });

  test('app instance exposes mediaModule', async () => {
    const { createApp } = await import('../../apps/api/src/app');
    const app = createApp({ env: baseEnv });

    expect(app.mediaModule).toBeDefined();
    expect(app.mediaModule.mediaController).toBeDefined();
    expect(app.mediaModule.mediaService).toBeDefined();
  });
});

// ── Router receives accountsController → accounts routes respond ─────────────

describe('accounts routes are wired through router', () => {
  test('GET /api/accounts returns 401 without session', async () => {
    const { createApp } = await import('../../apps/api/src/app');
    const app = createApp({ env: baseEnv });

    const result = await app.handleRequest({
      method: 'GET',
      path: '/api/accounts',
      session: null,
    });

    expect(result.status).toBe(401);
  });

  test('GET /api/accounts returns 200 with valid session', async () => {
    const { createApp } = await import('../../apps/api/src/app');
    const app = createApp({ env: baseEnv });

    const result = await app.handleRequest({
      method: 'GET',
      path: '/api/accounts',
      session: { adminUser: { email: 'admin@test.com' } },
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('accounts');
  });

  test('GET /api/accounts/:accountId returns 404 for unknown account', async () => {
    const { createApp } = await import('../../apps/api/src/app');
    const app = createApp({ env: baseEnv });

    const result = await app.handleRequest({
      method: 'GET',
      path: '/api/accounts/nonexistent-id',
      session: { adminUser: { email: 'admin@test.com' } },
    });

    expect(result.status).toBe(404);
  });

  test('DELETE /api/accounts/:accountId requires confirmation body', async () => {
    const { createApp } = await import('../../apps/api/src/app');
    const app = createApp({ env: baseEnv });

    const result = await app.handleRequest({
      method: 'DELETE',
      path: '/api/accounts/acct-1',
      session: { adminUser: { email: 'admin@test.com' } },
      body: {},
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/confirm/i);
  });
});

// ── Bootstrap passes repos through to app modules ────────────────────────────

describe('bootstrap wires account + media repos to app modules', () => {
  test('bootstrap result server has accountsModule on app', async () => {
    const { bootstrap } = await import('../../apps/api/src/bootstrap');

    const result = bootstrap({ env: baseEnv });

    expect(result.server.app.accountsModule).toBeDefined();
    expect(result.server.app.accountsModule.accountsController).toBeDefined();
  });

  test('bootstrap result server has mediaModule on app', async () => {
    const { bootstrap } = await import('../../apps/api/src/bootstrap');

    const result = bootstrap({ env: baseEnv });

    expect(result.server.app.mediaModule).toBeDefined();
    expect(result.server.app.mediaModule.mediaController).toBeDefined();
  });
});
