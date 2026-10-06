import { checkChatGptInputSelections } from "./chatgpt-input-selection-check.ts";
import { Match } from "effect";
import type { ChatGptExposure } from "../src/chatgpt/operation-tool-plan.ts";
import type { OperationAccount } from "./operation-accounting-contract.ts";
import { exactCoverage } from "./operation-accounting-compiler.ts";

type ExposureTable = Readonly<
  Record<string, Readonly<Record<string, ChatGptExposure>>>
>;
type ToolPlans = Readonly<
  Record<string, { readonly family: string; readonly description: string }>
>;
type Accounts = Readonly<
  Record<string, Readonly<Record<string, OperationAccount>>>
>;
type Selection = { readonly family: string; readonly operation: string };

export function checkChatGptToolPlan(input: {
  readonly domains: ReadonlyMap<string, readonly string[]>;
  readonly exposure: ExposureTable;
  readonly tools: ToolPlans;
  readonly accounts: Accounts;
}) {
  const issues = [
    ...exactCoverage(
      [...input.domains.keys()],
      Object.keys(input.exposure),
      "ChatGPT families",
    ),
  ];
  const selectedBy = new Map<string, string[]>();
  const edges = new Map<string, readonly Selection[]>();
  const label = ({ family, operation }: Selection) => `${family}.${operation}`;
  for (const [family, operations] of input.domains) {
    const rows = input.exposure[family] ?? {};
    issues.push(
      ...exactCoverage(operations, Object.keys(rows), `ChatGPT ${family}`),
    );
    for (const operation of operations) {
      const exposure = rows[operation];
      if (!exposure) continue;
      const selection = { family, operation };
      const selectionLabel = label(selection);
      const role = input.accounts[family]?.[operation]?.role;
      if (family === "spellProcedures") {
        if (
          exposure.kind !== "refineOperations" ||
          exposure.family !== "spellOperations"
        )
          issues.push(
            `${selectionLabel}: spell procedure must refine to its own spell operations`,
          );
        else
          issues.push(
            ...exactCoverage(
              (input.domains.get("spellOperations") ?? []).filter(
                (key) => key === operation || key.startsWith(`${operation}.`),
              ),
              exposure.operations,
              `${selectionLabel} procedure refinement`,
            ),
          );
      }
      if (role === undefined)
        issues.push(`${selectionLabel}: missing execution-analysis role`);
      else {
        const operationRoutes = [
          "tools",
          "refine",
          "refineOperations",
        ] as const;
        const contract = Match.value(role).pipe(
          Match.when("operation", () => ({
            allowed: operationRoutes,
            message: "caller operation cannot disappear into",
          })),
          Match.when("dispatch", () => ({
            allowed: operationRoutes,
            message: "dispatch must refine to declared operations",
          })),
          Match.when("internal", () => ({
            allowed: ["internal"] as const,
            message: "internal execution cannot become a caller operation",
          })),
          Match.when("unavailable", () => ({
            allowed: ["unavailable"] as const,
            message: "unavailable execution cannot have a callable route",
          })),
          Match.when("continuation", () => ({
            allowed: [...operationRoutes, "boundContinuation"] as const,
            message: "continuation must retain its invocation route",
          })),
          Match.exhaustive,
        );
        if (!contract.allowed.some((kind) => kind === exposure.kind))
          issues.push(
            `${selectionLabel}: ${contract.message} ${exposure.kind}`,
          );
      }
      const children = Match.value(exposure).pipe(
        Match.discriminatorsExhaustive("kind")({
          tools: ({ tools }) => {
            issues.push(
              ...exactCoverage(
                [...new Set(tools)],
                tools,
                `${selectionLabel} tool targets`,
              ),
            );
            for (const name of tools) {
              if (!input.tools[name])
                issues.push(
                  `${selectionLabel}: undeclared ChatGPT tool ${name}`,
                );
              const sources = selectedBy.get(name) ?? [];
              sources.push(selectionLabel);
              selectedBy.set(name, sources);
            }
            return [];
          },
          refine: ({ family: target }) => {
            const keys = input.domains.get(target);
            if (!keys)
              issues.push(
                `${selectionLabel}: unknown refinement family ${target}`,
              );
            return (keys ?? []).map((key) => ({
              family: target,
              operation: key,
            }));
          },
          refineOperations: ({ family: target, operations: targets }) => {
            const keys = input.domains.get(target);
            if (!keys)
              issues.push(
                `${selectionLabel}: unknown refinement family ${target}`,
              );
            for (const key of targets)
              if (!keys?.includes(key))
                issues.push(
                  `${selectionLabel}: unknown refinement operation ${target}.${key}`,
                );
            return targets.map((key) => ({ family: target, operation: key }));
          },
          boundContinuation: () => [],
          internal: () => [],
          unavailable: () => [],
        }),
      );
      edges.set(selectionLabel, children);
    }
  }
  const visited = new Set<string>();
  function visit(selection: Selection, path: ReadonlySet<string>): void {
    const key = label(selection);
    if (path.has(key)) {
      issues.push(`ChatGPT refinement cycle: ${[...path, key].join(" -> ")}`);
      return;
    }
    if (visited.has(key)) return;
    const nextPath = new Set(path).add(key);
    for (const child of edges.get(key) ?? []) visit(child, nextPath);
    visited.add(key);
  }
  for (const [family, operations] of input.domains)
    for (const operation of operations) visit({ family, operation }, new Set());
  for (const [name, tool] of Object.entries(input.tools)) {
    if (!tool.description.trim())
      issues.push(`ChatGPT tool ${name}: missing operation description`);
    if (!selectedBy.has(name))
      issues.push(
        `ChatGPT tool ${name}: no execution selection owns this declaration`,
      );
  }
  return {
    issues,
    tools: Object.entries(input.tools)
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([name, tool]) => ({
        name,
        ...tool,
        selections: (selectedBy.get(name) ?? []).sort(),
      })),
  };
}

export function checkImplementedChatGptTools(
  tools: ToolPlans,
  definitions: readonly import("../src/tool-definition-contract.ts").ProtocolToolDefinition[],
  exposure: ExposureTable,
): readonly string[] {
  const issues = [
    ...exactCoverage(
      Object.keys(tools),
      definitions.map((definition) => definition.name),
      "implemented ChatGPT tools",
    ),
    ...checkChatGptInputSelections(exposure, definitions),
  ];
  for (const definition of definitions) {
    if (definition.description.trim().length === 0)
      issues.push(`${definition.name}: missing implemented description`);
    if (
      definition.inputSchema.type !== "object" ||
      definition.inputSchema.additionalProperties !== false
    )
      issues.push(`${definition.name}: input must be a closed object schema`);
    for (const annotation of [
      "readOnlyHint",
      "destructiveHint",
      "idempotentHint",
      "openWorldHint",
    ] as const) {
      if (typeof definition.annotations[annotation] !== "boolean")
        issues.push(
          `${definition.name}: missing implemented annotation ${annotation}`,
        );
    }
  }
  return issues;
}
