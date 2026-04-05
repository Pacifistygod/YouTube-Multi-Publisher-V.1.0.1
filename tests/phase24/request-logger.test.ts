import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createRequestLogger,
  type RequestLoggerOptions,
  type LogEntry,
} from '../../apps/api/src/middleware/request-logger';

function createMockReq(overrides: Partial<IncomingMessage> & { socket?: { remoteAddress?: string } } = {}): IncomingMessage {
  return {
    method: 'GET',
    url: '/api/campaigns',
    headers: {},
    socket: overrides.socket ?? { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as IncomingMessage;
}

function createMockRes(): ServerResponse & { _status: number } {
  const res = {
    _status: 200,
    statusCode: 200,
    setHeader() {},
    writeHead(status: number) {
      res._status = status;
      res.statusCode = status;
    },
    end() {},
  } as unknown as ServerResponse & { _status: number };
  return res;
}

describe('Request Logger Middleware', () => {
  let logs: LogEntry[];
  let logger: ReturnType<typeof createRequestLogger>;

  beforeEach(() => {
    logs = [];
    logger = createRequestLogger({
      onLog: (entry) => logs.push(entry),
    });
  });

  it('logs method and path', async () => {
    const req = createMockReq({ method: 'POST', url: '/auth/login' });
    const res = createMockRes();

    await logger(req, res, async () => {
      res.writeHead(200);
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].method).toBe('POST');
    expect(logs[0].path).toBe('/auth/login');
  });

  it('logs status code from response', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await logger(req, res, async () => {
      res.writeHead(201);
    });

    expect(logs[0].status).toBe(201);
  });

  it('logs duration in milliseconds', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await logger(req, res, async () => {
      res.writeHead(200);
    });

    expect(typeof logs[0].durationMs).toBe('number');
    expect(logs[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('logs client IP from socket', async () => {
    const req = createMockReq({
      socket: { remoteAddress: '192.168.1.100' },
    });
    const res = createMockRes();

    await logger(req, res, async () => {});

    expect(logs[0].ip).toBe('192.168.1.100');
  });

  it('logs client IP from x-forwarded-for header', async () => {
    const req = createMockReq({
      headers: { 'x-forwarded-for': '10.0.0.5' } as Record<string, string>,
      socket: { remoteAddress: '127.0.0.1' },
    });
    const res = createMockRes();

    await logger(req, res, async () => {});

    expect(logs[0].ip).toBe('10.0.0.5');
  });

  it('logs timestamp as ISO string', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await logger(req, res, async () => {});

    expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('strips query string from path', async () => {
    const req = createMockReq({ url: '/api/campaigns?page=1&limit=10' });
    const res = createMockRes();

    await logger(req, res, async () => {});

    expect(logs[0].path).toBe('/api/campaigns');
  });

  it('logs even when next() throws', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await logger(req, res, async () => {
      throw new Error('handler error');
    }).catch(() => {});

    expect(logs).toHaveLength(1);
    expect(logs[0].error).toBe('handler error');
  });

  it('re-throws the error after logging', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await expect(
      logger(req, res, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('logs user agent when present', async () => {
    const req = createMockReq({
      headers: { 'user-agent': 'TestClient/1.0' } as Record<string, string>,
    });
    const res = createMockRes();

    await logger(req, res, async () => {});

    expect(logs[0].userAgent).toBe('TestClient/1.0');
  });

  it('handles missing user agent gracefully', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await logger(req, res, async () => {});

    expect(logs[0].userAgent).toBeUndefined();
  });

  it('measures duration accurately with fake timers', async () => {
    vi.useFakeTimers();

    const timedLogger = createRequestLogger({
      onLog: (entry) => logs.push(entry),
    });
    const req = createMockReq();
    const res = createMockRes();

    const promise = timedLogger(req, res, async () => {
      vi.advanceTimersByTime(150);
    });

    await promise;

    expect(logs[0].durationMs).toBeGreaterThanOrEqual(100);

    vi.useRealTimers();
  });
});
