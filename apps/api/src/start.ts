import { createServer as createHttpServer } from 'node:http';
import { bootstrap, type BootstrapOptions, type BootstrapResult } from './bootstrap';
import { createGracefulShutdown } from './lifecycle/graceful-shutdown';

export interface StartServerOptions {
  env: Record<string, string | undefined>;
  _prismaFactory?: () => any;
  _prismaModule?: {
    PrismaClient: new (options?: unknown) => any;
  };
  allowedOrigins?: string[];
  port?: number;
}

export interface StartServerResult {
  port: number;
  bootstrapResult: BootstrapResult;
  shutdown: () => Promise<void>;
}

export async function startServer(options: StartServerOptions): Promise<StartServerResult> {
  const bootstrapOptions: BootstrapOptions = {
    env: options.env,
    _prismaFactory: options._prismaFactory,
    _prismaModule: options._prismaModule,
    allowedOrigins: options.allowedOrigins,
  };

  const bootstrapResult = bootstrap(bootstrapOptions);

  // Connect database if configured
  await bootstrapResult.databaseProvider.connect();

  const httpServer = createHttpServer((req, res) => {
    bootstrapResult.handler(req, res).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  });

  const requestedPort = options.port ?? parseInt(options.env.PORT ?? '3000', 10);

  const port = await new Promise<number>((resolve, reject) => {
    httpServer.on('error', reject);
    httpServer.listen(requestedPort, () => {
      const addr = httpServer.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : requestedPort;
      resolve(actualPort);
    });
  });

  const gracefulShutdown = createGracefulShutdown({ timeoutMs: 10_000 });

  const handleSignal = async (): Promise<void> => {
    await shutdown();
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  gracefulShutdown.onShutdown(async () => {
    process.removeListener('SIGINT', handleSignal);
    process.removeListener('SIGTERM', handleSignal);

    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });

    await bootstrapResult.databaseProvider.disconnect();
  });

  const shutdown = async (): Promise<void> => {
    await gracefulShutdown.shutdown();
  };

  return { port, bootstrapResult, shutdown };
}
