export type HealthDatabaseMode = 'prisma' | 'in-memory';

export interface HealthDatabaseStatus {
  configured: boolean;
  connected: boolean;
  mode: HealthDatabaseMode;
}

export interface HealthCheckOptions {
  version?: string;
  nodeEnv?: string;
  getDatabaseStatus?: () => HealthDatabaseStatus;
}

export interface HealthCheckResult {
  status: 'ok';
  uptime: number;
  timestamp: number;
  version: string;
  environment: string;
  database: HealthDatabaseStatus;
}

export interface ReadinessCheckResult {
  status: 'ready' | 'not_ready';
  ready: boolean;
  uptime: number;
  timestamp: number;
  version: string;
  environment: string;
  database: HealthDatabaseStatus;
}

export interface HealthCheckInstance {
  check(): HealthCheckResult;
  ready(): ReadinessCheckResult;
  handleRequest(): { status: number; body: HealthCheckResult };
  handleReadyRequest(): { status: number; body: ReadinessCheckResult };
}

export function createHealthCheck(options: HealthCheckOptions): HealthCheckInstance {
  const version = options.version ?? 'unknown';
  const environment = options.nodeEnv ?? 'development';
  const getDatabaseStatus =
    options.getDatabaseStatus ??
    (() => ({
      configured: false,
      connected: false,
      mode: 'in-memory' as const,
    }));
  const startedAt = Date.now();

  function snapshot() {
    return {
      uptime: (Date.now() - startedAt) / 1000,
      timestamp: Date.now(),
      version,
      environment,
      database: getDatabaseStatus(),
    };
  }

  function check(): HealthCheckResult {
    return {
      status: 'ok',
      ...snapshot(),
    };
  }

  function ready(): ReadinessCheckResult {
    const state = snapshot();
    const isReady = !state.database.configured || state.database.connected;

    return {
      status: isReady ? 'ready' : 'not_ready',
      ready: isReady,
      ...state,
    };
  }

  function handleRequest(): { status: number; body: HealthCheckResult } {
    return { status: 200, body: check() };
  }

  function handleReadyRequest(): { status: number; body: ReadinessCheckResult } {
    const result = ready();
    return { status: result.ready ? 200 : 503, body: result };
  }

  return { check, ready, handleRequest, handleReadyRequest };
}
