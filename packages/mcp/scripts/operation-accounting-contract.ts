import type { OperationDomains } from "../src/chatgpt/execution-domains.ts";
export type { OperationDomains } from "../src/chatgpt/execution-domains.ts";

export const ACCOUNT_ROLES = [
  "operation",
  "dispatch",
  "continuation",
  "internal",
  "unavailable",
] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];
export type ExecutionEvidence = {
  readonly file: string;
  readonly symbol: string;
};
export type OperationAccount = {
  readonly role: AccountRole;
  readonly operation: string;
  readonly evidence: readonly [ExecutionEvidence, ...ExecutionEvidence[]];
  readonly reason: string;
};
export type OperationAccounting = {
  readonly [Family in keyof OperationDomains]: Readonly<
    Record<OperationDomains[Family], OperationAccount>
  >;
};
