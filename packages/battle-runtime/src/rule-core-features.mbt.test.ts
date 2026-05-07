// RAW-COVERAGE: verification-owner:focused-mbt RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.attack-damage-rider unit-feature.bonus-action-ongoing-rage unit-feature.first-attack-roll-reckless-advantage unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-critical-range-19
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt QMBT7 fighter_second_wind
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt QMBT9 fighter_action_surge fighter_improved_critical barbarian_rage barbarian_reckless_attack rogue_cunning_action rogue_evasion rogue_uncanny_dodge rogue_sneak_attack
// UNIT-IDENTITY-MBT-REPLAY: QMBT7 fighter_second_wind doDiscoverSecondWind doResolveSecondWindLow doResolveSecondWindHigh
// UNIT-IDENTITY-MBT-REPLAY: QMBT9 fighter_action_surge doActionSurgeActivate doActionSurgeRejectTwice
// UNIT-IDENTITY-MBT-REPLAY: QMBT9 fighter_improved_critical doImprovedCritical
// UNIT-IDENTITY-MBT-REPLAY: QMBT9 barbarian_rage doRageActivateAndDamage
// UNIT-IDENTITY-MBT-REPLAY: QMBT9 barbarian_reckless_attack doRecklessAttack
// UNIT-IDENTITY-MBT-REPLAY: QMBT9 rogue_cunning_action doCunningDash doCunningDisengage doCunningHide
// UNIT-IDENTITY-MBT-REPLAY: QMBT9 rogue_evasion doEvasionSuccess doEvasionFailure
// UNIT-IDENTITY-MBT-REPLAY: QMBT9 rogue_uncanny_dodge doUncannyDodge
// UNIT-IDENTITY-MBT-REPLAY: QMBT9 rogue_sneak_attack doSneakAttack
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import acidSplashInput from "../../surface/content/acid_splash.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  battleCombatantSide,
  battleId,
  characterBattleResourceUsage,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const ruleCoreFeatureMbtHoles = [
  "DamageRoll",
  "AbilityCheck",
  "SavingThrowOutcome",
  "ReactionDecision",
] as const;
type RuleCoreFeatureMbtHole = (typeof ruleCoreFeatureMbtHoles)[number];
const ruleCoreFeatureResults = [
  "init",
  "needsHoles",
  "resolved",
  "invalid",
] as const;
type RuleCoreFeatureResult = (typeof ruleCoreFeatureResults)[number];
const ruleCoreFeatureInvalidReasons = ["none", "staleSubject"] as const;
type RuleCoreFeatureInvalidReason =
  (typeof ruleCoreFeatureInvalidReasons)[number];
const actionSurgeGrants = [
  "NoActionSurgeActionGrant",
  "ActionSurgeActionAvailable",
  "ActionSurgeActionSpent",
] as const;
type ActionSurgeGrant = (typeof actionSurgeGrants)[number];

type RuleCoreFeatureProjection = {
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly reactionAvailable: boolean;
  readonly featureUsesRemaining: number;
  readonly actionSurgeGrant: ActionSurgeGrant;
  readonly actorHp: number;
  readonly targetHp: number;
  readonly dashBonusFeet: number;
  readonly disengaged: boolean;
  readonly hidden: boolean;
  readonly rageActive: boolean;
  readonly recklessActive: boolean;
  readonly incomingAttackAdvantage: boolean;
  readonly sneakAttackUsedThisTurn: boolean;
  readonly lastDamageAmount: number;
  readonly critical: boolean;
  readonly holes: readonly RuleCoreFeatureMbtHole[];
  readonly pendingReaction: boolean;
  readonly lastResult: RuleCoreFeatureResult;
  readonly lastInvalidReason: RuleCoreFeatureInvalidReason;
};
type ActivationMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>;
type SaveGateActivationPhase = Extract<
  ActivationMechanics["phases"][number],
  { readonly kind: "save_gate" }
>;

const actorId = combatantId("rule-core-feature-actor");
const targetId = combatantId("rule-core-feature-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const cunningActionSupportProfile = {
  kind: "alternateActionCost",
  from: { kind: "standardAction", actions: ["dash", "disengage", "hide"] },
  to: { kind: "bonusAction" },
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Rule-core Feature MBT Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const acidSplashUnit = decodeUnitRecordSync(acidSplashInput);
if (acidSplashUnit.kind !== "spell") {
  throw new Error("Expected Acid Splash to decode as a spell.");
}
const acidSplash = acidSplashUnit;

const driverSchema = {
  init: {},
  doActionSurgeActivate: {},
  doActionSurgeSpendAttack: {},
  doActionSurgeRejectTwice: {},
  doDiscoverSecondWind: {},
  doResolveSecondWindLow: {},
  doResolveSecondWindHigh: {},
  doCunningDash: {},
  doCunningDisengage: {},
  doCunningHide: {},
  doRageActivateAndDamage: {},
  doRecklessAttack: {},
  doSneakAttack: {},
  doImprovedCritical: {},
  doEvasionSuccess: {},
  doEvasionFailure: {},
  doCuttingWordsDamage: {},
  doUncannyDodge: {},
  step: {},
} as const;

function createRuleCoreFeatureDriver() {
  return defineDriver(driverSchema, () => {
    let state = featureBattle();
    let holes: readonly BattleHole[] = [];
    let lastResult: RuleCoreFeatureProjection["lastResult"] = "init";
    let lastInvalidReason: RuleCoreFeatureProjection["lastInvalidReason"] =
      "none";
    let lastDamageAmount = 0;
    let critical = false;
    let featureUsesRemaining = 1;
    let targetHpFallback = 12;

    function reset(): void {
      state = featureBattle();
      resetProjection();
    }

    function resetProjection(): void {
      holes = [];
      lastResult = "init";
      lastInvalidReason = "none";
      lastDamageAmount = 0;
      critical = false;
      featureUsesRemaining = 1;
      targetHpFallback = 12;
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "none";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastResult = "needsHoles";
        lastInvalidReason = "none";
        return;
      }
      if (!isRuleCoreFeatureInvalidReason(result.reason)) {
        throw new Error(
          `Unexpected rule-core Feature MBT invalid reason: ${result.reason}`,
        );
      }
      lastResult = "invalid";
      lastInvalidReason = result.reason;
    }

    function resolveSubject(
      subject: BattleSubject,
      fills: readonly BattleFill[] = [],
    ): BattleResolutionResult {
      const result = resolveBattleSubject({ state, subject, fills });
      recordResult(result);
      return result;
    }

    function resolveActorAttack(input: {
      readonly state: BattleState;
      readonly subject?: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "attack" }
      >;
      readonly naturalD20?: number;
      readonly damageRoll: number;
      readonly damageGroups?: readonly (readonly number[])[];
      readonly rollMode?: AttackRollMode;
      readonly activatedOngoingFeatureUnitId?: string;
      readonly selectedAttackDamageRiderUnitIds?: readonly string[];
    }): void {
      const subject = input.subject ?? actorAttackSubject("Longsword");
      const target = requireHole(
        resolveBattleSubject({ state: input.state, subject, fills: [] }),
        "targetChoice",
      );
      const attackRoll = requireHole(
        resolveBattleSubject({
          state: input.state,
          subject,
          fills: [
            attackTargetFill(
              target,
              subject.actorId,
              targetId,
              subject.attackName,
            ),
          ],
        }),
        "attackRoll",
      );
      const rollValue = {
        total: input.naturalD20 ?? 15,
        naturalD20: input.naturalD20 ?? 10,
        ...(input.rollMode === undefined ? {} : { rollMode: input.rollMode }),
        ...(input.activatedOngoingFeatureUnitId === undefined
          ? {}
          : {
              activatedOngoingFeatureUnitId:
                input.activatedOngoingFeatureUnitId,
            }),
      };
      const damage = requireHole(
        resolveBattleSubject({
          state: input.state,
          subject,
          fills: [
            attackTargetFill(
              target,
              subject.actorId,
              targetId,
              subject.attackName,
            ),
            attackRollFill(attackRoll, rollValue),
          ],
        }),
        "rolledDice",
      );
      const result = resolveBattleSubject({
        state: input.state,
        subject,
        fills: [
          attackTargetFill(
            target,
            subject.actorId,
            targetId,
            subject.attackName,
          ),
          attackRollFill(attackRoll, rollValue),
          damageRollFillWithGroups(
            damage,
            input.selectedAttackDamageRiderUnitIds === undefined
              ? (input.damageGroups ?? [[input.damageRoll]])
              : [[input.damageRoll], [6]],
            input.selectedAttackDamageRiderUnitIds,
          ),
        ],
      });
      recordResult(result);
    }

    return {
      init: reset,
      doActionSurgeActivate: () => {
        state = actionSurgeBattle();
        resetProjection();
        resolveSubject(unitFeatureSubject("fighter_action_surge"));
        featureUsesRemaining = resourceUsesRemaining(
          state,
          "fighter_action_surge",
        );
      },
      doActionSurgeSpendAttack: () => {
        resolveActorAttack({ state, damageRoll: 7 });
        featureUsesRemaining = resourceUsesRemaining(
          state,
          "fighter_action_surge",
        );
        lastDamageAmount = 7;
      },
      doActionSurgeRejectTwice: () => {
        const result = resolveBattleSubject({
          state,
          subject: unitFeatureSubject("fighter_action_surge"),
          fills: [],
        });
        recordResult(result);
        featureUsesRemaining = resourceUsesRemaining(
          state,
          "fighter_action_surge",
        );
      },
      doDiscoverSecondWind: () => {
        state = secondWindBattle();
        resetProjection();
        const act = findAct(state, unitFeatureSubject("fighter_second_wind"));
        holes = act.initialHoles;
        lastResult = "needsHoles";
        lastInvalidReason = "none";
        featureUsesRemaining = resourceUsesRemaining(
          state,
          "fighter_second_wind",
        );
      },
      doResolveSecondWindLow: () => resolveSecondWind(1),
      doResolveSecondWindHigh: () => resolveSecondWind(8),
      doCunningDash: () => resolveCunningAction("dash"),
      doCunningDisengage: () => resolveCunningAction("disengage"),
      doCunningHide: () => {
        state = cunningActionBattle();
        resetProjection();
        const subject = bonusActionStandardActionSubject("hide");
        const act = findAct(state, subject);
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              abilityCheckFill(
                requireHoleFromList(act.initialHoles, "abilityCheck"),
                16,
              ),
            ],
          }),
        );
      },
      doRageActivateAndDamage: () => {
        state = rageBattle();
        resetProjection();
        const raging = resolveBattleSubject({
          state,
          subject: unitFeatureSubject("barbarian_rage"),
          fills: [],
        });
        recordResult(raging);
        if (raging.tag !== "resolved") return;
        resolveActorAttack({ state: raging.state, damageRoll: 4 });
        featureUsesRemaining = resourceUsesRemaining(state, "barbarian_rage");
        lastDamageAmount = 7;
      },
      doRecklessAttack: () => {
        state = recklessBattle();
        resetProjection();
        resolveActorAttack({
          state,
          damageRoll: 7,
          rollMode: "advantage",
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        });
        lastDamageAmount = 7;
      },
      doSneakAttack: () => {
        state = sneakAttackBattle();
        resetProjection();
        resolveActorAttack({
          state,
          subject: actorAttackSubject("Dagger"),
          damageRoll: 4,
          rollMode: "advantage",
          selectedAttackDamageRiderUnitIds: ["rogue_sneak_attack"],
        });
        lastDamageAmount = 1;
      },
      doImprovedCritical: () => {
        state = improvedCriticalBattle();
        resetProjection();
        resolveActorAttack({
          state,
          naturalD20: 19,
          damageRoll: 4,
          damageGroups: [[4, 4]],
        });
        critical = true;
        lastDamageAmount = 8;
      },
      doEvasionSuccess: () => resolveDexHalfCantrip(true),
      doEvasionFailure: () => resolveDexHalfCantrip(false),
      doCuttingWordsDamage: () => {
        const cuttingWords = cuttingWordsDamageOnlyUnit();
        state = reactionModifierBattle({
          unit: cuttingWords,
          unitId: cuttingWords.id,
          className: "bard",
          level: 3,
          resources: [cuttingWordsResource(cuttingWords)],
        });
        resetProjection();
        resolveReactionDamageReduction({
          unitId: cuttingWords.id,
          modifierKind: "damageRollReduction",
          reductionRoll: 4,
          damageRoll: 9,
        });
        featureUsesRemaining = resourceUsesRemaining(state, cuttingWords.id);
        lastDamageAmount = 5;
      },
      doUncannyDodge: () => {
        state = reactionModifierBattle({
          unit: uncannyDodgeUnit(),
          unitId: "rogue_uncanny_dodge",
          className: "rogue",
          level: 5,
        });
        resetProjection();
        resolveReactionDamageReduction({
          unitId: "rogue_uncanny_dodge",
          modifierKind: "attackDamageReduction",
          damageRoll: 6,
        });
        featureUsesRemaining = 1;
        lastDamageAmount = 3;
      },
      step: () => {},
      getState: () =>
        projectRuleCoreFeatureState({
          state,
          holes,
          lastDamageAmount,
          critical,
          featureUsesRemaining,
          targetHpFallback,
          lastResult,
          lastInvalidReason,
        }),
    };

    function resolveSecondWind(roll: number): void {
      const hole = requireHoleFromList(holes, "rolledDice");
      recordResult(
        resolveBattleSubject({
          state,
          subject: unitFeatureSubject("fighter_second_wind"),
          fills: [damageRollFillWithGroups(hole, [[roll]])],
        }),
      );
      featureUsesRemaining = resourceUsesRemaining(
        state,
        "fighter_second_wind",
      );
      lastDamageAmount = roll === 1 ? 3 : 8;
    }

    function resolveCunningAction(action: "dash" | "disengage"): void {
      state = cunningActionBattle();
      resetProjection();
      recordResult(
        resolveBattleSubject({
          state,
          subject: bonusActionStandardActionSubject(action),
          fills: [],
        }),
      );
    }

    function resolveDexHalfCantrip(succeeded: boolean): void {
      state = evasionBattle();
      resetProjection();
      const subject: BattleSubject = {
        tag: "actionSpell",
        actorId: combatantId("rule-core-feature-wizard"),
        spellId: "dex_half_cantrip",
      };
      const savingThrow = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "savingThrowOutcome",
      );
      const fills = [
        savingThrowOutcomeFill(savingThrow, [{ targetId: actorId, succeeded }]),
      ];
      const first = resolveBattleSubject({ state, subject, fills });
      if (succeeded) {
        recordResult(first);
        lastDamageAmount = 0;
        return;
      }
      const damage = requireHole(first, "rolledDice");
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [...fills, damageRollFillWithGroups(damage, [[6]])],
        }),
      );
      lastDamageAmount = 3;
    }

    function resolveReactionDamageReduction(input: {
      readonly unitId: string;
      readonly modifierKind:
        | "attackRollReduction"
        | "damageRollReduction"
        | "attackDamageReduction";
      readonly reductionRoll?: number;
      readonly damageRoll: number;
    }): void {
      const subject = actorAttackSubject("Shortsword", targetId);
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const attackRoll = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [attackTargetFill(target, targetId, actorId, "Shortsword")],
        }),
        "attackRoll",
      );
      const prefixFills = [
        attackTargetFill(target, targetId, actorId, "Shortsword"),
        attackRollFill(attackRoll, { total: 12, naturalD20: 10 }),
      ];
      const awaited =
        input.modifierKind === "attackDamageReduction" ||
        input.modifierKind === "attackRollReduction"
          ? resolveBattleSubject({ state, subject, fills: prefixFills })
          : resolveBattleSubject({
              state,
              subject,
              fills: [
                ...prefixFills,
                damageRollFillWithGroups(
                  requireHole(
                    resolveBattleSubject({
                      state,
                      subject,
                      fills: prefixFills,
                    }),
                    "rolledDice",
                  ),
                  [[input.damageRoll]],
                ),
              ],
            });
      if (awaited.tag !== "needsHoles") {
        throw new Error(
          `Expected reaction window, got ${awaited.tag} for ${input.modifierKind}.`,
        );
      }
      const choice = reactionModifierChoice(
        awaited.snapshot.pendingReaction?.choices ?? [],
        input.unitId,
        input.modifierKind,
      );
      const reductionFills: readonly BattleFill[] =
        input.reductionRoll === undefined
          ? []
          : [
              damageRollFillWithGroups(
                requireHoleFromList(choice.initialHoles, "rolledDice"),
                [[input.reductionRoll]],
              ),
            ];
      const afterReaction = resolveBattleReaction({
        state: awaited.state,
        fill: reactionDecisionFill(
          requireHoleFromList(awaited.holes, "reactionDecision"),
          {
            kind: "resolve",
            reactorId: actorId,
            choice: {
              kind: "reactionRollOrDamageReduction",
              unitId: input.unitId,
              modifierKind: input.modifierKind,
              fills: reductionFills,
            },
          },
        ),
      });
      if (
        input.modifierKind === "damageRollReduction" ||
        input.modifierKind === "attackRollReduction"
      ) {
        recordResult(afterReaction);
        return;
      }
      if (afterReaction.tag !== "needsHoles") {
        throw new Error("Expected damage roll after reaction reduction.");
      }
      const damage = requireHole(afterReaction, "rolledDice");
      recordResult(
        resolveBattleSubject({
          state: afterReaction.state,
          subject,
          fills: [
            ...prefixFills,
            damageRollFillWithGroups(damage, [[input.damageRoll]]),
          ],
        }),
      );
    }
  });
}

const featureStateCheck = stateCheck(
  normalizeRuleCoreFeatureQuintState,
  compareRuleCoreFeatureState,
);

const ruleCoreFeatureDefaultMbtSteps = 6;

describe("rule-core Feature focused MBT", () => {
  it("replays QCORE9 feature procedure parity through battle-runtime reducers", async () => {
    await run({
      spec: path.resolve(import.meta.dirname, "../rule-core-features.mbt.qnt"),
      init: "init",
      step: "step",
      driver: createRuleCoreFeatureDriver(),
      backend: "typescript",
      seed: process.env["QUINT_SEED"],
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(
        process.env["MBT_STEPS"] ?? ruleCoreFeatureDefaultMbtSteps,
      ),
      stateCheck: featureStateCheck,
    });
  }, 120_000);
});

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function featureBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-feature"),
    combatants: [featureActor({ initiative: 20 }), featureTarget(10)],
  });
}

function actionSurgeBattle(): BattleState {
  const state = startBattleRight({
    battleId: battleId("rule-core-action-surge"),
    combatants: [
      featureActor({
        initiative: 20,
        resources: [unitResource("fighter_action_surge")],
      }),
      featureTarget(10),
    ],
  });
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [],
    },
  };
}

function secondWindBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-second-wind"),
    combatants: [
      featureActor({
        initiative: 20,
        currentHp: 4,
        classLevels: [{ className: "fighter", level: 2 }],
        resources: [unitResource("fighter_second_wind")],
      }),
      featureTarget(10),
    ],
  });
}

function cunningActionBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-cunning-action"),
    combatants: [
      featureActor({
        initiative: 20,
        characterUnitRefs: [
          {
            unitId: "rogue_cunning_action",
            supportProfiles: [cunningActionSupportProfile],
          },
        ],
      }),
      featureTarget(10),
    ],
    hidePrerequisites: new Map([
      [
        actorId,
        { kind: "coverOutOfEnemyLineOfSight" as const, cover: "total" },
      ],
    ]),
  });
}

function rageBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-rage"),
    combatants: [
      featureActor({
        initiative: 20,
        classLevels: [{ className: "barbarian", level: 9 }],
        resources: [unitResource("barbarian_rage")],
      }),
      featureTarget(10),
    ],
  });
}

function recklessBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-reckless"),
    combatants: [
      featureActor({
        initiative: 20,
        classLevels: [{ className: "barbarian", level: 2 }],
        unitFeatures: [
          { unit: unitLibrary.requireUnit("barbarian_reckless_attack") },
        ],
      }),
      featureTarget(10),
    ],
  });
}

function sneakAttackBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-sneak-attack"),
    combatants: [
      featureActor({
        initiative: 20,
        classLevels: [{ className: "rogue", level: 1 }],
        attack: zeroAbilityWeaponAttack("weapon_dagger"),
        unitFeatures: [{ unit: unitLibrary.requireUnit("rogue_sneak_attack") }],
        characterUnitRefs: [
          {
            unitId: "rogue_sneak_attack",
            supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
          },
        ],
      }),
      featureTarget(10),
    ],
  });
}

function improvedCriticalBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-improved-critical"),
    combatants: [
      featureActor({
        initiative: 20,
        characterUnitRefs: [
          {
            unitId: "fighter_improved_critical",
            supportProfiles: [
              WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
            ],
          },
        ],
      }),
      featureTarget(10),
    ],
  });
}

function evasionBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-evasion"),
    combatants: [
      featureActor({
        combatantId: combatantId("rule-core-feature-wizard"),
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: {
          spellcastingAbilityModifier: 3,
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [dexHalfDamageCantrip()],
          preparedSpells: [],
          spellSlots: [],
        },
      }),
      featureActor({
        initiative: 10,
        currentHp: 12,
        classLevels: [{ className: "rogue", level: 7 }],
        attack: null,
        unitFeatures: [{ unit: unitLibrary.requireUnit("rogue_evasion") }],
        characterUnitRefs: [
          {
            unitId: "rogue_evasion",
            supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
          },
        ],
      }),
    ],
  });
}

function reactionModifierBattle(input: {
  readonly unit: Extract<UnitRecord, { readonly kind: "class_feature" }>;
  readonly unitId: string;
  readonly className: "bard" | "rogue";
  readonly level: number;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
}): BattleState {
  return startBattleRight({
    battleId: battleId(`rule-core-${input.unitId}`),
    combatants: [
      featureTarget(20),
      featureActor({
        initiative: 10,
        classLevels: [{ className: input.className, level: input.level }],
        attack: null,
        resources: input.resources,
        unitFeatures: [{ unit: input.unit }],
        characterUnitRefs: [
          {
            unitId: input.unitId,
            supportProfiles: [
              REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
            ],
          },
        ],
      }),
    ],
  });
}

function featureActor(input: {
  readonly combatantId?: CombatantId;
  readonly displayName?: string;
  readonly initiative: number;
  readonly currentHp?: number;
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly attack?:
    | Extract<
        BattleCreatureInit["creatureInit"],
        { readonly kind: "character" }
      >["attack"]
    | null;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  const attack =
    input.attack === undefined
      ? zeroAbilityWeaponAttack("weapon_longsword")
      : input.attack;
  return {
    combatantId: input.combatantId ?? actorId,
    displayName: input.displayName ?? "Feature Actor",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId ?? actorId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: input.classLevels ?? [{ className: "fighter", level: 1 }],
      armorClass:
        attack === null
          ? defaultArmorClassState()
          : { ...defaultArmorClassState(), rightHandUse: "mainWeapon" },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout:
        attack === null
          ? {}
          : {
              weapon: {
                itemId: "main:feature-weapon",
                unitId: attack.weapon.id,
                grip: "one_handed" as const,
              },
            },
      attack,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.unitFeatures === undefined
        ? {}
        : { unitFeatures: input.unitFeatures }),
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function featureTarget(initiative: number): BattleCreatureInit {
  return {
    ...featureActor({
      combatantId: targetId,
      displayName: "Feature Target",
      initiative,
      attack: zeroAbilityWeaponAttack("weapon_shortsword"),
    }),
    side: oppositionSide,
  };
}

function zeroAbilityWeaponAttack(
  unitId: "weapon_longsword" | "weapon_dagger" | "weapon_shortsword",
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${unitId} weapon Unit.`);
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(0),
  };
}

function unitResource(
  unitId: string,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error(`Expected ${unitId} resource Unit.`);
  }
  return { unit, usesRemaining: 1 };
}

function cuttingWordsResource(
  unit: Extract<UnitRecord, { readonly kind: "class_feature" }>,
): ReturnType<typeof unitResource> {
  return { unit, usesRemaining: 1 };
}

function actorAttackSubject(
  attackName: "Longsword" | "Dagger" | "Scimitar" | "Shortsword",
  actor: CombatantId = actorId,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return { tag: "action", actorId: actor, action: "attack", attackName };
}

function unitFeatureSubject(
  unitId: string,
): Extract<BattleSubject, { readonly tag: "unitFeature" }> {
  return { tag: "unitFeature", actorId, unitId };
}

function bonusActionStandardActionSubject(
  action: "dash" | "disengage" | "hide",
): Extract<BattleSubject, { readonly tag: "bonusActionStandardAction" }> {
  return {
    tag: "bonusActionStandardAction",
    actorId,
    sourceUnitId: "rogue_cunning_action",
    action,
  };
}

function findAct(
  state: BattleState,
  subject: BattleSubject,
): ReturnType<typeof discoverBattleActs>[number] {
  const act = discoverBattleActs(state).find((candidate) =>
    isDeepStrictEqual(candidate.subject, subject),
  );
  if (act === undefined) {
    throw new Error(`Expected act ${JSON.stringify(subject)}.`);
  }
  return act;
}

function requireHole(
  result: BattleResolutionResult,
  kind: BattleHole["kind"],
): BattleHole {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles, got ${result.tag}.`);
  }
  return requireHoleFromList(result.holes, kind);
}

function requireHoleFromList(
  holes: readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole === undefined) throw new Error(`Expected ${kind} hole.`);
  return hole;
}

function attackTargetFill(
  hole: BattleHole,
  attackerId: CombatantId,
  defenderId: CombatantId,
  attackName: string,
): BattleFill {
  if (hole.kind !== "targetChoice") throw new Error("Expected targetChoice.");
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: defenderId,
    spatialFacts: [
      attackName === "Shortbow"
        ? {
            kind: "attackTargetInRangedRange",
            actorId: attackerId,
            targetId: defenderId,
            attackName,
            rangeBand: "normal",
          }
        : {
            kind: "attackTargetInMeleeReach",
            actorId: attackerId,
            targetId: defenderId,
            attackName,
          },
      {
        kind: "sneakAttackAllyWithin5FeetOfTarget",
        attackerId,
        targetId: defenderId,
        allyId: combatantId("rule-core-feature-ally"),
      },
      {
        kind: "spellTarget",
        casterId: combatantId("rule-core-feature-wizard"),
        targetId: defenderId,
        spellId: "dex_half_cantrip",
      },
    ],
  };
}

function abilityCheckFill(hole: BattleHole, total: number): BattleFill {
  if (hole.kind !== "abilityCheck") throw new Error("Expected abilityCheck.");
  return { kind: "abilityCheck", holeId: hole.holeId, value: { total } };
}

function attackRollFill(
  hole: BattleHole,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: AttackRollMode;
    readonly activatedOngoingFeatureUnitId?: string;
  },
): BattleFill {
  if (hole.kind !== "attackRoll") throw new Error("Expected attackRoll.");
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
      ...(value.activatedOngoingFeatureUnitId === undefined
        ? {}
        : {
            activatedOngoingFeatureUnitId: value.activatedOngoingFeatureUnitId,
          }),
    },
  };
}

function reactionDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  if (hole.kind !== "reactionDecision") {
    throw new Error("Expected reactionDecision.");
  }
  return { kind: "reactionDecision", holeId: hole.holeId, value };
}

function savingThrowOutcomeFill(
  hole: BattleHole,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): BattleFill {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: combatantId("rule-core-feature-wizard"),
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

function damageRollFillWithGroups(
  hole: Pick<BattleHole, "kind" | "holeId">,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderUnitIds?: readonly string[],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") throw new Error("Expected rolledDice.");
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : { selectedAttackDamageRiderUnitIds }),
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }

  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): BattleRolledDiceFill["value"][number] {
  const [firstRoll, ...restRolls] = group;
  if (firstRoll === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
  };
}

function reactionModifierChoice(
  choices: ReadonlyArray<
    NonNullable<
      ReturnType<typeof snapshotBattle>["pendingReaction"]
    >["choices"][number]
  >,
  unitId: string,
  modifierKind:
    | "attackRollReduction"
    | "damageRollReduction"
    | "attackDamageReduction",
) {
  const choice = choices.find(
    (candidate) =>
      candidate.kind === "reactionRollOrDamageReduction" &&
      candidate.choice.unitId === unitId &&
      candidate.choice.kind === modifierKind,
  );
  if (choice?.kind !== "reactionRollOrDamageReduction") {
    throw new Error(`Expected ${unitId} ${modifierKind} choice.`);
  }
  return choice;
}

function resourceUsesRemaining(state: BattleState, unitId: string): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return 1;
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === unitId,
  );
  if (
    resource === undefined ||
    characterBattleResourceUsage(resource) !== "limited"
  ) {
    return 1;
  }
  return "usesRemaining" in resource ? resource.usesRemaining : 1;
}

function projectRuleCoreFeatureState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastDamageAmount: number;
  readonly critical: boolean;
  readonly featureUsesRemaining: number;
  readonly targetHpFallback: number;
  readonly lastResult: RuleCoreFeatureProjection["lastResult"];
  readonly lastInvalidReason: RuleCoreFeatureProjection["lastInvalidReason"];
}): RuleCoreFeatureProjection {
  const snapshot = snapshotBattle(input.state);
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === actorId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (actor === undefined) {
    throw new Error("Expected rule-core Feature actor.");
  }
  return {
    actionAvailable: snapshot.turn.actionResources.length > 0,
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    reactionAvailable: actor.reactionAvailable,
    featureUsesRemaining: input.featureUsesRemaining,
    actionSurgeGrant: actionSurgeGrant(input.state),
    actorHp: actor.hp,
    targetHp: target?.hp ?? input.targetHpFallback,
    dashBonusFeet: Number(snapshot.turn.dashMovementBonusFeet),
    disengaged: snapshot.turn.disengaged,
    hidden: input.state.combatants.get(actorId)?.hidden !== null,
    rageActive: [
      ...(input.state.combatants
        .get(actorId)
        ?.activeOngoingFeatureOccurrences.keys() ?? []),
    ].some((key) => String(key) === "barbarian_rage"),
    recklessActive: [
      ...(input.state.combatants
        .get(actorId)
        ?.activeOngoingFeatureOccurrences.keys() ?? []),
    ].some((key) => String(key) === "barbarian_reckless_attack"),
    incomingAttackAdvantage: incomingAttackAdvantage(input.state),
    sneakAttackUsedThisTurn:
      input.state.currentTurnResources.attackDamageRidersUsedThisTurn.some(
        (used) =>
          used.attackerId === actorId && used.unitId === "rogue_sneak_attack",
      ),
    lastDamageAmount: input.lastDamageAmount,
    critical: input.critical,
    holes: input.holes.map(projectFeatureHole),
    pendingReaction: snapshot.pendingReaction !== null,
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function actionSurgeGrant(state: BattleState): ActionSurgeGrant {
  if (
    state.currentTurnResources.actionResources.some(
      (resource) =>
        resource.source === "unit" &&
        resource.sourceOwnerId === actorId &&
        resource.sourceUnitId === "fighter_action_surge",
    )
  ) {
    return "ActionSurgeActionAvailable";
  }
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind === "character") {
    const resource = actor.origin.resources.find(
      (candidate) => candidate.unit.id === "fighter_action_surge",
    );
    if (
      resource !== undefined &&
      characterBattleResourceUsage(resource) === "limited" &&
      "usedThisTurn" in resource &&
      resource.usedThisTurn
    ) {
      return "ActionSurgeActionSpent";
    }
  }
  return "NoActionSurgeActionGrant";
}

function incomingAttackAdvantage(state: BattleState): boolean {
  if (
    [
      ...(state.combatants
        .get(actorId)
        ?.activeOngoingFeatureOccurrences.keys() ?? []),
    ].some((key) => String(key) === "barbarian_reckless_attack")
  ) {
    return true;
  }
  const subject = actorAttackSubject("Scimitar", targetId);
  const target = resolveBattleSubject({ state, subject, fills: [] });
  if (target.tag !== "needsHoles") return false;
  const targetHole = target.holes.find((hole) => hole.kind === "targetChoice");
  if (targetHole === undefined) return false;
  const roll = resolveBattleSubject({
    state,
    subject,
    fills: [attackTargetFill(targetHole, targetId, actorId, "Scimitar")],
  });
  if (roll.tag !== "needsHoles") return false;
  return roll.holes.some(
    (hole) => hole.kind === "attackRoll" && hole.rollMode === "advantage",
  );
}

function projectFeatureHole(hole: BattleHole): RuleCoreFeatureMbtHole {
  if (hole.kind === "rolledDice") return "DamageRoll";
  if (hole.kind === "abilityCheck") return "AbilityCheck";
  if (hole.kind === "savingThrowOutcome") return "SavingThrowOutcome";
  if (hole.kind === "reactionDecision") return "ReactionDecision";
  throw new Error(`Unexpected rule-core Feature MBT hole: ${hole.kind}`);
}

function normalizeRuleCoreFeatureQuintState(
  raw: unknown,
): RuleCoreFeatureProjection {
  const state = quintStateRecord(raw);
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    reactionAvailable: booleanField(state, "qReactionAvailable"),
    featureUsesRemaining: numberFromQuintInt(
      state["qFeatureUsesRemaining"],
      "qFeatureUsesRemaining",
    ),
    actionSurgeGrant: actionSurgeGrantName(state["qActionSurgeGrant"]),
    actorHp: numberFromQuintInt(state["qActorHp"], "qActorHp"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    dashBonusFeet: numberFromQuintInt(
      state["qDashBonusFeet"],
      "qDashBonusFeet",
    ),
    disengaged: booleanField(state, "qDisengaged"),
    hidden: booleanField(state, "qHidden"),
    rageActive: booleanField(state, "qRageActive"),
    recklessActive: booleanField(state, "qRecklessActive"),
    incomingAttackAdvantage: booleanField(state, "qIncomingAttackAdvantage"),
    sneakAttackUsedThisTurn: booleanField(state, "qSneakAttackUsedThisTurn"),
    lastDamageAmount: numberFromQuintInt(
      state["qLastDamageAmount"],
      "qLastDamageAmount",
    ),
    critical: booleanField(state, "qCritical"),
    holes: quintHoleSet(state["qHoles"]).map(featureHoleName),
    pendingReaction: booleanField(state, "qPendingReaction"),
    lastResult: featureResult(state["qLastResult"]),
    lastInvalidReason: featureInvalidReason(state["qLastInvalidReason"]),
  };
}

function compareRuleCoreFeatureState(
  quint: RuleCoreFeatureProjection,
  runtime: RuleCoreFeatureProjection,
): boolean {
  return isDeepStrictEqual(runtime, quint);
}

function dexHalfDamageCantrip(): SpellRecord {
  if (acidSplash.mechanics.family !== "activation") {
    throw new Error("Expected Acid Splash activation spell.");
  }
  const mechanics: ActivationMechanics = acidSplash.mechanics;
  const phase = singleSaveGateActivationPhase(mechanics);
  return {
    ...acidSplash,
    id: "dex_half_cantrip",
    name: "Dex Half Cantrip",
    mechanics: {
      ...mechanics,
      phases: [{ ...phase, onSuccess: { kind: "half_damage" } }],
    },
  };
}

function singleSaveGateActivationPhase(
  mechanics: ActivationMechanics,
): SaveGateActivationPhase {
  const [phase, ...extraPhases] = mechanics.phases;
  if (phase?.kind !== "save_gate" || extraPhases.length > 0) {
    throw new Error("Expected Acid Splash to have one save-gate phase.");
  }
  return phase;
}

function uncannyDodgeUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("rogue_uncanny_dodge");
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Uncanny Dodge class feature Unit.");
  }
  return unit;
}

function cuttingWordsDamageOnlyUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("bard_cutting_words");
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "reaction_roll_or_damage_reduction"
  ) {
    throw new Error("Expected Cutting Words reaction Unit.");
  }
  const damageRollModifier = unit.mechanics.modifiers.find(
    (modifier) => modifier.kind === "damage_roll_reduction",
  );
  if (damageRollModifier === undefined) {
    throw new Error("Expected Cutting Words damage-roll modifier.");
  }
  return {
    ...unit,
    id: "bard_cutting_words_damage_test",
    provenance: { kind: "xphb", section: "structured-input-only" },
    mechanics: { ...unit.mechanics, modifiers: [damageRollModifier] },
  };
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  if (raw instanceof Set) return [...raw];
  throw new Error("Expected Quint qHoles field to be a Set.");
}

function featureHoleName(raw: unknown): RuleCoreFeatureMbtHole {
  const tag = quintVariantTag(raw);
  if (isRuleCoreFeatureMbtHole(tag)) return tag;
  throw new Error(`Unknown Quint rule-core Feature hole variant: ${tag}`);
}

function isRuleCoreFeatureMbtHole(raw: unknown): raw is RuleCoreFeatureMbtHole {
  return ruleCoreFeatureMbtHoles.some((hole) => hole === raw);
}

function featureResult(raw: unknown): RuleCoreFeatureResult {
  if (isRuleCoreFeatureResult(raw)) return raw;
  throw new Error(`Unknown Quint rule-core Feature result: ${String(raw)}.`);
}

function isRuleCoreFeatureResult(raw: unknown): raw is RuleCoreFeatureResult {
  return ruleCoreFeatureResults.some((result) => result === raw);
}

function featureInvalidReason(raw: unknown): RuleCoreFeatureInvalidReason {
  if (isRuleCoreFeatureInvalidReason(raw)) return raw;
  throw new Error(
    `Unknown Quint rule-core Feature invalid reason: ${String(raw)}.`,
  );
}

function isRuleCoreFeatureInvalidReason(
  raw: unknown,
): raw is RuleCoreFeatureInvalidReason {
  return ruleCoreFeatureInvalidReasons.some((reason) => reason === raw);
}

function actionSurgeGrantName(raw: unknown): ActionSurgeGrant {
  const tag = quintVariantTag(raw);
  if (isActionSurgeGrant(tag)) return tag;
  throw new Error(`Unknown Quint Action Surge grant: ${tag}.`);
}

function isActionSurgeGrant(raw: unknown): raw is ActionSurgeGrant {
  return actionSurgeGrants.some((grant) => grant === raw);
}

function quintVariantTag(raw: unknown): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") return raw["tag"];
  if (typeof raw === "string") return raw;
  throw new Error(`Expected Quint variant tag, got ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) throw new Error("Expected Quint state object.");
  return raw;
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
