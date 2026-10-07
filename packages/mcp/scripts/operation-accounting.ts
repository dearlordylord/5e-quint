import {
  executionOwnerOrdinaryHoleKinds,
  executionOwnerOrdinaryFrontiers,
  executionGenericOrdinaryFrontierCalls,
} from "./execution-owner-frontiers.ts";
import { chatGptExecutionToolDefinitions } from "../src/chatgpt/tool-surface.ts";
import {
  executionHoleConstructions,
  executionHoleRequests,
  canonicalSubjectCarriers,
} from "./execution-hole-constructions.ts";
import { Match } from "effect";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { OPERATION_ACCOUNTING } from "./operation-accounting-decisions.ts";
import { buildAdvertisedToolDefinitions } from "../src/protocol-server.ts";
import {
  accountingProgram,
  accountingDiagnostics,
  closeAccountingCompiler,
  executionDomains,
  exactCoverage,
  evidenceLocations,
  spellDeclarationOwners,
  executionOwnerResultTags,
} from "./operation-accounting-compiler.ts";
import type { OperationAccount } from "./operation-accounting-contract.ts";
import {
  CHATGPT_OPERATION_EXPOSURE,
  CHATGPT_TOOL_PLAN,
  type ChatGptExposure,
} from "../src/chatgpt/operation-tool-plan.ts";
import {
  checkChatGptToolPlan,
  checkImplementedChatGptTools,
} from "./chatgpt-tool-plan-check.ts";

function checkAccounting(): void {
  const program = accountingProgram();
  const issues = [...accountingDiagnostics(program)];
  const domains = executionDomains(program);
  const subjectCarriers = canonicalSubjectCarriers(program);
  if (subjectCarriers.kind === "unclassified")
    issues.push("Canonical subject carrier projection is unclassified.");
  else
    issues.push(
      ...exactCoverage(
        domains.get("battleSubjects") ?? [],
        subjectCarriers.values,
        "subject carrier projection",
      ),
    );
  const holeConstructions = executionHoleConstructions(program);
  const holeRequests = executionHoleRequests(program);
  const genericOrdinaryFrontierCalls =
    executionGenericOrdinaryFrontierCalls(program);
  const chatGptExposure: Readonly<
    Record<string, Readonly<Record<string, ChatGptExposure>>>
  > = CHATGPT_OPERATION_EXPOSURE;
  const decisions: Readonly<
    Record<string, Readonly<Record<string, OperationAccount>>>
  > = OPERATION_ACCOUNTING;
  const chatGptPlan = checkChatGptToolPlan({
    domains,
    exposure: chatGptExposure,
    tools: CHATGPT_TOOL_PLAN,
    accounts: decisions,
  });
  issues.push(...chatGptPlan.issues);
  issues.push(
    ...exactCoverage([...domains.keys()], Object.keys(decisions), "families"),
  );
  const spellOwners = spellDeclarationOwners(program, false);
  const staticOwners = spellDeclarationOwners(program, true);
  issues.push(
    ...exactCoverage(
      domains.get("spellProcedures") ?? [],
      [...spellOwners.keys()],
      "invocation registry",
    ),
  );
  issues.push(
    ...exactCoverage(
      domains.get("staticSpellMechanics") ?? [],
      [...staticOwners.keys()],
      "static mechanics registry",
    ),
  );
  const families = [...domains].map(([family, keys]) => {
    const accounts = decisions[family] ?? {};
    issues.push(...exactCoverage(keys, Object.keys(accounts), family));
    return {
      family,
      entries: keys.flatMap((key) => {
        const account = accounts[key];
        if (!account) return [];
        const evidence = evidenceLocations(program, account);
        issues.push(
          ...evidence.issues.map((issue) => `${family}.${key}: ${issue}`),
        );
        const profileKey = key.split(".")[0];
        const profile =
          (family === "spellProcedures" || family === "spellOperations") &&
          profileKey
            ? spellOwners.get(profileKey)
            : family === "staticSpellMechanics"
              ? staticOwners.get(key)
              : undefined;
        return [
          {
            key,
            ...account,
            chatGptExposure: chatGptExposure[family]?.[key],
            sources: [...evidence.locations, ...(profile ?? [])],
            executionResults: account.evidence.map((owner) => ({
              ...owner,
              result: executionOwnerResultTags(program, owner),
              ordinaryHoleKinds: executionOwnerOrdinaryHoleKinds(
                program,
                owner,
              ),
              ordinaryFrontiers: executionOwnerOrdinaryFrontiers(
                program,
                owner,
              ),
            })),
          },
        ];
      }),
    };
  });
  const chatGptHosted = buildAdvertisedToolDefinitions(
    chatGptExecutionToolDefinitions,
    "hosted",
    "chatgpt",
  );
  issues.push(
    ...checkImplementedChatGptTools(
      CHATGPT_TOOL_PLAN,
      chatGptHosted,
      CHATGPT_OPERATION_EXPOSURE,
    ),
  );
  const hosted = buildAdvertisedToolDefinitions();
  const local = buildAdvertisedToolDefinitions(undefined, "localProcess");
  issues.push(
    ...exactCoverage(
      domains.get("publicTools") ?? [],
      hosted.map((tool) => tool.name),
      "advertised tools",
    ),
  );
  for (const tool of [...hosted, ...local]) {
    if (!tool.description.trim())
      issues.push(`Missing description ${tool.name}`);
    for (const key of [
      "readOnlyHint",
      "destructiveHint",
      "openWorldHint",
    ] as const) {
      if (typeof tool.annotations[key] !== "boolean")
        issues.push(`Missing annotation ${tool.name}.${key}`);
    }
    if (!hosted.some((entry) => entry.name === tool.name))
      issues.push(`Unaccounted local tool ${tool.name}`);
  }
  if (issues.length) throw new Error(issues.join("\n"));
  const catalogSizes = {
    catalogBytes: Buffer.byteLength(JSON.stringify(chatGptHosted)),
    tools: chatGptHosted
      .map((tool) => ({
        name: tool.name,
        definitionBytes: Buffer.byteLength(JSON.stringify(tool)),
        inputBytes: Buffer.byteLength(JSON.stringify(tool.inputSchema)),
        outputBytes:
          tool.outputSchema === undefined
            ? 0
            : Buffer.byteLength(JSON.stringify(tool.outputSchema)),
      }))
      .sort(
        (left, right) =>
          right.definitionBytes - left.definitionBytes ||
          left.name.localeCompare(right.name),
      ),
  };
  const report = [
    "# Executed operation accounting",
    "",
    "Generated from execution types, explicit decisions, implemented function owners, canonical spell declarations, and the live advertised tool builder.",
    "",
    "Families overlap: subjects select bindings, bindings select procedures, and procedures request continuations. Counts are execution vocabulary members, not a sum of unique actions or a required tool count.",
    "",
    "Every member has a decision. operation requires public operation exposure; dispatch expands another family; continuation belongs to its pending operation; internal is composed by the runtime; unavailable cannot execute.",
    "",
    "This accounts for the typed execution vocabulary. It does not prove runtime reachability, reviewer approval, or that arbitrary future behavior changes retain the same operation meaning. Existing semantic checks remain necessary. Regular MCP retains its generic surface; ChatGPT uses the named registrations below.",
    "",
    "| Family | Members |",
    "| --- | ---: |",
    ...families.map(
      ({ family, entries }) => `| ${family} | ${entries.length} |`,
    ),
    "",
    "## Advertised ChatGPT catalog byte accounting",
    "",
    `The live hosted builder serializes to ${catalogSizes.catalogBytes} UTF-8 bytes. These measurements do not waive the protocol catalog storage gate. An absent advertised output schema contributes zero bytes here; canonical output review remains separate.`,
    "",
    "| Tool | Complete definition bytes | Input schema bytes | Output schema bytes |",
    "| --- | ---: | ---: | ---: |",
    ...catalogSizes.tools.map(
      (tool) =>
        `| ${tool.name} | ${tool.definitionBytes} | ${tool.inputBytes} | ${tool.outputBytes} |`,
    ),
    "",
    "## Implemented ChatGPT tools",
    "",
    `The strongly typed ChatGPT-only surface implements **${chatGptHosted.length} tools**. The ordinary MCP still advertises its existing tools. The surface’s names, closed input schemas, and annotations are checked against the execution analysis and typed operation mapping above.`,
    "",
    "References are resolved to a specific procedure or retained action before choosing its named tool. Fresh casts use cast_spell; retained-effect follow-ups have their own routes. Ordinary continuations resume only the same bound tool; they cannot select another action. Reactions select an explicit attack, cast, reduction, or decline route. Availability does not change the declared tool list.",
    "",
    "| Tool family | Tools |",
    "| --- | ---: |",
    ...[...new Set(chatGptPlan.tools.map((tool) => tool.family))]
      .sort()
      .map(
        (family) =>
          `| ${family} | ${chatGptPlan.tools.filter((tool) => tool.family === family).length} |`,
      ),
    "",
    ...chatGptPlan.tools.flatMap((tool) => [
      `### ${tool.name}`,
      "",
      tool.description,
      "",
      ...tool.selections.map((selection) => `- ${selection}`),
      "",
    ]),
    ...families.flatMap(({ family, entries }) => [
      `## ${family}`,
      "",
      ...entries.flatMap((entry) => [
        `### ${entry.key}`,
        "",
        `Role: **${entry.role}**. Execution identity: \`${entry.operation}\`.`,
        "",
        entry.reason,
        "",
        `ChatGPT route: \`${JSON.stringify(entry.chatGptExposure)}\`.`,
        "",
        ...entry.sources.map(
          (source) => `- ${source.file}:${source.line} — \`${source.symbol}\``,
        ),
        "",
        "Declared owner outcomes (not transitive caller coverage):",
        ...entry.executionResults.map(
          (owner) =>
            `- \`${owner.symbol}\`: \`${JSON.stringify(owner.result)}\`; declared ordinary frontiers: \`${JSON.stringify(owner.ordinaryFrontiers)}\``,
        ),
        "",
      ]),
    ]),
    "## Canonical hole request evidence",
    "",
    "These are calls to the canonical ordinary-hole result helpers, resolved through compiler symbols. The helpers preserve their supplied hole types; each row reports the inferred request kinds and supplied subject carriers at that call. The carrier projection is checked against the complete canonical subject-key domain. Broad input types remain broad and unclassified types remain explicit. Named caller ancestors use shortest distances in the symbol-resolved, lexical named-owner graph, with cycles deduplicated by declaration identity. Calls inside anonymous callbacks are attributed to their enclosing named declaration; indirect calls remain unresolved. Empty ancestor lists do not prove that a request is unreachable. This is call-site evidence, not proof of operation reachability through callbacks, interrupts, or replay.",
    "",
    "| Source | Owner | Inferred request kinds | Inferred subjects | Named caller ancestors (distance) |",
    "| --- | --- | --- | --- | --- |",
    ...holeRequests.map((request) => {
      const kinds = Match.value(request.kinds).pipe(
        Match.when({ kind: "finite" }, (value) => value.values.join(", ")),
        Match.when({ kind: "unclassified" }, () => "unclassified"),
        Match.exhaustive,
      );
      const subjects = Match.value(request.subjects).pipe(
        Match.when({ kind: "finite" }, (value) => value.values.join(", ")),
        Match.when({ kind: "unclassified" }, () => "unclassified"),
        Match.exhaustive,
      );
      const ancestors = request.namedCallerAncestors
        .map(
          (ancestor) =>
            `${ancestor.source.file}:${ancestor.source.line} (${ancestor.source.symbol}; ${ancestor.distance})`,
        )
        .join("; ");
      return `| ${request.source.file}:${request.source.line} | ${request.source.symbol} | ${kinds} | ${subjects} | ${ancestors} |`;
    }),
    "",
    "## Instantiated generic ordinary-frontier producers",
    "",
    "These named generic calls have a needs-holes branch directly or within the result of a resolution wrapper, projected at their actual invocation types. Each row records its result path and preserves the association between subject carriers and hole kinds through forwarding helpers. This scope excludes indirect calls and other result shapes; it does not prove transitive operation reachability.",
    "",
    "| Source | Owner | Producer | Result path | Instantiated ordinary frontiers |",
    "| --- | --- | --- | --- | --- |",
    ...genericOrdinaryFrontierCalls.map(
      (call) =>
        `| ${call.source.file}:${call.source.line} | ${call.source.symbol} | ${call.producer.file}:${call.producer.line} (${call.producer.symbol}) | ${JSON.stringify(call.resultPath)} | ${JSON.stringify(call.result)} |`,
    ),
    "",
    "## Hole construction evidence",
    "",
    "These are typed hole-shaped object constructions in the loaded runtime source graph, with direct calls to their named enclosing owners resolved through compiler symbols. Empty caller lists mean no direct named call was found, not that the construction is unreachable. Indirect calls, copies, and transitive operation reachability require separate analysis. Unclassified discriminants remain explicit.",
    "",
    "| Source | Owner | Declared kinds | Direct named owner calls |",
    "| --- | --- | --- | --- |",
    ...holeConstructions.map((construction) => {
      const kinds = Match.value(construction.kinds).pipe(
        Match.when({ kind: "finite" }, (value) => value.values.join(", ")),
        Match.when({ kind: "unclassified" }, () => "unclassified"),
        Match.exhaustive,
      );
      const callers = construction.directNamedOwnerCalls
        .map((caller) => `${caller.file}:${caller.line} (${caller.symbol})`)
        .join("; ");
      return `| ${construction.source.file}:${construction.source.line} | ${construction.source.symbol} | ${kinds} | ${callers} |`;
    }),
  ].join("\n");
  const args = process.argv.slice(2);
  const outputPath = args[1];
  if (
    args.length !== 0 &&
    !(
      args.length === 2 &&
      outputPath &&
      (args[0] === "--report" || args[0] === "--json")
    )
  )
    throw new Error(
      "Usage: operation-accounting.ts [--report PATH | --json PATH]",
    );
  if (args[0] === "--report" && outputPath)
    writeFileSync(resolve(outputPath), report);
  if (args[0] === "--json" && outputPath)
    writeFileSync(
      resolve(outputPath),
      `${JSON.stringify({ families, chatGptTools: chatGptPlan.tools, catalogSizes, holeRequests, genericOrdinaryFrontierCalls, holeConstructions }, null, 2)}\n`,
    );
  console.log(
    `Accounted ${families.length} execution families (${families.reduce((sum, family) => sum + family.entries.length, 0)} overlapping members), ${hosted.length} existing hosted tools and ${local.length} existing local tools; implemented ${chatGptHosted.length} ChatGPT-only tools.`,
  );
}
try {
  checkAccounting();
} finally {
  closeAccountingCompiler();
}
