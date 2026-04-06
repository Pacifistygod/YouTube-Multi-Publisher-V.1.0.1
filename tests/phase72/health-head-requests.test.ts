import { describe, expect, test } from 'vitest';
import { bootstrap } from '../../apps/api/src/bootstrap';

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

describe('health and readiness HEAD requests', () => {
  test('HEAD /health returns headers and status without a response body', async () => {
    const result = bootstrap({ env: baseEnv });
    const req = createMockRequest('HEAD', '/health');
    const res = createMockResponse();

    await result.handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json');
    expect(res.body).toBe('');
  });

  test('HEAD /ready returns 503 without a response body when the database is not connected', async () => {
    const result = bootstrap({ env: baseEnv });
    const req = createMockRequest('HEAD', '/ready');
    const res = createMockResponse();

    await result.handler(req as any, res as any);

    expect(res.statusCode).toBe(503);
    expect(res.headers['content-type']).toBe('application/json');
    expect(res.body).toBe('');
  });
});

function createMockRequest(method: string, url: string) {
  return {
    method,
    url,
    headers: {},
    socket: {},
    on() {},
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    writeHead(status: number) {
      this.statusCode = status;
      return this;
    },
    end(chunk?: string) {
      if (chunk) {
        this.body += chunk;
      }
    },
  };
}
