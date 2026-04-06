import { describe, expect, test } from 'vitest';

import { createServer } from '../../apps/api/src/server';
import { loadEnvConfig, validateEnvConfig } from '../../apps/api/src/config/env.config';

const validEnv: Record<string, string> = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/mydb',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  OAUTH_TOKEN_KEY: 'a]3Fk9$2mP!xL7nQ&vR4wY6zA0cE8gI5',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD_HASH: 'plain:secret123',
  PORT: '3000',
  NODE_ENV: 'test',
};

describe('strict PORT validation', () => {
  test('loadEnvConfig treats partially numeric PORT values as invalid', () => {
    const config = loadEnvConfig({ ...validEnv, PORT: '3000abc' });

    expect(Number.isNaN(config.port)).toBe(true);

    const errors = validateEnvConfig(config);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'PORT', message: expect.stringContaining('valid') }),
    );
  });

  test('createServer rejects decimal PORT strings instead of truncating them', () => {
    expect(() => createServer({ env: { ...validEnv, PORT: '3000.5' } })).toThrow(/environment/i);
  });
});
