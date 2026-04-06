import { afterEach, describe, expect, test, vi } from 'vitest';

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

describe('startServer signal shutdown wiring', () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
    vi.restoreAllMocks();
  });

  test('registers SIGINT and SIGTERM handlers on startup', async () => {
    const { startServer } = await import('../../apps/api/src/start');
    const onSpy = vi.spyOn(process, 'on');

    const instance = await startServer({ env: baseEnv, port: 0 });
    cleanup = instance.shutdown;

    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });

  test('signal handler triggers shutdown and disconnects database only once', async () => {
    const { startServer } = await import('../../apps/api/src/start');
    const handlers = new Map<string, () => void | Promise<void>>();

    vi.spyOn(process, 'on').mockImplementation(((event: string, handler: () => void | Promise<void>) => {
      handlers.set(event, handler);
      return process;
    }) as any);

    const disconnectFn = vi.fn().mockResolvedValue(undefined);
    const fakePrisma = {
      $connect: vi.fn().mockResolvedValue(undefined),
      $disconnect: disconnectFn,
      campaign: { create: vi.fn(async ({ data }: any) => data), findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []), update: vi.fn(async () => null), delete: vi.fn(async () => null) },
      campaignTarget: { create: vi.fn(async ({ data }: any) => data), delete: vi.fn(async () => null), update: vi.fn(async () => null) },
      publishJob: { create: vi.fn(async ({ data }: any) => data), findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []), update: vi.fn(async () => null), delete: vi.fn(async () => null) },
      connectedAccount: { create: vi.fn(async ({ data }: any) => data), findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []), update: vi.fn(async () => null), delete: vi.fn(async () => null) },
      youTubeChannel: { create: vi.fn(async ({ data }: any) => data), findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => null), findMany: vi.fn(async () => []), update: vi.fn(async () => null), delete: vi.fn(async () => null) },
      mediaAsset: { create: vi.fn(async ({ data }: any) => data), findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []), update: vi.fn(async () => null), delete: vi.fn(async () => null) },
    };

    const instance = await startServer({
      env: baseEnv,
      port: 0,
      _prismaFactory: () => fakePrisma,
    });

    await handlers.get('SIGTERM')?.();
    await handlers.get('SIGTERM')?.();
    cleanup = null;

    expect(disconnectFn).toHaveBeenCalledTimes(1);
    await expect(fetch(`http://127.0.0.1:${instance.port}/health`)).rejects.toThrow();
  });

  test('manual shutdown removes signal listeners', async () => {
    const { startServer } = await import('../../apps/api/src/start');
    const removeListenerSpy = vi.spyOn(process, 'removeListener');

    const instance = await startServer({ env: baseEnv, port: 0 });
    await instance.shutdown();

    expect(removeListenerSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });
});
