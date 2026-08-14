import {
  unitId as parseSharedUnitId,
  type UnitId,
} from "@dnd/shared/game-facts";
import {
  battleProcedureExecutionRefForTest,
  characterBattleFeatureInitForTest,
} from "./battle-runtime.test-support.ts";
import { admitCharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-admission.ts";
import { battleObjectId } from "./identity.ts";
// RAW-COVERAGE: verification-owner:focused-mbt RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.attack-damage-rider unit-feature.bonus-action-ongoing-rage unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-armor-class-bonus unit-feature.passive-ranged-attack-roll-bonus unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-critical-range-19 unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay QMBT7 fighter_second_wind
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay QMBT9 fighter_action_surge fighter_improved_critical barbarian_rage barbarian_reckless_attack rogue_cunning_action rogue_evasion monk_evasion rogue_uncanny_dodge rogue_sneak_attack
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-BARBARIAN-FRENZY barbarian_frenzy
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay QMBT31 feat_savage_attacker
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay passive-and-zero-hp-features defense feat_archery orc_relentless_endurance
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay reaction-interruption bard_cutting_words monk_deflect_attacks
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1H-FIGHTER-TACTICAL-MIND fighter_tactical_mind
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1H-BOON-COMBAT-PROWESS feat_boon_of_combat_prowess
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1H-MYCELIUM-STEP mycelium_step
// UNIT-IDENTITY-REPLAY: QMBT7 fighter_second_wind doDiscoverSecondWind doResolveSecondWindLow doResolveSecondWindHigh
// UNIT-IDENTITY-REPLAY: QMBT9 fighter_action_surge doActionSurgeActivate doActionSurgeRejectTwice
// UNIT-IDENTITY-REPLAY: QMBT9 fighter_improved_critical doImprovedCritical
// UNIT-IDENTITY-REPLAY: QMBT9 barbarian_rage doRageActivateAndDamage
// UNIT-IDENTITY-REPLAY: QMBT9 barbarian_reckless_attack doRecklessAttack
// UNIT-IDENTITY-REPLAY: QMBT9 rogue_cunning_action doCunningDash doCunningDisengage doCunningHide
// UNIT-IDENTITY-REPLAY: QMBT9 rogue_evasion doEvasionSuccess doEvasionFailure
// UNIT-IDENTITY-REPLAY: QMBT9 monk_evasion doEvasionSuccess doEvasionFailure
// UNIT-IDENTITY-REPLAY: QMBT9 rogue_uncanny_dodge doUncannyDodge
// UNIT-IDENTITY-REPLAY: QMBT9 rogue_sneak_attack doSneakAttack
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-BARBARIAN-FRENZY barbarian_frenzy doFrenzy
// UNIT-IDENTITY-REPLAY: QMBT31 feat_savage_attacker doSavageAttackerDamage
// UNIT-IDENTITY-REPLAY: passive-and-zero-hp-features defense doDefenseArmorClass
// UNIT-IDENTITY-REPLAY: passive-and-zero-hp-features feat_archery doArcheryAttackRollBonus
// UNIT-IDENTITY-REPLAY: passive-and-zero-hp-features orc_relentless_endurance doZeroHitPointReplacement
// UNIT-IDENTITY-REPLAY: reaction-interruption bard_cutting_words doCuttingWordsDamage
// UNIT-IDENTITY-REPLAY: reaction-interruption monk_deflect_attacks doDeflectAttacksDamageReduction
// UNIT-IDENTITY-REPLAY: L1H-FIGHTER-TACTICAL-MIND fighter_tactical_mind doTacticalMindConvertedSuccess doTacticalMindStillFailed
// UNIT-IDENTITY-REPLAY: L1H-BOON-COMBAT-PROWESS feat_boon_of_combat_prowess doCombatProwessMissToHit
// UNIT-IDENTITY-REPLAY: L1H-MYCELIUM-STEP mycelium_step doMyceliumStepDash
import { isDeepStrictEqual } from "node:util";
import {
  resolveBattleSubject,
  characterAttackSubjectForTest,
  targetFill,
} from "./battle-runtime.test-support.ts";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintList,
  quintStateRecord,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
  stringLiteralField,
  stringLiteralValue,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.test-support.ts";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import myceliumStepInput from "../../../plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  abilityModifier,
  attackBonus,
  classLevel,
  difficultyClass,
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
import type {
  DamageType,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

import {
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  battleUnitRefWithSupportProfiles,
  battleId,
  characterBattleResourceUsage,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  initiativeScore,
  resolveBattleInterrupt,
  resolveFailedAbilityCheckResourceBoost,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleProcedureExecutionRef,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import type { CharacterBattleResourceState } from "./character-battle-resources.ts";
import { parseSupportedUnitFeatureProfile } from "./unit-feature-support.ts";
import { unitSupportProfileKind } from "./character-execution-queries.ts";
import { mechanicsOnlyMyceliumStepUnit } from "./classic-non-srd-mechanics-fixtures.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { frenzyDamageTypeSelection } from "./battle-reducer/statblock-attacks.ts";

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
const frenzyMbtDamageTypes = [
  "bludgeoning",
  "slashing",
  "piercing",
  "fire",
] as const;
type FrenzyMbtDamageType = (typeof frenzyMbtDamageTypes)[number];
type FrenzyDamageTypeSelectionProjection =
  | { readonly tag: "notObserved" }
  | { readonly tag: "automatic"; readonly damageType: FrenzyMbtDamageType }
  | {
      readonly tag: "decisionRequired";
      readonly choices: readonly [
        FrenzyMbtDamageType,
        FrenzyMbtDamageType,
        ...FrenzyMbtDamageType[],
      ];
    }
  | { readonly tag: "selected"; readonly damageType: FrenzyMbtDamageType }
  | { readonly tag: "rejected" };

type RuleCoreFeatureProjection = RuleCoreComponentRoutedProjection & {
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
  readonly abilityCheckBoostedTotal: number;
  readonly abilityCheckBoostedSucceeded: boolean;
  readonly critical: boolean;
  readonly actorArmorClass: number;
  readonly frenzyDamageTypeSelection: FrenzyDamageTypeSelectionProjection;
  readonly holes: readonly RuleCoreFeatureMbtHole[];
  readonly pendingInterrupt: boolean;
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
const featureMbtBaselineArmorClass = 10;
const componentOwner = "RuleCoreFeatureProfileSemanticsOwner";
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
  doTacticalMindConvertedSuccess: {},
  doTacticalMindStillFailed: {},
  doCunningDash: {},
  doCunningDisengage: {},
  doCunningHide: {},
  doMyceliumStepDash: {},
  doRageActivateAndDamage: {},
  doRecklessAttack: {},
  doSneakAttack: {},
  doFrenzy: {},
  doFrenzyDuplicateTypesAutomatic: {},
  doFrenzyMixedDecisionRequired: {},
  doFrenzyMixedSelectPiercing: {},
  doFrenzyMixedSelectFire: {},
  doFrenzyMixedRejectOutsideType: {},
  doImprovedCritical: {},
  doEvasionSuccess: {},
  doEvasionFailure: {},
  doCuttingWordsDamage: {},
  doDeflectAttacksDamageReduction: {},
  doUncannyDodge: {},
  doDefenseArmorClass: {},
  doArcheryAttackRollBonus: {},
  doCombatProwessMissToHit: {},
  doSavageAttackerDamage: {},
  doZeroHitPointReplacement: {},
  step: {},
} as const;
type RuleCoreFeatureDriverAction = Exclude<
  keyof typeof driverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly RuleCoreFeatureDriverAction[];
  readonly expected: RuleCoreFeatureProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId:
    | "QMBT7"
    | "QMBT9"
    | "QMBT31"
    | "passive-and-zero-hp-features"
    | "reaction-interruption"
    | "L1H-FIGHTER-TACTICAL-MIND"
    | "L1H-BOON-COMBAT-PROWESS"
    | "L1H-MYCELIUM-STEP"
    | "L3-FOLLOWUP-BARBARIAN-FRENZY";
  readonly unitId: UnitId;
  readonly actions: readonly RuleCoreFeatureDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};
function selectedUnitId<const Id extends string>(value: Id): UnitId & Id {
  // Brands are erased at runtime; parsing establishes UnitId, and Id preserves
  // the caller's already-known string literal for exact witness narrowing.
  return parseSharedUnitId(value) as UnitId & Id;
}

const rogueEvasionUnitId = selectedUnitId("rogue_evasion");
const monkEvasionUnitId = selectedUnitId("monk_evasion");
type EvasionUnitId = typeof rogueEvasionUnitId | typeof monkEvasionUnitId;
const selectedUnitRuntimeBoundaryIds = new Set<UnitId>();

const selectedUnitIdentityReplays = [
  {
    taskId: "QMBT7",
    unitId: selectedUnitId("fighter_second_wind"),
    actions: [
      "doDiscoverSecondWind",
      "doResolveSecondWindLow",
      "doResolveSecondWindHigh",
    ],
    sequences: [
      {
        name: "discover",
        actions: ["doDiscoverSecondWind"],
        expected: expectedProjection({
          actorHp: 4,
          holes: ["DamageRoll"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "low-roll",
        actions: ["doDiscoverSecondWind", "doResolveSecondWindLow"],
        expected: expectedProjection({
          bonusActionAvailable: false,
          featureUsesRemaining: 0,
          actorHp: 7,
          lastDamageAmount: 3,
          lastResult: "resolved",
        }),
      },
      {
        name: "high-roll",
        actions: ["doDiscoverSecondWind", "doResolveSecondWindHigh"],
        expected: expectedProjection({
          bonusActionAvailable: false,
          featureUsesRemaining: 0,
          actorHp: 12,
          lastDamageAmount: 8,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: selectedUnitId("fighter_action_surge"),
    actions: ["doActionSurgeActivate", "doActionSurgeRejectTwice"],
    sequences: [
      {
        name: "activate",
        actions: ["doActionSurgeActivate"],
        expected: expectedProjection({
          featureUsesRemaining: 0,
          actionSurgeGrant: "ActionSurgeActionAvailable",
          lastResult: "resolved",
        }),
      },
      {
        name: "reject-stale",
        actions: ["doActionSurgeActivate", "doActionSurgeRejectTwice"],
        expected: expectedProjection({
          featureUsesRemaining: 0,
          actionSurgeGrant: "ActionSurgeActionAvailable",
          lastResult: "invalid",
          lastInvalidReason: "staleSubject",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: selectedUnitId("fighter_improved_critical"),
    actions: ["doImprovedCritical"],
    sequences: [
      {
        name: "critical-threshold",
        actions: ["doImprovedCritical"],
        expected: expectedProjection({
          actionAvailable: false,
          targetHp: 4,
          lastDamageAmount: 8,
          critical: true,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: selectedUnitId("barbarian_rage"),
    actions: ["doRageActivateAndDamage"],
    sequences: [
      {
        name: "activate-and-damage",
        actions: ["doRageActivateAndDamage"],
        expected: expectedProjection({
          actionAvailable: false,
          bonusActionAvailable: false,
          featureUsesRemaining: 0,
          targetHp: 5,
          rageActive: true,
          lastDamageAmount: 7,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: selectedUnitId("barbarian_reckless_attack"),
    actions: ["doRecklessAttack"],
    sequences: [
      {
        name: "strength-attack",
        actions: ["doRecklessAttack"],
        expected: expectedProjection({
          actionAvailable: false,
          targetHp: 5,
          recklessActive: true,
          incomingAttackAdvantage: true,
          lastDamageAmount: 7,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: selectedUnitId("rogue_cunning_action"),
    actions: ["doCunningDash", "doCunningDisengage", "doCunningHide"],
    sequences: [
      {
        name: "dash",
        actions: ["doCunningDash"],
        expected: expectedProjection({
          bonusActionAvailable: false,
          dashBonusFeet: 30,
          lastResult: "resolved",
        }),
      },
      {
        name: "disengage",
        actions: ["doCunningDisengage"],
        expected: expectedProjection({
          bonusActionAvailable: false,
          disengaged: true,
          lastResult: "resolved",
        }),
      },
      {
        name: "hide",
        actions: ["doCunningHide"],
        expected: expectedProjection({
          bonusActionAvailable: false,
          hidden: true,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: rogueEvasionUnitId,
    actions: ["doEvasionSuccess", "doEvasionFailure"],
    sequences: [
      {
        name: "success",
        actions: ["doEvasionSuccess"],
        expected: expectedProjection({
          actionAvailable: false,
          lastResult: "resolved",
        }),
      },
      {
        name: "failure",
        actions: ["doEvasionFailure"],
        expected: expectedProjection({
          actionAvailable: false,
          actorHp: 9,
          lastDamageAmount: 3,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: monkEvasionUnitId,
    actions: ["doEvasionSuccess", "doEvasionFailure"],
    sequences: [
      {
        name: "success",
        actions: ["doEvasionSuccess"],
        expected: expectedProjection({
          actionAvailable: false,
          lastResult: "resolved",
        }),
      },
      {
        name: "failure",
        actions: ["doEvasionFailure"],
        expected: expectedProjection({
          actionAvailable: false,
          actorHp: 9,
          lastDamageAmount: 3,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: selectedUnitId("rogue_uncanny_dodge"),
    actions: ["doUncannyDodge"],
    sequences: [
      {
        name: "halve-damage",
        actions: ["doUncannyDodge"],
        expected: expectedProjection({
          actionAvailable: false,
          reactionAvailable: false,
          actorHp: 9,
          lastDamageAmount: 3,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT9",
    unitId: selectedUnitId("rogue_sneak_attack"),
    actions: ["doSneakAttack"],
    sequences: [
      {
        name: "advantage-attack",
        actions: ["doSneakAttack"],
        expected: expectedProjection({
          actionAvailable: false,
          targetHp: 2,
          sneakAttackUsedThisTurn: true,
          lastDamageAmount: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "L3-FOLLOWUP-BARBARIAN-FRENZY",
    unitId: selectedUnitId("barbarian_frenzy"),
    actions: ["doFrenzy"],
    sequences: [
      {
        name: "rage-reckless-strength-hit",
        actions: ["doFrenzy"],
        expected: expectedProjection({
          actionAvailable: false,
          bonusActionAvailable: false,
          featureUsesRemaining: 0,
          targetHp: 7,
          rageActive: true,
          recklessActive: true,
          incomingAttackAdvantage: true,
          lastDamageAmount: 2,
          frenzyDamageTypeSelection: {
            tag: "automatic",
            damageType: "slashing",
          },
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "QMBT31",
    unitId: selectedUnitId("feat_savage_attacker"),
    actions: ["doSavageAttackerDamage"],
    sequences: [
      {
        name: "choose-second-weapon-damage-roll",
        actions: ["doSavageAttackerDamage"],
        expected: expectedProjection({
          actionAvailable: false,
          targetHp: 4,
          lastDamageAmount: 8,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "L1H-FIGHTER-TACTICAL-MIND",
    unitId: selectedUnitId("fighter_tactical_mind"),
    actions: ["doTacticalMindConvertedSuccess", "doTacticalMindStillFailed"],
    sequences: [
      {
        name: "converted-success",
        actions: ["doTacticalMindConvertedSuccess"],
        expected: expectedProjection({
          featureUsesRemaining: 0,
          abilityCheckBoostedTotal: 16,
          abilityCheckBoostedSucceeded: true,
          lastResult: "resolved",
        }),
      },
      {
        name: "still-failed",
        actions: ["doTacticalMindStillFailed"],
        expected: expectedProjection({
          featureUsesRemaining: 1,
          abilityCheckBoostedTotal: 14,
          abilityCheckBoostedSucceeded: false,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "L1H-BOON-COMBAT-PROWESS",
    unitId: selectedUnitId("feat_boon_of_combat_prowess"),
    actions: ["doCombatProwessMissToHit"],
    sequences: [
      {
        name: "miss-to-hit",
        actions: ["doCombatProwessMissToHit"],
        expected: expectedProjection({
          actionAvailable: false,
          featureUsesRemaining: 0,
          targetHp: 8,
          lastDamageAmount: 4,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "L1H-MYCELIUM-STEP",
    unitId: selectedUnitId("mycelium_step"),
    actions: ["doMyceliumStepDash"],
    sequences: [
      {
        name: "dash-as-bonus-action",
        actions: ["doMyceliumStepDash"],
        expected: expectedProjection({
          bonusActionAvailable: false,
          dashBonusFeet: 30,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "reaction-interruption",
    unitId: selectedUnitId("bard_cutting_words"),
    actions: ["doCuttingWordsDamage"],
    sequences: [
      {
        name: "damage-roll-reduction",
        actions: ["doCuttingWordsDamage"],
        expected: expectedProjection({
          actionAvailable: false,
          reactionAvailable: false,
          featureUsesRemaining: 0,
          actorHp: 10,
          lastDamageAmount: 2,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "reaction-interruption",
    unitId: selectedUnitId("monk_deflect_attacks"),
    actions: ["doDeflectAttacksDamageReduction"],
    sequences: [
      {
        name: "attack-damage-reduction",
        actions: ["doDeflectAttacksDamageReduction"],
        expected: expectedProjection({
          actionAvailable: false,
          reactionAvailable: false,
          actorHp: 10,
          lastDamageAmount: 2,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "passive-and-zero-hp-features",
    unitId: selectedUnitId("defense"),
    actions: ["doDefenseArmorClass"],
    sequences: [
      {
        name: "wearing-armor-bonus",
        actions: ["doDefenseArmorClass"],
        expected: expectedProjection({
          actorArmorClass: 17,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "passive-and-zero-hp-features",
    unitId: selectedUnitId("feat_archery"),
    actions: ["doArcheryAttackRollBonus"],
    sequences: [
      {
        name: "ranged-attack-roll-bonus",
        actions: ["doArcheryAttackRollBonus"],
        expected: expectedProjection({
          actionAvailable: false,
          lastDamageAmount: 2,
          actorArmorClass: 9,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "passive-and-zero-hp-features",
    unitId: selectedUnitId("orc_relentless_endurance"),
    actions: ["doZeroHitPointReplacement"],
    sequences: [
      {
        name: "zero-hit-point-replacement",
        actions: ["doZeroHitPointReplacement"],
        expected: expectedProjection({
          actionAvailable: false,
          featureUsesRemaining: 0,
          targetHp: 1,
          lastDamageAmount: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

function expectedProjection(
  overrides: Partial<Omit<RuleCoreFeatureProjection, "componentRoute">> = {},
): RuleCoreFeatureProjection {
  return withRuleCoreComponentRoute(componentOwner, {
    actionAvailable: true,
    bonusActionAvailable: true,
    reactionAvailable: true,
    featureUsesRemaining: 1,
    actionSurgeGrant: "NoActionSurgeActionGrant",
    actorHp: 12,
    targetHp: 12,
    dashBonusFeet: 0,
    disengaged: false,
    hidden: false,
    rageActive: false,
    recklessActive: false,
    incomingAttackAdvantage: false,
    sneakAttackUsedThisTurn: false,
    lastDamageAmount: 0,
    abilityCheckBoostedTotal: 0,
    abilityCheckBoostedSucceeded: false,
    critical: false,
    actorArmorClass: featureMbtBaselineArmorClass,
    frenzyDamageTypeSelection: { tag: "notObserved" },
    holes: [],
    pendingInterrupt: false,
    lastResult: "init",
    lastInvalidReason: "none",
    ...overrides,
  });
}

function projectFrenzyMbtDamageType(
  damageType: DamageType,
): FrenzyMbtDamageType {
  if (
    damageType === "bludgeoning" ||
    damageType === "slashing" ||
    damageType === "piercing" ||
    damageType === "fire"
  ) {
    return damageType;
  }
  throw new Error(
    `Unexpected Frenzy MBT damage type projection: ${damageType}.`,
  );
}

function resetSelectedUnitRuntimeBoundaryIds(): void {
  selectedUnitRuntimeBoundaryIds.clear();
}

function recordSelectedUnitRuntimeBoundaryId<Id extends UnitId>(
  unitId: Id,
): Id {
  selectedUnitRuntimeBoundaryIds.add(unitId);
  return unitId;
}

function evasionUnitIdForReplay(unitId: UnitId): EvasionUnitId | undefined {
  if (unitId === rogueEvasionUnitId) return rogueEvasionUnitId;
  if (unitId === monkEvasionUnitId) return monkEvasionUnitId;
  return undefined;
}

function createRuleCoreFeatureDriver(
  input: {
    readonly evasionUnitId?: EvasionUnitId;
  } = {},
) {
  return defineDriver(driverSchema, () => {
    let state = featureBattle();
    let holes: readonly BattleHole[] = [];
    let lastResult: RuleCoreFeatureProjection["lastResult"] = "init";
    let lastInvalidReason: RuleCoreFeatureProjection["lastInvalidReason"] =
      "none";
    let lastDamageAmount = 0;
    let frenzyDamageTypeSelectionProjection: FrenzyDamageTypeSelectionProjection =
      { tag: "notObserved" };
    let abilityCheckBoostedTotal = 0;
    let abilityCheckBoostedSucceeded = false;
    let critical = false;
    let actorArmorClass = featureMbtBaselineArmorClass;
    let featureUsesRemaining = 1;
    let targetHpFallback = 12;
    let actionSurgeSubject:
      | Extract<BattleSubject, { readonly tag: "unitFeature" }>
      | undefined;
    let secondWindSubject:
      | Extract<BattleSubject, { readonly tag: "unitFeature" }>
      | undefined;

    function reset(): void {
      state = featureBattle();
      resetProjection();
      actionSurgeSubject = undefined;
      secondWindSubject = undefined;
    }

    function resetProjection(): void {
      holes = [];
      lastResult = "init";
      lastInvalidReason = "none";
      lastDamageAmount = 0;
      frenzyDamageTypeSelectionProjection = { tag: "notObserved" };
      abilityCheckBoostedTotal = 0;
      abilityCheckBoostedSucceeded = false;
      critical = false;
      actorArmorClass = featureMbtBaselineArmorClass;
      featureUsesRemaining = 1;
      targetHpFallback = 12;
    }

    function recordFrenzyDamageTypeSelection(input: {
      readonly choices: readonly [
        FrenzyMbtDamageType,
        ...FrenzyMbtDamageType[],
      ];
      readonly selectedDamageType: FrenzyMbtDamageType | undefined;
    }): void {
      const selection = frenzyDamageTypeSelection({
        authoredDamageTypes: input.choices,
        selectedDamageType: input.selectedDamageType,
      });
      lastResult = "resolved";
      if (selection.tag === "automatic") {
        frenzyDamageTypeSelectionProjection = {
          tag: "automatic",
          damageType: projectFrenzyMbtDamageType(selection.damageType),
        };
        return;
      }
      if (selection.tag === "decisionRequired") {
        const [first, second, ...rest] = selection.choices;
        frenzyDamageTypeSelectionProjection = {
          tag: "decisionRequired",
          choices: [
            projectFrenzyMbtDamageType(first),
            projectFrenzyMbtDamageType(second),
            ...rest.map(projectFrenzyMbtDamageType),
          ],
        };
        return;
      }
      if (selection.tag === "selected") {
        frenzyDamageTypeSelectionProjection = {
          tag: "selected",
          damageType: projectFrenzyMbtDamageType(selection.damageType),
        };
        return;
      }
      frenzyDamageTypeSelectionProjection = { tag: "rejected" };
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
          `Unexpected rule-core Feature MBT invalid reason: ${result.reason}: ${result.message}`,
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
      readonly attackRollTotal?: number;
      readonly damageRoll: number;
      readonly damageGroups?: readonly (readonly number[])[];
      readonly rollMode?: AttackRollMode;
      readonly activatedOngoingFeatureProcedureRef?: BattleProcedureExecutionRef;
      readonly useMissToHitReplacement?: true;
      readonly selectedAttackDamageRiderProcedureRefs?: readonly BattleProcedureExecutionRef[];
      readonly weaponDamageDiceRollChoice?: Extract<
        BattleFill,
        { readonly kind: "rolledDice" }
      >["weaponDamageDiceRollChoice"];
      readonly attackName?:
        | "Longsword"
        | "Dagger"
        | "Scimitar"
        | "Shortbow"
        | "Shortsword";
    }): void {
      const attackName = input.attackName ?? "Longsword";
      const subject =
        input.subject ?? actorAttackSubject(input.state, attackName);
      const target = requireHole(
        resolveBattleSubject({ state: input.state, subject, fills: [] }),
        "targetChoice",
      );
      const attackRoll = requireHole(
        resolveBattleSubject({
          state: input.state,
          subject,
          fills: [attackTargetFill(target, subject.actorId, targetId)],
        }),
        "attackRoll",
      );
      if (attackRoll.kind !== "attackRoll" || !("attack" in attackRoll)) {
        throw new Error("Expected character attackRoll hole.");
      }
      const missToHitReplacementProcedureRef =
        input.useMissToHitReplacement === true
          ? attackRoll.missToHitReplacements?.[0]?.procedureRef
          : undefined;
      if (
        input.useMissToHitReplacement === true &&
        missToHitReplacementProcedureRef === undefined
      ) {
        throw new Error(
          `Expected the attack-roll hole to offer a miss-to-hit replacement: ${JSON.stringify(attackRoll)}.`,
        );
      }
      const rollValue = {
        total: input.attackRollTotal ?? input.naturalD20 ?? 15,
        naturalD20: input.naturalD20 ?? 10,
        ...(input.rollMode === undefined ? {} : { rollMode: input.rollMode }),
        ...(input.activatedOngoingFeatureProcedureRef === undefined
          ? {}
          : {
              activatedOngoingFeatureProcedureRef:
                input.activatedOngoingFeatureProcedureRef,
            }),
        ...(missToHitReplacementProcedureRef === undefined
          ? {}
          : {
              missToHitReplacementProcedureRef,
            }),
      };
      const damage = requireHole(
        resolveBattleSubject({
          state: input.state,
          subject,
          fills: [
            attackTargetFill(target, subject.actorId, targetId),
            attackRollFill(attackRoll, rollValue),
          ],
        }),
        "rolledDice",
      );
      const result = resolveBattleSubject({
        state: input.state,
        subject,
        fills: [
          attackTargetFill(target, subject.actorId, targetId),
          attackRollFill(attackRoll, rollValue),
          damageRollFillWithGroups(
            damage,
            input.selectedAttackDamageRiderProcedureRefs === undefined
              ? (input.damageGroups ?? [[input.damageRoll]])
              : [[input.damageRoll], [6]],
            input.selectedAttackDamageRiderProcedureRefs,
            input.weaponDamageDiceRollChoice,
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
        actionSurgeSubject = unitFeatureSubject(state);
        resolveSubject(actionSurgeSubject);
        featureUsesRemaining = resourceUsesRemaining(state);
      },
      doActionSurgeSpendAttack: () => {
        resolveActorAttack({ state, damageRoll: 7 });
        featureUsesRemaining = resourceUsesRemaining(state);
        lastDamageAmount = 7;
      },
      doActionSurgeRejectTwice: () => {
        if (actionSurgeSubject === undefined) {
          throw new Error(
            "Action Surge replay requires its previously activated typed subject.",
          );
        }
        const result = resolveBattleSubject({
          state,
          subject: actionSurgeSubject,
          fills: [],
        });
        recordResult(result);
        featureUsesRemaining = resourceUsesRemaining(state);
      },
      doDiscoverSecondWind: () => {
        state = secondWindBattle();
        resetProjection();
        secondWindSubject = unitFeatureSubject(state);
        const act = findAct(state, secondWindSubject);
        holes = act.initialHoles;
        lastResult = "needsHoles";
        lastInvalidReason = "none";
        featureUsesRemaining = resourceUsesRemaining(state);
      },
      doResolveSecondWindLow: () => resolveSecondWind(1),
      doResolveSecondWindHigh: () => resolveSecondWind(8),
      doTacticalMindConvertedSuccess: () =>
        resolveTacticalMind({
          originalTotal: 13,
          boostRoll: 3,
        }),
      doTacticalMindStillFailed: () =>
        resolveTacticalMind({
          originalTotal: 10,
          boostRoll: 4,
        }),
      doCunningDash: () => resolveCunningAction("dash"),
      doCunningDisengage: () => resolveCunningAction("disengage"),
      doCunningHide: () => {
        state = cunningActionBattle();
        resetProjection();
        const subject = bonusActionStandardActionSubject(state, "hide");
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
      doMyceliumStepDash: () => {
        state = myceliumStepBattle();
        resetProjection();
        recordResult(
          resolveBattleSubject({
            state,
            subject: bonusActionStandardActionSubject(state, "dash"),
            fills: [],
          }),
        );
      },
      doRageActivateAndDamage: () => {
        state = rageBattle();
        resetProjection();
        const raging = resolveBattleSubject({
          state,
          subject: unitFeatureSubject(state),
          fills: [],
        });
        recordResult(raging);
        if (raging.tag !== "resolved") return;
        resolveActorAttack({ state: raging.state, damageRoll: 4 });
        featureUsesRemaining = resourceUsesRemaining(state);
        lastDamageAmount = 7;
      },
      doRecklessAttack: () => {
        state = recklessBattle();
        resetProjection();
        resolveActorAttack({
          state,
          damageRoll: 7,
          rollMode: "advantage",
          activatedOngoingFeatureProcedureRef:
            requireOngoingFeatureProcedureRef(state, "firstAttackRoll"),
        });
        lastDamageAmount = 7;
      },
      doSneakAttack: () => {
        state = sneakAttackBattle();
        resetProjection();
        resolveActorAttack({
          state,
          subject: actorAttackSubject(state, "Dagger"),
          attackName: "Dagger",
          damageRoll: 4,
          rollMode: "advantage",
          selectedAttackDamageRiderProcedureRefs: [
            requireUnitProcedureRef(state, actorId, "attackDamageRider"),
          ],
        });
        lastDamageAmount = 1;
      },
      doFrenzy: () => {
        state = frenzyBattle();
        resetProjection();
        const raging = resolveBattleSubject({
          state,
          subject: unitFeatureSubject(state),
          fills: [],
        });
        recordResult(raging);
        if (raging.tag !== "resolved") return;
        resolveActorAttack({
          state: raging.state,
          damageRoll: 1,
          damageGroups: [[1], [1, 1]],
          rollMode: "advantage",
          activatedOngoingFeatureProcedureRef:
            requireOngoingFeatureProcedureRef(raging.state, "firstAttackRoll"),
        });
        featureUsesRemaining = resourceUsesRemaining(state);
        lastDamageAmount = 2;
        recordFrenzyDamageTypeSelection({
          choices: ["slashing"],
          selectedDamageType: undefined,
        });
      },
      doFrenzyMixedDecisionRequired: () => {
        reset();
        recordFrenzyDamageTypeSelection({
          choices: ["piercing", "fire"],
          selectedDamageType: undefined,
        });
      },
      doFrenzyDuplicateTypesAutomatic: () => {
        reset();
        recordFrenzyDamageTypeSelection({
          choices: ["piercing", "piercing"],
          selectedDamageType: undefined,
        });
      },
      doFrenzyMixedSelectPiercing: () => {
        reset();
        recordFrenzyDamageTypeSelection({
          choices: ["piercing", "fire"],
          selectedDamageType: "piercing",
        });
      },
      doFrenzyMixedSelectFire: () => {
        reset();
        recordFrenzyDamageTypeSelection({
          choices: ["piercing", "fire"],
          selectedDamageType: "fire",
        });
      },
      doFrenzyMixedRejectOutsideType: () => {
        reset();
        recordFrenzyDamageTypeSelection({
          choices: ["piercing", "fire"],
          selectedDamageType: "bludgeoning",
        });
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
      doSavageAttackerDamage: () => {
        state = savageAttackerBattle();
        resetProjection();
        resolveActorAttack({
          state,
          damageRoll: 8,
          weaponDamageDiceRollChoice: {
            procedureRef: requireUnitProcedureRef(
              state,
              actorId,
              "weaponDamageDiceRollChoice",
            ),
            selection: "second",
            candidates: [rolledDiceGroup([2]), rolledDiceGroup([8])],
          },
        });
        lastDamageAmount = 8;
      },
      doZeroHitPointReplacement: () => {
        state = relentlessEnduranceBattle();
        resetProjection();
        const subject = actorAttackSubject(state, "Longsword");
        const target = requireHole(
          resolveBattleSubject({ state, subject, fills: [] }),
          "targetChoice",
        );
        const targetFill = attackTargetFill(target, actorId, targetId);
        const attackRoll = requireHole(
          resolveBattleSubject({ state, subject, fills: [targetFill] }),
          "attackRoll",
        );
        const attackRollFilled = attackRollFill(attackRoll, {
          total: 15,
          naturalD20: 10,
        });
        const damage = requireHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [targetFill, attackRollFilled],
          }),
          "rolledDice",
        );
        const damageFill = damageRollFillWithGroups(damage, [[4]]);
        const awaitingDisposition = resolveBattleSubject({
          state,
          subject,
          fills: [targetFill, attackRollFilled, damageFill],
        });
        const disposition = requireHole(
          awaitingDisposition,
          "attackDamageDisposition",
        );
        if (disposition.kind !== "attackDamageDisposition") {
          throw new Error("Expected attack damage disposition.");
        }
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              targetFill,
              attackRollFilled,
              damageFill,
              attackDamageDispositionFill(disposition, {
                kind: "zeroHitPointReplacement",
                procedureRef: requireUnitProcedureRef(
                  state,
                  targetId,
                  "zeroHitPointReplacement",
                ),
              }),
            ],
          }),
        );
        featureUsesRemaining = resourceUsesRemaining(state, targetId);
        lastDamageAmount = 1;
      },
      doEvasionSuccess: () => resolveDexHalfCantrip(true),
      doEvasionFailure: () => resolveDexHalfCantrip(false),
      doCuttingWordsDamage: () => {
        const cuttingWords = cuttingWordsUnit();
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
          damageRoll: 6,
        });
        featureUsesRemaining = resourceUsesRemaining(state);
        lastDamageAmount = 2;
      },
      doDeflectAttacksDamageReduction: () => {
        state = reactionModifierBattle({
          unit: deflectAttacksUnit(),
          unitId: "monk_deflect_attacks",
          className: "monk",
          level: 3,
          supportProfile:
            ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
          resources: [unitResource("monk_monks_focus")],
        });
        resetProjection();
        resolveReactionDamageReduction({
          unitId: "monk_deflect_attacks",
          modifierKind: "attackDamageReduction",
          reductionRoll: 1,
          damageRoll: 6,
        });
        featureUsesRemaining = 1;
        lastDamageAmount = 2;
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
      doDefenseArmorClass: () => {
        state = featureBattle();
        resetProjection();
        const profile = parseSupportedUnitFeatureProfile(
          unitLibrary.requireUnit(
            recordSelectedUnitRuntimeBoundaryId(selectedUnitId("defense")),
          ),
          [],
        );
        if (profile?.kind !== "passiveArmorClassBonus") {
          throw new Error("Expected Defense passive Armor Class profile.");
        }
        actorArmorClass = 16 + profile.armorClass.bonus;
        lastResult = "resolved";
        lastInvalidReason = "none";
      },
      doArcheryAttackRollBonus: () => {
        const unit = unitLibrary.requireUnit(
          recordSelectedUnitRuntimeBoundaryId(selectedUnitId("feat_archery")),
        );
        const unitRef = battleUnitRefWithSupportProfiles({
          unitRef: { unitId: unit.id },
          unit,
        });
        if (Either.isLeft(unitRef)) {
          throw new Error(unitRef.left.message);
        }
        state = startBattleRight({
          battleId: battleId("rule-core-feature-archery"),
          combatants: [
            featureActor({
              initiative: 20,
              attack: zeroAbilityWeaponAttack("weapon_shortbow"),
              characterUnitRefs: [unitRef.right],
            }),
            featureTarget(10),
          ],
        });
        resetProjection();
        const subject = actorAttackSubject(state, "Shortbow");
        const target = requireHole(
          resolveBattleSubject({ state, subject, fills: [] }),
          "targetChoice",
        );
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [attackTargetFill(target, actorId, targetId)],
          }),
        );
        const attackRoll = requireHoleFromList(holes, "attackRoll");
        if (attackRoll.kind !== "attackRoll") {
          throw new Error("Expected Archery attack roll hole.");
        }
        lastDamageAmount = Number(attackRoll.attackBonus);
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              attackTargetFill(target, actorId, targetId),
              attackRollFill(attackRoll, {
                total: 9,
                naturalD20: 10,
              }),
            ],
          }),
        );
        targetHpFallback = 12;
        actorArmorClass = 9;
        critical = false;
      },
      doCombatProwessMissToHit: () => {
        state = combatProwessBattle();
        resetProjection();
        resolveActorAttack({
          state,
          naturalD20: 2,
          attackRollTotal: 1,
          damageRoll: 4,
          useMissToHitReplacement: true,
        });
        featureUsesRemaining = combatProwessUsesRemaining(state);
        lastDamageAmount = 4;
      },
      step: () => {},
      getState: () =>
        projectRuleCoreFeatureState({
          state,
          holes,
          lastDamageAmount,
          frenzyDamageTypeSelection: frenzyDamageTypeSelectionProjection,
          abilityCheckBoostedTotal,
          abilityCheckBoostedSucceeded,
          critical,
          actorArmorClass,
          featureUsesRemaining,
          targetHpFallback,
          lastResult,
          lastInvalidReason,
        }),
    };

    function resolveSecondWind(roll: number): void {
      if (secondWindSubject === undefined) {
        throw new Error(
          "Second Wind resolution requires its previously discovered typed subject.",
        );
      }
      expect(
        unitFeatureSubject(state),
        "Second Wind must retain its discovered Unit procedure binding through resolution.",
      ).toEqual(secondWindSubject);
      const hole = requireHoleFromList(holes, "rolledDice");
      recordResult(
        resolveBattleSubject({
          state,
          subject: secondWindSubject,
          fills: [damageRollFillWithGroups(hole, [[roll]])],
        }),
      );
      featureUsesRemaining = resourceUsesRemaining(state);
      lastDamageAmount = roll === 1 ? 3 : 8;
    }

    function resolveTacticalMind(input: {
      readonly originalTotal: number;
      readonly boostRoll: number;
    }): void {
      const unit = tacticalMindUnit();
      state = tacticalMindBattle(unit);
      resetProjection();
      const result = resolveFailedAbilityCheckResourceBoost({
        state,
        procedureRef: requireUnitProcedureRef(
          state,
          actorId,
          "failedAbilityCheckResourceBoost",
        ),
        abilityCheck: {
          actorId,
          ability: "int",
          skillOrToolLabel: "Investigation",
          originalTotal: input.originalTotal,
          dc: difficultyClass(15),
        },
        boostRoll: input.boostRoll,
      });
      recordResult(result);
      featureUsesRemaining = resourceUsesRemaining(state);
      if (result.tag === "resolved") {
        abilityCheckBoostedTotal = result.abilityCheckBoost.boostedTotal;
        abilityCheckBoostedSucceeded =
          result.abilityCheckBoost.boostedSucceeded;
      }
    }

    function resolveCunningAction(action: "dash" | "disengage"): void {
      state = cunningActionBattle();
      resetProjection();
      recordResult(
        resolveBattleSubject({
          state,
          subject: bonusActionStandardActionSubject(state, action),
          fills: [],
        }),
      );
    }

    function resolveDexHalfCantrip(succeeded: boolean): void {
      state = evasionBattle(input.evasionUnitId);
      resetProjection();
      const subject = requireDiscoveredSubject(
        state,
        "actionSpell",
        combatantId("rule-core-feature-wizard"),
      );
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
      const subject = actorAttackSubject(state, "Shortsword", targetId);
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const attackRoll = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [attackTargetFill(target, targetId, actorId)],
        }),
        "attackRoll",
      );
      const prefixFills = [
        attackTargetFill(target, targetId, actorId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      ];
      const afterHit = resolveBattleSubject({
        state,
        subject,
        fills: prefixFills,
      });
      const damageStart =
        input.modifierKind === "damageRollReduction" &&
        afterHit.tag === "needsHoles" &&
        afterHit.holes.some((hole) => hole.kind === "interruptDecision")
          ? resolveBattleInterrupt({
              state: afterHit.state,
              fill: interruptDecisionFill(
                requireHoleFromList(afterHit.holes, "interruptDecision"),
                { kind: "decline", responderId: actorId },
              ),
            })
          : afterHit;
      const awaited =
        input.modifierKind === "attackDamageReduction" ||
        input.modifierKind === "attackRollReduction"
          ? afterHit
          : resolveDamageRollReductionWindow({
              damageStart,
              subject,
              prefixFills,
              damageRoll: input.damageRoll,
            });
      if (awaited.tag !== "needsHoles") {
        throw new Error(
          `Expected reaction window, got ${awaited.tag}${
            awaited.tag === "invalid" ? `:${awaited.message}` : ""
          } for ${input.modifierKind}.`,
        );
      }
      const choice = reactionModifierChoice(
        awaited.snapshot.pendingInterrupt?.choices ?? [],
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
      const afterReaction = resolveBattleInterrupt({
        state: awaited.state,
        fill: interruptDecisionFill(
          requireHoleFromList(awaited.holes, "interruptDecision"),
          {
            kind: "resolve",
            responderId: actorId,
            choice: {
              kind: "reactionRollOrDamageReduction",
              procedureRef: choice.choice.procedureRef,
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

function resolveDamageRollReductionWindow(input: {
  readonly damageStart: BattleResolutionResult;
  readonly subject: BattleSubject;
  readonly prefixFills: readonly BattleFill[];
  readonly damageRoll: number;
}): BattleResolutionResult {
  if (input.damageStart.tag === "invalid") {
    throw new Error(
      `Expected damage roll window, got invalid:${input.damageStart.message}.`,
    );
  }
  return resolveBattleSubject({
    state: input.damageStart.state,
    subject: input.subject,
    fills: [
      ...input.prefixFills,
      damageRollFillWithGroups(requireHole(input.damageStart, "rolledDice"), [
        [input.damageRoll],
      ]),
    ],
  });
}

const featureStateCheck = stateCheck(
  (raw) => normalizeRuleCoreFeatureQuintState(raw, "projectionNotOwned"),
  compareRuleCoreFeatureState,
);

const attackRiderFeatureStateCheck = stateCheck(
  (raw) => normalizeRuleCoreFeatureQuintState(raw, "projectionRequired"),
  compareRuleCoreFeatureState,
);

const ruleCoreFeatureDefaultMbtSteps = 6;

describe("rule-core Feature focused MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<RuleCoreFeatureDriverAction>();

      for (const sequence of replay.sequences) {
        resetSelectedUnitRuntimeBoundaryIds();
        const replayEvasionUnitId = evasionUnitIdForReplay(replay.unitId);
        const driver = createRuleCoreFeatureDriver(
          replayEvasionUnitId === undefined
            ? {}
            : { evasionUnitId: replayEvasionUnitId },
        )();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing rule-core Feature driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        expect(
          selectedUnitRuntimeBoundaryIds.has(replay.unitId),
          `${replay.unitId}:${sequence.name} must admit its selected Unit id at the workflow boundary`,
        ).toBe(true);

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error("Rule-core Feature driver must expose getState.");
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it(
    "replays QCORE9 aggregate feature family through battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "rule-core-features.mbt.qnt"),
        init: "init",
        step: "step",
        driver: createRuleCoreFeatureDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreFeatureDefaultMbtSteps),
        stateCheck: featureStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "replays QCORE9 action economy feature family through battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-feature-action-economy.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRuleCoreFeatureDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreFeatureDefaultMbtSteps),
        stateCheck: featureStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "replays QCORE9 attack rider feature family through battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-feature-attack-riders.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRuleCoreFeatureDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreFeatureDefaultMbtSteps),
        stateCheck: attackRiderFeatureStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "replays QCORE9 attack rider feature family mixed Frenzy damage-type outcomes",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-feature-attack-riders.mbt.qnt",
        ),
        init: "init",
        step: "stepFrenzyDamageTypeChoice",
        driver: createRuleCoreFeatureDriver(),
        backend: "typescript",
        nTraces: 1,
        maxSteps: 5,
        stateCheck: attackRiderFeatureStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "replays QCORE9 save and reaction feature family through battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-feature-save-reactions.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRuleCoreFeatureDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreFeatureDefaultMbtSteps),
        stateCheck: featureStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "replays QCORE9 passive and zero-Hit-Point feature family through battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-feature-passive-zero-hp.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRuleCoreFeatureDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreFeatureDefaultMbtSteps),
        stateCheck: featureStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right.state;
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

function tacticalMindBattle(
  unit: Extract<UnitRecord, { readonly kind: "class_feature" }>,
): BattleState {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: recordSelectedUnitRuntimeBoundaryId(unit.id) },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return startBattleRight({
    battleId: battleId("rule-core-tactical-mind"),
    combatants: [
      featureActor({
        initiative: 20,
        classLevels: [{ className: "fighter", level: 2 }],
        resources: [unitResource("fighter_second_wind")],
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "fighter", level: classLevel(2) },
          ]),
        ],
        characterUnitRefs: [unitRef.right],
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
            unit: unitLibrary.requireUnit(
              recordSelectedUnitRuntimeBoundaryId(
                selectedUnitId("rogue_cunning_action"),
              ),
            ),
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

function myceliumStepBattle(): BattleState {
  const unit = mechanicsOnlyMyceliumStepUnit(myceliumStepInput);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: recordSelectedUnitRuntimeBoundaryId(unit.id) },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return startBattleRight({
    battleId: battleId("rule-core-mycelium-step"),
    combatants: [
      featureActor({
        initiative: 20,
        characterUnitRefs: [unitRef.right],
      }),
      featureTarget(10),
    ],
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
  const recklessUnitId = recordSelectedUnitRuntimeBoundaryId(
    selectedUnitId("barbarian_reckless_attack"),
  );
  return startBattleRight({
    battleId: battleId("rule-core-reckless"),
    combatants: [
      featureActor({
        initiative: 20,
        classLevels: [{ className: "barbarian", level: 2 }],
        unitFeatures: [
          characterBattleFeatureInitForTest(
            unitLibrary.requireUnit(recklessUnitId),
            [{ className: "barbarian", level: classLevel(2) }],
          ),
        ],
        characterUnitRefs: [
          supportedCharacterUnitRef(recklessUnitId, [
            { className: "barbarian", level: classLevel(2) },
          ]),
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
        unitFeatures: [
          characterBattleFeatureInitForTest(
            unitLibrary.requireUnit(
              recordSelectedUnitRuntimeBoundaryId(
                selectedUnitId("rogue_sneak_attack"),
              ),
            ),
            [{ className: "rogue", level: classLevel(1) }],
          ),
        ],
        characterUnitRefs: [
          {
            unit: unitLibrary.requireUnit(
              recordSelectedUnitRuntimeBoundaryId(
                selectedUnitId("rogue_sneak_attack"),
              ),
            ),
            supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
          },
        ],
      }),
      featureTarget(10),
    ],
  });
}

function frenzyBattle(): BattleState {
  const frenzyUnitId = recordSelectedUnitRuntimeBoundaryId(
    selectedUnitId("barbarian_frenzy"),
  );
  const recklessUnitId = recordSelectedUnitRuntimeBoundaryId(
    selectedUnitId("barbarian_reckless_attack"),
  );
  const classLevels = [
    { className: "barbarian", level: classLevel(3) },
  ] as const;
  return startBattleRight({
    battleId: battleId("rule-core-frenzy"),
    combatants: [
      featureActor({
        initiative: 20,
        classLevels: [{ className: "barbarian", level: 3 }],
        resources: [unitResource("barbarian_rage")],
        unitFeatures: [
          characterBattleFeatureInitForTest(
            unitLibrary.requireUnit(frenzyUnitId),
            classLevels,
          ),
          characterBattleFeatureInitForTest(
            unitLibrary.requireUnit(recklessUnitId),
            classLevels,
          ),
        ],
        characterUnitRefs: [
          supportedCharacterUnitRef(frenzyUnitId, classLevels),
          supportedCharacterUnitRef(recklessUnitId, classLevels),
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
            unit: unitLibrary.requireUnit(
              recordSelectedUnitRuntimeBoundaryId(
                selectedUnitId("fighter_improved_critical"),
              ),
            ),
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

function savageAttackerBattle(): BattleState {
  const unit = unitLibrary.requireUnit(
    recordSelectedUnitRuntimeBoundaryId(selectedUnitId("feat_savage_attacker")),
  );
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return startBattleRight({
    battleId: battleId("rule-core-savage-attacker"),
    combatants: [
      featureActor({
        initiative: 20,
        characterUnitRefs: [unitRef.right],
      }),
      featureTarget(10),
    ],
  });
}

function combatProwessBattle(): BattleState {
  const unit = unitLibrary.requireUnit(
    recordSelectedUnitRuntimeBoundaryId(
      selectedUnitId("feat_boon_of_combat_prowess"),
    ),
  );
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return startBattleRight({
    battleId: battleId("rule-core-combat-prowess"),
    combatants: [
      featureActor({
        initiative: 20,
        characterUnitRefs: [unitRef.right],
      }),
      featureTarget(10),
    ],
  });
}

function relentlessEnduranceBattle(): BattleState {
  const unit = unitLibrary.requireUnit(
    recordSelectedUnitRuntimeBoundaryId(
      selectedUnitId("orc_relentless_endurance"),
    ),
  );
  return startBattleRight({
    battleId: battleId("rule-core-relentless-endurance"),
    combatants: [
      featureActor({ initiative: 20 }),
      {
        ...featureActor({
          combatantId: targetId,
          displayName: "Relentless Endurance Target",
          initiative: 10,
          currentHp: 3,
          attack: zeroAbilityWeaponAttack("weapon_shortsword"),
          resources: [{ unit, usesRemaining: 1 }],
          characterUnitRefs: [
            {
              unit,
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      },
    ],
  });
}

function evasionBattle(
  unitId: EvasionUnitId = rogueEvasionUnitId,
): BattleState {
  const unit = unitLibrary.requireUnit(
    recordSelectedUnitRuntimeBoundaryId(unitId),
  );
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Evasion class feature Unit.");
  }
  return startBattleRight({
    battleId: battleId("rule-core-evasion"),
    combatants: [
      featureActor({
        combatantId: combatantId("rule-core-feature-wizard"),
        displayName: "Wizard",
        initiative: 20,
        classLevels: [{ className: "wizard", level: 1 }],
        attack: null,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: 3,
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [dexHalfDamageCantrip()],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [],
        },
      }),
      featureActor({
        initiative: 10,
        currentHp: 12,
        classLevels: [{ className: unit.className, level: 7 }],
        attack: null,
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: unit.className, level: classLevel(7) },
          ]),
        ],
        characterUnitRefs: [
          {
            unit: unitLibrary.requireUnit(
              recordSelectedUnitRuntimeBoundaryId(unit.id),
            ),
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
  readonly className: "bard" | "monk" | "rogue";
  readonly level: number;
  readonly supportProfile?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"][number]["supportProfiles"][number];
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
}): BattleState {
  const unitId = recordSelectedUnitRuntimeBoundaryId(
    parseSharedUnitId(input.unitId),
  );
  return startBattleRight({
    battleId: battleId(`rule-core-${unitId}`),
    combatants: [
      featureTarget(20),
      featureActor({
        initiative: 10,
        classLevels: [{ className: input.className, level: input.level }],
        attack: null,
        resources: input.resources,
        unitFeatures: [
          characterBattleFeatureInitForTest(input.unit, [
            { className: input.className, level: classLevel(input.level) },
          ]),
        ],
        characterUnitRefs: [
          {
            unit: input.unit,
            supportProfiles: [
              input.supportProfile ??
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
  const characterUnitRefs = [...(input.characterUnitRefs ?? [])];
  if (
    attack !== null &&
    !characterUnitRefs.some(
      ({ unit }) => unit.id === attack.weapon.weaponUnitId,
    )
  ) {
    characterUnitRefs.push({
      unit: unitLibrary.requireUnit(attack.weapon.weaponUnitId),
      supportProfiles: [],
    });
  }
  return {
    combatantId: input.combatantId ?? actorId,
    displayName: input.displayName ?? "Feature Actor",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${input.combatantId ?? actorId}-character`),
      characterUnitRefs,
      classLevels: input.classLevels ?? [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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
                itemId: battleObjectId("main:feature-weapon"),
                unitId: attack.weapon.weaponUnitId,
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
  };
}

function supportedCharacterUnitRef(
  unitId: string,
  classLevels: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"],
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(unitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
    classLevels,
  });
  if (Either.isLeft(unitRef)) throw new Error(unitRef.left.message);
  return unitRef.right;
}

function zeroAbilityWeaponAttack(
  unitId:
    | "weapon_longsword"
    | "weapon_dagger"
    | "weapon_shortbow"
    | "weapon_shortsword",
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
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
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
  const unit = unitLibrary.requireUnit(
    recordSelectedUnitRuntimeBoundaryId(parseSharedUnitId(unitId)),
  );
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
  state: BattleState,
  attackName: "Longsword" | "Dagger" | "Scimitar" | "Shortbow" | "Shortsword",
  actor: CombatantId = actorId,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return characterAttackSubjectForTest(state, actor, attackName);
}

function requireDiscoveredSubject(
  state: BattleState,
  tag: "actionSpell",
  ownerId?: CombatantId,
): Extract<BattleSubject, { readonly tag: "actionSpell" }>;
function requireDiscoveredSubject(
  state: BattleState,
  tag: "unitFeature",
  ownerId?: CombatantId,
): Extract<BattleSubject, { readonly tag: "unitFeature" }>;
function requireDiscoveredSubject(
  state: BattleState,
  tag: "actionSpell" | "unitFeature",
  ownerId: CombatantId = actorId,
): BattleSubject {
  const subject = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.actorId === ownerId && candidate.subject.tag === tag,
  )?.subject;
  if (subject === undefined) {
    throw new Error(`Expected discovered ${tag} act.`);
  }
  return subject;
}

function requireUnitProcedureRef(
  state: BattleState,
  ownerId: CombatantId,
  executionKind:
    | "attackDamageRider"
    | "attackRollMissToHitReplacement"
    | "failedAbilityCheckResourceBoost"
    | "weaponDamageDiceRollChoice"
    | "zeroHitPointReplacement",
): BattleProcedureExecutionRef {
  const actor = state.combatants.get(ownerId);
  if (actor?.origin.kind !== "character") {
    throw new Error(`Expected character combatant ${ownerId}.`);
  }
  const procedureRefs = actor.origin.execution.procedureBindings.flatMap(
    (binding) =>
      (binding.procedure.kind === "unitFeature" &&
        binding.procedure.execution.kind === executionKind) ||
      (binding.procedure.kind === "unitSupportProfile" &&
        unitSupportProfileKind(binding.procedure.execution) === executionKind)
        ? [binding.procedureRef]
        : [],
  );
  if (procedureRefs.length !== 1) {
    throw new Error(
      `Expected exactly one ${executionKind} Unit procedure for ${ownerId}, got ${procedureRefs.length}.`,
    );
  }
  return procedureRefs[0];
}

function unitFeatureSubject(
  state: BattleState,
): Extract<BattleSubject, { readonly tag: "unitFeature" }> {
  return requireDiscoveredSubject(state, "unitFeature");
}

function bonusActionStandardActionSubject(
  state: BattleState,
  action: "dash" | "disengage" | "hide",
): Extract<BattleSubject, { readonly tag: "bonusActionStandardAction" }> {
  const subject = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionStandardAction" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === action,
  )?.subject;
  if (subject?.tag !== "bonusActionStandardAction") {
    throw new Error(`Expected ${action} Bonus Action standard act.`);
  }
  return subject;
}

function findAct(
  state: BattleState,
  subject: BattleSubject,
): ReturnType<typeof discoverBattleActCandidates>[number] {
  const act = discoverBattleActCandidates(state).find((candidate) =>
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
    throw new Error(
      result.tag === "invalid"
        ? `Expected needsHoles, got invalid (${result.reason}: ${result.message}).`
        : `Expected needsHoles, got ${result.tag}.`,
    );
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
): BattleFill {
  if (hole.kind !== "targetChoice" || hole.attack === undefined) {
    throw new Error("Expected bound targetChoice attack selection.");
  }
  return targetFill(hole, defenderId, [
    hole.attack.targetConstraint.kind === "rangedRange"
      ? {
          kind: "attackTargetInRangedRange",
          actorId: attackerId,
          targetId: defenderId,
          ...hole.attack.selection,
          rangeBand: "normal",
        }
      : {
          kind: "attackTargetInMeleeReach",
          actorId: attackerId,
          targetId: defenderId,
          ...hole.attack.selection,
        },
    {
      kind: "attackerAllyWithin5FeetOfTarget",
      attackerId,
      targetId: defenderId,
      allyId: combatantId("rule-core-feature-ally"),
    },
    {
      kind: "spellTarget",
      casterId: combatantId("rule-core-feature-wizard"),
      targetId: defenderId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("dex_half_cantrip"),
      ),
    },
  ]);
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
    readonly activatedOngoingFeatureProcedureRef?: BattleProcedureExecutionRef;
    readonly missToHitReplacementProcedureRef?: BattleProcedureExecutionRef;
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
      ...(value.activatedOngoingFeatureProcedureRef === undefined
        ? {}
        : {
            activatedOngoingFeatureProcedureRef:
              value.activatedOngoingFeatureProcedureRef,
          }),
      ...(value.missToHitReplacementProcedureRef === undefined
        ? {}
        : {
            missToHitReplacementProcedureRef:
              value.missToHitReplacementProcedureRef,
          }),
    },
  };
}

function interruptDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  if (hole.kind !== "interruptDecision") {
    throw new Error("Expected interruptDecision.");
  }
  return { kind: "interruptDecision", holeId: hole.holeId, value };
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
  selectedAttackDamageRiderProcedureRefs?: readonly BattleProcedureExecutionRef[],
  weaponDamageDiceRollChoice?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["weaponDamageDiceRollChoice"],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") throw new Error("Expected rolledDice.");
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderProcedureRefs === undefined
      ? {}
      : { selectedAttackDamageRiderProcedureRefs }),
    ...(weaponDamageDiceRollChoice === undefined
      ? {}
      : { weaponDamageDiceRollChoice }),
    value: rolledDiceGroups(groups),
  };
}

function attackDamageDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "attackDamageDisposition" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
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

function rolledDiceGroup(group: readonly number[]): {
  readonly results: readonly [
    ReturnType<typeof DieRollResult>,
    ...ReturnType<typeof DieRollResult>[],
  ];
} {
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
      ReturnType<typeof snapshotBattle>["pendingInterrupt"]
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
      candidate.choice.kind === modifierKind,
  );
  if (choice?.kind !== "reactionRollOrDamageReduction") {
    throw new Error(`Expected ${unitId} ${modifierKind} choice.`);
  }
  return choice;
}

function resourceUsesRemaining(
  state: BattleState,
  ownerId: CombatantId = actorId,
): number {
  const actor = state.combatants.get(ownerId);
  if (actor?.origin.kind !== "character") return 1;
  const resource = soleLimitedFeatureResource(actor.origin.resources);
  if (
    resource === undefined ||
    characterBattleResourceUsage(resource) !== "limited"
  ) {
    return 1;
  }
  return "usesRemaining" in resource ? resource.usesRemaining : 1;
}

function combatProwessUsesRemaining(state: BattleState): number {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    throw new Error("Expected Combat Prowess actor.");
  }
  return actor.attackRollMissToHitReplacementsUsedSinceTurnStart.some(
    (usage) =>
      usage.procedureRef === combatProwessProcedureRefForProjection(state),
  )
    ? 0
    : 1;
}

function projectRuleCoreFeatureState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastDamageAmount: number;
  readonly frenzyDamageTypeSelection: FrenzyDamageTypeSelectionProjection;
  readonly abilityCheckBoostedTotal: number;
  readonly abilityCheckBoostedSucceeded: boolean;
  readonly critical: boolean;
  readonly actorArmorClass: number;
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
  const activeOngoingFeatures =
    input.state.combatants.get(actorId)?.activeOngoingFeatureOccurrences;
  const rageProcedureRef = ongoingFeatureProcedureRefForProjection(
    input.state,
    "bonusAction",
  );
  const recklessProcedureRef = ongoingFeatureProcedureRefForProjection(
    input.state,
    "firstAttackRoll",
  );
  return withRuleCoreComponentRoute(componentOwner, {
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
    rageActive:
      rageProcedureRef !== undefined &&
      activeOngoingFeatures?.has(rageProcedureRef) === true,
    recklessActive:
      recklessProcedureRef !== undefined &&
      activeOngoingFeatures?.has(recklessProcedureRef) === true,
    incomingAttackAdvantage: incomingAttackAdvantage(input.state),
    sneakAttackUsedThisTurn:
      input.state.currentTurnResources.attackDamageRidersUsedThisTurn.some(
        (used) =>
          used.attackerId === actorId &&
          used.procedureRef ===
            sneakAttackProcedureRefForProjection(input.state),
      ),
    lastDamageAmount: input.lastDamageAmount,
    frenzyDamageTypeSelection: input.frenzyDamageTypeSelection,
    abilityCheckBoostedTotal: input.abilityCheckBoostedTotal,
    abilityCheckBoostedSucceeded: input.abilityCheckBoostedSucceeded,
    critical: input.critical,
    actorArmorClass: input.actorArmorClass,
    holes: input.holes.map(projectFeatureHole),
    pendingInterrupt: snapshot.pendingInterrupt !== null,
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  });
}

function combatProwessProcedureRefForProjection(
  state: BattleState,
): BattleProcedureExecutionRef | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  return actor.origin.execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "unitSupportProfile" &&
      typeof binding.procedure.execution === "object" &&
      binding.procedure.execution.kind === "attackRollMissToHitReplacement",
  )?.procedureRef;
}

function sneakAttackProcedureRefForProjection(
  state: BattleState,
): BattleProcedureExecutionRef | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  return actor.origin.execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "unitFeature" &&
      binding.procedure.execution.kind === "attackDamageRider" &&
      binding.procedure.execution.trigger ===
        "finesseOrRangedAttackWithAdvantageOrAlly",
  )?.procedureRef;
}

function ongoingFeatureProcedureRefForProjection(
  state: BattleState,
  activationTrigger: "bonusAction" | "firstAttackRoll",
): BattleProcedureExecutionRef | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  return actor.origin.execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "unitFeature" &&
      binding.procedure.execution.kind === "ongoingFeature" &&
      binding.procedure.execution.activationTrigger === activationTrigger,
  )?.procedureRef;
}

function requireOngoingFeatureProcedureRef(
  state: BattleState,
  activationTrigger: "bonusAction" | "firstAttackRoll",
): BattleProcedureExecutionRef {
  const procedureRef = ongoingFeatureProcedureRefForProjection(
    state,
    activationTrigger,
  );
  if (procedureRef === undefined) {
    throw new Error(
      `Expected ${activationTrigger} ongoing Feature procedure binding.`,
    );
  }
  return procedureRef;
}

function actionSurgeGrant(state: BattleState): ActionSurgeGrant {
  if (
    state.currentTurnResources.actionResources.some(
      (resource) =>
        resource.source === "unit" && resource.sourceOwnerId === actorId,
    )
  ) {
    return "ActionSurgeActionAvailable";
  }
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind === "character") {
    const resource = soleLimitedFeatureResource(actor.origin.resources);
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

function soleLimitedFeatureResource(
  resources: readonly CharacterBattleResourceState[],
): CharacterBattleResourceState | undefined {
  const limitedResources = resources.filter(
    (candidate) => characterBattleResourceUsage(candidate) === "limited",
  );
  if (limitedResources.length > 1) {
    throw new Error(
      `Expected at most one limited feature resource, got ${limitedResources.length}.`,
    );
  }
  return limitedResources.at(0);
}

function incomingAttackAdvantage(state: BattleState): boolean {
  const recklessProcedureRef = ongoingFeatureProcedureRefForProjection(
    state,
    "firstAttackRoll",
  );
  if (
    recklessProcedureRef !== undefined &&
    state.combatants
      .get(actorId)
      ?.activeOngoingFeatureOccurrences.has(recklessProcedureRef) === true
  ) {
    return true;
  }
  const potentialAttacker = state.combatants.get(targetId);
  if (potentialAttacker === undefined) {
    return false;
  }
  if (potentialAttacker.origin.kind !== "character") {
    throw new Error(
      "Rule-core Feature incoming-attack projection requires a character attacker.",
    );
  }
  const subject = actorAttackSubject(state, "Shortsword", targetId);
  const target = resolveBattleSubject({ state, subject, fills: [] });
  if (target.tag !== "needsHoles") return false;
  const targetHole = target.holes.find((hole) => hole.kind === "targetChoice");
  if (targetHole === undefined) return false;
  const roll = resolveBattleSubject({
    state,
    subject,
    fills: [attackTargetFill(targetHole, targetId, actorId)],
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
  if (hole.kind === "interruptDecision") return "ReactionDecision";
  throw new Error(`Unexpected rule-core Feature MBT hole: ${hole.kind}`);
}

function normalizeRuleCoreFeatureQuintState(
  raw: unknown,
  frenzyProjectionPolicy: "projectionNotOwned" | "projectionRequired",
): RuleCoreFeatureProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: featureHoleName,
  });
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
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
    frenzyDamageTypeSelection: frenzyDamageTypeSelectionForDriver(
      state["qFrenzyDamageTypeSelection"],
      frenzyProjectionPolicy,
    ),
    abilityCheckBoostedTotal: numberFromQuintInt(
      state["qAbilityCheckBoostedTotal"],
      "qAbilityCheckBoostedTotal",
    ),
    abilityCheckBoostedSucceeded: booleanField(
      state,
      "qAbilityCheckBoostedSucceeded",
    ),
    critical: booleanField(state, "qCritical"),
    actorArmorClass: numberFromQuintInt(
      state["qActorArmorClass"],
      "qActorArmorClass",
    ),
    holes: protocol.holes,
    pendingInterrupt: booleanField(state, "qPendingReaction"),
    lastResult: featureResult(protocol.lastResult),
    lastInvalidReason: featureInvalidReason(protocol.lastInvalidReason),
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
    id: parseSharedUnitId("dex_half_cantrip"),
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

function cuttingWordsUnit(): Extract<
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
  return unit;
}

function tacticalMindUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("fighter_tactical_mind");
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "failed_ability_check_resource_boost"
  ) {
    throw new Error("Expected Tactical Mind failed ability-check Unit.");
  }
  return unit;
}

function deflectAttacksUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("monk_deflect_attacks");
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "reaction_roll_or_damage_reduction"
  ) {
    throw new Error("Expected Deflect Attacks reaction Unit.");
  }
  return unit;
}

function featureHoleName(raw: unknown): RuleCoreFeatureMbtHole {
  const tag = quintVariantTag(raw);
  if (isRuleCoreFeatureMbtHole(tag)) return tag;
  throw new Error(`Unknown Quint rule-core Feature hole variant: ${tag}`);
}

function frenzyDamageTypeSelectionForDriver(
  raw: unknown,
  policy: "projectionNotOwned" | "projectionRequired",
): FrenzyDamageTypeSelectionProjection {
  if (raw !== undefined) {
    return frenzyDamageTypeSelectionProjection(raw);
  }
  if (policy === "projectionNotOwned") {
    return { tag: "notObserved" };
  }
  throw new Error(
    "Attack-rider Quint driver must export qFrenzyDamageTypeSelection.",
  );
}

function frenzyDamageTypeSelectionProjection(
  raw: unknown,
): FrenzyDamageTypeSelectionProjection {
  const tag = quintVariantTag(raw);
  if (tag === "FrenzySelectionNotObserved") return { tag: "notObserved" };
  if (tag === "FrenzyAutomatic" || tag === "FrenzySelected") {
    return {
      tag: tag === "FrenzyAutomatic" ? "automatic" : "selected",
      damageType: decodeFrenzyMbtDamageType(
        quintVariantValue(raw, tag, "qFrenzyDamageTypeSelection"),
        "qFrenzyDamageTypeSelection.value",
      ),
    };
  }
  if (tag === "FrenzyDecisionRequired") {
    const choices = quintStateRecord(
      quintVariantValue(
        raw,
        "FrenzyDecisionRequired",
        "qFrenzyDamageTypeSelection",
      ),
    );
    return {
      tag: "decisionRequired",
      choices: [
        stringLiteralField(choices, "first", frenzyMbtDamageTypes),
        stringLiteralField(choices, "second", frenzyMbtDamageTypes),
        ...quintList(
          choices["rest"],
          "qFrenzyDamageTypeSelection.value.rest",
        ).map((damageType) =>
          decodeFrenzyMbtDamageType(
            damageType,
            "qFrenzyDamageTypeSelection.value.rest[]",
          ),
        ),
      ],
    };
  }
  if (tag === "FrenzyRejected") return { tag: "rejected" };
  throw new Error(`Unknown Quint Frenzy damage-type selection: ${tag}.`);
}

function decodeFrenzyMbtDamageType(
  raw: unknown,
  field: string,
): FrenzyMbtDamageType {
  return stringLiteralValue(raw, field, frenzyMbtDamageTypes);
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
