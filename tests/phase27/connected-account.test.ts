import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConnectedAccountService,
  InMemoryConnectedAccountRepository,
  type ConnectedAccountRepository,
  type CreateConnectedAccountDto,
  type ConnectedAccount,
} from '../../apps/api/src/accounts/connected-account.service';

function validDto(overrides: Partial<CreateConnectedAccountDto> = {}): CreateConnectedAccountDto {
  return {
    provider: 'google',
    email: 'user@gmail.com',
    displayName: 'Test User',
    accessTokenEnc: 'enc:access-token-123',
    refreshTokenEnc: 'enc:refresh-token-456',
    scopes: ['youtube.upload', 'youtube.readonly'],
    tokenExpiresAt: new Date(Date.now() + 3600_000),
    ...overrides,
  };
}

describe('ConnectedAccountService', () => {
  let repo: ConnectedAccountRepository;
  let service: ConnectedAccountService;

  beforeEach(() => {
    repo = new InMemoryConnectedAccountRepository();
    service = new ConnectedAccountService(repo);
  });

  describe('create', () => {
    it('creates a connected account', async () => {
      const result = await service.create(validDto());

      expect(result.account.id).toBeDefined();
      expect(result.account.provider).toBe('google');
      expect(result.account.email).toBe('user@gmail.com');
      expect(result.account.displayName).toBe('Test User');
      expect(result.account.status).toBe('connected');
    });

    it('stores encrypted tokens', async () => {
      const result = await service.create(validDto());

      expect(result.account.accessTokenEnc).toBe('enc:access-token-123');
      expect(result.account.refreshTokenEnc).toBe('enc:refresh-token-456');
    });

    it('stores scopes array', async () => {
      const result = await service.create(validDto());

      expect(result.account.scopes).toEqual(['youtube.upload', 'youtube.readonly']);
    });

    it('rejects empty provider', async () => {
      await expect(service.create(validDto({ provider: '' }))).rejects.toThrow('provider');
    });

    it('rejects empty access token', async () => {
      await expect(service.create(validDto({ accessTokenEnc: '' }))).rejects.toThrow('accessTokenEnc');
    });

    it('allows null refreshTokenEnc', async () => {
      const result = await service.create(validDto({ refreshTokenEnc: null }));

      expect(result.account.refreshTokenEnc).toBeNull();
    });

    it('allows null email and displayName', async () => {
      const result = await service.create(validDto({ email: null, displayName: null }));

      expect(result.account.email).toBeNull();
      expect(result.account.displayName).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns account by id', async () => {
      const { account } = await service.create(validDto());
      const found = await service.getById(account.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(account.id);
    });

    it('returns null for nonexistent id', async () => {
      const found = await service.getById('nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('list', () => {
    it('returns all accounts', async () => {
      await service.create(validDto());
      await service.create(validDto({ email: 'other@gmail.com' }));

      const accounts = await service.list();

      expect(accounts).toHaveLength(2);
    });

    it('returns empty array when none exist', async () => {
      const accounts = await service.list();

      expect(accounts).toEqual([]);
    });
  });

  describe('updateTokens', () => {
    it('updates access and refresh tokens', async () => {
      const { account } = await service.create(validDto());
      const newExpiry = new Date(Date.now() + 7200_000);

      const updated = await service.updateTokens(account.id, {
        accessTokenEnc: 'enc:new-access',
        refreshTokenEnc: 'enc:new-refresh',
        tokenExpiresAt: newExpiry,
      });

      expect(updated).not.toBeNull();
      expect(updated!.accessTokenEnc).toBe('enc:new-access');
      expect(updated!.refreshTokenEnc).toBe('enc:new-refresh');
      expect(updated!.tokenExpiresAt).toEqual(newExpiry);
    });

    it('returns null for nonexistent id', async () => {
      const result = await service.updateTokens('nonexistent', {
        accessTokenEnc: 'enc:x',
      });

      expect(result).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('sets status to disconnected', async () => {
      const { account } = await service.create(validDto());

      const result = await service.disconnect(account.id);

      expect(result).toBe(true);
      const found = await service.getById(account.id);
      expect(found!.status).toBe('disconnected');
    });

    it('returns false for nonexistent id', async () => {
      const result = await service.disconnect('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('reconnect', () => {
    it('sets status back to connected', async () => {
      const { account } = await service.create(validDto());
      await service.disconnect(account.id);

      const result = await service.reconnect(account.id);

      expect(result).toBe(true);
      const found = await service.getById(account.id);
      expect(found!.status).toBe('connected');
    });
  });

  describe('delete', () => {
    it('deletes an account', async () => {
      const { account } = await service.create(validDto());

      const deleted = await service.delete(account.id);

      expect(deleted).toBe(true);
      expect(await service.getById(account.id)).toBeNull();
    });

    it('returns false for nonexistent id', async () => {
      const deleted = await service.delete('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('listByProvider', () => {
    it('filters by provider', async () => {
      await service.create(validDto({ provider: 'google' }));
      await service.create(validDto({ provider: 'microsoft' }));

      const google = await service.listByProvider('google');

      expect(google).toHaveLength(1);
      expect(google[0].provider).toBe('google');
    });
  });
});

describe('InMemoryConnectedAccountRepository', () => {
  it('generates unique IDs', async () => {
    const repo = new InMemoryConnectedAccountRepository();
    const a1 = await repo.create(validDto());
    const a2 = await repo.create(validDto());

    expect(a1.id).not.toBe(a2.id);
  });

  it('sets connectedAt on creation', async () => {
    const repo = new InMemoryConnectedAccountRepository();
    const account = await repo.create(validDto());

    expect(account.connectedAt).toBeInstanceOf(Date);
  });
});
