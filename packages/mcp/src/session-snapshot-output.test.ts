import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  battlePresentedSnapshot,
  characterId,
  combatantId,
  snapshotBattle,
  type BattleRuntimeResolutionResult,
} from "@dnd/battle-runtime";
import { NonNegativeInteger } from "@dnd/shared/types";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";

import { ListCharactersOutputSchema } from "./character-tool-output.ts";
import { AdminSessionProjectionSchema } from "./admin-mirror-contract.ts";
import {
  BattleLifecycleOutputSchema,
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
  StartBattleOutputSchema,
} from "./battle-tool-output.ts";
import type { McpSessionSnapshot } from "./session-store.ts";
import { mcpOutputJsonSchema, schemaJsonContent } from "./schema-codec.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { handleToolCall as handleWireToolCall } from "./server.ts";
import { battleResolutionPayload } from "./battle-tool-payloads.ts";
import { battleToolWireArgs } from "../test-support/battle-tool-wire-args.ts";
import {
  McpSessionSnapshotSchema,
  McpSessionSummarySchema,
  mcpSessionSummary,
} from "./session-snapshot-output.ts";

const SESSION_SUMMARY_OUTPUT_SCHEMAS = [
  SelectStatBlockOutputSchema,
  StartBattleOutputSchema,
  EndBattleOutputSchema,
] as const satisfies ReadonlyArray<Schema.Constraint>;

const SESSION_SNAPSHOT_OUTPUT_SCHEMAS = [
  BattleSessionOutputSchema,
  BattleResolutionOutputSchema,
] as const satisfies ReadonlyArray<Schema.Constraint>;

function outputJsonSchema(schema: Schema.Constraint) {
  return mcpOutputJsonSchema(Schema.toCodecIso(schema));
}

const setupState = {
  tag: "initialInitiativeSetup",
  battleId: "battle:projection-contract",
  combatants: [],
} as const;
const activeState = {
  tag: "activeBattle",
  battleId: "battle:projection-contract",
  currentActorId: "combatant:projection-contract",
} as const;
const noneState = { tag: "none" } as const;
type ProjectionBattleState =
  | typeof setupState
  | typeof activeState
  | typeof noneState;

function sessionForProjectionState(battleState: ProjectionBattleState) {
  return {
    draftIds: [],
    characterIds: [],
    selectedStatBlockId: null,
    battleState,
    pendingBattleHoles: null,
  };
}

function resolutionSessionForProjectionState(
  battleState: ProjectionBattleState,
) {
  return {
    ...sessionForProjectionState(battleState),
    transientBattleFills: null,
  };
}

const presentation = {
  availableActs: [],
  admittedSpellPresentations: [],
  presentedInterruptChoices: [],
};

describe("MCP session wire projections", () => {
  const schemaValidationTimeoutMs = 120_000;
  test("keeps battle fill definitions out of the session summary schema", () => {
    expect(
      mcpOutputJsonSchema(McpSessionSummarySchema).properties,
    ).not.toHaveProperty("transientBattleFills");
    expect(
      mcpOutputJsonSchema(McpSessionSnapshotSchema).properties,
    ).toHaveProperty("transientBattleFills");
  });

  test("uses the summary only where the result does not report battle fill progression", () => {
    for (const schema of SESSION_SUMMARY_OUTPUT_SCHEMAS) {
      expect(JSON.stringify(outputJsonSchema(schema))).not.toContain(
        "transientBattleFills",
      );
    }

    for (const schema of SESSION_SNAPSHOT_OUTPUT_SCHEMAS) {
      expect(JSON.stringify(outputJsonSchema(schema))).toContain(
        "transientBattleFills",
      );
    }
  });

  test(
    "rejects battle output and admin projections with contradictory snapshots",
    () => {
      const jsonSchemaValidator = new AjvJsonSchemaValidator();
      const validateStart = jsonSchemaValidator.getValidator(
        mcpOutputJsonSchema(StartBattleOutputSchema),
      );
      expect(
        validateStart({
          ...presentation,
          battleState: setupState,
          snapshot: {},
          session: sessionForProjectionState(setupState),
        }).valid,
      ).toBe(false);
      expect(
        validateStart({
          ...presentation,
          battleState: activeState,
          snapshot: null,
          session: sessionForProjectionState(activeState),
        }).valid,
      ).toBe(false);

      const validateResolution = jsonSchemaValidator.getValidator(
        mcpOutputJsonSchema(BattleResolutionOutputSchema),
      );
      expect(
        validateResolution({
          ...presentation,
          battleState: noneState,
          result: {},
          snapshot: {},
          session: resolutionSessionForProjectionState(noneState),
        }).valid,
      ).toBe(false);

      const validateAdmin = jsonSchemaValidator.getValidator(
        outputJsonSchema(AdminSessionProjectionSchema),
      );
      expect(
        validateAdmin({
          session: sessionForProjectionState(setupState),
          battle: {},
          characters: [],
        }).valid,
      ).toBe(false);
      expect(
        validateAdmin({
          session: sessionForProjectionState(activeState),
          battle: null,
          characters: [],
        }).valid,
      ).toBe(false);
    },
    schemaValidationTimeoutMs,
  );

  test(
    "accepts canonical active battle resolution projections",
    () => {
      const jsonSchemaValidator = new AjvJsonSchemaValidator();
      const validateResolution = jsonSchemaValidator.getValidator(
        mcpOutputJsonSchema(BattleResolutionOutputSchema),
      );
      const root = createMcpPlaySessionRoot();
      handleWireToolCall(
        root,
        "start_battle",
        battleToolWireArgs("start_battle", {
          battleId: "battle:resolution-contract",
          initiativeMode: "direct",
          companionAdmissions: [],
          initialCombatants: [
            {
              admissionSource: { kind: "encounterParticipant" },
              combatantId: "goblin",
              initiative: 10,
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_goblin_warrior",
            },
            {
              admissionSource: { kind: "encounterParticipant" },
              combatantId: "skeleton",
              initiative: 5,
              kind: "statBlock",
              ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
              statBlockId: "stat_block_skeleton",
            },
          ],
        }),
      );
      const activeSession = root.sessionStore.battleSession;
      if (activeSession === null) throw new Error("Expected active battle.");
      const presented = battlePresentedSnapshot(activeSession);
      if (Result.isFailure(presented))
        throw new Error("Expected presented snapshot.");
      const result = {
        tag: "resolved",
        session: activeSession,
        snapshot: snapshotBattle(activeSession.state),
        objectDamages: [],
      } satisfies BattleRuntimeResolutionResult;
      const activeResolution = Result.getOrThrow(
        battleResolutionPayload(root, result),
      );
      if (typeof activeResolution !== "object" || activeResolution === null) {
        throw new Error("Expected active resolution payload.");
      }
      const activeResolutionFixture = {
        ...activeResolution,
        availableActs: [],
        admittedSpellPresentations: [],
        presentedInterruptChoices: [],
      };

      const validateLifecycle = jsonSchemaValidator.getValidator(
        mcpOutputJsonSchema(BattleLifecycleOutputSchema),
      );
      const setupOutput = {
        ...presentation,
        battleState: setupState,
        snapshot: null,
        session: sessionForProjectionState(setupState),
      };
      const activeRosterOutput = {
        ...activeResolutionFixture,
        result: {
          tag: "combatantAdded" as const,
          combatantId: "combatant:projection-contract",
        },
      };
      const noBattleSuccessOutput = {
        ...presentation,
        battleState: noneState,
        snapshot: null,
        session: sessionForProjectionState(noneState),
      };

      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(BattleLifecycleOutputSchema)(setupOutput),
        ),
      ).toBe(true);
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(BattleLifecycleOutputSchema)(
            activeRosterOutput,
          ),
        ),
      ).toBe(true);
      expect(
        Result.isFailure(
          Schema.decodeUnknownResult(BattleLifecycleOutputSchema)(
            noBattleSuccessOutput,
          ),
        ),
      ).toBe(true);
      expect(validateLifecycle(setupOutput).valid).toBe(true);
      expect(validateLifecycle(noBattleSuccessOutput).valid).toBe(false);

      const activeValidation = validateResolution(activeResolutionFixture);
      expect(activeValidation.valid, activeValidation.errorMessage).toBe(true);
      expect(
        validateResolution({
          ...activeResolutionFixture,
          session: resolutionSessionForProjectionState(noneState),
        }).valid,
      ).toBe(false);
      expect(
        validateResolution({
          ...activeResolutionFixture,
          session: resolutionSessionForProjectionState(setupState),
        }).valid,
      ).toBe(false);
      expect(
        validateResolution({
          ...presentation,
          battleState: setupState,
          result: {},
          snapshot: {},
          session: resolutionSessionForProjectionState(setupState),
        }).valid,
      ).toBe(false);
    },
    schemaValidationTimeoutMs,
  );

  test("derives the session summary from the canonical snapshot", () => {
    const snapshot = {
      draftIds: [],
      characterIds: [characterId("character:projection-test")],
      selectedStatBlockId: null,
      battleState: {
        tag: "activeBattle",
        battleId: battleId("battle-projection-test"),
        currentActorId: combatantId("combatant:projection-test"),
      },
      transientBattleFills: null,
    } satisfies McpSessionSnapshot;

    expect(
      schemaJsonContent(Schema.toCodecIso(ListCharactersOutputSchema), {
        characters: [],
        session: mcpSessionSummary(snapshot),
      }).structuredContent,
    ).toEqual({
      characters: [],
      session: {
        draftIds: [],
        characterIds: ["character:projection-test"],
        selectedStatBlockId: null,
        battleState: {
          tag: "activeBattle",
          battleId: "battle-projection-test",
          currentActorId: "combatant:projection-test",
        },
        pendingBattleHoles: null,
      },
    });
  });

  test("rejects authored attack presentation in pending mechanical fills", () => {
    const actorId = combatantId("combatant:presentation-correlation");
    const scopeRef = battleAttackExecutionScopeRef(
      battleId("battle:presentation-correlation"),
      actorId,
      battleExecutionScopeOrdinal(0),
    );
    const subjectProcedureRef = battleAttackProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(0),
    );
    const presentationProcedureRef = battleAttackProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(1),
    );

    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(Schema.toType(McpSessionSnapshotSchema))({
          draftIds: [],
          characterIds: [],
          selectedStatBlockId: null,
          battleState: { tag: "none" },
          transientBattleFills: {
            subject: {
              tag: "action",
              action: "attack",
              actorId,
              procedureRef: subjectProcedureRef,
              attackAbility: "dex",
              attackDamageType: "force",
            },
            presentation: {
              kind: "attack",
              procedureRef: presentationProcedureRef,
              name: "Synthetic Arc",
            },
            fills: [],
          },
        }),
      ),
    ).toBe(true);
  });

  test("rejects authored unit presentation in pending mechanical fills", () => {
    const actorId = combatantId("combatant:spell-presentation-kind");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle:spell-presentation-kind"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );

    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(Schema.toType(McpSessionSnapshotSchema))({
          draftIds: [],
          characterIds: [],
          selectedStatBlockId: null,
          battleState: { tag: "none" },
          transientBattleFills: {
            subject: {
              tag: "actionSpell",
              actorId,
              procedureRef,
              mode: { tag: "cast" },
            },
            presentation: {
              kind: "unit",
              procedureRef,
              unitId: "synthetic_spell_mismatched_unit",
            },
            fills: [],
          },
        }),
      ),
    ).toBe(true);
  });

  test("rejects authored spell presentation in pending mechanical fills", () => {
    const actorId = combatantId("combatant:unit-presentation-kind");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle:unit-presentation-kind"),
        actorId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );

    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(Schema.toType(McpSessionSnapshotSchema))({
          draftIds: [],
          characterIds: [],
          selectedStatBlockId: null,
          battleState: { tag: "none" },
          transientBattleFills: {
            subject: {
              tag: "unitFeature",
              actorId,
              procedureRef,
            },
            presentation: {
              kind: "spell",
              procedureRef,
              invocation: {
                tag: "cantrip",
                spellId: "synthetic_unit_mismatched_spell",
                procedure: "spellAttackDamage",
              },
            },
            fills: [],
          },
        }),
      ),
    ).toBe(true);
  });
});
