import { describe, expect, test, vi } from 'vitest';
import { createDatabaseProvider } from '../../apps/api/src/config/database-provider';

describe('database provider disconnect after queued reconnect', () => {
  test('latest disconnect request wins over a reconnect queued during startup teardown', async () => {
    let resolveInitialConnect: (() => void) | undefined;
    let resolveDisconnect: (() => void) | undefined;
    let markDisconnectStarted: (() => void) | undefined;
    const disconnectStarted = new Promise<void>((resolve) => {
      markDisconnectStarted = resolve;
    });

    const connectFn = vi.fn(() => {
      if (connectFn.mock.calls.length === 1) {
        return new Promise<void>((resolve) => {
          resolveInitialConnect = resolve;
        });
      }

      return Promise.resolve();
    });

    const disconnectFn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDisconnect = resolve;
          markDisconnectStarted?.();
        }),
    );

    const provider = createDatabaseProvider({
      databaseUrl: 'postgresql://localhost:5432/test',
      _prismaFactory: () => ({ $connect: connectFn, $disconnect: disconnectFn }),
    });

    const initialConnectPromise = provider.connect();
    const firstDisconnect = provider.disconnect();
    const reconnectPromise = provider.connect();
    const finalDisconnect = provider.disconnect();

    expect(connectFn).toHaveBeenCalledTimes(1);
    expect(disconnectFn).toHaveBeenCalledTimes(0);

    resolveInitialConnect?.();
    await disconnectStarted;

    expect(disconnectFn).toHaveBeenCalledTimes(1);

    resolveDisconnect?.();
    await Promise.all([initialConnectPromise, firstDisconnect, reconnectPromise, finalDisconnect]);

    expect(connectFn).toHaveBeenCalledTimes(1);
    expect(disconnectFn).toHaveBeenCalledTimes(1);
    expect(provider.isConnected()).toBe(false);
  });

  test('repeated disconnect requests after a queued reconnect still avoid an extra reconnect', async () => {
    let resolveInitialConnect: (() => void) | undefined;
    let resolveDisconnect: (() => void) | undefined;
    let markDisconnectStarted: (() => void) | undefined;
    const disconnectStarted = new Promise<void>((resolve) => {
      markDisconnectStarted = resolve;
    });

    const connectFn = vi.fn(() => {
      if (connectFn.mock.calls.length === 1) {
        return new Promise<void>((resolve) => {
          resolveInitialConnect = resolve;
        });
      }

      return Promise.resolve();
    });

    const disconnectFn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDisconnect = resolve;
          markDisconnectStarted?.();
        }),
    );

    const provider = createDatabaseProvider({
      databaseUrl: 'postgresql://localhost:5432/test',
      _prismaFactory: () => ({ $connect: connectFn, $disconnect: disconnectFn }),
    });

    const initialConnectPromise = provider.connect();
    const firstDisconnect = provider.disconnect();
    const reconnectPromise = provider.connect();
    const finalDisconnectA = provider.disconnect();
    const finalDisconnectB = provider.disconnect();

    resolveInitialConnect?.();
    await disconnectStarted;
    resolveDisconnect?.();

    await Promise.all([
      initialConnectPromise,
      firstDisconnect,
      reconnectPromise,
      finalDisconnectA,
      finalDisconnectB,
    ]);

    expect(connectFn).toHaveBeenCalledTimes(1);
    expect(disconnectFn).toHaveBeenCalledTimes(1);
    expect(provider.isConnected()).toBe(false);
  });
});
