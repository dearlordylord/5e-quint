import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  allocateBattleEffectOccurrenceTemplatesForCreature,
  type BattleActiveEffectOccurrenceTemplate,
  type BattleAllocatedEffectOccurrence,
} from "./effect-execution-ref.ts";
import type { BattleStoredLightEmitterTemplate } from "./battle-state-execution.ts";

export const SURFACE_UNIT_RECORD_SCHEMA_NEGATIVE_TEST_TIMEOUT_MILLISECONDS = 10_000;

export type MembersOf<Owner, Members extends Owner> = Members;
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bardic-inspiration-failed-d20-test unit-feature.grappler unit-feature.innate-sorcery-activation unit-feature.martial-arts-attack-projection unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow unit-feature.fighter-tactical-master spell.invocation-independent-attack-sequence spell.invocation-condition-save spell.invocation-damage-save-or-attack spell.invocation-fog-cloud-obscurement spell.invocation-grease-ground-hazard spell.invocation-make-stable spell.invocation-marked-damage-rider spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-weapon-damage-rider
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV72B bard_bardic_inspiration
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV75B sorcerer_innate_sorcery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84C spare_the_dying
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84D hex
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84E fog_cloud
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV87C ranger_favored_enemy
import {
  spawnedCompanionFormEligibilityForSpell,
  pactOfTheChainSpawnedCompanionFormEligibilityForSpell,
  resolveSpawnedCompanionForm,
  resolvePactOfTheChainSpawnedCompanionForm,
} from "@dnd/surface/surface/find-familiar-forms";
import { Match, Result, Schema } from "effect";
import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import {
  battleAmmunitionStock,
  requiredAmmunitionKinds,
} from "./battle-ammunition.ts";
import * as Option from "effect/Option";
import { attackActionOptionName } from "./battle-reducer/statblock-attacks.ts";
import { statBlockAttackProcedureSection } from "./battle-reducer/statblock.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import { statBlockProcedurePresentations } from "./stat-block-presentation.ts";
import { admitSpawnedCompanionReappearance } from "./companion-admission.ts";
import { resolveAdmittedCompanionReappearanceSubject } from "./battle-reducer/companion-lifecycle-procedures.ts";

import {
  abilityModifier,
  armorClass,
  defaultArmorClassState,
  defaultUnarmoredArmorClassBase,
} from "@dnd/shared-algebras/armor-class-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  elapsedTimeTicks,
  elapsedTimeTicksFromHours,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  holeId,
  holeInstanceKey,
  type AttackRollMode,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  attackBonus,
  abilityModifier as battleAbilityModifier,
  damageAmount,
  DieRollResult,
  difficultyClass,
  Hp,
  NonNegativeInteger,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
  resourceCount,
  type Condition,
  type MovementFeet,
} from "@dnd/shared/types";
import {
  statBlockId,
  type UnitId,
  unitId as parseUnitId,
} from "@dnd/shared/game-facts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import type {
  AreaDirectEffectAtom,
  DamageType,
  EffectAtom,
  Size,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { isEffectAtom } from "@dnd/surface/surface/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import acidSplashInput from "../../surface/content/acid_splash.json";
import burningHandsInput from "../../surface/content/burning_hands.json";
import chainLightningInput from "../../surface/content/chain_lightning.json";
import chillTouchInput from "../../surface/content/chill_touch.json";
import colorSprayInput from "../../surface/content/color_spray.json";
import eldritchBlastInput from "../../surface/content/eldritch_blast.json";
import spawnedCompanionInput from "../../surface/content/find_familiar.json";
import fireBoltInput from "../../surface/content/fire_bolt.json";
import fogCloudInput from "../../surface/content/fog_cloud.json";
import greaseInput from "../../surface/content/grease.json";
import guidingBoltInput from "../../surface/content/guiding_bolt.json";
import healingWordInput from "../../surface/content/healing_word.json";
import hexInput from "../../surface/content/hex.json";
import huntersMarkInput from "../../surface/content/hunters_mark.json";
import iceKnifeInput from "../../surface/content/ice_knife.json";
import inflictWoundsInput from "../../surface/content/inflict_wounds.json";
import mageArmorInput from "../../surface/content/mage_armor.json";
import magicMissileInput from "../../surface/content/magic_missile.json";
import poisonSprayInput from "../../surface/content/poison_spray.json";
import rayOfFrostInput from "../../surface/content/ray_of_frost.json";
import rayOfSicknessInput from "../../surface/content/ray_of_sickness.json";
import sacredFlameInput from "../../surface/content/sacred_flame.json";
import shockingGraspInput from "../../surface/content/shocking_grasp.json";
import spareTheDyingInput from "../../surface/content/spare_the_dying.json";
import starryWispInput from "../../surface/content/starry_wisp.json";
import viciousMockeryInput from "../../surface/content/vicious_mockery.json";
import weaponLongbowInput from "../../surface/content/weapon_longbow.json";
import weaponQuarterstaffInput from "../../surface/content/weapon_quarterstaff.json";
import { applyWeaponMasterySapOnHit } from "./battle-reducer/attack-roll.ts";
import {
  battleActDruidWildShapePresentation,
  battleActSpellPresentation,
  battleActUnitPresentation,
  battleSelectedSpellInvocationForProcedure,
} from "./battle-act-composition.ts";
import { characterUnitProcedureRefsForAuthoredSelection } from "./battle-composition-admission.ts";
import { combatantCanSee } from "./battle-reducer/creature-state-leaves.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { supportedSpellInvocationRef } from "./battle-reducer/spells-invocation-ref.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { spellFillSet } from "./battle-reducer/spells-resolve-fill-set.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  readyTriggerDescription,
  type BattleInterruptAttackExecutionSelection,
  type BattleReadyResponse,
} from "./battle-subjects.ts";
import {
  battleCharacterExecutionScopeRef,
  battleEffectExecutionRef,
  battleExecutionScopeOrdinal,
  battleProcedureExecutionRef,
  BattleProcedureExecutionRef,
  spellId,
} from "./identity.ts";
import type { BattleEffectExecutionRef } from "./identity.ts";
import {
  battleRuntimeContextFromCharacterAdmission,
  type BattleRuntimeContext,
  type BattleRuntimeSession,
  type BattleStatBlockPresentationSource,
} from "./battle-runtime-context.ts";
import {
  addBattleCombatant,
  removeBattleCombatants,
} from "./battle-reducer/api-lifecycle.ts";
import {
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
  parseCharacterBattleClassLevels,
  type CharacterBattleFeatureInit,
} from "./character-battle-resources.ts";
import type {
  CharacterBattleClassLevel,
  CharacterBattleClassLevels,
} from "./character-class-level.ts";
import {
  type AuthoredSelectedSpellInvocation,
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  bindSelectedSpellInvocation,
  characterUnitProcedure,
  spellProcedureExecution,
  type CharacterUnitProcedureQuery,
} from "./character-execution-admission.ts";
import { admitCharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-admission.ts";
import { characterBattleCreatureInitWeaponAttack } from "./battle-init.ts";
import type { CharacterWeaponAttackActionOption } from "./battle-action-options.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  armorOfShadowsSpellInvocationRef,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  BATTLE_READIED_SPELL_TRIGGERS,
  battleAreaId,
  battleAvailableDruidWildShapeKnownForms,
  battleBonusActionStandardActionSupportForUnit,
  BattleFillSchema,
  BattleHoleSchema,
  battleId,
  battleObjectId,
  battleObscurementZones,
  battleReactionRollOrDamageReductionSupportForUnit,
  BattleSnapshotSchema,
  BattleCheckpointFrontierEnvelopeSchema,
  BattleSubjectSchema,
  battleCheckpointFrontierEnvelope,
  battleFrontierInterruptDecision,
  battleFrontierInterruptDecisionForState,
  battleTablePositionId,
  battleUnitSupportProfilesForUnit,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  characterBattleResourceSupportedForUnit,
  characterBattleResourceUsage,
  characterId,
  spellAccessFreeCastSpellInvocationRef,
  combatantId,
  concentrationSavingThrowDc,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  KNOCKED_OUT_UNCONSCIOUS,
  objectInvisibleBenefitDenied,
  PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
  parseSupportedUnitFeatureProfile,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  resolveBardicInspirationFailedD20Test,
  resolveBattleConcentrationDamage,
  resolveBattleInterrupt,
  resolveBattleSubject as resolveBattleSubjectRuntime,
  resolveFailedAbilityCheckResourceBoost,
  resolveSuccessfulAbilityCheckReactionReduction,
  sameBattleSubject,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  snapshotBattle,
  spellSaveDcForCaster,
  spellSlotInvocationRef,
  startBattle,
  TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES,
  TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  type ActiveOngoingFeatureOccurrence,
  type BattleAreaId,
  type BattleAttackExecutionSelection,
  type BattleAttackProcedureExecutionRef,
  type BattleCreatureInit,
  type BattleCreatureState,
  type BattleFill,
  type BattleHidePrerequisite,
  type BattleHole,
  type BattleInterruptCheckpoint,
  type BattleInterruptProcedureSelection,
  type BattleReadiedSpellTrigger,
  type BattleSelectedSpellInvocation,
  type BattleSpellAreaOriginAnchor,
  type BattleState,
  type BattleSubject,
  type BattleUnitRef,
  type CombatantId,
  type OngoingFeatureSourceKey,
  type SpellInvocationRef,
} from "./index.ts";
import {
  battleCunningStrikeSupportForUnit,
  type BattleUnitSupportProfileSourceFacts,
} from "./unit-feature-support.ts";
export { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

export function characterBattleFeatureInitForTest(
  unit: UnitRecord,
  classLevels: readonly CharacterBattleClassLevel[] = [],
  sourceFacts?: BattleUnitSupportProfileSourceFacts,
): CharacterBattleFeatureInit {
  const profile = parseSupportedUnitFeatureProfile(
    unit,
    classLevels,
    sourceFacts,
  );
  if (profile === null) {
    throw new Error(`Expected a supported battle feature fixture: ${unit.id}.`);
  }
  return profile;
}

type CharacterProcedureSubjectForTest = Extract<
  BattleSubject,
  {
    readonly tag:
      | "actionSpell"
      | "bonusActionSpell"
      | "bonusActionDashSpell"
      | "spawnedCompanionTouchSpellProxy"
      | "unitFeature"
      | "unitFeatureHeldWeaponActivation"
      | "druidWildShape"
      | "bonusActionStandardAction"
      | "monkFocusOption";
  }
>;

type ActionSpellSubjectForTest = Extract<
  CharacterProcedureSubjectForTest,
  { readonly tag: "actionSpell" }
>;
type BonusActionSpellSubjectForTest = Extract<
  CharacterProcedureSubjectForTest,
  { readonly tag: "bonusActionSpell" }
>;
type BonusActionDashSpellSubjectForTest = Extract<
  CharacterProcedureSubjectForTest,
  { readonly tag: "bonusActionDashSpell" }
>;
type SpawnedCompanionTouchSpellSubjectForTest = Extract<
  CharacterProcedureSubjectForTest,
  { readonly tag: "spawnedCompanionTouchSpellProxy" }
>;

type SpellProcedureSelectorForTest =
  | {
      readonly tag: "actionSpell";
      readonly actorId: CombatantId;
      readonly invocation: SpellInvocationRef;
      readonly procedureRef?: BattleProcedureExecutionRef;
      readonly mode: ActionSpellSubjectForTest["mode"];
      readonly metamagic?: ActionSpellSubjectForTest["metamagic"];
    }
  | {
      readonly tag: "bonusActionSpell";
      readonly actorId: CombatantId;
      readonly invocation: SpellInvocationRef;
      readonly procedureRef?: BattleProcedureExecutionRef;
      readonly mode: BonusActionSpellSubjectForTest["mode"];
      readonly metamagic?: BonusActionSpellSubjectForTest["metamagic"];
    }
  | {
      readonly tag: "bonusActionDashSpell";
      readonly actorId: CombatantId;
      readonly invocation: SpellInvocationRef;
      readonly procedureRef?: BattleProcedureExecutionRef;
      readonly mode: BonusActionDashSpellSubjectForTest["mode"];
      readonly speedKind: BonusActionDashSpellSubjectForTest["speedKind"];
    }
  | {
      readonly tag: "spawnedCompanionTouchSpellProxy";
      readonly actorId: CombatantId;
      readonly invocation: SpellInvocationRef;
      readonly procedureRef?: BattleProcedureExecutionRef;
      readonly companionId: SpawnedCompanionTouchSpellSubjectForTest["companionId"];
      readonly spellAction: SpawnedCompanionTouchSpellSubjectForTest["spellAction"];
      readonly mode: SpawnedCompanionTouchSpellSubjectForTest["mode"];
      readonly metamagic?: SpawnedCompanionTouchSpellSubjectForTest["metamagic"];
    };

type UnitFeatureSelectorForTest =
  | {
      readonly tag: "unitFeature";
      readonly actorId: CombatantId;
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly tag: "unitFeatureHeldWeaponActivation";
      readonly actorId: CombatantId;
      readonly unitId: UnitRecord["id"];
      readonly weaponItemId: Extract<
        CharacterProcedureSubjectForTest,
        { readonly tag: "unitFeatureHeldWeaponActivation" }
      >["weaponItemId"];
    };

type DruidWildShapeSelectorForTest =
  | {
      readonly tag: "druidWildShape";
      readonly actorId: CombatantId;
      readonly action: "assumeForm";
      readonly unitId: UnitRecord["id"];
      readonly formStatBlockId: StatBlockRecord["id"];
    }
  | {
      readonly tag: "druidWildShape";
      readonly actorId: CombatantId;
      readonly action: "dismiss";
      readonly unitId: UnitRecord["id"];
    };

type BonusActionStandardActionSelectorForTest =
  | {
      readonly tag: "bonusActionStandardAction";
      readonly actorId: CombatantId;
      readonly sourceUnitId: UnitRecord["id"];
      readonly action: "dash";
      readonly speedKind: Extract<
        CharacterProcedureSubjectForTest,
        { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
      >["speedKind"];
    }
  | {
      readonly tag: "bonusActionStandardAction";
      readonly actorId: CombatantId;
      readonly sourceUnitId: UnitRecord["id"];
      readonly action: "disengage" | "hide";
    }
  | {
      readonly tag: "bonusActionStandardAction";
      readonly actorId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly sourceEffectRef: BattleEffectExecutionRef;
      readonly action: "dash";
      readonly speedKind: Extract<
        CharacterProcedureSubjectForTest,
        { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
      >["speedKind"];
    };

type MonkFocusSelectorForTest =
  | {
      readonly tag: "monkFocusOption";
      readonly actorId: CombatantId;
      readonly resourceUnitId: UnitRecord["id"];
      readonly option: "flurryOfBlows";
    }
  | {
      readonly tag: "monkFocusOption";
      readonly actorId: CombatantId;
      readonly resourceUnitId: UnitRecord["id"];
      readonly option: "patientDefense";
      readonly mode: Extract<
        CharacterProcedureSubjectForTest,
        { readonly tag: "monkFocusOption"; readonly option: "patientDefense" }
      >["mode"];
    }
  | {
      readonly tag: "monkFocusOption";
      readonly actorId: CombatantId;
      readonly resourceUnitId: UnitRecord["id"];
      readonly option: "stepOfTheWind";
      readonly mode: Extract<
        CharacterProcedureSubjectForTest,
        { readonly tag: "monkFocusOption"; readonly option: "stepOfTheWind" }
      >["mode"];
      readonly speedKind: Extract<
        CharacterProcedureSubjectForTest,
        { readonly tag: "monkFocusOption"; readonly option: "stepOfTheWind" }
      >["speedKind"];
    };

const statBlockPresentationsByExecutionScopeForTest = new Map<
  string,
  BattleStatBlockPresentationSource
>();

function registerStatBlockPresentationsForTest(
  session: BattleRuntimeSession,
): void {
  for (const [combatantId, presentation] of session.context.statBlocks) {
    const combatant = session.state.combatants.get(combatantId);
    if (combatant?.origin.kind === "statBlock") {
      statBlockPresentationsByExecutionScopeForTest.set(
        String(combatant.origin.execution.scopeRef),
        presentation,
      );
    }
  }
}

export function statBlockProcedurePresentationsForStateForTest(
  state: BattleState,
  actorId: CombatantId,
): ReturnType<typeof statBlockProcedurePresentations> {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected a Stat Block test actor.");
  }
  const presentations = statBlockPresentationsByExecutionScopeForTest.get(
    String(actor.origin.execution.scopeRef),
  );
  if (presentations === undefined) {
    throw new Error("Expected registered Stat Block test presentation.");
  }
  return presentations.procedures;
}

export function battleRuntimeContextForStateForTest(
  state: BattleState,
): BattleRuntimeContext {
  const statBlocks = new Map<CombatantId, BattleStatBlockPresentationSource>();
  for (const [combatantId, combatant] of state.combatants) {
    if (combatant.origin.kind !== "statBlock") continue;
    const presentation = statBlockPresentationsByExecutionScopeForTest.get(
      String(combatant.origin.execution.scopeRef),
    );
    if (presentation !== undefined) statBlocks.set(combatantId, presentation);
  }
  return battleRuntimeContextFromCharacterAdmission(new Map(), statBlocks);
}

export type BattleActSelectorForTest =
  | BattleSubject
  | SpellProcedureSelectorForTest
  | UnitFeatureSelectorForTest
  | DruidWildShapeSelectorForTest
  | BonusActionStandardActionSelectorForTest
  | MonkFocusSelectorForTest;

export function battleProcedureExecutionRefForTest(
  discriminator: string,
): BattleProcedureExecutionRef {
  let ordinal = 0;
  for (const codePoint of discriminator) {
    ordinal = (Math.imul(ordinal, 31) + codePoint.codePointAt(0)!) >>> 0;
  }
  return battleProcedureExecutionRef(
    battleCharacterExecutionScopeRef(
      battleId("battle-test-procedure-reference"),
      combatantId("test-procedure-owner"),
      battleExecutionScopeOrdinal(ordinal),
    ),
    NonNegativeInteger(0),
  );
}

export function battleProcedureExecutionRefForSpellHoleForTest(
  hole: BattleHole,
): BattleProcedureExecutionRef {
  if (
    "sourceProcedureRef" in hole &&
    typeof hole.sourceProcedureRef === "string"
  ) {
    return BattleProcedureExecutionRef.make(hole.sourceProcedureRef);
  }
  if ("procedureRef" in hole && typeof hole.procedureRef === "string") {
    return BattleProcedureExecutionRef.make(hole.procedureRef);
  }
  if (
    "objectContact" in hole &&
    typeof hole.objectContact.sourceProcedureRef === "string"
  ) {
    return BattleProcedureExecutionRef.make(
      hole.objectContact.sourceProcedureRef,
    );
  }
  if (
    hole.kind === "targetChoice" &&
    hole.spellTargetSpatialFactRequest !== undefined
  ) {
    return hole.spellTargetSpatialFactRequest.sourceProcedureRef;
  }
  throw new Error(
    "The enclosing Battle subject must supply the spell procedure execution ref.",
  );
}

export function battleEffectExecutionRefForTest(
  discriminator: string,
): BattleEffectExecutionRef {
  let ordinal = 2_166_136_261;
  for (const character of discriminator) {
    ordinal = Math.imul(ordinal ^ character.charCodeAt(0), 16_777_619) >>> 0;
  }
  return battleEffectExecutionRef(
    JSON.stringify({
      kind: "effectOccurrence",
      ownerScopeRef: battleCharacterExecutionScopeRef(
        battleId("test-battle"),
        combatantId("test-active-effect-owner"),
        battleExecutionScopeOrdinal(0),
      ),
      ordinal,
    }),
  );
}

export function battleStateWithAllocatedEffectForTest(input: {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
  readonly effect: BattleActiveEffectOccurrenceTemplate;
}): BattleState {
  return battleStateWithAllocatedEffectOccurrencesForTest({
    state: input.state,
    occurrences: [
      { kind: "activeEffect", ownerId: input.ownerId, effect: input.effect },
    ],
  }).state;
}

export function battleStateWithAllocatedEffectOccurrencesForTest(input: {
  readonly state: BattleState;
  readonly occurrences: readonly (
    | {
        readonly kind: "activeEffect";
        readonly ownerId: CombatantId;
        readonly effect: BattleActiveEffectOccurrenceTemplate;
      }
    | {
        readonly kind: "storedLightEmitter";
        readonly ownerId: CombatantId;
        readonly emitter: BattleStoredLightEmitterTemplate;
      }
  )[];
}): {
  readonly state: BattleState;
  readonly occurrences: readonly (BattleAllocatedEffectOccurrence & {
    readonly ownerId: CombatantId;
  })[];
} {
  return input.occurrences.reduce<{
    readonly state: BattleState;
    readonly occurrences: readonly (BattleAllocatedEffectOccurrence & {
      readonly ownerId: CombatantId;
    })[];
  }>(
    (result, occurrence) => {
      const owner = result.state.combatants.get(occurrence.ownerId);
      if (owner === undefined) {
        throw new Error(
          `Expected effect occurrence owner ${occurrence.ownerId}.`,
        );
      }
      const allocation = allocateBattleEffectOccurrenceTemplatesForCreature({
        owner,
        occurrences: [occurrence],
      });
      const allocated = allocation.occurrences[0];
      if (allocated === undefined) {
        throw new Error("A single occurrence template must allocate once.");
      }
      const state =
        allocated.kind === "activeEffect"
          ? {
              ...result.state,
              combatants: new Map(result.state.combatants).set(
                occurrence.ownerId,
                {
                  ...allocation.owner,
                  activeEffects: [
                    ...allocation.owner.activeEffects,
                    allocated.effect,
                  ],
                },
              ),
            }
          : {
              ...result.state,
              combatants: new Map(result.state.combatants).set(
                occurrence.ownerId,
                allocation.owner,
              ),
              lightEmitters: [...result.state.lightEmitters, allocated.emitter],
            };
      return {
        state,
        occurrences: [
          ...result.occurrences,
          { ...allocated, ownerId: occurrence.ownerId },
        ],
      };
    },
    { state: input.state, occurrences: [] },
  );
}

export function characterSpellInvocationForProcedureRefForTest(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): BattleSelectedSpellInvocation {
  const invocation = battleSelectedSpellInvocationForProcedure(
    session,
    actorId,
    procedureRef,
  );
  const execution =
    invocation === undefined ? undefined : spellProcedureExecution(invocation);
  if (execution === undefined || !("spellRuleFacts" in execution)) {
    throw new Error(`Expected spell procedure ${procedureRef} for ${actorId}.`);
  }
  return bindSelectedSpellInvocation(execution, procedureRef);
}

export function characterSpellInvocationRefForProcedureRefForTest(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): SpellInvocationRef {
  const source = session.context.characters
    .get(actorId)
    ?.spellPresentationSources.find(
      (candidate) => candidate.procedureRef === procedureRef,
    );
  if (
    source === undefined ||
    !("access" in source.invocation) ||
    !("spell" in source.invocation)
  ) {
    throw new Error(
      `Expected spell presentation source ${procedureRef} for ${actorId}.`,
    );
  }
  return supportedSpellInvocationRef(source.invocation);
}

export function characterSpellProcedureRefMatchesSpellForTest(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  spellId: string,
): boolean {
  return (
    characterSpellInvocationRefForProcedureRefForTest(
      session,
      actorId,
      procedureRef,
    ).spellId === spellId
  );
}

export function requireCharacterSpellProcedureRefForTest(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  invocationRef: SpellInvocationRef,
): BattleProcedureExecutionRef {
  const discoveredProcedureRef = discoverBattleActs(session).find((act) => {
    if (act.subject.actorId !== actorId || !("procedureRef" in act.subject)) {
      return false;
    }
    const presentation = battleActSpellPresentation(act);
    return (
      presentation !== undefined &&
      spellInvocationRefsEqualForTest(presentation.invocation, invocationRef)
    );
  })?.subject;
  if (
    discoveredProcedureRef !== undefined &&
    "procedureRef" in discoveredProcedureRef
  ) {
    return discoveredProcedureRef.procedureRef;
  }
  const procedureRef = session.context.characters
    .get(actorId)
    ?.spellPresentationSources.find((source) =>
      supportedSpellInvocationMatchesRef(source.invocation, invocationRef),
    )?.procedureRef;
  if (procedureRef === undefined) {
    throw new Error(
      `Expected selected spell procedure for ${actorId}: ${JSON.stringify(invocationRef)}.`,
    );
  }
  return procedureRef;
}

export function spellInvocationRefsEqualForTest(
  left: SpellInvocationRef,
  right: SpellInvocationRef,
): boolean {
  if (left.spellId !== right.spellId || left.procedure !== right.procedure) {
    return false;
  }
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("tag")({
      cantrip: (invocation) =>
        right.tag === "cantrip" &&
        spellInvocationSourceRefsEqualForTest(invocation.source, right.source),
      spellSlot: (invocation) =>
        right.tag === "spellSlot" &&
        spellInvocationSourceRefsEqualForTest(
          invocation.source,
          right.source,
        ) &&
        invocation.slotLevel === right.slotLevel,
      spellAccessFreeCast: (invocation) =>
        right.tag === "spellAccessFreeCast" &&
        spellInvocationSourceRefsEqualForTest(
          invocation.source,
          right.source,
        ) &&
        invocation.resourcePoolRef === right.resourcePoolRef,
      armorOfShadows: () => right.tag === "armorOfShadows",
      spellEffect: (invocation) =>
        right.tag === "spellEffect" &&
        invocation.sourceCombatantId === right.sourceCombatantId,
    }),
  );
}

function spellInvocationSourceRefsEqualForTest(
  left: Extract<SpellInvocationRef, { readonly tag: "cantrip" }>["source"],
  right: Extract<SpellInvocationRef, { readonly tag: "cantrip" }>["source"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("tag")({
      classSpellcasting: () => right.tag === "classSpellcasting",
      spellAccess: (source) =>
        right.tag === "spellAccess" &&
        source.spellAccessRef === right.spellAccessRef,
    }),
  );
}

function supportedSpellInvocationMatchesRef(
  invocation: AuthoredSelectedSpellInvocation,
  ref: SpellInvocationRef,
): boolean {
  if (!("access" in invocation) || !("spell" in invocation)) {
    return false;
  }
  return spellInvocationRefsEqualForTest(
    supportedSpellInvocationRef(invocation),
    ref,
  );
}

export function requireCharacterUnitProcedureRefForTest(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  unitId: string,
  query: CharacterUnitProcedureQuery = CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
): BattleProcedureExecutionRef {
  const actor = session.state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    throw new Error(`Expected character combatant ${actorId}.`);
  }
  const characterContext = session.context.characters.get(actorId);
  if (characterContext === undefined) {
    throw new Error(`Expected character runtime context for ${actorId}.`);
  }
  const discoveredProcedureRef = discoverBattleActs(session).find(
    (act) =>
      act.subject.actorId === actorId &&
      "procedureRef" in act.subject &&
      battleActUnitPresentation(act)?.unitId === unitId &&
      characterUnitProcedure(
        actor.origin.execution,
        act.subject.procedureRef,
        query,
      ) !== undefined,
  )?.subject;
  if (
    discoveredProcedureRef !== undefined &&
    "procedureRef" in discoveredProcedureRef
  ) {
    return discoveredProcedureRef.procedureRef;
  }
  const procedureRef = characterUnitProcedureRefsForAuthoredSelection(
    characterContext,
    actor,
    parseUnitId(unitId),
    query,
  )[0];
  if (procedureRef === undefined) {
    throw new Error(
      `Expected selected Unit procedure for ${actorId}: ${unitId}.`,
    );
  }
  return procedureRef;
}

export function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  registerStatBlockPresentationsForTest(result.success);
  return result.success.state;
}

export function startBattleSessionRight(
  input: Parameters<typeof startBattle>[0],
): BattleRuntimeSession {
  const result = startBattle(input);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  registerStatBlockPresentationsForTest(result.success);
  return result.success;
}

function parseCharacterBattleClassLevelsRight(
  classLevels: Parameters<typeof parseCharacterBattleClassLevels>[0],
): CharacterBattleClassLevels {
  const result = parseCharacterBattleClassLevels(classLevels);
  if (Result.isFailure(result)) {
    throw new Error(result.failure.messages.join("; "));
  }
  return result.success;
}

export const ROGUE_CUNNING_ACTION_SUPPORT_PROFILE = {
  kind: "alternateActionCost",
  from: {
    kind: "standardAction",
    actions: ["dash", "disengage", "hide"],
  },
  to: { kind: "bonusAction" },
} as const;

export function testBattleCreatureStateWithConditions(
  combatant: BattleState["combatants"] extends ReadonlyMap<
    CombatantId,
    infer Creature
  >
    ? Creature
    : never,
  conditions: ConditionState,
) {
  if (combatant.positiveHpUnconscious !== null) {
    throw new Error("Test fixture must not rewrite Knocked Out conditions.");
  }
  return { ...combatant, conditions, positiveHpUnconscious: null };
}

export function addBattleCombatantRight(
  input: Parameters<typeof addBattleCombatant>[0],
): BattleState {
  const result = addBattleCombatant(input);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

export function removeBattleCombatantsRight(
  input: Parameters<typeof removeBattleCombatants>[0],
): BattleState {
  const result = removeBattleCombatants(input);
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}
export const fighterId = combatantId("fighter");
export const goblinId = combatantId("goblin");
export const skeletonId = combatantId("skeleton");
export const wizardId = combatantId("wizard");
export const secondWizardId = combatantId("second-wizard");
export const secondSkeletonId = combatantId("second-skeleton");
export const distantFighterId = combatantId("distant-fighter");
export const longRangeFighterId = combatantId("long-range-fighter");
type BattleFillableHole = Pick<BattleHole, "kind" | "holeId">;
type DamageRollValue = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>["value"];
type TestCharacterWeaponAttack = CharacterWeaponAttackActionOption;
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

export function requireElapsedHours(hours: number) {
  const parsed = elapsedTimeTicksFromHours(hours);
  if (Result.isFailure(parsed)) {
    throw new Error(`invalid test elapsed hours: ${hours}`);
  }
  return parsed.success;
}

function requireBattleStatBlockCombatantSource(
  statBlock: Parameters<typeof battleStatBlockCombatantSource>[0],
) {
  const source = battleStatBlockCombatantSource(statBlock);
  if (Result.isFailure(source)) {
    throw new Error(battleStateInitIssueMessage(source.failure));
  }
  return source.success;
}

if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime test catalogs must build successfully.");
}

export const unitLibrary = unitCatalogResult.catalog;
export const statBlockCatalog = statBlockCatalogResult.catalog;
const testSpellRecords = new Map(
  [
    magicMissileInput,
    mageArmorInput,
    rayOfFrostInput,
    acidSplashInput,
    chillTouchInput,
    eldritchBlastInput,
    poisonSprayInput,
    sacredFlameInput,
    inflictWoundsInput,
    shockingGraspInput,
    guidingBoltInput,
    rayOfSicknessInput,
    fireBoltInput,
    starryWispInput,
    viciousMockeryInput,
    burningHandsInput,
    chainLightningInput,
    colorSprayInput,
    iceKnifeInput,
    greaseInput,
    fogCloudInput,
    huntersMarkInput,
    hexInput,
    healingWordInput,
    spareTheDyingInput,
  ]
    .map((input) => decodeUnitRecordSync(input))
    .flatMap((unit) =>
      unit.kind === "spell"
        ? [[unit.id, unit] satisfies [string, SpellRecord]]
        : [],
    ),
);
const spawnedCompanionLifecycleSpellRecord = decodeUnitRecordSync(
  spawnedCompanionInput,
);
if (spawnedCompanionLifecycleSpellRecord.kind !== "spell") {
  throw new Error("Find Familiar test input must decode to a spell record.");
}
testSpellRecords.set(
  spawnedCompanionLifecycleSpellRecord.id,
  spawnedCompanionLifecycleSpellRecord,
);

export function requireResolved(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    const detail = "message" in result ? `: ${result.message}` : "";
    throw new Error(
      `Expected resolved battle result, got ${result.tag}${detail}.`,
    );
  }

  return result;
}

export function requireBardicInspirationD20TestResolved(
  result: ReturnType<typeof resolveBardicInspirationFailedD20Test>,
): Extract<
  ReturnType<typeof resolveBardicInspirationFailedD20Test>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }

  return result;
}

export function requireNeedsHoles(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles battle result, got ${result.tag}.`);
  }

  return result;
}

export function subjectName(subject: BattleSubject) {
  if (subject.tag === "action") {
    return subject.action;
  }
  if (subject.tag === "companionAttack") {
    return subject.tag;
  }
  if (subject.tag === "bonusAction") {
    return subject.action;
  }
  if (subject.tag === "bonusActionStandardAction") {
    return subject.action;
  }
  if (
    subject.tag === "monkFocusOption" ||
    subject.tag === "monkFocusFlurryOfBlowsStrike"
  ) {
    return subject.tag;
  }
  if (subject.tag === "actionSpell") {
    return "actionSpell";
  }
  if (subject.tag === "bonusActionSpell") {
    return "bonusActionSpell";
  }
  if (subject.tag === "bonusActionDashSpell") {
    return "bonusActionDashSpell";
  }
  if (subject.tag === "unitFeature") {
    return "unitFeature";
  }
  if (subject.tag === "unitFeatureHeldWeaponActivation") {
    return "unitFeatureHeldWeaponActivation";
  }
  if (subject.tag === "druidWildShape") {
    return "druidWildShape";
  }
  if (subject.tag === "companionLifecycle") {
    return "companionLifecycle";
  }
  if (subject.tag === "spawnedCompanionSharedSenses") {
    return "spawnedCompanionSharedSenses";
  }
  if (subject.tag === "spawnedCompanionTouchSpellProxy") {
    return "spawnedCompanionTouchSpellProxy";
  }
  return subject.command;
}

export function hidePrerequisites(
  entries: readonly (readonly [CombatantId, BattleHidePrerequisite])[],
): ReadonlyMap<CombatantId, BattleHidePrerequisite> {
  return new Map(entries);
}

export function fighterVsGoblinBattle(input?: {
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly weaponMasteries?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["weaponMasteries"];
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-attack"),
    combatants: [
      characterSeed({
        initiative: 20,
        ...(input?.characterUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.characterUnitRefs }),
        ...(input?.weaponMasteries === undefined
          ? {}
          : { weaponMasteries: input.weaponMasteries }),
        ...(input?.attack === undefined ? {} : { attack: input.attack }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    ...(input?.hidePrerequisites === undefined
      ? {}
      : { hidePrerequisites: input.hidePrerequisites }),
  });
}

export function criticalRange19UnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unit: unitLibrary.requireUnit("fighter_improved_critical"),
      supportProfiles: [WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE],
    },
  ];
}

export function sneakAttackUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unit: unitLibrary.requireUnit("rogue_sneak_attack"),
      supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
    },
  ];
}

export function cunningStrikeUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  const unit = rogueCunningStrikeUnit();
  const support = battleCunningStrikeSupportForUnit(unit);
  if (support === null) {
    throw new Error("Expected Cunning Strike support profile.");
  }
  return [
    ...sneakAttackUnitRefs(),
    {
      unit: unitLibrary.requireUnit(unit.id),
      supportProfiles: [support],
    },
  ];
}

export function masterySapUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unit: unitLibrary.requireUnit("mastery_sap"),
      supportProfiles: [WEAPON_MASTERY_SAP_SUPPORT_PROFILE],
    },
  ];
}

export function masteryToppleUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unit: unitLibrary.requireUnit("mastery_topple"),
      supportProfiles: [WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE],
    },
  ];
}

export function masteryCleaveUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unit: unitLibrary.requireUnit("mastery_cleave"),
      supportProfiles: [WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE],
    },
  ];
}

export function tacticalMasterReplacementUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unit: unitLibrary.requireUnit("fighter_tactical_master"),
      supportProfiles: [
        {
          kind: TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
          replacementProperties: TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES,
        },
      ],
    },
    {
      unit: unitLibrary.requireUnit("mastery_push"),
      supportProfiles: [WEAPON_MASTERY_PUSH_SUPPORT_PROFILE],
    },
    {
      unit: unitLibrary.requireUnit("mastery_sap"),
      supportProfiles: [WEAPON_MASTERY_SAP_SUPPORT_PROFILE],
    },
    {
      unit: unitLibrary.requireUnit("mastery_slow"),
      supportProfiles: [WEAPON_MASTERY_SLOW_SUPPORT_PROFILE],
    },
  ];
}

export function grapplerUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  const grapplerUnit = unitLibrary.requireUnit("feat_grappler");
  const supportProfiles = battleUnitSupportProfilesForUnit({
    unit: grapplerUnit,
  });
  if (Result.isFailure(supportProfiles)) {
    throw new Error(supportProfiles.failure.message);
  }
  return [
    {
      unit: unitLibrary.requireUnit("feat_grappler"),
      supportProfiles: supportProfiles.success,
    },
  ];
}

export function halflingNimblenessUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  const unit = unitLibrary.requireUnit("species_halfling_nimbleness");
  const supportProfiles = battleUnitSupportProfilesForUnit({
    unit,
  });
  if (Result.isFailure(supportProfiles)) {
    throw new Error(supportProfiles.failure.message);
  }
  return [
    {
      unit: unitLibrary.requireUnit("species_halfling_nimbleness"),
      supportProfiles: supportProfiles.success,
    },
  ];
}

export function longswordWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: parseUnitId("weapon_longsword"),
    },
  ];
}

export function greataxeWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: parseUnitId("weapon_greataxe"),
    },
  ];
}

export function longbowWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: parseUnitId("weapon_longbow"),
    },
  ];
}

export function quarterstaffWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: parseUnitId("weapon_quarterstaff"),
    },
  ];
}

export function fighterGrapplesGoblin(
  state: BattleState,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const subject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "grapple",
  };
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "grappleOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId), grappleOutcomeFill(outcome, false)],
    }),
  );
}

export function fighterTurnWithReadiedRay(
  trigger: BattleReadiedSpellTrigger,
): BattleState {
  const session = startBattleSessionRight({
    battleId: battleId(`battle-readied-${trigger}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 30,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const wizardReady = resolveReadySpellForTest({
    state: session.state,
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    ),
    trigger,
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
  }
  if (wizardReady.state.readiedSpells.get(wizardId) === undefined) {
    throw new Error("Expected Wizard to hold a readied spell.");
  }
  const fighterTurn = endTurn({ state: wizardReady.state, actorId: wizardId });
  if (fighterTurn.tag !== "resolved") {
    throw new Error(`Expected resolved End Turn, got ${fighterTurn.tag}.`);
  }
  return fighterTurn.state;
}

export function fighterTurnWithReadiedRayAndHealer(
  trigger: BattleReadiedSpellTrigger,
): BattleRuntimeSession {
  const session = startBattleSessionRight({
    battleId: battleId(`battle-readied-${trigger}-healing-word`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 30,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
      characterSeed({
        initiative: 20,
        currentHp: 4,
        attack: null,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("healing_word")],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const wizardReady = resolveReadySpellForTest({
    state: session.state,
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    ),
    trigger,
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
  }
  const fighterTurn = endTurn({ state: wizardReady.state, actorId: wizardId });
  if (fighterTurn.tag !== "resolved") {
    throw new Error(`Expected resolved End Turn, got ${fighterTurn.tag}.`);
  }
  return battleRuntimeSessionForTest({
    state: fighterTurn.state,
    context: session.context,
  });
}

export function fighterTurnWithReadiedAcidAndSecondReadiedRay(): BattleState {
  const session = startBattleSessionRight({
    battleId: battleId("battle-nested-readied-reactions"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 40,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
      characterSeed({
        combatantId: secondWizardId,
        displayName: "Second Wizard",
        initiative: 30,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const firstReady = requireResolved(
    resolveReadySpellForTest({
      state: session.state,
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
      ),
      trigger: "attackHit",
    }),
  ).state;
  const secondWizardTurn = requireResolved(
    endTurn({ state: firstReady, actorId: wizardId }),
  ).state;
  const secondReady = requireResolved(
    resolveReadySpellForTest({
      state: secondWizardTurn,
      actorId: secondWizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        battleRuntimeSessionForTest({ ...session, state: secondWizardTurn }),
        secondWizardId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      trigger: "saveFailed",
    }),
  ).state;
  return requireResolved(
    endTurn({ state: secondReady, actorId: secondWizardId }),
  ).state;
}

export function wizardTurnWithReadiedRay(
  trigger: BattleReadiedSpellTrigger,
): BattleRuntimeSession {
  const session = wizardVsSkeletonBattle();
  const base = session.state;
  const wizardReady = resolveReadySpellForTest({
    state: base,
    actorId: wizardId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    ),
    trigger,
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
  }
  const readied = wizardReady.state.readiedSpells.get(wizardId);
  const concentratingWizard = wizardReady.state.combatants.get(wizardId);
  if (readied === undefined || concentratingWizard === undefined) {
    throw new Error("Expected Wizard to hold a readied spell.");
  }
  return battleRuntimeSessionForTest({
    state: {
      ...base,
      combatants: new Map(base.combatants).set(wizardId, concentratingWizard),
      readiedSpells: new Map([[wizardId, readied]]),
    },
    context: session.context,
  });
}

export function goblinTurnBattle(
  input: { readonly fighterHp?: number } = {},
): BattleState {
  const afterFighter = endTurn({
    state: startBattleRight({
      battleId: battleId("battle-goblin-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          ...(input.fighterHp === undefined
            ? {}
            : { currentHp: input.fighterHp }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
    actorId: fighterId,
  });
  if (afterFighter.tag !== "resolved") {
    throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
  }

  return afterFighter.state;
}

export function fighterAttackSubject(
  state: BattleState,
  attackName: string = "Longsword",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return characterAttackSubjectForTest(state, fighterId, attackName);
}

export function characterAttackSubjectForTest(
  state: BattleState,
  actorId: CombatantId,
  attackName: string,
): {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "attack";
  readonly procedureRef: BattleAttackProcedureExecutionRef;
  readonly attackAbility: import("./battle-action-options.ts").BattleAttackExecutionAbility;
  readonly attackDamageType: DamageType;
} {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error(`Expected character combatant ${actorId}.`);
  }
  const attack = [actor.origin.attack, actor.origin.unarmedStrike].find(
    (candidate) => {
      if (candidate === null) return false;
      if (candidate.kind === "unarmedStrike") {
        return attackActionOptionName(candidate) === attackName;
      }
      const unit = unitLibrary
        .listUnits()
        .find((entry) => entry.id === candidate.weapon.weaponUnitId);
      return (
        unit?.name === attackName ||
        candidate.weapon.weaponUnitId ===
          `weapon_${attackName.toLowerCase().replaceAll(" ", "_")}`
      );
    },
  );
  if (attack === null || attack === undefined) {
    throw new Error(`Expected discovered ${attackName} attack for ${actorId}.`);
  }
  return {
    tag: "action",
    actorId,
    action: "attack",
    procedureRef: attack.procedureRef,
    attackAbility:
      attack.kind === "weapon" ? attack.ability : attack.attackAbility,
    attackDamageType:
      attack.kind === "weapon"
        ? attack.weapon.damage.damageType
        : attack.effect.damage.damageType,
  };
}

export function attackExecutionSelectionForSubjectForTest(
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): BattleInterruptAttackExecutionSelection {
  if (subject.procedureRef === undefined) {
    throw new Error("Expected attack procedure execution reference.");
  }
  return subject.attackAbility === undefined ||
    subject.attackDamageType === undefined
    ? subject.statBlockDamageNotation === "static"
      ? {
          procedureRef: subject.procedureRef,
          statBlockDamageNotation: "static",
        }
      : { procedureRef: subject.procedureRef }
    : {
        procedureRef: subject.procedureRef,
        attackAbility: subject.attackAbility,
        attackDamageType: subject.attackDamageType,
      };
}

export function characterBonusAttackSubjectForTest(
  state: BattleState,
  actorId: CombatantId,
  action: "offHandAttack" | "martialArtsUnarmedStrike",
  attackAbility?: import("./battle-action-options.ts").BattleAttackExecutionAbility,
): Extract<
  BattleSubject,
  {
    readonly tag: "bonusAction";
    readonly action: "offHandAttack" | "martialArtsUnarmedStrike";
  }
> {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error(`Expected character combatant ${actorId}.`);
  }
  const attack =
    action === "offHandAttack"
      ? actor.origin.offHandAttack
      : actor.origin.unarmedStrike;
  if (attack === undefined) {
    throw new Error(`Expected admitted ${action} for ${actorId}.`);
  }
  return {
    tag: "bonusAction",
    actorId,
    action,
    procedureRef: attack.procedureRef,
    attackAbility:
      attackAbility ??
      (attack.kind === "weapon" ? attack.ability : attack.attackAbility),
    attackDamageType:
      attack.kind === "weapon"
        ? attack.weapon.damage.damageType
        : attack.effect.damage.damageType,
  };
}

export function goblinAttackSubject(
  state: BattleState,
  attackName: "Scimitar" | "Shortbow",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return statBlockAttackSubjectForTest(state, goblinId, attackName, "actions");
}

export function monsterAttackSubject(
  state: BattleState,
  attackName: "Cinder Breath" | "Dread Gaze" | "Tail Swipe",
  statBlockSection: "actions" | "legendaryActions" = "actions",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return statBlockAttackSubjectForTest(
    state,
    goblinId,
    attackName,
    statBlockSection,
  );
}

export function statBlockAttackSubjectForTest(
  state: BattleState,
  actorId: CombatantId,
  attackName: string,
  section: "actions" | "legendaryActions",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected Stat Block test actor.");
  }
  const procedureRef = statBlockProcedurePresentationsForStateForTest(
    state,
    actorId,
  ).find(
    (candidate) => candidate.kind === "attack" && candidate.name === attackName,
  )?.procedureRef;
  const option = statBlockAttackActionOptions(actor.origin.execution).find(
    (candidate) =>
      candidate.procedureRef === procedureRef &&
      statBlockAttackProcedureSection(
        state,
        actorId,
        candidate.procedureRef,
      ) === section &&
      candidate.damageNotation === "rolled",
  );
  if (option === undefined) throw new Error(`Expected ${attackName} attack.`);
  return {
    tag: "action",
    actorId,
    action: "attack",
    procedureRef: option.procedureRef,
  };
}

export function attackInitialTargetHole(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  > = fighterAttackSubject(state),
): BattleHole {
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [],
    }),
    "targetChoice",
  );
}

export function attackRollHoleAfterTarget(
  state: BattleState,
  targetHole: BattleHole,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  > = fighterAttackSubject(state),
  targetId: CombatantId = targetHole.kind === "targetChoice"
    ? (targetHole.choices[0] ?? goblinId)
    : goblinId,
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [attackTargetFill(targetHole, subject.actorId, targetId)],
    }),
    "attackRoll",
  );
}

export function attackDamageHoleAfterHit(
  state: BattleState,
  targetHole: BattleHole,
  rollHole: BattleHole,
  attackRoll: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: AttackRollMode;
  } = {
    total: 15,
    naturalD20: 10,
  },
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  > = fighterAttackSubject(state),
  targetId: CombatantId = targetHole.kind === "targetChoice"
    ? (targetHole.choices[0] ?? goblinId)
    : goblinId,
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  const target = state.combatants.get(targetId);
  const attackRollWithExpectedProneMode =
    attackRoll.rollMode === undefined &&
    target !== undefined &&
    hasCondition(target.conditions, "prone")
      ? { ...attackRoll, rollMode: "advantage" as const }
      : attackRoll;
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(targetHole, subject.actorId, targetId),
        attackRollFill(rollHole, attackRollWithExpectedProneMode),
      ],
    }),
    "rolledDice",
  );
}

export function criticalAttackDamageResult(
  state: BattleState,
  targetId: CombatantId,
): ReturnType<typeof resolveBattleSubject> {
  const targetHole = attackInitialTargetHole(state);
  const rollHole = attackRollHoleAfterTarget(state, targetHole);
  const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
    total: 20,
    naturalD20: 20,
  });
  const target = state.combatants.get(targetId);
  const rollMode =
    target !== undefined && hasCondition(target.conditions, "prone")
      ? ("advantage" as const)
      : undefined;

  return resolveBattleSubject({
    state,
    subject: fighterAttackSubject(state, "Longsword"),
    fills: [
      targetFill(targetHole, targetId),
      attackRollFill(rollHole, {
        total: 20,
        naturalD20: 20,
        ...(rollMode === undefined ? {} : { rollMode }),
      }),
      damageRollFillWithGroups(damageHole, [[4, 4]]),
    ],
  });
}

export function resolveLongswordHit(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject> = fighterAttackSubject(
    state,
  ),
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  return resolveWeaponHit(state, subject);
}

function resolveWeaponHit(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
    total: 15,
    naturalD20: 10,
  });
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 1),
      ],
    }),
  );
}

export function resolveLongswordMiss(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject> = fighterAttackSubject(
    state,
  ),
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 1 }),
      ],
    }),
  );
}

export function characterWithDeathSaveCounters(input: {
  readonly combatantId: CombatantId;
  readonly successes: 0 | 1 | 2;
  readonly failures: 0 | 1 | 2;
}): BattleState {
  const state = startBattleRight({
    battleId: battleId("battle-character-start-turn-death-save-counters"),
    combatants: [
      characterSeed({ initiative: 20 }),
      characterSeed({
        combatantId: input.combatantId,
        displayName: "Target Fighter",
        initiative: 10,
        currentHp: 0,
        attack: null,
      }),
    ],
  });
  const combatant = state.combatants.get(input.combatantId);
  if (
    combatant === undefined ||
    combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
  ) {
    throw new Error("Expected target character with death-save lifecycle.");
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(input.combatantId, {
      ...combatant,
      zeroHpLifecycle: {
        ...combatant.zeroHpLifecycle,
        deathSaves: {
          deathSaves: {
            successes: input.successes,
            failures: input.failures,
          },
          stable: false,
          dead: false,
          hpRegained: false,
        },
      },
    }),
  };
}

function battleHoleHasKind<Kind extends BattleHole["kind"]>(kind: Kind) {
  return (
    hole: BattleHole,
  ): hole is Extract<BattleHole, { readonly kind: Kind }> => hole.kind === kind;
}

export function requireHole<Kind extends BattleHole["kind"]>(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected needsHoles, got ${result.tag}${
        result.tag === "invalid" ? `: ${result.message}` : ""
      }.`,
    );
  }
  const hole = result.holes.find(battleHoleHasKind(kind));
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

export function findHole<Kind extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  const hole = holes.find(battleHoleHasKind(kind));
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function isSpellProcedureSelectorForTest(
  selector: BattleActSelectorForTest,
): selector is SpellProcedureSelectorForTest {
  return (
    "invocation" in selector &&
    (selector.tag === "actionSpell" ||
      selector.tag === "bonusActionSpell" ||
      selector.tag === "bonusActionDashSpell" ||
      selector.tag === "spawnedCompanionTouchSpellProxy")
  );
}

function spellProcedureSubjectForTest(
  selection: SpellProcedureSelectorForTest,
  procedureRef: BattleProcedureExecutionRef,
): BattleSubject {
  return Match.value(selection).pipe(
    Match.discriminatorsExhaustive("tag")({
      actionSpell: (value) => ({
        tag: value.tag,
        actorId: value.actorId,
        procedureRef,
        mode: value.mode,
        ...(value.metamagic === undefined
          ? {}
          : { metamagic: value.metamagic }),
      }),
      bonusActionSpell: (value) => ({
        tag: value.tag,
        actorId: value.actorId,
        procedureRef,
        mode: value.mode,
        ...(value.metamagic === undefined
          ? {}
          : { metamagic: value.metamagic }),
      }),
      bonusActionDashSpell: (value) => ({
        tag: value.tag,
        actorId: value.actorId,
        procedureRef,
        mode: value.mode,
        speedKind: value.speedKind,
      }),
      spawnedCompanionTouchSpellProxy: (value) => ({
        tag: value.tag,
        actorId: value.actorId,
        procedureRef,
        companionId: value.companionId,
        spellAction: value.spellAction,
        mode: value.mode,
        ...(value.metamagic === undefined
          ? {}
          : { metamagic: value.metamagic }),
      }),
    }),
  );
}

function isBattleSubjectSelectorForTest(
  selector: BattleActSelectorForTest,
): selector is BattleSubject {
  return Schema.is(BattleSubjectSchema)(selector);
}

function selectedSpellProcedureSubjectForTest(
  session: BattleRuntimeSession,
  selection: SpellProcedureSelectorForTest,
): BattleSubject | undefined {
  if (selection.procedureRef !== undefined) {
    return spellProcedureSubjectForTest(selection, selection.procedureRef);
  }
  const selectedSpellAct = discoverBattleActs(session).find((candidate) => {
    const presentation = battleActSpellPresentation(candidate);
    return (
      candidate.subject.actorId === selection.actorId &&
      candidate.subject.tag === selection.tag &&
      candidate.subject.mode.tag === selection.mode.tag &&
      presentation !== undefined &&
      presentation.invocation.tag === selection.invocation.tag &&
      presentation.invocation.spellId === selection.invocation.spellId &&
      presentation.invocation.procedure === selection.invocation.procedure &&
      (presentation.invocation.tag !== "spellSlot" ||
        (selection.invocation.tag === "spellSlot" &&
          presentation.invocation.slotLevel === selection.invocation.slotLevel))
    );
  });
  const procedureRef =
    selectedSpellAct === undefined
      ? session.context.characters
          .get(selection.actorId)
          ?.spellPresentationSources.find((source) =>
            supportedSpellInvocationMatchesRef(
              source.invocation,
              selection.invocation,
            ),
          )?.procedureRef
      : battleActSpellPresentation(selectedSpellAct)?.procedureRef;
  if (procedureRef === undefined) return undefined;
  return spellProcedureSubjectForTest(selection, procedureRef);
}

function selectionMatchesDiscoveredActForTest(
  selection: BattleActSelectorForTest,
  act: ReturnType<typeof discoverBattleActs>[number],
): boolean {
  if (
    act.subject.actorId !== selection.actorId ||
    act.subject.tag !== selection.tag
  ) {
    return false;
  }
  if (
    selection.tag === "bonusActionStandardAction" &&
    act.subject.tag === "bonusActionStandardAction" &&
    (selection.action !== act.subject.action ||
      (selection.action === "dash" &&
        act.subject.action === "dash" &&
        selection.speedKind !== act.subject.speedKind))
  ) {
    return false;
  }
  if (
    selection.tag === "unitFeatureHeldWeaponActivation" &&
    act.subject.tag === "unitFeatureHeldWeaponActivation" &&
    selection.weaponItemId !== act.subject.weaponItemId
  ) {
    return false;
  }
  if (
    selection.tag === "druidWildShape" &&
    act.subject.tag === "druidWildShape" &&
    selection.action !== act.subject.action
  ) {
    return false;
  }
  if (
    selection.tag === "monkFocusOption" &&
    act.subject.tag === "monkFocusOption" &&
    (selection.option !== act.subject.option ||
      (selection.option === "patientDefense" &&
        act.subject.option === "patientDefense" &&
        selection.mode !== act.subject.mode) ||
      (selection.option === "stepOfTheWind" &&
        act.subject.option === "stepOfTheWind" &&
        (selection.mode !== act.subject.mode ||
          selection.speedKind !== act.subject.speedKind)))
  ) {
    return false;
  }
  if ("unitId" in selection) {
    const presentation =
      selection.tag === "druidWildShape" && selection.action === "assumeForm"
        ? battleActDruidWildShapePresentation(act)
        : battleActUnitPresentation(act);
    return (
      presentation?.unitId === selection.unitId &&
      (!("formStatBlockId" in selection) ||
        (presentation?.kind === "druidWildShapeForm" &&
          presentation.formStatBlockId === selection.formStatBlockId))
    );
  }
  if ("sourceUnitId" in selection) {
    return battleActUnitPresentation(act)?.unitId === selection.sourceUnitId;
  }
  if ("resourceUnitId" in selection) {
    return battleActUnitPresentation(act)?.unitId === selection.resourceUnitId;
  }
  if ("sourceProcedureRef" in selection) {
    return (
      act.subject.tag === "bonusActionStandardAction" &&
      act.subject.procedureRef === selection.sourceProcedureRef &&
      act.subject.sourceEffectRef === selection.sourceEffectRef
    );
  }
  return (
    isBattleSubjectSelectorForTest(selection) &&
    sameBattleSubject(act.subject, selection)
  );
}

function selectedBattleSubjectForTest(
  session: BattleRuntimeSession,
  selection: BattleActSelectorForTest,
): BattleSubject | undefined {
  if (isSpellProcedureSelectorForTest(selection)) {
    return selectedSpellProcedureSubjectForTest(session, selection);
  }
  if (isBattleSubjectSelectorForTest(selection)) {
    return selection;
  }
  return discoverBattleActs(session).find((act) =>
    selectionMatchesDiscoveredActForTest(selection, act),
  )?.subject;
}

export function findAct(
  state: BattleState,
  selector: BattleSubject,
): ReturnType<typeof discoverBattleActCandidates>[number];
export function findAct(
  session: BattleRuntimeSession,
  selector: BattleActSelectorForTest,
): ReturnType<typeof discoverBattleActs>[number];
export function findAct(
  source: BattleState | BattleRuntimeSession,
  selector: BattleActSelectorForTest,
):
  | ReturnType<typeof discoverBattleActCandidates>[number]
  | ReturnType<typeof discoverBattleActs>[number] {
  if (!("state" in source)) {
    if (!isBattleSubjectSelectorForTest(selector)) {
      throw new Error(
        `Authored act selector requires a battle runtime session: ${JSON.stringify(selector)}.`,
      );
    }
    const act = discoverBattleActCandidates(source).find((candidate) =>
      sameBattleSubject(candidate.subject, selector),
    );
    if (act === undefined) {
      throw new Error(`Expected discovered act ${JSON.stringify(selector)}.`);
    }
    return act;
  }
  const session = source;
  const subject = selectedBattleSubjectForTest(session, selector);
  if (subject === undefined)
    throw new Error(`Expected selected act ${JSON.stringify(selector)}.`);
  const act = discoverBattleActs(session).find((candidate) => {
    return sameBattleSubject(candidate.subject, subject);
  });
  if (act === undefined) {
    throw new Error(`Expected discovered act ${JSON.stringify(selector)}.`);
  }
  return act;
}

type AuthoredBattleActSelectorForTest = Exclude<
  BattleActSelectorForTest,
  BattleSubject
>;
type BattleResolutionInputForTest = Parameters<
  typeof resolveBattleSubjectRuntime
>[0] & { readonly statBlockCatalog?: typeof statBlockCatalog };

function resolveBattleSubject(
  input: BattleResolutionInputForTest,
): ReturnType<typeof resolveBattleSubjectRuntime>;
function resolveBattleSubject(
  input: Omit<
    Parameters<typeof resolveBattleSubjectRuntime>[0],
    "state" | "subject"
  > & {
    readonly session: BattleRuntimeSession;
    readonly subject: AuthoredBattleActSelectorForTest;
    readonly statBlockCatalog?: typeof statBlockCatalog;
  },
): ReturnType<typeof resolveBattleSubjectRuntime>;
function resolveBattleSubject(
  input:
    | BattleResolutionInputForTest
    | (Omit<
        Parameters<typeof resolveBattleSubjectRuntime>[0],
        "state" | "subject"
      > & {
        readonly session: BattleRuntimeSession;
        readonly subject: AuthoredBattleActSelectorForTest;
        readonly statBlockCatalog?: typeof statBlockCatalog;
      }),
): ReturnType<typeof resolveBattleSubjectRuntime> {
  if ("state" in input) {
    const { statBlockCatalog: catalog, ...mechanicalInput } = input;
    return resolveBattleSubjectWithOptionalFamiliarAdmission(
      mechanicalInput,
      catalog,
    );
  }
  const subject = selectedBattleSubjectForTest(input.session, input.subject);
  if (subject === undefined) {
    throw new Error(
      `Expected character procedure selection to be admitted: ${JSON.stringify(input.subject)}.`,
    );
  }
  const fills =
    "procedureRef" in subject &&
    (subject.tag === "actionSpell" ||
      subject.tag === "bonusActionSpell" ||
      subject.tag === "bonusActionDashSpell" ||
      subject.tag === "spawnedCompanionTouchSpellProxy")
      ? bindSelectedSpellSpatialFactsForTest(input.fills, subject.procedureRef)
      : input.fills;
  return resolveBattleSubjectWithOptionalFamiliarAdmission(
    { state: input.session.state, subject, fills },
    input.statBlockCatalog,
  );
}

function resolveBattleSubjectWithOptionalFamiliarAdmission(
  input: Parameters<typeof resolveBattleSubjectRuntime>[0],
  catalog: typeof statBlockCatalog | undefined,
): ReturnType<typeof resolveBattleSubjectRuntime> {
  if (
    input.subject.tag !== "companionLifecycle" ||
    input.subject.action !== "reappear" ||
    catalog === undefined
  ) {
    return resolveBattleSubjectRuntime(input);
  }
  const admission = admitSpawnedCompanionReappearance({
    state: input.state,
    casterId: input.subject.actorId,
    catalog,
  });
  if (Result.isSuccess(admission)) {
    statBlockPresentationsByExecutionScopeForTest.set(
      String(
        admission.success.mechanics.combatantAdmission.origin.execution
          .scopeRef,
      ),
      admission.success.presentation,
    );
  }
  return Result.isFailure(admission)
    ? resolveBattleSubjectRuntime(input)
    : resolveAdmittedCompanionReappearanceSubject({
        fills: input.fills,
        admission: admission.success.mechanics,
      });
}

export function resolveBattleSubjectUncheckedForTest(
  input: Parameters<typeof resolveBattleSubjectRuntime>[0],
): ReturnType<typeof resolveBattleSubjectRuntime> {
  return resolveBattleSubjectRuntime(input);
}

export function assertBattleSnapshotCodecRoundTripForTest(
  snapshot: Schema.Schema.Type<typeof BattleSnapshotSchema>,
): void {
  Schema.decodeUnknownSync(BattleSnapshotSchema)(
    Schema.encodeSync(BattleSnapshotSchema)(snapshot),
  );
}

export function assertBattleCheckpointFrontierEnvelopeCodecAcceptsHolesForSubjectForTest(input: {
  readonly snapshot: Schema.Schema.Type<typeof BattleSnapshotSchema>;
  readonly subject: BattleSubject;
  readonly holes: readonly BattleHole[];
}): void {
  const firstHole = input.holes[0];
  const frontier =
    firstHole === undefined
      ? { kind: "acts" as const, acts: [] }
      : {
          kind: "holes" as const,
          subject: input.subject,
          holes: [firstHole, ...input.holes.slice(1)] as [
            BattleHole,
            ...BattleHole[],
          ],
          continuation: { kind: "ordinaryReplay" as const },
        };
  Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)({
    checkpoint: Schema.encodeSync(BattleSnapshotSchema)(input.snapshot),
    frontier,
  });
}

/** Read interrupt choices through the runtime-owned frontier for a mechanical result. */
export function battleFrontierInterruptDecisionFromResolution(
  result: ReturnType<typeof resolveBattleSubjectRuntime>,
): ReturnType<typeof battleFrontierInterruptDecision> {
  if (result.tag === "invalid") {
    return null;
  }
  return battleFrontierInterruptDecisionForState(result.state);
}

function bindSelectedSpellSpatialFactsForTest(
  fills: readonly BattleFill[],
  procedureRef: BattleProcedureExecutionRef,
): readonly BattleFill[] {
  return fills.map((fill) => {
    if (fill.kind === "targetChoice") {
      if (fill.spatialFacts === undefined) return fill;
      return {
        ...fill,
        spatialFacts: fill.spatialFacts.map((fact) =>
          fact.kind === "spellTarget" ||
          fact.kind === "spellLeapTargetWithinRange"
            ? { ...fact, sourceProcedureRef: procedureRef }
            : fact,
        ),
      };
    }
    if (fill.kind === "objectTargetChoice") {
      return {
        ...fill,
        spatialFacts: fill.spatialFacts.map((fact) =>
          fact.kind === "spellObjectTarget"
            ? { ...fact, sourceProcedureRef: procedureRef }
            : fact,
        ),
      };
    }
    if (fill.kind === "spellTargetAllocation") {
      return {
        ...fill,
        spatialFacts: fill.spatialFacts.map((fact) =>
          fact.kind === "spellTarget"
            ? { ...fact, sourceProcedureRef: procedureRef }
            : fact,
        ),
      };
    }
    return fill;
  });
}

export function battleSubjectSelection(subject: BattleSubject) {
  if (!("procedureRef" in subject)) return subject;
  const { procedureRef: _procedureRef, ...selection } = subject;
  return selection;
}

type SleepShakeAwakeSubject = Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "shakeAwakeFromStagedCondition" }
>;

export function sleepShakeAwakeSubject(): SleepShakeAwakeSubject {
  return {
    tag: "action",
    actorId: fighterId,
    action: "shakeAwakeFromStagedCondition",
  };
}

export function sleepShakeAwakeTargetFill(hole: BattleHole): BattleFill {
  return targetFill(hole, goblinId, [
    {
      kind: "stagedConditionShakeAwakeActorWithin5Feet",
      actorId: fighterId,
      targetId: goblinId,
    },
  ]);
}

export function battleAfterFailedSleepInitialSave(input: {
  readonly battle: string;
  readonly helperInitiative?: number;
  readonly targetConditions?: Parameters<typeof characterSeed>[0]["conditions"];
}): BattleState {
  const session = startBattleSessionRight({
    battleId: battleId(input.battle),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord("sleep")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Helper",
        initiative: input.helperInitiative ?? 15,
      }),
      characterSeed({
        combatantId: goblinId,
        displayName: "Target",
        initiative: 10,
        ...(input.targetConditions === undefined
          ? {}
          : { conditions: input.targetConditions }),
      }),
    ],
  });
  const savingThrows = requireHole(
    resolveBattleSubject({
      session,
      subject: magicSubject("sleep"),
      fills: [],
    }),
    "savingThrowOutcome",
  );
  const slept = requireResolved(
    resolveBattleSubject({
      session,
      subject: magicSubject("sleep"),
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    }),
  ).state;
  return requireResolved(endTurn({ state: slept, actorId: wizardId })).state;
}

export function battleAfterGoblinFailedSleepRepeatSave(input: {
  readonly battle: string;
  readonly helperInitiative: number;
  readonly targetConditions?: Parameters<typeof characterSeed>[0]["conditions"];
}): BattleState {
  const goblinTurn = battleAfterFailedSleepInitialSave(input);
  const repeatSave = requireHole(
    endTurn({ state: goblinTurn, actorId: goblinId }),
    "savingThrowOutcome",
  );
  return requireResolved(
    endTurn({
      state: goblinTurn,
      actorId: goblinId,
      fills: [
        savingThrowOutcomeFill(repeatSave, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    }),
  ).state;
}

export function shakeAwakeGoblinFromSleep(state: BattleState): BattleState {
  const subject = sleepShakeAwakeSubject();
  const target = findAct(state, subject).initialHoles[0]!;
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [sleepShakeAwakeTargetFill(target)],
    }),
  ).state;
}

export function targetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
  spatialFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"],
  relationshipFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["relationshipFacts"],
): Extract<BattleFill, { readonly kind: "targetChoice" }>;
export function targetFill(
  hole: BattleHole,
  targetId: CombatantId,
  spatialFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"],
  relationshipFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["relationshipFacts"],
): BattleFill;
export function targetFill(
  hole: BattleHole,
  targetId: CombatantId,
  spatialFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"],
  relationshipFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["relationshipFacts"],
): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  const defaultRelationshipFacts =
    hole.relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? ([
          {
            kind: "attackRollTargetIsEnemy",
            attackerId: hole.relationshipFactRequest.attackerId,
            targetId,
            targetIsEnemy: true,
          },
        ] as const)
      : hole.relationshipFactRequest?.kind === "savingThrowTargetIsEnemy"
        ? ([
            {
              kind: "savingThrowTargetIsEnemy",
              actorId: hole.relationshipFactRequest.actorId,
              targetId,
              targetIsEnemy: true,
            },
          ] as const)
        : undefined;
  const defaultSpatialFacts =
    hole.requiresTableSpatialFact === true
      ? [
          ...(hole.attack === undefined
            ? []
            : [
                attackTargetDistanceSpatialFact(
                  hole.attack.actorId,
                  targetId,
                  hole.attack.selection,
                  movementFeet(5),
                ),
              ]),
          ...(hole.spellTargetSpatialFactRequest === undefined
            ? []
            : [
                {
                  kind: "spellTarget" as const,
                  casterId: hole.spellTargetSpatialFactRequest.casterId,
                  targetId,
                  sourceProcedureRef:
                    hole.spellTargetSpatialFactRequest.sourceProcedureRef,
                },
              ]),
          {
            kind: "helpAttackTargetWithin5Feet" as const,
            helperId: fighterId,
            targetEnemyId: targetId,
          },
          {
            kind: "grappleTargetWithinReach" as const,
            grapplerId: fighterId,
            targetId,
          },
          {
            kind: "shoveTargetWithinReach" as const,
            shoverId: fighterId,
            targetId,
          },
          ...commonAdjacentAllySpatialFacts(
            targetId === goblinId ? fighterId : goblinId,
            targetId,
          ),
          {
            kind: "attackerAllyWithin5FeetOfTarget" as const,
            attackerId: combatantId("second-rogue"),
            targetId,
            allyId: combatantId("second-rogue-ally"),
          },
        ]
      : [];
  const selectedRelationshipFacts =
    relationshipFacts ?? defaultRelationshipFacts;
  const selectedSpatialFacts = spatialFacts ?? defaultSpatialFacts;
  const executionBoundSpatialFacts = selectedSpatialFacts.map((fact) =>
    fact.kind === "spellTarget" &&
    hole.spellTargetSpatialFactRequest !== undefined
      ? {
          ...fact,
          sourceProcedureRef:
            hole.spellTargetSpatialFactRequest.sourceProcedureRef,
        }
      : fact,
  );
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(executionBoundSpatialFacts.length === 0
      ? {}
      : { spatialFacts: executionBoundSpatialFacts }),
    ...(selectedRelationshipFacts === undefined
      ? {}
      : { relationshipFacts: selectedRelationshipFacts }),
  };
}

export function readyDeclarationFillForTest(
  hole: BattleHole,
  trigger: string,
  response: BattleReadyResponse,
): BattleFill {
  if (hole.kind !== "readyDeclaration") {
    throw new Error(`Expected Ready declaration hole, got ${hole.kind}.`);
  }
  return {
    kind: "readyDeclaration",
    holeId: hole.holeId,
    value: { trigger: readyTriggerDescription(trigger), response },
  };
}

export function resolveReadySpellForTest(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly procedureRef: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" }
  >["procedureRef"];
  readonly trigger: BattleReadiedSpellTrigger;
}): ReturnType<typeof resolveBattleSubject> {
  const subject: Extract<BattleSubject, { readonly tag: "actionSpell" }> = {
    tag: "actionSpell",
    actorId: input.actorId,
    procedureRef: input.procedureRef,
    mode: { tag: "ready", trigger: input.trigger },
  };
  return resolveBattleSubject({
    state: input.state,
    subject,
    fills: [],
  });
}

export function readyTriggerDescriptionForTest(value: string) {
  return readyTriggerDescription(value);
}

type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;
type SpellObjectTargetFact = Extract<
  ObjectTargetChoiceFill["spatialFacts"][number],
  { readonly kind: "spellObjectTarget" }
>;

export function objectTargetFill(input: {
  readonly hole: BattleHole;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly casterId?: CombatantId;
  readonly rangeFeet?: SpellObjectTargetFact["rangeFeet"];
  readonly armorClass?: SpellObjectTargetFact["armorClass"];
  readonly damageDisposition?: SpellObjectTargetFact["damageDisposition"];
  readonly spatialFacts?: ObjectTargetChoiceFill["spatialFacts"];
}): ObjectTargetChoiceFill {
  if (input.hole.kind !== "objectTargetChoice") {
    throw new Error("Expected objectTargetChoice hole.");
  }
  const objectId = input.objectId ?? battleObjectId("training-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: input.spatialFacts ?? [
      {
        kind: "spellObjectTarget",
        casterId: input.casterId ?? wizardId,
        objectId,
        sourceProcedureRef: battleProcedureExecutionRefForSpellHoleForTest(
          input.hole,
        ),
        rangeFeet: input.rangeFeet ?? movementFeet(60),
        armorClass: input.armorClass ?? armorClass(13),
        damageDisposition: input.damageDisposition ?? {
          kind: "hitPoints",
          hitPoints: Hp(5),
        },
      },
    ],
  };
}

export function spellTargetAllocationFill(
  hole: BattleHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
  casterId: CombatantId = wizardId,
): BattleFill {
  if (hole.kind !== "spellTargetAllocation") {
    throw new Error("Expected spellTargetAllocation hole.");
  }
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId,
      targetId: allocation.targetId,
      sourceProcedureRef: battleProcedureExecutionRefForSpellHoleForTest(hole),
    })),
  };
}

export function attackTargetFill(
  hole: BattleHole,
  actorId: CombatantId,
  targetId: CombatantId,
  attackSelection?: BattleAttackExecutionSelection,
  extraFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
  targetDistanceFeet: MovementFeet = movementFeet(5),
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  const boundSelection = hole.attack?.selection ?? attackSelection;
  if (boundSelection === undefined) {
    throw new Error("Expected a bound attack execution selection.");
  }
  return targetFill(hole, targetId, [
    attackTargetDistanceSpatialFact(
      actorId,
      targetId,
      boundSelection,
      targetDistanceFeet,
    ),
    ...commonAdjacentAllySpatialFacts(actorId, targetId),
    ...(extraFacts ?? []),
  ]);
}

export function attackTargetSpatialFact(
  actorId: CombatantId,
  targetId: CombatantId,
  attackSelection: BattleAttackExecutionSelection,
  distanceFeet: MovementFeet = movementFeet(5),
): Extract<
  NonNullable<
    Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
  >[number],
  { readonly kind: "attackTargetDistance" }
> {
  return attackTargetDistanceSpatialFact(
    actorId,
    targetId,
    attackSelection,
    distanceFeet,
  );
}

export function attackTargetDistanceSpatialFact(
  actorId: CombatantId,
  targetId: CombatantId,
  attackSelection: BattleAttackExecutionSelection,
  distanceFeet: MovementFeet,
): Extract<
  NonNullable<
    Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
  >[number],
  { readonly kind: "attackTargetDistance" }
> {
  return {
    kind: "attackTargetDistance",
    actorId,
    targetId,
    ...attackSelection,
    distanceFeet,
  };
}

function commonAdjacentAllySpatialFacts(
  attackerId: CombatantId,
  targetId: CombatantId,
): readonly NonNullable<
  Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
>[number][] {
  return [
    combatantId("ally"),
    combatantId("sneak-ally"),
    combatantId("sneak-cancel-ally"),
    combatantId("second-rogue-ally"),
  ].map((allyId) => ({
    kind: "attackerAllyWithin5FeetOfTarget" as const,
    attackerId,
    targetId,
    allyId,
  }));
}

type TestD20RolledD20s = {
  readonly first: number;
  readonly second: number;
  readonly selected: NonNullable<
    Extract<BattleFill, { readonly kind: "attackRoll" }>["value"]["rolledD20s"]
  >["selected"];
};

function testD20RolledD20s(
  value: TestD20RolledD20s,
): NonNullable<
  Extract<BattleFill, { readonly kind: "attackRoll" }>["value"]["rolledD20s"]
> {
  return {
    first: DieRollResult(value.first),
    second: DieRollResult(value.second),
    selected: value.selected,
  };
}

export function abilityCheckFill(
  hole: BattleHole,
  value:
    | number
    | {
        readonly total: number;
        readonly naturalD20?: number;
        readonly rolledD20s?: TestD20RolledD20s;
        readonly d20TestNaturalOneReroll?: Extract<
          BattleFill,
          { readonly kind: "abilityCheck" }
        >["value"]["d20TestNaturalOneReroll"];
      },
): BattleFill {
  if (
    hole.kind !== "abilityCheck" &&
    hole.kind !== "spellcastingAbilityCheck"
  ) {
    throw new Error("Expected abilityCheck hole.");
  }
  const checkValue = typeof value === "number" ? { total: value } : value;
  return {
    kind: "abilityCheck",
    holeId: hole.holeId,
    value: {
      total: checkValue.total,
      ...(checkValue.naturalD20 === undefined
        ? {}
        : { naturalD20: DieRollResult(checkValue.naturalD20) }),
      ...(checkValue.rolledD20s === undefined
        ? {}
        : { rolledD20s: testD20RolledD20s(checkValue.rolledD20s) }),
      ...(checkValue.d20TestNaturalOneReroll === undefined
        ? {}
        : { d20TestNaturalOneReroll: checkValue.d20TestNaturalOneReroll }),
    },
  };
}

export function attackRollFill(
  hole: BattleHole,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: AttackRollMode;
    readonly rolledD20s?: TestD20RolledD20s;
    readonly activatedOngoingFeatureProcedureRef?: BattleProcedureExecutionRef;
    readonly spellAttackReroll?: Extract<
      BattleFill,
      { readonly kind: "attackRoll" }
    >["value"]["spellAttackReroll"];
    readonly d20TestNaturalOneReroll?: Extract<
      BattleFill,
      { readonly kind: "attackRoll" }
    >["value"]["d20TestNaturalOneReroll"];
  },
): BattleFill {
  if (hole.kind !== "attackRoll") {
    throw new Error("Expected attackRoll hole.");
  }
  const relationshipFactRequest =
    "relationshipFactRequest" in hole
      ? hole.relationshipFactRequest
      : undefined;
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    ...(relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? {
          relationshipFacts: [
            {
              kind: "attackRollTargetIsEnemy" as const,
              attackerId: relationshipFactRequest.attackerId,
              targetId: relationshipFactRequest.targetId,
              targetIsEnemy: true,
            },
          ],
        }
      : {}),
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
      ...(value.rolledD20s === undefined
        ? {}
        : { rolledD20s: testD20RolledD20s(value.rolledD20s) }),
      ...(value.activatedOngoingFeatureProcedureRef === undefined
        ? {}
        : {
            activatedOngoingFeatureProcedureRef:
              value.activatedOngoingFeatureProcedureRef,
          }),
      ...(value.spellAttackReroll === undefined
        ? {}
        : { spellAttackReroll: value.spellAttackReroll }),
      ...(value.d20TestNaturalOneReroll === undefined
        ? {}
        : { d20TestNaturalOneReroll: value.d20TestNaturalOneReroll }),
    },
  };
}

export function unitFeatureDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): BattleFill {
  if (hole.kind !== "unitFeatureDecision") {
    throw new Error("Expected unitFeatureDecision hole.");
  }
  return {
    kind: "unitFeatureDecision",
    holeId: hole.holeId,
    value,
  };
}

export function deathSavingThrowFill(
  hole: BattleHole,
  roll:
    | number
    | {
        readonly roll: number;
        readonly d20TestNaturalOneReroll?: Extract<
          BattleFill,
          { readonly kind: "deathSavingThrow" }
        >["d20TestNaturalOneReroll"];
      },
): BattleFill {
  if (hole.kind !== "deathSavingThrow") {
    throw new Error("Expected deathSavingThrow hole.");
  }
  const value = typeof roll === "number" ? { roll } : roll;
  return {
    kind: "deathSavingThrow",
    holeId: hole.holeId,
    value: DieRollResult(value.roll),
    ...(value.d20TestNaturalOneReroll === undefined
      ? {}
      : { d20TestNaturalOneReroll: value.d20TestNaturalOneReroll }),
  };
}

export function concentrationSavingThrowFill(
  hole: BattleHole,
  succeeded:
    | boolean
    | (
        | {
            readonly succeeded: boolean;
            readonly naturalD20?: number;
            readonly rolledD20s?: TestD20RolledD20s;
            readonly withoutRoll?: never;
            readonly d20TestNaturalOneReroll?: Extract<
              BattleFill,
              { readonly kind: "concentrationSavingThrow" }
            >["value"]["d20TestNaturalOneReroll"];
          }
        | {
            readonly succeeded: boolean;
            readonly withoutRoll: true;
            readonly naturalD20?: never;
            readonly d20TestNaturalOneReroll?: never;
          }
      ),
): BattleFill {
  if (hole.kind !== "concentrationSavingThrow") {
    throw new Error("Expected concentrationSavingThrow hole.");
  }
  const value = typeof succeeded === "boolean" ? { succeeded } : succeeded;
  if ("withoutRoll" in value && value.withoutRoll === true) {
    return {
      kind: "concentrationSavingThrow",
      holeId: hole.holeId,
      value: {
        succeeded: value.succeeded,
        withoutRoll: true,
      },
    };
  }
  return {
    kind: "concentrationSavingThrow",
    holeId: hole.holeId,
    value: {
      succeeded: value.succeeded,
      ...(!("naturalD20" in value) || value.naturalD20 === undefined
        ? {}
        : { naturalD20: DieRollResult(value.naturalD20) }),
      ...(!("rolledD20s" in value) || value.rolledD20s === undefined
        ? {}
        : { rolledD20s: testD20RolledD20s(value.rolledD20s) }),
      ...(!("d20TestNaturalOneReroll" in value) ||
      value.d20TestNaturalOneReroll === undefined
        ? {}
        : { d20TestNaturalOneReroll: value.d20TestNaturalOneReroll }),
    },
  };
}

export function interruptDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  if (hole.kind !== "interruptDecision") {
    throw new Error("Expected interruptDecision hole.");
  }
  return {
    kind: "interruptDecision",
    holeId: hole.holeId,
    value,
  };
}

export function movementFill(
  hole: BattleHole,
  value: {
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
    readonly areaDifficultTerrain?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["areaDifficultTerrain"];
    readonly acrobaticMovement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["acrobaticMovement"];
    readonly grappleDrag?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["grappleDrag"];
    readonly creatureSpaceTraversal?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["creatureSpaceTraversal"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected movement hole.");
  }
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      ...(value.areaDifficultTerrain === undefined
        ? {}
        : { areaDifficultTerrain: value.areaDifficultTerrain }),
      ...(value.acrobaticMovement === undefined
        ? {}
        : { acrobaticMovement: value.acrobaticMovement }),
      ...(value.grappleDrag === undefined
        ? {}
        : { grappleDrag: value.grappleDrag }),
      ...(value.creatureSpaceTraversal === undefined
        ? {}
        : { creatureSpaceTraversal: value.creatureSpaceTraversal }),
    },
  };
}

export function castGroundHazardForMovementTest(
  areaId: BattleAreaId,
): BattleState {
  const session = startBattleSessionRight({
    battleId: battleId(`battle-grease-movement-${areaId}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("grease")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const subject = magicSubject("grease");
  const save = requireHole(
    resolveBattleSubject({ session, subject, fills: [] }),
    "savingThrowOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      session,
      subject,
      fills: [persistentAreaSaveConditionAreaSavingThrowFill(save, areaId)],
    }),
  ).state;
}

export function fogCloudBattle(battleIdValue: string): BattleState {
  return fogCloudSession(battleIdValue).state;
}

function fogCloudSession(battleIdValue: string): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId(battleIdValue),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: testDaggerAttack(),
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("fog_cloud")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

export function castFogCloud(
  battleIdValue: string,
  areaId: BattleAreaId,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const session = fogCloudSession(battleIdValue);
  const subject = magicSubject("fog_cloud");
  const area = requireHole(
    resolveBattleSubject({ session, subject, fills: [] }),
    "spellAreaChoice",
  );
  return requireResolved(
    resolveBattleSubject({
      session,
      subject,
      fills: [persistentAreaTraitAreaFill(area, areaId)],
    }),
  );
}

export function persistentAreaTraitAreaFill(
  hole: BattleHole,
  areaId: BattleAreaId,
  originAnchor: BattleSpellAreaOriginAnchor = { kind: "tableSelectedPoint" },
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  if (hole.kind !== "spellAreaChoice") {
    throw new Error("Expected spellAreaChoice hole.");
  }
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "persistentAreaTraitArea", areaId, originAnchor },
  };
}

function persistentAreaSaveConditionAreaSavingThrowFill(
  hole: BattleHole,
  areaId: BattleAreaId,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "persistentAreaSaveConditionArea",
        originAnchorId: wizardId,
        affectedTargetIds: [],
        areaId,
      },
      outcomes: [],
    },
  };
}

export function grappleOutcomeFill(
  hole: BattleHole,
  succeeded: boolean,
  relationshipFacts?: Extract<
    BattleFill,
    { readonly kind: "grappleOutcome" }
  >["relationshipFacts"],
): Extract<BattleFill, { readonly kind: "grappleOutcome" }> {
  if (hole.kind !== "grappleOutcome") {
    throw new Error("Expected grappleOutcome hole.");
  }
  const relationshipFactRequest = hole.relationshipFactRequest;
  const selectedRelationshipFacts =
    relationshipFacts ??
    (relationshipFactRequest?.kind === "savingThrowTargetIsEnemy"
      ? ([
          {
            kind: "savingThrowTargetIsEnemy",
            actorId: relationshipFactRequest.actorId,
            targetId: hole.targetId,
            targetIsEnemy: true,
          },
        ] as const)
      : undefined);
  return {
    kind: "grappleOutcome",
    holeId: hole.holeId,
    value: { succeeded },
    ...(selectedRelationshipFacts === undefined
      ? {}
      : { relationshipFacts: selectedRelationshipFacts }),
  };
}

export function shoveOutcomeFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "shoveOutcome" }>["value"],
  relationshipFacts?: Extract<
    BattleFill,
    { readonly kind: "shoveOutcome" }
  >["relationshipFacts"],
): Extract<BattleFill, { readonly kind: "shoveOutcome" }> {
  if (hole.kind !== "shoveOutcome") {
    throw new Error("Expected shoveOutcome hole.");
  }
  const selectedRelationshipFacts =
    relationshipFacts ??
    (hole.relationshipFactRequest?.kind === "savingThrowTargetIsEnemy"
      ? ([
          {
            kind: "savingThrowTargetIsEnemy",
            actorId: hole.relationshipFactRequest.actorId,
            targetId: hole.targetId,
            targetIsEnemy: true,
          },
        ] as const)
      : undefined);
  return {
    kind: "shoveOutcome",
    holeId: hole.holeId,
    value,
    ...(selectedRelationshipFacts === undefined
      ? {}
      : { relationshipFacts: selectedRelationshipFacts }),
  };
}

export function savingThrowOutcomeFill(
  hole: BattleHole,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
    readonly naturalD20?: number;
    readonly rolledD20s?: TestD20RolledD20s;
    readonly withoutRoll?: true;
    readonly d20TestNaturalOneReroll?: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    >["value"]["outcomes"][number]["d20TestNaturalOneReroll"];
  }[],
  relationshipFacts?: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["relationshipFacts"],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  const relationshipFactRequest =
    "relationshipFactRequest" in hole
      ? hole.relationshipFactRequest
      : undefined;
  const defaultRelationshipFacts =
    relationshipFactRequest?.kind === "savingThrowTargetIsEnemy"
      ? outcomes.map((outcome) => ({
          kind: "savingThrowTargetIsEnemy" as const,
          actorId: relationshipFactRequest.actorId,
          targetId: outcome.targetId,
          targetIsEnemy: true,
        }))
      : undefined;
  const selectedRelationshipFacts =
    relationshipFacts ??
    (defaultRelationshipFacts === undefined ||
    defaultRelationshipFacts.length === 0
      ? undefined
      : [defaultRelationshipFacts[0]!, ...defaultRelationshipFacts.slice(1)]);
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    ...(selectedRelationshipFacts === undefined
      ? {}
      : { relationshipFacts: selectedRelationshipFacts }),
    value:
      "outcomeTargeting" in hole && hole.outcomeTargeting === "area"
        ? {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
            outcomes: outcomes.map(d20TestSavingThrowOutcomeValue),
          }
        : { outcomes: outcomes.map(d20TestSavingThrowOutcomeValue) },
  };
}

function d20TestSavingThrowOutcomeValue(outcome: {
  readonly targetId: CombatantId;
  readonly succeeded: boolean;
  readonly naturalD20?: number;
  readonly rolledD20s?: TestD20RolledD20s;
  readonly withoutRoll?: true;
  readonly d20TestNaturalOneReroll?: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"][number]["d20TestNaturalOneReroll"];
}): Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>["value"]["outcomes"][number] {
  if (outcome.withoutRoll === true) {
    return {
      targetId: outcome.targetId,
      succeeded: outcome.succeeded,
      withoutRoll: true,
    };
  }
  return {
    targetId: outcome.targetId,
    succeeded: outcome.succeeded,
    ...(outcome.naturalD20 === undefined
      ? {}
      : { naturalD20: DieRollResult(outcome.naturalD20) }),
    ...(outcome.rolledD20s === undefined
      ? {}
      : { rolledD20s: testD20RolledD20s(outcome.rolledD20s) }),
    ...(outcome.d20TestNaturalOneReroll === undefined
      ? {}
      : { d20TestNaturalOneReroll: outcome.d20TestNaturalOneReroll }),
  };
}

export function damageRollFill(
  hole: BattleFillableHole,
  dieResult: number,
  attackDamageAbilityModifierChoice?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["attackDamageAbilityModifierChoice"],
): BattleFill {
  return damageRollFillWithGroups(
    hole,
    [[dieResult]],
    undefined,
    attackDamageAbilityModifierChoice,
  );
}

export function damageRollFillWithGroups(
  hole: BattleFillableHole,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderProcedureRefs?: readonly BattleProcedureExecutionRef[],
  attackDamageAbilityModifierChoice?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["attackDamageAbilityModifierChoice"],
  cunningStrikeOption?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["cunningStrikeOption"],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderProcedureRefs === undefined
      ? {}
      : { selectedAttackDamageRiderProcedureRefs }),
    ...(attackDamageAbilityModifierChoice === undefined
      ? {}
      : { attackDamageAbilityModifierChoice }),
    ...(cunningStrikeOption === undefined ? {} : { cunningStrikeOption }),
    value: rolledDiceGroups(groups),
  };
}

export function attackDamageDispositionHoleAfterDamage(
  state: BattleState,
  targetHole: BattleHole,
  rollHole: BattleHole,
  damageHole: BattleHole,
  targetId: CombatantId,
  damage: number,
): BattleHole {
  return attackDamageDispositionHoleAfterFills(
    state,
    fighterAttackSubject(state),
    [
      targetFill(targetHole, targetId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      damageRollFill(damageHole, damage),
    ],
  );
}

export function attackDamageDispositionHoleAfterFills(
  state: BattleState,
  subject: BattleSubject,
  fills: readonly BattleFill[],
): BattleHole {
  return requireHole(
    resolveBattleSubject({ state, subject, fills }),
    "attackDamageDisposition",
  );
}

export function attackDamageDispositionFill(
  hole: BattleHole,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  if (hole.kind !== "attackDamageDisposition") {
    throw new Error("Expected attackDamageDisposition hole.");
  }
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
  };
}

export function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): DamageRollValue {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }

  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

export function rolledDiceGroup(
  group: readonly number[],
): DamageRollValue[number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [
      DieRollResult(first),
      ...rest.map((dieResult) => DieRollResult(dieResult)),
    ],
  };
}

export function characterSeed(input: {
  readonly combatantId?: CombatantId;
  readonly displayName?: string;
  readonly initiative: number;
  readonly classLevel?: number;
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly conditions?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["conditions"];
  readonly positiveHpUnconscious?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["positiveHpUnconscious"];
  readonly zeroHpLifecycle?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["zeroHpLifecycle"];
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly unarmoredArmorClassBases?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unarmoredArmorClassBases"];
  readonly selectedLoadout?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"];
  readonly weaponMasteries?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["weaponMasteries"];
  readonly attack?:
    | Extract<
        BattleCreatureInit["creatureInit"],
        { readonly kind: "character" }
      >["attack"]
    | null;
  readonly ammunitionStocks?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["ammunitionStocks"];
  readonly unarmedStrike?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unarmedStrike"];
  readonly offHandAttack?: TestCharacterWeaponAttack;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly metamagic?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["metamagic"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly invocationFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["invocationFeatures"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly knownLanguages?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["knownLanguages"];
  readonly d20Statistics?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["d20Statistics"];
  readonly druidWildShapeAvailableForms?: readonly StatBlockRecord[];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly size?: Size;
}): BattleCreatureInit {
  const selectedLoadout =
    input.selectedLoadout ??
    (input.attack === null
      ? {}
      : {
          weapon: {
            itemId: battleObjectId(
              `main:${
                input.attack === undefined
                  ? "weapon_longsword"
                  : input.attack.weapon.weaponUnitId
              }`,
            ),
            unitId:
              input.attack === undefined
                ? parseUnitId("weapon_longsword")
                : input.attack.weapon.weaponUnitId,
            grip: "one_handed" as const,
          },
        });
  const attack =
    input.attack === undefined
      ? input.selectedLoadout !== undefined
        ? selectedLoadout.weapon === undefined
          ? null
          : testCharacterWeaponAttackForUnit(selectedLoadout.weapon.unitId)
        : testLongswordAttack()
      : input.attack;
  const initAttack =
    attack === null ? null : characterBattleCreatureInitWeaponAttack(attack);
  const classLevels = input.classLevels ?? [
    {
      className:
        input.spellcasting?.spellcastingSource.tag === "classSpellcasting"
          ? input.spellcasting.spellcastingSource.className
          : "fighter",
      level: input.classLevel ?? 1,
    },
  ];
  const druidWildShapeProfile =
    input.druidWildShapeAvailableForms === undefined
      ? undefined
      : (input.resources ?? []).flatMap((resource) => {
          const profile = parseSupportedUnitFeatureProfile(
            resource.unit,
            parseCharacterBattleClassLevelsRight(classLevels),
          );
          return profile?.kind === "druidWildShapeKnownForm" ? [profile] : [];
        })[0];
  if (
    input.druidWildShapeAvailableForms !== undefined &&
    druidWildShapeProfile === undefined
  ) {
    throw new Error(
      "Test Druid Wild Shape available forms require a support profile.",
    );
  }
  const druidWildShapeAvailableForms =
    input.druidWildShapeAvailableForms === undefined ||
    druidWildShapeProfile === undefined
      ? undefined
      : battleAvailableDruidWildShapeKnownForms({
          forms: input.druidWildShapeAvailableForms,
          profile: druidWildShapeProfile,
        });
  if (
    druidWildShapeAvailableForms !== undefined &&
    Result.isFailure(druidWildShapeAvailableForms)
  ) {
    throw new Error(druidWildShapeAvailableForms.failure.message);
  }
  const parsedDruidWildShapeAvailableForms =
    druidWildShapeAvailableForms === undefined
      ? undefined
      : druidWildShapeAvailableForms.success;
  const resourceUnitRefs = (input.resources ?? []).map((resource) => {
    const supportProfiles = battleUnitSupportProfilesForUnit({
      unit: resource.unit,
      classLevels: parseCharacterBattleClassLevelsRight(classLevels),
    });
    if (Result.isFailure(supportProfiles)) {
      throw new Error(supportProfiles.failure.message);
    }
    return { unit: resource.unit, supportProfiles: supportProfiles.success };
  });
  const weaponPresentationUnitRefs = [attack, input.offHandAttack].flatMap(
    (candidate) => {
      if (candidate === null || candidate === undefined) return [];
      const unit = unitLibrary
        .listUnits()
        .find(
          (entry) =>
            entry.kind === "weapon" &&
            entry.id === candidate.weapon.weaponUnitId,
        );
      return unit?.kind === "weapon" ? [{ unit, supportProfiles: [] }] : [];
    },
  );
  const characterUnitRefs = [
    ...new Map(
      [
        ...resourceUnitRefs,
        ...weaponPresentationUnitRefs,
        ...(input.characterUnitRefs ?? []),
      ].map((ref) => [ref.unit.id, ref]),
    ).values(),
  ];
  const armorClass =
    input.armorClass ?? armorClassStateForLoadout(selectedLoadout);
  const unarmoredArmorClassBase =
    armorClass.base.kind === "ability_sum"
      ? armorClass.base
      : defaultUnarmoredArmorClassBase();
  return {
    combatantId: input.combatantId ?? fighterId,
    displayName: input.displayName ?? "Fighter",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId("fighter-character"),
      characterUnitRefs,
      classLevels,
      knownLanguages: input.knownLanguages ?? ["Common"],
      d20Statistics:
        input.d20Statistics ?? testCharacterD20Statistics({ str: 16 }),
      armorClass,
      unarmoredArmorClassBases: input.unarmoredArmorClassBases ?? {
        shielded: unarmoredArmorClassBase,
        unshielded: unarmoredArmorClassBase,
      },
      size: input.size ?? "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(input.tempHp ?? 0),
      ammunitionStocks: input.ammunitionStocks ?? [],
      ...(input.conditions === undefined
        ? {}
        : { conditions: input.conditions }),
      ...(input.positiveHpUnconscious === undefined
        ? {}
        : { positiveHpUnconscious: input.positiveHpUnconscious }),
      ...(input.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: input.zeroHpLifecycle }),
      selectedLoadout,
      weaponMasteries: input.weaponMasteries ?? [],
      attack: initAttack,
      unarmedStrike: input.unarmedStrike ?? testUnarmedStrikeDamageAttack(),
      ...(input.offHandAttack === undefined
        ? {}
        : {
            offHandAttack: characterBattleCreatureInitWeaponAttack(
              input.offHandAttack,
            ),
          }),
      ...(input.unitFeatures === undefined
        ? {}
        : { unitFeatures: input.unitFeatures }),
      ...(input.invocationFeatures === undefined
        ? {}
        : { invocationFeatures: input.invocationFeatures }),
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.metamagic === undefined ? {} : { metamagic: input.metamagic }),
      ...(parsedDruidWildShapeAvailableForms === undefined
        ? {}
        : { druidWildShapeAvailableForms: parsedDruidWildShapeAvailableForms }),
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function armorClassStateForLoadout(
  loadout: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"],
): ReturnType<typeof defaultArmorClassState> {
  return {
    ...defaultArmorClassState(),
    leftHandUse:
      loadout.shield === undefined
        ? loadout.offHandWeapon === undefined
          ? "free"
          : "offWeapon"
        : "shield",
    rightHandUse: loadout.weapon === undefined ? "free" : "mainWeapon",
  };
}

export function heavyArmorClassState(): ReturnType<
  typeof defaultArmorClassState
> {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "heavy",
      formula: { kind: "heavy_fixed", ac: 16 },
    },
    armorTraining: new Set(["heavy"]),
    rightHandUse: "mainWeapon",
  };
}

export function testCharacterWeaponAttackForUnit(
  unitId: UnitRecord["id"],
): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected weapon Unit, got ${weapon.kind}.`);
  }

  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testLongswordAttack(): TestCharacterWeaponAttack {
  return testCharacterWeaponAttackForUnit(parseUnitId("weapon_longsword"));
}

export function testUnarmedStrikeDamageAttack(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: battleAbilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: battleAbilityModifier(3),
  };
}

export function testUnarmedStrikeDieAttack(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: {
        kind: "mechanicalReplacement",
        dice: 1,
        dieSize: 4,
        damageType: "bludgeoning",
      },
    },
    attackAbility: "str",
    attackAbilityModifier: battleAbilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: battleAbilityModifier(3),
  };
}

export function testDaggerAttack(): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_dagger");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Dagger weapon Unit.");
  }

  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testShortswordAttack(): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_shortsword");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Shortsword weapon Unit.");
  }

  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testQuarterstaffAttack(): TestCharacterWeaponAttack {
  const weapon = decodeUnitRecordSync(weaponQuarterstaffInput);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Quarterstaff weapon Unit.");
  }

  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testGreataxeAttack(
  ability = battleAbilityModifier(3),
): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_greataxe");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Greataxe weapon Unit.");
  }

  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: "str",
    abilityModifier: ability,
  };
}

export function testRangedCleaveLongbowAttack(): TestCharacterWeaponAttack {
  const unit = testRangedCleaveLongbowUnitRef().unit;
  if (unit.kind !== "weapon") {
    throw new Error("Expected Longbow weapon Unit.");
  }
  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      unit,
      battleObjectId(`main:${unit.id}`),
      [],
    ),
    ability: "dex",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testRangedCleaveLongbowUnitRef(): BattleUnitRef {
  const weapon = decodeUnitRecordSync(weaponLongbowInput);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Longbow weapon Unit.");
  }

  return {
    unit: {
      ...weapon,
      mastery: "cleave",
    } satisfies WeaponRecord,
    supportProfiles: [],
  };
}

export function testLightHammerAttack(): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_flail");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Flail weapon Unit.");
  }

  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

export function testPoisonWeaponAttack(): TestCharacterWeaponAttack {
  const base = testLightHammerAttack();
  return {
    ...base,
    weapon: {
      ...base.weapon,
      damage: { ...base.weapon.damage, damageType: "poison" },
    },
  };
}

export function statBlockCreatureInit(input: {
  readonly combatantId?: CombatantId;
  readonly displayName?: string;
  readonly statBlock?: StatBlockRecord;
  readonly initiative: number;
  readonly currentHp?: number;
  readonly tempHp?: number;
  readonly ammunitionStocks?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "statBlock" }
  >["ammunitionStocks"];
}): BattleCreatureInit {
  const statBlock = input.statBlock ?? statBlockRecord();
  if (statBlock.statBlock.hp.kind !== "literal") {
    throw new Error(
      "Battle runtime test Stat Block fixture must use literal HP.",
    );
  }
  const maxHp = statBlock.statBlock.hp.value;
  const ammunitionStocks =
    input.ammunitionStocks ??
    requiredAmmunitionKinds([
      ...(statBlock.statBlock.actions?.attacks ?? []),
      ...(statBlock.statBlock.legendaryActions?.actions.attacks ?? []),
    ]).map((ammunition) => battleAmmunitionStock(ammunition, 20));
  return {
    combatantId: input.combatantId ?? goblinId,
    displayName: input.displayName ?? statBlock.statBlock.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      source: requireBattleStatBlockCombatantSource(statBlock),
      currentHp: Hp(input.currentHp ?? maxHp),
      tempHp: Hp(input.tempHp ?? 0),
      ammunitionStocks,
      conditions: [],
    },
  };
}

export function statBlockRecord(): StatBlockRecord {
  return statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
}

export function monsterResourceStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  if (scimitar === undefined) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  return {
    ...base,
    id: statBlockId("stat_block_resource_test_monster"),
    name: "Resource Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Resource Test Monster",
      actions: {
        attacks: [
          {
            ...scimitar,
            name: "Cinder Breath",
            limitedUse: { kind: "recharge", minimumRoll: 5 },
          },
          {
            ...scimitar,
            name: "Dread Gaze",
            limitedUse: { kind: "daily", uses: 1 },
          },
        ],
      },
      legendaryActions: {
        uses: 2,
        actions: {
          attacks: [
            {
              ...scimitar,
              name: "Tail Swipe",
            },
          ],
        },
      },
    },
  };
}

export function monsterResourceStatBlockWithUnsupportedAttackSections(): StatBlockRecord {
  const base = monsterResourceStatBlock();
  const cinderBreath = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Cinder Breath",
  );
  if (cinderBreath === undefined) {
    throw new Error("Expected Cinder Breath fixture.");
  }
  return {
    ...base,
    id: statBlockId("stat_block_unsupported_attack_sections_test_monster"),
    statBlock: {
      ...base.statBlock,
      bonusActions: {
        attacks: [
          {
            ...cinderBreath,
            name: "Swift Bite",
          },
        ],
      },
      reactions: {
        attacks: [
          {
            ...cinderBreath,
            name: "Counter Snap",
          },
        ],
      },
    },
  };
}

export function monsterMultiattackStatBlock(input?: {
  readonly scimitarCount?: number;
  readonly shortbowCount?: number;
  readonly duplicateScimitarAttack?: boolean;
}): StatBlockRecord {
  const base = statBlockRecord();
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  const shortbow = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Shortbow",
  );
  if (scimitar === undefined || shortbow === undefined) {
    throw new Error("Expected Goblin Warrior attack fixtures.");
  }
  return {
    ...base,
    id: statBlockId("stat_block_multiattack_test_monster"),
    statBlock: {
      ...base.statBlock,
      displayName: "Multiattack Test Monster",
      actions: {
        ...base.statBlock.actions,
        multiattacks: [
          {
            name: "Multiattack",
            dispatches: [
              {
                name: "Scimitar",
                count: { kind: "literal", value: input?.scimitarCount ?? 2 },
              },
              {
                name: "Shortbow",
                count: { kind: "literal", value: input?.shortbowCount ?? 1 },
              },
            ],
          },
        ],
        attacks:
          input?.duplicateScimitarAttack === true
            ? [scimitar, { ...shortbow, name: "Scimitar" }]
            : [scimitar, shortbow],
      },
    },
  };
}

export function monsterResourceStatBlockWithTwoRechargeActions(): StatBlockRecord {
  const base = monsterResourceStatBlock();
  const cinderBreath = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Cinder Breath",
  );
  if (cinderBreath === undefined) {
    throw new Error("Expected Cinder Breath fixture.");
  }
  return {
    ...base,
    id: statBlockId("stat_block_two_recharge_test_monster"),
    statBlock: {
      ...base.statBlock,
      actions: {
        ...base.statBlock.actions,
        attacks: [
          ...(base.statBlock.actions?.attacks ?? []),
          {
            ...cinderBreath,
            name: "Ash Cloud",
            limitedUse: { kind: "recharge", minimumRoll: 6 },
          },
        ],
      },
    },
  };
}

export function skeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Skeleton",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      source: requireBattleStatBlockCombatantSource(
        statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      ),
      currentHp: Hp(13),
      tempHp: Hp(0),
      ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(20) }],
      conditions: [],
    },
  };
}

export function resistantSkeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const skeleton = statBlockCatalog.requireStatBlock("stat_block_skeleton");
  const {
    vulnerabilities: _vulnerabilities,
    immunities: _immunities,
    ...statBlockWithoutDamageModifiers
  } = skeleton.statBlock;
  return {
    combatantId: skeletonId,
    displayName: "Slashing Resistant Skeleton",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      source: requireBattleStatBlockCombatantSource({
        id: statBlockId("stat_block_slashing_resistant_skeleton"),
        challengeRating: skeleton.challengeRating,
        statBlock: {
          ...statBlockWithoutDamageModifiers,
          displayName: "Slashing Resistant Skeleton",
          resistances: { kind: "fixed", damageTypes: ["slashing"] },
        },
      }),
      currentHp: Hp(13),
      tempHp: Hp(0),
      ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(20) }],
      conditions: [],
    },
  };
}

export function actionSurgeResource(input?: {
  readonly unit?: UnitRecord;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = input?.unit ?? unitLibrary.requireUnit("fighter_action_surge");
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected Action Surge resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function resource(input?: {
  readonly unit?: UnitRecord;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = input?.unit ?? unitLibrary.requireUnit("fighter_second_wind");
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected Second Wind resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function supportedBattleUnitRef(unit: UnitRecord): BattleUnitRef {
  const profiles = battleUnitSupportProfilesForUnit({ unit });
  if (Result.isFailure(profiles)) {
    throw new Error(profiles.failure.message);
  }
  return {
    unit,
    supportProfiles: profiles.success,
  };
}

export function rageResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = barbarianRageUnit();
  if (
    unit.mechanics.family !== "activation" ||
    !("resource" in unit.mechanics)
  ) {
    throw new Error("Expected Rage resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function innateSorceryResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit("sorcerer_innate_sorcery");
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "activation" ||
    !("resource" in unit.mechanics)
  ) {
    throw new Error("Expected Innate Sorcery resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function rangerFavoredEnemyResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit("ranger_favored_enemy");
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "ranger" ||
    unit.mechanics.family !== "passive"
  ) {
    throw new Error("Expected Favored Enemy resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function paladinsSmiteResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit("paladin_paladins_smite");
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "paladin" ||
    unit.mechanics.family !== "passive"
  ) {
    throw new Error("Expected Paladin's Smite resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function recklessAttackFeature(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return characterBattleFeatureInitForTest(
    barbarianRecklessAttackUnit(),
    parseCharacterBattleClassLevelsRight([
      { className: "barbarian", level: 2 },
    ]),
  );
}

export function sneakAttackFeature(input?: {
  readonly acquiredAtLevel?: number;
  readonly classLevel?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  const acquiredAtLevel = input?.acquiredAtLevel ?? 1;
  const featureClassLevel = input?.classLevel ?? acquiredAtLevel;
  return characterBattleFeatureInitForTest(
    rogueSneakAttackUnit({ acquiredAtLevel }),
    parseCharacterBattleClassLevelsRight([
      { className: "rogue", level: featureClassLevel },
    ]),
  );
}

export function cunningStrikeFeature(input?: {
  readonly acquiredAtLevel?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  const acquiredAtLevel = input?.acquiredAtLevel ?? 5;
  return characterBattleFeatureInitForTest(
    rogueCunningStrikeUnit({ acquiredAtLevel }),
    parseCharacterBattleClassLevelsRight([
      { className: "rogue", level: acquiredAtLevel },
    ]),
  );
}

function evasionFeature(input?: {
  readonly ability?: "dex" | "con";
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return characterBattleFeatureInitForTest(
    rogueEvasionUnit(input),
    parseCharacterBattleClassLevelsRight([{ className: "rogue", level: 7 }]),
  );
}

export function reactionModifierUnitRef(
  unitId: string,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"]
>[number] {
  return {
    unit: unitLibrary.requireUnit(unitId),
    supportProfiles: [REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE],
  };
}

export function reactionModifierUnitRefWithProfile(
  unitId: string,
  profile:
    | typeof REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE
    | typeof ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"]
>[number] {
  return {
    unit: unitLibrary.requireUnit(unitId),
    supportProfiles: [profile],
  };
}

export function monkDeflectAttacksFocusResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return monksFocusResource(input);
}

export function monksFocusResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: unitLibrary.requireUnit("monk_monks_focus"),
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function cuttingWordsResource(input?: {
  readonly unit?: Extract<UnitRecord, { readonly kind: "class_feature" }>;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: input?.unit ?? cuttingWordsUnit(),
    usesRemaining: input?.usesRemaining ?? 1,
  };
}

export function bardicInspirationUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("bard_bardic_inspiration");
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Bardic Inspiration class feature Unit.");
  }
  return unit;
}

export function bardicInspirationSubject(
  unitId: string,
): UnitFeatureSelectorForTest {
  return {
    tag: "unitFeature",
    actorId: fighterId,
    unitId: parseUnitId(unitId),
  };
}

function bardicInspirationResource(input: {
  readonly charismaModifier: number;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: bardicInspirationUnit(),
    capAbilityModifier: battleAbilityModifier(input.charismaModifier),
    ...(input.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

export function bardicInspirationBattle(input: {
  readonly bardLevel?: number;
  readonly charismaModifier: number;
  readonly includeUnrelatedResource?: boolean;
  readonly bardHidden?: boolean;
  readonly targetConditions?: readonly Condition[];
}): BattleRuntimeSession {
  const session = startBattleSessionRight({
    battleId: battleId("battle-bardic-inspiration-grant"),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        displayName: "Bard",
        initiative: 20,
        classLevels:
          input.includeUnrelatedResource === true
            ? [
                { className: "bard", level: input.bardLevel ?? 1 },
                { className: "fighter", level: 1 },
              ]
            : [{ className: "bard", level: input.bardLevel ?? 1 }],
        attack: null,
        resources: [
          bardicInspirationResource({
            charismaModifier: input.charismaModifier,
          }),
          ...(input.includeUnrelatedResource === true ? [resource()] : []),
        ],
        characterUnitRefs: [
          {
            unit: unitLibrary.requireUnit(bardicInspirationUnit().id),
            supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
          },
        ],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const state = session.state;
  let combatants: Map<CombatantId, BattleCreatureState> = new Map(
    state.combatants,
  );
  if (input.targetConditions !== undefined) {
    const target = combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected Bardic Inspiration target fixture.");
    }
    if (target.positiveHpUnconscious !== null) {
      throw new Error("Expected conscious Bardic Inspiration target fixture.");
    }
    combatants = combatants.set(goblinId, {
      ...target,
      conditions: input.targetConditions.reduce(
        (conditions, condition) => applyCondition(conditions, condition),
        target.conditions,
      ),
    });
  }
  if (input.bardHidden === true) {
    const bard = combatants.get(fighterId);
    if (bard === undefined) {
      throw new Error("Expected Bard fixture.");
    }
    combatants = combatants.set(fighterId, {
      ...bard,
      hidden: { discoveryDc: difficultyClass(16) },
    });
  }
  return battleRuntimeSessionForTest({
    state: { ...state, combatants },
    context: session.context,
  });
}

export function bardicInspirationTargetFill(
  hole: BattleHole,
  sourceProcedureRef: BattleProcedureExecutionRef,
  targetId: CombatantId,
  input?: { readonly canHear?: boolean },
): BattleFill {
  return targetFill(hole, targetId, [
    {
      kind: "bardicInspirationTargetWithinRange",
      bardId: fighterId,
      targetId,
      sourceProcedureRef,
      rangeFeet: movementFeet(60),
    },
    ...(input?.canHear === true
      ? [
          {
            kind: "bardicInspirationTargetCanHear" as const,
            bardId: fighterId,
            targetId,
            sourceProcedureRef,
          },
        ]
      : []),
  ]);
}

export function grantBardicInspirationToGoblin(): BattleState {
  const bardicInspiration = bardicInspirationUnit();
  const session = bardicInspirationBattle({ charismaModifier: 3 });
  const state = session.state;
  const subject = bardicInspirationSubject(bardicInspiration.id);
  const act = findAct(session, subject);
  if (act.subject.tag !== "unitFeature") {
    throw new Error("Expected Bardic Inspiration unit feature act.");
  }
  const target = findHole(act.initialHoles, "targetChoice");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        bardicInspirationTargetFill(target, act.subject.procedureRef, goblinId),
      ],
    }),
  ).state;
}

export function combatantHasBardicInspirationDie(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return (
    state.combatants
      .get(actorId)
      ?.activeEffects.some(
        (effect) => effect.kind === "bardicInspirationDie",
      ) ?? false
  );
}

export function bardicInspirationStaleTargetHole(
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleHole {
  const protocolId = `battle:unit-feature:${sourceProcedureRef}:target`;
  return {
    kind: "targetChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: "Bardic Inspiration target",
    procedureRef: sourceProcedureRef,
    requiresTableSpatialFact: true,
    choices: [goblinId],
  };
}

export function characterResourceUses(
  state: BattleState,
  actorId: CombatantId,
): readonly unknown[] {
  const actor = state.combatants.get(actorId);
  return actor?.origin.kind === "character"
    ? actor.origin.resources.map((resource) =>
        "usesRemaining" in resource ? resource.usesRemaining : undefined,
      )
    : [];
}

export function goblinAttacksReactionModifierCharacter(input: {
  readonly unit: Extract<UnitRecord, { readonly kind: "class_feature" }>;
  readonly className: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"][number]["className"];
  readonly level: number;
  readonly unitId: string;
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly resources?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["resources"]
  >;
}): BattleState {
  return startBattleRight({
    battleId: battleId(`battle-${input.unitId}`),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({
        combatantId: fighterId,
        displayName: input.unit.name,
        initiative: 10,
        classLevels: [{ className: input.className, level: input.level }],
        attack: null,
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
        ...(input.resources === undefined
          ? {}
          : { resources: input.resources }),
        unitFeatures: [
          characterBattleFeatureInitForTest(
            input.unit,
            parseCharacterBattleClassLevelsRight([
              { className: input.className, level: input.level },
            ]),
          ),
        ],
        characterUnitRefs: [
          {
            unit: input.unit,
            supportProfiles: [
              REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
            ],
          },
        ],
      }),
    ],
  });
}

export function goblinScimitarHitReactionSetup(state: BattleState): {
  readonly subject: BattleSubject;
  readonly prefixFills: readonly BattleFill[];
  readonly result: ReturnType<typeof resolveBattleSubject>;
} {
  const subject = goblinAttackSubject(state, "Scimitar");
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, fighterId)],
    }),
    "attackRoll",
  );
  const prefixFills = [
    targetFill(target, fighterId),
    attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
  ];
  const result = resolveBattleSubject({ state, subject, fills: prefixFills });
  return { subject, prefixFills, result };
}

export function resolveGoblinScimitarHitReduction(input: {
  readonly state: BattleState;
  readonly unitId: string;
  readonly reductionRoll?: number;
  readonly damageRoll: number;
}): ReturnType<typeof resolveBattleSubject> {
  const setup = goblinScimitarHitReactionSetup(input.state);
  if (setup.result.tag !== "needsHoles") {
    throw new Error("Expected attack-hit Reaction window.");
  }
  const choice = reactionModifierChoice(
    battleFrontierInterruptDecisionForState(setup.result.state)!.choices,
    input.unitId,
    "attackDamageReduction",
  );
  const fills =
    input.reductionRoll === undefined
      ? []
      : [
          {
            kind: "rolledDice" as const,
            holeId: choice.initialHoles[0]!.holeId,
            value: [rolledDiceGroup([input.reductionRoll])] as const,
          },
        ];
  const afterReaction = resolveBattleInterrupt({
    state: setup.result.state,
    fill: interruptDecisionFill(
      findHole(setup.result.holes, "interruptDecision"),
      {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          procedureRef: choice.choice.procedureRef,
          modifierKind: "attackDamageReduction",
          fills,
        },
      },
    ),
  });
  if (afterReaction.tag !== "needsHoles") {
    throw new Error("Expected damage roll after hit reduction.");
  }
  const damage = requireHole(afterReaction, "rolledDice");
  const result = resolveBattleSubject({
    state: afterReaction.state,
    subject: setup.subject,
    fills: [
      ...setup.prefixFills,
      {
        kind: "rolledDice",
        holeId: damage.holeId,
        value: [rolledDiceGroup([input.damageRoll])] as const,
      },
    ],
  });
  if (result.tag !== "needsHoles") {
    return result;
  }
  if (
    battleFrontierInterruptDecisionForState(result.state) === null &&
    !result.holes.some((hole) => hole.kind === "concentrationSavingThrow")
  ) {
    throw new Error("Expected attack-damage Reaction or Concentration window.");
  }
  return result;
}

export function reactionModifierChoice(
  choices: ReadonlyArray<
    NonNullable<
      ReturnType<typeof battleFrontierInterruptDecision>
    >["choices"][number]
  >,
  unitId: string,
  modifierKind:
    | "attackRollReduction"
    | "damageRollReduction"
    | "attackDamageReduction"
    | "fallDamageReduction",
) {
  const choice = choices.find(
    (candidate) =>
      candidate.kind === "reactionRollOrDamageReduction" &&
      candidate.choice.kind === modifierKind,
  );
  if (choice?.kind !== "reactionRollOrDamageReduction") {
    throw new Error(
      `Expected ${unitId} ${modifierKind} reaction choice among ${JSON.stringify(
        choices.map((candidate) =>
          candidate.kind === "reactionRollOrDamageReduction"
            ? {
                kind: candidate.kind,
                procedureRef: candidate.choice.procedureRef,
                modifierKind: candidate.choice.kind,
              }
            : { kind: candidate.kind },
        ),
      )}.`,
    );
  }
  return choice;
}

export function reactionModifierReductionRollFill(
  choice: ReturnType<typeof reactionModifierChoice>,
  roll: number,
): BattleFill {
  const hole = choice.initialHoles[0];
  if (hole?.kind !== "rolledDice") {
    throw new Error("Expected Reaction modifier roll hole.");
  }
  return damageRollFill(hole, roll);
}

export function reactionChoiceWithSubject(
  choices: ReadonlyArray<
    NonNullable<
      ReturnType<typeof battleFrontierInterruptDecision>
    >["choices"][number]
  >,
) {
  const choice = choices[0];
  if (choice === undefined || !("subject" in choice)) {
    throw new Error("Expected subject-backed reaction choice.");
  }
  return choice;
}

export function opportunityAttackProcedureSelectionForTest(
  choice: ReturnType<typeof reactionChoiceWithSubject>,
  fills: readonly BattleFill[] = [],
): Extract<
  BattleInterruptProcedureSelection,
  { readonly kind: "opportunityAttack" }
> {
  if (
    choice.kind !== "opportunityAttack" ||
    choice.subject.command !== "opportunityAttack"
  ) {
    throw new Error("Expected an Opportunity Attack reaction choice.");
  }
  const selection: BattleInterruptAttackExecutionSelection =
    choice.subject.attackAbility === undefined ||
    choice.subject.attackDamageType === undefined
      ? { procedureRef: choice.subject.procedureRef }
      : {
          procedureRef: choice.subject.procedureRef,
          attackAbility: choice.subject.attackAbility,
          attackDamageType: choice.subject.attackDamageType,
        };
  return {
    kind: "opportunityAttack",
    reactorId: choice.reactorId,
    selection,
    fills,
  };
}

function rogueSneakAttackUnit(input?: {
  readonly acquiredAtLevel?: number;
}): Extract<UnitRecord, { readonly kind: "class_feature" }> {
  return {
    id: parseUnitId("rogue_sneak_attack"),
    kind: "class_feature",
    name: "Sneak Attack",
    className: "rogue",
    acquiredAtLevel: input?.acquiredAtLevel ?? 1,
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Sneak Attack",
    },
    mechanics: {
      family: "on_hit_trigger",
      trigger: {
        kind: "hit_with_attack_roll",
        weaponFilter: "finesse_or_ranged",
        eligibility:
          "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
      },
      optional: true,
      usageLimit: { kind: "once_per_turn" },
      effect: {
        kind: "add_attack_damage_dice",
        dice: {
          kind: "class_level_table",
          dieSize: 6,
          dice: [
            { atLevel: 1, count: 1 },
            { atLevel: 3, count: 2 },
            { atLevel: 5, count: 3 },
            { atLevel: 7, count: 4 },
            { atLevel: 9, count: 5 },
            { atLevel: 11, count: 6 },
            { atLevel: 13, count: 7 },
            { atLevel: 15, count: 8 },
            { atLevel: 17, count: 9 },
            { atLevel: 19, count: 10 },
          ],
        },
        damageType: "same_as_attack",
      },
    },
  };
}

function rogueCunningStrikeUnit(input?: {
  readonly acquiredAtLevel?: number;
}): Extract<UnitRecord, { readonly kind: "class_feature" }> {
  return {
    id: parseUnitId("rogue_cunning_strike"),
    kind: "class_feature",
    name: "Cunning Strike",
    className: "rogue",
    acquiredAtLevel: input?.acquiredAtLevel ?? 5,
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue.md:95-150",
    },
    mechanics: {
      family: "cunning_strike",
      trigger: {
        kind: "deal_sneak_attack_damage",
        sourceUnitId: parseExactUnitIdForTest("rogue_sneak_attack"),
      },
      choice: { kind: "choose_one", maxOptions: 1 },
      effectSaveDc: {
        kind: "class_feature_ability_save_dc",
        base: 8,
        ability: "dex",
      },
      options: [
        {
          id: "poison",
          cost: { kind: "sneak_attack_damage_dice", dice: 1, dieSize: 6 },
          requires: {
            kind: "equipment_on_person",
            equipment: { kind: "tool", toolId: "poisoners_kit" },
          },
          save: { ability: "con" },
          onFail: {
            kind: "apply_condition",
            condition: "poisoned",
            duration: { amount: 1, unit: "minute" },
            repeatSave: {
              cadence: "end_of_target_turn",
              onSuccess: "end_condition",
            },
          },
        },
        {
          id: "trip",
          cost: { kind: "sneak_attack_damage_dice", dice: 1, dieSize: 6 },
          target: { maxSize: "large" },
          save: { ability: "dex" },
          onFail: { kind: "apply_condition", condition: "prone" },
        },
        {
          id: "withdraw",
          cost: { kind: "sneak_attack_damage_dice", dice: 1, dieSize: 6 },
          movement: {
            timing: "immediately_after_attack",
            distance: { kind: "half_speed" },
            opportunityAttacks: "does_not_provoke",
          },
        },
      ],
    },
  };
}

function parseExactUnitIdForTest<const Value extends string>(
  value: Value,
): Value & UnitId {
  // SAFETY: parseUnitId establishes UnitId; the assertion restores the literal
  // type erased by that parser's intentionally non-generic return type.
  return parseUnitId(value) as Value & UnitId;
}

function rogueEvasionUnit(input?: {
  readonly ability?: "dex" | "con";
}): Extract<UnitRecord, { readonly kind: "class_feature" }> {
  return {
    id: parseUnitId("rogue_evasion"),
    kind: "class_feature",
    name: "Evasion",
    className: "rogue",
    acquiredAtLevel: 7,
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Evasion",
    },
    mechanics: {
      family: "save_damage_replacement",
      trigger: {
        kind: "saving_throw_damage",
        ability: input?.ability ?? "dex",
        successDamage: "half_damage",
      },
      replacement: { onSuccess: "no_damage", onFail: "half_damage" },
      suppressedBy: [{ kind: "condition", condition: "incapacitated" }],
    },
  };
}

export function uncannyDodgeUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: parseUnitId("rogue_uncanny_dodge"),
    kind: "class_feature",
    name: "Uncanny Dodge",
    className: "rogue",
    acquiredAtLevel: 5,
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Uncanny Dodge",
    },
    mechanics: {
      family: "reaction_roll_or_damage_reduction",
      modifiers: [
        {
          kind: "attack_damage_reduction",
          trigger: {
            kind: "hit_by_attack_roll",
            requiresVisibleAttacker: true,
          },
          reduction: { kind: "half_damage", rounding: "down" },
        },
      ],
    },
  };
}

export function cuttingWordsUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: parseUnitId("bard_cutting_words"),
    kind: "class_feature",
    name: "Cutting Words",
    className: "bard",
    acquiredAtLevel: 3,
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Bard#Cutting Words",
    },
    mechanics: {
      family: "reaction_roll_or_damage_reduction",
      resource: {
        kind: "use_count",
        cap: { kind: "ability_modifier", ability: "cha" },
      },
      resetCadence: { kind: "long_rest" },
      modifiers: [
        {
          kind: "attack_roll_reduction",
          trigger: {
            kind: "creature_succeeds_attack_roll",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
        {
          kind: "damage_roll_reduction",
          trigger: {
            kind: "creature_makes_damage_roll",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
        {
          kind: "ability_check_reduction",
          trigger: {
            kind: "creature_succeeds_ability_check",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
      ],
    },
  };
}

export function cuttingWordsDamageOnlyUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = cuttingWordsUnit();
  if (unit.mechanics.family !== "reaction_roll_or_damage_reduction") {
    throw new Error("Expected Cutting Words reaction modifier mechanics.");
  }
  const damageRollModifier = unit.mechanics.modifiers.find(
    (modifier) => modifier.kind === "damage_roll_reduction",
  );
  if (damageRollModifier === undefined) {
    throw new Error("Expected Cutting Words damage-roll modifier.");
  }
  return {
    ...unit,
    id: parseUnitId("bard_cutting_words_damage_test"),
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      ...unit.mechanics,
      modifiers: [damageRollModifier],
    },
  };
}

export function cuttingWordsAttackOnlyUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = cuttingWordsUnit();
  if (unit.mechanics.family !== "reaction_roll_or_damage_reduction") {
    throw new Error("Expected Cutting Words reaction modifier mechanics.");
  }
  const attackRollModifier = unit.mechanics.modifiers.find(
    (modifier) => modifier.kind === "attack_roll_reduction",
  );
  if (attackRollModifier === undefined) {
    throw new Error("Expected Cutting Words attack-roll modifier.");
  }
  return {
    ...unit,
    id: parseUnitId("bard_cutting_words_attack_test"),
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      ...unit.mechanics,
      modifiers: [attackRollModifier],
    },
  };
}

export function unsupportedAbilityModifierActivationUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: parseUnitId("ranger_tireless_test"),
    kind: "class_feature",
    name: "Tireless Test",
    className: "ranger",
    acquiredAtLevel: 10,
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "standard_action", action: "magic" },
      resource: {
        kind: "use_count",
        cap: { kind: "ability_modifier", ability: "wis" },
      },
      resetCadence: { kind: "long_rest" },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            {
              kind: "grant_temp_hp",
              amount: {
                kind: "fixed",
                expr: {
                  dice: 1,
                  dieSize: 8,
                  abilityModifier: "wis",
                },
              },
            },
          ],
        },
      ],
    },
  };
}

export function barbarianRageUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: parseUnitId("barbarian_rage"),
    kind: "class_feature",
    name: "Rage",
    className: "barbarian",
    acquiredAtLevel: 1,
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Barbarian#Rage",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "bonus_action" },
      ongoingFeature: {
        activationTiming: "activation_cost",
        lifecycle: {
          kind: "round_extended",
          initialExpiration: "end_of_next_turn",
          earlyEndConditions: ["incapacitated"],
          earlyEndArmorCategories: ["heavy"],
          extensionTriggers: [
            "attack_roll_against_enemy",
            "bonus_action",
            "enemy_saving_throw",
          ],
          maximumDuration: { unit: "minute", amount: 10 },
        },
        concentrationEffect: "break_and_prevent",
        actionRestrictions: ["spellcasting"],
        levelOverrides: [
          {
            atClassLevel: 15,
            lifecycle: {
              kind: "fixed_duration",
              duration: { unit: "minute", amount: 10 },
              earlyEndConditions: ["unconscious"],
              earlyEndArmorCategories: ["heavy"],
            },
          },
        ],
      },
      resource: {
        kind: "use_count",
        cap: {
          kind: "threshold_tiers",
          axis: "class",
          base: 2,
          tiers: [
            { atLevel: 3, value: 3 },
            { atLevel: 6, value: 4 },
            { atLevel: 12, value: 5 },
            { atLevel: 17, value: 6 },
          ],
        },
      },
      resetCadence: { kind: "partial_short_full_long", shortRestRefill: 1 },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            { kind: "grant_resistance", damageType: "bludgeoning" },
            { kind: "grant_resistance", damageType: "piercing" },
            { kind: "grant_resistance", damageType: "slashing" },
            {
              kind: "modify_damage_numeric",
              delta: {
                kind: "threshold_tiers",
                axis: "class",
                base: 2,
                tiers: [
                  { atLevel: 9, value: 3 },
                  { atLevel: 16, value: 4 },
                ],
                sign: "+",
              },
              abilityFilter: ["str"],
            },
          ],
        },
      ],
    },
  };
}

function barbarianRecklessAttackUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: parseUnitId("barbarian_reckless_attack"),
    kind: "class_feature",
    name: "Reckless Attack",
    className: "barbarian",
    acquiredAtLevel: 2,
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Barbarian#Reckless Attack",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "free" },
      ongoingFeature: {
        activationTiming: "first_attack_roll",
        lifecycle: {
          kind: "turn_boundary",
          initialExpiration: "start_of_next_turn",
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
        },
        actionRestrictions: [],
      },
      usageLimit: { kind: "once_per_turn" },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              affects: "self_roll",
              on: ["attack_roll"],
              abilityFilter: ["str"],
            },
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              affects: "rolls_against_self",
              on: ["attack_roll"],
            },
          ],
        },
      ],
    },
  };
}

export function unsupportedClassRiderResource(
  unitId: string,
  name: string,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = actionSurgeWithAdditionalDirectEffect();
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected class feature resource Unit.");
  }
  return {
    unit: { ...unit, id: parseUnitId(unitId), name },
  };
}

export function actionSurgeWithAdditionalDirectEffect(): UnitRecord {
  const unit = unitLibrary.requireUnit("fighter_action_surge");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "activation") {
    throw new Error("Expected Action Surge activation Unit.");
  }
  const phase = unit.mechanics.phases[0];
  if (phase?.kind !== "direct" || phase.effects === undefined) {
    throw new Error("Expected Action Surge direct phase.");
  }
  return {
    ...unit,
    mechanics: {
      ...unit.mechanics,
      phases: [
        {
          ...phase,
          effects: duplicateRuntimeDirectEffects(phase.effects, "Action Surge"),
        },
      ],
    },
  };
}

export function secondWindWithAdditionalDirectEffect(): UnitRecord {
  const unit = unitLibrary.requireUnit("fighter_second_wind");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "activation") {
    throw new Error("Expected Second Wind activation Unit.");
  }
  const phase = unit.mechanics.phases[0];
  if (phase?.kind !== "direct" || phase.effects === undefined) {
    throw new Error("Expected Second Wind direct phase.");
  }
  return {
    ...unit,
    mechanics: {
      ...unit.mechanics,
      phases: [
        {
          ...phase,
          effects: duplicateRuntimeDirectEffects(phase.effects, "Second Wind"),
        },
      ],
    },
  };
}

function duplicateRuntimeDirectEffects(
  effects: readonly AreaDirectEffectAtom[],
  unitName: string,
): readonly [EffectAtom, ...EffectAtom[]] {
  const runtimeEffects = effects.flatMap((effect): readonly EffectAtom[] =>
    isEffectAtom(effect) ? [effect] : [],
  );
  const duplicatedEffect = runtimeEffects.at(0);
  if (
    runtimeEffects.length !== effects.length ||
    duplicatedEffect === undefined
  ) {
    throw new Error(`Expected ${unitName} direct EffectAtom phase.`);
  }
  return [duplicatedEffect, ...runtimeEffects];
}

export function wizardVsSkeletonBattle(input?: {
  readonly extraCombatants?: readonly BattleCreatureInit[];
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle-wizard-skeleton"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
      skeletonCreatureInit({ initiative: 10 }),
      ...(input?.extraCombatants ?? []),
    ],
  });
}

export function wizardVsRogueBattle(input: {
  readonly evasion: boolean;
  readonly saveDamageReplacementSupport?: boolean;
  readonly evasionAbility?: "dex" | "con";
}): BattleState {
  const supportEvasion =
    input.evasion && input.saveDamageReplacementSupport !== false;
  return startBattleRight({
    battleId: battleId("battle-wizard-rogue"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [dexHalfDamageCantrip()],
          preparedSpells: [],
        }),
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: input.evasion ? "Evasive Rogue" : "Rogue",
        initiative: 10,
        classLevels: [{ className: "rogue", level: 7 }],
        attack: null,
        unitFeatures: input.evasion
          ? [
              input.evasionAbility === undefined
                ? evasionFeature()
                : evasionFeature({ ability: input.evasionAbility }),
            ]
          : [],
        characterUnitRefs: supportEvasion
          ? [
              {
                unit: unitLibrary.requireUnit("rogue_evasion"),
                supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
              },
            ]
          : [],
      }),
    ],
  });
}

export function wizardSpellcasting(input?: {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
  readonly invocationSpellAccesses?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"]
  >["invocationSpellAccesses"];
  readonly bookOfShadowsSpellAccesses?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"]
  >["bookOfShadowsSpellAccesses"];
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
> {
  return {
    spellcastingSource: {
      tag: "classSpellcasting",
      className: "wizard",
      abilityModifier: 3,
    },
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: input?.cantrips ?? [
      spellRecord("ray_of_frost"),
      spellRecord("acid_splash"),
    ],
    preparedSpells: input?.preparedSpells ?? [spellRecord("magic_missile")],
    featurePreparedSpells: [],
    spellAccesses: [],
    spellbookRitualSpellAccesses: [],
    ...(input?.bookOfShadowsSpellAccesses === undefined
      ? {}
      : { bookOfShadowsSpellAccesses: input.bookOfShadowsSpellAccesses }),
    invocationSpellAccesses: input?.invocationSpellAccesses ?? [],
    spellSlots: input?.spellSlots ?? [{ spellLevel: 1, count: 2 }],
  };
}

function dexHalfDamageCantrip(): SpellRecord {
  const spell = spellRecord("acid_splash");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Acid Splash activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected Acid Splash save-gate phase.");
  }
  return {
    ...spell,
    id: parseUnitId("dex_half_cantrip"),
    name: "Dex Half Cantrip",
    mechanics: {
      ...spell.mechanics,
      phases: [
        {
          ...phase,
          onSuccess: { kind: "half_damage" },
        },
      ],
    },
  };
}

export function acidSplashWithRadius(radiusFeet: number): SpellRecord {
  const phase = acidSplashInput.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.shape.kind !== "sphere"
  ) {
    throw new Error("Expected Acid Splash point-origin Sphere phase.");
  }
  const decoded = decodeUnitRecordSync({
    ...acidSplashInput,
    mechanics: {
      ...acidSplashInput.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: {
              ...phase.attachment.value,
              shape: {
                ...phase.attachment.value.shape,
                radiusFeet,
              },
            },
          },
        },
      ],
    },
  });
  if (decoded.kind !== "spell") {
    throw new Error("Expected Acid Splash spell fixture.");
  }
  return decoded;
}

export function slotAttackDamageSpell(input?: {
  readonly id?: string;
  readonly name?: string;
  readonly axis?: "character" | "slot";
}): SpellRecord {
  const spell = spellRecord("ray_of_frost");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Ray of Frost activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "attack_roll") {
    throw new Error("Expected Ray of Frost spell attack phase.");
  }
  const damageEffect = phase.onHit[0];
  if (damageEffect?.kind !== "damage") {
    throw new Error("Expected Ray of Frost damage effect.");
  }
  return {
    ...spell,
    id: parseUnitId(input?.id ?? "slot_attack_damage"),
    name: input?.name ?? "Slot Attack Damage",
    mechanics: {
      ...spell.mechanics,
      level: 1,
      phases: [
        {
          ...phase,
          onHit: [
            {
              ...damageEffect,
              amount: {
                kind: "linear_per_level",
                axis: input?.axis ?? "slot",
                startingAtLevel: 1,
                base: { dice: 2, dieSize: 8 },
                perLevel: { dice: 1 },
              },
            },
          ],
        },
      ],
    },
  };
}

export function slotSaveDamageSpell(): SpellRecord {
  const spell = spellRecord("acid_splash");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Acid Splash activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate" || phase.onFail.kind !== "damage") {
    throw new Error("Expected Acid Splash save-gate damage phase.");
  }
  return {
    ...spell,
    id: parseUnitId("slot_save_damage"),
    name: "Slot Save Damage",
    mechanics: {
      ...spell.mechanics,
      level: 1,
      phases: [
        {
          ...phase,
          onFail: {
            ...phase.onFail,
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              startingAtLevel: 1,
              base: { dice: 2, dieSize: 6 },
              perLevel: { dice: 1 },
            },
          },
        },
      ],
    },
  };
}

export function spellRecord(spellId: string): SpellRecord {
  const parsedSpellId = parseUnitId(spellId);
  const unit =
    testSpellRecords.get(parsedSpellId) ??
    Option.getOrUndefined(unitLibrary.getUnit(parsedSpellId));
  if (unit === undefined) {
    throw new Error(`Expected ${spellId} spell Unit.`);
  }
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${spellId} to be a spell Unit.`);
  }
  return unit;
}

export function magicSubject(spellId: string): SpellProcedureSelectorForTest {
  const spell =
    spellId === "dex_half_cantrip"
      ? dexHalfDamageCantrip()
      : spellRecord(spellId);
  return {
    tag: "actionSpell",
    actorId: wizardId,
    invocation: testMagicSubjectInvocation(spell),
    mode: { tag: "cast" },
  };
}

function testMagicSubjectInvocation(spell: SpellRecord): SpellInvocationRef {
  const invocationSession = startBattleSessionRight({
    battleId: battleId(`battle-test-spell-invocation-${spell.id}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: spell.mechanics.level === 0 ? [spell] : [],
          preparedSpells: spell.mechanics.level === 0 ? [] : [spell],
          spellSlots: [
            { spellLevel: testSpellSlotLevelForSpell(spell), count: 1 },
          ],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const invocations = discoverBattleActs(invocationSession).flatMap((act) => {
    const presentation = battleActSpellPresentation(act);
    return presentation !== undefined &&
      presentation.invocation.spellId === spellId(spell.id) &&
      presentation.invocation.procedure !== "triggeredArmorDefense" &&
      act.subject.tag === "actionSpell" &&
      act.subject.mode.tag === "cast" &&
      act.subject.metamagic === undefined
      ? [presentation.invocation]
      : [];
  });
  if (invocations.length !== 1) {
    throw new Error(
      `Expected one supported test spell invocation for ${spell.id}, got ${invocations.length}.`,
    );
  }
  const invocation = invocations[0];
  if (invocation === undefined) {
    throw new Error(
      `Expected supported test spell invocation for ${spell.id}.`,
    );
  }
  return invocation;
}

function testSpellSlotLevelForSpell(spell: SpellRecord): 1 | 2 | 3 | 4 | 5 {
  const level = spell.mechanics.level;
  if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5) {
    return level;
  }
  if (level === 0) {
    return 1;
  }
  throw new Error(
    `Unsupported test spell slot level for ${spell.id}: ${level}.`,
  );
}

export function expendedLevelOneSlots(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "resolved" }
  >,
  actorId: CombatantId,
): number {
  const actor = result.state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spellcaster.");
  }
  return (
    actor.origin.spellcasting?.spellSlots.find((slot) => slot.spellLevel === 1)
      ?.expended ?? 0
  );
}

export function battleStateWithAllSpellSlotsExpended(
  state: BattleState,
  actorId: CombatantId,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "character" ||
    actor.origin.spellcasting === undefined
  ) {
    throw new Error("Expected character spell caster.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      origin: {
        ...actor.origin,
        spellcasting: {
          ...actor.origin.spellcasting,
          spellSlots: actor.origin.spellcasting.spellSlots.map((slot) => ({
            ...slot,
            expended: slot.count,
          })),
        },
      },
    }),
  };
}

export {
  abilityModifier,
  applyBattleHitPointDamage,
  applyCondition,
  applyWeaponMasterySapOnHit,
  armorClass,
  armorOfShadowsSpellInvocationRef,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  attackBonus,
  BATTLE_READIED_SPELL_TRIGGERS,
  battleAbilityModifier,
  battleAreaId,
  battleBonusActionStandardActionSupportForUnit,
  BattleFillSchema,
  BattleHoleSchema,
  battleId,
  battleObjectId,
  battleObscurementZones,
  battleReactionRollOrDamageReductionSupportForUnit,
  BattleSnapshotSchema,
  BattleCheckpointFrontierEnvelopeSchema,
  BattleSubjectSchema,
  battleCheckpointFrontierEnvelope,
  battleFrontierInterruptDecision,
  battleFrontierInterruptDecisionForState,
  battleTablePositionId,
  battleUnitSupportProfilesForUnit,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
  characterBattleResourceSupportedForUnit,
  characterBattleResourceUsage,
  spellAccessFreeCastSpellInvocationRef,
  combatantCanSee,
  combatantId,
  concentrationSavingThrowDc,
  damageAmount,
  decodeUnitRecordSync,
  defaultArmorClassState,
  DieRollResult,
  difficultyClass,
  discoverBattleActCandidates,
  discoverBattleActs,
  Result,
  elapsedTimeTicks,
  endTurn,
  spawnedCompanionFormEligibilityForSpell,
  spawnedCompanionInput,
  hasCondition,
  holeId,
  holeInstanceKey,
  Hp,
  initiativeScore,
  KNOCKED_OUT_UNCONSCIOUS,
  movementDeltaFeet,
  movementFeet,
  objectInvisibleBenefitDenied,
  PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
  pactOfTheChainSpawnedCompanionFormEligibilityForSpell,
  removeCondition,
  requiredAbilityCheckRollMode,
  resolveBardicInspirationFailedD20Test,
  resolveBattleConcentrationDamage,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resolveFailedAbilityCheckResourceBoost,
  resolveSpawnedCompanionForm,
  resolvePactOfTheChainSpawnedCompanionForm,
  resolveSuccessfulAbilityCheckReactionReduction,
  resourceCount,
  sameBattleSubject,
  Schema,
  snapshotBattle,
  spellFillSet,
  spellSaveDcForCaster,
  spellSlotInvocationRef,
  startBattle,
  supportedSpellActs,
  supportedSpellInvocationMatchesRef,
  tickDurationEffects,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
};

export type {
  ActiveOngoingFeatureOccurrence,
  BattleFill,
  BattleHole,
  BattleInterruptCheckpoint,
  BattleReadiedSpellTrigger,
  BattleRuntimeSession,
  BattleState,
  BattleSubject,
  CombatantId,
  OngoingFeatureSourceKey,
};
