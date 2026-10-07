import {
  executionOwnerOrdinaryHoleKinds,
  executionOwnerOrdinaryFrontiers,
  executionGenericOrdinaryFrontierCalls,
} from "./execution-owner-frontiers.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { OPERATION_ACCOUNTING } from "./operation-accounting-decisions.ts";
import {
  executionHoleConstructions,
  executionHoleRequests,
  canonicalSubjectCarriers,
} from "./execution-hole-constructions.ts";
import {
  CHATGPT_OPERATION_EXPOSURE,
  CHATGPT_TOOL_PLAN,
} from "../src/chatgpt/operation-tool-plan.ts";
import { checkChatGptToolPlan } from "./chatgpt-tool-plan-check.ts";
import {
  accountingProgram,
  accountingDiagnostics,
  closeAccountingCompiler,
  contractPath,
  decisionsPath,
  exactCoverage,
  executionDomains,
  evidenceLocations,
  spellDeclarationOwners,
  executionOwnerResultTags,
  repositoryRoot,
} from "./operation-accounting-compiler.ts";

after(closeAccountingCompiler);

test("native accounting snapshots restore source after a virtual mutation", () => {
  const baseline = accountingProgram();
  assert.deepEqual(accountingDiagnostics(baseline), []);
  const source = readFileSync(contractPath, "utf8").replace(
    "publicTools: PlaySessionNextOperationName;",
    'publicTools: PlaySessionNextOperationName | "synthetic_snapshot_operation";',
  );
  assert.notEqual(source, readFileSync(contractPath, "utf8"));
  const mutation = accountingProgram(new Map([[contractPath, source]]));
  assert.ok(
    accountingDiagnostics(mutation).some((issue) =>
      issue.includes("synthetic_snapshot_operation"),
    ),
  );
  assert.deepEqual(accountingDiagnostics(baseline), []);
});

// One integration mutation introduces a new primary operation, secondary mode,
// public entry point and family. None may silently join an existing decision.
test("new execution vocabulary requires explicit decisions at every level", () => {
  const source = readFileSync(contractPath, "utf8")
    .replace(
      "publicTools: PlaySessionNextOperationName;",
      'publicTools: PlaySessionNextOperationName | "synthetic_public_operation";',
    )
    .replace(
      "battleSubjects: SubjectOperationKey<BattleSubject>;",
      'battleSubjects: SubjectOperationKey<BattleSubject | { readonly tag: "synthetic_subject" }>;',
    )
    .replace(
      /spellOperations:\s*SpellOperationKey<\s*SpellProcedureExecutionByProcedure\[BattleSpellProcedureKey\]\s*>;/,
      'spellOperations: SpellOperationKey<SpellProcedureExecutionByProcedure[BattleSpellProcedureKey] | { readonly procedure: "markedDamageRider"; readonly operation: "synthetic_followup" }>;',
    )
    .replace(
      "export interface OperationDomains {",
      'export interface OperationDomains { syntheticFamily: "synthetic_operation";',
    );
  const program = accountingProgram(new Map([[contractPath, source]]));
  const domains = executionDomains(program);
  assert.ok(domains.get("battleSubjects")?.includes("synthetic_subject"));
  assert.ok(
    domains
      .get("spellOperations")
      ?.includes("markedDamageRider.synthetic_followup"),
  );
  assert.ok(domains.get("publicTools")?.includes("synthetic_public_operation"));
  const diagnostics = [
    ...accountingDiagnostics(program),
    ...exactCoverage(
      [...domains.keys()],
      Object.keys(OPERATION_ACCOUNTING),
      "families",
    ),
  ].join("\n");
  for (const missing of [
    "syntheticFamily",
    "synthetic_subject",
    "synthetic_followup",
    "synthetic_public_operation",
  ])
    assert.ok(
      diagnostics.includes(missing),
      `Compiler must reject missing decision ${missing}`,
    );
});

test("new subject refinement families require an executable router", () => {
  const exposurePath = resolve(
    repositoryRoot,
    "packages/mcp/src/chatgpt/battle-subject-exposure.ts",
  );
  const source = readFileSync(exposurePath, "utf8");
  const mutation = source.replace(
    '"action.dash": tool("dash")',
    '"action.dash": refineOperations("statBlockBonusActions", "disengage")',
  );
  assert.notEqual(mutation, source, "The mutation must replace a real route");
  const diagnostics = accountingDiagnostics(
    accountingProgram(new Map([[exposurePath, mutation]])),
  );
  assert.ok(
    diagnostics.some((diagnostic) =>
      diagnostic.includes("battle-operation-routing.ts:"),
    ),
    "An unhandled refinement family must fail compilation in the router",
  );
});

test("accounting rejects compiler errors in analyzed runtime owners", () => {
  const path = resolve(
    repositoryRoot,
    "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
  );
  const source = readFileSync(path, "utf8");
  const mutation = source.replace(
    "typeof readyDeclarationHole",
    "typeof syntheticMissingHoleConstructor",
  );
  assert.notEqual(mutation, source, "The mutation must change a real contract");
  const diagnostics = accountingDiagnostics(
    accountingProgram(new Map([[path, mutation]])),
  );
  assert.ok(
    diagnostics.some(
      (diagnostic) =>
        diagnostic.includes("battle-reducer/attack-resolution.ts:") &&
        diagnostic.includes("syntheticMissingHoleConstructor"),
    ),
    "An invalid owner result contract must fail the accounting gate",
  );
});

test("named stateful tools reject schemas for another canonical operation", () => {
  const characterPath = resolve(
    repositoryRoot,
    "packages/mcp/src/chatgpt/character-execution-tools.ts",
  );
  const lifecyclePath = resolve(
    repositoryRoot,
    "packages/mcp/src/chatgpt/lifecycle-execution-tools.ts",
  );
  const character = readFileSync(characterPath, "utf8");
  const lifecycle = readFileSync(lifecyclePath, "utf8");
  const wrongCharacter = character
    .replace(
      "operation: CHARACTER_SESSION_OPERATION_SCHEMAS.completeLongRest,",
      "operation: CHARACTER_SESSION_OPERATION_SCHEMAS.completeShortRest,",
    )
    .replace(
      "query: CHARACTER_SESSION_QUERY_SCHEMAS.abilityCheckAbility,",
      "query: CHARACTER_SESSION_QUERY_SCHEMAS.armorClass,",
    );
  const wrongLifecycle = lifecycle.replace(
    "operation: BATTLE_LIFECYCLE_OPERATION_SCHEMAS.addCombatant,",
    "operation: BATTLE_LIFECYCLE_OPERATION_SCHEMAS.removeCombatant,",
  );
  assert.notEqual(wrongCharacter, character);
  assert.notEqual(wrongLifecycle, lifecycle);
  const diagnostics = accountingDiagnostics(
    accountingProgram(
      new Map([
        [characterPath, wrongCharacter],
        [lifecyclePath, wrongLifecycle],
      ]),
    ),
  );
  const factoryPath = resolve(
    repositoryRoot,
    "packages/mcp/src/chatgpt/stateful-tool.ts",
  );
  const factory = readFileSync(factoryPath, "utf8");
  const unconstrained = factory.replace(
    "A extends ChatGptStatefulInput<NoInfer<Name>>",
    "A",
  );
  assert.notEqual(unconstrained, factory);
  assert.deepEqual(
    accountingDiagnostics(
      accountingProgram(
        new Map([
          [characterPath, wrongCharacter],
          [lifecyclePath, wrongLifecycle],
          [factoryPath, unconstrained],
        ]),
      ),
    ),
    [],
    "The schema/name mismatch must be rejected by the input contract, not an unrelated error",
  );
  for (const [file, operation] of [
    ["character-execution-tools.ts", "completeLongRest"],
    ["character-execution-tools.ts", "abilityCheckAbility"],
    ["lifecycle-execution-tools.ts", "addCombatant"],
  ])
    assert.ok(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.includes(file) && diagnostic.includes(operation),
      ),
      `The compiler must reject the wrong ${operation} schema`,
    );
});

test("exact accounting rejects omitted, stale and duplicate decisions", () => {
  assert.deepEqual(
    exactCoverage(
      ["attack", "cast"],
      ["attack", "other", "attack"],
      "subjects",
    ),
    [
      "subjects: unaccounted cast",
      "subjects: stale other",
      "subjects: duplicate keys",
    ],
  );
  assert.deepEqual(
    exactCoverage(["attack", "cast"], ["cast", "attack"], "subjects"),
    [],
  );
});

test("execution owners and canonical profiles resolve to implemented sources", () => {
  const resolverPath = resolve(
    repositoryRoot,
    "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
  );
  const aliasedResolver = readFileSync(resolverPath, "utf8")
    .replace(
      "  readyDeclarationHole,",
      "  readyDeclarationHole as syntheticReadyHole,",
    )
    .replace(
      "readyDeclarationHole(input.subject.actorId",
      "syntheticReadyHole(input.subject.actorId",
    )
    .replaceAll("typeof readyDeclarationHole", "typeof syntheticReadyHole");
  assert.ok(
    aliasedResolver.includes("readyDeclarationHole as syntheticReadyHole"),
  );
  assert.ok(
    aliasedResolver.includes("syntheticReadyHole(input.subject.actorId"),
  );
  const program = accountingProgram(new Map([[resolverPath, aliasedResolver]]));
  assert.deepEqual(accountingDiagnostics(program), []);
  const domains = executionDomains(program);
  const omittedAttack = {
    ...CHATGPT_OPERATION_EXPOSURE,
    battleSubjects: Object.fromEntries(
      Object.entries(CHATGPT_OPERATION_EXPOSURE.battleSubjects).filter(
        ([key]) => key !== "action.attack",
      ),
    ),
  };
  const unaccounted = checkChatGptToolPlan({
    domains,
    exposure: omittedAttack,
    tools: CHATGPT_TOOL_PLAN,
    accounts: OPERATION_ACCOUNTING,
  });
  assert.ok(
    unaccounted.issues.some((issue) =>
      issue.includes("unaccounted action.attack"),
    ),
  );
  assert.deepEqual(
    exactCoverage(
      domains.get("spellProcedures") ?? [],
      [...spellDeclarationOwners(program, false).keys()],
      "spells",
    ),
    [],
  );
  assert.deepEqual(
    exactCoverage(
      domains.get("staticSpellMechanics") ?? [],
      [...spellDeclarationOwners(program, true).keys()],
      "static",
    ),
    [],
  );
  const missing = evidenceLocations(program, {
    role: "operation",
    operation: "synthetic",
    reason: "mutation",
    evidence: [
      {
        file: "packages/mcp/src/protocol-server.ts",
        symbol: "synthetic_missing_function",
      },
    ],
  });
  assert.equal(missing.locations.length, 0);
  assert.match(missing.issues.join(), /Expected one implemented function/);
  const requests = executionHoleRequests(program);
  const genericProducerCalls = executionGenericOrdinaryFrontierCalls(program);
  const spellSelectionCalls = genericProducerCalls.filter(
    (call) => call.producer.symbol === "spellSelectionResolution",
  );
  assert.equal(spellSelectionCalls.length, 10);
  for (const call of spellSelectionCalls)
    assert.deepEqual(call.resultPath, ["result"]);
  assert.deepEqual(
    spellSelectionCalls
      .filter((call) => call.source.symbol === "resolveRollModifier")
      .map((call) => {
        if (call.result.kind !== "finite") assert.fail(call.result.reason);
        return call.result.frontiers.map((frontier) => frontier.holeKinds);
      }),
    [
      [["spellTargetList", "targetChoice"]],
      [["abilityChoice", "skillChoice", "targetAbilityChoices"]],
      [["savingThrowOutcome", "spellTargetList", "targetChoice"]],
    ],
  );
  const persistentAreaCalls = genericProducerCalls.filter(
    (call) => call.producer.symbol === "persistentAreaNeedsHolesResult",
  );
  assert.equal(persistentAreaCalls.length, 5);
  for (const [owner, kind] of [
    ["resolvePersistentAreaSaveStage", "savingThrowOutcome"],
    ["resolvePersistentAreaDamageRollStage", "rolledDice"],
    ["resolvePersistentAreaConcentrationStage", "concentrationSavingThrow"],
    ["resolvePersistentAreaDispositionStage", "attackDamageDisposition"],
  ] as const) {
    const call = persistentAreaCalls.find(
      (candidate) => candidate.source.symbol === owner,
    );
    assert.ok(call);
    if (call.result.kind !== "finite") assert.fail(call.result.reason);
    assert.deepEqual(
      call.result.frontiers.map((frontier) => frontier.holeKinds),
      [[kind]],
    );
  }
  assert.ok(
    genericProducerCalls.some(
      (call) => call.producer.symbol === "turnBoundaryNeedsHolesResult",
    ),
  );
  const spatialProducerCalls = genericProducerCalls.filter(
    (call) => call.producer.symbol === "needsSpatialProcedureHole",
  );
  assert.equal(spatialProducerCalls.length, 7);
  const canonicalSubjects = executionDomains(program).get("battleSubjects");
  assert.ok(canonicalSubjects);
  for (const call of genericProducerCalls)
    if (call.result.kind === "finite")
      for (const frontier of call.result.frontiers)
        for (const subject of frontier.subjects)
          assert.ok(
            canonicalSubjects.includes(subject),
            `${call.source.symbol}: ${subject}`,
          );
  for (const call of spatialProducerCalls) {
    if (call.result.kind !== "finite") assert.fail(call.result.reason);
    assert.equal(call.result.frontiers.length, 1);
    for (const frontier of call.result.frontiers) {
      assert.ok(frontier.subjects.length > 0);
      for (const subject of frontier.subjects)
        assert.ok(canonicalSubjects.includes(subject));
      assert.equal(frontier.holeKinds.length, 1);
    }
  }
  assert.deepEqual(
    spatialProducerCalls.find(
      (call) =>
        call.source.symbol === "resolveDirectionalPersistentAreaSaveCommand",
    )?.result,
    {
      kind: "finite",
      frontiers: [
        {
          subjects: ["runtimeCommand.directionalPersistentAreaSave"],
          holeKinds: ["savingThrowOutcome"],
        },
      ],
    },
  );
  const readyRequests = requests.filter(
    (request) => request.source.symbol === "resolveReady",
  );
  assert.deepEqual(
    requests.find(
      (request) =>
        request.source.symbol ===
        "resolveAttackDamageContinuationCunningStrike",
    )?.kinds,
    {
      kind: "finite",
      values: [
        "cunningStrikeEndTurnCoverFacts",
        "movement",
        "savingThrowOutcome",
        "toolPossessionFacts",
      ],
    },
  );
  assert.deepEqual(
    requests
      .filter(
        (request) => request.source.symbol === "resolveAreaSaveMetamagicFills",
      )
      .map((request) => request.kinds),
    [
      { kind: "finite", values: ["spellTargetList", "targetChoice"] },
      { kind: "finite", values: ["savingThrowOutcome"] },
    ],
  );
  assert.deepEqual(
    requests.find((request) => request.source.symbol === "resolveHide")
      ?.subjects,
    {
      kind: "finite",
      values: ["action.hide", "bonusActionStandardAction.hide"],
    },
  );
  assert.deepEqual(
    requests.find(
      (request) =>
        request.source.symbol ===
        "resolvePersistentAreaSaveConditionEntrySaveCommand",
    )?.subjects,
    {
      kind: "finite",
      values: ["runtimeCommand.persistentAreaSaveConditionSave"],
    },
  );
  assert.deepEqual(
    requests.find((request) => request.source.symbol === "resolveMoveCommand")
      ?.subjects,
    { kind: "finite", values: ["runtimeCommand.move"] },
  );
  const healingMovementRequests = requests.filter((request) =>
    request.source.file.endsWith("bonus-action-healing-movement.ts"),
  );
  assert.equal(healingMovementRequests.length, 3);
  for (const request of healingMovementRequests)
    assert.deepEqual(request.subjects, {
      kind: "finite",
      values: ["unitFeature"],
    });
  assert.equal(readyRequests.length, 1);
  assert.deepEqual(readyRequests[0]?.kinds, {
    kind: "finite",
    values: ["readyDeclaration"],
  });
  assert.deepEqual(canonicalSubjectCarriers(program), {
    kind: "finite",
    values: executionDomains(program).get("battleSubjects"),
  });
  assert.deepEqual(readyRequests[0]?.subjects, {
    kind: "finite",
    values: ["action.ready"],
  });
  const request = readyRequests[0];
  assert.ok(request);
  assert.ok(
    request.namedCallerAncestors.some(
      (ancestor) =>
        ancestor.source.symbol ===
          "resolveBattleSubjectAfterD20TestNaturalOneReroll" &&
        ancestor.distance === 1,
    ),
  );
  assert.ok(
    request.namedCallerAncestors.some(
      (ancestor) =>
        ancestor.source.symbol === "resolveBattleSubjectInternal" &&
        ancestor.distance === 2,
    ),
  );
  const ancestorKeys = request.namedCallerAncestors.map(
    (ancestor) => `${ancestor.source.file}:${ancestor.source.line}`,
  );
  assert.equal(
    new Set(ancestorKeys).size,
    ancestorKeys.length,
    "Cycles must not repeat named owners",
  );
  assert.ok(
    request.namedCallerAncestors.every(
      (ancestor, index, all) =>
        index === 0 || ancestor.distance >= (all[index - 1]?.distance ?? 0),
    ),
  );
  const readyConstruction = executionHoleConstructions(program).find(
    (construction) => construction.source.symbol === "readyDeclarationHole",
  );
  assert.deepEqual(readyConstruction?.kinds, {
    kind: "finite",
    values: ["readyDeclaration"],
  });
  assert.ok(
    readyConstruction?.directNamedOwnerCalls.some(
      (caller) => caller.symbol === "resolveReady",
    ),
  );
  assert.ok(
    readyConstruction?.directNamedOwnerCalls.some((caller) =>
      caller.file.endsWith("battle-discovery.ts"),
    ),
  );
  for (const operation of [
    "action.dash",
    "action.disengage",
    "action.dodge",
    "bonusActionStandardAction.disengage",
    "runtimeCommand.releaseGrapple",
  ] as const)
    assert.deepEqual(
      executionOwnerResultTags(
        program,
        OPERATION_ACCOUNTING.battleSubjects[operation].evidence[0],
      ),
      { kind: "tagged", tags: ["invalid", "resolved"] },
    );
  assert.deepEqual(
    executionOwnerResultTags(
      program,
      OPERATION_ACCOUNTING.battleSubjects["action.attack"].evidence[0],
    ),
    { kind: "tagged", tags: ["invalid", "needsHoles", "resolved"] },
  );
  for (const [operation, values] of [
    ["action.ready", ["readyDeclaration"]],
    [
      "action.helpAttack",
      ["helpAttackAllyDecision", "helpAttackEnemyDecision"],
    ],
    ["bonusActionStandardAction.disengage", []],
    ["runtimeCommand.releaseGrapple", []],
  ] as const)
    assert.deepEqual(
      executionOwnerOrdinaryHoleKinds(
        program,
        OPERATION_ACCOUNTING.battleSubjects[operation].evidence[0],
      ),
      { kind: "finite", values },
    );
  assert.deepEqual(
    executionOwnerOrdinaryHoleKinds(
      program,
      OPERATION_ACCOUNTING.statBlockBonusActions.disengage.evidence[0],
    ),
    { kind: "finite", values: [] },
  );
  for (const [operation, holeKinds] of [
    ["action.ready", ["readyDeclaration"]],
    [
      "action.helpAttack",
      ["helpAttackAllyDecision", "helpAttackEnemyDecision"],
    ],
  ] as const)
    assert.deepEqual(
      executionOwnerOrdinaryFrontiers(
        program,
        OPERATION_ACCOUNTING.battleSubjects[operation].evidence[0],
      ),
      { kind: "finite", frontiers: [{ subjects: [operation], holeKinds }] },
    );
  assert.deepEqual(
    executionOwnerOrdinaryHoleKinds(program, {
      file: "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
      symbol: "synthetic_missing_owner",
    }),
    { kind: "unclassified", reason: "No unique implemented owner." },
  );
  // Merely keeping the decision file parseable does not satisfy new domains.
  assert.ok(program.getSourceFile(decisionsPath));
});

test("the generated analysis rejects hidden operations, undeclared tools and refinement cycles", () => {
  const domains = new Map([["battleSubjects", ["action.attack"]]]);
  const accounts = {
    battleSubjects: {
      "action.attack": OPERATION_ACCOUNTING.battleSubjects["action.attack"],
    },
  };
  const tools = { attack: CHATGPT_TOOL_PLAN.attack };
  const hidden = checkChatGptToolPlan({
    domains,
    accounts,
    tools,
    exposure: { battleSubjects: { "action.attack": { kind: "internal" } } },
  });
  assert.ok(
    hidden.issues.some((issue) =>
      issue.includes("caller operation cannot disappear"),
    ),
  );
  const undeclared = checkChatGptToolPlan({
    domains,
    accounts,
    tools,
    exposure: {
      battleSubjects: {
        "action.attack": { kind: "tools", tools: ["cast_spell"] },
      },
    },
  });
  assert.ok(
    undeclared.issues.some((issue) =>
      issue.includes("undeclared ChatGPT tool cast_spell"),
    ),
  );
  const cyclic = checkChatGptToolPlan({
    domains,
    accounts,
    tools,
    exposure: {
      battleSubjects: {
        "action.attack": { kind: "refine", family: "battleSubjects" },
      },
    },
  });
  assert.ok(cyclic.issues.some((issue) => issue.includes("refinement cycle")));
});

test("a procedure reference must preserve every generated child operation", () => {
  const result = checkChatGptToolPlan({
    domains: new Map([
      ["spellProcedures", ["markedDamageRider"]],
      [
        "spellOperations",
        ["markedDamageRider.cast", "markedDamageRider.transfer"],
      ],
    ]),
    accounts: {
      spellProcedures: {
        markedDamageRider:
          OPERATION_ACCOUNTING.spellProcedures.markedDamageRider,
      },
      spellOperations: {
        "markedDamageRider.cast":
          OPERATION_ACCOUNTING.spellOperations["markedDamageRider.cast"],
        "markedDamageRider.transfer":
          OPERATION_ACCOUNTING.spellOperations["markedDamageRider.transfer"],
      },
    },
    tools: {
      cast_spell: CHATGPT_TOOL_PLAN.cast_spell,
      transfer_spell_mark: CHATGPT_TOOL_PLAN.transfer_spell_mark,
    },
    exposure: {
      spellProcedures: {
        markedDamageRider: {
          kind: "refineOperations",
          family: "spellOperations",
          operations: ["markedDamageRider.cast"],
        },
      },
      spellOperations: {
        "markedDamageRider.cast": { kind: "tools", tools: ["cast_spell"] },
        "markedDamageRider.transfer": {
          kind: "tools",
          tools: ["transfer_spell_mark"],
        },
      },
    },
  });
  assert.ok(
    result.issues.some((issue) =>
      issue.includes(
        "procedure refinement: unaccounted markedDamageRider.transfer",
      ),
    ),
  );
});

test("implemented descriptors must exactly cover the proposed tool contract", async () => {
  const { checkImplementedChatGptTools } =
    await import("./chatgpt-tool-plan-check.ts");
  const { chatGptExecutionToolDefinitions } =
    await import("../src/chatgpt/tool-surface.ts");
  const { buildAdvertisedToolDefinitions } =
    await import("../src/protocol-server.ts");
  const { CHATGPT_TOOL_PLAN } =
    await import("../src/chatgpt/operation-tool-plan.ts");
  const definitions = buildAdvertisedToolDefinitions(
    chatGptExecutionToolDefinitions,
    "hosted",
    "chatgpt",
  );
  assert.deepEqual(
    checkImplementedChatGptTools(
      CHATGPT_TOOL_PLAN,
      definitions,
      CHATGPT_OPERATION_EXPOSURE,
    ),
    [],
  );
  for (const kind of [
    { type: "string", enum: ["armorClass"] },
    { type: "string", enum: ["abilityCheckAbility", "armorClass"] },
    { type: "string", const: "abilityCheckAbility", enum: ["armorClass"] },
  ]) {
    const changed = definitions.map((definition) => {
      if (definition.name !== "query_ability_check_ability") return definition;
      const properties = definition.inputSchema.properties;
      assert.ok(
        typeof properties === "object" &&
          properties !== null &&
          !Array.isArray(properties),
      );
      return {
        ...definition,
        inputSchema: {
          ...definition.inputSchema,
          properties: {
            ...properties,
            query: {
              type: "object",
              properties: { kind },
              required: ["kind"],
              additionalProperties: false,
            },
          },
        },
      };
    });
    assert.ok(
      checkImplementedChatGptTools(
        CHATGPT_TOOL_PLAN,
        changed,
        CHATGPT_OPERATION_EXPOSURE,
      ).some((issue) =>
        issue.includes("query_ability_check_ability: advertised query.kind"),
      ),
    );
  }

  assert.ok(
    checkImplementedChatGptTools(
      CHATGPT_TOOL_PLAN,
      definitions.filter((definition) => definition.name !== "attack"),
      CHATGPT_OPERATION_EXPOSURE,
    ).some((issue) => issue.includes("attack")),
  );
});

test("spell registration rejects admission and caster facts from another procedure", () => {
  const registryPath = resolve(
    repositoryRoot,
    "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
  );
  const source = readFileSync(registryPath, "utf8");
  const valid = `${source}\nregisteredSpellProcedureDeclaration<typeof damageReductionProfile>(damageReductionProfile);\n`;
  assert.deepEqual(
    accountingDiagnostics(accountingProgram(new Map([[registryPath, valid]]))),
    [],
  );
  const mutation = `${source}
const syntheticWrongProcedureProfile = {
  ...damageReductionProfile,
  admitMechanics: rollModifierProfile.admitMechanics,
  casterRequirements: rollModifierProfile.casterRequirements,
};
registeredSpellProcedureDeclaration<typeof syntheticWrongProcedureProfile>(syntheticWrongProcedureProfile);
`;
  const diagnostics = accountingDiagnostics(
    accountingProgram(new Map([[registryPath, mutation]])),
  );
  assert.ok(
    diagnostics.some(
      (issue) =>
        issue.includes("spell-procedure-profiles/registry.ts:") &&
        issue.includes("rollModifier") &&
        issue.includes("damageReduction"),
    ),
    "Admission for rollModifier must not register as damageReduction",
  );
  assert.ok(
    diagnostics.every((issue) => !issue.includes("Cannot find name")),
    "The rejection must use actual existing profile contracts",
  );
});

test("spell registration rejects static admission as a ready invocation owner", () => {
  const registryPath = resolve(
    repositoryRoot,
    "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
  );
  const source = readFileSync(registryPath, "utf8");
  const mutation = `${source}
const syntheticStaticInvocationProfile = {
  ...damageReductionProfile,
  admitMechanics: glyphDurableOccurrenceAdmission.admitMechanics,
  casterRequirements: damageReductionProfile.casterRequirements,
};
registeredSpellProcedureDeclaration<typeof syntheticStaticInvocationProfile>(syntheticStaticInvocationProfile);
`;
  const diagnostics = accountingDiagnostics(
    accountingProgram(new Map([[registryPath, mutation]])),
  );
  assert.ok(
    diagnostics.some(
      (issue) =>
        issue.includes("spell-procedure-profiles/registry.ts:") &&
        issue.includes("glyphDurableOccurrence") &&
        issue.includes("damageReduction"),
    ),
    "A static glyph admission must not become a ready damageReduction invocation",
  );
  assert.ok(
    diagnostics.every((issue) => !issue.includes("Cannot find name")),
    "The rejection must use the canonical static admission owner",
  );
});
