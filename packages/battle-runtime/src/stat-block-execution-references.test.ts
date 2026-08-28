import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { Schema } from "effect";
import * as Either from "effect/Either";
import {
  NonNegativeInteger,
  movementFeet,
  resourceCount,
} from "@dnd/shared/types";
import {
  CreatureRechargeMinimumRollSchema,
  StatBlockProcedureOrdinalSchema,
  StatBlockProcedureResourceOrdinalSchema,
} from "@dnd/surface/surface/schema";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  BattleCheckpointFrontierEnvelopeSchema,
  BattleHoleSchema,
  BattleSnapshotSchema,
  BattleSubjectSchema,
  StatBlockExecutionSnapshotSchema,
  addBattleRuntimeCombatant,
  discoverBattleActCandidates,
  discoverBattleActs,
  endBattleRuntimeTurn,
  removeBattleRuntimeCombatants,
  snapshotBattle,
  startBattle,
  battleCheckpointFrontierEnvelope,
  type BattleState,
} from "./index.ts";
import {
  admittedStatBlockSource,
  resolveBattleSubject,
  battleId,
  characterSeed,
  fighterId,
  monsterResourceStatBlock,
  isNonSpellExecutableProcedureEntryOfKind,
  projectedStatBlockRuntimeSource,
  statBlockCatalog,
  startBattleRight,
  statBlockCreatureInit,
  statBlockRecord,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";
import {
  BattleCharacterExecutionScopeRef,
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
  BattleStatBlockExecutionScopeRef,
  battleActiveEffectExecutionOrdinal,
  battleCharacterExecutionScopeRef,
  battleCharacterExecutionScopeRefOrdinalIsBefore,
  battleActiveEffectExecutionRef,
  battleActiveEffectExecutionRefOrdinalIsBefore,
  battleAttackExecutionScopeRef,
  battleAttackExecutionScopeRefOrdinalIsBefore,
  battleExecutionScopeCursor,
  battleProcedureExecutionRef,
  battleProcedureExecutionCursor,
  battleProcedureExecutionRefOrdinalIsBefore,
  battleResourcePoolExecutionRef,
  battleExecutionScopeOrdinal,
  battleStatBlockExecutionScopeRef,
  battleStatBlockExecutionScopeRefOrdinalIsBefore,
  battleStatBlockExecutionScopeRefIsWellFormed,
  combatantId,
  type BattleStatBlockExecutionScopeRef as BattleStatBlockExecutionScopeReference,
  type CombatantId,
} from "./identity.ts";
import {
  restoreStatBlockExecutionAdmission,
  restoreStatBlockExecutionAdmissions,
  spendStatBlockProcedureResources,
  statBlockProcedureBinding,
  statBlockExecutionAdmissionCohort,
  statBlockExecutionSnapshot,
  statBlockBonusActionOptionBindings,
  type StatBlockExecutionAdmission,
  type StatBlockExecutionState,
} from "./stat-block-execution.ts";
import { opportunityAttackReactionChoices } from "./battle-reducer/dispatcher.ts";
import {
  addBattleCombatant,
  removeBattleCombatants,
} from "./battle-reducer/api-lifecycle.ts";
import { statBlockAttackProcedureSection } from "./battle-reducer/statblock.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";

const isolatedExecutionBattleId = battleId(
  "battle-stat-block-isolated-execution-admission",
);

function isolatedStatBlockAdmissions(
  actorId: CombatantId,
  statBlocks: readonly StatBlockRecord[],
): readonly StatBlockExecutionAdmission[] {
  return statBlockExecutionAdmissionCohort(
    isolatedExecutionBattleId,
    actorId,
    statBlocks.map(admittedStatBlockSource),
    battleExecutionScopeOrdinal(0),
  ).admissions;
}

function procedureOrdinal(value: number) {
  return Schema.decodeSync(StatBlockProcedureOrdinalSchema)(value);
}

function resourceOrdinal(value: number) {
  return Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(value);
}

function requireProcedureActions(
  record: StatBlockRecord,
): readonly [StatBlockProcedureEntry, ...StatBlockProcedureEntry[]] {
  const actions = record.statBlock.actions;
  if (actions === undefined) {
    throw new Error("Expected Stat Block action procedures.");
  }
  return actions;
}

function mapNonEmpty<T, U>(
  values: readonly [T, ...T[]],
  map: (value: T) => U,
): readonly [U, ...U[]] {
  const [first, ...rest] = values;
  return [map(first), ...rest.map(map)];
}

test("restore retains an empty Stat Block resource graph", () => {
  const actorId = combatantId("execution-ref-empty-resources");
  const source = projectedStatBlockRuntimeSource(statBlockRecord());
  expect(source.resources).toEqual([]);
  const admission = isolatedStatBlockAdmissions(actorId, [
    statBlockRecord(),
  ])[0];
  if (admission === undefined) {
    throw new Error("Expected the synthetic Stat Block admission.");
  }

  const restored = restoreStatBlockExecutionAdmission(
    isolatedExecutionBattleId,
    actorId,
    source,
    statBlockExecutionSnapshot(admission.execution),
  );

  expect(Either.isRight(restored)).toBe(true);
  if (Either.isLeft(restored)) return;
  expect(restored.right.statBlock.resources).toEqual([]);
});

function executionReferenceView(
  state: BattleState,
  actorId: CombatantId,
): StatBlockExecutionState {
  const combatant = state.combatants.get(actorId);
  if (combatant?.origin.kind !== "statBlock") {
    throw new Error("Expected a Stat Block combatant.");
  }
  return combatant.origin.execution;
}

describe("Stat Block execution references", () => {
  test("orders every execution-reference family against its allocation cursor", () => {
    const ownerBattleId = battleId("battle-reference-ordinal-ordering");
    const ownerId = combatantId("reference-ordinal-owner");
    const ordinal = battleExecutionScopeOrdinal(0);
    const nextScope = battleExecutionScopeCursor(
      battleExecutionScopeOrdinal(1),
    );
    const characterScope = battleCharacterExecutionScopeRef(
      ownerBattleId,
      ownerId,
      ordinal,
    );
    const statBlockScope = battleStatBlockExecutionScopeRef(
      ownerBattleId,
      ownerId,
      ordinal,
    );
    const attackScope = battleAttackExecutionScopeRef(
      ownerBattleId,
      ownerId,
      ordinal,
    );
    const procedureRef = battleProcedureExecutionRef(
      characterScope,
      NonNegativeInteger(0),
    );
    const activeEffectRef = battleActiveEffectExecutionRef(
      JSON.stringify({
        kind: "activeEffectOccurrence",
        ownerScopeRef: characterScope,
        ordinal: 0,
      }),
    );

    expect(
      battleCharacterExecutionScopeRefOrdinalIsBefore(
        characterScope,
        nextScope,
      ),
    ).toBe(true);
    expect(
      battleStatBlockExecutionScopeRefOrdinalIsBefore(
        statBlockScope,
        nextScope,
      ),
    ).toBe(true);
    expect(
      battleAttackExecutionScopeRefOrdinalIsBefore(attackScope, nextScope),
    ).toBe(true);
    expect(
      battleProcedureExecutionRefOrdinalIsBefore(
        procedureRef,
        characterScope,
        battleProcedureExecutionCursor(1),
      ),
    ).toBe(true);
    expect(
      battleActiveEffectExecutionRefOrdinalIsBefore(
        activeEffectRef,
        characterScope,
        battleActiveEffectExecutionOrdinal(1),
      ),
    ).toBe(true);
    expect(
      battleCharacterExecutionScopeRefOrdinalIsBefore(
        characterScope,
        undefined,
      ),
    ).toBe(false);
    expect(
      battleStatBlockExecutionScopeRefOrdinalIsBefore(
        statBlockScope,
        undefined,
      ),
    ).toBe(false);
    expect(
      battleAttackExecutionScopeRefOrdinalIsBefore(attackScope, undefined),
    ).toBe(false);
    expect(
      battleProcedureExecutionRefOrdinalIsBefore(
        procedureRef,
        statBlockScope,
        battleProcedureExecutionCursor(1),
      ),
    ).toBe(false);
    expect(
      battleActiveEffectExecutionRefOrdinalIsBefore(
        activeEffectRef,
        statBlockScope,
        battleActiveEffectExecutionOrdinal(1),
      ),
    ).toBe(false);
  });
  test("offers only rolled damage when structured attack damage omits a static value", () => {
    const base = statBlockRecord();
    const actions = base.statBlock.actions;
    if (actions === undefined) {
      throw new Error("Expected Stat Block attacks.");
    }
    const attacks = actions.filter(
      (entry) =>
        entry.kind === "executable" && entry.procedure.kind === "attack_roll",
    );
    const withoutStaticDamage = (
      entry: (typeof actions)[number],
    ): (typeof actions)[number] => {
      if (
        entry.kind !== "executable" ||
        entry.procedure.kind !== "attack_roll"
      ) {
        return entry;
      }
      return {
        ...entry,
        procedure: {
          ...entry.procedure,
          onHit: mapNonEmpty(entry.procedure.onHit, (effect) => {
            if (
              effect.kind !== "damage" ||
              effect.amount.kind !== "fixed" ||
              !("expr" in effect.amount) ||
              !("static" in effect.amount)
            ) {
              return effect;
            }
            const { static: _static, ...amount } = effect.amount;
            return { ...effect, amount };
          }),
        },
      };
    };
    const rolledOnly = {
      ...base,
      statBlock: {
        ...base.statBlock,
        actions: mapNonEmpty(actions, withoutStaticDamage),
      },
    } satisfies StatBlockRecord;
    const [admission] = isolatedStatBlockAdmissions(
      combatantId("rolled-only-stat-block"),
      [rolledOnly],
    );
    expect(
      statBlockAttackActionOptions(admission.execution).map(
        ({ damageNotation }) => damageNotation,
      ),
    ).toEqual([...attacks.map(() => "rolled"), "static"]);
  });

  test("rejects noncanonical replay occurrence references", () => {
    const activeEffectRef = battleActiveEffectExecutionRef(
      JSON.stringify({
        kind: "activeEffectOccurrence",
        ownerScopeRef: battleCharacterExecutionScopeRef(
          battleId("battle-reference-codec"),
          combatantId("character-a"),
          battleExecutionScopeOrdinal(0),
        ),
        ordinal: 0,
      }),
    );
    expect(BattleActiveEffectExecutionRef.make(activeEffectRef)).toBe(
      activeEffectRef,
    );
    expect(() =>
      BattleActiveEffectExecutionRef.make("active-effect-0"),
    ).toThrow();
    expect(() =>
      BattleActiveEffectExecutionRef.make(
        JSON.stringify({
          kind: "activeEffectOccurrence",
          battleId: "battle-reference-codec",
          ownerId: "character-a",
          ordinal: 0,
        }),
      ),
    ).toThrow();
    expect(() =>
      BattleActiveEffectExecutionRef.make(
        JSON.stringify({
          battleId: "battle-reference-codec",
          kind: "activeEffectOccurrence",
          ownerId: "character-a",
          ordinal: 0,
          authoredId: "synthetic-effect",
        }),
      ),
    ).toThrow();
  });

  test("allocates exact character procedure references without authored identity", () => {
    const scopeRef = battleCharacterExecutionScopeRef(
      battleId("battle-character-execution"),
      combatantId("character-a"),
      battleExecutionScopeOrdinal(0),
    );
    const first = battleProcedureExecutionRef(scopeRef, NonNegativeInteger(0));
    const second = battleProcedureExecutionRef(scopeRef, NonNegativeInteger(1));

    expect(BattleCharacterExecutionScopeRef.make(scopeRef)).toBe(scopeRef);
    expect(() => BattleStatBlockExecutionScopeRef.make(scopeRef)).toThrow();
    expect(BattleProcedureExecutionRef.make(first)).toBe(first);
    expect(first).not.toBe(second);
    const characterResourcePoolRef = JSON.stringify({
      scopeRef,
      kind: "resourcePool",
      ordinal: 0,
    });
    expect(BattleResourcePoolExecutionRef.make(characterResourcePoolRef)).toBe(
      characterResourcePoolRef,
    );
    expect(JSON.parse(first)).toEqual({
      scopeRef,
      kind: "procedure",
      ordinal: 0,
    });
    expect(() =>
      BattleCharacterExecutionScopeRef.make(
        JSON.stringify({
          battleId: "battle-character-execution",
          combatantId: "character-a",
          kind: "characterExecution",
          ordinal: 0,
          authoredUnitId: "synthetic-feature",
        }),
      ),
    ).toThrow();
  });

  test("binds spell discovery and replay to character procedure references", () => {
    const session = wizardVsSkeletonBattle();
    const state = session.state;
    const spellActs = discoverBattleActs(session).flatMap((act) =>
      act.subject.tag === "actionSpell"
        ? [{ ...act, subject: act.subject }]
        : [],
    );
    const magicMissileActs = spellActs.filter(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "magic_missile",
    );
    const rayOfFrostActs = spellActs.filter(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "ray_of_frost",
    );
    const magicMissileRef = magicMissileActs[0]?.subject.procedureRef;
    const rayOfFrostRef = rayOfFrostActs[0]?.subject.procedureRef;
    const wizard = state.combatants.get(wizardId);
    if (wizard?.origin.kind !== "character") {
      throw new Error("Expected the Wizard character origin.");
    }
    const liveCharacterBindings = JSON.stringify(
      wizard.origin.execution.procedureBindings,
    );
    expect(liveCharacterBindings).not.toContain("Magic Missile");
    expect(liveCharacterBindings).not.toContain("Ray of Frost");
    expect(liveCharacterBindings).not.toContain('"provenance"');
    expect(liveCharacterBindings).not.toContain('"description"');

    expect(magicMissileRef).toBeDefined();
    expect(rayOfFrostRef).toBeDefined();
    expect(magicMissileRef).not.toBe(rayOfFrostRef);
    expect(
      wizard.origin.execution.procedureBindings.find(
        (binding) => binding.procedureRef === magicMissileRef,
      ),
    ).toMatchObject({
      procedureRef: magicMissileRef,
      procedure: {
        kind: "spellInvocation",
        execution: { procedure: "repeatedDamageAllocation" },
      },
    });
    expect(
      wizard.origin.execution.procedureBindings.find(
        (binding) => binding.procedureRef === rayOfFrostRef,
      ),
    ).toMatchObject({
      procedureRef: rayOfFrostRef,
      procedure: {
        kind: "spellInvocation",
        execution: { procedure: "spellAttackDamage" },
      },
    });
    expect(
      magicMissileActs.every(
        (act) => act.subject.procedureRef === magicMissileRef,
      ),
    ).toBe(true);
    const snapshot = Schema.decodeUnknownSync(BattleSnapshotSchema)(
      Schema.encodeSync(BattleSnapshotSchema)(snapshotBattle(state)),
    );
    const wizardSnapshot = snapshot.combatants.find(
      (combatant) => combatant.combatantId === wizardId,
    );
    expect(wizardSnapshot?.origin).toMatchObject({
      kind: "character",
      execution: {
        procedureBindings: expect.arrayContaining([
          {
            procedureRef: magicMissileRef,
            procedure: {
              kind: "spellInvocation",
              executionFacts: {
                kind: "actionSpell",
                familiarTouchDelivery: false,
                readiedSpellCompatible: true,
              },
            },
          },
          {
            procedureRef: rayOfFrostRef,
            procedure: {
              kind: "spellInvocation",
              executionFacts: {
                kind: "actionSpell",
                familiarTouchDelivery: false,
                readiedSpellCompatible: true,
              },
            },
          },
        ]),
      },
    });
    const serializedCharacterBindings = JSON.stringify(
      wizardSnapshot?.origin.kind === "character"
        ? wizardSnapshot.origin.execution.procedureBindings
        : [],
    );
    expect(serializedCharacterBindings).not.toContain("magic_missile");
    expect(serializedCharacterBindings).not.toContain("ray_of_frost");
    expect(serializedCharacterBindings).not.toContain("Magic Missile");
    expect(serializedCharacterBindings).not.toContain("Ray of Frost");

    const castAct = magicMissileActs.find(
      (act) => act.subject.mode.tag === "cast",
    );
    if (castAct === undefined || castAct.subject.procedureRef === undefined) {
      throw new Error("Expected a bound Magic Missile cast act.");
    }
    expect(
      resolveBattleSubject({
        state,
        subject: castAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      subject: { actorId: wizardId, procedureRef: magicMissileRef },
    });
  });

  test("rejects execution references with non-canonical extra fields", () => {
    const ownerBattleId = battleId("battle-execution-ref-forged-owner");
    const ownerId = combatantId("execution-ref-forged-owner");
    const forgedScopeRef = JSON.stringify({
      battleId: ownerBattleId,
      combatantId: ownerId,
      kind: "statBlockExecution",
      ordinal: 0,
      name: "Synthetic Authored Label",
    }) as BattleStatBlockExecutionScopeReference;

    expect(battleStatBlockExecutionScopeRefIsWellFormed(forgedScopeRef)).toBe(
      false,
    );
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleStatBlockExecutionScopeRef)(
          forgedScopeRef,
        ),
      ),
    ).toBe(true);
    const canonicalScopeRef = battleStatBlockExecutionScopeRef(
      ownerBattleId,
      ownerId,
      battleExecutionScopeOrdinal(0),
    );
    const reorderedScopeRef = JSON.stringify({
      kind: "statBlockExecution",
      ordinal: 0,
      combatantId: ownerId,
      battleId: ownerBattleId,
    }) as BattleStatBlockExecutionScopeReference;
    expect(canonicalScopeRef).not.toBe(reorderedScopeRef);
    expect(
      battleStatBlockExecutionScopeRefIsWellFormed(reorderedScopeRef),
    ).toBe(false);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSubjectSchema)({
          tag: "action",
          actorId: ownerId,
          action: "attack",
          procedureRef: "unavailable:attack",
        }),
      ),
    ).toBe(true);
    expect(() =>
      Schema.decodeUnknownSync(BattleResourcePoolExecutionRef)(
        JSON.stringify({
          scopeRef: forgedScopeRef,
          kind: "resourcePool",
          ordinal: 0,
          extra: "synthetic",
        }),
      ),
    ).toThrow("Invalid canonical Battle resource-pool execution ref.");
  });

  test("allocates deterministic combatant-scoped procedure and resource-pool references", () => {
    const firstId = combatantId("execution-ref-monster-a");
    const secondId = combatantId("execution-ref-monster-b");
    const statBlock = monsterResourceStatBlock();
    const input = {
      battleId: battleId("battle-stat-block-execution-reference-allocation"),
      combatants: [
        statBlockCreatureInit({
          combatantId: firstId,
          initiative: 20,
          statBlock,
        }),
        statBlockCreatureInit({
          combatantId: secondId,
          initiative: 10,
          statBlock,
        }),
      ],
    } as const;

    const firstBattle = startBattleRight(input);
    const readmittedBattle = startBattleRight(input);
    const independentBattle = startBattleRight({
      ...input,
      battleId: battleId(
        "battle-stat-block-execution-reference-independent-case",
      ),
    });
    const first = executionReferenceView(firstBattle, firstId);
    const second = executionReferenceView(firstBattle, secondId);
    const readmitted = executionReferenceView(readmittedBattle, firstId);
    const independent = executionReferenceView(independentBattle, firstId);

    expect(first).toEqual(readmitted);
    expect(independent.scopeRef).not.toBe(first.scopeRef);
    expect(
      first.procedureBindings.map((binding) => binding.procedureRef),
    ).not.toEqual(
      second.procedureBindings.map((binding) => binding.procedureRef),
    );
    expect(first.resourcePools.map((pool) => pool.resourcePoolRef)).not.toEqual(
      second.resourcePools.map((pool) => pool.resourcePoolRef),
    );
    const allocatedReferences = [
      ...first.procedureBindings.map((binding) => binding.procedureRef),
      ...first.resourcePools.map((pool) => pool.resourcePoolRef),
    ];
    expect(allocatedReferences.join("|")).not.toContain("Cinder Breath");
    expect(allocatedReferences.join("|")).not.toContain("Dread Gaze");
    expect(allocatedReferences.join("|")).not.toContain(statBlock.id);
    const replaySubject = discoverBattleActCandidates(firstBattle).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.actorId === firstId &&
        act.subject.procedureRef !== undefined &&
        act.subject.statBlockDamageNotation === undefined,
    )?.subject;
    if (replaySubject?.tag !== "action" || replaySubject.action !== "attack") {
      throw new Error("Expected a rolled Stat Block attack replay subject.");
    }
    expect(
      resolveBattleSubject({
        state: independentBattle,
        subject: replaySubject,
        fills: [],
      }).tag,
    ).toBe("invalid");
  });

  test("rejects mixed Bonus Action options and allocates supported-only rest-recharge ownership", () => {
    const base = statBlockRecord();
    const statBlock: StatBlockRecord = {
      ...base,
      id: parseSharedStatBlockId("synthetic_rest_recharge_action_options"),
      name: "Synthetic Rest-Recharge Action Options",
      provenance: {
        kind: "synthetic-test",
        section: "rest-recharge-action-options",
      },
      statBlock: {
        ...base.statBlock,
        resources: [
          {
            ordinal: Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(
              1,
            ),
            ownership: "each",
            limit: { kind: "recharge_after_rest", rest: "short_or_long" },
          },
        ],
        bonusActions: [
          {
            kind: "executable",
            procedureOrdinal: Schema.decodeSync(
              StatBlockProcedureOrdinalSchema,
            )(1),
            procedure: {
              kind: "action_option",
              name: "Withdraw",
              options: ["disengage"],
            },
            resourceRefs: {
              kind: "some",
              ordinals: [
                Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(1),
              ],
            },
          },
          {
            kind: "executable",
            procedureOrdinal: Schema.decodeSync(
              StatBlockProcedureOrdinalSchema,
            )(2),
            procedure: {
              kind: "action_option",
              name: "Overextended Withdrawal",
              options: ["disengage", "dash"],
            },
            resourceRefs: { kind: "none" },
          },
        ],
      },
    };
    const bonusActions = statBlock.statBlock.bonusActions;
    if (bonusActions === undefined || bonusActions.length !== 2) {
      throw new Error(
        "Expected supported and unsupported Bonus Action options.",
      );
    }
    const [supportedBonusAction, unsupportedBonusAction] = bonusActions;
    const projected = projectAuthoredStatBlock(statBlock);
    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(projected.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [
        {
          section: "bonusActions",
          procedureOrdinal: unsupportedBonusAction.procedureOrdinal,
        },
      ],
    });
    const supportedOnlyStatBlock: StatBlockRecord = {
      ...statBlock,
      statBlock: {
        ...statBlock.statBlock,
        bonusActions: [supportedBonusAction],
      },
    };
    const actorId = combatantId("execution-ref-rest-recharge-owner");
    const admission = isolatedStatBlockAdmissions(actorId, [
      supportedOnlyStatBlock,
    ])[0];
    if (admission === undefined) {
      throw new Error("Expected the synthetic Stat Block admission.");
    }

    const [binding] = statBlockBonusActionOptionBindings(admission.execution);
    if (binding === undefined) {
      throw new Error("Expected the supported Bonus Action binding.");
    }
    expect(binding.procedure.standardActions).toEqual(["disengage"]);
    expect(
      admission.execution.procedureBindings.filter(
        (candidate) => candidate.procedure.kind === "bonusActionOption",
      ),
    ).toHaveLength(1);
    expect(binding.resourcePoolRefs).toHaveLength(1);
    expect(admission.execution.resourcePools).toContainEqual({
      resourcePoolRef: binding.resourcePoolRefs[0],
      kind: "recharge_after_rest",
      ownership: "each",
      available: true,
    });

    const spentExecution = spendStatBlockProcedureResources(
      admission.execution,
      binding.procedureRef,
    );
    expect(spentExecution.resourcePools).toContainEqual({
      resourcePoolRef: binding.resourcePoolRefs[0],
      kind: "recharge_after_rest",
      ownership: "each",
      available: false,
    });
    const restoredSource = projectedStatBlockRuntimeSource(
      supportedOnlyStatBlock,
    );
    const restored = restoreStatBlockExecutionAdmission(
      isolatedExecutionBattleId,
      actorId,
      restoredSource,
      statBlockExecutionSnapshot(spentExecution),
    );
    expect(Either.isRight(restored)).toBe(true);
    if (Either.isLeft(restored)) {
      throw new Error("Expected the spent rest-recharge state to restore.");
    }
    expect(restored.right.execution.resourcePools).toEqual(
      spentExecution.resourcePools,
    );
    expect(restored.right.statBlock.resources).toEqual(
      restoredSource.resources,
    );
  });

  test("does not reuse an execution scope when a combatant id is re-admitted", () => {
    const actorId = combatantId("execution-ref-readmitted-combatant");
    const actorInit = statBlockCreatureInit({
      combatantId: actorId,
      initiative: 20,
      statBlock: monsterResourceStatBlock(),
    });
    const battle = startBattleRight({
      battleId: battleId("battle-stat-block-readmitted-execution-scope"),
      combatants: [actorInit, characterSeed({ initiative: 10 })],
    });
    expect(battle.executionScopeCursors.has(fighterId)).toBe(true);
    const originalExecution = executionReferenceView(battle, actorId);
    const originalRef = originalExecution.procedureBindings[0]?.procedureRef;
    if (originalRef === undefined) {
      throw new Error("Expected an original Stat Block procedure.");
    }
    const removed = removeBattleCombatants({
      state: battle,
      combatantIds: [actorId],
    });
    if (Either.isLeft(removed)) {
      throw new Error("Expected the Stat Block combatant to be removed.");
    }
    const serializedAfterRemoval = Schema.decodeUnknownSync(
      BattleSnapshotSchema,
    )(Schema.encodeSync(BattleSnapshotSchema)(snapshotBattle(removed.right)));
    expect(serializedAfterRemoval).not.toHaveProperty("executionScopeCursors");
    expect(serializedAfterRemoval).not.toHaveProperty(
      "retiredExecutionScopeAllocations",
    );
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...serializedAfterRemoval,
        executionScopeCursors: [],
      }),
    ).toThrow();
    const restoredAfterRemoval: BattleState = {
      ...removed.right,
      executionScopeCursors: new Map(removed.right.executionScopeCursors),
    };
    const characterWithoutFormsId = combatantId(
      "execution-ref-character-without-forms",
    );
    const addedCharacter = addBattleCombatant({
      state: removed.right,
      combatant: characterSeed({
        combatantId: characterWithoutFormsId,
        initiative: 5,
      }),
    });
    if (Either.isLeft(addedCharacter)) {
      throw new Error("Expected a character without forms to be added.");
    }
    expect(
      addedCharacter.right.executionScopeCursors.has(characterWithoutFormsId),
    ).toBe(true);
    const removedCharacter = removeBattleCombatants({
      state: addedCharacter.right,
      combatantIds: [characterWithoutFormsId],
    });
    if (Either.isLeft(removedCharacter)) {
      throw new Error("Expected the character to be removed.");
    }
    const retiredCharacterAllocation =
      removedCharacter.right.executionScopeCursors.get(characterWithoutFormsId);
    if (
      retiredCharacterAllocation?.kind !== "retired" ||
      retiredCharacterAllocation.ownership.kind !== "character"
    ) {
      throw new Error("Expected the retired character allocation.");
    }
    expect(retiredCharacterAllocation).toMatchObject({
      ownership: {
        kind: "character",
        characterScopeRef: expect.any(String),
        attackScopeRef: expect.any(String),
        formScopeRefs: [],
      },
    });
    const readmitted = addBattleCombatant({
      state: restoredAfterRemoval,
      combatant: actorInit,
    });
    if (Either.isLeft(readmitted)) {
      throw new Error("Expected the Stat Block combatant to be re-admitted.");
    }
    const readmittedExecution = executionReferenceView(
      readmitted.right,
      actorId,
    );

    expect(readmittedExecution.scopeRef).not.toBe(originalExecution.scopeRef);
    expect(
      readmittedExecution.procedureBindings.map(
        (binding) => binding.procedureRef,
      ),
    ).not.toContain(originalRef);
    expect(
      statBlockProcedureBinding(readmittedExecution, originalRef),
    ).toBeUndefined();
  });

  test("session-aware roster changes update authored context atomically", () => {
    const initialMonsterId = combatantId("roster-context-monster");
    const initial = startBattle({
      battleId: battleId("battle-runtime-roster-context"),
      combatants: [
        statBlockCreatureInit({
          combatantId: initialMonsterId,
          initiative: 5,
          statBlock: monsterResourceStatBlock(),
        }),
      ],
    });
    if (Either.isLeft(initial)) {
      throw new Error("Expected the initial runtime session.");
    }
    const addedCharacterId = combatantId("roster-context-character");
    const added = addBattleRuntimeCombatant({
      session: initial.right,
      combatant: characterSeed({
        combatantId: addedCharacterId,
        initiative: 10,
        spellcasting: wizardSpellcasting(),
      }),
    });
    if (Either.isLeft(added)) {
      throw new Error("Expected the character runtime admission.");
    }
    expect(added.right.context.characters.has(addedCharacterId)).toBe(true);
    expect(
      added.right.context.characters.get(addedCharacterId)
        ?.spellPresentationSources.length,
    ).toBeGreaterThan(0);
    const advanced = endBattleRuntimeTurn({
      session: added.right,
      actorId: initialMonsterId,
    });
    if (advanced.tag !== "resolved") {
      throw new Error("Expected the added character's turn.");
    }
    expect(
      discoverBattleActs(advanced.session).some(
        (act) =>
          act.subject.actorId === addedCharacterId &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "magic_missile",
      ),
    ).toBe(true);

    const removed = removeBattleRuntimeCombatants({
      session: advanced.session,
      combatantIds: [addedCharacterId],
    });
    if (Either.isLeft(removed)) {
      throw new Error("Expected the character runtime removal.");
    }
    expect(removed.right.context.characters.has(addedCharacterId)).toBe(false);
    expect(removed.right.state.combatants.has(addedCharacterId)).toBe(false);
  });

  test("does not reuse a character execution scope after re-admission", () => {
    const battle = wizardVsSkeletonBattle().state;
    const original = battle.combatants.get(wizardId);
    if (original?.origin.kind !== "character") {
      throw new Error("Expected an admitted character execution.");
    }
    const removed = removeBattleCombatants({
      state: battle,
      combatantIds: [wizardId],
    });
    if (Either.isLeft(removed)) {
      throw new Error("Expected the character to be removed.");
    }
    const readmitted = addBattleCombatant({
      state: removed.right,
      combatant: characterSeed({ combatantId: wizardId, initiative: 20 }),
    });
    if (Either.isLeft(readmitted)) {
      throw new Error("Expected the character to be re-admitted.");
    }
    const next = readmitted.right.combatants.get(wizardId);
    if (next?.origin.kind !== "character") {
      throw new Error("Expected a re-admitted character execution.");
    }
    expect(next.origin.execution.scopeRef).not.toBe(
      original.origin.execution.scopeRef,
    );
  });

  test("keeps identical procedure occurrences and their limited-use pools distinct", () => {
    const actorId = combatantId("execution-ref-identical-procedures");
    const base = monsterResourceStatBlock();
    const actions = requireProcedureActions(base);
    const cinderBreath = actions.find(
      (candidate) =>
        candidate.kind === "executable" &&
        candidate.procedure.kind === "attack_roll" &&
        candidate.procedure.name === "Cinder Breath",
    );
    const dreadGaze = actions.find(
      (candidate) =>
        candidate.kind === "executable" &&
        candidate.procedure.kind === "attack_roll" &&
        candidate.procedure.name === "Dread Gaze",
    );
    if (
      cinderBreath?.kind !== "executable" ||
      cinderBreath.procedure.kind !== "attack_roll" ||
      dreadGaze?.kind !== "executable" ||
      dreadGaze.procedure.kind !== "attack_roll"
    ) {
      throw new Error("Expected recharge attack fixtures.");
    }
    const echoBreath = {
      ...dreadGaze,
      procedureOrdinal: procedureOrdinal(2),
      procedure: { ...dreadGaze.procedure, name: "Echo Breath" },
      resourceRefs: {
        kind: "some" as const,
        ordinals: [resourceOrdinal(1)] as const,
      },
    };
    const multiattackEntry = {
      kind: "executable" as const,
      procedureOrdinal: procedureOrdinal(3),
      procedure: {
        kind: "multiattack" as const,
        name: "Synthetic Limited Multiattack",
        dispatches: [
          {
            procedureOrdinal: procedureOrdinal(1),
            count: { kind: "literal" as const, value: 1 },
          },
        ] as const,
      },
      resourceRefs: { kind: "none" as const },
    };
    const statBlock: StatBlockRecord = {
      ...base,
      statBlock: {
        ...base.statBlock,
        actions: [cinderBreath, echoBreath, multiattackEntry],
        resources: [
          {
            ...base.statBlock.resources![0],
            ordinal: resourceOrdinal(1),
            ownership: "each",
          },
        ],
      },
    };
    const battle = startBattleRight({
      battleId: battleId("battle-stat-block-identical-execution-occurrences"),
      combatants: [
        statBlockCreatureInit({
          combatantId: actorId,
          initiative: 20,
          statBlock,
        }),
        characterSeed({ initiative: 10 }),
      ],
    });
    const execution = executionReferenceView(battle, actorId);
    const attackBindings = execution.procedureBindings.filter(
      (binding) => binding.procedure.kind === "attack",
    );
    const limitedAttackBindings = attackBindings.filter(
      (binding) => binding.resourcePoolRefs.length === 1,
    );

    expect(
      new Set(attackBindings.map((binding) => binding.procedureRef)).size,
    ).toBe(attackBindings.length);
    expect(
      new Set(
        limitedAttackBindings.flatMap((binding) => binding.resourcePoolRefs),
      ).size,
    ).toBe(limitedAttackBindings.length);
    const limitedBinding = limitedAttackBindings[0];
    const multiattackBinding = execution.procedureBindings.find(
      (binding) => binding.procedure.kind === "multiattack",
    );
    if (
      limitedBinding === undefined ||
      multiattackBinding?.procedure.kind !== "multiattack"
    ) {
      throw new Error("Expected limited attack and Multiattack bindings.");
    }
    const snapshot = statBlockExecutionSnapshot(execution);
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...snapshot,
        procedureBindings: snapshot.procedureBindings.map((binding) =>
          binding.procedureRef === multiattackBinding.procedureRef
            ? {
                ...binding,
                procedure: {
                  kind: "multiattack",
                  dispatchProcedureRefs: [
                    limitedBinding.procedureRef,
                    limitedBinding.procedureRef,
                  ],
                },
              }
            : binding,
        ),
      }),
    ).toThrow();
  });

  test("binds authored Multiattack dispatches independently of intrinsic Unarmed Strike", () => {
    const actorId = combatantId("authored-unarmed-strike-multiattack");
    const base = statBlockRecord();
    const actions = requireProcedureActions(base);
    const scimitar = actions.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "attack_roll" &&
        entry.procedure.name === "Scimitar",
    );
    if (
      scimitar?.kind !== "executable" ||
      scimitar.procedure.kind !== "attack_roll"
    ) {
      throw new Error("Expected a Scimitar attack fixture.");
    }
    const shortbow = actions[1];
    if (shortbow === undefined) {
      throw new Error("Expected the second Goblin Warrior action.");
    }
    const unarmedStrike = {
      ...scimitar,
      procedure: { ...scimitar.procedure, name: "Unarmed Strike" },
    };
    const multiattackEntry = {
      kind: "executable" as const,
      procedureOrdinal: procedureOrdinal(3),
      procedure: {
        kind: "multiattack" as const,
        name: "Synthetic Unarmed Multiattack",
        dispatches: [
          {
            procedureOrdinal: procedureOrdinal(1),
            count: { kind: "literal" as const, value: 1 },
          },
        ] as const,
      },
      resourceRefs: { kind: "none" as const },
    };
    const battle = startBattleRight({
      battleId: battleId("battle-authored-unarmed-strike-multiattack"),
      combatants: [
        statBlockCreatureInit({
          combatantId: actorId,
          initiative: 20,
          statBlock: {
            ...base,
            statBlock: {
              ...base.statBlock,
              actions: [unarmedStrike, shortbow, multiattackEntry],
            },
          },
        }),
        characterSeed({ initiative: 10 }),
      ],
    });
    const execution = executionReferenceView(battle, actorId);
    const authoredAttack = execution.procedureBindings.find(
      (binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.attack.onHit.some(
          (effect) =>
            effect.kind === "damage" &&
            effect.amount.kind === "fixed" &&
            effect.amount.static === 5,
        ),
    );
    const multiattack = execution.procedureBindings.find(
      (binding) => binding.procedure.kind === "multiattack",
    );
    if (
      authoredAttack === undefined ||
      multiattack?.procedure.kind !== "multiattack"
    ) {
      throw new Error("Expected authored attack and Multiattack bindings.");
    }
    expect(multiattack.procedure.dispatchProcedureRefs).toEqual([
      authoredAttack.procedureRef,
    ]);
  });

  test("binds distinct Legendary Action procedures to one explicit shared pool", () => {
    const actorId = combatantId("execution-ref-shared-pool");
    const base = monsterResourceStatBlock();
    const actions = requireProcedureActions(base);
    const tailSwipe = base.statBlock.legendaryActions?.entries[0];
    const actionAttack = actions[0];
    const secondAction = actions[1];
    if (
      tailSwipe?.kind !== "executable" ||
      tailSwipe.procedure.kind !== "attack_roll" ||
      actionAttack?.kind !== "executable" ||
      actionAttack.procedure.kind !== "attack_roll" ||
      secondAction === undefined
    ) {
      throw new Error("Expected action and Legendary Action fixtures.");
    }
    const multiattackEntry = {
      kind: "executable" as const,
      procedureOrdinal: procedureOrdinal(3),
      procedure: {
        kind: "multiattack" as const,
        name: "Synthetic Multiattack",
        dispatches: [
          {
            procedureOrdinal: procedureOrdinal(1),
            count: { kind: "literal" as const, value: 1 },
          },
        ] as const,
      },
      resourceRefs: { kind: "none" as const },
    };
    const wingSweep = {
      ...tailSwipe,
      procedureOrdinal: procedureOrdinal(2),
      procedure: { ...tailSwipe.procedure, name: "Wing Sweep" },
    };
    const statBlock: StatBlockRecord = {
      ...base,
      statBlock: {
        ...base.statBlock,
        actions: [actionAttack, secondAction, multiattackEntry],
        legendaryActions: {
          ...base.statBlock.legendaryActions,
          uses: { kind: "fixed", uses: 2 },
          entries: [tailSwipe, wingSweep],
        },
      },
    };
    const battle = startBattleRight({
      battleId: battleId("battle-stat-block-shared-resource-pool"),
      combatants: [
        statBlockCreatureInit({
          combatantId: actorId,
          initiative: 20,
          statBlock,
        }),
        characterSeed({ initiative: 10 }),
      ],
    });
    const execution = executionReferenceView(battle, actorId);
    const legendaryBindings = execution.procedureBindings.filter(
      (binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.section === "legendaryActions",
    );
    const legendaryPool = execution.resourcePools.find(
      (pool) => pool.kind === "legendaryActions",
    );
    if (legendaryPool === undefined) {
      throw new Error("Expected the shared Legendary Action pool.");
    }

    expect(legendaryBindings).toHaveLength(2);
    expect(
      legendaryBindings.map((binding) => binding.resourcePoolRefs),
    ).toEqual([
      [legendaryPool.resourcePoolRef],
      [legendaryPool.resourcePoolRef],
    ]);

    const snapshot = statBlockExecutionSnapshot(execution);
    const multiattackBinding = snapshot.procedureBindings.find(
      (binding) => binding.procedure.kind === "multiattack",
    );
    const legendaryBinding = snapshot.procedureBindings.find(
      (binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.section === "legendaryActions",
    );
    if (
      multiattackBinding?.procedure.kind !== "multiattack" ||
      legendaryBinding?.procedure.kind !== "attack"
    ) {
      throw new Error("Expected Multiattack and Legendary Action bindings.");
    }
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...snapshot,
        procedureBindings: snapshot.procedureBindings.map((binding) =>
          binding === multiattackBinding
            ? {
                ...binding,
                procedure: {
                  ...binding.procedure,
                  dispatchProcedureRefs: [legendaryBinding.procedureRef],
                },
              }
            : binding,
        ),
      }),
    ).toThrow();
    const splitPoolRef = battleResourcePoolExecutionRef(
      snapshot.scopeRef,
      NonNegativeInteger(999),
    );
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...snapshot,
        resourcePools: [
          ...snapshot.resourcePools,
          { ...legendaryPool, resourcePoolRef: splitPoolRef },
        ],
        procedureBindings: snapshot.procedureBindings.map((binding) =>
          binding.procedureRef === legendaryBindings[1]?.procedureRef
            ? {
                ...binding,
                resourcePoolRefs: binding.resourcePoolRefs.map((ref) =>
                  ref === legendaryPool.resourcePoolRef ? splitPoolRef : ref,
                ),
              }
            : binding,
        ),
      }),
    ).toThrow();

    const unsupportedLegendaryStatBlock: StatBlockRecord = {
      ...statBlock,
      statBlock: {
        ...statBlock.statBlock,
        legendaryActions: {
          ...statBlock.statBlock.legendaryActions,
          uses: { kind: "fixed", uses: 2 },
          entries: [
            {
              kind: "textOnly",
              procedureOrdinal: procedureOrdinal(1),
              name: "Unsupported Legendary Procedure",
              description: "A synthetic unsupported legendary procedure.",
              reason: "unsupported_action_shape",
              resourceRefs: { kind: "none" },
            },
          ],
        },
      },
    };
    const unsupportedExecution = isolatedStatBlockAdmissions(actorId, [
      unsupportedLegendaryStatBlock,
    ])[0]?.execution;
    expect(
      unsupportedExecution?.resourcePools.some(
        (pool) => pool.kind === "legendaryActions",
      ),
    ).toBe(false);
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...snapshot,
        resourcePools: [
          ...snapshot.resourcePools,
          {
            ...legendaryPool,
            resourcePoolRef: battleResourcePoolExecutionRef(
              snapshot.scopeRef,
              NonNegativeInteger(1000),
            ),
          },
        ],
      }),
    ).toThrow();
  });

  test("spends a procedure's complete resource set atomically", () => {
    const actorId = combatantId("execution-ref-atomic-resource-spend");
    const base = monsterResourceStatBlock();
    const legendaryAttack = base.statBlock.legendaryActions?.entries[0];
    if (
      legendaryAttack === undefined ||
      !isNonSpellExecutableProcedureEntryOfKind(legendaryAttack, "attack_roll")
    ) {
      throw new Error("Expected the synthetic Legendary Action fixture.");
    }
    const limitedLegendaryAttack = {
      ...legendaryAttack,
      resourceRefs: {
        kind: "some" as const,
        ordinals: [resourceOrdinal(2)] as const,
      },
    };
    const statBlock: StatBlockRecord = {
      ...base,
      statBlock: {
        ...base.statBlock,
        legendaryActions: {
          ...base.statBlock.legendaryActions,
          uses: base.statBlock.legendaryActions?.uses ?? {
            kind: "fixed",
            uses: 2,
          },
          entries: [limitedLegendaryAttack],
        },
      },
    };
    const admission = isolatedStatBlockAdmissions(actorId, [statBlock])[0];
    const binding = admission?.execution.procedureBindings.find(
      (candidate) =>
        candidate.procedure.kind === "attack" &&
        candidate.procedure.section === "legendaryActions",
    );
    if (admission === undefined || binding === undefined) {
      throw new Error("Expected an admitted limited-use Legendary Action.");
    }
    expect(binding.resourcePoolRefs).toHaveLength(2);
    const reorderedSnapshot = Schema.decodeUnknownSync(
      StatBlockExecutionSnapshotSchema,
    )({
      ...statBlockExecutionSnapshot(admission.execution),
      procedureBindings: admission.execution.procedureBindings.map(
        (candidate) =>
          candidate.procedureRef === binding.procedureRef
            ? {
                ...candidate,
                resourcePoolRefs: [...candidate.resourcePoolRefs].reverse(),
              }
            : candidate,
      ),
    });
    const restoredFromReorderedOwnership = restoreStatBlockExecutionAdmission(
      isolatedExecutionBattleId,
      actorId,
      projectedStatBlockRuntimeSource(statBlock),
      reorderedSnapshot,
    );
    expect(Either.isRight(restoredFromReorderedOwnership)).toBe(true);
    const [firstOwnedPoolRef] = binding.resourcePoolRefs;
    if (firstOwnedPoolRef === undefined) {
      throw new Error("Expected an owned resource pool.");
    }
    expect(
      Either.isLeft(
        restoreStatBlockExecutionAdmission(
          isolatedExecutionBattleId,
          actorId,
          projectedStatBlockRuntimeSource(statBlock),
          {
            ...statBlockExecutionSnapshot(admission.execution),
            procedureBindings: admission.execution.procedureBindings.map(
              (candidate) =>
                candidate.procedureRef === binding.procedureRef
                  ? {
                      ...candidate,
                      resourcePoolRefs: [firstOwnedPoolRef, firstOwnedPoolRef],
                    }
                  : candidate,
            ),
          },
        ),
      ),
    ).toBe(true);

    const once = spendStatBlockProcedureResources(
      admission.execution,
      binding.procedureRef,
    );
    const twice = spendStatBlockProcedureResources(once, binding.procedureRef);

    expect(twice).toBe(once);
    expect(once.resourcePools).toEqual(
      admission.execution.resourcePools.map((pool) =>
        binding.resourcePoolRefs.includes(pool.resourcePoolRef)
          ? pool.kind === "daily" || pool.kind === "legendaryActions"
            ? { ...pool, usesRemaining: Number(pool.usesRemaining) - 1 }
            : { ...pool, available: false }
          : pool,
      ),
    );
  });

  test("carries the selected Stat Block procedure ref through an Opportunity Attack", () => {
    const actorId = combatantId("execution-ref-opportunity-reactor");
    const battle = startBattleRight({
      battleId: battleId("battle-stat-block-opportunity-execution-reference"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          combatantId: actorId,
          initiative: 10,
          statBlock: monsterResourceStatBlock(),
        }),
      ],
    });
    const actor = battle.combatants.get(actorId);
    if (actor?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block Opportunity Attack reactor.");
    }
    const attack = statBlockAttackActionOptions(actor.origin.execution).find(
      (candidate) =>
        statBlockAttackProcedureSection(
          battle,
          actorId,
          candidate.procedureRef,
        ) === "actions" && candidate.attack.attackType === "melee",
    );
    if (attack === undefined) {
      throw new Error("Expected admitted melee attack procedure.");
    }
    const choice = opportunityAttackReactionChoices(battle, fighterId, [
      {
        reactorId: actorId,
        distanceFeet: movementFeet(5),
        procedureRef: attack.procedureRef,
      },
    ])[0];
    if (
      choice?.kind !== "opportunityAttack" ||
      choice.subject.command !== "opportunityAttack"
    ) {
      throw new Error("Expected Stat Block Opportunity Attack choice.");
    }
    expect(choice.subject.procedureRef).toBe(attack.procedureRef);
    expect("attackName" in choice.subject).toBe(false);
  });

  test("uses execution references in discovery and serializable resource snapshots", () => {
    const actorId = combatantId("execution-ref-schema-owner");
    const statBlock = monsterResourceStatBlock();
    const battle = startBattleRight({
      battleId: battleId("battle-stat-block-execution-reference-schema"),
      combatants: [
        statBlockCreatureInit({
          combatantId: actorId,
          initiative: 20,
          statBlock,
        }),
        characterSeed({ initiative: 10 }),
      ],
    });
    const execution = executionReferenceView(battle, actorId);
    const discoveredSubjects = discoverBattleActCandidates(battle)
      .filter((act) => act.subject.actorId === actorId)
      .map((act) => act.subject);

    expect(
      discoveredSubjects.some((subject) => "procedureRef" in subject),
    ).toBe(true);
    expect(
      discoveredSubjects.some((subject) => "multiattackName" in subject),
    ).toBe(false);
    expect(discoveredSubjects.some((subject) => "optionName" in subject)).toBe(
      false,
    );

    const actor = battle.combatants.get(actorId);
    if (actor?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block actor admission.");
    }
    const meleeOption = statBlockAttackActionOptions(
      actor.origin.execution,
    ).find((option) => option.attack.attackType === "melee");
    const attackAct = discoverBattleActCandidates(battle).find(
      (act) =>
        meleeOption !== undefined &&
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        "procedureRef" in act.subject &&
        act.subject.procedureRef === meleeOption.procedureRef &&
        (act.subject.statBlockDamageNotation ?? "rolled") ===
          meleeOption.damageNotation,
    );
    if (meleeOption === undefined || attackAct === undefined) {
      throw new Error("Expected an admitted melee attack target hole.");
    }
    const awaitingTarget = resolveBattleSubject({
      state: battle,
      subject: attackAct.subject,
      fills: [],
    });
    const targetHole =
      awaitingTarget.tag === "needsHoles"
        ? awaitingTarget.holes.find((hole) => hole.kind === "targetChoice")
        : undefined;
    if (
      targetHole?.kind !== "targetChoice" ||
      targetHole.attack === undefined
    ) {
      throw new Error("Expected an admitted melee attack target hole.");
    }
    const awaitingAttackRoll = resolveBattleSubject({
      state: battle,
      subject: attackAct.subject,
      fills: [
        {
          kind: "targetChoice",
          holeId: targetHole.holeId,
          value: fighterId,
          spatialFacts: [
            {
              kind: "attackTargetDistance",
              actorId,
              targetId: fighterId,
              ...targetHole.attack.selection,
              distanceFeet: movementFeet(5),
            },
          ],
        },
      ],
    });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected the attack to request its attack roll.");
    }
    const attackRollHole = awaitingAttackRoll.holes.find(
      (hole) => hole.kind === "attackRoll" && "attack" in hole,
    );
    if (
      attackRollHole?.kind !== "attackRoll" ||
      !("attack" in attackRollHole)
    ) {
      throw new Error("Expected an attack roll hole with its bound procedure.");
    }
    const decodedAttackRollHole = Schema.decodeUnknownSync(BattleHoleSchema)(
      Schema.encodeSync(BattleHoleSchema)(attackRollHole),
    );
    if (
      decodedAttackRollHole.kind !== "attackRoll" ||
      !("attack" in decodedAttackRollHole) ||
      decodedAttackRollHole.attack.kind !== "statBlockAttack"
    ) {
      throw new Error("Expected a decoded Stat Block attack roll hole.");
    }
    const decodedStatBlockAttack = decodedAttackRollHole.attack;
    expect(decodedStatBlockAttack).toEqual(attackRollHole.attack);
    expect(decodedStatBlockAttack).not.toHaveProperty("part");
    expect(() =>
      Schema.decodeUnknownSync(BattleSubjectSchema)({
        ...attackAct.subject,
        statBlockDamageNotation: "rolled",
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleHoleSchema)({
        ...decodedAttackRollHole,
        attack: {
          ...decodedStatBlockAttack,
          attack: {
            ...decodedStatBlockAttack.attack,
            attackBonus: {
              kind: "linear_per_level",
              axis: "character",
              base: 1,
              perLevel: 1,
              startingAtLevel: 1,
            },
          },
        },
      }),
    ).toThrow();

    expect(actor.origin).not.toHaveProperty("presentations");
    const limitedBinding = actor.origin.execution.procedureBindings.find(
      (binding) => binding.resourcePoolRefs.length > 0,
    );
    if (limitedBinding === undefined) {
      throw new Error("Expected a limited-use procedure binding.");
    }
    const spentAdmission = {
      ...actor.origin,
      execution: spendStatBlockProcedureResources(
        actor.origin.execution,
        limitedBinding.procedureRef,
      ),
    };
    const spentBattle: BattleState = {
      ...battle,
      combatants: new Map(battle.combatants).set(actorId, {
        ...actor,
        origin: spentAdmission,
      }),
    };
    const snapshot = snapshotBattle(spentBattle);
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(snapshot);
    const decoded = Schema.decodeUnknownSync(BattleSnapshotSchema)(encoded);
    const encodedEnvelope = Schema.encodeSync(
      BattleCheckpointFrontierEnvelopeSchema,
    )(battleCheckpointFrontierEnvelope(spentBattle));
    if (encodedEnvelope.frontier.kind !== "acts") {
      throw new Error("Expected an Acts frontier.");
    }
    const encodedActs = encodedEnvelope.frontier.acts;
    const duplicatedCombatant = encoded.combatants[0];
    if (duplicatedCombatant === undefined) {
      throw new Error("Expected a serialized combatant fixture.");
    }
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...encoded,
        combatants: [...encoded.combatants, duplicatedCombatant],
      }),
    ).toThrow();
    const actorProcedureRef = encoded.combatants.find(
      (combatant) => combatant.combatantId === actorId,
    )?.origin.execution.procedureBindings[0]?.procedureRef;
    if (actorProcedureRef === undefined) {
      throw new Error("Expected an actor procedure binding.");
    }
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...encoded,
        obscurementZones: [
          {
            kind: "spellObscurementZone",
            sourceProcedureRef: actorProcedureRef,
            sourceCombatantId: fighterId,
            obscurement: "heavilyObscured",
            area: {
              kind: "pointOriginSphere",
              areaId: "battle:test:wrong-owner-obscurement",
              radiusFeet: 10,
            },
            expiresAt: { kind: "duration", durationTicks: 1 },
          },
        ],
      }),
    ).toThrow();
    const encodedFighterForAttack = encoded.combatants.find(
      (combatant) => combatant.combatantId === fighterId,
    );
    if (encodedFighterForAttack?.origin.kind !== "character") {
      throw new Error("Expected the serialized character combatant.");
    }
    const fighterAttackProcedureRef =
      encodedFighterForAttack.origin.attackExecution.unarmedStrikeProcedureRef;
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...encoded,
        lightEmitters: [
          {
            kind: "spellLightEmitter",
            sourceProcedureRef: fighterAttackProcedureRef,
            sourceCombatantId: fighterId,
            attachment: { kind: "combatant", combatantId: fighterId },
            emission: { kind: "dim", radiusFeet: 10 },
            opaqueCoverInteraction: { kind: "blocksEmission" },
            expiresAt: { kind: "duration", durationTicks: 1 },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...encoded,
        obscurementZones: [
          {
            kind: "spellObscurementZone",
            sourceProcedureRef: fighterAttackProcedureRef,
            sourceCombatantId: fighterId,
            obscurement: "heavilyObscured",
            area: {
              kind: "pointOriginSphere",
              areaId: "battle:test:attack-backed-obscurement",
              radiusFeet: 10,
            },
            expiresAt: { kind: "duration", durationTicks: 1 },
          },
        ],
      }),
    ).toThrow();
    const encodedText = JSON.stringify(encoded);
    for (const pool of execution.resourcePools) {
      expect(encodedText).toContain(
        JSON.stringify(pool.resourcePoolRef).slice(1, -1),
      );
    }
    const origin = snapshot.combatants.find(
      (combatant) => combatant.combatantId === actorId,
    )?.origin;
    if (origin?.kind !== "statBlock") {
      throw new Error("Expected serialized Stat Block origin.");
    }
    expect(origin.execution).toEqual(
      statBlockExecutionSnapshot(spentAdmission.execution),
    );
    expect(JSON.stringify(origin.execution.procedureBindings)).not.toContain(
      "Cinder Breath",
    );
    expect(JSON.stringify(origin.execution.procedureBindings)).not.toContain(
      "Dread Gaze",
    );
    const decodedOrigin = decoded.combatants.find(
      (combatant) => combatant.combatantId === actorId,
    )?.origin;
    if (decodedOrigin?.kind !== "statBlock") {
      throw new Error("Expected decoded Stat Block origin.");
    }
    const unboundProcedureRef = battleProcedureExecutionRef(
      decodedOrigin.execution.scopeRef,
      NonNegativeInteger(999),
    );
    const unboundResourceRef = battleResourcePoolExecutionRef(
      decodedOrigin.execution.scopeRef,
      NonNegativeInteger(999),
    );
    const unboundEffectRef = battleActiveEffectExecutionRef(
      JSON.stringify({
        kind: "activeEffectOccurrence",
        ownerScopeRef: decodedOrigin.execution.scopeRef,
        ordinal: 999,
      }),
    );
    const firstAct = encodedActs[0];
    if (firstAct === undefined) {
      throw new Error("Expected at least one serialized Stat Block act.");
    }
    const encodedFighter = encoded.combatants.find(
      (combatant) => combatant.combatantId === fighterId,
    );
    const encodedActor = encoded.combatants.find(
      (combatant) => combatant.combatantId === actorId,
    );
    if (encodedFighter?.origin.kind !== "character") {
      throw new Error("Expected the serialized character combatant.");
    }
    if (encodedActor?.origin.kind !== "statBlock") {
      throw new Error("Expected the serialized Stat Block combatant.");
    }
    const fighterEffectRef = battleActiveEffectExecutionRef(
      JSON.stringify({
        kind: "activeEffectOccurrence",
        ownerScopeRef: encodedFighter.origin.execution.scopeRef,
        ordinal: spentBattle.combatants.get(fighterId)?.nextActiveEffectOrdinal,
      }),
    );
    const actorEffectRef = battleActiveEffectExecutionRef(
      JSON.stringify({
        kind: "activeEffectOccurrence",
        ownerScopeRef: decodedOrigin.execution.scopeRef,
        ordinal: spentBattle.combatants.get(actorId)?.nextActiveEffectOrdinal,
      }),
    );
    const escapeSubject = {
      tag: "action" as const,
      actorId,
      action: "escapeSpellRestraint" as const,
      targetId: fighterId,
      effectRef: fighterEffectRef,
    };
    const snapshotWithEffectOwner = (
      ownerId: CombatantId,
      effectRef: BattleActiveEffectExecutionRef,
    ) => ({
      ...encodedEnvelope,
      checkpoint: {
        ...encodedEnvelope.checkpoint,
        combatants: encodedEnvelope.checkpoint.combatants.map((combatant) =>
          combatant.combatantId === ownerId
            ? {
                ...combatant,
                activeEffectRefs: [...combatant.activeEffectRefs, effectRef],
              }
            : combatant,
        ),
      },
      frontier: {
        ...encodedEnvelope.frontier,
        acts: [
          { ...firstAct, subject: escapeSubject, initialHoles: [] },
          ...encodedActs.slice(1),
        ],
      },
    });
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithEffectOwner(fighterId, fighterEffectRef),
      ),
    ).not.toThrow();
    const duplicateActiveEffectSnapshot = snapshotWithEffectOwner(
      fighterId,
      fighterEffectRef,
    );
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)({
        ...duplicateActiveEffectSnapshot,
        checkpoint: {
          ...duplicateActiveEffectSnapshot.checkpoint,
          combatants: duplicateActiveEffectSnapshot.checkpoint.combatants.map(
            (combatant) =>
              combatant.combatantId === fighterId
                ? {
                    ...combatant,
                    activeEffectRefs: [
                      ...combatant.activeEffectRefs,
                      fighterEffectRef,
                    ],
                  }
                : combatant,
          ),
        },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)({
        ...snapshotWithEffectOwner(actorId, actorEffectRef),
        frontier: {
          ...encodedEnvelope.frontier,
          acts: [
            {
              ...firstAct,
              subject: { ...escapeSubject, effectRef: actorEffectRef },
              initialHoles: [],
            },
            ...encodedActs.slice(1),
          ],
        },
      }),
    ).toThrow();
    const encodedAttackSnapshot = Schema.encodeSync(
      BattleCheckpointFrontierEnvelopeSchema,
    )(battleCheckpointFrontierEnvelope(battle));
    if (encodedAttackSnapshot.frontier.kind !== "acts") {
      throw new Error("Expected an Acts frontier.");
    }
    const encodedAttackActs = encodedAttackSnapshot.frontier.acts;
    const encodedAttackActIndex = encodedAttackActs.findIndex(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        "procedureRef" in act.subject &&
        act.subject.procedureRef === decodedStatBlockAttack.procedureRef,
    );
    const encodedAttackAct = encodedAttackActs[encodedAttackActIndex];
    if (encodedAttackAct === undefined) {
      throw new Error("Expected the encoded Stat Block attack act.");
    }
    const snapshotWithAttackInitialHole = (hole: unknown) => ({
      ...encodedAttackSnapshot,
      frontier: {
        ...encodedAttackSnapshot.frontier,
        acts: encodedAttackActs.map((act, index) =>
          index === encodedAttackActIndex
            ? { ...encodedAttackAct, initialHoles: [hole] }
            : act,
        ),
      },
    });
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithAttackInitialHole(decodedAttackRollHole),
      ),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithAttackInitialHole({
          ...decodedAttackRollHole,
          ongoingFeatureActivations: [
            { procedureRef: unboundProcedureRef, rollMode: "advantage" },
          ],
        }),
      ),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithAttackInitialHole({
          kind: "rolledDice",
          holeId: "battle:test:unbound-damage-choice",
          holeInstanceKey: "battle:test:unbound-damage-choice",
          label: "Synthetic damage",
          attack: decodedStatBlockAttack,
          critical: false,
          weaponDamageDiceRollChoiceProcedureRefs: [unboundProcedureRef],
        }),
      ),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithAttackInitialHole({
          kind: "hitPointHealingDistribution",
          holeId: "battle:test:unbound-healing-pool",
          holeInstanceKey: "battle:test:unbound-healing-pool",
          label: "Synthetic healing pool",
          requiresTableSpatialFact: true,
          healingPool: {
            sourceCombatantId: actorId,
            sourceProcedureRef: unboundProcedureRef,
            rangeFeet: 5,
            poolHitPoints: 1,
            perTargetCap: "halfHitPointMaximum",
          },
          choices: [actorId],
        }),
      ),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithAttackInitialHole({
          kind: "savingThrowOutcome",
          holeId: "battle:test:externally-owned-save-bonus",
          holeInstanceKey: "battle:test:externally-owned-save-bonus",
          label: "Synthetic externally modified save",
          sourceProcedureRef: decodedStatBlockAttack.procedureRef,
          outcomeTargeting: "singleTarget",
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          areaChoices: [],
          targetRollModes: [],
          targetFlatBonuses: [
            {
              targetId: actorId,
              sourceCombatantId: fighterId,
              sourceProcedureRef: fighterAttackProcedureRef,
              bonus: 1,
            },
          ],
        }),
      ),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithAttackInitialHole({
          kind: "concentrationSavingThrow",
          holeId: "battle:test:unbound-concentration-bonus",
          holeInstanceKey: "battle:test:unbound-concentration-bonus",
          label: "Synthetic concentration save",
          combatantId: actorId,
          dc: 10,
          damageAmount: 1,
          targetFlatBonuses: [
            {
              targetId: actorId,
              sourceCombatantId: actorId,
              sourceProcedureRef: unboundProcedureRef,
              bonus: 1,
            },
          ],
        }),
      ),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithAttackInitialHole({
          kind: "attackDamageDisposition",
          holeId: "battle:test:unbound-damage-disposition",
          holeInstanceKey: "battle:test:unbound-damage-disposition",
          label: "Synthetic damage disposition",
          attackerId: fighterId,
          targetId: actorId,
          choices: [
            {
              kind: "zeroHitPointReplacement",
              procedureRef: unboundProcedureRef,
            },
          ],
        }),
      ),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        snapshotWithAttackInitialHole({
          kind: "movableZoneRamMovement",
          holeId: "battle:test:unbound-movable-zone",
          holeInstanceKey: "battle:test:unbound-movable-zone",
          label: "Synthetic movable zone",
          movableZone: {
            targetId: fighterId,
            sourceProcedureRef: unboundProcedureRef,
            sourceCombatantId: actorId,
            areaId: "battle:test:unbound-movable-zone",
            maxMoveFeet: 5,
          },
          requiresTableSpatialFact: true,
        }),
      ),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)({
        ...encodedEnvelope,
        frontier: {
          ...encodedEnvelope.frontier,
          acts: [
            {
              ...firstAct,
              initialHoles: [
                {
                  kind: "statBlockRechargeRoll",
                  holeId: "battle:test:unbound-recharge",
                  holeInstanceKey: "battle:test:unbound-recharge",
                  label: "Synthetic recharge",
                  combatantId: actorId,
                  rechargeTargets: [unboundResourceRef],
                },
              ],
            },
            ...encodedActs.slice(1),
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)({
        ...encodedEnvelope,
        frontier: {
          ...encodedEnvelope.frontier,
          acts: [
            {
              ...firstAct,
              subject: {
                tag: "action",
                actorId,
                action: "escapeSpellRestraint",
                targetId: actorId,
                effectRef: unboundEffectRef,
              },
            },
            ...encodedActs.slice(1),
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...encoded,
        obscurementZones: [
          {
            kind: "spellObscurementZone",
            sourceProcedureRef: unboundProcedureRef,
            sourceCombatantId: actorId,
            obscurement: "heavilyObscured",
            area: {
              kind: "pointOriginSphere",
              areaId: "battle:test:unbound-obscurement",
              radiusFeet: 10,
            },
            expiresAt: { kind: "duration", durationTicks: 1 },
          },
        ],
      }),
    ).toThrow();
    const restored = restoreStatBlockExecutionAdmission(
      battle.battleId,
      actorId,
      projectedStatBlockRuntimeSource(statBlock),
      decodedOrigin.execution,
    );
    expect(Either.isRight(restored)).toBe(true);
    if (Either.isLeft(restored)) {
      throw new Error("Expected valid execution snapshot restoration.");
    }
    expect(restored.right.execution).toEqual(spentAdmission.execution);
    expect(
      restored.right.execution.procedureBindings.find(
        (binding) => binding.procedureRef === limitedBinding.procedureRef,
      )?.procedure,
    ).toEqual(limitedBinding.procedure);
    const restoredFromReorderedPools = restoreStatBlockExecutionAdmission(
      battle.battleId,
      actorId,
      projectedStatBlockRuntimeSource(statBlock),
      {
        ...decodedOrigin.execution,
        resourcePools: [...decodedOrigin.execution.resourcePools].reverse(),
      },
    );
    expect(Either.isRight(restoredFromReorderedPools)).toBe(true);
    if (Either.isRight(restoredFromReorderedPools)) {
      expect(restoredFromReorderedPools.right.execution.resourcePools).toEqual(
        spentAdmission.execution.resourcePools,
      );
    }
    const invalidGraph = {
      ...decodedOrigin.execution,
      procedureBindings: decodedOrigin.execution.procedureBindings.map(
        (binding) =>
          binding.procedureRef === limitedBinding.procedureRef
            ? {
                ...binding,
                resourcePoolRefs: [
                  ...binding.resourcePoolRefs,
                  unboundResourceRef,
                ],
              }
            : binding,
      ),
    };
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)(invalidGraph),
    ).toThrow();
    const foreignAdmission = isolatedStatBlockAdmissions(
      combatantId("foreign-execution-scope-owner"),
      [statBlock],
    )[0];
    const foreignProcedureRef =
      foreignAdmission?.execution.procedureBindings[0]?.procedureRef;
    if (foreignProcedureRef === undefined) {
      throw new Error("Expected a foreign execution procedure ref.");
    }
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...decodedOrigin.execution,
        procedureBindings: decodedOrigin.execution.procedureBindings.map(
          (binding, index) =>
            index === 0
              ? { ...binding, procedureRef: foreignProcedureRef }
              : binding,
        ),
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...encoded,
        combatants: encoded.combatants.map((combatant) =>
          combatant.combatantId === actorId
            ? {
                ...combatant,
                combatantId: combatantId("wrong-snapshot-execution-owner"),
              }
            : combatant,
        ),
      }),
    ).toThrow();
    const ordinaryAttackBinding =
      decodedOrigin.execution.procedureBindings.find(
        (binding) =>
          binding.procedure.kind === "attack" &&
          binding.procedure.section === "actions",
      );
    const firstResourcePool = decodedOrigin.execution.resourcePools[0];
    const secondResourcePool = decodedOrigin.execution.resourcePools[1];
    if (
      ordinaryAttackBinding === undefined ||
      firstResourcePool === undefined ||
      secondResourcePool === undefined
    ) {
      throw new Error("Expected ordinary attack and resource-pool fixtures.");
    }
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...decodedOrigin.execution,
        procedureBindings: decodedOrigin.execution.procedureBindings.map(
          (binding) =>
            binding === ordinaryAttackBinding
              ? {
                  ...binding,
                  resourcePoolRefs: [
                    firstResourcePool.resourcePoolRef,
                    secondResourcePool.resourcePoolRef,
                  ],
                }
              : binding,
        ),
      }),
    ).toThrow();
    const firstAttackProcedure = decodedOrigin.execution.procedureBindings.find(
      (binding) => binding.procedure.kind === "attack",
    );
    if (firstAttackProcedure?.procedure.kind !== "attack") {
      throw new Error("Expected an attack procedure snapshot.");
    }
    const firstAttack = firstAttackProcedure.procedure.attack;
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...decodedOrigin.execution,
        procedureBindings: decodedOrigin.execution.procedureBindings.map(
          (binding) =>
            binding === firstAttackProcedure
              ? {
                  ...binding,
                  procedure: {
                    ...binding.procedure,
                    attack: {
                      ...firstAttack,
                      attackBonus: {
                        kind: "linear_per_level",
                        axis: "character",
                        base: 1,
                        perLevel: 1,
                        startingAtLevel: 1,
                      },
                    },
                  },
                }
              : binding,
        ),
      }),
    ).toThrow();
    const firstProcedureBinding = decodedOrigin.execution.procedureBindings[0];
    if (firstProcedureBinding === undefined) {
      throw new Error("Expected a procedure-binding fixture.");
    }
    expect(
      Either.isLeft(
        restoreStatBlockExecutionAdmission(
          battle.battleId,
          actorId,
          projectedStatBlockRuntimeSource(statBlock),
          {
            ...decodedOrigin.execution,
            procedureBindings: decodedOrigin.execution.procedureBindings.map(
              (binding, index) =>
                index === 1 ? firstProcedureBinding : binding,
            ),
          },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        restoreStatBlockExecutionAdmission(
          battle.battleId,
          actorId,
          projectedStatBlockRuntimeSource(statBlock),
          {
            ...decodedOrigin.execution,
            resourcePools: decodedOrigin.execution.resourcePools.map(
              (pool, index) => (index === 1 ? firstResourcePool : pool),
            ),
          },
        ),
      ),
    ).toBe(true);
    const rechargePool = decodedOrigin.execution.resourcePools.find(
      (pool) => pool.kind === "recharge",
    );
    if (rechargePool === undefined) {
      throw new Error("Expected a Recharge pool fixture.");
    }
    expect(() =>
      Schema.decodeUnknownSync(StatBlockExecutionSnapshotSchema)({
        ...decodedOrigin.execution,
        resourcePools: decodedOrigin.execution.resourcePools.map((pool) =>
          pool === rechargePool ? { ...pool, minimumRoll: 6.5 } : pool,
        ),
      }),
    ).toThrow();
    expect(
      Either.isLeft(
        restoreStatBlockExecutionAdmission(
          battle.battleId,
          combatantId("different-execution-owner"),
          projectedStatBlockRuntimeSource(statBlock),
          decodedOrigin.execution,
        ),
      ),
    ).toBe(true);
    expect(decoded.combatants).toEqual(snapshot.combatants);
    const decodedEnvelope = Schema.decodeUnknownSync(
      BattleCheckpointFrontierEnvelopeSchema,
    )(encodedEnvelope);
    if (decodedEnvelope.frontier.kind !== "acts") {
      throw new Error("Expected an Acts frontier after decoding.");
    }
    expect(decodedEnvelope.frontier.acts.map((act) => act.subject)).toEqual(
      encodedActs.map((act) => act.subject),
    );
  });

  test("rejects restoration when persisted attack mechanics changed", () => {
    const actorId = combatantId("execution-ref-changed-binding");
    const statBlock = monsterResourceStatBlock();
    const admission = isolatedStatBlockAdmissions(actorId, [statBlock])[0];
    const firstAttack = requireProcedureActions(statBlock).find(
      (entry) =>
        entry.kind === "executable" && entry.procedure.kind === "attack_roll",
    );
    if (
      admission === undefined ||
      firstAttack?.kind !== "executable" ||
      firstAttack.procedure.kind !== "attack_roll"
    ) {
      throw new Error("Expected an admitted action attack.");
    }
    const changedStatBlock: StatBlockRecord = {
      ...statBlock,
      statBlock: {
        ...statBlock.statBlock,
        actions: mapNonEmpty(requireProcedureActions(statBlock), (entry) =>
          entry === firstAttack &&
          entry.kind === "executable" &&
          entry.procedure.kind === "attack_roll"
            ? {
                ...entry,
                procedure: {
                  ...entry.procedure,
                  attackBonus: {
                    kind: "literal" as const,
                    value:
                      entry.procedure.attackBonus.kind === "literal"
                        ? entry.procedure.attackBonus.value + 1
                        : 1,
                  },
                },
              }
            : entry,
        ),
      },
    };

    const restored = restoreStatBlockExecutionAdmission(
      isolatedExecutionBattleId,
      actorId,
      projectedStatBlockRuntimeSource(changedStatBlock),
      statBlockExecutionSnapshot(admission.execution),
    );

    expect(restored).toMatchObject(
      Either.left({
        tag: "invalidStatBlockExecutionSnapshot",
        reason: "procedureBindingsMismatch",
      }),
    );
  });

  test("reports every structurally mismatched resource pool without partial restoration", () => {
    const actorId = combatantId("execution-ref-resource-structure-mismatch");
    const statBlocks = [
      monsterResourceStatBlock(),
      monsterResourceStatBlock(),
      monsterResourceStatBlock(),
    ] as const;
    const [kindAdmission, maximumAdmission, rechargeAdmission] =
      isolatedStatBlockAdmissions(actorId, statBlocks);
    if (
      kindAdmission === undefined ||
      maximumAdmission === undefined ||
      rechargeAdmission === undefined
    ) {
      throw new Error("Expected three admitted resource graphs.");
    }

    const kindSnapshot = statBlockExecutionSnapshot(kindAdmission.execution);
    const maximumSnapshot = statBlockExecutionSnapshot(
      maximumAdmission.execution,
    );
    const rechargeSnapshot = statBlockExecutionSnapshot(
      rechargeAdmission.execution,
    );
    const kindRechargePool = kindSnapshot.resourcePools.find(
      (pool) => pool.kind === "recharge",
    );
    const maximumDailyPool = maximumSnapshot.resourcePools.find(
      (pool) => pool.kind === "daily",
    );
    const thresholdRechargePool = rechargeSnapshot.resourcePools.find(
      (pool) => pool.kind === "recharge",
    );
    if (
      kindRechargePool === undefined ||
      maximumDailyPool === undefined ||
      thresholdRechargePool === undefined
    ) {
      throw new Error("Expected Recharge and daily resource pools.");
    }

    const restored = restoreStatBlockExecutionAdmissions(
      isolatedExecutionBattleId,
      actorId,
      [
        {
          statBlock: projectedStatBlockRuntimeSource(statBlocks[0]),
          snapshot: {
            ...kindSnapshot,
            resourcePools: kindSnapshot.resourcePools.map((pool) =>
              pool === kindRechargePool
                ? {
                    resourcePoolRef: pool.resourcePoolRef,
                    kind: "recharge_after_rest" as const,
                    ownership: pool.ownership,
                    available: pool.available,
                  }
                : pool,
            ),
          },
        },
        {
          statBlock: projectedStatBlockRuntimeSource(statBlocks[1]),
          snapshot: {
            ...maximumSnapshot,
            resourcePools: maximumSnapshot.resourcePools.map((pool) =>
              pool === maximumDailyPool
                ? {
                    ...pool,
                    usesMax: resourceCount(Number(pool.usesMax) + 1),
                  }
                : pool,
            ),
          },
        },
        {
          statBlock: projectedStatBlockRuntimeSource(statBlocks[2]),
          snapshot: {
            ...rechargeSnapshot,
            resourcePools: rechargeSnapshot.resourcePools.map((pool) =>
              pool === thresholdRechargePool
                ? {
                    ...pool,
                    minimumRoll: Schema.decodeUnknownSync(
                      CreatureRechargeMinimumRollSchema,
                    )(6),
                  }
                : pool,
            ),
          },
        },
      ],
    );

    expect(Either.isLeft(restored)).toBe(true);
    if (Either.isRight(restored)) {
      throw new Error("Expected every resource mismatch to be reported.");
    }
    expect(restored.left).toMatchObject([
      { restorationIndex: 0, reason: "resourcePoolsMismatch" },
      { restorationIndex: 1, reason: "resourcePoolsMismatch" },
      { restorationIndex: 2, reason: "resourcePoolsMismatch" },
    ]);
  });

  test("restores an ordered cohort without resetting later-form execution scopes", () => {
    const actorId = combatantId("execution-ref-restored-cohort");
    const firstForm = monsterResourceStatBlock();
    const secondForm = monsterResourceStatBlock();
    const admitted = isolatedStatBlockAdmissions(actorId, [
      firstForm,
      secondForm,
    ]);
    const secondAdmission = admitted[1];
    if (secondAdmission === undefined) {
      throw new Error("Expected a second admitted form.");
    }
    const limitedBinding = secondAdmission.execution.procedureBindings.find(
      (binding) => binding.resourcePoolRefs.length > 0,
    );
    if (limitedBinding === undefined) {
      throw new Error("Expected a limited procedure in the second form.");
    }
    const snapshots = admitted.map((admission) =>
      statBlockExecutionSnapshot(
        admission === secondAdmission
          ? spendStatBlockProcedureResources(
              admission.execution,
              limitedBinding.procedureRef,
            )
          : admission.execution,
      ),
    );
    const firstSnapshot = snapshots[0];
    const secondSnapshot = snapshots[1];
    if (firstSnapshot === undefined || secondSnapshot === undefined) {
      throw new Error("Expected snapshots for both admitted forms.");
    }
    const restored = restoreStatBlockExecutionAdmissions(
      isolatedExecutionBattleId,
      actorId,
      [
        {
          statBlock: projectedStatBlockRuntimeSource(firstForm),
          snapshot: firstSnapshot,
        },
        {
          statBlock: projectedStatBlockRuntimeSource(secondForm),
          snapshot: secondSnapshot,
        },
      ],
    );

    expect(Either.isRight(restored)).toBe(true);
    if (Either.isLeft(restored)) {
      throw new Error("Expected the ordered form cohort to restore.");
    }
    expect(restored.right.map((admission) => admission.execution)).toEqual(
      admitted.map((admission, index) =>
        index === 1
          ? spendStatBlockProcedureResources(
              admission.execution,
              limitedBinding.procedureRef,
            )
          : admission.execution,
      ),
    );
    expect(
      Either.isRight(
        restoreStatBlockExecutionAdmission(
          isolatedExecutionBattleId,
          actorId,
          projectedStatBlockRuntimeSource(secondForm),
          secondSnapshot,
        ),
      ),
    ).toBe(true);
  });

  test("reports every independently invalid execution restoration", () => {
    const actorId = combatantId("execution-ref-invalid-restoration-cohort");
    const statBlocks = [
      monsterResourceStatBlock(),
      monsterResourceStatBlock(),
    ] as const;
    const admitted = isolatedStatBlockAdmissions(actorId, statBlocks);
    const restorations = admitted.map((admission, restorationIndex) => {
      const statBlock = statBlocks[restorationIndex];
      if (statBlock === undefined) {
        throw new Error("Expected the paired Stat Block fixture.");
      }
      return {
        statBlock: projectedStatBlockRuntimeSource(statBlock),
        snapshot: {
          ...statBlockExecutionSnapshot(admission.execution),
          procedureBindings: [],
        },
      };
    });

    const restored = restoreStatBlockExecutionAdmissions(
      isolatedExecutionBattleId,
      actorId,
      restorations,
    );

    expect(Either.isLeft(restored)).toBe(true);
    if (Either.isRight(restored)) {
      throw new Error("Expected every invalid restoration to be reported.");
    }
    expect(restored.left).toMatchObject([
      { restorationIndex: 0, reason: "procedureBindingsMismatch" },
      { restorationIndex: 1, reason: "procedureBindingsMismatch" },
    ]);
  });

  test("serializes and restores the execution cohort owned by Wild Shape forms", () => {
    const actorId = combatantId("execution-ref-wild-shape-owner");
    const baseForm: StatBlockRecord = assertStatBlockForTest(
      statBlockCatalog,
      parseSharedStatBlockId("stat_block_riding_horse"),
    );
    const baseActions = baseForm.statBlock.actions;
    const baseAttack = baseActions?.find(
      (entry) =>
        entry.kind === "executable" && entry.procedure.kind === "attack_roll",
    );
    if (
      baseActions === undefined ||
      baseAttack === undefined ||
      !isNonSpellExecutableProcedureEntryOfKind(baseAttack, "attack_roll")
    ) {
      throw new Error(
        "Expected the SRD Riding Horse fixture to have an attack.",
      );
    }
    const limitedForm: StatBlockRecord = {
      ...baseForm,
      id: parseSharedStatBlockId("synthetic_limited_wild_shape_form"),
      name: "Synthetic Limited Wild Shape Form",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic-limited-wild-shape-form",
      },
      statBlock: {
        ...baseForm.statBlock,
        actions: mapNonEmpty(baseActions, (entry) =>
          isNonSpellExecutableProcedureEntryOfKind(entry, "attack_roll") &&
          entry.procedureOrdinal === baseAttack.procedureOrdinal
            ? {
                ...entry,
                procedure: {
                  ...entry.procedure,
                  name: "Synthetic Limited Strike",
                },
                resourceRefs: {
                  kind: "some" as const,
                  ordinals: [resourceOrdinal(1)] as const,
                },
              }
            : entry,
        ),
        resources: [
          {
            ordinal: resourceOrdinal(1),
            ownership: "each" as const,
            limit: { kind: "daily" as const, uses: 1 },
          },
        ],
      },
    };
    const sourceForms: readonly StatBlockRecord[] = [baseForm, limitedForm];
    const battle = startBattleRight({
      battleId: battleId("battle-wild-shape-execution-reference-snapshot"),
      combatants: [
        characterSeed({
          combatantId: actorId,
          displayName: "Synthetic Druid",
          initiative: 20,
          classLevels: [{ className: "druid", level: 2 }],
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          druidWildShapeAvailableForms: sourceForms,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const actor = battle.combatants.get(actorId);
    if (actor?.origin.kind !== "character") {
      throw new Error("Expected a character with Wild Shape forms.");
    }
    const forms = actor.origin.druidWildShapeAvailableForms;
    const limitedAdmission = forms?.[1];
    const limitedBinding = limitedAdmission?.execution.procedureBindings.find(
      (binding) => binding.resourcePoolRefs.length > 0,
    );
    if (
      forms === undefined ||
      limitedAdmission === undefined ||
      limitedBinding === undefined
    ) {
      throw new Error("Expected the admitted limited Wild Shape form.");
    }
    const spentForms = forms.map((admission) =>
      admission === limitedAdmission
        ? {
            ...admission,
            execution: spendStatBlockProcedureResources(
              admission.execution,
              limitedBinding.procedureRef,
            ),
          }
        : admission,
    );
    const spentBattle: BattleState = {
      ...battle,
      combatants: new Map(battle.combatants).set(actorId, {
        ...actor,
        origin: {
          ...actor.origin,
          druidWildShapeAvailableForms: spentForms,
        },
      }),
    };
    const origin = snapshotBattle(spentBattle).combatants.find(
      (combatant) => combatant.combatantId === actorId,
    )?.origin;
    if (origin?.kind !== "character") {
      throw new Error("Expected a serialized character origin.");
    }
    expect(
      origin.druidWildShapeAvailableForms.map((form) => form.statBlockId),
    ).toEqual(sourceForms.map((form) => form.id));
    const encodedBattle = Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(spentBattle),
    );
    expect(
      Schema.decodeUnknownSync(BattleSnapshotSchema)(encodedBattle),
    ).toEqual(snapshotBattle(spentBattle));
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
            battleCheckpointFrontierEnvelope(spentBattle),
          ),
        ),
      ),
    ).toBe(true);
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...encodedBattle,
        combatants: encodedBattle.combatants.map((combatant) =>
          combatant.combatantId !== actorId ||
          combatant.origin.kind !== "character"
            ? combatant
            : {
                ...combatant,
                origin: {
                  ...combatant.origin,
                  druidWildShapeAvailableForms:
                    combatant.origin.druidWildShapeAvailableForms.map(
                      (form, index, forms) =>
                        index === 1 && forms[0] !== undefined
                          ? { ...form, execution: forms[0].execution }
                          : form,
                    ),
                },
              },
        ),
      }),
    ).toThrow();
    const restored = restoreStatBlockExecutionAdmissions(
      spentBattle.battleId,
      actorId,
      sourceForms.map((statBlock, index) => {
        const formSnapshot = origin.druidWildShapeAvailableForms[index];
        if (formSnapshot === undefined) {
          throw new Error("Expected the corresponding serialized form.");
        }
        return {
          statBlock: projectedStatBlockRuntimeSource(statBlock),
          snapshot: formSnapshot.execution,
        };
      }),
    );
    expect(Either.isRight(restored)).toBe(true);
    if (Either.isLeft(restored)) {
      throw new Error("Expected the serialized Wild Shape cohort to restore.");
    }
    expect(restored.right.map((admission) => admission.execution)).toEqual(
      spentForms.map((admission) => admission.execution),
    );
  });
});
