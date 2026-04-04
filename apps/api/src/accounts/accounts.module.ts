import { SessionGuard } from '../auth/session.guard';
import { AccountsController } from './accounts.controller';
import { AccountsService, type AccountsServiceOptions } from './accounts.service';

export interface AccountsModuleInstance {
  accountsController: AccountsController;
  accountsService: AccountsService;
}

export function createAccountsModule(options: AccountsServiceOptions = {}): AccountsModuleInstance {
  const accountsService = new AccountsService(options);
  const accountsController = new AccountsController(accountsService, new SessionGuard());

  return {
    accountsController,
    accountsService,
  };
}