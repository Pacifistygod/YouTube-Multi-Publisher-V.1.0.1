import { SessionGuard, type SessionRequestLike } from '../auth/session.guard';
import type { ConnectedAccountRecord } from './accounts.service';
import { AccountsService } from './accounts.service';

interface OAuthQuery {
  code?: string;
  state?: string;
}

export interface AccountsRequest extends SessionRequestLike {
  query?: OAuthQuery;
  body?: unknown;
}

export interface AccountsControllerResponse<TBody> {
  status: number;
  body: TBody;
}

export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly sessionGuard: SessionGuard,
  ) {}

  async startGoogleOauth(request: SessionRequestLike): Promise<AccountsControllerResponse<{ error?: string; redirectUrl?: string }>> {
    const guardResult = this.sessionGuard.check(request);

    if (!guardResult.allowed) {
      return {
        status: 401,
        body: {
          error: guardResult.reason,
        },
      };
    }

    const redirectUrl = await this.accountsService.createAuthorizationRedirect(request.session);

    return {
      status: 302,
      body: {
        redirectUrl,
      },
    };
  }

  async handleGoogleOauthCallback(
    request: AccountsRequest,
  ): Promise<AccountsControllerResponse<{ error?: string; account?: ConnectedAccountRecord }>> {
    const guardResult = this.sessionGuard.check(request);

    if (!guardResult.allowed) {
      return {
        status: 401,
        body: {
          error: guardResult.reason,
        },
      };
    }

    const code = request.query?.code;
    const state = request.query?.state;

    if (!code || !state) {
      return {
        status: 400,
        body: {
          error: 'Missing OAuth callback code or state.',
        },
      };
    }

    const result = await this.accountsService.handleOauthCallback({
      code,
      state,
      session: request.session,
    });

    if (!result.ok) {
      return {
        status: 400,
        body: {
          error: 'OAuth state validation failed. Please reconnect and try again.',
        },
      };
    }

    return {
      status: 200,
      body: {
        account: result.account,
      },
    };
  }
}