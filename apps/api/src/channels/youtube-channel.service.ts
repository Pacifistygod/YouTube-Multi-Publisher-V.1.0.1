import { randomUUID } from 'node:crypto';

export interface YouTubeChannel {
  id: string;
  connectedAccountId: string;
  youtubeChannelId: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  lastSyncedAt: Date;
}

export interface CreateYouTubeChannelDto {
  connectedAccountId: string;
  youtubeChannelId: string;
  title: string;
  handle?: string | null;
  thumbnailUrl?: string | null;
}

export interface UpdateSyncDto {
  title?: string;
  handle?: string | null;
  thumbnailUrl?: string | null;
}

export interface YouTubeChannelRepository {
  create(dto: CreateYouTubeChannelDto): Promise<YouTubeChannel>;
  findById(id: string): Promise<YouTubeChannel | null>;
  findByAccountAndChannelId(accountId: string, channelId: string): Promise<YouTubeChannel | null>;
  findByAccount(accountId: string): Promise<YouTubeChannel[]>;
  findActive(): Promise<YouTubeChannel[]>;
  update(id: string, data: Partial<YouTubeChannel>): Promise<YouTubeChannel | null>;
  delete(id: string): Promise<boolean>;
}

function validate(dto: CreateYouTubeChannelDto): void {
  if (!dto.connectedAccountId) {
    throw new Error('connectedAccountId is required');
  }
  if (!dto.youtubeChannelId) {
    throw new Error('youtubeChannelId is required');
  }
  if (!dto.title) {
    throw new Error('title is required');
  }
}

export class YouTubeChannelService {
  constructor(private readonly repo: YouTubeChannelRepository) {}

  async create(dto: CreateYouTubeChannelDto): Promise<{ channel: YouTubeChannel }> {
    validate(dto);

    const existing = await this.repo.findByAccountAndChannelId(dto.connectedAccountId, dto.youtubeChannelId);
    if (existing) {
      throw new Error('Channel already exists for this account');
    }

    const channel = await this.repo.create(dto);
    return { channel };
  }

  async getById(id: string): Promise<YouTubeChannel | null> {
    return this.repo.findById(id);
  }

  async listByAccount(accountId: string): Promise<YouTubeChannel[]> {
    return this.repo.findByAccount(accountId);
  }

  async listActive(): Promise<YouTubeChannel[]> {
    return this.repo.findActive();
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await this.repo.update(id, { isActive: false });
    return result !== null;
  }

  async activate(id: string): Promise<boolean> {
    const result = await this.repo.update(id, { isActive: true });
    return result !== null;
  }

  async updateSync(id: string, data: UpdateSyncDto): Promise<YouTubeChannel | null> {
    return this.repo.update(id, { ...data, lastSyncedAt: new Date() });
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}

export class InMemoryYouTubeChannelRepository implements YouTubeChannelRepository {
  private channels = new Map<string, YouTubeChannel>();

  async create(dto: CreateYouTubeChannelDto): Promise<YouTubeChannel> {
    const channel: YouTubeChannel = {
      id: randomUUID(),
      connectedAccountId: dto.connectedAccountId,
      youtubeChannelId: dto.youtubeChannelId,
      title: dto.title,
      handle: dto.handle ?? null,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      isActive: true,
      lastSyncedAt: new Date(),
    };
    this.channels.set(channel.id, channel);
    return { ...channel };
  }

  async findById(id: string): Promise<YouTubeChannel | null> {
    const ch = this.channels.get(id);
    return ch ? { ...ch } : null;
  }

  async findByAccountAndChannelId(accountId: string, channelId: string): Promise<YouTubeChannel | null> {
    for (const ch of this.channels.values()) {
      if (ch.connectedAccountId === accountId && ch.youtubeChannelId === channelId) {
        return { ...ch };
      }
    }
    return null;
  }

  async findByAccount(accountId: string): Promise<YouTubeChannel[]> {
    return [...this.channels.values()]
      .filter((ch) => ch.connectedAccountId === accountId)
      .map((ch) => ({ ...ch }));
  }

  async findActive(): Promise<YouTubeChannel[]> {
    return [...this.channels.values()]
      .filter((ch) => ch.isActive)
      .map((ch) => ({ ...ch }));
  }

  async update(id: string, data: Partial<YouTubeChannel>): Promise<YouTubeChannel | null> {
    const ch = this.channels.get(id);
    if (!ch) return null;
    Object.assign(ch, data);
    return { ...ch };
  }

  async delete(id: string): Promise<boolean> {
    return this.channels.delete(id);
  }
}
