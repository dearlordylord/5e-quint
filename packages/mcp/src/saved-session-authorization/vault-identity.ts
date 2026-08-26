import { randomUUID } from "node:crypto";

export const ANONYMOUS_VAULT_EMAIL_PREFIX = "saved-session-vault-";
export const ANONYMOUS_VAULT_EMAIL_DOMAIN =
  "vault.dnd-oracle.apps.loskutoff.com";

export function makeAnonymousVaultEmail(): string {
  return `${ANONYMOUS_VAULT_EMAIL_PREFIX}${randomUUID()}@${ANONYMOUS_VAULT_EMAIL_DOMAIN}`;
}

export function isAnonymousVaultEmail(value: string): boolean {
  const suffix = `@${ANONYMOUS_VAULT_EMAIL_DOMAIN}`;
  return (
    value.startsWith(ANONYMOUS_VAULT_EMAIL_PREFIX) &&
    value.endsWith(suffix) &&
    value.length > ANONYMOUS_VAULT_EMAIL_PREFIX.length + suffix.length
  );
}
