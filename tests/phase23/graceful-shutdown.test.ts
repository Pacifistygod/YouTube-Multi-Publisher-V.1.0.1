import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGracefulShutdown,
  type GracefulShutdownOptions,
  type GracefulShutdownInstance,
} from '../../apps/api/src/lifecycle/graceful-shutdown';

describe('Graceful Shutdown', () => {
  let instance: GracefulShutdownInstance;

  beforeEach(() => {
    instance = createGracefulShutdown({ timeoutMs: 5000 });
  });

  it('starts in not-shutting-down state', () => {
    expect(instance.isShuttingDown()).toBe(false);
  });

  it('transitions to shutting down when shutdown is called', async () => {
    const promise = instance.shutdown();
    expect(instance.isShuttingDown()).toBe(true);
    await promise;
  });

  it('runs registered cleanup handlers on shutdown', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    instance.onShutdown(handler);

    await instance.shutdown();

    expect(handler).toHaveBeenCalledOnce();
  });

  it('runs multiple cleanup handlers in registration order', async () => {
    const order: number[] = [];
    instance.onShutdown(async () => { order.push(1); });
    instance.onShutdown(async () => { order.push(2); });
    instance.onShutdown(async () => { order.push(3); });

    await instance.shutdown();

    expect(order).toEqual([1, 2, 3]);
  });

  it('resolves even if a cleanup handler throws', async () => {
    instance.onShutdown(async () => {
      throw new Error('cleanup failed');
    });

    // Should not throw — resolves with result containing errors
    const result = await instance.shutdown();
    expect(result).toBeDefined();
    expect(result.errors).toHaveLength(1);
  });

  it('collects errors from failed cleanup handlers', async () => {
    instance.onShutdown(async () => {
      throw new Error('handler 1 failed');
    });
    instance.onShutdown(async () => { /* succeeds */ });

    const result = await instance.shutdown();

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('handler 1 failed');
  });

  it('reports success when all handlers complete', async () => {
    instance.onShutdown(async () => { /* ok */ });

    const result = await instance.shutdown();

    expect(result.errors).toHaveLength(0);
    expect(result.success).toBe(true);
  });

  it('prevents double shutdown — second call returns same result', async () => {
    instance.onShutdown(async () => { /* ok */ });

    const result1 = instance.shutdown();
    const result2 = instance.shutdown();

    expect(await result1).toBe(await result2);
  });

  it('times out if cleanup handlers hang', async () => {
    vi.useFakeTimers();

    const shortTimeout = createGracefulShutdown({ timeoutMs: 100 });
    shortTimeout.onShutdown(() => new Promise(() => {
      // Never resolves
    }));

    const shutdownPromise = shortTimeout.shutdown();

    vi.advanceTimersByTime(150);

    const result = await shutdownPromise;
    expect(result.timedOut).toBe(true);

    vi.useRealTimers();
  });

  it('returns elapsed time for shutdown', async () => {
    instance.onShutdown(async () => { /* fast */ });

    const result = await instance.shutdown();

    expect(typeof result.elapsedMs).toBe('number');
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('does not accept new handlers after shutdown starts', async () => {
    const promise = instance.shutdown();

    // Adding after shutdown started — should be ignored
    const lateHandler = vi.fn();
    instance.onShutdown(lateHandler);

    await promise;

    expect(lateHandler).not.toHaveBeenCalled();
  });

  it('supports synchronous cleanup handlers', async () => {
    const called = vi.fn();
    instance.onShutdown(() => { called(); });

    await instance.shutdown();

    expect(called).toHaveBeenCalledOnce();
  });
});
