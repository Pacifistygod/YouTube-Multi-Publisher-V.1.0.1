export interface RefreshableAccount {
  id: string;
  provider: string;
  status: string;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  tokenExpiresAt: string | null;
}

export interface RefreshTokenCallResult {
  refreshed: boolean;
  newExpiresAt?: string;
  error?: 'REAUTH_REQUIRED';
}

export interface TokenRefreshOptions {
  listAccounts: () => Promise<RefreshableAccount[]>;
  refreshToken: (accountId: string) => Promise<RefreshTokenCallResult>;
  safetyWindowMs?: number;
  /** @internal test helper */
  _failIds?: Set<string>;
}

export interface RefreshAllResult {
  checked: number;
  refreshed: number;
  failed: number;
  skipped: number;
  errors: Array<{ accountId: string; error: string }>;
}

export interface RefreshOneResult {
  refreshed: boolean;
  error?: 'NOT_FOUND' | 'REAUTH_REQUIRED' | 'NO_REFRESH_TOKEN' | 'DISCONNECTED';
  newExpiresAt?: string;
}

export class TokenRefreshService {
  private readonly listAccounts: () => Promise<RefreshableAccount[]>;
  private readonly refreshToken: (accountId: string) => Promise<RefreshTokenCallResult>;
  private readonly safetyWindowMs: number;

  constructor(options: TokenRefreshOptions) {
    this.listAccounts = options.listAccounts;
    this.refreshToken = options.refreshToken;
    this.safetyWindowMs = options.safetyWindowMs ?? 5 * 60_000;
  }

  async refreshAll(): Promise<RefreshAllResult> {
    const accounts = await this.listAccounts();
    const result: RefreshAllResult = {
      checked: accounts.length,
      refreshed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    for (const account of accounts) {
      if (!this.needsRefresh(account)) {
        result.skipped++;
        continue;
      }

      const refreshResult = await this.refreshToken(account.id);
      if (refreshResult.refreshed) {
        result.refreshed++;
      } else {
        result.failed++;
        result.errors.push({
          accountId: account.id,
          error: refreshResult.error ?? 'UNKNOWN',
        });
      }
    }

    return result;
  }

  async refreshOne(
    accountId: string,
    opts?: { force?: boolean },
  ): Promise<RefreshOneResult> {
    const accounts = await this.listAccounts();
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      return { refreshed: false, error: 'NOT_FOUND' };
    }

    if (!opts?.force && !this.needsRefresh(account)) {
      return { refreshed: false };
    }

    if (account.status === 'disconnected') {
      return { refreshed: false, error: 'DISCONNECTED' };
    }

    if (!account.refreshTokenEnc) {
      return { refreshed: false, error: 'NO_REFRESH_TOKEN' };
    }

    const result = await this.refreshToken(accountId);
    if (result.refreshed) {
      return { refreshed: true, newExpiresAt: result.newExpiresAt };
    }

    return { refreshed: false, error: result.error };
  }

  private needsRefresh(account: RefreshableAccount): boolean {
    if (account.status === 'disconnected') return false;
    if (!account.refreshTokenEnc) return false;
    if (!account.tokenExpiresAt) return false;

    const expiresAt = new Date(account.tokenExpiresAt).getTime();
    const now = Date.now();
    return expiresAt - now < this.safetyWindowMs;
  }
}
