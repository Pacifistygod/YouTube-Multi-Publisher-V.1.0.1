import { describe, expect, test, vi } from 'vitest';

import {
  createServer,
  type ServerConfig,
  type ServerInstance,
} from '../../apps/api/src/server';

const validEnv: Record<string, string> = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/mydb',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  OAUTH_TOKEN_KEY: 'a]3Fk9$2mP!xL7nQ&vR4wY6zA0cE8gI5',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD_HASH: 'plain:secret123',
  PORT: '4000',
  NODE_ENV: 'test',
};

describe('Server entrypoint — createServer', () => {
  test('returns a ServerInstance with app, config, and requestHandler', () => {
    const server = createServer({ env: validEnv });

    expect(server.app).toBeDefined();
    expect(server.config).toBeDefined();
    expect(server.requestHandler).toBeTypeOf('function');
  });

  test('loads and exposes the env config', () => {
    const server = createServer({ env: validEnv });

    expect(server.config.port).toBe(4000);
    expect(server.config.nodeEnv).toBe('test');
    expect(server.config.databaseUrl).toBe('postgresql://user:pass@localhost:5432/mydb');
  });

  test('passes env to app for auth module', async () => {
    const server = createServer({ env: validEnv });

    // Verify auth works by attempting a login
    const res = await server.app.handleRequest({
      method: 'POST',
      path: '/auth/login',
      session: null,
      body: { email: 'admin@example.com', password: 'secret123' },
    });

    expect(res.status).toBe(200);
  });

  test('throws on invalid env config', () => {
    const badEnv = { PORT: '4000' }; // missing everything required

    expect(() => createServer({ env: badEnv })).toThrow(/environment/i);
  });

  test('requestHandler processes HTTP-like requests through the app', async () => {
    const server = createServer({ env: validEnv });

    // Simulate a GET /api/campaigns through the request handler
    const req = createMockReq({ method: 'GET', url: '/api/campaigns' });
    const res = createMockRes();

    await server.requestHandler(req as any, res as any);

    // Should fail auth (401) since no session resolver wired
    // but should not crash — request goes through the pipeline
    expect(res._status).toBeGreaterThanOrEqual(200);
    expect(res._body).toBeTruthy();
  });

  test('uses custom sessionResolver when provided', async () => {
    const session = { adminUser: { email: 'admin@example.com' } };
    const sessionResolver = vi.fn().mockReturnValue(session);
    const server = createServer({ env: validEnv, sessionResolver });

    const req = createMockReq({ method: 'GET', url: '/api/campaigns' });
    const res = createMockRes();

    await server.requestHandler(req as any, res as any);

    expect(sessionResolver).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  test('defaults PORT to 3000 when not in env', () => {
    const env = { ...validEnv };
    delete (env as any).PORT;

    const server = createServer({ env });

    expect(server.config.port).toBe(3000);
  });

  test('exposes app modules for external wiring', () => {
    const server = createServer({ env: validEnv });

    expect(server.app.authModule).toBeDefined();
    expect(server.app.campaignsModule).toBeDefined();
    expect(server.app.router).toBeDefined();
  });
});

// --- Test helpers ---

function createMockReq(overrides: { method?: string; url?: string; headers?: Record<string, string> } = {}) {
  const req: any = {
    method: overrides.method ?? 'GET',
    url: overrides.url ?? '/',
    headers: overrides.headers ?? {},
    on(event: string, cb: Function) {
      if (event === 'end') cb();
      return req;
    },
  };
  return req;
}

function createMockRes() {
  const res: any = {
    _status: 0,
    _headers: {} as Record<string, string | string[]>,
    _body: '',
    writeHead(status: number, headers?: Record<string, string | string[]>) {
      res._status = status;
      if (headers) Object.assign(res._headers, headers);
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      res._headers[name.toLowerCase()] = value;
      return res;
    },
    end(body?: string) {
      if (body) res._body = body;
    },
  };
  return res;
}
