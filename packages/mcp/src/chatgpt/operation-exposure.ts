import type { OperationDomains } from "./execution-domains.ts";
import type { ChatGptToolName } from "./tool-catalog.ts";

export type ChatGptExposure =
  | {
      readonly kind: "tools";
      readonly tools: readonly [ChatGptToolName, ...ChatGptToolName[]];
    }
  | { readonly kind: "refine"; readonly family: keyof OperationDomains }
  | {
      [Family in keyof OperationDomains]: {
        readonly kind: "refineOperations";
        readonly family: Family;
        readonly operations: readonly [
          OperationDomains[Family],
          ...OperationDomains[Family][],
        ];
      };
    }[keyof OperationDomains]
  | { readonly kind: "boundContinuation" }
  | { readonly kind: "internal" }
  | { readonly kind: "unavailable" };
export type ChatGptExposureAccounting = {
  readonly [Family in keyof OperationDomains]: {
    readonly [Operation in OperationDomains[Family]]: Family extends "spellProcedures"
      ? {
          readonly kind: "refineOperations";
          readonly family: "spellOperations";
          readonly operations: readonly [
            Extract<
              OperationDomains["spellOperations"],
              Operation | `${Operation}.${string}`
            >,
            ...Extract<
              OperationDomains["spellOperations"],
              Operation | `${Operation}.${string}`
            >[],
          ];
        }
      : ChatGptExposure;
  };
};
export function tools<
  const Names extends readonly [ChatGptToolName, ...ChatGptToolName[]],
>(...names: Names) {
  return { kind: "tools", tools: names } as const;
}
export function tool<const Name extends ChatGptToolName>(name: Name) {
  return tools(name);
}
export function refine<const Family extends keyof OperationDomains>(
  family: Family,
) {
  return { kind: "refine", family } as const;
}
export function refineOperations<
  const Family extends keyof OperationDomains,
  const Operations extends readonly [
    OperationDomains[Family],
    ...OperationDomains[Family][],
  ],
>(family: Family, ...operations: Operations) {
  return { kind: "refineOperations", family, operations } as const;
}
export function boundContinuation() {
  return { kind: "boundContinuation" } as const;
}
export function internal() {
  return { kind: "internal" } as const;
}
export function unavailable() {
  return { kind: "unavailable" } as const;
}
