import { afterEach, describe, expect, test, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createErrorHandler } from '../../apps/api/src/middleware/error-handler';

function createMockReq(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return { method: 'GET', url: '/', headers: {}, ...overrides } as IncomingMessage;
}

function createStartedResponse() {
  let headersSentValue = true;
  let writableEndedValue = false;

  return {
    _status: 200,
    _headers: {} as Record<string, string>,
    _body: 'partial',
    _endCalls: 0,
    get headersSent() {
      return headersSentValue;
    },
    get writableEnded() {
      return writableEndedValue;
    },
    setHeader(name: string, value: string) {
      this._headers[name.toLowerCase()] = value;
    },
    writeHead(status: number) {
      this._status = status;
    },
    end(body?: string) {
      this._endCalls += 1;
      if (body) this._body += body;
      writableEndedValue = true;
    },
  } as unknown as ServerResponse & {
    _status: number;
    _headers: Record<string, string>;
    _body: string;
    _endCalls: number;
    headersSent: boolean;
    writableEnded: boolean;
  };
}

describe('partial response error safety', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  test('createErrorHandler does not overwrite a response whose headers are already sent', async () => {
    const handler = createErrorHandler({ nodeEnv: 'production' });
    const req = createMockReq();
    const res = createStartedResponse();
    const setHeaderSpy = vi.spyOn(res, 'setHeader');
    const writeHeadSpy = vi.spyOn(res, 'writeHead');

    await handler(req, res, async () => {
      throw new Error('late failure');
    });

    expect(setHeaderSpy).not.toHaveBeenCalled();
    expect(writeHeadSpy).not.toHaveBeenCalled();
    expect(res._status).toBe(200);
    expect(res._body).toBe('partial');
    expect(res._endCalls).toBe(1);
  });

  test('createErrorHandler is a no-op when the response is already fully ended', async () => {
    const handler = createErrorHandler({ nodeEnv: 'production' });
    const req = createMockReq();
    const res = createStartedResponse();
    Object.defineProperty(res, 'writableEnded', { value: true, configurable: true });
    const endSpy = vi.spyOn(res, 'end');

    await handler(req, res, async () => {
      throw new Error('too late');
    });

    expect(endSpy).not.toHaveBeenCalled();
    expect(res._body).toBe('partial');
  });

  test('startServer fallback does not append JSON after a partial response has already started', async () => {
    vi.doMock('../../apps/api/src/bootstrap', () => ({
      bootstrap: () => ({
        handler: async (_req: IncomingMessage, res: ServerResponse) => {
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.write('partial');
          throw new Error('stream failure');
        },
        databaseProvider: {
          connect: vi.fn().mockResolvedValue(undefined),
          disconnect: vi.fn().mockResolvedValue(undefined),
        },
        server: { config: { nodeEnv: 'test' } },
        sessionStore: {},
        healthCheck: {},
      }),
    }));

    const { startServer } = await import('../../apps/api/src/start');
    const instance = await startServer({ env: { NODE_ENV: 'test' }, port: 0 } as any);

    const response = await fetch(`http://127.0.0.1:${instance.port}/`);
    const body = await response.text();
    await instance.shutdown();

    expect(body).toBe('partial');
  });
});
