export interface GracefulShutdownOptions {
  timeoutMs: number;
}

export interface ShutdownResult {
  success: boolean;
  errors: Error[];
  timedOut: boolean;
  elapsedMs: number;
}

type CleanupHandler = () => void | Promise<void>;

export interface GracefulShutdownInstance {
  isShuttingDown(): boolean;
  onShutdown(handler: CleanupHandler): void;
  shutdown(): Promise<ShutdownResult>;
}

export function createGracefulShutdown(
  options: GracefulShutdownOptions,
): GracefulShutdownInstance {
  const { timeoutMs } = options;
  const handlers: CleanupHandler[] = [];
  let shuttingDown = false;
  let shutdownPromise: Promise<ShutdownResult> | null = null;

  function isShuttingDown(): boolean {
    return shuttingDown;
  }

  function onShutdown(handler: CleanupHandler): void {
    if (shuttingDown) return;
    handlers.push(handler);
  }

  function shutdown(): Promise<ShutdownResult> {
    if (shutdownPromise) return shutdownPromise;

    shuttingDown = true;
    const startTime = Date.now();

    shutdownPromise = new Promise<ShutdownResult>((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          errors: [],
          timedOut: true,
          elapsedMs: Date.now() - startTime,
        });
      }, timeoutMs);

      // Clear the timer ref so it doesn't hold the process
      if (typeof timer === 'object' && 'unref' in timer) {
        timer.unref();
      }

      runHandlers().then((errors) => {
        clearTimeout(timer);
        resolve({
          success: errors.length === 0,
          errors,
          timedOut: false,
          elapsedMs: Date.now() - startTime,
        });
      });
    });

    return shutdownPromise;
  }

  async function runHandlers(): Promise<Error[]> {
    const errors: Error[] = [];

    for (const handler of handlers) {
      try {
        await handler();
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }

    return errors;
  }

  return { isShuttingDown, onShutdown, shutdown };
}
