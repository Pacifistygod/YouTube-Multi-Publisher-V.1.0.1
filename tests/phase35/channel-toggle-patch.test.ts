import { describe, it, expect, beforeEach } from 'vitest';
import { createApiRouter } from '../../apps/api/src/router';
import { createCampaignsModule } from '../../apps/api/src/campaigns/campaigns.module';
import { AccountsController } from '../../apps/api/src/accounts/accounts.controller';
import { AccountsService } from '../../apps/api/src/accounts/accounts.service';
import type { ChannelStore, ChannelRecord, ConnectedAccountRecord } from '../../apps/api/src/accounts/accounts.service';
import { SessionGuard } from '../../apps/api/src/auth/session.guard';
import { TokenCryptoService } from '../../apps/api/src/common/crypto/token-crypto.service';

const TEST_KEY = '12345678901234567890123456789012';
const authedSession = { adminUser: { email: 'admin@test.com' } };

function makeChannel(overrides: Partial<ChannelRecord> = {}): ChannelRecord {
  return {
    id: 'ch-1',
    connectedAccountId: 'acct-1',
    youtubeChannelId: 'UC123',
    title: 'Test Channel',
    isActive: true,
    lastSyncedAt: new Date().toISOString(),
    ...overrides,
  };
}

class TestChannelStore implements ChannelStore {
  private channels: ChannelRecord[] = [];

  seed(ch: ChannelRecord) {
    this.channels.push(ch);
  }

  upsert(record: ChannelRecord): ChannelRecord {
    const idx = this.channels.findIndex((c) => c.id === record.id);
    if (idx >= 0) {
      Object.assign(this.channels[idx], record);
      return this.channels[idx];
    }
    this.channels.push(record);
    return record;
  }

  findByAccountId(accountId: string): ChannelRecord[] {
    return this.channels.filter((c) => c.connectedAccountId === accountId);
  }

  findById(channelId: string): ChannelRecord | null {
    return this.channels.find((c) => c.id === channelId) ?? null;
  }

  update(channelId: string, updates: Partial<ChannelRecord>): ChannelRecord | null {
    const ch = this.findById(channelId);
    if (!ch) return null;
    Object.assign(ch, updates);
    return ch;
  }

  deactivateAllForAccount(accountId: string): void {
    this.channels.filter((c) => c.connectedAccountId === accountId).forEach((c) => (c.isActive = false));
  }
}

describe('API Router — channel toggle PATCH route', () => {
  let router: ReturnType<typeof createApiRouter>;
  let channelStore: TestChannelStore;

  beforeEach(() => {
    const crypto = new TokenCryptoService({ OAUTH_TOKEN_KEY: TEST_KEY });

    channelStore = new TestChannelStore();
    channelStore.seed(makeChannel());

    const accountsService = new AccountsService({
      tokenCryptoService: crypto,
      channelStore,
      listConnectedAccounts: async () => [],
      getConnectedAccount: async () => null,
    });

    const accountsController = new AccountsController(accountsService, new SessionGuard());

    router = createApiRouter({
      campaignsModule: createCampaignsModule(),
      accountsController,
    });
  });

  it('PATCH /api/accounts/:accountId/channels/:channelId toggles isActive to false', async () => {
    const res = await router.handle({
      method: 'PATCH',
      path: '/api/accounts/acct-1/channels/ch-1',
      session: authedSession,
      body: { isActive: false },
    });

    expect(res.status).toBe(200);
    expect(res.body.channel).toBeDefined();
    expect(res.body.channel.isActive).toBe(false);
  });

  it('PATCH /api/accounts/:accountId/channels/:channelId toggles isActive to true', async () => {
    // Toggle off first, then back on
    await router.handle({
      method: 'PATCH',
      path: '/api/accounts/acct-1/channels/ch-1',
      session: authedSession,
      body: { isActive: false },
    });

    const res = await router.handle({
      method: 'PATCH',
      path: '/api/accounts/acct-1/channels/ch-1',
      session: authedSession,
      body: { isActive: true },
    });

    expect(res.status).toBe(200);
    expect(res.body.channel.isActive).toBe(true);
  });

  it('returns 400 for invalid body', async () => {
    const res = await router.handle({
      method: 'PATCH',
      path: '/api/accounts/acct-1/channels/ch-1',
      session: authedSession,
      body: { invalid: 'data' },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for missing body', async () => {
    const res = await router.handle({
      method: 'PATCH',
      path: '/api/accounts/acct-1/channels/ch-1',
      session: authedSession,
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown channel', async () => {
    const res = await router.handle({
      method: 'PATCH',
      path: '/api/accounts/acct-1/channels/unknown-channel',
      session: authedSession,
      body: { isActive: true },
    });

    expect(res.status).toBe(404);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await router.handle({
      method: 'PATCH',
      path: '/api/accounts/acct-1/channels/ch-1',
      session: null,
      body: { isActive: false },
    });

    expect(res.status).toBe(401);
  });

  it('passes both accountId and channelId as params', async () => {
    const res = await router.handle({
      method: 'PATCH',
      path: '/api/accounts/acct-1/channels/ch-1',
      session: authedSession,
      body: { isActive: false },
    });

    expect(res.status).toBe(200);
    expect(res.body.channel.id).toBe('ch-1');
  });

  it('returns 404 for non-existent route method', async () => {
    const res = await router.handle({
      method: 'PUT',
      path: '/api/accounts/acct-1/channels/ch-1',
      session: authedSession,
      body: { isActive: false },
    });

    expect(res.status).toBe(404);
  });
});
