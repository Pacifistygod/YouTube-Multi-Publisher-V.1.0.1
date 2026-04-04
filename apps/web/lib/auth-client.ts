export interface AuthFetchResponse {
  status: number;
  json: () => Promise<unknown>;
}

export type AuthFetch = (
  input: string,
  init?: {
    method?: string;
    credentials?: 'include';
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<AuthFetchResponse>;

export interface AuthenticatedAdmin {
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export async function loginWithPassword(
  credentials: LoginCredentials,
  fetcher: AuthFetch = globalThis.fetch as AuthFetch,
): Promise<{ ok: true; user: AuthenticatedAdmin } | { ok: false; status: number; error: string }> {
  const response = await fetcher('/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  const body = (await response.json()) as { error?: string; user?: AuthenticatedAdmin };

  if (response.status !== 200 || !body.user) {
    return {
      ok: false,
      status: response.status,
      error: body.error ?? 'Unable to sign in.',
    };
  }

  return {
    ok: true,
    user: body.user,
  };
}

export async function logoutSession(fetcher: AuthFetch = globalThis.fetch as AuthFetch): Promise<void> {
  await fetcher('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function getAuthenticatedAdmin(fetcher: AuthFetch = globalThis.fetch as AuthFetch): Promise<AuthenticatedAdmin> {
  const response = await fetcher('/auth/me', {
    method: 'GET',
    credentials: 'include',
  });

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  const body = (await response.json()) as { error?: string; user?: AuthenticatedAdmin };

  if (response.status !== 200 || !body.user?.email) {
    throw new Error(body.error ?? 'Unable to load the current admin session.');
  }

  return body.user;
}
