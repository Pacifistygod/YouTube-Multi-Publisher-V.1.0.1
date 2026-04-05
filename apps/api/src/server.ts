import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp, type AppInstance } from './app';
import { createRequestHandler } from './http-adapter';
import { loadEnvConfig, validateEnvConfig, type EnvConfig } from './config/env.config';
import type { AdminSession } from './auth/session.guard';

export interface ServerConfig extends EnvConfig {}

export interface ServerOptions {
  env: Record<string, string | undefined>;
  sessionResolver?: (cookieHeader: string | undefined) => AdminSession | null;
}

export interface ServerInstance {
  app: AppInstance;
  config: ServerConfig;
  requestHandler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

export function createServer(options: ServerOptions): ServerInstance {
  const config = loadEnvConfig(options.env);
  const errors = validateEnvConfig(config);

  if (errors.length > 0) {
    const messages = errors.map((e) => `  ${e.field}: ${e.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${messages}`);
  }

  const app = createApp({ env: options.env });

  const requestHandler = createRequestHandler({
    app,
    sessionResolver: options.sessionResolver,
  });

  return { app, config, requestHandler };
}
