import { describe, it, expect, vi } from 'vitest';
import { createDatabaseProvider } from '../../apps/api/src/config/database-provider';
import { createApp } from '../../apps/api/src/app';
import { bootstrap } from '../../apps/api/src/bootstrap';
import { InMemoryCampaignRepository } from '../../apps/api/src/campaigns/campaign.service';

describe('Database Provider', () => {
  it('creates a provider from DATABASE_URL', () => {
    const provider = createDatabaseProvider({ databaseUrl: 'postgresql://localhost:5432/test' });
    expect(provider).toBeDefined();
    expect(provider.isConnected()).toBe(false);
  });

  it('returns null repository when no DATABASE_URL', () => {
    const provider = createDatabaseProvider({});
    expect(provider.campaignRepository).toBeNull();
  });

  it('exposes a campaign repository when DATABASE_URL is set', () => {
    const provider = createDatabaseProvider({ databaseUrl: 'postgresql://localhost:5432/test' });
    expect(provider.campaignRepository).toBeDefined();
  });

  it('connect sets isConnected to true', async () => {
    const provider = createDatabaseProvider({
      databaseUrl: 'postgresql://localhost:5432/test',
      _prismaFactory: () => ({ $connect: vi.fn(), $disconnect: vi.fn() }),
    });
    await provider.connect();
    expect(provider.isConnected()).toBe(true);
  });

  it('disconnect sets isConnected to false', async () => {
    const mockPrisma = { $connect: vi.fn(), $disconnect: vi.fn() };
    const provider = createDatabaseProvider({
      databaseUrl: 'postgresql://localhost:5432/test',
      _prismaFactory: () => mockPrisma,
    });
    await provider.connect();
    await provider.disconnect();
    expect(provider.isConnected()).toBe(false);
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });

  it('disconnect is safe to call when not connected', async () => {
    const provider = createDatabaseProvider({});
    await expect(provider.disconnect()).resolves.toBeUndefined();
  });
});

describe('App with repository injection', () => {
  it('uses injected repository in campaigns module', () => {
    const repository = new InMemoryCampaignRepository();
    const app = createApp({ campaignsModuleOptions: { repository } });

    // Create via the app's campaignService, verify it uses our repo
    app.campaignsModule.campaignService.createCampaign({ title: 'Test', videoAssetId: 'v-1' });
    const result = repository.findAllNewestFirst();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test');
  });

  it('defaults to in-memory when no repository provided', () => {
    const app = createApp();
    app.campaignsModule.campaignService.createCampaign({ title: 'Default', videoAssetId: 'v-1' });
    const { campaigns } = app.campaignsModule.campaignService.listCampaigns();
    expect(campaigns).toHaveLength(1);
  });
});

describe('Bootstrap database wiring', () => {
  it('returns databaseProvider in bootstrap result', () => {
    const result = bootstrap({
      env: {
        OAUTH_TOKEN_KEY: 'test-key-minimum-32-chars-long-xxx',
        NODE_ENV: 'development',
      },
    });
    expect(result.databaseProvider).toBeDefined();
  });

  it('creates database provider when DATABASE_URL is set', () => {
    const result = bootstrap({
      env: {
        OAUTH_TOKEN_KEY: 'test-key-minimum-32-chars-long-xxx',
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/test',
      },
    });
    expect(result.databaseProvider.campaignRepository).toBeDefined();
  });

  it('has null campaign repository when DATABASE_URL is absent', () => {
    const result = bootstrap({
      env: {
        OAUTH_TOKEN_KEY: 'test-key-minimum-32-chars-long-xxx',
        NODE_ENV: 'development',
      },
    });
    expect(result.databaseProvider.campaignRepository).toBeNull();
  });
});
