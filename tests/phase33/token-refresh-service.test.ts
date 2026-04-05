import { describe, it, expect, beforeEach } from 'vitest';
import {
  TokenRefreshService,
  type TokenRefreshOptions,
  type RefreshableAccount,
} from '../../apps/api/src/auth/token-refresh.service';

function makeAccount(overrides: Partial<RefreshableAccount> = {}): RefreshableAccount {
  return {
    id: 'acct-1',
    provider: 'google',
    status: 'connected',
    accessTokenEnc: 'enc:access',
    refreshTokenEnc: 'enc:refresh',
    tokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    ...overrides,
  };
}

function expiringSoon(): string {
  return new Date(Date.now() + 2 * 60_000).toISOString(); // 2 min from now
}

function alreadyExpired(): string {
  return new Date(Date.now() - 60_000).toISOString(); // 1 min ago
}

describe('TokenRefreshService', () => {
  let refreshCalls: string[];
  let failIds: Set<string>;
  let service: TokenRefreshService;

  function createService(
    accounts: RefreshableAccount[],
    opts: Partial<TokenRefreshOptions> = {},
  ): TokenRefreshService {
    refreshCalls = [];
    failIds = opts._failIds ?? new Set();

    return new TokenRefreshService({
      listAccounts: async () => accounts,
      refreshToken: async (accountId: string) => {
        refreshCalls.push(accountId);
        if (failIds.has(accountId)) {
          return { refreshed: false, error: 'REAUTH_REQUIRED' as const };
        }
        return {
          refreshed: true,
          newExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        };
      },
      safetyWindowMs: opts.safetyWindowMs ?? 5 * 60_000,
      ...opts,
    });
  }

  it('does nothing when no accounts exist', async () => {
    service = createService([]);
    const result = await service.refreshAll();
    expect(result.checked).toBe(0);
    expect(result.refreshed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('skips accounts that are not expiring soon', async () => {
    const account = makeAccount(); // expires in 1 hour — well outside 5-min window
    service = createService([account]);
    const result = await service.refreshAll();
    expect(result.checked).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.refreshed).toBe(0);
    expect(refreshCalls).toEqual([]);
  });

  it('refreshes accounts expiring within safety window', async () => {
    const account = makeAccount({ tokenExpiresAt: expiringSoon() });
    service = createService([account]);
    const result = await service.refreshAll();
    expect(result.checked).toBe(1);
    expect(result.refreshed).toBe(1);
    expect(refreshCalls).toEqual(['acct-1']);
  });

  it('refreshes already-expired accounts', async () => {
    const account = makeAccount({ tokenExpiresAt: alreadyExpired() });
    service = createService([account]);
    const result = await service.refreshAll();
    expect(result.refreshed).toBe(1);
  });

  it('reports failed refreshes', async () => {
    const account = makeAccount({ id: 'fail-1', tokenExpiresAt: expiringSoon() });
    service = createService([account], { _failIds: new Set(['fail-1']) });
    const result = await service.refreshAll();
    expect(result.failed).toBe(1);
    expect(result.refreshed).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].accountId).toBe('fail-1');
  });

  it('skips disconnected accounts', async () => {
    const account = makeAccount({ status: 'disconnected' });
    service = createService([account]);
    const result = await service.refreshAll();
    expect(result.skipped).toBe(1);
    expect(refreshCalls).toEqual([]);
  });

  it('skips accounts without refresh token', async () => {
    const account = makeAccount({
      refreshTokenEnc: null,
      tokenExpiresAt: expiringSoon(),
    });
    service = createService([account]);
    const result = await service.refreshAll();
    expect(result.skipped).toBe(1);
    expect(refreshCalls).toEqual([]);
  });

  it('skips accounts with no expiration date', async () => {
    const account = makeAccount({ tokenExpiresAt: null });
    service = createService([account]);
    const result = await service.refreshAll();
    expect(result.skipped).toBe(1);
  });

  it('handles mixed batch — some refresh, some skip, some fail', async () => {
    const accounts = [
      makeAccount({ id: 'ok-1', tokenExpiresAt: expiringSoon() }),
      makeAccount({ id: 'skip-1' }), // not expiring soon
      makeAccount({ id: 'fail-1', tokenExpiresAt: alreadyExpired() }),
      makeAccount({ id: 'disc-1', status: 'disconnected', tokenExpiresAt: expiringSoon() }),
    ];
    service = createService(accounts, { _failIds: new Set(['fail-1']) });
    const result = await service.refreshAll();
    expect(result.checked).toBe(4);
    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(2);
  });

  it('refreshes a single account by id', async () => {
    const account = makeAccount({ tokenExpiresAt: expiringSoon() });
    service = createService([account]);
    const result = await service.refreshOne('acct-1');
    expect(result.refreshed).toBe(true);
  });

  it('returns not-found for unknown account', async () => {
    service = createService([]);
    const result = await service.refreshOne('nonexistent');
    expect(result.refreshed).toBe(false);
    expect(result.error).toBe('NOT_FOUND');
  });

  it('uses custom safety window', async () => {
    // Token expires in 2 minutes, safety window is 1 minute — should skip
    const account = makeAccount({ tokenExpiresAt: expiringSoon() });
    service = createService([account], { safetyWindowMs: 60_000 });
    const result = await service.refreshAll();
    expect(result.skipped).toBe(1);
    expect(refreshCalls).toEqual([]);
  });

  it('forces refresh regardless of expiry when force=true', async () => {
    const account = makeAccount(); // not expiring soon
    service = createService([account]);
    const result = await service.refreshOne('acct-1', { force: true });
    expect(result.refreshed).toBe(true);
    expect(refreshCalls).toEqual(['acct-1']);
  });
});
