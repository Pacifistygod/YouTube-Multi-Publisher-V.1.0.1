import { TokenCryptoService } from '../common/crypto/token-crypto.service';

export interface ConnectedAccountPersistenceInput {
  provider: string;
  email?: string;
  accessToken: string;
  refreshToken?: string;
  scopes?: string[];
}

export interface ConnectedAccountRecord {
  provider: string;
  email?: string;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  scopes: string[];
  status: 'connected';
}

export class AccountsService {
  constructor(private readonly tokenCryptoService: TokenCryptoService) {}

  createPersistenceRecord(input: ConnectedAccountPersistenceInput): ConnectedAccountRecord {
    return {
      provider: input.provider,
      email: input.email,
      accessTokenEnc: this.tokenCryptoService.encrypt(input.accessToken),
      refreshTokenEnc: input.refreshToken ? this.tokenCryptoService.encrypt(input.refreshToken) : null,
      scopes: input.scopes ?? [],
      status: 'connected',
    };
  }

  readPersistedTokens(record: Pick<ConnectedAccountRecord, 'accessTokenEnc' | 'refreshTokenEnc'>): {
    accessToken: string;
    refreshToken?: string;
  } {
    return {
      accessToken: this.tokenCryptoService.decrypt(record.accessTokenEnc),
      refreshToken: record.refreshTokenEnc ? this.tokenCryptoService.decrypt(record.refreshTokenEnc) : undefined,
    };
  }
}
