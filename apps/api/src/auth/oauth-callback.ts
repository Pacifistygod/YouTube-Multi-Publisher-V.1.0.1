export interface TokenExchangeRequest {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface AccountStoreData {
  accessToken: string;
  encryptedRefreshToken: string;
  expiresIn: number;
}

export type TokenExchangeFn = (req: TokenExchangeRequest) => Promise<TokenExchangeResponse>;
export type AccountStoreFn = (data: AccountStoreData) => Promise<void>;

export interface OAuthCallbackOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  exchangeToken: TokenExchangeFn;
  storeAccount: AccountStoreFn;
  encryptToken: (token: string) => string;
}

export type OAuthCallbackResult =
  | { ok: true; accessToken: string; expiresIn: number; scope?: string }
  | { ok: false; error: string };

export interface OAuthCallbackInstance {
  handle(params: { code: string }): Promise<OAuthCallbackResult>;
  handleRequest(params: { code: string }): Promise<{ status: number; body: OAuthCallbackResult }>;
}

export function createOAuthCallbackHandler(
  options: OAuthCallbackOptions,
): OAuthCallbackInstance {
  const { clientId, clientSecret, redirectUri, exchangeToken, storeAccount, encryptToken } = options;

  async function handle(params: { code: string }): Promise<OAuthCallbackResult> {
    if (!params.code) {
      return { ok: false, error: 'Missing authorization code' };
    }

    let tokenResponse: TokenExchangeResponse;
    try {
      tokenResponse = await exchangeToken({
        code: params.code,
        clientId,
        clientSecret,
        redirectUri,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }

    if (tokenResponse.refresh_token) {
      const encrypted = encryptToken(tokenResponse.refresh_token);
      try {
        await storeAccount({
          accessToken: tokenResponse.access_token,
          encryptedRefreshToken: encrypted,
          expiresIn: tokenResponse.expires_in,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message };
      }
    }

    return {
      ok: true,
      accessToken: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in,
      scope: tokenResponse.scope,
    };
  }

  async function handleRequest(params: { code: string }): Promise<{ status: number; body: OAuthCallbackResult }> {
    const result = await handle(params);

    if (!result.ok) {
      const isClientError = result.error.includes('code') || result.error.includes('Missing');
      const status = isClientError ? 400 : 502;
      return { status, body: result };
    }

    return { status: 200, body: result };
  }

  return { handle, handleRequest };
}
