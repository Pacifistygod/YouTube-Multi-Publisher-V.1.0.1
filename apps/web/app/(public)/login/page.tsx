import type { LoginCredentials } from '../../../lib/auth-client';
import { loginWithPassword, type AuthFetch } from '../../../lib/auth-client';

export interface LoginPageField {
  name: keyof LoginCredentials;
  label: string;
  type: 'email' | 'password';
}

export interface LoginPageView {
  route: '/login';
  title: string;
  description: string;
  fields: LoginPageField[];
  submitLabel: string;
  inlineError: string | null;
}

export function renderLoginPage(options: { error?: string } = {}): LoginPageView {
  return {
    route: '/login',
    title: 'Admin sign in',
    description: 'Use the seeded admin credential to access the internal publishing workspace.',
    fields: [
      {
        name: 'email',
        label: 'Email',
        type: 'email',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
      },
    ],
    submitLabel: 'Sign in',
    inlineError: options.error ?? null,
  };
}

export async function submitLogin(credentials: LoginCredentials, fetcher?: AuthFetch) {
  return loginWithPassword(credentials, fetcher);
}
