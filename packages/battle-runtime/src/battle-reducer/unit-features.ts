// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-action-interdiction
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-magical-effect-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
// Unit feature discovery and resolution extracted from ../battle-reducer.ts.
// Owns unit-feature act discovery, feature command resolution, ongoing feature
// activation, failed/successful ability-check feature reactions, and self-heal
// feature holes. Mechanical move; no behavior change intended.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-area-save-damage-replacement unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-failed-d20-test unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.magic-action-area-save-damage-healing unit-feature.magic-action-healing-pool unit-feature.paladin-sacred-weapon unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.rogue-steady-aim unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
  canSpendAction,
  grantUnitActionResource,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";

import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";

import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";

import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";

import type { HoleInstanceKey } from "@dnd/shared-algebras/runtime-hole-algebra";

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import {
  characterLevel,
  difficultyClass,
  Hp,
  MovementFeet,
  proficiencyBonusForCharacterLevel,
} from "@dnd/shared/types";

import type { DiceExpr, UnitRecord } from "@dnd/surface/surface/types";

import * as Either from "effect/Either";

import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleResourceState,
} from "../character-battle-resources.ts";
import type { BattleDruidWildShapeKnownForm } from "../battle-init.ts";

import type { CharacterBattleClassLevel } from "../character-class-level.ts";

import { CombatantId } from "../identity.ts";

import {
  ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  attackActionAreaSaveDamageReplacementProfileForUnit,
  parseSupportedUnitFeatureProfile,
  type BattleUnitSupportProfile,
  type SupportedUnitFeatureProfile,
  type SupportedDruidWildShapeKnownFormProfile,
} from "../unit-feature-support.ts";

import {
  combatantCanSee,
  normalizeBattleGrapples,
  combatantWearingArmorCategory,
} from "./creature-state-leaves.ts";

import {
  activeOngoingFeatureOccurrencesForCombatant,
  combatantCanTakeActions,
  combatantCanTakeReactions,
  isCharacterBattleCreatureState,
  ongoingFeatureSourceKeyForUnit,
  statBlockLegendaryActionWindowIsOpen,
} from "./creature-state.ts";
import {
  activeDruidWildShapeEffect,
  assumeDruidWildShapeForm,
  dismissDruidWildShapeForm,
} from "./druid-wild-shape.ts";

import {
  applyBattleHitPointDamage,
  applyHpHealing,
  breakBattleConcentration,
  effectiveHitPointMaximum,
} from "./damage-apply.ts";
import { damageAmountByTypeAfterTargetAdjustments } from "./damage-helpers.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import {
  OTHER_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictionMessage,
} from "./antimagic-field-magical-effect-interdiction.ts";

import { snapshotBattle, spendReaction } from "./dispatcher.ts";
import {
  reactionModifierResourceAvailable,
  reactionReductionResourceDieRollTotal,
  spendReactionModifierResource,
} from "./reaction-modifiers.ts";

import { attackActionOptionsForActor } from "./attack-damage-apply.ts";

import {
  attackRollHitsWithCriticalThreshold,
  spellSaveDcForCaster,
  openClassFeatureExtraAttackResource,
  spendAttackActionResource,
} from "./attack-resolution.ts";

import { needsHolesResult } from "./hole-helpers.ts";

import {
  activeOngoingFeatureOccurrenceFromProfile,
  extendOngoingFeatureToEndOfNextTurn,
  ongoingFeatureLifecycleHasExtensionTrigger,
} from "./ongoing-feature-helpers.ts";

import { invalidResult } from "./result-helpers.ts";
import { scoreModifier } from "./domain-helpers.ts";
import { combatantInsideActiveAntimagicFieldAura } from "./antimagic-field-action-interdiction.ts";
import { combatantShapeShiftingSuppressed } from "./shape-shifting.ts";
import {
  validateWildShapeEquipmentDispositionFill,
  wildShapeAllMergedEquipmentDisposition,
  wildShapeLoadoutObjectRefs,
} from "./wild-shape-equipment.ts";

import { attackActionOptionName } from "./statblock-attacks.ts";

import { attackTargetHole } from "./hole-helpers.ts";
import { statBlockResourceState } from "./statblock.ts";

import type {
  AvailableBattleAct,
  BardicInspirationFailedD20TestResolutionInput,
  BardicInspirationFailedD20TestResolutionResult,
  BattleCreatureState,
  BattleFill,
  BattleWildShapeEquipmentDispositionHole,
  BattleHitPointHealingPoolDistributionHole,
  BattleHoleId,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
  BattleState,
  BattleTargetChoiceHole,
  BattleTargetSpatialFact,
  BattleUnitFeatureRollHole,
  BattleUnitFeatureSavingThrowOutcomeHole,
  CharacterBattleCreatureState,
  DruidWildShapeBattleResolutionInput,
  FailedAbilityCheckResourceBoostResolutionInput,
  FailedAbilityCheckResourceBoostResolutionResult,
  SuccessfulAbilityCheckReactionReductionResolutionInput,
  SuccessfulAbilityCheckReactionReductionResolutionResult,
  UnitFeatureBattleResolutionInput,
  UnitFeatureHeldWeaponActivationBattleResolutionInput,
  UnitFeatureRolledDiceFill,
} from "../battle-reducer.ts";

const WILD_SHAPE_EQUIPMENT_DISPOSITION_PROTOCOL =
  "druid-wild-shape-equipment-disposition";

export function supportedUnitFeatureActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return [];
  }
  const noActionActs = paladinSacredWeaponDismissActs(actor);
  if (!combatantCanTakeActions(actor)) {
    return noActionActs;
  }

  const classLevels = actor.origin.classLevels;
  const resourceActs = actor.origin.resources.flatMap<AvailableBattleAct>(
    (resource) => {
      const unitFeature = supportedUnitFeatureProfileForResource(
        actor,
        resource,
        classLevels,
      );
      if (
        unitFeature?.kind === "extraActionGrant" &&
        resourceHasUsesRemaining(resource) &&
        !resource.usedThisTurn
      ) {
        return [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId,
              unitId: unitFeature.unit.id,
            },
            label: unitFeature.unit.name,
            summary: "Grant one additional non-Magic action this turn.",
            initialHoles: [],
          },
        ];
      }

      if (
        unitFeature?.kind === "ongoingFeature" &&
        unitFeature.activationTrigger === "bonusAction" &&
        ongoingFeatureIsAvailable(state, actor, resource, unitFeature)
      ) {
        return [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId,
              unitId: unitFeature.unit.id,
            },
            label: unitFeature.unit.name,
            summary: "Activate an ongoing feature occurrence.",
            initialHoles: [],
          },
        ];
      }

      if (
        unitFeature?.kind === "bardicInspirationGrant" &&
        resourceHasUsesRemaining(resource) &&
        state.currentTurnResources.currentHasBonusAction &&
        bardicInspirationGrantTargetChoices(state, actorId).length > 0
      ) {
        return [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId,
              unitId: unitFeature.unit.id,
            },
            label: unitFeature.unit.name,
            summary:
              "Spend a Bonus Action and one use to grant one Bardic Inspiration die.",
            initialHoles: [
              bardicInspirationGrantTargetHole(state, actorId, unitFeature),
            ],
          },
        ];
      }

      if (
        unitFeature?.kind === "druidWildShapeKnownForm" &&
        state.currentTurnResources.currentHasBonusAction
      ) {
        return druidWildShapeActsForResource(
          state,
          actor,
          resource,
          unitFeature,
        );
      }

      return unitFeature?.kind === "selfBonusActionHealing" &&
        resourceHasUsesRemaining(resource) &&
        state.currentTurnResources.currentHasBonusAction
        ? [
            {
              subject: {
                tag: "unitFeature" as const,
                actorId,
                unitId: unitFeature.unit.id,
              },
              label: unitFeature.unit.name,
              summary: "Spend a Bonus Action and one use to regain Hit Points.",
              initialHoles: [selfBonusActionHealingRollHole(unitFeature)],
            },
          ]
        : [];
    },
  );
  return [
    ...resourceActs,
    ...attackActionAreaSaveDamageReplacementActs(state, actor),
    ...magicActionHealingPoolActs(state, actor),
    ...magicActionAreaSaveDamageHealingActs(state, actor),
    ...paladinSacredWeaponActs(state, actor),
    ...noActionActs,
    ...rogueSteadyAimActs(state, actor),
  ];
}

function attackActionAreaSaveDamageReplacementActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  if (!canSpendAction(state.currentTurnResources, "attack")) {
    return [];
  }
  return actor.origin.resources.flatMap(
    (resource): readonly AvailableBattleAct[] => {
      const unitFeature =
        attackActionAreaSaveDamageReplacementProfileForResource(
          actor,
          resource,
        );
      return unitFeature !== null && resourceHasUsesRemaining(resource)
        ? [
            {
              subject: {
                tag: "unitFeature" as const,
                actorId: actor.combatantId,
                unitId: unitFeature.unit.id,
              },
              label: unitFeature.unit.name,
              summary:
                "Replace one Attack action attack and spend one use to resolve area Saving Throws and damage.",
              initialHoles: [
                attackActionAreaSaveDamageReplacementSavingThrowHole(
                  state,
                  actor,
                  unitFeature,
                ),
              ],
            },
          ]
        : [];
    },
  );
}

function magicActionHealingPoolActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    combatantInsideActiveAntimagicFieldAura(state, actor.combatantId)
  ) {
    return [];
  }
  return [...actor.origin.magicActionHealingPoolProfiles.values()].flatMap(
    (unitFeature): readonly AvailableBattleAct[] => {
      const resource = actor.origin.resources.find(
        (candidate) =>
          candidate.unit.id === unitFeature.healingPool.spends.resourceUnitId,
      );
      const choices = magicActionHealingPoolTargetChoices(
        state,
        actor.combatantId,
        unitFeature,
      );
      return resource !== undefined &&
        resourceHasUsesRemaining(resource) &&
        choices.length > 0
        ? [
            {
              subject: {
                tag: "unitFeature" as const,
                actorId: actor.combatantId,
                unitId: unitFeature.unit.id,
              },
              label: unitFeature.unit.name,
              summary:
                "Spend a Magic Action and one resource use to distribute Hit Point healing among Bloodied creatures.",
              initialHoles: [
                magicActionHealingPoolDistributionHole(
                  state,
                  actor.combatantId,
                  unitFeature,
                ),
              ],
            },
          ]
        : [];
    },
  );
}

function magicActionAreaSaveDamageHealingActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    spellSaveDcForCaster(state, actor.combatantId) === null ||
    combatantInsideActiveAntimagicFieldAura(state, actor.combatantId)
  ) {
    return [];
  }
  return [
    ...actor.origin.magicActionAreaSaveDamageHealingProfiles.values(),
  ].flatMap((unitFeature): readonly AvailableBattleAct[] => {
    const resource = actor.origin.resources.find(
      (candidate) =>
        candidate.unit.id === unitFeature.damageHealing.spends.resourceUnitId,
    );
    return resource !== undefined && resourceHasUsesRemaining(resource)
      ? [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId: actor.combatantId,
              unitId: unitFeature.unit.id,
            },
            label: unitFeature.unit.name,
            summary:
              "Spend a Magic Action and one resource use to resolve area Saving Throws, Necrotic damage, and Hit Point healing.",
            initialHoles: magicActionAreaSaveDamageHealingHoles(
              state,
              actor.combatantId,
              unitFeature,
            ),
          },
        ]
      : [];
  });
}

type SacredWeaponHeldMeleeWeapon = {
  readonly itemId: string;
  readonly attackName: string;
};

function paladinSacredWeaponActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  if (!canSpendAction(state.currentTurnResources, "attack")) {
    return [];
  }
  return [...actor.origin.paladinSacredWeaponProfiles.values()].flatMap(
    (unitFeature) => {
      const resource = actor.origin.resources.find(
        (candidate) =>
          candidate.unit.id === unitFeature.sacredWeapon.spends.resourceUnitId,
      );
      if (resource === undefined || !resourceHasUsesRemaining(resource)) {
        return [];
      }
      return sacredWeaponHeldMeleeWeapons(actor).map((weapon) => ({
        subject: {
          tag: "unitFeatureHeldWeaponActivation" as const,
          actorId: actor.combatantId,
          unitId: unitFeature.unit.id,
          weaponItemId: weapon.itemId,
        },
        label: `${unitFeature.unit.name}: ${weapon.attackName}`,
        summary:
          "Spend the Attack action and one Channel Divinity use to imbue this held Melee weapon.",
        initialHoles: [],
      }));
    },
  );
}

function paladinSacredWeaponDismissActs(
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  const activeUnitIds = new Set(
    actor.activeEffects.flatMap((effect) =>
      effect.kind === "paladinSacredWeapon" &&
      effect.sourceCombatantId === actor.combatantId
        ? [effect.sourceUnitId]
        : [],
    ),
  );
  return [...activeUnitIds].flatMap((unitId) => {
    const unitFeature = actor.origin.paladinSacredWeaponProfiles.get(unitId);
    return unitFeature === undefined
      ? []
      : [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId: actor.combatantId,
              unitId: unitFeature.unit.id,
            },
            label: `${unitFeature.unit.name}: Dismiss`,
            summary: "End the active Sacred Weapon effect.",
            initialHoles: [],
          },
        ];
  });
}

function sacredWeaponHeldMeleeWeapons(
  actor: CharacterBattleCreatureState,
): readonly SacredWeaponHeldMeleeWeapon[] {
  const weapons: SacredWeaponHeldMeleeWeapon[] = [];
  const main = actor.origin.selectedLoadout.weapon;
  if (
    main !== undefined &&
    actor.origin.attack?.kind === "weapon" &&
    actor.origin.attack.weapon.id === main.unitId &&
    actor.origin.attack.weapon.usage === "melee"
  ) {
    weapons.push({
      itemId: main.itemId,
      attackName: attackActionOptionName(actor.origin.attack),
    });
  }
  const offHand = actor.origin.selectedLoadout.offHandWeapon;
  if (
    offHand !== undefined &&
    actor.origin.offHandAttack?.kind === "weapon" &&
    actor.origin.offHandAttack.weapon.id === offHand.unitId &&
    actor.origin.offHandAttack.weapon.usage === "melee"
  ) {
    weapons.push({
      itemId: offHand.itemId,
      attackName: attackActionOptionName(actor.origin.offHandAttack),
    });
  }
  return weapons;
}

function rogueSteadyAimActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  if (
    !state.currentTurnResources.currentHasBonusAction ||
    Number(actor.movementSpentFeet) > 0
  ) {
    return [];
  }
  return [...actor.origin.rogueSteadyAimProfiles.values()].map(
    (unitFeature) => ({
      subject: {
        tag: "unitFeature" as const,
        actorId: actor.combatantId,
        unitId: unitFeature.unit.id,
      },
      label: unitFeature.unit.name,
      summary:
        "Spend a Bonus Action to gain Advantage on the next attack roll this turn and set Speed to 0.",
      initialHoles: [],
    }),
  );
}

export function druidWildShapeActsForResource(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: SupportedDruidWildShapeKnownFormProfile,
): readonly AvailableBattleAct[] {
  const assumeActs =
    resourceHasUsesRemaining(resource) &&
    !combatantShapeShiftingSuppressed(state, actor.combatantId)
      ? (actor.origin.druidWildShapeKnownForms ?? []).map((form) => ({
          subject: {
            tag: "druidWildShape" as const,
            actorId: actor.combatantId,
            unitId: unitFeature.unit.id,
            action: "assumeForm" as const,
            formStatBlockId: form.id,
          },
          label: `${unitFeature.unit.name}: ${form.statBlock.displayName}`,
          summary:
            "Spend a Bonus Action and one use to assume this known Beast form.",
          initialHoles: wildShapeInitialEquipmentDispositionHoles(actor, form),
        }))
      : [];
  const dismissAct =
    activeDruidWildShapeEffect(actor) === null
      ? []
      : [
          {
            subject: {
              tag: "druidWildShape" as const,
              actorId: actor.combatantId,
              unitId: unitFeature.unit.id,
              action: "dismiss" as const,
            },
            label: `${unitFeature.unit.name}: Dismiss`,
            summary: "Spend a Bonus Action to dismiss the active Beast form.",
            initialHoles: [],
          },
        ];
  return [...assumeActs, ...dismissAct];
}

function wildShapeInitialEquipmentDispositionHoles(
  actor: CharacterBattleCreatureState,
  form: BattleDruidWildShapeKnownForm,
): readonly BattleWildShapeEquipmentDispositionHole[] {
  const candidates = wildShapeLoadoutObjectRefs(actor.origin.selectedLoadout);
  return candidates.length === 0
    ? []
    : [
        wildShapeEquipmentDispositionHole({
          actorId: actor.combatantId,
          formStatBlockId: form.id,
          candidates,
        }),
      ];
}

function wildShapeEquipmentDispositionHole(input: {
  readonly actorId: CombatantId;
  readonly formStatBlockId: BattleWildShapeEquipmentDispositionHole["formStatBlockId"];
  readonly candidates: BattleWildShapeEquipmentDispositionHole["candidates"];
}): BattleWildShapeEquipmentDispositionHole {
  const protocolId = wildShapeEquipmentDispositionProtocolId(input);
  return {
    holeInstanceKey: holeInstanceKey(protocolId),
    holeId: holeId(protocolId),
    kind: "wildShapeEquipmentDisposition",
    label: "Druid Wild Shape equipment disposition",
    actorId: input.actorId,
    formStatBlockId: input.formStatBlockId,
    candidates: input.candidates,
  };
}

function wildShapeEquipmentDispositionProtocolId(input: {
  readonly actorId: CombatantId;
  readonly formStatBlockId: BattleWildShapeEquipmentDispositionHole["formStatBlockId"];
}): string {
  return `${WILD_SHAPE_EQUIPMENT_DISPOSITION_PROTOCOL}:${encodeURIComponent(
    input.actorId,
  )}:${encodeURIComponent(input.formStatBlockId)}`;
}

export function supportedUnitFeatureProfileForResource(
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  classLevels: readonly CharacterBattleClassLevel[],
): SupportedUnitFeatureProfile | null {
  return (
    actor.origin.ongoingFeatureProfiles.get(
      ongoingFeatureSourceKeyForUnit(resource.unit.id),
    ) ?? parseSupportedUnitFeatureProfile(resource.unit, classLevels)
  );
}

export function resolveUnitFeature(
  input: UnitFeatureBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  if (isCharacterBattleCreatureState(actor)) {
    const resource = actor.origin.resources.find(
      (candidate) => candidate.unit.id === subject.unitId,
    );

    if (resource !== undefined) {
      const unitFeature = supportedUnitFeatureProfileForResource(
        actor,
        resource,
        actor.origin.classLevels,
      );
      if (unitFeature?.kind === "extraActionGrant") {
        return resolveExtraActionGrantUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature?.kind === "selfBonusActionHealing") {
        return resolveSelfBonusActionHealingUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature?.kind === "ongoingFeature") {
        return resolveOngoingFeatureUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature?.kind === "bardicInspirationGrant") {
        return resolveBardicInspirationGrantUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
    }

    const rogueSteadyAim = actor.origin.rogueSteadyAimProfiles.get(
      subject.unitId,
    );
    const sacredWeapon = actor.origin.paladinSacredWeaponProfiles.get(
      subject.unitId,
    );
    if (sacredWeapon !== undefined) {
      return resolvePaladinSacredWeaponDismissUnitFeature(
        input,
        actor,
        sacredWeapon,
      );
    }
    if (rogueSteadyAim !== undefined) {
      return resolveRogueSteadyAimUnitFeature(input, actor, rogueSteadyAim);
    }

    const attackActionAreaSaveDamageReplacementResource =
      actor.origin.resources.find(
        (candidate) => candidate.unit.id === subject.unitId,
      );
    if (attackActionAreaSaveDamageReplacementResource !== undefined) {
      const attackActionAreaSaveDamageReplacement =
        attackActionAreaSaveDamageReplacementProfileForResource(
          actor,
          attackActionAreaSaveDamageReplacementResource,
        );
      if (attackActionAreaSaveDamageReplacement !== null) {
        return resolveAttackActionAreaSaveDamageReplacementUnitFeature(
          input,
          actor,
          attackActionAreaSaveDamageReplacementResource,
          attackActionAreaSaveDamageReplacement,
        );
      }
    }

    const magicActionHealingPool =
      actor.origin.magicActionHealingPoolProfiles.get(subject.unitId);
    if (magicActionHealingPool !== undefined) {
      return resolveMagicActionHealingPoolUnitFeature(
        input,
        actor,
        magicActionHealingPool,
      );
    }

    const magicActionAreaSaveDamageHealing =
      actor.origin.magicActionAreaSaveDamageHealingProfiles.get(subject.unitId);
    if (magicActionAreaSaveDamageHealing !== undefined) {
      return resolveMagicActionAreaSaveDamageHealingUnitFeature(
        input,
        actor,
        magicActionAreaSaveDamageHealing,
      );
    }
  }

  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Unsupported Unit feature does not accept battle fills.",
    );
  }

  return invalidResult(
    input.state,
    "staleSubject",
    "Unit feature is no longer available for the current actor.",
  );
}

export function resolveUnitFeatureHeldWeaponActivation(
  input: UnitFeatureHeldWeaponActivationBattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Held-weapon Unit feature activation does not accept battle fills.",
    );
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Held-weapon Unit feature is no longer available for the current actor.",
    );
  }
  const unitFeature = actor.origin.paladinSacredWeaponProfiles.get(
    input.subject.unitId,
  );
  if (unitFeature === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Held-weapon Unit feature is no longer selected for the current actor.",
    );
  }
  if (
    !sacredWeaponHeldMeleeWeapons(actor).some(
      (weapon) => weapon.itemId === input.subject.weaponItemId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon requires a selected held Melee weapon.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.unit.id === unitFeature.sacredWeapon.spends.resourceUnitId,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon has no Channel Divinity uses remaining.",
    );
  }
  const spentAction = spendActivationResource(
    input.state.currentTurnResources,
    {
      kind: "action",
      action: unitFeature.sacredWeapon.activationCost.action,
    },
  );
  if (Either.isLeft(spentAction)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon Attack action is no longer available.",
    );
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration({
    unit: unitFeature.sacredWeapon.duration.unit,
    amount: unitFeature.sacredWeapon.duration.amount,
  });
  if (Either.isLeft(durationTicks)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon duration is not supported by battle runtime.",
    );
  }
  const nextActor: CharacterBattleCreatureState = {
    ...actor,
    activeEffects: [
      ...actor.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "paladinSacredWeapon" &&
            effect.sourceUnitId === unitFeature.unit.id &&
            effect.sourceCombatantId === actor.combatantId
          ),
      ),
      {
        kind: "paladinSacredWeapon",
        sourceUnitId: unitFeature.unit.id,
        sourceCombatantId: actor.combatantId,
        weaponItemId: input.subject.weaponItemId,
        expiresAt: {
          kind: "duration",
          durationTicks: durationTicks.right,
        },
      },
    ],
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === resource.unit.id &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const nextState = {
    ...input.state,
    currentTurnResources: spentAction.right,
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolvePaladinSacredWeaponDismissUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "paladinSacredWeapon" }
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sacred Weapon dismissal does not accept battle fills.",
    );
  }
  const activeEffects = actor.activeEffects.filter(
    (effect) =>
      !(
        effect.kind === "paladinSacredWeapon" &&
        effect.sourceUnitId === unitFeature.unit.id &&
        effect.sourceCombatantId === actor.combatantId
      ),
  );
  if (activeEffects.length === actor.activeEffects.length) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sacred Weapon is not active for this actor.",
    );
  }
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(actor.combatantId, {
      ...actor,
      activeEffects,
    }),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveRogueSteadyAimUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "rogueSteadyAim" }
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Steady Aim does not accept battle fills.",
    );
  }
  if (Number(actor.movementSpentFeet) > 0) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Steady Aim is available only if the actor has not moved this turn.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Steady Aim Bonus Action is no longer available.",
    );
  }
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          "sourceUnitId" in effect &&
          effect.sourceUnitId === unitFeature.unit.id &&
          effect.sourceCombatantId === actor.combatantId &&
          (effect.kind === "nextAttackRollBySelf" ||
            effect.kind === "selfSpeedZero")
        ),
    ),
    {
      kind: "nextAttackRollBySelf",
      sourceUnitId: unitFeature.unit.id,
      sourceCombatantId: actor.combatantId,
      mode: unitFeature.steadyAim.attackRoll.mode,
      expiresAt: {
        kind: "endOfTurn",
        combatantId: actor.combatantId,
        round: input.state.initiative.round,
      },
    } as const,
    {
      kind: "selfSpeedZero",
      sourceUnitId: unitFeature.unit.id,
      sourceCombatantId: actor.combatantId,
      expiresAt: {
        kind: "endOfTurn",
        combatantId: actor.combatantId,
        round: input.state.initiative.round,
      },
    } as const,
  ];
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
    combatants: new Map(input.state.combatants).set(actor.combatantId, {
      ...actor,
      activeEffects,
    }),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveMagicActionHealingPoolUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
): BattleResolutionResult {
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.unit.id === unitFeature.healingPool.spends.resourceUnitId,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      `${unitFeature.unit.name} has no resource uses remaining.`,
    );
  }

  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "action",
    action: "magic",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      `${unitFeature.unit.name} Magic Action is no longer available.`,
    );
  }

  const distribution = magicActionHealingPoolDistributionFill(
    input.fills,
    unitFeature,
  );
  if (distribution.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", distribution.message);
  }
  if (distribution.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      magicActionHealingPoolDistributionHole(
        input.state,
        actor.combatantId,
        unitFeature,
      ),
    ]);
  }

  const validation = validateMagicActionHealingPoolDistribution({
    state: input.state,
    actorId: actor.combatantId,
    unitFeature,
    fill: distribution.value,
  });
  if (validation.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", validation.message);
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === unitFeature.healingPool.spends.resourceUnitId &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const combatants = new Map(input.state.combatants).set(
    actor.combatantId,
    nextActor,
  );
  for (const allocation of distribution.value.value.allocations) {
    const target = combatants.get(allocation.targetId);
    if (target !== undefined) {
      combatants.set(
        allocation.targetId,
        applyHpHealing(target, Number(allocation.hitPoints)),
      );
    }
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
    combatants,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveMagicActionAreaSaveDamageHealingUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionAreaSaveDamageHealing" }
  >,
): BattleResolutionResult {
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.unit.id === unitFeature.damageHealing.spends.resourceUnitId,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      `${unitFeature.unit.name} has no resource uses remaining.`,
    );
  }
  if (spellSaveDcForCaster(input.state, actor.combatantId) === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      `${unitFeature.unit.name} requires a spell save DC.`,
    );
  }

  const fills = magicActionAreaSaveDamageHealingFills(input.fills, unitFeature);
  if (fills.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fills.message);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "action",
    action: "magic",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      `${unitFeature.unit.name} Magic Action is no longer available.`,
    );
  }
  if (
    fills.value.savingThrows === undefined ||
    fills.value.healingTarget === undefined ||
    fills.value.damageRoll === undefined ||
    fills.value.healingRoll === undefined
  ) {
    return needsHolesResult(
      input.state,
      input.subject,
      magicActionAreaSaveDamageHealingMissingHoles({
        state: input.state,
        actorId: actor.combatantId,
        unitFeature,
        fills: fills.value,
      }),
    );
  }

  const validation = validateMagicActionAreaSaveDamageHealing({
    state: input.state,
    actorId: actor.combatantId,
    unitFeature,
    savingThrows: fills.value.savingThrows,
    healingTarget: fills.value.healingTarget,
  });
  if (validation.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", validation.message);
  }

  const actorAfterResourceSpend: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === unitFeature.damageHealing.spends.resourceUnitId &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateAfterSpend = {
    ...input.state,
    currentTurnResources: spent.right,
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      actorAfterResourceSpend,
    ),
  };
  const damageRollTotal = rolledDiceTotal(fills.value.damageRoll.value);
  const savingThrows = fills.value.savingThrows;
  const stateAfterDamage = validation.damageTargetIds.reduce<BattleState>(
    (state, targetId) => {
      const target = state.combatants.get(targetId);
      if (target === undefined) {
        return state;
      }
      const outcome = validation.outcomesByTargetId.get(targetId);
      const damageBeforeTargetAdjustments =
        outcome?.succeeded === true
          ? Math.floor(damageRollTotal / 2)
          : damageRollTotal;
      const damageAmount = damageAmountByTypeAfterTargetAdjustments(
        target,
        new Map([
          [
            unitFeature.damageHealing.damage.damageType,
            damageBeforeTargetAdjustments,
          ],
        ]),
      );
      return normalizeBattleGrapples(
        applyBattleHitPointDamage({
          state,
          target,
          damageAmount,
          deathFailuresAtZeroHp: 1,
          damageSourceId: actor.combatantId,
          spatialFacts: savingThrows.spatialFacts ?? [],
        }),
      );
    },
    stateAfterSpend,
  );
  const healingTarget = stateAfterDamage.combatants.get(
    validation.healingTargetId,
  );
  const stateAfterHealing =
    healingTarget === undefined
      ? stateAfterDamage
      : {
          ...stateAfterDamage,
          combatants: new Map(stateAfterDamage.combatants).set(
            validation.healingTargetId,
            applyHpHealing(
              healingTarget,
              rolledDiceTotal(fills.value.healingRoll.value),
            ),
          ),
        };
  return {
    tag: "resolved",
    state: stateAfterHealing,
    snapshot: snapshotBattle(stateAfterHealing),
  };
}

export function resolveDruidWildShapeUnitFeature(
  input: DruidWildShapeBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape is no longer available for the current actor.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === input.subject.unitId,
  );
  const unitFeature =
    resource === undefined
      ? null
      : supportedUnitFeatureProfileForResource(
          actor,
          resource,
          actor.origin.classLevels,
        );
  if (
    resource === undefined ||
    unitFeature?.kind !== "druidWildShapeKnownForm"
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape is no longer available for the current actor.",
    );
  }

  if (input.subject.action === "dismiss") {
    if (input.fills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Druid Wild Shape dismiss does not accept battle fills.",
      );
    }
    if (activeDruidWildShapeEffect(actor) === null) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Druid Wild Shape has no active Beast form to dismiss.",
      );
    }
    const spent = spendActivationResource(input.state.currentTurnResources, {
      kind: "bonusAction",
    });
    if (Either.isLeft(spent)) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Druid Wild Shape Bonus Action is no longer available.",
      );
    }
    const nextState = dismissDruidWildShapeForm({
      state: { ...input.state, currentTurnResources: spent.right },
      actorId: actor.combatantId,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const subject = input.subject;
  if (
    subject.action === "assumeForm" &&
    combatantShapeShiftingSuppressed(input.state, actor.combatantId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape is suppressed while the creature remains in the Moonbeam Cylinder.",
    );
  }
  if (!resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape has no uses remaining.",
    );
  }
  const form = actor.origin.druidWildShapeKnownForms?.find(
    (candidate) => candidate.id === subject.formStatBlockId,
  );
  if (form === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape form is not one of the character's known Beast forms.",
    );
  }
  const equipmentCandidates = wildShapeLoadoutObjectRefs(
    actor.origin.selectedLoadout,
  );
  const expectedEquipmentDispositionHole = wildShapeEquipmentDispositionHole({
    actorId: actor.combatantId,
    formStatBlockId: form.id,
    candidates: equipmentCandidates,
  });
  const equipmentDisposition = (() => {
    if (equipmentCandidates.length === 0) {
      return input.fills.length === 0
        ? {
            tag: "valid" as const,
            dispositions:
              wildShapeAllMergedEquipmentDisposition(equipmentCandidates),
          }
        : {
            tag: "invalid" as const,
            message:
              "Druid Wild Shape equipment disposition is not required without selected loadout equipment.",
          };
    }
    if (input.fills.length === 0) {
      return {
        tag: "needsHoles" as const,
        hole: expectedEquipmentDispositionHole,
      };
    }
    if (input.fills.length !== 1) {
      return {
        tag: "invalid" as const,
        message: "Druid Wild Shape equipment disposition must be filled once.",
      };
    }
    const fill = input.fills[0];
    if (
      fill?.kind !== "wildShapeEquipmentDisposition" ||
      fill.holeId !== expectedEquipmentDispositionHole.holeId
    ) {
      return {
        tag: "invalid" as const,
        message:
          "Druid Wild Shape equipment disposition fill must match the equipment disposition hole.",
      };
    }
    const validation = validateWildShapeEquipmentDispositionFill({
      candidates: equipmentCandidates,
      value: fill.value,
    });
    return validation.tag === "valid"
      ? {
          tag: "valid" as const,
          dispositions: validation.dispositions,
        }
      : validation;
  })();
  if (equipmentDisposition.tag === "needsHoles") {
    return {
      tag: "needsHoles",
      state: input.state,
      subject: input.subject,
      holes: [equipmentDisposition.hole],
      snapshot: snapshotBattle(input.state),
    };
  }
  if (equipmentDisposition.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      equipmentDisposition.message,
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape Bonus Action is no longer available.",
    );
  }
  const nextActor: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === subject.unitId &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateWithResourceSpend = {
    ...input.state,
    currentTurnResources: spent.right,
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  const nextState = assumeDruidWildShapeForm({
    state: stateWithResourceSpend,
    actor: nextActor,
    unitId: subject.unitId,
    form,
    equipmentDisposition: equipmentDisposition.dispositions,
    formResources: statBlockResourceState(form.statBlock),
    profile: unitFeature,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveBardicInspirationGrantUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "bardicInspirationGrant" }
  >,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (
    !resourceHasUsesRemaining(resource) ||
    !input.state.currentTurnResources.currentHasBonusAction
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bardic Inspiration is no longer available for the current actor.",
    );
  }

  const targetFill = bardicInspirationGrantTargetFill(input.fills, unitFeature);
  if (targetFill.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", targetFill.message);
  }
  if (targetFill.value === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration requires a target creature.",
    );
  }

  const target = input.state.combatants.get(targetFill.value.value);
  if (target === undefined || target.combatantId === input.subject.actorId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be another creature in this battle.",
    );
  }
  if (
    target.activeEffects.some(
      (effect) => effect.kind === "bardicInspirationDie",
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target already has a Bardic Inspiration die.",
    );
  }
  if (!bardicInspirationTargetCanPerceiveSurroundings(target)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be able to see or hear the Bard.",
    );
  }
  if (
    !bardicInspirationGrantTargetChoices(
      input.state,
      input.subject.actorId,
    ).includes(target.combatantId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be another creature in this battle.",
    );
  }
  if (
    !hasBardicInspirationRangeFact(
      targetFill.value.spatialFacts ?? [],
      input.subject.actorId,
      target.combatantId,
      unitFeature,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be within 60 feet.",
    );
  }
  if (
    !bardicInspirationTargetCanSeeOrHear(
      input.state,
      input.subject.actorId,
      target,
      targetFill.value.spatialFacts ?? [],
      unitFeature,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration target must be able to see or hear the Bard.",
    );
  }

  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bardic Inspiration is no longer available for the current actor.",
    );
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === unitFeature.spends.resourceUnitId &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const nextTarget: BattleCreatureState = {
    ...target,
    activeEffects: [
      ...target.activeEffects,
      {
        kind: "bardicInspirationDie",
        sourceUnitId: unitFeature.unit.id,
        sourceCombatantId: input.subject.actorId,
        dieSize: unitFeature.dieSize,
        expiresAt: {
          kind: "duration",
          durationTicks: unitFeature.durationTicks,
        },
      },
    ],
  };
  const combatants = new Map(input.state.combatants)
    .set(input.subject.actorId, nextActor)
    .set(target.combatantId, nextTarget);
  const nextState = {
    ...input.state,
    combatants,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveBardicInspirationFailedD20Test(
  input: BardicInspirationFailedD20TestResolutionInput,
): BardicInspirationFailedD20TestResolutionResult {
  const actor = input.state.combatants.get(input.d20Test.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bardic Inspiration is no longer available for the D20 Test actor.",
    );
  }

  const die = actor.activeEffects.find(
    (effect) => effect.kind === "bardicInspirationDie",
  );
  if (die === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bardic Inspiration is no longer available for the D20 Test actor.",
    );
  }
  if (
    !Number.isInteger(input.bardicInspirationRoll) ||
    input.bardicInspirationRoll < 1 ||
    input.bardicInspirationRoll > die.dieSize
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `Bardic Inspiration roll must be a 1d${die.dieSize} result.`,
    );
  }

  const outcome = bardicInspirationD20TestOutcome(input);
  if (outcome.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", outcome.message);
  }
  if (outcome.value.originalSucceeded) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Bardic Inspiration requires an already-failed D20 Test.",
    );
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    activeEffects: actor.activeEffects.filter(
      (effect) => effect.kind !== "bardicInspirationDie",
    ),
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.d20Test.actorId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    bardicInspirationD20Test: {
      boostedTotal: outcome.value.boostedTotal,
      boostedSucceeded: outcome.value.boostedSucceeded,
    },
  };
}

function bardicInspirationD20TestOutcome(
  input: BardicInspirationFailedD20TestResolutionInput,
):
  | {
      readonly tag: "ok";
      readonly value: {
        readonly originalSucceeded: boolean;
        readonly boostedTotal: number;
        readonly boostedSucceeded: boolean;
      };
    }
  | { readonly tag: "invalid"; readonly message: string } {
  if (input.d20Test.kind === "attackRoll") {
    if (!attackRollResultIsValid(input.d20Test.attackRoll)) {
      return {
        tag: "invalid",
        message: "Attack roll result is outside the d20 attack-roll protocol.",
      };
    }
    const criticalThreshold = input.d20Test.criticalThreshold ?? 20;
    const boostedRoll = {
      ...input.d20Test.attackRoll,
      total: input.d20Test.attackRoll.total + input.bardicInspirationRoll,
    };
    return {
      tag: "ok",
      value: {
        originalSucceeded: attackRollHitsWithCriticalThreshold(
          input.d20Test.attackRoll,
          input.d20Test.armorClass,
          criticalThreshold,
        ),
        boostedTotal: boostedRoll.total,
        boostedSucceeded: attackRollHitsWithCriticalThreshold(
          boostedRoll,
          input.d20Test.armorClass,
          criticalThreshold,
        ),
      },
    };
  }

  const boostedTotal =
    input.d20Test.originalTotal + input.bardicInspirationRoll;
  return {
    tag: "ok",
    value: {
      originalSucceeded: input.d20Test.originalTotal >= input.d20Test.dc,
      boostedTotal,
      boostedSucceeded: boostedTotal >= input.d20Test.dc,
    },
  };
}

function bardicInspirationGrantTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants]
    .filter(
      ([id, combatant]) =>
        id !== actorId &&
        !combatantHasBardicInspirationDie(combatant) &&
        bardicInspirationTargetCanPerceiveSurroundings(combatant),
    )
    .map(([id]) => id);
}

function bardicInspirationTargetCanPerceiveSurroundings(
  combatant: BattleCreatureState,
): boolean {
  return !hasCondition(combatant.conditions, "unconscious");
}

function combatantHasBardicInspirationDie(
  combatant: BattleCreatureState,
): boolean {
  return combatant.activeEffects.some(
    (effect) => effect.kind === "bardicInspirationDie",
  );
}

function bardicInspirationGrantTargetFill(
  fills: readonly BattleFill[],
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "bardicInspirationGrant" }
  >,
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "targetChoice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let target:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "targetChoice" &&
      fill.holeId === bardicInspirationGrantTargetHoleId(unitFeature)
    ) {
      if (target !== undefined) {
        return {
          tag: "invalid",
          message: "Bardic Inspiration target was filled twice.",
        };
      }
      target = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Bardic Inspiration replay holes.`,
    };
  }
  return { tag: "ok", value: target };
}

function bardicInspirationGrantTargetHole(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "bardicInspirationGrant" }
  >,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: bardicInspirationGrantTargetHoleId(unitFeature),
    holeInstanceKey: bardicInspirationGrantTargetHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} target`,
    requiresTableSpatialFact: true,
    choices: bardicInspirationGrantTargetChoices(state, actorId),
  };
}

function bardicInspirationGrantTargetHoleId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "bardicInspirationGrant" }
  >,
): BattleHoleId {
  return holeId(bardicInspirationGrantTargetProtocolId(unitFeature));
}

function bardicInspirationGrantTargetHoleInstanceKey(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "bardicInspirationGrant" }
  >,
): HoleInstanceKey {
  return holeInstanceKey(bardicInspirationGrantTargetProtocolId(unitFeature));
}

function bardicInspirationGrantTargetProtocolId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "bardicInspirationGrant" }
  >,
): string {
  return `battle:unit-feature:${unitFeature.unit.id}:target`;
}

function hasBardicInspirationRangeFact(
  facts: readonly BattleTargetSpatialFact[],
  bardId: CombatantId,
  targetId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "bardicInspirationGrant" }
  >,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "bardicInspirationTargetWithinRange" &&
      fact.bardId === bardId &&
      fact.targetId === targetId &&
      fact.unitId === unitFeature.unit.id &&
      fact.rangeFeet === unitFeature.rangeFeet,
  );
}

type MagicActionHealingPoolDistributionFill = Extract<
  BattleFill,
  { readonly kind: "hitPointHealingDistribution" }
>;

function magicActionHealingPoolDistributionFill(
  fills: readonly BattleFill[],
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
):
  | {
      readonly tag: "ok";
      readonly value: MagicActionHealingPoolDistributionFill | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let distribution: MagicActionHealingPoolDistributionFill | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "hitPointHealingDistribution" &&
      fill.holeId === magicActionHealingPoolDistributionHoleId(unitFeature)
    ) {
      if (distribution !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} healing distribution was filled twice.`,
        };
      }
      distribution = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${unitFeature.unit.name} replay holes.`,
    };
  }
  return { tag: "ok", value: distribution };
}

function validateMagicActionHealingPoolDistribution(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >;
  readonly fill: MagicActionHealingPoolDistributionFill;
}):
  | { readonly tag: "ok" }
  | { readonly tag: "invalid"; readonly message: string } {
  const allocations = input.fill.value.allocations;
  if (allocations.length === 0) {
    return {
      tag: "invalid",
      message: `${input.unitFeature.unit.name} requires at least one healing allocation.`,
    };
  }
  const seenTargets = new Set<CombatantId>();
  let spentHitPoints = 0;
  const poolHitPoints = magicActionHealingPoolSize(
    input.state,
    input.actorId,
    input.unitFeature,
  );
  for (const allocation of allocations) {
    if (seenTargets.has(allocation.targetId)) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} target was allocated healing twice.`,
      };
    }
    seenTargets.add(allocation.targetId);
    const healing = Number(allocation.hitPoints);
    if (!Number.isInteger(healing) || healing <= 0) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} allocations must restore a positive integer number of Hit Points.`,
      };
    }
    const target = input.state.combatants.get(allocation.targetId);
    if (target === undefined) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} target must be a creature in this battle.`,
      };
    }
    const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
      state: input.state,
      source: OTHER_MAGICAL_EFFECT_SOURCE,
      targetIds: [allocation.targetId],
    });
    if (antimagicInterdiction !== null) {
      return { tag: "invalid", message: antimagicInterdiction };
    }
    if (!combatantIsBloodied(target)) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} target must be Bloodied.`,
      };
    }
    if (
      allocation.targetId !== input.actorId &&
      !hasMagicActionHealingPoolRangeFact(
        input.fill.spatialFacts,
        input.actorId,
        allocation.targetId,
        input.unitFeature,
      )
    ) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} target must be within range.`,
      };
    }
    const cap = combatantHalfHitPointMaximum(target);
    if (Number(target.hp) + healing > cap) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} cannot restore a target above half its Hit Point Maximum.`,
      };
    }
    spentHitPoints += healing;
    if (spentHitPoints > poolHitPoints) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} allocations exceed the healing pool.`,
      };
    }
  }
  return { tag: "ok" };
}

function magicActionHealingPoolDistributionHole(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
): BattleHitPointHealingPoolDistributionHole {
  return {
    kind: "hitPointHealingDistribution",
    holeId: magicActionHealingPoolDistributionHoleId(unitFeature),
    holeInstanceKey:
      magicActionHealingPoolDistributionHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} healing distribution`,
    requiresTableSpatialFact: true,
    healingPool: {
      sourceCombatantId: actorId,
      unitId: unitFeature.unit.id,
      rangeFeet: unitFeature.healingPool.rangeFeet,
      poolHitPoints: Hp(
        magicActionHealingPoolSize(state, actorId, unitFeature),
      ),
      perTargetCap: unitFeature.healingPool.perTargetCap,
    },
    choices: magicActionHealingPoolTargetChoices(state, actorId, unitFeature),
  };
}

function magicActionHealingPoolDistributionHoleId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
): BattleHoleId {
  return holeId(magicActionHealingPoolDistributionProtocolId(unitFeature));
}

function magicActionHealingPoolDistributionHoleInstanceKey(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionHealingPoolDistributionProtocolId(unitFeature),
  );
}

function magicActionHealingPoolDistributionProtocolId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
): string {
  return `battle:unit-feature:${unitFeature.unit.id}:hit-point-healing-distribution`;
}

function magicActionHealingPoolTargetChoices(
  state: BattleState,
  _actorId: CombatantId,
  _unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
): readonly CombatantId[] {
  return [...state.combatants.values()]
    .filter(combatantIsBloodied)
    .filter(
      (combatant) =>
        magicalEffectTargetsInterdictionMessage({
          state,
          source: OTHER_MAGICAL_EFFECT_SOURCE,
          targetIds: [combatant.combatantId],
        }) === null,
    )
    .map((combatant) => combatant.combatantId);
}

function magicActionHealingPoolSize(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
): number {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return 0;
  }
  const unitClassName =
    "className" in unitFeature.unit ? unitFeature.unit.className : undefined;
  if (unitClassName === undefined) {
    return 0;
  }
  const classLevel =
    actor.origin.classLevels.find((level) => level.className === unitClassName)
      ?.level ?? 0;
  return Number(classLevel) * unitFeature.healingPool.pool.multiplier;
}

function combatantIsBloodied(combatant: BattleCreatureState): boolean {
  return Number(combatant.hp) <= combatantHalfHitPointMaximum(combatant);
}

function combatantHalfHitPointMaximum(combatant: BattleCreatureState): number {
  return Math.floor(Number(effectiveHitPointMaximum(combatant)) / 2);
}

function hasMagicActionHealingPoolRangeFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "magicActionHealingPool" }
  >,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "magicActionHealingPoolTargetWithinRange" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      fact.unitId === unitFeature.unit.id &&
      fact.rangeFeet === unitFeature.healingPool.rangeFeet,
  );
}

type AttackActionAreaSaveDamageReplacementProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "attackActionAreaSaveDamageReplacement" }
>;
type AttackActionAreaSaveDamageReplacementSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type AttackActionAreaSaveDamageReplacementRollFill = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>;
type AttackActionAreaSaveDamageReplacementFillSet = {
  readonly savingThrows:
    | AttackActionAreaSaveDamageReplacementSavingThrowFill
    | undefined;
  readonly damageRoll:
    | AttackActionAreaSaveDamageReplacementRollFill
    | undefined;
};

function attackActionAreaSaveDamageReplacementProfileForResource(
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
): AttackActionAreaSaveDamageReplacementProfile | null {
  const support = actor.origin.characterUnitRefs
    .find((unitRef) => unitRef.unitId === resource.unit.id)
    ?.supportProfiles.find(
      (
        profile,
      ): profile is Extract<
        BattleUnitSupportProfile,
        {
          readonly kind: typeof ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE;
        }
      > =>
        typeof profile === "object" &&
        profile.kind ===
          ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
    );
  return support === undefined
    ? null
    : attackActionAreaSaveDamageReplacementProfileForUnit({
        unit: resource.unit,
        draconicAncestryDamageType: support.breath.damage.damageType.value,
      });
}

function resolveAttackActionAreaSaveDamageReplacementUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): BattleResolutionResult {
  if (!resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      `${unitFeature.unit.name} has no uses remaining.`,
    );
  }

  const fills = attackActionAreaSaveDamageReplacementFills(
    input.fills,
    actor,
    unitFeature,
  );
  if (fills.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fills.message);
  }
  if (fills.value.savingThrows === undefined) {
    return needsHolesResult(input.state, input.subject, [
      attackActionAreaSaveDamageReplacementSavingThrowHole(
        input.state,
        actor,
        unitFeature,
      ),
    ]);
  }
  const validation = validateAttackActionAreaSaveDamageReplacementSavingThrows({
    state: input.state,
    actorId: actor.combatantId,
    unitFeature,
    savingThrows: fills.value.savingThrows,
  });
  if (validation.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", validation.message);
  }
  if (
    validation.damageTargetIds.length > 0 &&
    fills.value.damageRoll === undefined
  ) {
    return needsHolesResult(input.state, input.subject, [
      attackActionAreaSaveDamageReplacementDamageRollHole(actor, unitFeature),
    ]);
  }

  const spent = spendAttackActionResource(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      `${unitFeature.unit.name} Attack action attack is no longer available.`,
    );
  }
  const nextActor: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === unitFeature.unit.id &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateAfterSpend: BattleState = {
    ...input.state,
    currentTurnResources: openClassFeatureExtraAttackResource({
      state: {
        ...input.state,
        currentTurnResources: spent.right.state,
      },
      actorId: actor.combatantId,
      spentResource: spent.right.spentResource,
    }),
    combatants: new Map(input.state.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  if (validation.damageTargetIds.length === 0) {
    return {
      tag: "resolved",
      state: stateAfterSpend,
      snapshot: snapshotBattle(stateAfterSpend),
    };
  }
  const damageRoll = fills.value.damageRoll;
  if (damageRoll === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${unitFeature.unit.name} damage roll is required for affected targets.`,
    );
  }
  const damageRollTotal = rolledDiceTotal(damageRoll.value);
  const stateAfterDamage = validation.damageTargetIds.reduce<BattleState>(
    (state, targetId) => {
      const target = state.combatants.get(targetId);
      if (target === undefined) {
        return state;
      }
      const outcome = validation.outcomesByTargetId.get(targetId);
      const damageBeforeTargetAdjustments =
        outcome?.succeeded === true
          ? Math.floor(damageRollTotal / 2)
          : damageRollTotal;
      const damageAmount = damageAmountByTypeAfterTargetAdjustments(
        target,
        new Map([
          [
            unitFeature.breath.damage.damageType.value,
            damageBeforeTargetAdjustments,
          ],
        ]),
      );
      return normalizeBattleGrapples(
        applyBattleHitPointDamage({
          state,
          target,
          damageAmount,
          deathFailuresAtZeroHp: 1,
          damageSourceId: actor.combatantId,
          spatialFacts: fills.value.savingThrows?.spatialFacts ?? [],
        }),
      );
    },
    stateAfterSpend,
  );
  return {
    tag: "resolved",
    state: stateAfterDamage,
    snapshot: snapshotBattle(stateAfterDamage),
  };
}

function attackActionAreaSaveDamageReplacementFills(
  fills: readonly BattleFill[],
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
):
  | {
      readonly tag: "ok";
      readonly value: AttackActionAreaSaveDamageReplacementFillSet;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let savingThrows:
    | AttackActionAreaSaveDamageReplacementSavingThrowFill
    | undefined;
  let damageRoll: AttackActionAreaSaveDamageReplacementRollFill | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId ===
        attackActionAreaSaveDamageReplacementSavingThrowHoleId(unitFeature)
    ) {
      if (savingThrows !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} Saving Throw outcomes were filled twice.`,
        };
      }
      savingThrows = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        attackActionAreaSaveDamageReplacementDamageRollHoleId(unitFeature)
    ) {
      if (damageRoll !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} damage roll was filled twice.`,
        };
      }
      const validation = validateRolledDiceForDiceExpr(
        fill.value,
        attackActionAreaSaveDamageReplacementDamageDiceExpr(actor, unitFeature),
      );
      if (validation !== null) {
        return { tag: "invalid", message: validation.reason };
      }
      damageRoll = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${unitFeature.unit.name} replay holes.`,
    };
  }
  return { tag: "ok", value: { savingThrows, damageRoll } };
}

function validateAttackActionAreaSaveDamageReplacementSavingThrows(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly unitFeature: AttackActionAreaSaveDamageReplacementProfile;
  readonly savingThrows: AttackActionAreaSaveDamageReplacementSavingThrowFill;
}):
  | {
      readonly tag: "ok";
      readonly damageTargetIds: readonly CombatantId[];
      readonly outcomesByTargetId: ReadonlyMap<
        CombatantId,
        BattleSavingThrowOutcome
      >;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  if (!("area" in input.savingThrows.value)) {
    return {
      tag: "invalid",
      message: `${input.unitFeature.unit.name} requires table-supplied Cone or Line area facts.`,
    };
  }
  const area = input.savingThrows.value.area;
  if (area.originAnchorId !== input.actorId) {
    return {
      tag: "invalid",
      message: `${input.unitFeature.unit.name} area must originate from the acting creature.`,
    };
  }
  if (!input.state.combatants.has(area.originAnchorId)) {
    return {
      tag: "invalid",
      message: `${input.unitFeature.unit.name} area origin must be a combatant in this battle.`,
    };
  }
  if ("kind" in area || "sleepNonSleeperFacts" in area) {
    return {
      tag: "invalid",
      message: `${input.unitFeature.unit.name} uses plain Cone or Line area facts.`,
    };
  }
  const affectedTargetIds = new Set(area.affectedTargetIds);
  if (affectedTargetIds.size !== area.affectedTargetIds.length) {
    return {
      tag: "invalid",
      message: `${input.unitFeature.unit.name} affected targets must not duplicate targets.`,
    };
  }
  for (const targetId of affectedTargetIds) {
    if (!input.state.combatants.has(targetId)) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} affected target must be a creature in this battle.`,
      };
    }
  }
  const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
    state: input.state,
    source: OTHER_MAGICAL_EFFECT_SOURCE,
    targetIds: [...affectedTargetIds],
  });
  if (antimagicInterdiction !== null) {
    return { tag: "invalid", message: antimagicInterdiction };
  }
  const outcomesByTargetId = new Map<CombatantId, BattleSavingThrowOutcome>();
  for (const outcome of input.savingThrows.value.outcomes) {
    if (!affectedTargetIds.has(outcome.targetId)) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} Saving Throw outcomes must match the table-supplied area affected targets.`,
      };
    }
    if (outcomesByTargetId.has(outcome.targetId)) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} Saving Throw outcomes must not duplicate targets.`,
      };
    }
    outcomesByTargetId.set(outcome.targetId, outcome);
  }
  return outcomesByTargetId.size === affectedTargetIds.size
    ? {
        tag: "ok",
        damageTargetIds: [...affectedTargetIds],
        outcomesByTargetId,
      }
    : {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} Saving Throw outcomes must cover every table-supplied area affected target.`,
      };
}

function attackActionAreaSaveDamageReplacementSavingThrowHole(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): BattleUnitFeatureSavingThrowOutcomeHole {
  return {
    kind: "savingThrowOutcome",
    holeId: attackActionAreaSaveDamageReplacementSavingThrowHoleId(unitFeature),
    holeInstanceKey:
      attackActionAreaSaveDamageReplacementSavingThrowHoleInstanceKey(
        unitFeature,
      ),
    label: `${unitFeature.unit.name} Cone or Line Dexterity Saving Throws`,
    unitFeature: {
      unitId: unitFeature.unit.id,
      label: unitFeature.unit.name,
    },
    ability: unitFeature.breath.save.ability,
    dc: {
      kind: "fixed",
      dc: attackActionAreaSaveDamageReplacementDc(actor, unitFeature),
    },
    targetIds: [...state.combatants.keys()].filter(
      (targetId) =>
        magicalEffectTargetsInterdictionMessage({
          state,
          source: OTHER_MAGICAL_EFFECT_SOURCE,
          targetIds: [targetId],
        }) === null,
    ),
    targetRollModes: savingThrowRollModeProjections(
      state,
      unitFeature.breath.save.ability,
    ),
    targetFlatBonuses: savingThrowFlatBonusProjections(state),
  };
}

function attackActionAreaSaveDamageReplacementDamageRollHole(
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): BattleUnitFeatureRollHole {
  const expr = attackActionAreaSaveDamageReplacementDamageDiceExpr(
    actor,
    unitFeature,
  );
  return {
    kind: "rolledDice",
    holeId: attackActionAreaSaveDamageReplacementDamageRollHoleId(unitFeature),
    holeInstanceKey:
      attackActionAreaSaveDamageReplacementDamageRollHoleInstanceKey(
        unitFeature,
      ),
    label: `${unitFeature.unit.name} damage (${diceExprLabel(expr)})`,
    unitFeature,
  };
}

function attackActionAreaSaveDamageReplacementSavingThrowHoleId(
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): BattleHoleId {
  return holeId(
    attackActionAreaSaveDamageReplacementProtocolId(
      unitFeature,
      "saving-throw-outcome",
    ),
  );
}

function attackActionAreaSaveDamageReplacementSavingThrowHoleInstanceKey(
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): HoleInstanceKey {
  return holeInstanceKey(
    attackActionAreaSaveDamageReplacementProtocolId(
      unitFeature,
      "saving-throw-outcome",
    ),
  );
}

function attackActionAreaSaveDamageReplacementDamageRollHoleId(
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): BattleHoleId {
  return holeId(
    attackActionAreaSaveDamageReplacementProtocolId(unitFeature, "damage-roll"),
  );
}

function attackActionAreaSaveDamageReplacementDamageRollHoleInstanceKey(
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): HoleInstanceKey {
  return holeInstanceKey(
    attackActionAreaSaveDamageReplacementProtocolId(unitFeature, "damage-roll"),
  );
}

function attackActionAreaSaveDamageReplacementProtocolId(
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
  part: "saving-throw-outcome" | "damage-roll",
): string {
  return `battle:unit-feature:${unitFeature.unit.id}:attack-action-area-save-damage-replacement:${part}`;
}

function attackActionAreaSaveDamageReplacementDc(
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
) {
  return difficultyClass(
    unitFeature.breath.save.dc.base +
      scoreModifier(
        actor.origin.d20Statistics.abilityScores[
          unitFeature.breath.save.dc.ability
        ],
      ) +
      Number(
        proficiencyBonusForCharacterLevel(
          characterLevel(characterTotalLevel(actor)),
        ),
      ),
  );
}

function attackActionAreaSaveDamageReplacementDamageDiceExpr(
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
): DiceExpr {
  const characterLevel = characterTotalLevel(actor);
  const dice =
    [...unitFeature.breath.damage.amount.tiers]
      .filter((tier) => characterLevel >= tier.atLevel)
      .at(-1)?.dice ?? unitFeature.breath.damage.amount.base.dice;
  return {
    dice,
    dieSize: unitFeature.breath.damage.amount.base.dieSize,
    flat: 0,
  };
}

function characterTotalLevel(actor: CharacterBattleCreatureState): number {
  return actor.origin.classLevels.reduce(
    (total, level) => total + Number(level.level),
    0,
  );
}

type MagicActionAreaSaveDamageHealingProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "magicActionAreaSaveDamageHealing" }
>;
type MagicActionAreaSaveDamageHealingSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type MagicActionAreaSaveDamageHealingTargetFill = Extract<
  BattleFill,
  { readonly kind: "targetChoice" }
>;
type MagicActionAreaSaveDamageHealingRollFill = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>;
type MagicActionAreaSaveDamageHealingFillSet = {
  readonly savingThrows:
    | MagicActionAreaSaveDamageHealingSavingThrowFill
    | undefined;
  readonly healingTarget:
    | MagicActionAreaSaveDamageHealingTargetFill
    | undefined;
  readonly damageRoll: MagicActionAreaSaveDamageHealingRollFill | undefined;
  readonly healingRoll: MagicActionAreaSaveDamageHealingRollFill | undefined;
};

function magicActionAreaSaveDamageHealingFills(
  fills: readonly BattleFill[],
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
):
  | {
      readonly tag: "ok";
      readonly value: MagicActionAreaSaveDamageHealingFillSet;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let savingThrows: MagicActionAreaSaveDamageHealingSavingThrowFill | undefined;
  let healingTarget: MagicActionAreaSaveDamageHealingTargetFill | undefined;
  let damageRoll: MagicActionAreaSaveDamageHealingRollFill | undefined;
  let healingRoll: MagicActionAreaSaveDamageHealingRollFill | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingSavingThrowHoleId(unitFeature)
    ) {
      if (savingThrows !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} Saving Throw outcomes were filled twice.`,
        };
      }
      savingThrows = fill;
      continue;
    }
    if (
      fill.kind === "targetChoice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingHealingTargetHoleId(unitFeature)
    ) {
      if (healingTarget !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} healing target was filled twice.`,
        };
      }
      healingTarget = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingDamageRollHoleId(unitFeature)
    ) {
      if (damageRoll !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} damage roll was filled twice.`,
        };
      }
      const validation = validateRolledDiceForDiceExpr(
        fill.value,
        unitFeature.damageHealing.damage.amount.expr,
      );
      if (validation !== null) {
        return { tag: "invalid", message: validation.reason };
      }
      damageRoll = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingHealingRollHoleId(unitFeature)
    ) {
      if (healingRoll !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} healing roll was filled twice.`,
        };
      }
      const validation = validateRolledDiceForDiceExpr(
        fill.value,
        unitFeature.damageHealing.healing.amount.expr,
      );
      if (validation !== null) {
        return { tag: "invalid", message: validation.reason };
      }
      healingRoll = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${unitFeature.unit.name} replay holes.`,
    };
  }
  return {
    tag: "ok",
    value: { savingThrows, healingTarget, damageRoll, healingRoll },
  };
}

function validateMagicActionAreaSaveDamageHealing(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly unitFeature: MagicActionAreaSaveDamageHealingProfile;
  readonly savingThrows: MagicActionAreaSaveDamageHealingSavingThrowFill;
  readonly healingTarget: MagicActionAreaSaveDamageHealingTargetFill;
}):
  | {
      readonly tag: "ok";
      readonly damageTargetIds: readonly CombatantId[];
      readonly healingTargetId: CombatantId;
      readonly outcomesByTargetId: ReadonlyMap<
        CombatantId,
        BattleSavingThrowOutcome
      >;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const healingTarget = input.healingTarget.value;
  const outcomes = input.savingThrows.value.outcomes;
  const outcomesByTargetId = new Map<CombatantId, BattleSavingThrowOutcome>();
  for (const outcome of outcomes) {
    if (outcomesByTargetId.has(outcome.targetId)) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} target Saving Throw was filled twice.`,
      };
    }
    if (input.state.combatants.get(outcome.targetId) === undefined) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} Saving Throw target must be a creature in this battle.`,
      };
    }
    outcomesByTargetId.set(outcome.targetId, outcome);
  }
  if (input.state.combatants.get(healingTarget) === undefined) {
    return {
      tag: "invalid",
      message: `${input.unitFeature.unit.name} healing target must be a creature in this battle.`,
    };
  }
  const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
    state: input.state,
    source: OTHER_MAGICAL_EFFECT_SOURCE,
    targetIds: [...outcomesByTargetId.keys(), healingTarget],
  });
  if (antimagicInterdiction !== null) {
    return { tag: "invalid", message: antimagicInterdiction };
  }
  const areaFact = magicActionAreaSaveDamageHealingAreaFact(
    input.savingThrows.spatialFacts ?? [],
    input.actorId,
    input.unitFeature,
  );
  if (areaFact === undefined) {
    return {
      tag: "invalid",
      message: `${input.unitFeature.unit.name} requires caller-supplied Sphere area membership.`,
    };
  }
  const areaTargetIds = new Set(areaFact.targetIds);
  for (const targetId of [...outcomesByTargetId.keys(), healingTarget]) {
    if (!areaTargetIds.has(targetId)) {
      return {
        tag: "invalid",
        message: `${input.unitFeature.unit.name} target must be in the supplied Sphere area.`,
      };
    }
  }
  return {
    tag: "ok",
    damageTargetIds: [...outcomesByTargetId.keys()],
    healingTargetId: healingTarget,
    outcomesByTargetId,
  };
}

function magicActionAreaSaveDamageHealingMissingHoles(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly unitFeature: MagicActionAreaSaveDamageHealingProfile;
  readonly fills: MagicActionAreaSaveDamageHealingFillSet;
}): readonly (
  | BattleUnitFeatureSavingThrowOutcomeHole
  | BattleTargetChoiceHole
  | BattleUnitFeatureRollHole
)[] {
  return [
    ...(input.fills.savingThrows === undefined
      ? [
          magicActionAreaSaveDamageHealingSavingThrowHole(
            input.state,
            input.actorId,
            input.unitFeature,
          ),
        ]
      : []),
    ...(input.fills.damageRoll === undefined
      ? [magicActionAreaSaveDamageHealingDamageRollHole(input.unitFeature)]
      : []),
    ...(input.fills.healingTarget === undefined
      ? [
          magicActionAreaSaveDamageHealingHealingTargetHole(
            input.state,
            input.unitFeature,
          ),
        ]
      : []),
    ...(input.fills.healingRoll === undefined
      ? [magicActionAreaSaveDamageHealingHealingRollHole(input.unitFeature)]
      : []),
  ];
}

function magicActionAreaSaveDamageHealingHoles(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): readonly [
  BattleUnitFeatureSavingThrowOutcomeHole,
  BattleUnitFeatureRollHole,
  BattleTargetChoiceHole,
  BattleUnitFeatureRollHole,
] {
  return [
    magicActionAreaSaveDamageHealingSavingThrowHole(
      state,
      actorId,
      unitFeature,
    ),
    magicActionAreaSaveDamageHealingDamageRollHole(unitFeature),
    magicActionAreaSaveDamageHealingHealingTargetHole(state, unitFeature),
    magicActionAreaSaveDamageHealingHealingRollHole(unitFeature),
  ];
}

function magicActionAreaSaveDamageHealingSavingThrowHole(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleUnitFeatureSavingThrowOutcomeHole {
  const dc = spellSaveDcForCaster(state, actorId);
  if (dc === null) {
    throw new Error("Land's Aid save hole requires a spell save DC.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: magicActionAreaSaveDamageHealingSavingThrowHoleId(unitFeature),
    holeInstanceKey:
      magicActionAreaSaveDamageHealingSavingThrowHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} Constitution Saving Throws`,
    unitFeature: {
      unitId: unitFeature.unit.id,
      label: unitFeature.unit.name,
    },
    ability: unitFeature.damageHealing.save.ability,
    dc: { kind: "fixed", dc },
    targetIds: [...state.combatants.keys()].filter(
      (targetId) =>
        magicalEffectTargetsInterdictionMessage({
          state,
          source: OTHER_MAGICAL_EFFECT_SOURCE,
          targetIds: [targetId],
        }) === null,
    ),
    targetRollModes: savingThrowRollModeProjections(
      state,
      unitFeature.damageHealing.save.ability,
    ),
    targetFlatBonuses: savingThrowFlatBonusProjections(state),
  };
}

function magicActionAreaSaveDamageHealingHealingTargetHole(
  state: BattleState,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: magicActionAreaSaveDamageHealingHealingTargetHoleId(unitFeature),
    holeInstanceKey:
      magicActionAreaSaveDamageHealingHealingTargetHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} healing target`,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter(
      (targetId) =>
        magicalEffectTargetsInterdictionMessage({
          state,
          source: OTHER_MAGICAL_EFFECT_SOURCE,
          targetIds: [targetId],
        }) === null,
    ),
  };
}

function magicActionAreaSaveDamageHealingDamageRollHole(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: magicActionAreaSaveDamageHealingDamageRollHoleId(unitFeature),
    holeInstanceKey:
      magicActionAreaSaveDamageHealingDamageRollHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} damage (${diceExprLabel(unitFeature.damageHealing.damage.amount.expr)})`,
    unitFeature,
  };
}

function magicActionAreaSaveDamageHealingHealingRollHole(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: magicActionAreaSaveDamageHealingHealingRollHoleId(unitFeature),
    holeInstanceKey:
      magicActionAreaSaveDamageHealingHealingRollHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} healing (${diceExprLabel(unitFeature.damageHealing.healing.amount.expr)})`,
    unitFeature,
  };
}

function magicActionAreaSaveDamageHealingAreaFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
):
  | Extract<
      BattleTargetSpatialFact,
      { readonly kind: "magicActionAreaSaveDamageHealingTargetsInSphere" }
    >
  | undefined {
  return facts.find(
    (
      fact,
    ): fact is Extract<
      BattleTargetSpatialFact,
      { readonly kind: "magicActionAreaSaveDamageHealingTargetsInSphere" }
    > =>
      fact.kind === "magicActionAreaSaveDamageHealingTargetsInSphere" &&
      fact.actorId === actorId &&
      fact.unitId === unitFeature.unit.id &&
      fact.originWithinRangeFeet ===
        unitFeature.damageHealing.area.origin.rangeFeet &&
      fact.radiusFeet === unitFeature.damageHealing.area.shape.radiusFeet,
  );
}

function magicActionAreaSaveDamageHealingProtocolId(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
  hole: "saving-throws" | "damage-roll" | "healing-target" | "healing-roll",
): string {
  return `battle:unit-feature:${unitFeature.unit.id}:${hole}`;
}

function diceExprLabel(expr: DiceExpr): string {
  const flat =
    expr.flat === undefined || expr.flat === 0
      ? ""
      : expr.flat > 0
        ? `+${expr.flat}`
        : `${expr.flat}`;
  const spellcastingMod = expr.spellcastingMod === true ? "+spellcasting" : "";
  const abilityModifier =
    expr.abilityModifier === undefined ? "" : `+${expr.abilityModifier}`;
  return `${expr.dice}d${expr.dieSize}${flat}${spellcastingMod}${abilityModifier}`;
}

function magicActionAreaSaveDamageHealingSavingThrowHoleId(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleHoleId {
  return holeId(
    magicActionAreaSaveDamageHealingProtocolId(unitFeature, "saving-throws"),
  );
}

function magicActionAreaSaveDamageHealingSavingThrowHoleInstanceKey(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionAreaSaveDamageHealingProtocolId(unitFeature, "saving-throws"),
  );
}

function magicActionAreaSaveDamageHealingDamageRollHoleId(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleHoleId {
  return holeId(
    magicActionAreaSaveDamageHealingProtocolId(unitFeature, "damage-roll"),
  );
}

function magicActionAreaSaveDamageHealingDamageRollHoleInstanceKey(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionAreaSaveDamageHealingProtocolId(unitFeature, "damage-roll"),
  );
}

function magicActionAreaSaveDamageHealingHealingTargetHoleId(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleHoleId {
  return holeId(
    magicActionAreaSaveDamageHealingProtocolId(unitFeature, "healing-target"),
  );
}

function magicActionAreaSaveDamageHealingHealingTargetHoleInstanceKey(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionAreaSaveDamageHealingProtocolId(unitFeature, "healing-target"),
  );
}

function magicActionAreaSaveDamageHealingHealingRollHoleId(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleHoleId {
  return holeId(
    magicActionAreaSaveDamageHealingProtocolId(unitFeature, "healing-roll"),
  );
}

function magicActionAreaSaveDamageHealingHealingRollHoleInstanceKey(
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionAreaSaveDamageHealingProtocolId(unitFeature, "healing-roll"),
  );
}

function bardicInspirationTargetCanSeeOrHear(
  state: BattleState,
  bardId: CombatantId,
  target: BattleCreatureState,
  facts: readonly BattleTargetSpatialFact[],
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "bardicInspirationGrant" }
  >,
): boolean {
  if (!bardicInspirationTargetCanPerceiveSurroundings(target)) {
    return false;
  }
  return (
    (!hasCondition(target.conditions, "blinded") &&
      combatantCanSee(state, target.combatantId, bardId)) ||
    (!hasCondition(target.conditions, "deafened") &&
      facts.some(
        (fact) =>
          fact.kind === "bardicInspirationTargetCanHear" &&
          fact.bardId === bardId &&
          fact.targetId === target.combatantId &&
          fact.unitId === unitFeature.unit.id,
      ))
  );
}

export function resolveFailedAbilityCheckResourceBoost(
  input: FailedAbilityCheckResourceBoostResolutionInput,
): FailedAbilityCheckResourceBoostResolutionResult {
  const actor = input.state.combatants.get(input.abilityCheck.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Failed ability-check resource boost is no longer available for the current actor.",
    );
  }

  const profile = actor.origin.failedAbilityCheckResourceBoostProfiles.get(
    input.unitId,
  );
  const resource = actor.origin.resources.find(
    (resource) =>
      resource.unit.id === profile?.abilityCheck.spends.resourceUnitId,
  );
  if (
    profile === undefined ||
    resource === undefined ||
    !resourceHasUsesRemaining(resource)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Failed ability-check resource boost is no longer available for the current actor.",
    );
  }

  if (
    input.boostRoll < 1 ||
    input.boostRoll > profile.abilityCheck.bonus.dieSize ||
    !Number.isInteger(input.boostRoll)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} boost roll must be a 1d10 result.`,
    );
  }

  if (input.abilityCheck.originalTotal >= input.abilityCheck.dc) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires an already-failed ability check.`,
    );
  }

  const boostedTotal = input.abilityCheck.originalTotal + input.boostRoll;
  const boostedSucceeded = boostedTotal >= input.abilityCheck.dc;
  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((resource) =>
        boostedSucceeded &&
        resource.unit.id === profile.abilityCheck.spends.resourceUnitId &&
        resourceHasUsesRemaining(resource)
          ? spendCharacterResourceUse(resource)
          : resource,
      ),
    },
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.abilityCheck.actorId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    abilityCheckBoost: {
      boostedTotal,
      boostedSucceeded,
    },
  };
}

export function resolveSuccessfulAbilityCheckReactionReduction(
  input: SuccessfulAbilityCheckReactionReductionResolutionInput,
): SuccessfulAbilityCheckReactionReductionResolutionResult {
  const reactor = input.state.combatants.get(input.reactorId);
  const target = input.state.combatants.get(input.abilityCheck.actorId);
  if (!isCharacterBattleCreatureState(reactor) || target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ability-check Reaction reduction is no longer available.",
    );
  }

  const profile = reactor.origin.reactionRollOrDamageReductionProfiles.get(
    input.unitId,
  );
  const modifier = profile?.modifiers.find(
    (candidate) => candidate.kind === "abilityCheckReduction",
  );
  if (
    profile === undefined ||
    modifier === undefined ||
    !combatantCanTakeReactions(reactor) ||
    !reactionModifierResourceAvailable(
      input.state,
      input.reactorId,
      profile,
      modifier,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ability-check Reaction reduction is no longer available.",
    );
  }

  if (input.abilityCheck.originalTotal < input.abilityCheck.dc) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires an already-successful ability check.`,
    );
  }

  if (
    modifier.requiresVisibleCreature &&
    !combatantCanSee(input.state, input.reactorId, input.abilityCheck.actorId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires a visible creature.`,
    );
  }

  if (
    !hasReactionRollOrDamageReductionRangeFact(
      input.abilityCheck.targetSpatialFacts,
      input.reactorId,
      input.abilityCheck.actorId,
      input.unitId,
      modifier.rangeFeet,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} requires the creature to be within range.`,
    );
  }

  const reductionTotal = reactionReductionResourceDieRollTotal({
    reduction: modifier.reduction,
    rollTotal: input.reductionRoll,
  });
  if (reductionTotal.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      `${profile.unit.name} ${reductionTotal.message}`,
    );
  }

  const reducedTotal = input.abilityCheck.originalTotal - reductionTotal.value;
  const reducedSucceeded = reducedTotal >= input.abilityCheck.dc;
  const spentState = spendReactionModifierResource(
    spendReaction(input.state, input.reactorId),
    input.reactorId,
    {
      kind: "abilityCheckReduction",
      unitId: profile.unit.id,
      label: profile.unit.name,
      reduction: {
        kind: "rolled",
        dice: modifier.reduction.dice,
        flatModifier: modifier.reduction.flatModifier,
        dieSize: modifier.reduction.dieSize,
        spends: modifier.reduction.spends,
      },
    },
  );

  return {
    tag: "resolved",
    state: spentState,
    snapshot: snapshotBattle(spentState),
    abilityCheckReduction: {
      reducedTotal,
      reducedSucceeded,
    },
  };
}

export function hasReactionRollOrDamageReductionRangeFact(
  facts: readonly BattleTargetSpatialFact[],
  reactorId: CombatantId,
  targetId: CombatantId,
  unitId: UnitRecord["id"],
  rangeFeet: MovementFeet,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "reactionRollOrDamageReductionTargetWithinRange" &&
      fact.reactorId === reactorId &&
      fact.targetId === targetId &&
      fact.unitId === unitId &&
      fact.rangeFeet === rangeFeet,
  );
}

export function resolveExtraActionGrantUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "extraActionGrant" }
  >,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }

  if (!resourceHasUsesRemaining(resource) || resource.usedThisTurn) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const granted = grantUnitActionResource(
    input.state.currentTurnResources,
    input.subject.actorId,
    input.subject.unitId,
    unitFeature.restriction,
  );
  if (Either.isLeft(granted)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This Unit feature has already granted an action this turn.",
    );
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === input.subject.unitId &&
        resourceHasUsesRemaining(candidate)
          ? {
              ...spendCharacterResourceUse(candidate),
              usedThisTurn: true,
            }
          : candidate,
      ),
    },
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: granted.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSelfBonusActionHealingUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleResolutionResult {
  if (
    !resourceHasUsesRemaining(resource) ||
    !input.state.currentTurnResources.currentHasBonusAction
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      selfBonusActionHealingStaleMessage(unitFeature),
    );
  }

  const healingRoll = selfBonusActionHealingRollFill(input.fills, unitFeature);
  if (healingRoll.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", healingRoll.message);
  }
  if (healingRoll.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      selfBonusActionHealingRollHole(unitFeature),
    ]);
  }

  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      selfBonusActionHealingStaleMessage(unitFeature),
    );
  }

  const nextActor = applyHpHealing(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === input.subject.unitId &&
          resourceHasUsesRemaining(candidate)
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    },
    selfBonusActionHealingAmount(unitFeature, healingRoll.value),
  );
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function ongoingFeatureIsAvailable(
  state: BattleState,
  actor: BattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): boolean {
  if (unitFeature.activationTrigger === "firstAttackRoll") {
    return false;
  }
  const occurrenceKey = ongoingFeatureSourceKeyForUnit(unitFeature.unit.id);
  const activeOngoingFeature =
    activeOngoingFeatureOccurrencesForCombatant(actor).get(occurrenceKey);
  if (activeOngoingFeature !== undefined) {
    return (
      state.currentTurnResources.currentHasBonusAction &&
      ongoingFeatureLifecycleHasExtensionTrigger(
        unitFeature.lifecycle,
        "bonusAction",
      )
    );
  }
  if (unitFeature.spendsUse && !resourceHasUsesRemaining(resource)) {
    return false;
  }
  if (!state.currentTurnResources.currentHasBonusAction) {
    return false;
  }
  return !unitFeature.lifecycle.earlyEndArmorCategories.some((category) =>
    combatantWearingArmorCategory(actor, category),
  );
}

export function resolveOngoingFeatureUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }
  if (!ongoingFeatureIsAvailable(input.state, actor, resource, unitFeature)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const spent =
    unitFeature.activationTrigger === "bonusAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : Either.right(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const occurrenceKey = ongoingFeatureSourceKeyForUnit(input.subject.unitId);
  const activeOngoingFeature =
    activeOngoingFeatureOccurrencesForCombatant(actor).get(occurrenceKey);
  const nextActiveOngoingFeatureOccurrences = new Map(
    actor.activeOngoingFeatureOccurrences,
  );
  nextActiveOngoingFeatureOccurrences.set(
    occurrenceKey,
    activeOngoingFeature === undefined
      ? activeOngoingFeatureOccurrenceFromProfile(
          input.state,
          input.subject.actorId,
          unitFeature,
        )
      : extendOngoingFeatureToEndOfNextTurn(
          input.state,
          input.subject.actorId,
          activeOngoingFeature,
        ),
  );
  const nextActorWithFeature: BattleCreatureState = {
    ...actor,
    activeOngoingFeatureOccurrences: nextActiveOngoingFeatureOccurrences,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        activeOngoingFeature === undefined &&
        candidate.unit.id === input.subject.unitId &&
        unitFeature.spendsUse &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const nextActor = nextActorWithFeature;
  const nextStateBeforeConcentration = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.right,
  };
  const nextState =
    unitFeature.concentrationEffect === "breakAndPrevent"
      ? breakBattleConcentration(
          nextStateBeforeConcentration,
          input.subject.actorId,
        )
      : nextStateBeforeConcentration;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function selfBonusActionHealingRollFill(
  fills: readonly BattleFill[],
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): UnitFeatureRolledDiceFill {
  let healingRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "rolledDice" &&
      fill.holeId === selfBonusActionHealingRollHoleId(unitFeature)
    ) {
      if (healingRoll !== undefined) {
        return {
          tag: "invalid",
          message: `${unitFeature.unit.name} healing roll was filled twice.`,
        };
      }
      healingRoll = fill;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${unitFeature.unit.name} replay holes.`,
    };
  }

  if (healingRoll === undefined) {
    return { tag: "ok", value: undefined };
  }

  const validation = validateRolledDiceForDiceExpr(healingRoll.value, {
    dice: unitFeature.dice,
    dieSize: unitFeature.dieSize,
  });
  return validation == null
    ? { tag: "ok", value: healingRoll }
    : { tag: "invalid", message: validation.reason };
}

export function selfBonusActionHealingRollHole(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: selfBonusActionHealingRollHoleId(unitFeature),
    holeInstanceKey: selfBonusActionHealingRollHoleInstanceKey(unitFeature),
    label: `${unitFeature.unit.name} healing (${unitFeature.dice}d${unitFeature.dieSize})`,
    unitFeature,
  };
}

export function selfBonusActionHealingStaleMessage(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): string {
  return `${unitFeature.unit.name} is no longer available for the current actor.`;
}

export function selfBonusActionHealingRollProtocolId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): string {
  return `battle:unit-feature:${unitFeature.unit.id}:healing-roll`;
}

export function selfBonusActionHealingRollHoleId(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): BattleHoleId {
  return holeId(selfBonusActionHealingRollProtocolId(unitFeature));
}

export function selfBonusActionHealingRollHoleInstanceKey(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
): HoleInstanceKey {
  return holeInstanceKey(selfBonusActionHealingRollProtocolId(unitFeature));
}

export function selfBonusActionHealingAmount(
  unitFeature: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "selfBonusActionHealing" }
  >,
  healingRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const diceTotal = healingRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  return (
    diceTotal +
    unitFeature.flatBase +
    Math.max(0, unitFeature.classLevel - unitFeature.startingAtLevel) *
      unitFeature.flatPerLevel
  );
}

export function discoverLegendaryActionActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  return [...state.combatants].flatMap(([actorId, actor]) => {
    if (
      !statBlockLegendaryActionWindowIsOpen(state, actorId) ||
      actor.origin.kind !== "statBlock" ||
      !combatantCanTakeActions(actor) ||
      actor.origin.resources.legendaryActionUsesRemaining <= 0
    ) {
      return [];
    }
    return attackActionOptionsForActor(state, actorId)
      .filter(
        (attack) =>
          attack.kind === "statBlockAttack" &&
          attack.part.section === "legendaryActions",
      )
      .flatMap((attack) => {
        const targetHole = attackTargetHole(state, actorId, attack);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "action" as const,
                  actorId,
                  action: "attack" as const,
                  attackName: attackActionOptionName(attack),
                  statBlockSection: "legendaryActions" as const,
                },
                label: "Legendary Action",
                summary: `Take the Legendary Action ${attackActionOptionName(
                  attack,
                )}.`,
                initialHoles: [targetHole],
              },
            ];
      });
  });
}
