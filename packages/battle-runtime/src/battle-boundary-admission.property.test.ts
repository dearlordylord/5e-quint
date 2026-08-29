// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
import fc from "fast-check";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { decodeStatBlockRecordEither } from "@dnd/surface/surface/schema";
import { classLevel, PositiveInteger, resourceCount } from "@dnd/shared/types";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";

import {
  BattleHoleSchema,
  BattleFillSchema,
  BattleSnapshotSchema,
} from "./battle-reducer/battle-codecs.ts";
import { addBattleCombatant } from "./battle-reducer/api-lifecycle.ts";
import {
  statBlockBonusActionOptionActs,
  statBlockMultiattackActs,
} from "./battle-reducer/battle-discovery.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";
import {
  spellBaseArmorClassEffectRouteForDiscoveredAct,
  spellBaseArmorClassEffectRouteForResolution,
  wardedTargetInterdictionRouteForDiscoveredAct,
  wardedTargetInterdictionRouteForResolution,
} from "./battle-reducer/spell-defense-routes.ts";
import {
  attackActionVariantOptions,
  frenzyDamageTypeDecision,
  weaponTargetConstraint,
} from "./battle-reducer/statblock-attacks.ts";
import type { SupportedCreatureAttackRollMechanics } from "./battle-action-options.ts";
import {
  statBlockAdvantageBonusDamageComponentRef,
  statBlockAttackDamageSelection,
  statBlockBaseDamageComponentOrdinal,
  statBlockBaseDamageComponentRef,
  type StatBlockAttackDamageComponentRef,
  type StatBlockAttackDamageComponentSelection,
  type StatBlockAttackDamageSelection,
  type StatBlockDamageComponentNotation,
} from "./stat-block-attack-damage-selection.ts";
import { sameBattleSubject, type BattleSubject } from "./battle-subjects.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import {
  battleContinuationFillEquals,
  battleFillPrefixAccumulated,
} from "./battle-reducer/battle-fill-equality.ts";
import {
  attackDamageReductionRedirectResource,
  attackDamageReductionRedirectResourceAvailable,
  attackDamageReductionZeroDamageRedirectHoles,
  attackDamageReductionZeroDamageRedirectSelection,
  attackDamageReductionZeroDamageRedirectTargetChoices,
  hasAttackDamageReductionRedirectTargetSpatialFact,
  resolveAttackDamageReductionZeroDamageRedirectAfterReduction,
  spendAttackDamageReductionRedirectResource,
} from "./battle-reducer/attack-damage-redirect.ts";
import { DamageRelationshipDecisionsByHole } from "./battle-reducer/damage-relationship-decisions.ts";
import {
  reactionModifierProcedureSource,
  reactionModifierReductionRoll,
  reactionModifierResourceAvailable,
  reactionModifierResourceSpend,
  reactionModifierRollHole,
  attackDamageReductionOriginalDamageType,
  reactionRollOrDamageReductionChoiceForProfile,
  reactionRollOrDamageReductionChoices,
  reactionReductionResourceDieLabel,
  spendReactionModifierResource,
} from "./battle-reducer/reaction-modifiers.ts";
import {
  reactionSpellTargetFactsForAfterDamage,
  triggeredReactionSpellChoices,
  triggeredReactionSpellTurnResourceAvailable,
} from "./battle-reducer/reaction-triggered-spells.ts";
import {
  attackHitBonusActionSpellReactionChoices,
  currentInterruptCheckpoint,
  interruptWindowProgress,
  maybeOpenInterruptWindow,
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
  opportunityAttackReactionChoices,
  retaliationReactionAttackChoices,
} from "./battle-reducer/interrupt-execution.ts";
import { parseBattleMovement } from "./battle-reducer/movement-procedures.ts";
import {
  movementRouteForDiscoveredAct,
  movementRouteForResolution,
} from "./battle-reducer/movement-routes.ts";
import {
  battleMovementBudget,
  meleeWeaponOrUnarmedStrikeSelectionsForReactor,
  opportunityAttackExecutionCandidates,
  opportunityAttackOptionForReactor,
  opportunityAttackSelectionForReactor,
  unarmedStrikeSaveDcAbilityModifier,
} from "./battle-reducer/movement-speed.ts";
import { combatantCanSee } from "./battle-reducer/creature-state-leaves.ts";
import {
  deriveCreatureSpaceTraversalMovementFactFromTableRoute,
  type BattleCreatureSpaceTableRouteDerivationInput,
} from "./battle-reducer/creature-space-table-route.ts";
import {
  activeOngoingFeaturesPreventSpellInvocation,
  damageSpellSource,
  isPreparedDamageSpellSource,
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
  spellDefinitionHasPricedOrConsumedMaterialComponent,
} from "./battle-reducer/spells-invocation-guards.ts";
import {
  admitBattleStatBlockCombatant,
  battleStatBlockCombatantSource,
} from "./stat-block-combatant-admission.ts";
import {
  restoreStatBlockExecutionAdmission,
  restoreStatBlockExecutionAdmissions,
  statBlockExecutionAdmissionCohort,
  statBlockPresentationAllocation,
  statBlockExecutionSnapshot,
} from "./stat-block-execution.ts";
import {
  statBlockBonusActionOptionBindings,
  isNonSpellStatBlockProcedureBinding,
  statBlockMultiattackBindings,
  statBlockAttackActionOptions,
} from "./stat-block-execution-state.ts";
import {
  characterExecutionFromUnits,
  unitFeatureProcedureExecution,
  unitSupportProcedureExecution,
} from "./character-execution-admission.ts";
import {
  parseSupportedUnitFeatureProfile,
  battleUnitSupportProfilesForUnit,
} from "./unit-feature-support.ts";
import {
  battleExecutionScopeOrdinal,
  battleAreaId,
  battleId,
  battleSpellEffectOccurrenceId,
  battleTablePositionId,
  combatantId,
  type CombatantId,
} from "./identity.ts";
import type {
  AttackDamageReductionZeroDamageRedirectOffer,
  BattleFill,
  BattleHole,
  BattleState,
  BattleActiveEffect,
} from "./battle-state-execution.ts";
import {
  damageRollFill,
  damageRollFillWithGroups,
  characterSeed,
  fighterId,
  fighterAttackSubject,
  attackInitialTargetHole,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  magicSubject,
  movementFill,
  movementFeet,
  requireHole,
  resolveBattleSubject,
  snapshotBattle,
  startBattleSessionRight,
  monsterResourceStatBlock,
  monsterMultiattackStatBlock,
  monsterResourceStatBlockWithUnsupportedAttackSections,
  monsterResourceStatBlockWithTwoRechargeActions,
  uncannyDodgeUnit,
  goblinAttacksReactionModifierCharacter,
  monkDeflectAttacksFocusResource,
  targetFill,
  savingThrowOutcomeFill,
  statBlockCreatureInit,
  statBlockRecord,
  expectCasterDerivedArmorClassSourceRejectedAtStatBlockDecodeBoundary,
  projectedStatBlockRuntimeSource,
  wizardId,
  wizardSpellcasting,
  spellRecord,
  battleProcedureExecutionRefForTest,
  unitLibrary,
  KNOCKED_OUT_UNCONSCIOUS,
  discoverBattleActCandidates,
  discoverBattleActs,
  initiativeScore,
  isNonSpellExecutableProcedureEntryOfKind,
  acidSplashWithRadius,
  testCharacterWeaponAttackForUnit,
  reactionModifierChoice,
  goblinScimitarHitReactionSetup,
  readyDeclarationFillForTest,
  endTurn,
  testBattleCreatureStateWithConditions,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { castResolvedFindFamiliar } from "./find-familiar-lifecycle.ts";

const PROPERTY_OPTIONS = { numRuns: 64, seed: 0x5eed18 } as const;

type PactFamiliarAttackSubject = Extract<
  BattleSubject,
  { readonly tag: "pactOfTheChainFamiliarAttack" }
>;

type StatBlockDamageEffect =
  SupportedCreatureAttackRollMechanics["onHit"][number];
type StatBlockBaseDamageEffect = Extract<
  StatBlockDamageEffect,
  { readonly kind: "damage" }
>;
type StatBlockAdvantageBonusDamageEffect = Extract<
  StatBlockDamageEffect,
  { readonly kind: "conditional_bonus_damage" }
>;

function isStatBlockBaseDamageEffect(
  effect: StatBlockDamageEffect,
): effect is StatBlockBaseDamageEffect {
  return effect.kind === "damage";
}

function isStatBlockAdvantageBonusDamageEffect(
  effect: StatBlockDamageEffect,
): effect is StatBlockAdvantageBonusDamageEffect {
  return (
    effect.kind === "conditional_bonus_damage" &&
    effect.when.kind === "attack_roll_had_advantage"
  );
}

function expectedStatBlockDamageComponentNotations(
  effect: StatBlockBaseDamageEffect | StatBlockAdvantageBonusDamageEffect,
): readonly StatBlockDamageComponentNotation[] {
  const notations: StatBlockDamageComponentNotation[] = [];
  if ("expr" in effect.amount && effect.amount.expr.dice > 0) {
    notations.push("rolled");
  }
  if (typeof effect.amount.static === "number") {
    notations.push("static");
  }
  if (notations.length === 0) {
    throw new Error(
      "Expected every admitted Stat Block damage component to expose a notation.",
    );
  }
  return notations;
}

function expectedStatBlockDamageSelections(
  attack: SupportedCreatureAttackRollMechanics,
): readonly StatBlockAttackDamageSelection[] {
  const onHitEffects: readonly StatBlockDamageEffect[] = [...attack.onHit];
  const baseComponents = onHitEffects
    .filter(isStatBlockBaseDamageEffect)
    .map((effect, index) => ({
      componentRef: statBlockBaseDamageComponentRef(
        statBlockBaseDamageComponentOrdinal(PositiveInteger(index + 1)),
      ),
      notations: expectedStatBlockDamageComponentNotations(effect),
    }));
  const advantageBonus = onHitEffects.find(
    isStatBlockAdvantageBonusDamageEffect,
  );
  const components: readonly {
    readonly componentRef: StatBlockAttackDamageComponentRef;
    readonly notations: readonly StatBlockDamageComponentNotation[];
  }[] = [
    ...baseComponents,
    ...(advantageBonus === undefined
      ? []
      : [
          {
            componentRef: statBlockAdvantageBonusDamageComponentRef,
            notations:
              expectedStatBlockDamageComponentNotations(advantageBonus),
          },
        ]),
  ];
  const [firstComponent, ...remainingComponents] = components;
  if (firstComponent === undefined) {
    throw new Error("Expected an admitted Stat Block attack damage component.");
  }

  let selections: readonly StatBlockAttackDamageComponentSelection[][] = [[]];
  for (const component of [firstComponent, ...remainingComponents]) {
    selections = selections.flatMap((selection) =>
      component.notations.map((notation) => [
        ...selection,
        { componentRef: component.componentRef, notation },
      ]),
    );
  }
  return selections.map((selection) => {
    const [firstSelection, ...remainingSelections] = selection;
    if (firstSelection === undefined) {
      throw new Error("Expected a non-empty Stat Block damage selection.");
    }
    const parsed = statBlockAttackDamageSelection([
      firstSelection,
      ...remainingSelections,
    ]);
    if (Either.isLeft(parsed)) {
      throw new Error(
        "Expected canonical Stat Block damage component roles in test fixture.",
      );
    }
    return parsed.right;
  });
}

function moveHole(state: BattleState, actorId: CombatantId): BattleHole {
  return requireHole(
    resolveBattleSubject({
      state,
      subject: { tag: "runtimeCommand", actorId, command: "move" },
      fills: [],
    }),
    "movement",
  );
}

function simpleMovementFill(
  hole: BattleHole,
  overrides: Partial<Parameters<typeof movementFill>[1]> = {},
): Extract<BattleFill, { readonly kind: "movement" }> {
  return movementFill(hole, {
    ...overrides,
    movementCostFeet: overrides.movementCostFeet ?? 5,
    provokedOpportunityAttacks: overrides.provokedOpportunityAttacks ?? [],
  });
}

describe("battle boundary admission owners", () => {
  test("codec round trips discovered snapshots and rejects forged hole owners", () => {
    const state = fighterVsGoblinBattle();
    const snapshot = snapshotBattle(state);
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(snapshot);
    expect(Schema.decodeUnknownSync(BattleSnapshotSchema)(encoded)).toEqual(
      snapshot,
    );

    const subject = fighterAttackSubject(state);
    const attackResult = resolveBattleSubject({ state, subject, fills: [] });
    if (attackResult.tag !== "needsHoles") {
      throw new Error("Expected canonical attack discovery holes.");
    }
    const attackSnapshotEncoded = Schema.encodeSync(BattleSnapshotSchema)(
      attackResult.snapshot,
    );
    expect(
      Schema.decodeUnknownSync(BattleSnapshotSchema)(attackSnapshotEncoded),
    ).toEqual(attackResult.snapshot);
    const act = {
      subject,
      initialHoles: [attackInitialTargetHole(state, subject)],
    };
    const withAct = {
      ...snapshot,
      acts: [act],
    };
    const actEncoded = Schema.encodeSync(BattleSnapshotSchema)(withAct);
    expect(Schema.decodeUnknownSync(BattleSnapshotSchema)(actEncoded)).toEqual(
      withAct,
    );

    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const readyAct = findAct(state, readySubject);
    const readyHole = readyAct.initialHoles[0];
    if (readyHole?.kind !== "readyDeclaration") {
      throw new Error("Expected Ready declaration hole.");
    }
    const attackResponse = readyHole.responseChoices.find(
      (response) => response.kind === "attack",
    );
    if (attackResponse?.kind !== "attack") {
      throw new Error("Expected Ready Attack response.");
    }
    const readied = resolveBattleSubject({
      state,
      subject: readySubject,
      fills: [
        readyDeclarationFillForTest(
          readyHole,
          "the goblin comes within reach",
          attackResponse,
        ),
      ],
    });
    if (readied.tag !== "resolved") {
      throw new Error("Expected Ready Attack declaration to resolve.");
    }
    const goblinTurn = endTurn({ state: readied.state, actorId: fighterId });
    if (goblinTurn.tag !== "resolved") {
      throw new Error("Expected the Goblin turn to begin.");
    }
    const reported = resolveBattleSubject({
      state: goblinTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "reportReadyTrigger",
        readiedActorId: fighterId,
      },
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected a pending readied Attack interrupt.");
    }
    const readiedAttackEncoded = Schema.encodeSync(BattleSnapshotSchema)(
      reported.snapshot,
    );
    expect(
      Schema.decodeUnknownSync(BattleSnapshotSchema)(readiedAttackEncoded),
    ).toEqual(reported.snapshot);
    const encodedPendingInterrupt = readiedAttackEncoded.pendingInterrupt;
    if (encodedPendingInterrupt === null) {
      throw new Error("Expected the encoded readied Attack interrupt.");
    }
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...readiedAttackEncoded,
        readiedResponses: {
          ...readiedAttackEncoded.readiedResponses,
          actionsOrMovements:
            readiedAttackEncoded.readiedResponses.actionsOrMovements.map(
              (entry) => ({ ...entry, actorId: "missing-combatant" }),
            ),
        },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...readiedAttackEncoded,
        pendingInterrupt: {
          ...encodedPendingInterrupt,
          choices: encodedPendingInterrupt.choices.map((choice) =>
            choice.kind === "releaseReadiedAttack" &&
            choice.subject.tag === "runtimeCommand" &&
            choice.subject.command === "releaseReadiedAttack"
              ? {
                  ...choice,
                  subject: { ...choice.subject, attackAbility: "dex" },
                }
              : choice,
          ),
        },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...readiedAttackEncoded,
        pendingInterrupt: {
          ...encodedPendingInterrupt,
          choices: encodedPendingInterrupt.choices.map((choice) =>
            choice.kind === "releaseReadiedAttack" &&
            choice.subject.tag === "runtimeCommand" &&
            choice.subject.command === "releaseReadiedAttack"
              ? {
                  ...choice,
                  subject: {
                    ...choice.subject,
                    targetId: "missing-combatant",
                  },
                }
              : choice,
          ),
        },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...readiedAttackEncoded,
        readiedResponses: {
          ...readiedAttackEncoded.readiedResponses,
          actionsOrMovements:
            readiedAttackEncoded.readiedResponses.actionsOrMovements.map(
              (entry) =>
                entry.response.kind === "attack"
                  ? {
                      ...entry,
                      response: {
                        ...entry.response,
                        procedureRef: "forged-procedure-ref",
                      },
                    }
                  : entry,
            ),
        },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...readiedAttackEncoded,
        readiedResponses: {
          ...readiedAttackEncoded.readiedResponses,
          actionsOrMovements:
            readiedAttackEncoded.readiedResponses.actionsOrMovements.map(
              (entry) => ({ ...entry, response: { kind: "movement" } }),
            ),
        },
      }),
    ).toThrow();
    const heldAttackEncoded = Schema.encodeSync(BattleSnapshotSchema)(
      readied.snapshot,
    );
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)({
        ...heldAttackEncoded,
        readiedResponses: {
          ...heldAttackEncoded.readiedResponses,
          actionsOrMovements:
            heldAttackEncoded.readiedResponses.actionsOrMovements.map(
              (entry) =>
                entry.response.kind === "attack"
                  ? {
                      ...entry,
                      response: {
                        ...entry.response,
                        attackAbility: "dex",
                      },
                    }
                  : entry,
            ),
        },
      }),
    ).toThrow();

    const forged = {
      ...actEncoded,
      acts: actEncoded.acts.map((candidate) => ({
        ...candidate,
        initialHoles: candidate.initialHoles.map((hole) => ({
          ...hole,
          ...(hole.kind === "targetChoice" && hole.attack !== undefined
            ? {
                attack: {
                  ...hole.attack,
                  selection: {
                    ...hole.attack.selection,
                    procedureRef: "forged-procedure-ref",
                  },
                },
              }
            : {}),
        })),
      })),
    };
    expect(() =>
      Schema.encodeSync(BattleSnapshotSchema)(forged as never),
    ).toThrow();

    const movement = simpleMovementFill(moveHole(state, fighterId));
    const movementEncoded = Schema.encodeSync(BattleFillSchema)(movement);
    expect(Schema.decodeUnknownSync(BattleFillSchema)(movementEncoded)).toEqual(
      movement,
    );

    const codecSession = startBattleSessionRight({
      battleId: battleId("boundary-codec-holes"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
      ],
    });
    const codecAct = findAct(codecSession, magicSubject("acid_splash"));
    if (codecAct.subject.tag !== "actionSpell") {
      throw new Error("Expected action-spell codec act.");
    }
    const codecSnapshot = Schema.encodeSync(BattleSnapshotSchema)({
      ...snapshotBattle(codecSession.state),
      acts: [codecAct],
    });
    type EncodedCodecHole = Schema.Schema.Encoded<typeof BattleHoleSchema>;
    const encodedCodecHole = (value: unknown): EncodedCodecHole =>
      Schema.encodeSync(BattleHoleSchema)(
        Schema.decodeUnknownSync(BattleHoleSchema)(value),
      );
    const codecSource = {
      sourceProcedureRef: codecAct.subject.procedureRef,
      sourceCombatantId: wizardId,
      targetId: goblinId,
    };
    const codecBase = (name: string) => ({
      holeId: `battle:boundary-codec:${name}` as never,
      holeInstanceKey: `battle:boundary-codec:${name}` as never,
      label: `boundary ${name}`,
    });
    const codecSaving = (name: string, variant: string, value: object) =>
      encodedCodecHole({
        ...codecBase(name),
        kind: "savingThrowOutcome",
        [variant]: value,
        ability: "dex",
        dc: { kind: "fixed", dc: 12 },
        areaChoices: [],
        targetRollModes: [],
        targetFlatBonuses: [],
      });
    const codecRolled = (name: string, value: object) =>
      encodedCodecHole({
        ...codecBase(name),
        kind: "rolledDice",
        critical: false,
        ...value,
      });
    const codecHoles = [
      codecSaving("turnStart", "spellTurnStartSave", {
        ...codecSource,
        save: {
          ability: "dex",
          dc: { kind: "fixed", dc: 12 },
          successEnds: "spell",
        },
      }),
      encodedCodecHole({
        ...codecBase("laughter"),
        kind: "savingThrowOutcome",
        hideousLaughterRepeatSave: {
          ...codecSource,
          trigger: "endTurn",
          save: { ability: "wis", dc: { kind: "fixed", dc: 12 } },
        },
        ability: "wis",
        dc: { kind: "fixed", dc: 12 },
        areaChoices: [],
        targetRollModes: [],
        targetFlatBonuses: [],
      }),
      codecSaving("condition", "spellConditionEndTurnSave", {
        ...codecSource,
        condition: "restrained",
        save: { ability: "dex", dc: { kind: "fixed", dc: 12 } },
      }),
      encodedCodecHole({
        ...codecBase("glyphSave"),
        kind: "savingThrowOutcome",
        glyphExplosiveRune: {
          sourceCombatantId: wizardId,
          sourceProcedureRef: codecAct.subject.procedureRef,
          sourceEffectId: battleSpellEffectOccurrenceId("boundary-glyph"),
          radiusFeet: 20,
        },
        ability: "dex",
        dc: { kind: "fixed", dc: 12 },
        targetIds: [goblinId],
        targetRollModes: [],
        targetFlatBonuses: [],
      }),
      codecRolled("sourceRider", {
        sourceProcedureRef: codecAct.subject.procedureRef,
        spellMarkedDamageRiders: [],
      }),
      codecRolled("glyphDamage", {
        glyphExplosiveRune: {
          sourceCombatantId: wizardId,
          sourceProcedureRef: codecAct.subject.procedureRef,
          sourceEffectId: battleSpellEffectOccurrenceId(
            "boundary-glyph-damage",
          ),
          damage: { expr: { dice: 1, dieSize: 6 }, damageType: "fire" },
        },
      }),
      codecRolled("spellReduction", {
        spellDamageReduction: {
          sourceProcedureRef: codecAct.subject.procedureRef,
          sourceCombatantId: wizardId,
          targetId: goblinId,
          damageType: "cold",
          amount: { dice: 1, dieSize: 4 },
        },
      }),
      codecRolled("damagePenalty", {
        sourceDamageRollPenalty: {
          sourceProcedureRef: codecAct.subject.procedureRef,
          sourceCombatantId: wizardId,
          affectedCombatantId: goblinId,
          damageRollHoleId: `battle:boundary-codec:damage` as never,
          amount: { dice: 1, dieSize: 8 },
        },
      }),
      codecRolled("mirrorImage", {
        mirrorImageDuplicateRoll: {
          targetId: goblinId,
          sourceProcedureRef: codecAct.subject.procedureRef,
          sourceCombatantId: wizardId,
          remainingDuplicates: 1,
          dieSize: 6,
          successAtLeast: 3,
        },
      }),
      codecRolled("turnStartDamage", {
        spellTurnStartDamage: {
          ...codecSource,
          trigger: { kind: "condition", condition: "poisoned" },
          damage: { expr: { dice: 1, dieSize: 6 }, damageType: "cold" },
        },
      }),
      codecRolled("turnEndDamage", {
        spellTurnEndDamage: {
          ...codecSource,
          damage: { expr: { dice: 1, dieSize: 6 }, damageType: "cold" },
        },
      }),
      codecRolled("movableZone", {
        movableZone: {
          ...codecSource,
          areaId: battleAreaId("boundary-movable"),
          trigger: "endsTurnWithinFiveFeetOfSphere",
          save: { ability: "dex", dc: { kind: "fixed", dc: 12 } },
        },
      }),
      codecRolled("spikeGrowth", {
        spikeGrowthMovement: {
          ...codecSource,
          areaId: battleAreaId("boundary-spike"),
          distanceFeet: 10,
          damage: { expr: { dice: 1, dieSize: 4 }, damageType: "piercing" },
        },
      }),
      codecRolled("insectPlague", {
        insectPlagueAreaHazard: {
          ...codecSource,
          areaId: battleAreaId("boundary-insect"),
          trigger: "entersArea",
          damage: { expr: { dice: 1, dieSize: 6 }, damageType: "piercing" },
        },
      }),
      codecRolled("cloudkill", {
        cloudkillAreaHazard: {
          ...codecSource,
          areaId: battleAreaId("boundary-cloudkill"),
          trigger: "entersArea",
          damage: { expr: { dice: 1, dieSize: 6 }, damageType: "poison" },
        },
      }),
    ];
    for (const replacement of codecHoles) {
      const candidate = {
        ...codecSnapshot,
        acts: codecSnapshot.acts.map((candidateAct) => ({
          ...candidateAct,
          initialHoles: [replacement],
        })),
      };
      expect(
        Either.isRight(
          Schema.decodeUnknownEither(BattleSnapshotSchema)(candidate),
        ),
      ).toBe(true);
    }
  });

  test("creature-space route derivation classifies duplicate, mover, size, empty, and valid routes", () => {
    const largerFootprint = {
      occupantId: combatantId("larger"),
      creatureSizeRelationToMover: "larger" as const,
      occupiedPositions: [battleTablePositionId("boundary-p1")] as const,
    };
    const base: BattleCreatureSpaceTableRouteDerivationInput = {
      moverId: combatantId("mover"),
      route: {
        positionsEnteredBeforeDestination: [
          battleTablePositionId("boundary-p1"),
        ],
        destination: { positionId: battleTablePositionId("boundary-p2") },
      },
      occupiedCreatureFootprints: [largerFootprint],
    };
    expect(
      deriveCreatureSpaceTraversalMovementFactFromTableRoute(base),
    ).toMatchObject({
      tag: "movementFact",
      creatureSpaceTraversal: {
        destination: {
          kind: "unoccupiedSpace",
          positionId: "boundary-p2",
        },
      },
    });
    expect(
      deriveCreatureSpaceTraversalMovementFactFromTableRoute({
        ...base,
        occupiedCreatureFootprints: [],
      }),
    ).toEqual({ tag: "noOccupiedCreatureSpaceTraversal" });
    expect(
      deriveCreatureSpaceTraversalMovementFactFromTableRoute({
        ...base,
        occupiedCreatureFootprints: [
          ...base.occupiedCreatureFootprints,
          largerFootprint,
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "duplicateCreatureFootprint" });
    expect(
      deriveCreatureSpaceTraversalMovementFactFromTableRoute({
        ...base,
        occupiedCreatureFootprints: [
          {
            ...largerFootprint,
            occupantId: base.moverId,
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "occupiedRouteIncludesMoverFootprint",
    });
    expect(
      deriveCreatureSpaceTraversalMovementFactFromTableRoute({
        ...base,
        occupiedCreatureFootprints: [
          {
            ...largerFootprint,
            creatureSizeRelationToMover: "notLarger",
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "occupiedRouteCreatureIsNotLarger",
    });
    expect(
      deriveCreatureSpaceTraversalMovementFactFromTableRoute({
        ...base,
        route: {
          positionsEnteredBeforeDestination: [
            battleTablePositionId("boundary-p1"),
          ],
          destination: { positionId: battleTablePositionId("boundary-p1") },
        },
        occupiedCreatureFootprints: [],
      }),
    ).toEqual({ tag: "noOccupiedCreatureSpaceTraversal" });

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000 }), (caseId) => {
        const generatedPosition = battleTablePositionId(
          `boundary-route-${caseId}`,
        );
        const generatedFootprint = {
          occupantId: combatantId(`boundary-occupant-${caseId}`),
          creatureSizeRelationToMover: "larger" as const,
          occupiedPositions: [generatedPosition] as const,
        };
        const generatedInput: BattleCreatureSpaceTableRouteDerivationInput = {
          moverId: combatantId(`boundary-mover-${caseId}`),
          route: {
            positionsEnteredBeforeDestination: [generatedPosition],
            destination: {
              positionId: battleTablePositionId(
                `boundary-destination-${caseId}`,
              ),
            },
          },
          occupiedCreatureFootprints: [generatedFootprint],
        };

        expect(
          deriveCreatureSpaceTraversalMovementFactFromTableRoute(generatedInput)
            .tag,
        ).toBe("movementFact");
        expect(
          deriveCreatureSpaceTraversalMovementFactFromTableRoute({
            ...generatedInput,
            occupiedCreatureFootprints: [
              generatedFootprint,
              generatedFootprint,
            ],
          }),
        ).toMatchObject({
          tag: "invalid",
          reason: "duplicateCreatureFootprint",
        });
      }),
      PROPERTY_OPTIONS,
    );
  });

  test("movement parser enforces speed, positive cost, profile facts, and forceful-blow target identity", () => {
    const state = fighterVsGoblinBattle();
    const hole = moveHole(state, fighterId);
    const valid = simpleMovementFill(hole);
    expect(parseBattleMovement(state, fighterId, valid)).toMatchObject({
      tag: "ok",
    });
    expect(
      parseBattleMovement(
        state,
        fighterId,
        simpleMovementFill(hole, { movementCostFeet: movementFeet(0) }),
      ),
    ).toMatchObject({
      tag: "invalid",
      message: "Movement cost must be a positive integer.",
    });
    expect(
      parseBattleMovement(
        state,
        fighterId,
        simpleMovementFill(hole, { speedKind: "fly" as never }),
      ),
    ).toMatchObject({
      tag: "invalid",
      message: "Movement speed kind is not represented for this combatant.",
    });
    const forceful = {
      ...valid,
      value: {
        ...valid.value,
        brutalStrikeForcefulBlow: {
          kind: "brutalStrikeForcefulBlowStraightTowardTarget" as const,
          targetId: fighterId,
        },
        additionalSpeedSegments: [],
      },
    } as BattleFill;
    expect(
      parseBattleMovement(
        state,
        fighterId,
        forceful as Extract<BattleFill, { kind: "movement" }>,
        {
          kind: "brutalStrikeForcefulBlow",
          targetId: goblinId,
          movementBudgetFeet: movementFeet(30),
        },
      ),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Brutal Strike Forceful Blow movement must be straight toward the attack target.",
    });
    expect(
      parseBattleMovement(
        state,
        fighterId,
        forceful as Extract<BattleFill, { kind: "movement" }>,
        {
          kind: "brutalStrikeForcefulBlow",
          targetId: fighterId,
          movementBudgetFeet: movementFeet(30),
        },
      ),
    ).toMatchObject({ tag: "ok", movement: { spendsTurnMovement: false } });
    const goblinMovementHole = hole;
    expect(
      parseBattleMovement(
        state,
        goblinId,
        simpleMovementFill(goblinMovementHole, {
          acrobaticMovement: {
            kind: "acrobaticMovement",
            paths: ["acrossLiquid"],
            withoutFallingDuringMovement: true,
          },
        }),
      ),
    ).toMatchObject({ tag: "invalid" });
    expect(
      parseBattleMovement(
        state,
        goblinId,
        simpleMovementFill(goblinMovementHole, {
          creatureSpaceTraversal: {
            destination: { kind: "unoccupiedSpace", positionId: "p1" as never },
            positionsEnteredBeforeDestination: [],
          } as never,
        }),
      ),
    ).toMatchObject({ tag: "invalid" });
  });

  test("movement routes and speed projections are deterministic across empty and represented branches", () => {
    const state = fighterVsGoblinBattle();
    const fighterCombatant = state.combatants.get(fighterId);
    const goblinCombatant = state.combatants.get(goblinId);
    if (fighterCombatant === undefined || goblinCombatant === undefined) {
      throw new Error("Expected canonical fighter and goblin combatants.");
    }
    const budget = battleMovementBudget(state, fighterCombatant);
    expect(Number(budget.speedFeet)).toBeGreaterThan(0);
    expect(battleMovementBudget(state, undefined)).toEqual({
      speedFeet: 0,
      spentFeet: 0,
      remainingFeet: 0,
      speedKinds: [],
    });
    const hole = moveHole(state, fighterId);
    const movement = simpleMovementFill(hole);
    const subject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    } as const;
    const act = { subject, initialHoles: [hole] };
    expect(movementRouteForDiscoveredAct(state, act)).toBeUndefined();
    expect(
      movementRouteForResolution(
        {
          admissionKind: "general",
          state,
          subject,
          fills: [movement],
        } as never,
        {
          tag: "invalid",
          reason: "invalidFill",
          message: "Movement cost is invalid.",
          snapshot: snapshotBattle(state),
        },
      ),
    ).toBeUndefined();
    const specialState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...fighterCombatant,
        activeEffects: [
          ...fighterCombatant.activeEffects,
          {
            kind: "specialSpeedGrant" as const,
            sourceProcedureRef:
              battleProcedureExecutionRefForTest("boundary-fly"),
            sourceCombatantId: fighterId,
            speedKind: "fly" as const,
            speed: { kind: "fixed" as const, speedFeet: movementFeet(40) },
            hover: true,
            expiresAt: { kind: "untilDispelled" as const },
          },
        ],
      }),
    } as BattleState;
    const specialSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    } as const;
    const specialHole = moveHole(specialState, fighterId);
    const specialFill = simpleMovementFill(specialHole, { speedKind: "fly" });
    expect(
      movementRouteForDiscoveredAct(specialState, {
        subject: specialSubject,
        initialHoles: [specialHole],
      }),
    ).toMatchObject([
      {
        kind: "discoverBattleActs",
        subject: "specialSpeedProjection",
        holes: [],
        owner: "battleCreatureState",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "specialSpeedProjection",
        holes: [],
        owner: "battleCreatureState",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "specialSpeedProjection",
        holes: [],
        owner: "battleMovementResource",
      },
      {
        kind: "discoverBattleActs",
        subject: "movementResource",
        holes: ["movement"],
        owner: "battleMovementResource",
      },
    ]);
    expect(
      movementRouteForResolution(
        {
          admissionKind: "general",
          state: specialState,
          subject: specialSubject,
          fills: [specialFill],
        } as never,
        {
          tag: "resolved",
          state: specialState,
          snapshot: snapshotBattle(specialState),
        } as never,
      ),
    ).toMatchObject([
      {
        kind: "resolveBattleSubject",
        subject: "movementResource",
        fill: "movement",
        holes: [],
        owner: "battleMovementResource",
      },
    ]);
    const deniedState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...goblinCombatant,
        activeEffects: [
          ...goblinCombatant.activeEffects,
          {
            kind: "opportunityAttackDenied" as const,
            sourceCombatantId: goblinId,
            sourceProcedureRef:
              battleProcedureExecutionRefForTest("boundary-denied"),
            expiresAt: { kind: "startOfTurn" as const, combatantId: goblinId },
          },
        ],
      }),
    } as BattleState;
    const candidateKinds = (
      reactorId: typeof fighterId | typeof goblinId,
      moverId: typeof fighterId | typeof goblinId,
    ) =>
      opportunityAttackExecutionCandidates(state, reactorId, moverId).map(
        ({ selection }) =>
          opportunityAttackOptionForReactor(
            state,
            reactorId,
            moverId,
            selection,
          )?.kind,
      );
    expect(candidateKinds(goblinId, fighterId)).toContain("statBlockAttack");
    expect(candidateKinds(fighterId, goblinId)).toEqual(
      expect.arrayContaining(["weapon", "unarmedStrike"]),
    );
    expect(
      opportunityAttackExecutionCandidates(state, fighterId, fighterId),
    ).toEqual([]);
    const blindedState = {
      ...state,
      combatants: new Map(state.combatants).set(
        goblinId,
        testBattleCreatureStateWithConditions(
          goblinCombatant,
          applyCondition(goblinCombatant.conditions, "blinded"),
        ),
      ),
    } as BattleState;
    expect(combatantCanSee(blindedState, goblinId, fighterId)).toBe(false);
    expect(
      opportunityAttackExecutionCandidates(blindedState, goblinId, fighterId),
    ).toEqual([]);
    const reactionSpentState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...goblinCombatant,
        reactionAvailable: false,
      }),
    } as BattleState;
    expect(
      opportunityAttackExecutionCandidates(
        reactionSpentState,
        goblinId,
        fighterId,
      ),
    ).toEqual([]);
    expect(
      opportunityAttackExecutionCandidates(
        {
          ...state,
          currentTurnResources: {
            ...state.currentTurnResources,
            disengaged: true,
          },
        },
        goblinId,
        fighterId,
      ),
    ).toEqual([]);
    expect(
      opportunityAttackExecutionCandidates(deniedState, goblinId, fighterId),
    ).toEqual([]);
    expect(
      opportunityAttackOptionForReactor(deniedState, goblinId, fighterId, {
        reactorId: goblinId,
        attack: { kind: "unarmedStrike" },
      } as never),
    ).toBeUndefined();
    expect(
      opportunityAttackOptionForReactor(state, fighterId, goblinId, {
        reactorId: fighterId,
        attack: { kind: "unarmedStrike" },
      } as never),
    ).toBeUndefined();
    expect(
      opportunityAttackSelectionForReactor(state, fighterId, goblinId, {
        reactorId: fighterId,
        attack: { kind: "unarmedStrike" },
      } as never),
    ).toBeUndefined();
    expect(
      meleeWeaponOrUnarmedStrikeSelectionsForReactor(state, fighterId, goblinId)
        .length,
    ).toBeGreaterThan(0);
    expect(
      Number.isFinite(unarmedStrikeSaveDcAbilityModifier(goblinCombatant)),
    ).toBe(true);
  });

  test("reaction roll protocol distinguishes flat, half, required, duplicate, and valid fills", () => {
    const setup = goblinScimitarHitReactionSetup(
      goblinAttacksReactionModifierCharacter({
        unit: uncannyDodgeUnit(),
        className: "rogue",
        level: 5,
        unitId: "boundary-reaction-roll",
      }),
    );
    expect(setup.result.tag).toBe("needsHoles");
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected reaction roll frontier.");
    }
    const pendingInterrupt = setup.result.snapshot.pendingInterrupt;
    if (pendingInterrupt === null) {
      throw new Error("Expected reaction interrupt choices.");
    }
    const choice = reactionModifierChoice(
      pendingInterrupt.choices,
      "uncanny",
      "attackDamageReduction",
    );
    expect(reactionModifierReductionRoll(choice.choice, [])).toMatchObject({
      tag: "ok",
      value: 0,
    });
    const roll = damageRollFill(reactionModifierRollHole(), 3);
    expect(reactionModifierReductionRoll(choice.choice, [roll])).toMatchObject({
      tag: "invalid",
    });
    const rolledChoice = {
      ...choice.choice,
      reduction: {
        kind: "rolled" as const,
        dice: 1,
        dieSize: 6,
        flatModifier: 0,
      },
      initialHoles: [reactionModifierRollHole()],
    } as never;
    expect(reactionModifierReductionRoll(rolledChoice, [])).toMatchObject({
      tag: "invalid",
    });
    const rolledFill = damageRollFill(reactionModifierRollHole(), 3);
    expect(
      reactionModifierReductionRoll(rolledChoice, [rolledFill]),
    ).toMatchObject({ tag: "ok" });
    const duplicateRoll = {
      ...rolledFill,
      value: [
        ...(rolledFill as Extract<BattleFill, { kind: "rolledDice" }>).value,
      ],
    } as Extract<BattleFill, { kind: "rolledDice" }>;
    expect(
      reactionModifierReductionRoll(rolledChoice, [rolledFill, duplicateRoll]),
    ).toMatchObject({ tag: "invalid" });
    expect(reactionModifierRollHole()).toMatchObject({ kind: "rolledDice" });
    const spendingChoice = {
      kind: "attackRollReduction" as const,
      reduction: {
        kind: "rolled" as const,
        dice: 1,
        dieSize: 6 as never,
        flatModifier: 0,
        spends: {
          resourcePoolRef: "boundary-resource" as never,
          amount: 1 as never,
        },
      },
    } as never;
    expect(reactionModifierResourceSpend(spendingChoice)).toEqual({
      resourcePoolRef: "boundary-resource",
      amount: 1,
    });
    expect(
      reactionModifierResourceSpend({
        kind: "attackRollReduction",
        reduction: { kind: "halfDamage" },
      } as never),
    ).toBeNull();
    expect(
      reactionReductionResourceDieLabel({
        dice: 2,
        dieSize: 8,
        flatModifier: -1,
      }),
    ).toBe("2d8-1");
    expect(
      attackDamageReductionOriginalDamageType(
        ["poison"],
        "sameTypeDealtByAttack",
      ),
    ).toBe("bludgeoning");
    expect(
      attackDamageReductionOriginalDamageType(
        ["piercing", "poison"],
        "sameTypeDealtByAttack",
      ),
    ).toBe("piercing");
    expect(
      reactionModifierProcedureSource(
        setup.result.state,
        goblinId,
        choice.choice.procedureRef,
      ),
    ).toBeUndefined();
    const frame = currentInterruptCheckpoint(setup.result.state);
    if (frame === null)
      throw new Error("Expected reaction interrupt checkpoint.");
    expect(
      reactionRollOrDamageReductionChoices(setup.result.state, {
        ...frame,
        trigger: "spellCast",
      } as never),
    ).toEqual([]);
    const source = reactionModifierProcedureSource(
      setup.result.state,
      fighterId,
      choice.choice.procedureRef,
    );
    if (source === undefined)
      throw new Error("Expected reaction modifier source.");
    const modifier = source.execution.modifiers[0];
    if (modifier === undefined) throw new Error("Expected reaction modifier.");
    expect(
      reactionModifierResourceAvailable(
        setup.result.state,
        fighterId,
        source.source,
        modifier,
      ),
    ).toBe(true);
    expect(
      reactionRollOrDamageReductionChoices(setup.result.state, frame),
    ).toEqual(expect.arrayContaining([choice]));
    expect(
      reactionRollOrDamageReductionChoiceForProfile(
        setup.result.state,
        frame,
        fighterId,
        choice.choice.procedureRef,
        source.source,
        source.execution,
        modifier,
      ),
    ).toEqual(expect.arrayContaining([choice]));
    expect(
      spendReactionModifierResource(
        setup.result.state,
        fighterId,
        source.source,
        choice.choice,
      ),
    ).not.toBe(setup.result.state);
    expect(
      spendReactionModifierResource(
        setup.result.state,
        goblinId,
        source.source,
        choice.choice,
      ),
    ).toBe(setup.result.state);
    const fallFrame = {
      trigger: "creatureFalls" as const,
      fallingCreatureId: fighterId,
      reactionSpellTargetFacts: [],
      landingMitigations: [],
    } as never;
    const fallModifier = {
      kind: "fallDamageReduction" as const,
      reduction: { multiplier: 5 },
    } as never;
    expect(
      reactionRollOrDamageReductionChoiceForProfile(
        setup.result.state,
        fallFrame,
        fighterId,
        choice.choice.procedureRef,
        source.source,
        { ...source.execution, classLevel: 5 } as never,
        fallModifier,
      ),
    ).toHaveLength(1);
    expect(
      reactionRollOrDamageReductionChoiceForProfile(
        setup.result.state,
        fallFrame,
        goblinId,
        choice.choice.procedureRef,
        source.source,
        { ...source.execution, classLevel: 5 } as never,
        fallModifier,
      ),
    ).toEqual([]);
  });

  test("redirect target/spatial/resource boundaries preserve state and classify malformed selections", () => {
    const state = fighterVsGoblinBattle();
    expect(
      attackDamageReductionZeroDamageRedirectTargetChoices(state, fighterId),
    ).toContain(goblinId);
    const redirect = {
      spends: { resourcePoolRef: "missing" as never, amount: 1 as never },
      saveAbility: "dex" as const,
      saveDc: 10 as never,
      damageDice: { dice: 2 as const, dieSize: 6 as never },
      damageAbilityModifier: 0 as never,
      attackKind: "melee" as const,
      targetGate: {
        melee: "visibleWithin5Feet" as const,
        ranged: "visibleWithin60FeetWithoutTotalCover" as const,
      },
      originalDamageType: "bludgeoning" as const,
    } as AttackDamageReductionZeroDamageRedirectOffer;
    const offer = {
      reactorId: fighterId,
      source: { kind: "resourcePool", resourcePoolRef: "missing" as never },
      execution: {
        kind: "reactionRollOrDamageReduction" as const,
        classLevel: 1 as never,
        modifiers: [],
      },
      redirect,
    } as never;
    expect(
      attackDamageReductionRedirectResourceAvailable(
        state,
        fighterId,
        redirect,
      ),
    ).toBe(false);
    expect(
      attackDamageReductionRedirectResource(
        state.combatants.get(fighterId),
        redirect,
      ),
    ).toBeUndefined();
    expect(attackDamageReductionZeroDamageRedirectHoles(state, offer)).toEqual(
      [],
    );
    expect(
      hasAttackDamageReductionRedirectTargetSpatialFact(
        [
          {
            kind: "meleeRedirectTargetWithin5Feet",
            sourceId: fighterId,
            targetId: goblinId,
          },
        ],
        fighterId,
        goblinId,
        "melee",
        redirect.targetGate,
      ),
    ).toBe(true);
    const before = snapshotBattle(state);
    expect(
      spendAttackDamageReductionRedirectResource(state, fighterId, redirect),
    ).toBe(state);
    expect(snapshotBattle(state)).toEqual(before);
    expect(
      attackDamageReductionZeroDamageRedirectSelection({
        state,
        reactorId: fighterId,
        offer: redirect,
        target: undefined,
        save: undefined,
        damage: undefined,
      }),
    ).toEqual({ tag: "ok", value: undefined });

    const monkUnit = unitLibrary.requireUnit("monk_deflect_attacks");
    if (monkUnit.kind !== "class_feature") {
      throw new Error("Expected Deflect Attacks class feature fixture.");
    }
    const monkState = goblinAttacksReactionModifierCharacter({
      unit: monkUnit,
      className: "monk",
      level: 5,
      unitId: "boundary-redirect-real",
      resources: [monkDeflectAttacksFocusResource({ usesRemaining: 2 })],
    });
    const monkSetup = goblinScimitarHitReactionSetup(monkState);
    if (monkSetup.result.tag !== "needsHoles") {
      throw new Error("Expected Monk redirect interrupt checkpoint.");
    }
    const monkPendingInterrupt = monkSetup.result.snapshot.pendingInterrupt;
    if (monkPendingInterrupt === null) {
      throw new Error("Expected Monk redirect choices.");
    }
    const monkChoice = reactionModifierChoice(
      monkPendingInterrupt.choices,
      "deflect",
      "attackDamageReduction",
    );
    if (!("zeroDamageRedirect" in monkChoice.choice)) {
      throw new Error("Expected Deflect Attacks redirect choice.");
    }
    const monkRedirect = monkChoice.choice.zeroDamageRedirect;
    if (monkRedirect === undefined) {
      throw new Error("Expected Deflect Attacks redirect offer.");
    }
    const monkSource = reactionModifierProcedureSource(
      monkSetup.result.state,
      fighterId,
      monkChoice.choice.procedureRef,
    );
    if (monkSource === undefined)
      throw new Error("Expected Monk modifier source.");
    const monkOffer = {
      reactorId: fighterId,
      ...monkSource,
      redirect: monkRedirect,
    } as never;
    const redirectHoles = attackDamageReductionZeroDamageRedirectHoles(
      monkSetup.result.state,
      monkOffer,
    );
    expect(redirectHoles).toHaveLength(3);
    const redirectTargetHole = redirectHoles.find(
      (hole) => hole.kind === "targetChoice",
    );
    const redirectSaveHole = redirectHoles.find(
      (hole) => hole.kind === "savingThrowOutcome",
    );
    const redirectDamageHole = redirectHoles.find(
      (hole) => hole.kind === "rolledDice",
    );
    if (
      redirectTargetHole === undefined ||
      redirectSaveHole === undefined ||
      redirectDamageHole === undefined
    ) {
      throw new Error("Expected complete redirect hole contract.");
    }
    const monkTarget = targetFill(redirectTargetHole, goblinId, [
      {
        kind: "meleeRedirectTargetWithin5Feet",
        sourceId: fighterId,
        targetId: goblinId,
      },
    ]);
    const monkSave = savingThrowOutcomeFill(redirectSaveHole, [
      { targetId: goblinId, succeeded: true, withoutRoll: true },
    ]);
    const monkDamage = damageRollFillWithGroups(redirectDamageHole, [[1, 1]]);
    expect(
      attackDamageReductionZeroDamageRedirectSelection({
        state: monkSetup.result.state,
        reactorId: fighterId,
        offer: monkRedirect,
        target: monkTarget as Extract<BattleFill, { kind: "targetChoice" }>,
        save: monkSave as Extract<BattleFill, { kind: "savingThrowOutcome" }>,
        damage: monkDamage as Extract<BattleFill, { kind: "rolledDice" }>,
      }),
    ).toMatchObject({
      tag: "ok",
      value: { targetId: goblinId, savingThrowSucceeded: true },
    });
    const relationshipParse = DamageRelationshipDecisionsByHole.parse({
      fills: [],
      damageEventHoleIds: new Set([redirectDamageHole.holeId]),
      owner: "an Attack",
    });
    if (relationshipParse.tag !== "ok") {
      throw new Error("Expected empty redirect relationship decisions.");
    }
    const resolvedRedirect =
      resolveAttackDamageReductionZeroDamageRedirectAfterReduction({
        state: monkSetup.result.state,
        reductions: [
          {
            reactorId: fighterId,
            procedureRef: monkChoice.choice.procedureRef,
            reduction: monkChoice.choice.reduction,
            reductionAmount: 0,
            zeroDamageRedirect: monkRedirect,
          },
        ],
        reducedDamageBeforeTargetAdjustments: 0 as never,
        redirectTarget: monkTarget as Extract<
          BattleFill,
          { kind: "targetChoice" }
        >,
        redirectSave: monkSave as Extract<
          BattleFill,
          { kind: "savingThrowOutcome" }
        >,
        redirectDamage: monkDamage as Extract<
          BattleFill,
          { kind: "rolledDice" }
        >,
        damageRelationshipDecisions:
          relationshipParse.decisionsByRelationshipHole,
      });
    expect(resolvedRedirect).toMatchObject({ tag: "ok" });
    expect(
      resolveAttackDamageReductionZeroDamageRedirectAfterReduction({
        state: monkSetup.result.state,
        reductions: [],
        reducedDamageBeforeTargetAdjustments: 1 as never,
        redirectTarget: undefined,
        redirectSave: undefined,
        redirectDamage: undefined,
        damageRelationshipDecisions:
          relationshipParse.decisionsByRelationshipHole,
      }),
    ).toMatchObject({ tag: "ok" });
    const spent = spendAttackDamageReductionRedirectResource(
      monkSetup.result.state,
      fighterId,
      monkRedirect,
    );
    expect(spent).not.toBe(monkSetup.result.state);
    const spentTwice = spendAttackDamageReductionRedirectResource(
      spent,
      fighterId,
      monkRedirect,
    );
    expect(
      attackDamageReductionRedirectResourceAvailable(
        spent,
        fighterId,
        monkRedirect,
      ),
    ).toBe(true);
    expect(
      attackDamageReductionRedirectResourceAvailable(
        spentTwice,
        fighterId,
        monkRedirect,
      ),
    ).toBe(false);
    expect(
      hasAttackDamageReductionRedirectTargetSpatialFact(
        [
          {
            kind: "rangedRedirectTargetWithin60FeetWithoutTotalCover",
            sourceId: fighterId,
            targetId: goblinId,
          },
        ],
        fighterId,
        goblinId,
        "ranged",
        monkRedirect.targetGate,
      ),
    ).toBe(true);
  });

  test("interrupt boundary routes preserve handled-trigger and empty-choice invariants", () => {
    const setup = goblinScimitarHitReactionSetup(
      goblinAttacksReactionModifierCharacter({
        unit: uncannyDodgeUnit(),
        className: "rogue",
        level: 5,
        unitId: "boundary-interrupts",
      }),
    );
    if (setup.result.tag !== "needsHoles")
      throw new Error("Expected attack-hit checkpoint.");
    const frame = currentInterruptCheckpoint(setup.result.state);
    if (frame === null) throw new Error("Expected current interrupt frame.");
    expect(
      interruptWindowProgress(setup.result.state, frame, frame.trigger),
    ).toEqual({
      tag: "interruptionsCleared",
    });
    const progressed = interruptWindowProgress(
      setup.result.state,
      frame,
      undefined,
    );
    expect(["interruptionsCleared", "windowOpened"]).toContain(progressed.tag);
    expect(
      maybeOpenInterruptWindow(setup.result.state, frame, frame.trigger),
    ).toBeNull();
    expect(
      maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices(
        setup.result.state,
        frame,
        frame.trigger,
      ),
    ).toBeNull();
    expect(
      attackHitBonusActionSpellReactionChoices(setup.result.state, frame),
    ).toEqual([]);
    const meleeSelection = meleeWeaponOrUnarmedStrikeSelectionsForReactor(
      setup.result.state,
      fighterId,
      goblinId,
    )[0];
    if (meleeSelection === undefined) {
      throw new Error("Expected canonical melee opportunity selection.");
    }
    expect(
      opportunityAttackReactionChoices(setup.result.state, goblinId, [
        {
          reactorId: fighterId,
          distanceFeet: movementFeet(5),
          ...meleeSelection,
        },
      ]),
    ).toMatchObject([
      {
        kind: "opportunityAttack",
        reactorId: fighterId,
        subject: { targetId: goblinId },
      },
    ]);
    expect(
      retaliationReactionAttackChoices(setup.result.state, {
        trigger: "afterDamage",
        damageSourceId: goblinId,
        damagedId: fighterId,
        damageAmount: 1 as never,
        reactionSpellTargetFacts: [
          {
            kind: "retaliationDamagerWithinFiveFeet",
            damagedId: fighterId,
            damageSourceId: goblinId,
          },
        ],
        continuation: {} as never,
      } as never),
    ).toEqual([]);
  });

  test("stat-block and character execution admission reject malformed boundaries and round-trip valid snapshots", () => {
    const authoredSource = statBlockRecord();
    const source = projectedStatBlockRuntimeSource(authoredSource);
    const valid = battleStatBlockCombatantSource(source);
    expect(Either.isRight(valid)).toBe(true);
    const unsupportedSectionProjection = projectAuthoredStatBlock(
      monsterResourceStatBlockWithUnsupportedAttackSections(),
    );
    expect(Either.isLeft(unsupportedSectionProjection)).toBe(true);
    if (Either.isRight(unsupportedSectionProjection)) return;
    expect(unsupportedSectionProjection.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [
        {
          section: "bonusActions",
          procedureOrdinal: 1,
        },
      ],
    });
    expect(
      battleStatBlockCombatantSource({
        ...source,
        statBlock: { ...source.statBlock, hp: { kind: "literal", value: 0 } },
      }),
    ).toMatchObject({ _tag: "Left" });
    expectCasterDerivedArmorClassSourceRejectedAtStatBlockDecodeBoundary(
      authoredSource,
    );
    const malformedCreatureType = decodeStatBlockRecordEither({
      ...authoredSource,
      statBlock: { ...authoredSource.statBlock, creatureType: 42 },
    });
    expect(Either.isLeft(malformedCreatureType)).toBe(true);
    expect(
      admitBattleStatBlockCombatant({
        battleId: battleId("boundary-stat-block-resistance-choice"),
        combatantId: combatantId("boundary-stat-block-resistance-choice"),
        statBlock: projectedStatBlockRuntimeSource({
          ...authoredSource,
          statBlock: {
            ...authoredSource.statBlock,
            resistances: { kind: "choose_one_from", options: ["fire"] },
          },
        }),
        startingScopeOrdinal: battleExecutionScopeOrdinal(0),
      }),
    ).toMatchObject({ _tag: "Left" });
    const malformedSize = decodeStatBlockRecordEither({
      ...authoredSource,
      statBlock: { ...authoredSource.statBlock, size: 17 },
    });
    expect(Either.isLeft(malformedSize)).toBe(true);
    expect(
      battleStatBlockCombatantSource({
        ...source,
        statBlock: {
          ...source.statBlock,
          hp: { kind: "literal", value: 1.25 },
        },
      }),
    ).toMatchObject({ _tag: "Left" });
    expect(
      admitBattleStatBlockCombatant({
        battleId: battleId("boundary-stat-block"),
        combatantId: combatantId("boundary-stat-block"),
        statBlock: source,
        startingScopeOrdinal: battleExecutionScopeOrdinal(0),
      }),
    ).toMatchObject({ _tag: "Right" });

    const executionSource = projectedStatBlockRuntimeSource(
      monsterResourceStatBlock(),
    );
    const admittedExecutionSource = Either.getOrThrow(
      battleStatBlockCombatantSource(executionSource),
    );
    const cohort = statBlockExecutionAdmissionCohort(
      battleId("boundary-stat-execution"),
      combatantId("boundary-stat-execution"),
      [admittedExecutionSource],
      battleExecutionScopeOrdinal(0),
    );
    const admission = cohort.admissions[0];
    if (admission === undefined)
      throw new Error("Expected Stat Block admission.");
    const snapshot = statBlockExecutionSnapshot(admission.execution);
    expect(
      restoreStatBlockExecutionAdmission(
        battleId("boundary-stat-execution"),
        combatantId("boundary-stat-execution"),
        executionSource,
        snapshot,
      ),
    ).toMatchObject({ _tag: "Right" });
    expect(
      restoreStatBlockExecutionAdmissions(
        battleId("boundary-stat-execution"),
        combatantId("boundary-stat-execution"),
        [
          {
            statBlock: executionSource,
            snapshot: {
              ...snapshot,
              procedureBindings: snapshot.procedureBindings.slice(1),
            },
          },
        ],
      ),
    ).toMatchObject({ _tag: "Left" });

    const sectionAdmissions = statBlockExecutionAdmissionCohort(
      battleId("boundary-stat-sections"),
      combatantId("boundary-stat-sections"),
      [
        battleStatBlockCombatantSource(
          projectedStatBlockRuntimeSource(monsterResourceStatBlock()),
        ),
        battleStatBlockCombatantSource(
          projectedStatBlockRuntimeSource(monsterMultiattackStatBlock()),
        ),
        battleStatBlockCombatantSource(
          projectedStatBlockRuntimeSource(
            monsterResourceStatBlockWithTwoRechargeActions(),
          ),
        ),
      ].map(Either.getOrThrow),
      battleExecutionScopeOrdinal(0),
    );
    expect(sectionAdmissions.admissions).toHaveLength(3);
    for (const sectionAdmission of sectionAdmissions.admissions) {
      const allocation = statBlockPresentationAllocation(sectionAdmission);
      expect(allocation.procedureRefs.size).toBe(
        sectionAdmission.execution.procedureBindings.length,
      );
      expect(
        allocation.occurrences.attacks.length +
          allocation.occurrences.multiattacks.length +
          allocation.occurrences.bonusActions.length,
      ).toBeGreaterThan(0);
    }
    const resourcePool = snapshot.resourcePools[0];
    if (resourcePool === undefined) {
      throw new Error("Expected Stat Block resource pool snapshot.");
    }
    expect(
      restoreStatBlockExecutionAdmission(
        battleId("boundary-stat-execution"),
        combatantId("boundary-stat-execution"),
        executionSource,
        {
          ...snapshot,
          resourcePools: [
            {
              ...resourcePool,
              ...(resourcePool.kind === "daily" ||
              resourcePool.kind === "legendaryActions"
                ? {
                    usesRemaining: (Number(resourcePool.usesMax) + 1) as never,
                  }
                : {}),
            },
            ...snapshot.resourcePools.slice(1),
          ],
        },
      ),
    ).toMatchObject({ _tag: "Left" });
    expect(
      restoreStatBlockExecutionAdmission(
        battleId("boundary-stat-execution"),
        combatantId("boundary-stat-execution"),
        executionSource,
        {
          ...snapshot,
          resourcePools: snapshot.resourcePools.slice(1),
        },
      ),
    ).toMatchObject({ _tag: "Left" });
    expect(
      restoreStatBlockExecutionAdmission(
        battleId("boundary-stat-other-battle"),
        combatantId("boundary-stat-execution"),
        executionSource,
        snapshot,
      ),
    ).toMatchObject({ _tag: "Left" });
    expect(
      restoreStatBlockExecutionAdmission(
        battleId("boundary-stat-execution"),
        combatantId("boundary-stat-execution"),
        executionSource,
        {
          ...snapshot,
          procedureBindings: snapshot.procedureBindings.map(
            (binding, index) => {
              if (
                index !== 0 ||
                !isNonSpellStatBlockProcedureBinding(binding)
              ) {
                return binding;
              }
              return {
                ...binding,
                resourcePoolRefs: [
                  ...binding.resourcePoolRefs,
                  ...binding.resourcePoolRefs,
                ],
              };
            },
          ),
        },
      ),
    ).toMatchObject({ _tag: "Left" });

    expect(
      characterExecutionFromUnits({
        battleId: battleId("boundary-character-execution"),
        combatantId: combatantId("boundary-character-execution"),
        scopeOrdinal: battleExecutionScopeOrdinal(0),
        unitFeatureProfiles: [],
        resourceUnits: [],
        units: [],
        unitRefs: [],
        classLevels: [],
      }),
    ).toMatchObject({ _tag: "Right" });
    const tacticalMind = unitLibrary.requireUnit("fighter_tactical_mind");
    const fighterLevels = [
      { className: "fighter" as const, level: classLevel(2) },
    ];
    const tacticalProfile = parseSupportedUnitFeatureProfile(
      tacticalMind,
      fighterLevels,
    );
    if (tacticalProfile === null)
      throw new Error("Expected Tactical Mind profile.");
    expect(
      unitFeatureProcedureExecution(tacticalProfile, {
        resourcePoolRefsByUnitId: new Map(),
      }),
    ).toBeUndefined();
    expect(
      characterExecutionFromUnits({
        battleId: battleId("boundary-character-missing-resource"),
        combatantId: combatantId("boundary-character-missing-resource"),
        scopeOrdinal: battleExecutionScopeOrdinal(0),
        unitFeatureProfiles: [tacticalProfile],
        resourceUnits: [],
        units: [tacticalMind],
        unitRefs: [],
        classLevels: fighterLevels,
      }),
    ).toMatchObject({ _tag: "Left" });
    const supportProfiles = battleUnitSupportProfilesForUnit({
      unit: tacticalMind,
      classLevels: fighterLevels,
    });
    if (Either.isLeft(supportProfiles)) {
      throw new Error("Expected Tactical Mind support profile admission.");
    }
    const supportProfile = supportProfiles.right[0];
    if (supportProfile === undefined) {
      throw new Error("Expected Tactical Mind support profile.");
    }
    expect(
      unitSupportProcedureExecution(supportProfile, {
        resourcePoolRefsByUnitId: new Map(),
        unitFeatureProcedureRefsByUnitId: new Map(),
        supportProcedureRefsByUnitId: new Map(),
      }),
    ).toBeUndefined();
  });

  test("invocation guards and fill equality are discriminant/oracle based", () => {
    const state = fighterVsGoblinBattle();
    const subject = magicSubject("eldritch_blast");
    const wizardSession = startBattleSessionRight({
      battleId: battleId("boundary-guards"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const wizardState = wizardSession.state;
    const act = findAct(wizardSession, subject);
    if (
      act.subject.tag !== "actionSpell" ||
      act.subject.procedureRef === undefined
    ) {
      throw new Error("Expected an action spell procedure reference.");
    }
    const wizard = wizardState.combatants.get(wizardId);
    if (wizard?.origin.kind !== "character")
      throw new Error("Expected character wizard.");
    const procedureRef = act.subject.procedureRef;
    const invocation = wizard.origin.execution.procedureBindings.find(
      (binding) => binding.procedureRef === procedureRef,
    )?.procedure;
    if (invocation?.kind !== "spellInvocation")
      throw new Error("Expected invocation binding.");
    const selected = invocation.execution;
    expect(
      activeOngoingFeaturesPreventSpellInvocation(
        wizardState,
        wizard,
        selected as never,
      ),
    ).toBe(false);
    const syntheticPreparedSource = {
      access: { tag: "prepared" as const },
      resource: { kind: "spellSlot" as const, spellLevel: 1 },
    } as never;
    const syntheticKnownSource = {
      access: { tag: "known" as const },
      resource: { kind: "spellSlot" as const, spellLevel: 1 },
    } as never;
    expect(isPreparedDamageSpellSource(syntheticPreparedSource)).toBe(true);
    expect(isPreparedDamageSpellSource(syntheticKnownSource)).toBe(false);
    expect(damageSpellSource(syntheticPreparedSource)).toEqual({
      access: { tag: "prepared" },
      resource: { kind: "spellSlot", spellLevel: 1 },
    });
    expect(
      isScalarBuffTargetListInvocation({
        targeting: { kind: "targetList", targetCount: 1 },
      } as never),
    ).toBe(true);
    expect(
      isTargetListSpellInvocation({
        targeting: { kind: "selfAndChosenLegalTargets" },
      } as never),
    ).toBe(true);
    expect(
      isTargetListSpellInvocation({ targeting: { kind: "self" } } as never),
    ).toBe(false);
    expect(
      spellDefinitionHasPricedOrConsumedMaterialComponent(
        spellRecord("cure_wounds"),
      ),
    ).toBe(false);
    expect(
      spellDefinitionHasPricedOrConsumedMaterialComponent(
        spellRecord("continual_flame"),
      ),
    ).toBe(true);
    expect(
      spellDefinitionHasPricedOrConsumedMaterialComponent({
        mechanics: {
          components: { v: true, s: true, m: "a small bell" },
          materialCostGp: undefined,
          materialConsumed: false,
        },
      } as never),
    ).toBe(false);
    expect(
      spellDefinitionHasPricedOrConsumedMaterialComponent({
        mechanics: {
          components: {
            v: true,
            s: true,
            m: { kind: "paired_worn_items" },
          },
        },
      } as never),
    ).toBe(true);

    const shieldSession = startBattleSessionRight({
      battleId: battleId("boundary-triggered-resource"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("shield")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const shieldWizard = shieldSession.state.combatants.get(wizardId);
    if (shieldWizard?.origin.kind !== "character") {
      throw new Error("Expected shield character fixture.");
    }
    const shieldBinding = shieldWizard.origin.execution.procedureBindings.find(
      (binding) =>
        binding.procedure.kind === "spellInvocation" &&
        binding.procedure.execution.procedure === "shieldReaction",
    );
    if (shieldBinding?.procedure.kind !== "spellInvocation") {
      throw new Error("Expected Shield reaction procedure fixture.");
    }
    const shieldInvocation = shieldBinding.procedure.execution as never;
    expect(
      triggeredReactionSpellTurnResourceAvailable(
        shieldSession.state,
        wizardId,
        shieldInvocation,
      ),
    ).toBe(true);
    const exhaustedState = {
      ...shieldSession.state,
      currentTurnResources: {
        ...shieldSession.state.currentTurnResources,
        spellSlotUsesThisTurn: [
          {
            kind: "committed" as const,
            combatantId: wizardId,
          },
        ],
      },
    };
    expect(
      triggeredReactionSpellTurnResourceAvailable(
        exhaustedState,
        wizardId,
        shieldInvocation,
      ),
    ).toBe(false);
    expect(
      triggeredReactionSpellTurnResourceAvailable(
        shieldSession.state,
        wizardId,
        { resource: { tag: "free" } } as never,
      ),
    ).toBe(true);

    const shieldAttackFrame = {
      trigger: "attackHit" as const,
      attackerId: goblinId,
      targetId: wizardId,
      attackKind: "meleeWeapon" as const,
      attackHitTriggerKind: "meleeWeapon" as const,
      damageTypes: ["slashing" as const],
      continuation: {
        kind: "resolved",
        subject: {
          tag: "runtimeCommand",
          actorId: wizardId,
          command: "move",
        },
      },
      reactionSpellTargetFacts: [],
    } as never;
    expect(
      triggeredReactionSpellChoices(shieldSession.state, shieldAttackFrame),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "castTriggeredReactionSpell",
          reactorId: wizardId,
        }),
      ]),
    );
    for (const triggerFrame of [
      { trigger: "spellCast", casterId: goblinId, targetIds: [] },
      { trigger: "afterDamage", damageSourceId: goblinId, damagedId: wizardId },
      { trigger: "creatureFalls", fallingCreatureId: wizardId },
    ]) {
      expect(
        triggeredReactionSpellChoices(shieldSession.state, {
          ...triggerFrame,
          reactionSpellTargetFacts: [],
        } as never),
      ).toEqual([]);
    }
    expect(
      reactionSpellTargetFactsForAfterDamage({
        damagedId: wizardId,
        damageSourceId: goblinId,
        facts: [
          {
            kind: "reactionSpellDamagerVisibleWithinRange",
            reactorId: wizardId,
            damageSourceId: goblinId,
            sourceProcedureRef: "boundary-reaction" as never,
            rangeFeet: 30,
          },
          {
            kind: "reactionSpellDamagerVisibleWithinRange",
            reactorId: goblinId,
            damageSourceId: wizardId,
            sourceProcedureRef: "boundary-reaction-reverse" as never,
            rangeFeet: 30,
          },
          {
            kind: "retaliationDamagerWithinFiveFeet",
            damagedId: wizardId,
            damageSourceId: goblinId,
          },
        ],
      } as never),
    ).toHaveLength(3);

    const movementHoleValue = moveHole(state, fighterId);
    const left = simpleMovementFill(movementHoleValue, {
      acrobaticMovement: {
        kind: "acrobaticMovement",
        paths: ["acrossLiquid"],
        withoutFallingDuringMovement: true,
      },
    });
    const right = simpleMovementFill(movementHoleValue, {
      acrobaticMovement: {
        kind: "acrobaticMovement",
        paths: ["acrossLiquid"],
        withoutFallingDuringMovement: true,
      },
    });
    expect(battleContinuationFillEquals(left, right)).toBe(true);
    expect(
      battleContinuationFillEquals(left, {
        ...right,
        value: { ...right.value, acrobaticMovement: undefined } as never,
      }),
    ).toBe(false);
    expect(battleFillPrefixAccumulated([left], [left, right])).toBe(true);
    expect(battleFillPrefixAccumulated([left], [right])).toBe(true);
    const rerollA = {
      kind: "reroll" as const,
      effectKind: "damage_dice_reroll" as const,
      dice: [{ original: 1, replacement: 2 }],
    } as never;
    const rerollB = {
      kind: "reroll" as const,
      effectKind: "synthetic_other" as never,
      dice: [{ original: 1, replacement: 2 }],
    } as never;
    const rolledA = {
      ...damageRollFill(
        { kind: "rolledDice", holeId: "boundary-reroll" as never },
        1,
      ),
      spellDamageReroll: rerollA,
    } as never;
    const rolledB = {
      ...damageRollFill(
        { kind: "rolledDice", holeId: "boundary-reroll" as never },
        1,
      ),
      spellDamageReroll: rerollB,
    } as never;
    expect(battleContinuationFillEquals(rolledA, rolledB)).toBe(false);
    const meleeThreat = meleeWeaponOrUnarmedStrikeSelectionsForReactor(
      state,
      fighterId,
      goblinId,
    )[0];
    if (meleeThreat === undefined) {
      throw new Error("Expected canonical melee opportunity threat.");
    }
    const threat = {
      reactorId: fighterId,
      distanceFeet: movementFeet(5),
      ...meleeThreat,
    };
    const withThreat = simpleMovementFill(movementHoleValue, {
      provokedOpportunityAttacks: [threat],
    });
    expect(battleContinuationFillEquals(withThreat, withThreat)).toBe(true);
    expect(
      battleContinuationFillEquals(withThreat, {
        ...withThreat,
        value: { ...withThreat.value, provokedOpportunityAttacks: [] },
      } as never),
    ).toBe(false);

    const comparableFill = (kind: string, value: unknown, holeId: string) =>
      ({ kind, holeId: holeId as never, value }) as never;
    const targetLeft = comparableFill(
      "targetChoice",
      goblinId,
      "boundary-target",
    );
    const targetRight = comparableFill(
      "targetChoice",
      goblinId,
      "boundary-target",
    );
    expect(battleContinuationFillEquals(targetLeft, targetRight)).toBe(true);
    expect(
      battleContinuationFillEquals(
        targetLeft,
        comparableFill("targetChoice", fighterId, "boundary-target"),
      ),
    ).toBe(false);

    const attackRollValue = {
      total: 12,
      naturalD20: 12,
      rollMode: "normal",
      rolledD20s: undefined,
    };
    expect(
      battleContinuationFillEquals(
        comparableFill("attackRoll", attackRollValue, "boundary-attack-roll"),
        comparableFill(
          "attackRoll",
          { ...attackRollValue },
          "boundary-attack-roll",
        ),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        comparableFill("attackRoll", attackRollValue, "boundary-attack-roll"),
        comparableFill(
          "attackRoll",
          { ...attackRollValue, total: 13 },
          "boundary-attack-roll",
        ),
      ),
    ).toBe(false);

    expect(
      battleContinuationFillEquals(
        comparableFill(
          "attackDamageDisposition",
          { kind: "ordinaryDamage" },
          "boundary-disposition",
        ),
        comparableFill(
          "attackDamageDisposition",
          { kind: "ordinaryDamage" },
          "boundary-disposition",
        ),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        comparableFill(
          "attackDamageDisposition",
          { kind: "ordinaryDamage" },
          "boundary-disposition",
        ),
        comparableFill(
          "attackDamageDisposition",
          { kind: "resistance" },
          "boundary-disposition",
        ),
      ),
    ).toBe(false);

    const concentrationValue = {
      succeeded: true,
      naturalD20: 10,
      rolledD20s: undefined,
      withoutRoll: false,
      d20TestNaturalOneReroll: undefined,
    };
    expect(
      battleContinuationFillEquals(
        comparableFill(
          "concentrationSavingThrow",
          concentrationValue,
          "boundary-concentration",
        ),
        comparableFill(
          "concentrationSavingThrow",
          { ...concentrationValue },
          "boundary-concentration",
        ),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        comparableFill(
          "concentrationSavingThrow",
          concentrationValue,
          "boundary-concentration",
        ),
        comparableFill(
          "concentrationSavingThrow",
          { ...concentrationValue, succeeded: false },
          "boundary-concentration",
        ),
      ),
    ).toBe(false);

    const savingValue = { outcomes: [] };
    expect(
      battleContinuationFillEquals(
        comparableFill("savingThrowOutcome", savingValue, "boundary-saving"),
        comparableFill(
          "savingThrowOutcome",
          { outcomes: [] },
          "boundary-saving",
        ),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        comparableFill("savingThrowOutcome", savingValue, "boundary-saving"),
        comparableFill(
          "savingThrowOutcome",
          { outcomes: [{ targetId: goblinId, succeeded: true }] },
          "boundary-saving",
        ),
      ),
    ).toBe(false);

    expect(
      battleContinuationFillEquals(
        comparableFill(
          "toolPossessionFacts",
          { toolIdsOnPerson: [] },
          "boundary-tools",
        ),
        comparableFill(
          "toolPossessionFacts",
          { toolIdsOnPerson: [] },
          "boundary-tools",
        ),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        comparableFill(
          "toolPossessionFacts",
          { toolIdsOnPerson: [] },
          "boundary-tools",
        ),
        comparableFill(
          "toolPossessionFacts",
          { toolIdsOnPerson: ["tool"] },
          "boundary-tools",
        ),
      ),
    ).toBe(false);

    const cover = { cover: "half" };
    expect(
      battleContinuationFillEquals(
        comparableFill(
          "cunningStrikeEndTurnCoverFacts",
          cover,
          "boundary-cover",
        ),
        comparableFill(
          "cunningStrikeEndTurnCoverFacts",
          { ...cover },
          "boundary-cover",
        ),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        comparableFill(
          "cunningStrikeEndTurnCoverFacts",
          cover,
          "boundary-cover",
        ),
        comparableFill(
          "cunningStrikeEndTurnCoverFacts",
          { cover: "threeQuarters" },
          "boundary-cover",
        ),
      ),
    ).toBe(false);

    expect(
      battleContinuationFillEquals(
        comparableFill("deathSavingThrow", 1, "boundary-death"),
        comparableFill("deathSavingThrow", 1, "boundary-death"),
      ),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(
        comparableFill("deathSavingThrow", 1, "boundary-death"),
        comparableFill("deathSavingThrow", 2, "boundary-death"),
      ),
    ).toBe(false);
  });

  test("spell-defense route projections follow discovered and resolved real spell states", () => {
    const mageSession = startBattleSessionRight({
      battleId: battleId("boundary-mage-armor-route"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("mage_armor")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const mageAct = findAct(mageSession, magicSubject("mage_armor"));
    expect(
      spellBaseArmorClassEffectRouteForDiscoveredAct(
        mageSession.state,
        mageAct,
      ),
    ).toMatchObject({
      kind: "discoverBattleActs",
      subject: "spellBaseArmorClassEffect",
      holes: ["targetChoice"],
      owner: "battleSpellSlotAndActionEconomy",
    });
    const mageTarget = requireHole(
      resolveBattleSubject({
        state: mageSession.state,
        subject: mageAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    if (mageTarget.procedureRef === undefined) {
      throw new Error("Expected Mage Armor target procedure provenance.");
    }
    const mageTargetFill = targetFill(mageTarget, wizardId, [
      {
        kind: "spellTarget",
        casterId: wizardId,
        targetId: wizardId,
        sourceProcedureRef: mageTarget.procedureRef,
      },
    ]);
    const mageResult = resolveBattleSubject({
      state: mageSession.state,
      subject: mageAct.subject,
      fills: [mageTargetFill],
    });
    expect(
      spellBaseArmorClassEffectRouteForResolution(
        {
          state: mageSession.state,
          subject: mageAct.subject,
          fills: [mageTargetFill],
        },
        mageResult,
      ),
    ).toMatchObject([
      {
        kind: "resolveBattleSubject",
        subject: "spellBaseArmorClassEffect",
        fill: "targetChoice",
        holes: [],
        owner: "battleTargetSelection",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "spellBaseArmorClassEffect",
        holes: [],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "spellBaseArmorClassEffect",
        holes: [],
        owner: "battleArmorClass",
      },
    ]);

    const sanctuarySession = startBattleSessionRight({
      battleId: battleId("boundary-sanctuary-route"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [spellRecord("sanctuary")],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "cleric",
              abilityModifier: 3,
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const sanctuaryAct = discoverBattleActCandidates(
      sanctuarySession.state,
    ).find((act) => act.subject.tag === "bonusActionSpell");
    if (sanctuaryAct === undefined) {
      throw new Error("Expected Sanctuary bonus-action act.");
    }
    expect(
      wardedTargetInterdictionRouteForDiscoveredAct(
        sanctuarySession.state,
        sanctuaryAct,
      ),
    ).toMatchObject([
      {
        kind: "discoverBattleActs",
        subject: "wardedTargetInterdiction",
        holes: ["targetChoice"],
        owner: "battleSpellSlotAndActionEconomy",
      },
    ]);

    const areaBaseSession = startBattleSessionRight({
      battleId: battleId("boundary-sanctuary-area-route"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [acidSplashWithRadius(5)],
            preparedSpells: [],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const warded = areaBaseSession.state.combatants.get(goblinId);
    if (warded === undefined) {
      throw new Error("Expected area-route ward target.");
    }
    const sanctuaryWard: BattleActiveEffect = {
      kind: "sanctuaryWard",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "boundary-area-sanctuary-source",
      ),
      sourceCombatantId: wizardId,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(10),
      },
    };
    const areaState = {
      ...areaBaseSession.state,
      combatants: new Map(areaBaseSession.state.combatants).set(goblinId, {
        ...warded,
        activeEffects: [sanctuaryWard],
      }),
    };
    const areaSession = battleRuntimeSessionForTest({
      state: areaState,
      context: areaBaseSession.context,
    });
    const areaAct = findAct(areaSession, magicSubject("acid_splash"));
    const areaHole = requireHole(
      {
        tag: "needsHoles",
        subject: areaAct.subject,
        holes: areaAct.initialHoles,
        state: areaState,
        snapshot: snapshotBattle(areaState),
      },
      "savingThrowOutcome",
    );
    expect(areaAct.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "savingThrowOutcome" }),
      ]),
    );
    const areaSavingFill = savingThrowOutcomeFill(areaHole, [
      { targetId: goblinId, succeeded: false },
    ]);
    const areaResult = resolveBattleSubject({
      state: areaState,
      subject: areaAct.subject,
      fills: [areaSavingFill],
    });
    expect(
      wardedTargetInterdictionRouteForResolution(
        {
          state: areaState,
          subject: areaAct.subject,
          fills: [areaSavingFill],
        },
        areaResult,
      ),
    ).toMatchObject([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "wardedTargetInterdiction",
        holes: [],
        owner: "battleAreaShape",
      },
    ]);
  });

  test("Find Familiar discovery preserves touch and Pact section boundaries", () => {
    const ownerSession = startBattleSessionRight({
      battleId: battleId("boundary-familiar-discovery"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          classLevels: [{ className: "warlock", level: 1 }],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("light"), spellRecord("shocking_grasp")],
              preparedSpells: [
                spellRecord("find_familiar"),
                spellRecord("cure_wounds"),
              ],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "warlock",
              abilityModifier: 3,
            },
            invocationSpellAccesses: [
              {
                tag: "pactOfTheChainFindFamiliar",
                spell: spellRecord("find_familiar"),
              },
            ],
          },
        }),
      ],
    });
    const familiarId = combatantId("boundary-familiar");
    const cast = castResolvedFindFamiliar({
      state: ownerSession.state,
      casterId: wizardId,
      familiarId,
      ammunitionStocks: [],
      resolvedForm: {
        statBlock: monsterResourceStatBlock(),
        creatureTypeOverride: "fey",
      },
      initiative: initiativeScore(5),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      retainedTransition: "reject",
    });
    if (cast.tag !== "resolved") {
      throw new Error(`Expected resolved Familiar cast, got ${cast.tag}.`);
    }
    const session = battleRuntimeSessionForTest({
      state: cast.state,
      context: ownerSession.context,
    });
    const candidates = discoverBattleActCandidates(session.state);
    const pactCandidates = candidates.filter(
      (act) => act.subject.tag === "pactOfTheChainFamiliarAttack",
    );
    const familiar = session.state.combatants.get(familiarId);
    if (familiar?.origin.kind !== "statBlock") {
      throw new Error("Expected admitted familiar Stat Block.");
    }
    const actionAttackBindings =
      familiar.origin.execution.procedureBindings.filter(
        (binding) =>
          binding.procedure.kind === "attack" &&
          binding.procedure.section === "actions",
      );
    const unarmedStrikeBindings =
      familiar.origin.execution.procedureBindings.filter(
        (binding) => binding.procedure.kind === "unarmedStrike",
      );
    const legendaryAttackProcedureRefs = new Set(
      familiar.origin.execution.procedureBindings.flatMap((binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.section === "legendaryActions"
          ? [binding.procedureRef]
          : [],
      ),
    );
    expect(actionAttackBindings).toHaveLength(2);
    expect(unarmedStrikeBindings).toHaveLength(1);
    expect(legendaryAttackProcedureRefs.size).toBeGreaterThan(0);
    expect(
      actionAttackBindings.every(
        (binding) =>
          binding.procedure.kind === "attack" &&
          expectedStatBlockDamageSelections(binding.procedure.attack).length ===
            4,
      ),
    ).toBe(true);
    expect(
      unarmedStrikeBindings.every(
        (binding) =>
          binding.procedure.kind === "unarmedStrike" &&
          expectedStatBlockDamageSelections(binding.procedure.attack).length ===
            1,
      ),
    ).toBe(true);
    const expectedPactSubjects = [
      ...actionAttackBindings,
      ...unarmedStrikeBindings,
    ].flatMap((binding): readonly PactFamiliarAttackSubject[] => {
      if (
        binding.procedure.kind !== "attack" &&
        binding.procedure.kind !== "unarmedStrike"
      ) {
        return [];
      }
      return expectedStatBlockDamageSelections(binding.procedure.attack).map(
        (statBlockDamageSelection) => ({
          tag: "pactOfTheChainFamiliarAttack" as const,
          actorId: wizardId,
          familiarId,
          procedureRef: binding.procedureRef,
          statBlockDamageSelection,
        }),
      );
    });
    const pactSubjects = pactCandidates.map((act) => {
      const subject = act.subject;
      if (subject.tag !== "pactOfTheChainFamiliarAttack") {
        throw new Error("Expected a Pact familiar attack candidate.");
      }
      return subject;
    });
    expect(
      pactSubjects.every(
        (subject) => !legendaryAttackProcedureRefs.has(subject.procedureRef),
      ),
    ).toBe(true);
    const distinctPactProcedureRefs = new Set(
      pactSubjects.map((subject) => subject.procedureRef),
    );
    expect(pactSubjects.length).toBeGreaterThan(distinctPactProcedureRefs.size);
    expect(
      pactSubjects.every((candidate, index) =>
        pactSubjects
          .slice(index + 1)
          .every((other) => !sameBattleSubject(candidate, other)),
      ),
    ).toBe(true);
    expect(pactSubjects.length).toBe(expectedPactSubjects.length);
    expect(
      pactSubjects.every((actualSubject) =>
        expectedPactSubjects.some((expectedSubject) =>
          sameBattleSubject(actualSubject, expectedSubject),
        ),
      ),
    ).toBe(true);
    expect(
      expectedPactSubjects.every((expectedSubject) =>
        pactSubjects.some((actualSubject) =>
          sameBattleSubject(expectedSubject, actualSubject),
        ),
      ),
    ).toBe(true);

    const available = discoverBattleActs(session);
    const familiarTouchSpellIds = available.flatMap((act) => {
      if (act.subject.tag !== "findFamiliarTouchSpell") return [];
      const presentation = battleActSpellPresentation(act);
      return presentation === undefined
        ? []
        : [presentation.invocation.spellId];
    });
    expect(familiarTouchSpellIds).toContain("cure_wounds");
    expect(familiarTouchSpellIds).not.toContain("light");
  });

  test("reachable discovery and stat-block attack boundaries reject unavailable resources and invalid choices", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter?.origin.kind !== "character") {
      throw new Error("Expected character fighter.");
    }
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block goblin.");
    }

    expect(
      addBattleCombatant({
        state,
        combatant: characterSeed({
          combatantId: combatantId("boundary-positive-hp-unconscious"),
          initiative: 5,
          currentHp: 2,
          maxHp: 2,
          conditions: ["unconscious"],
          positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Knocked Out Unconscious initialization requires exactly 1 current HP.",
      },
    });

    const baseWeapon = testCharacterWeaponAttackForUnit(
      unitId("weapon_flail"),
    ).weapon;
    const weapon = {
      ...baseWeapon,
      properties: [...baseWeapon.properties, { kind: "reach" as const }],
    };
    expect(weaponTargetConstraint(weapon)).toEqual({
      kind: "meleeReach",
      reachFeet: 10,
    });

    const statBlockAttack = statBlockAttackActionOptions(
      goblin.origin.execution,
    )[0];
    if (statBlockAttack === undefined) {
      throw new Error("Expected a Stat Block attack option.");
    }
    expect(attackActionVariantOptions(statBlockAttack)).toEqual([
      statBlockAttack,
    ]);

    const fighterAttack = attackActionOptionsForActor(state, fighterId)[0];
    if (fighterAttack === undefined) {
      throw new Error("Expected a fighter attack option.");
    }
    expect(
      frenzyDamageTypeDecision({
        state,
        attackerId: fighterId,
        attack: fighterAttack,
        hitWithAttackRoll: false,
        selectedDamageType: "fire",
      }),
    ).toEqual({
      tag: "invalid",
      message:
        "Frenzy damage type can be selected only for an eligible character attack.",
    });
    expect(
      frenzyDamageTypeDecision({
        state,
        attackerId: fighterId,
        attack: fighterAttack,
        hitWithAttackRoll: true,
        selectedDamageType: "fire",
      }),
    ).toEqual({
      tag: "invalid",
      message:
        "Frenzy damage type is not available for this attack resolution.",
    });

    const resourceMonster = monsterResourceStatBlock();
    const resourceActions = resourceMonster.statBlock.actions;
    const dreadGaze = resourceActions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "attack_roll" &&
        entry.procedure.name === "Dread Gaze",
    );
    const multiattackTemplate =
      monsterMultiattackStatBlock().statBlock.actions?.find(
        (entry) =>
          entry.kind === "executable" && entry.procedure.kind === "multiattack",
      );
    if (
      resourceActions === undefined ||
      dreadGaze === undefined ||
      multiattackTemplate === undefined ||
      multiattackTemplate.kind !== "executable" ||
      multiattackTemplate.procedure.kind !== "multiattack"
    ) {
      throw new Error("Expected canonical resource and multiattack fixtures.");
    }
    const limitedActions: NonNullable<typeof resourceActions> = [
      ...resourceActions,
      {
        ...multiattackTemplate,
        procedure: {
          ...multiattackTemplate.procedure,
          name: "Synthetic Limited Multiattack",
          dispatches: [
            {
              procedureOrdinal: dreadGaze.procedureOrdinal,
              count: { kind: "literal", value: 1 },
            },
          ],
        },
        resourceRefs: { kind: "none" },
      },
    ];
    const limitedMultiattack: StatBlockRecord = {
      ...resourceMonster,
      id: statBlockId("stat_block_boundary_limited_multiattack"),
      name: "Boundary Limited Multiattack Monster",
      provenance: {
        kind: "synthetic-test",
        section: "boundary unavailable multiattack fixture",
      },
      statBlock: {
        ...resourceMonster.statBlock,
        actions: limitedActions,
      },
    };
    const multiattackState = startBattleSessionRight({
      battleId: battleId("boundary-unavailable-multiattack"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: limitedMultiattack,
        }),
      ],
    }).state;
    const multiattackActor = multiattackState.combatants.get(goblinId);
    if (
      multiattackActor === undefined ||
      multiattackActor.origin.kind !== "statBlock"
    ) {
      throw new Error("Expected admitted multiattack Stat Block.");
    }
    const multiattackExecution = multiattackActor.origin.execution;
    const multiattackBinding =
      statBlockMultiattackBindings(multiattackExecution)[0];
    if (multiattackBinding === undefined) {
      throw new Error("Expected admitted multiattack binding.");
    }
    const multiattackDispatchPoolRefs = new Set(
      multiattackBinding.procedure.dispatchProcedureRefs.flatMap(
        (procedureRef) =>
          multiattackExecution.procedureBindings.find(
            (binding) => binding.procedureRef === procedureRef,
          )?.resourcePoolRefs ?? [],
      ),
    );
    expect(multiattackDispatchPoolRefs.size).toBeGreaterThan(0);
    const unavailableMultiattackState = {
      ...multiattackState,
      combatants: new Map(multiattackState.combatants).set(goblinId, {
        ...multiattackActor,
        origin: {
          ...multiattackActor.origin,
          execution: {
            ...multiattackActor.origin.execution,
            resourcePools: multiattackActor.origin.execution.resourcePools.map(
              (pool) =>
                multiattackDispatchPoolRefs.has(pool.resourcePoolRef) &&
                pool.kind === "daily"
                  ? { ...pool, usesRemaining: resourceCount(0) }
                  : pool,
            ),
          },
        },
      }),
    };
    const unavailableMultiattackActor =
      unavailableMultiattackState.combatants.get(goblinId);
    if (
      unavailableMultiattackActor === undefined ||
      unavailableMultiattackActor.origin.kind !== "statBlock"
    ) {
      throw new Error("Expected unavailable multiattack Stat Block.");
    }
    expect(
      unavailableMultiattackActor.origin.execution.resourcePools.some(
        (pool) =>
          pool.kind === "daily" &&
          multiattackDispatchPoolRefs.has(pool.resourcePoolRef) &&
          pool.usesRemaining === resourceCount(0),
      ),
    ).toBe(true);
    expect(
      statBlockMultiattackActs(unavailableMultiattackState, goblinId),
    ).toEqual([]);

    const limitedBonusAction = monsterResourceStatBlock();
    const bonusOption =
      monsterMultiattackStatBlock().statBlock.bonusActions?.find((entry) =>
        isNonSpellExecutableProcedureEntryOfKind(entry, "action_option"),
      );
    const dailyResource = limitedBonusAction.statBlock.resources?.find(
      (resource) => resource.limit.kind === "daily",
    );
    if (bonusOption === undefined || dailyResource === undefined) {
      throw new Error(
        "Expected canonical bonus action and daily resource fixtures.",
      );
    }
    const limitedBonusActionFixture: StatBlockRecord = {
      ...limitedBonusAction,
      id: statBlockId("stat_block_boundary_limited_bonus_action"),
      name: "Boundary Limited Bonus Action Monster",
      provenance: {
        kind: "synthetic-test",
        section: "boundary unavailable bonus action fixture",
      },
      statBlock: {
        ...limitedBonusAction.statBlock,
        bonusActions: [
          {
            ...bonusOption,
            resourceRefs: {
              kind: "some",
              ordinals: [dailyResource.ordinal],
            },
          },
        ],
      },
    };
    const bonusActionState = startBattleSessionRight({
      battleId: battleId("boundary-unavailable-bonus-action"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: limitedBonusActionFixture,
        }),
      ],
    }).state;
    const admittedBonus = bonusActionState.combatants.get(goblinId);
    if (
      admittedBonus === undefined ||
      admittedBonus.origin.kind !== "statBlock"
    ) {
      throw new Error("Expected admitted bonus-action Stat Block.");
    }
    const bonusExecution = admittedBonus.origin.execution;
    const bonusBinding = statBlockBonusActionOptionBindings(bonusExecution)[0];
    if (bonusBinding === undefined) {
      throw new Error("Expected admitted bonus-action binding.");
    }
    expect(bonusBinding.resourcePoolRefs.length).toBeGreaterThan(0);
    const unavailableBonusActionState = {
      ...bonusActionState,
      combatants: new Map(bonusActionState.combatants).set(goblinId, {
        ...admittedBonus,
        origin: {
          ...admittedBonus.origin,
          execution: {
            ...admittedBonus.origin.execution,
            resourcePools: bonusExecution.resourcePools.map((pool) =>
              bonusBinding.resourcePoolRefs.includes(pool.resourcePoolRef) &&
              pool.kind === "daily"
                ? { ...pool, usesRemaining: resourceCount(0) }
                : pool,
            ),
          },
        },
      }),
    };
    const unavailableBonusActionActor =
      unavailableBonusActionState.combatants.get(goblinId);
    if (
      unavailableBonusActionActor === undefined ||
      unavailableBonusActionActor.origin.kind !== "statBlock"
    ) {
      throw new Error("Expected unavailable bonus-action Stat Block.");
    }
    expect(
      unavailableBonusActionActor.origin.execution.resourcePools.some(
        (pool) =>
          pool.kind === "daily" &&
          bonusBinding.resourcePoolRefs.includes(pool.resourcePoolRef) &&
          pool.usesRemaining === resourceCount(0),
      ),
    ).toBe(true);
    expect(
      statBlockBonusActionOptionActs(unavailableBonusActionState, goblinId),
    ).toEqual([]);
  });
});
