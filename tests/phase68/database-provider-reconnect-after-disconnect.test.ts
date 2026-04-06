import { describe, expect, test, vi } from 'vitest';
import { createDatabaseProvider } from '../../apps/api/src/config/database-provider';

describe('database provider reconnect during disconnect', () => {
  test('connect waits for an in-flight disconnect and then reconnects', async () => {
    let resolveDisconnect: (() => void) | undefined;
    const connectFn = vi.fn().mockResolvedValue(undefined);
    const disconnectFn = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveDisconnect = resolve;
      }),
    );

    const provider = createDatabaseProvider({
      databaseUrl: 'postgresql://localhost:5432/test',
      _prismaFactory: () => ({ $connect: connectFn, $disconnect: disconnectFn }),
    });

    await provider.connect();
    const disconnectPromise = provider.disconnect();
    const reconnectPromise = provider.connect();

    expect(connectFn).toHaveBeenCalledTimes(1);
    expect(disconnectFn).toHaveBeenCalledTimes(1);

    resolveDisconnect?.();
    await Promise.all([disconnectPromise, reconnectPromise]);

    expect(connectFn).toHaveBeenCalledTimes(2);
    expect(provider.isConnected()).toBe(true);
  });

  test('multiple reconnect calls during one disconnect share the same reconnect attempt', async () => {
    let resolveDisconnect: (() => void) | undefined;
    const connectFn = vi.fn().mockResolvedValue(undefined);
    const disconnectFn = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveDisconnect = resolve;
      }),
    );

    const provider = createDatabaseProvider({
      databaseUrl: 'postgresql://localhost:5432/test',
      _prismaFactory: () => ({ $connect: connectFn, $disconnect: disconnectFn }),
    });

    await provider.connect();
    const disconnectPromise = provider.disconnect();
    const reconnectA = provider.connect();
    const reconnectB = provider.connect();

    resolveDisconnect?.();
    await Promise.all([disconnectPromise, reconnectA, reconnectB]);

    expect(connectFn).toHaveBeenCalledTimes(2);
    expect(provider.isConnected()).toBe(true);
  });
});
