// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-action-interdiction
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-magical-effect-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// Owns unit-feature act discovery, feature command resolution, ongoing feature
// activation, failed/successful ability-check feature reactions, and self-heal
// feature holes.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-area-save-damage-replacement unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-failed-d20-test unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.magic-action-area-save-damage-healing unit-feature.magic-action-healing-pool unit-feature.magic-action-save-gated-condition unit-feature.paladin-sacred-weapon unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.rogue-steady-aim unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  characterUnitProcedure,
  type UnitFeatureProcedureExecution,
} from "../character-execution-queries.ts";
import {
  canSpendAction,
  canSpendBonusAction,
  enableMovementActionBonusActionExclusion,
  grantUnitActionResource,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import type { HoleInstanceKey } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  type CharacterLevel,
  difficultyClass,
  Hp,
  MovementFeet,
  proficiencyBonusForCharacterLevel,
} from "@dnd/shared/types";
import { characterBattleLevel } from "../character-class-level.ts";
import type { DiceExpr } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleResourceState,
} from "../character-battle-resource-execution.ts";
import {
  battleObjectId,
  CombatantId,
  type BattleObjectId,
  type BattleProcedureExecutionRef,
} from "../identity.ts";
import {
  combatantCanSee,
  currentActorId,
  normalizeBattleGrapples,
  combatantWearingArmorCategory,
} from "./creature-state-leaves.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  battleCreatureStateWithKnockOutPreservedConditions,
  combatantCanTakeActions,
  combatantCanTakeReactions,
  isCharacterBattleCreatureState,
  statBlockLegendaryActionWindowIsOpen,
} from "./creature-state-execution.ts";
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
  extendSavingThrowOngoingFeatures,
  ongoingFeatureEnemyRelationshipDecisionRequired,
} from "./attack-roll.ts";
import { parseSavingThrowRelationshipFacts } from "./roll-trigger-relationship-facts.ts";
import {
  OTHER_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictionMessage,
} from "./antimagic-field-magical-effect-interdiction.ts";
import { spendReaction } from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
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
  activeOngoingFeatureOccurrenceFromExecution,
  extendOngoingFeatureToEndOfNextTurn,
  ongoingFeatureLifecycleHasExtensionTrigger,
} from "./ongoing-feature-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { scoreModifier } from "./domain-helpers.ts";
import { combatantInsideActiveAntimagicFieldAura } from "./antimagic-field-action-interdiction.ts";
import { combatantShapeShiftingSuppressed } from "./shape-shifting.ts";
import {
  type ResolvedWildShapeEquipmentDisposition,
  validateWildShapeEquipmentDispositionFill,
  wildShapeActiveEquipmentDispositions,
  wildShapeCanUseWornLoadoutObject,
  wildShapeLoadoutObjectRefs,
  type WildShapeLoadoutObjectRef,
} from "./wild-shape-equipment.ts";
import { attackActionOptionName } from "./statblock-attacks.ts";
import { attackTargetHole } from "./hole-helpers.ts";
import type {
  BattleActDiscoveryCandidate,
  BardicInspirationFailedD20TestResolutionInput,
  BardicInspirationFailedD20TestResolutionResult,
  BattleCreatureState,
  BattleDroppedObjectOutcome,
  BattleFill,
  AdmittedDruidWildShapeBattleResolutionInput,
  AdmittedUnitFeatureBattleResolutionInput,
  AdmittedUnitFeatureHeldWeaponActivationBattleResolutionInput,
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
  FailedAbilityCheckResourceBoostResolutionInput,
  FailedAbilityCheckResourceBoostResolutionResult,
  SuccessfulAbilityCheckReactionReductionResolutionInput,
  SuccessfulAbilityCheckReactionReductionResolutionResult,
  UnitFeatureBattleResolutionInput,
} from "../battle-state-execution.ts";
import type { UnitFeatureRolledDiceFill } from "./battle-runtime-protocol.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import {
  attackSubjectPart,
  statBlockAttackProcedureSection,
} from "./statblock.ts";

const WILD_SHAPE_EQUIPMENT_DISPOSITION_PROTOCOL =
  "druid-wild-shape-equipment-disposition";

type MechanicalUnitFeature<Kind extends UnitFeatureProcedureExecution["kind"]> =
  Extract<UnitFeatureProcedureExecution, { readonly kind: Kind }>;

export function supportedUnitFeatureActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return [];
  }
  const noActionActs = paladinSacredWeaponDismissActs(actor);
  if (!combatantCanTakeActions(actor)) {
    return noActionActs;
  }

  const resourceActs =
    actor.origin.execution.procedureBindings.flatMap<BattleActDiscoveryCandidate>(
      (binding) => {
        const procedure = binding.procedure;
        if (
          procedure.kind !== "unitFeature" ||
          procedure.source.kind !== "resourcePool"
        ) {
          return [];
        }
        const resourcePoolRef = procedure.source.resourcePoolRef;
        const unitFeature = procedure.execution;
        const procedureRef = binding.procedureRef;
        const resource = actor.origin.resources.find(
          (candidate) => candidate.resourcePoolRef === resourcePoolRef,
        );
        if (resource === undefined) return [];
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
                procedureRef,
              },
              initialHoles: [],
            },
          ];
        }

        if (
          unitFeature?.kind === "ongoingFeature" &&
          unitFeature.activationTrigger === "bonusAction" &&
          ongoingFeatureIsAvailable(
            state,
            actor,
            resource,
            unitFeature,
            procedureRef,
          )
        ) {
          return [
            {
              subject: {
                tag: "unitFeature" as const,
                actorId,
                procedureRef,
              },
              initialHoles: [],
            },
          ];
        }

        if (
          unitFeature?.kind === "bardicInspirationGrant" &&
          resourceHasUsesRemaining(resource) &&
          canSpendBonusAction(state.currentTurnResources) &&
          bardicInspirationGrantTargetChoices(state, actorId).length > 0
        ) {
          return [
            {
              subject: {
                tag: "unitFeature" as const,
                actorId,
                procedureRef,
              },
              initialHoles: [
                bardicInspirationGrantTargetHole(state, actorId, procedureRef),
              ],
            },
          ];
        }

        if (
          unitFeature?.kind === "druidWildShapeKnownForm" &&
          canSpendBonusAction(state.currentTurnResources)
        ) {
          return druidWildShapeActsForResource(
            state,
            actor,
            resource,
            procedureRef,
          );
        }

        return unitFeature?.kind === "selfBonusActionHealing" &&
          resourceHasUsesRemaining(resource) &&
          canSpendBonusAction(state.currentTurnResources)
          ? [
              {
                subject: {
                  tag: "unitFeature" as const,
                  actorId,
                  procedureRef,
                },
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
    ...magicActionSaveGatedConditionActs(state, actor),
    ...paladinSacredWeaponActs(state, actor),
    ...noActionActs,
    ...rogueSteadyAimActs(state, actor),
  ];
}

function attackActionAreaSaveDamageReplacementActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly BattleActDiscoveryCandidate[] {
  if (!canSpendAction(state.currentTurnResources, "attack")) {
    return [];
  }
  return actor.origin.resources.flatMap(
    (resource): readonly BattleActDiscoveryCandidate[] => {
      const procedure =
        attackActionAreaSaveDamageReplacementProcedureForResource(
          actor,
          resource,
        );
      if (procedure === null) return [];
      return resourceHasUsesRemaining(resource)
        ? [
            {
              subject: {
                tag: "unitFeature" as const,
                actorId: actor.combatantId,
                procedureRef: procedure.procedureRef,
              },
              initialHoles: [
                attackActionAreaSaveDamageReplacementSavingThrowHole(
                  state,
                  actor,
                  procedure.execution,
                  procedure.procedureRef,
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
): readonly BattleActDiscoveryCandidate[] {
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    combatantInsideActiveAntimagicFieldAura(state, actor.combatantId)
  ) {
    return [];
  }
  return actor.origin.execution.procedureBindings.flatMap(
    (binding): readonly BattleActDiscoveryCandidate[] => {
      const procedure = binding.procedure;
      if (
        procedure.kind !== "unitFeature" ||
        procedure.execution.kind !== "magicActionHealingPool"
      ) {
        return [];
      }
      const unitFeature = procedure.execution;
      const procedureRef = binding.procedureRef;
      const resource = actor.origin.resources.find(
        (candidate) =>
          candidate.resourcePoolRef ===
          unitFeature.healingPool.spends.resourcePoolRef,
      );
      const choices = magicActionHealingPoolTargetChoices(
        state,
        actor.combatantId,
        unitFeature,
      );
      return procedureRef !== undefined &&
        resource !== undefined &&
        resourceHasUsesRemaining(resource) &&
        choices.length > 0
        ? [
            {
              subject: {
                tag: "unitFeature" as const,
                actorId: actor.combatantId,
                procedureRef,
              },
              initialHoles: [
                magicActionHealingPoolDistributionHole(
                  state,
                  actor.combatantId,
                  procedureRef,
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
): readonly BattleActDiscoveryCandidate[] {
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    spellSaveDcForCaster(state, actor.combatantId) === null ||
    combatantInsideActiveAntimagicFieldAura(state, actor.combatantId)
  ) {
    return [];
  }
  return actor.origin.execution.procedureBindings.flatMap(
    (binding): readonly BattleActDiscoveryCandidate[] => {
      if (
        binding.procedure.kind !== "unitFeature" ||
        binding.procedure.execution.kind !== "magicActionAreaSaveDamageHealing"
      ) {
        return [];
      }
      const unitFeature = binding.procedure.execution;
      const procedureRef = binding.procedureRef;
      const resource = actor.origin.resources.find(
        (candidate) =>
          candidate.resourcePoolRef ===
          unitFeature.damageHealing.spends.resourcePoolRef,
      );
      return resource !== undefined && resourceHasUsesRemaining(resource)
        ? [
            {
              subject: {
                tag: "unitFeature" as const,
                actorId: actor.combatantId,
                procedureRef,
              },
              initialHoles: magicActionAreaSaveDamageHealingHoles(
                state,
                actor.combatantId,
                procedureRef,
                unitFeature,
              ),
            },
          ]
        : [];
    },
  );
}

function magicActionSaveGatedConditionActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly BattleActDiscoveryCandidate[] {
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    spellSaveDcForCaster(state, actor.combatantId) === null ||
    combatantInsideActiveAntimagicFieldAura(state, actor.combatantId)
  ) {
    return [];
  }
  return actor.origin.execution.procedureBindings.flatMap(
    (binding): readonly BattleActDiscoveryCandidate[] => {
      const procedure = binding.procedure;
      if (
        procedure.kind !== "unitFeature" ||
        procedure.execution.kind !== "magicActionSaveGatedCondition"
      ) {
        return [];
      }
      const unitFeature = procedure.execution;
      const procedureRef = binding.procedureRef;
      const resource = actor.origin.resources.find(
        (candidate) =>
          candidate.resourcePoolRef ===
          unitFeature.condition.spends.resourcePoolRef,
      );
      const choices = magicActionSaveGatedConditionTargetChoices(
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
                procedureRef,
              },
              initialHoles: [
                magicActionSaveGatedConditionSavingThrowHole(
                  state,
                  actor.combatantId,
                  unitFeature,
                  procedureRef,
                ),
              ],
            },
          ]
        : [];
    },
  );
}

type SacredWeaponHeldMeleeWeapon = {
  readonly itemId: string;
  readonly attackName: string;
};

function paladinSacredWeaponActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly BattleActDiscoveryCandidate[] {
  if (!canSpendAction(state.currentTurnResources, "attack")) {
    return [];
  }
  return actor.origin.execution.procedureBindings.flatMap((binding) => {
    const procedure = binding.procedure;
    if (
      procedure.kind !== "unitFeature" ||
      procedure.execution.kind !== "paladinSacredWeapon"
    ) {
      return [];
    }
    const unitFeature = procedure.execution;
    const procedureRef = binding.procedureRef;
    const resource = actor.origin.resources.find(
      (candidate) =>
        candidate.resourcePoolRef ===
        unitFeature.sacredWeapon.spends.resourcePoolRef,
    );
    if (
      procedureRef === undefined ||
      resource === undefined ||
      !resourceHasUsesRemaining(resource)
    ) {
      return [];
    }
    return sacredWeaponHeldMeleeWeapons(actor).map((weapon) => ({
      subject: {
        tag: "unitFeatureHeldWeaponActivation" as const,
        actorId: actor.combatantId,
        procedureRef,
        weaponItemId: battleObjectId(weapon.itemId),
      },
      initialHoles: [],
    }));
  });
}

function paladinSacredWeaponDismissActs(
  actor: CharacterBattleCreatureState,
): readonly BattleActDiscoveryCandidate[] {
  const activeProcedureRefs = new Set(
    actor.activeEffects.flatMap((effect) =>
      effect.kind === "paladinSacredWeapon" &&
      effect.sourceCombatantId === actor.combatantId
        ? [effect.sourceProcedureRef]
        : [],
    ),
  );
  return [...activeProcedureRefs].flatMap((procedureRef) => {
    const procedure = characterUnitProcedure(
      actor.origin.execution,
      procedureRef,
      CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
    );
    return procedure?.kind !== "unitFeature" ||
      procedure.execution.kind !== "paladinSacredWeapon"
      ? []
      : [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId: actor.combatantId,
              procedureRef,
            },
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
  const activeWildShape = activeDruidWildShapeEffect(actor);
  if (
    main !== undefined &&
    actor.origin.attack?.kind === "weapon" &&
    actor.origin.attack.weaponObjectId === battleObjectId(main.itemId) &&
    wildShapeCanUseLoadoutWeaponObject({
      loadout: actor.origin.selectedLoadout,
      activeWildShape,
      objectKind: "mainWeapon",
      objectId: battleObjectId(main.itemId),
    }) &&
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
    actor.origin.offHandAttack.weaponObjectId ===
      battleObjectId(offHand.itemId) &&
    wildShapeCanUseLoadoutWeaponObject({
      loadout: actor.origin.selectedLoadout,
      activeWildShape,
      objectKind: "offHandWeapon",
      objectId: battleObjectId(offHand.itemId),
    }) &&
    actor.origin.offHandAttack.weapon.usage === "melee"
  ) {
    weapons.push({
      itemId: offHand.itemId,
      attackName: attackActionOptionName(actor.origin.offHandAttack),
    });
  }
  return weapons;
}

function wildShapeCanUseLoadoutWeaponObject(input: {
  readonly loadout: CharacterBattleCreatureState["origin"]["selectedLoadout"];
  readonly activeWildShape: ReturnType<typeof activeDruidWildShapeEffect>;
  readonly objectKind: Extract<
    WildShapeLoadoutObjectRef["kind"],
    "mainWeapon" | "offHandWeapon"
  >;
  readonly objectId: BattleObjectId;
}): boolean {
  if (input.activeWildShape === null) return true;
  return wildShapeCanUseWornLoadoutObject({
    loadout: input.loadout,
    formLimbs: input.activeWildShape.formLimbs,
    equipmentDisposition: input.activeWildShape.equipmentDisposition,
    objectKind: input.objectKind,
    objectId: input.objectId,
  });
}

function rogueSteadyAimActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly BattleActDiscoveryCandidate[] {
  if (
    !canSpendBonusAction(state.currentTurnResources) ||
    Number(actor.movementSpentFeet) > 0
  ) {
    return [];
  }
  return actor.origin.execution.procedureBindings.flatMap((binding) =>
    binding.procedure.kind === "unitFeature" &&
    binding.procedure.execution.kind === "rogueSteadyAim"
      ? [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId: actor.combatantId,
              procedureRef: binding.procedureRef,
            },
            initialHoles: [],
          },
        ]
      : [],
  );
}

export function druidWildShapeActsForResource(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  procedureRef: BattleProcedureExecutionRef,
): readonly BattleActDiscoveryCandidate[] {
  const assumeActs =
    resourceHasUsesRemaining(resource) &&
    !combatantShapeShiftingSuppressed(state, actor.combatantId)
      ? (actor.origin.druidWildShapeAvailableForms ?? []).map((admission) => ({
          subject: {
            tag: "druidWildShape" as const,
            actorId: actor.combatantId,
            procedureRef,
            action: "assumeForm" as const,
            formExecutionRef: admission.execution.scopeRef,
          },
          initialHoles: wildShapeInitialEquipmentDispositionHoles(
            actor,
            admission.execution.scopeRef,
          ),
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
              procedureRef,
              action: "dismiss" as const,
            },
            initialHoles: [],
          },
        ];
  return [...assumeActs, ...dismissAct];
}

function wildShapeInitialEquipmentDispositionHoles(
  actor: CharacterBattleCreatureState,
  formExecutionRef: BattleWildShapeEquipmentDispositionHole["formExecutionRef"],
): readonly BattleWildShapeEquipmentDispositionHole[] {
  const candidates = wildShapeLoadoutObjectRefs(actor.origin.selectedLoadout);
  return [
    wildShapeEquipmentDispositionHole({
      actorId: actor.combatantId,
      formExecutionRef,
      candidates,
    }),
  ];
}

function wildShapeEquipmentDispositionHole(input: {
  readonly actorId: CombatantId;
  readonly formExecutionRef: BattleWildShapeEquipmentDispositionHole["formExecutionRef"];
  readonly candidates: BattleWildShapeEquipmentDispositionHole["candidates"];
}): BattleWildShapeEquipmentDispositionHole {
  const protocolId = wildShapeEquipmentDispositionProtocolId(input);
  return {
    holeInstanceKey: holeInstanceKey(protocolId),
    holeId: holeId(protocolId),
    kind: "wildShapeEquipmentDisposition",
    label: "Druid Wild Shape object handling and equipment disposition",
    actorId: input.actorId,
    formExecutionRef: input.formExecutionRef,
    candidates: input.candidates,
  };
}

function wildShapeEquipmentDispositionProtocolId(input: {
  readonly actorId: CombatantId;
  readonly formExecutionRef: BattleWildShapeEquipmentDispositionHole["formExecutionRef"];
}): string {
  return `${WILD_SHAPE_EQUIPMENT_DISPOSITION_PROTOCOL}:${encodeURIComponent(
    input.actorId,
  )}:${encodeURIComponent(input.formExecutionRef)}`;
}

export function resolveUnitFeature(
  input: AdmittedUnitFeatureBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  if (isCharacterBattleCreatureState(actor)) {
    const procedure = characterUnitProcedure(
      actor.origin.execution,
      subject.procedureRef,
      CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
    );
    if (procedure?.kind !== "unitFeature") {
      return invalidResult(
        input.state,
        "staleSubject",
        "Unit feature procedure reference is no longer bound to this actor.",
      );
    }
    const source = procedure.source;
    const resource =
      source.kind === "resourcePool"
        ? actor.origin.resources.find((candidate) => {
            return candidate.resourcePoolRef === source.resourcePoolRef;
          })
        : undefined;

    const unitFeature = procedure.execution;
    if (resource !== undefined) {
      if (unitFeature.kind === "extraActionGrant") {
        return resolveExtraActionGrantUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature.kind === "selfBonusActionHealing") {
        return resolveSelfBonusActionHealingUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature.kind === "ongoingFeature") {
        return resolveOngoingFeatureUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
      if (unitFeature.kind === "bardicInspirationGrant") {
        return resolveBardicInspirationGrantUnitFeature(
          input,
          actor,
          resource,
          unitFeature,
        );
      }
    }

    if (unitFeature.kind === "paladinSacredWeapon") {
      return resolvePaladinSacredWeaponDismissUnitFeature(
        input,
        actor,
        unitFeature,
      );
    }
    if (unitFeature.kind === "rogueSteadyAim") {
      return resolveRogueSteadyAimUnitFeature(input, actor, unitFeature);
    }

    const attackActionAreaSaveDamageReplacementResource = resource;
    if (
      attackActionAreaSaveDamageReplacementResource !== undefined &&
      unitFeature.kind === "attackActionAreaSaveDamageReplacement"
    ) {
      return resolveAttackActionAreaSaveDamageReplacementUnitFeature(
        input,
        actor,
        attackActionAreaSaveDamageReplacementResource,
        unitFeature,
      );
    }

    if (unitFeature.kind === "magicActionHealingPool") {
      return resolveMagicActionHealingPoolUnitFeature(
        input,
        actor,
        unitFeature,
      );
    }

    if (unitFeature.kind === "magicActionAreaSaveDamageHealing") {
      return resolveMagicActionAreaSaveDamageHealingUnitFeature(
        input,
        actor,
        unitFeature,
      );
    }

    if (unitFeature.kind === "magicActionSaveGatedCondition") {
      return resolveMagicActionSaveGatedConditionUnitFeature(
        input,
        actor,
        unitFeature,
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
  input: AdmittedUnitFeatureHeldWeaponActivationBattleResolutionInput,
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
  const procedure = characterUnitProcedure(
    actor.origin.execution,
    input.subject.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  if (
    procedure?.kind !== "unitFeature" ||
    procedure.execution.kind !== "paladinSacredWeapon"
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Held-weapon Unit feature is no longer selected for the current actor.",
    );
  }
  const unitFeature = procedure.execution;
  if (
    !sacredWeaponHeldMeleeWeapons(actor).some(
      (weapon) => battleObjectId(weapon.itemId) === input.subject.weaponItemId,
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
      candidate.resourcePoolRef ===
      unitFeature.sacredWeapon.spends.resourcePoolRef,
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
            effect.sourceProcedureRef === input.subject.procedureRef &&
            effect.sourceCombatantId === actor.combatantId
          ),
      ),
      {
        kind: "paladinSacredWeapon",
        sourceProcedureRef: input.subject.procedureRef,
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
        candidate.resourcePoolRef === resource.resourcePoolRef &&
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
  _unitFeature: MechanicalUnitFeature<"paladinSacredWeapon">,
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
        effect.sourceProcedureRef === input.subject.procedureRef &&
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
  unitFeature: MechanicalUnitFeature<"rogueSteadyAim">,
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
          "sourceProcedureRef" in effect &&
          effect.sourceProcedureRef === input.subject.procedureRef &&
          effect.sourceCombatantId === actor.combatantId &&
          (effect.kind === "nextAttackRollBySelf" ||
            effect.kind === "selfSpeedZero")
        ),
    ),
    {
      kind: "nextAttackRollBySelf",
      sourceProcedureRef: input.subject.procedureRef,
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
      sourceProcedureRef: input.subject.procedureRef,
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
  unitFeature: MechanicalUnitFeature<"magicActionHealingPool">,
): BattleResolutionResult {
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef ===
      unitFeature.healingPool.spends.resourcePoolRef,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action healing has no resource uses remaining.",
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
      "Magic Action healing is no longer available.",
    );
  }

  const distribution = magicActionHealingPoolDistributionFill(
    input.fills,
    input.subject.procedureRef,
  );
  if (distribution.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", distribution.message);
  }
  if (distribution.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      magicActionHealingPoolDistributionHole(
        input.state,
        actor.combatantId,
        input.subject.procedureRef,
        unitFeature,
      ),
    ]);
  }

  const validation = validateMagicActionHealingPoolDistribution({
    state: input.state,
    actorId: actor.combatantId,
    sourceProcedureRef: input.subject.procedureRef,
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
        candidate.resourcePoolRef ===
          unitFeature.healingPool.spends.resourcePoolRef &&
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
  unitFeature: MechanicalUnitFeature<"magicActionAreaSaveDamageHealing">,
): BattleResolutionResult {
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef ===
      unitFeature.damageHealing.spends.resourcePoolRef,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action damage and healing has no resource uses remaining.",
    );
  }
  if (spellSaveDcForCaster(input.state, actor.combatantId) === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action damage and healing requires a spell save DC.",
    );
  }

  const fills = magicActionAreaSaveDamageHealingFills(
    input.fills,
    input.subject.procedureRef,
    unitFeature,
  );
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
      "Magic Action damage and healing is no longer available.",
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
        procedureRef: input.subject.procedureRef,
        unitFeature,
        fills: fills.value,
      }),
    );
  }

  const validation = validateMagicActionAreaSaveDamageHealing({
    state: input.state,
    actorId: actor.combatantId,
    sourceProcedureRef: input.subject.procedureRef,
    unitFeature,
    savingThrows: fills.value.savingThrows,
    healingTarget: fills.value.healingTarget,
  });
  if (validation.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", validation.message);
  }
  const savingThrowTargetIds = [...validation.outcomesByTargetId.keys()];
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fills.value.savingThrows.relationshipFacts ?? [],
    actor.combatantId,
    savingThrowTargetIds,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      actor.combatantId,
      "enemySavingThrow",
    ),
  );
  if (relationshipFacts === null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Action damage and healing relationship facts must answer the saving-throw hole request.",
    );
  }

  const actorAfterResourceSpend: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef ===
          unitFeature.damageHealing.spends.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateAfterSpend = extendSavingThrowOngoingFeatures(
    {
      ...input.state,
      currentTurnResources: spent.right,
      combatants: new Map(input.state.combatants).set(
        actor.combatantId,
        actorAfterResourceSpend,
      ),
    },
    actor.combatantId,
    savingThrowTargetIds,
    relationshipFacts,
  );
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

function resolveMagicActionSaveGatedConditionUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  unitFeature: MechanicalUnitFeature<"magicActionSaveGatedCondition">,
): BattleResolutionResult {
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef ===
      unitFeature.condition.spends.resourcePoolRef,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action condition has no resource uses remaining.",
    );
  }
  if (spellSaveDcForCaster(input.state, actor.combatantId) === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic Action condition requires a spell save DC.",
    );
  }
  const fills = magicActionSaveGatedConditionFills(
    input.fills,
    input.subject.procedureRef,
  );
  if (fills.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fills.message);
  }
  if (fills.value.savingThrows === undefined) {
    return needsHolesResult(input.state, input.subject, [
      magicActionSaveGatedConditionSavingThrowHole(
        input.state,
        actor.combatantId,
        unitFeature,
        input.subject.procedureRef,
      ),
    ]);
  }
  const validation = validateMagicActionSaveGatedCondition({
    state: input.state,
    actor,
    sourceProcedureRef: input.subject.procedureRef,
    unitFeature,
    savingThrows: fills.value.savingThrows,
  });
  if (validation.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", validation.message);
  }
  const savingThrowTargetIds = validation.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fills.value.savingThrows.relationshipFacts ?? [],
    actor.combatantId,
    savingThrowTargetIds,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      actor.combatantId,
      "enemySavingThrow",
    ),
  );
  if (relationshipFacts === null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Action condition relationship facts must answer the saving-throw hole request.",
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
      "Magic Action condition is no longer available.",
    );
  }
  const actorAfterResourceSpend: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef ===
          unitFeature.condition.spends.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateAfterSpend = extendSavingThrowOngoingFeatures(
    {
      ...input.state,
      currentTurnResources: spent.right,
      combatants: new Map(input.state.combatants).set(
        actor.combatantId,
        actorAfterResourceSpend,
      ),
    },
    actor.combatantId,
    savingThrowTargetIds,
    relationshipFacts,
  );
  const failedTargetIds = validation.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const stateAfterConditions = applyMagicActionSaveGatedConditionFailures(
    stateAfterSpend,
    actor.combatantId,
    unitFeature,
    input.subject.procedureRef,
    failedTargetIds,
  );
  return {
    tag: "resolved",
    state: stateAfterConditions,
    snapshot: snapshotBattle(stateAfterConditions),
  };
}

export function resolveDruidWildShapeUnitFeature(
  input: AdmittedDruidWildShapeBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape is no longer available for the current actor.",
    );
  }
  const procedure = characterUnitProcedure(
    actor.origin.execution,
    input.subject.procedureRef,
    DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  );
  const source =
    procedure?.kind === "unitFeature" ? procedure.source : undefined;
  const resource =
    source?.kind === "resourcePool"
      ? actor.origin.resources.find((candidate) => {
          return candidate.resourcePoolRef === source.resourcePoolRef;
        })
      : undefined;
  const unitFeature =
    procedure?.kind === "unitFeature" ? procedure.execution : undefined;
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
  const formAdmission = actor.origin.druidWildShapeAvailableForms?.find(
    (candidate) => candidate.execution.scopeRef === subject.formExecutionRef,
  );
  if (formAdmission === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Druid Wild Shape form is not battle-available.",
    );
  }
  const form = formAdmission.statBlock;
  const equipmentCandidates = wildShapeLoadoutObjectRefs(
    actor.origin.selectedLoadout,
  );
  const expectedEquipmentDispositionHole = wildShapeEquipmentDispositionHole({
    actorId: actor.combatantId,
    formExecutionRef: formAdmission.execution.scopeRef,
    candidates: equipmentCandidates,
  });
  const equipmentDisposition = (() => {
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
          formLimbs: fill.value.formLimbs,
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
        candidate.resourcePoolRef === resource.resourcePoolRef &&
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
    procedureRef: input.subject.procedureRef,
    form,
    formLimbs: equipmentDisposition.formLimbs,
    equipmentDisposition: wildShapeActiveEquipmentDispositions(
      equipmentDisposition.dispositions,
    ),
    profile: unitFeature,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
    ...wildShapeDroppedObjectsResultField({
      actorId: actor.combatantId,
      procedureRef: input.subject.procedureRef,
      formExecutionRef: formAdmission.execution.scopeRef,
      dispositions: equipmentDisposition.dispositions,
    }),
  };
}

function wildShapeDroppedObjectsResultField(input: {
  readonly actorId: BattleDroppedObjectOutcome["actorId"];
  readonly procedureRef: Extract<
    BattleDroppedObjectOutcome["source"],
    { readonly kind: "druidWildShape" }
  >["procedureRef"];
  readonly formExecutionRef: Extract<
    BattleDroppedObjectOutcome["source"],
    { readonly kind: "druidWildShape" }
  >["formExecutionRef"];
  readonly dispositions: readonly ResolvedWildShapeEquipmentDisposition[];
}): Pick<
  Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
  "droppedObjects"
> {
  const droppedObjects = input.dispositions.flatMap(
    (disposition): readonly BattleDroppedObjectOutcome[] =>
      disposition.disposition === "falls"
        ? [
            {
              kind: "objectDropped",
              actorId: input.actorId,
              objectId: disposition.item.objectId,
              source: {
                kind: "druidWildShape",
                procedureRef: input.procedureRef,
                formExecutionRef: input.formExecutionRef,
              },
            },
          ]
        : [],
  );
  return droppedObjects.length === 0 ? {} : { droppedObjects };
}

export function resolveBardicInspirationGrantUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: MechanicalUnitFeature<"bardicInspirationGrant">,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (
    !resourceHasUsesRemaining(resource) ||
    !canSpendBonusAction(input.state.currentTurnResources)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bardic Inspiration is no longer available for the current actor.",
    );
  }

  const targetFill = bardicInspirationGrantTargetFill(
    input.fills,
    input.subject.procedureRef,
  );
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
      input.subject.procedureRef,
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
      input.subject.procedureRef,
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
        candidate.resourcePoolRef === unitFeature.spends.resourcePoolRef &&
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
        sourceProcedureRef: input.subject.procedureRef,
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
    const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
      input.d20Test.attackRoll,
    );
    if (spellAttackRerollIssue !== null) {
      return {
        tag: "invalid",
        message: spellAttackRerollIssue,
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
  procedureRef: BattleProcedureExecutionRef,
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
      fill.holeId === bardicInspirationGrantTargetHoleId(procedureRef)
    ) {
      if (target !== undefined) {
        return {
          tag: "invalid",
          message: "Bardic Inspiration target was filled twice.",
        };
      }
      if (fill.relationshipFacts !== undefined) {
        return {
          tag: "invalid",
          message:
            "Bardic Inspiration target relationship facts were not requested.",
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
  procedureRef: BattleProcedureExecutionRef,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: bardicInspirationGrantTargetHoleId(procedureRef),
    holeInstanceKey: bardicInspirationGrantTargetHoleInstanceKey(procedureRef),
    label: "Bardic Inspiration target",
    requiresTableSpatialFact: true,
    choices: bardicInspirationGrantTargetChoices(state, actorId),
  };
}

function bardicInspirationGrantTargetHoleId(
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(bardicInspirationGrantTargetProtocolId(procedureRef));
}

function bardicInspirationGrantTargetHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(bardicInspirationGrantTargetProtocolId(procedureRef));
}

function bardicInspirationGrantTargetProtocolId(
  procedureRef: BattleProcedureExecutionRef,
): string {
  return `battle:unit-feature:${procedureRef}:target`;
}

function hasBardicInspirationRangeFact(
  facts: readonly BattleTargetSpatialFact[],
  bardId: CombatantId,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  unitFeature: MechanicalUnitFeature<"bardicInspirationGrant">,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "bardicInspirationTargetWithinRange" &&
      fact.bardId === bardId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === unitFeature.rangeFeet,
  );
}

type MagicActionHealingPoolDistributionFill = Extract<
  BattleFill,
  { readonly kind: "hitPointHealingDistribution" }
>;

function magicActionHealingPoolDistributionFill(
  fills: readonly BattleFill[],
  procedureRef: BattleProcedureExecutionRef,
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
      fill.holeId === magicActionHealingPoolDistributionHoleId(procedureRef)
    ) {
      if (distribution !== undefined) {
        return {
          tag: "invalid",
          message: "Magic Action healing distribution was filled twice.",
        };
      }
      distribution = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Magic Action healing replay holes.`,
    };
  }
  return { tag: "ok", value: distribution };
}

function validateMagicActionHealingPoolDistribution(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly unitFeature: MechanicalUnitFeature<"magicActionHealingPool">;
  readonly fill: MagicActionHealingPoolDistributionFill;
}):
  | { readonly tag: "ok" }
  | { readonly tag: "invalid"; readonly message: string } {
  const allocations = input.fill.value.allocations;
  if (allocations.length === 0) {
    return {
      tag: "invalid",
      message: "Magic Action healing requires at least one allocation.",
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
        message: "Magic Action healing target was allocated twice.",
      };
    }
    seenTargets.add(allocation.targetId);
    const healing = Number(allocation.hitPoints);
    if (!Number.isInteger(healing) || healing <= 0) {
      return {
        tag: "invalid",
        message:
          "Magic Action healing allocations must restore a positive integer number of Hit Points.",
      };
    }
    const target = input.state.combatants.get(allocation.targetId);
    if (target === undefined) {
      return {
        tag: "invalid",
        message:
          "Magic Action healing target must be a creature in this battle.",
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
        message: "Magic Action healing target must be Bloodied.",
      };
    }
    if (
      allocation.targetId !== input.actorId &&
      !hasMagicActionHealingPoolRangeFact(
        input.fill.spatialFacts,
        input.actorId,
        allocation.targetId,
        input.sourceProcedureRef,
        input.unitFeature,
      )
    ) {
      return {
        tag: "invalid",
        message: "Magic Action healing target must be within range.",
      };
    }
    const cap = combatantHalfHitPointMaximum(target);
    if (Number(target.hp) + healing > cap) {
      return {
        tag: "invalid",
        message:
          "Magic Action healing cannot restore a target above half its Hit Point Maximum.",
      };
    }
    spentHitPoints += healing;
    if (spentHitPoints > poolHitPoints) {
      return {
        tag: "invalid",
        message: "Magic Action healing allocations exceed the healing pool.",
      };
    }
  }
  return { tag: "ok" };
}

function magicActionHealingPoolDistributionHole(
  state: BattleState,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  unitFeature: MechanicalUnitFeature<"magicActionHealingPool">,
): BattleHitPointHealingPoolDistributionHole {
  return {
    kind: "hitPointHealingDistribution",
    holeId: magicActionHealingPoolDistributionHoleId(procedureRef),
    holeInstanceKey:
      magicActionHealingPoolDistributionHoleInstanceKey(procedureRef),
    label: "Magic Action healing distribution",
    requiresTableSpatialFact: true,
    healingPool: {
      sourceCombatantId: actorId,
      sourceProcedureRef: procedureRef,
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
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(magicActionHealingPoolDistributionProtocolId(procedureRef));
}

function magicActionHealingPoolDistributionHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionHealingPoolDistributionProtocolId(procedureRef),
  );
}

function magicActionHealingPoolDistributionProtocolId(
  procedureRef: BattleProcedureExecutionRef,
): string {
  return `battle:unit-feature:${procedureRef}:hit-point-healing-distribution`;
}

function magicActionHealingPoolTargetChoices(
  state: BattleState,
  _actorId: CombatantId,
  _unitFeature: MechanicalUnitFeature<"magicActionHealingPool">,
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
  unitFeature: MechanicalUnitFeature<"magicActionHealingPool">,
): number {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return 0;
  }
  const classLevel =
    actor.origin.classLevels.find(
      (level) => level.className === unitFeature.className,
    )?.level ?? 0;
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
  sourceProcedureRef: BattleProcedureExecutionRef,
  unitFeature: MechanicalUnitFeature<"magicActionHealingPool">,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "magicActionHealingPoolTargetWithinRange" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === unitFeature.healingPool.rangeFeet,
  );
}

type AttackActionAreaSaveDamageReplacementProfile =
  MechanicalUnitFeature<"attackActionAreaSaveDamageReplacement">;
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

function attackActionAreaSaveDamageReplacementProcedureForResource(
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
): {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly execution: AttackActionAreaSaveDamageReplacementProfile;
} | null {
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitFeature" &&
      candidate.procedure.source.kind === "resourcePool" &&
      candidate.procedure.source.resourcePoolRef === resource.resourcePoolRef &&
      candidate.procedure.execution.kind ===
        "attackActionAreaSaveDamageReplacement",
  );
  return binding?.procedure.kind === "unitFeature" &&
    binding.procedure.execution.kind === "attackActionAreaSaveDamageReplacement"
    ? {
        procedureRef: binding.procedureRef,
        execution: binding.procedure.execution,
      }
    : null;
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
      "Area damage replacement has no uses remaining.",
    );
  }

  const fills = attackActionAreaSaveDamageReplacementFills(
    input.fills,
    actor,
    unitFeature,
    input.subject.procedureRef,
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
        input.subject.procedureRef,
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
  const savingThrowTargetIds = [...validation.outcomesByTargetId.keys()];
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fills.value.savingThrows.relationshipFacts ?? [],
    actor.combatantId,
    savingThrowTargetIds,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      actor.combatantId,
      "enemySavingThrow",
    ),
  );
  if (relationshipFacts === null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Area damage replacement relationship facts must answer the saving-throw hole request.",
    );
  }
  if (
    validation.damageTargetIds.length > 0 &&
    fills.value.damageRoll === undefined
  ) {
    return needsHolesResult(input.state, input.subject, [
      attackActionAreaSaveDamageReplacementDamageRollHole(
        actor,
        unitFeature,
        input.subject.procedureRef,
      ),
    ]);
  }

  const spent = spendAttackActionResource(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Area damage replacement Attack action is no longer available.",
    );
  }
  const nextActor: CharacterBattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === resource.resourcePoolRef &&
        resourceHasUsesRemaining(candidate)
          ? spendCharacterResourceUse(candidate)
          : candidate,
      ),
    },
  };
  const stateAfterSpend = extendSavingThrowOngoingFeatures(
    {
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
    },
    actor.combatantId,
    savingThrowTargetIds,
    relationshipFacts,
  );
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
      "Area damage replacement requires a damage roll for affected targets.",
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
  procedureRef: BattleProcedureExecutionRef,
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
        attackActionAreaSaveDamageReplacementSavingThrowHoleId(procedureRef)
    ) {
      if (savingThrows !== undefined) {
        return {
          tag: "invalid",
          message:
            "Area damage replacement Saving Throw outcomes were filled twice.",
        };
      }
      savingThrows = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        attackActionAreaSaveDamageReplacementDamageRollHoleId(procedureRef)
    ) {
      if (damageRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Area damage replacement damage roll was filled twice.",
        };
      }
      const validation = validateRolledDiceFillForDiceExpr(
        fill,
        attackActionAreaSaveDamageReplacementDamageDiceExpr(actor, unitFeature),
      );
      if (validation !== null) {
        return { tag: "invalid", message: validation };
      }
      damageRoll = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the area damage replacement replay holes.`,
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
      message:
        "Area damage replacement requires table-supplied Cone or Line area facts.",
    };
  }
  const area = input.savingThrows.value.area;
  if (area.originAnchorId !== input.actorId) {
    return {
      tag: "invalid",
      message:
        "Area damage replacement must originate from the acting creature.",
    };
  }
  if (!input.state.combatants.has(area.originAnchorId)) {
    return {
      tag: "invalid",
      message:
        "Area damage replacement origin must be a combatant in this battle.",
    };
  }
  if ("kind" in area || "sleepNonSleeperFacts" in area) {
    return {
      tag: "invalid",
      message: "Area damage replacement uses plain Cone or Line area facts.",
    };
  }
  const affectedTargetIds = new Set(area.affectedTargetIds);
  if (affectedTargetIds.size !== area.affectedTargetIds.length) {
    return {
      tag: "invalid",
      message:
        "Area damage replacement affected targets must not duplicate targets.",
    };
  }
  for (const targetId of affectedTargetIds) {
    if (!input.state.combatants.has(targetId)) {
      return {
        tag: "invalid",
        message:
          "Area damage replacement target must be a creature in this battle.",
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
        message:
          "Area damage replacement Saving Throw outcomes must match the table-supplied affected targets.",
      };
    }
    if (outcomesByTargetId.has(outcome.targetId)) {
      return {
        tag: "invalid",
        message:
          "Area damage replacement Saving Throw outcomes must not duplicate targets.",
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
        message:
          "Area damage replacement Saving Throw outcomes must cover every table-supplied affected target.",
      };
}

function attackActionAreaSaveDamageReplacementSavingThrowHole(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
  procedureRef: BattleProcedureExecutionRef,
): BattleUnitFeatureSavingThrowOutcomeHole {
  return {
    kind: "savingThrowOutcome",
    holeId:
      attackActionAreaSaveDamageReplacementSavingThrowHoleId(procedureRef),
    holeInstanceKey:
      attackActionAreaSaveDamageReplacementSavingThrowHoleInstanceKey(
        procedureRef,
      ),
    label: "Area damage replacement Cone or Line Dexterity Saving Throws",
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actor.combatantId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId: actor.combatantId,
          },
        }
      : {}),
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
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      unitFeature.breath.save.ability,
    ),
  };
}

function attackActionAreaSaveDamageReplacementDamageRollHole(
  actor: CharacterBattleCreatureState,
  unitFeature: AttackActionAreaSaveDamageReplacementProfile,
  procedureRef: BattleProcedureExecutionRef,
): BattleUnitFeatureRollHole {
  const expr = attackActionAreaSaveDamageReplacementDamageDiceExpr(
    actor,
    unitFeature,
  );
  return {
    kind: "rolledDice",
    holeId: attackActionAreaSaveDamageReplacementDamageRollHoleId(procedureRef),
    holeInstanceKey:
      attackActionAreaSaveDamageReplacementDamageRollHoleInstanceKey(
        procedureRef,
      ),
    label: `Area damage replacement (${diceExprLabel(expr)})`,
  };
}

function attackActionAreaSaveDamageReplacementSavingThrowHoleId(
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    attackActionAreaSaveDamageReplacementProtocolId(
      procedureRef,
      "saving-throw-outcome",
    ),
  );
}

function attackActionAreaSaveDamageReplacementSavingThrowHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    attackActionAreaSaveDamageReplacementProtocolId(
      procedureRef,
      "saving-throw-outcome",
    ),
  );
}

function attackActionAreaSaveDamageReplacementDamageRollHoleId(
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    attackActionAreaSaveDamageReplacementProtocolId(
      procedureRef,
      "damage-roll",
    ),
  );
}

function attackActionAreaSaveDamageReplacementDamageRollHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    attackActionAreaSaveDamageReplacementProtocolId(
      procedureRef,
      "damage-roll",
    ),
  );
}

function attackActionAreaSaveDamageReplacementProtocolId(
  procedureRef: BattleProcedureExecutionRef,
  part: "saving-throw-outcome" | "damage-roll",
): string {
  return `battle:unit-feature:${procedureRef}:attack-action-area-save-damage-replacement:${part}`;
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
      Number(proficiencyBonusForCharacterLevel(characterTotalLevel(actor))),
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

function characterTotalLevel(
  actor: CharacterBattleCreatureState,
): CharacterLevel {
  return characterBattleLevel(actor.origin.classLevels);
}

type MagicActionAreaSaveDamageHealingProfile =
  MechanicalUnitFeature<"magicActionAreaSaveDamageHealing">;
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
type MagicActionSaveGatedConditionProfile =
  MechanicalUnitFeature<"magicActionSaveGatedCondition">;
type MagicActionSaveGatedConditionSavingThrowFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
type MagicActionSaveGatedConditionFillSet = {
  readonly savingThrows:
    | MagicActionSaveGatedConditionSavingThrowFill
    | undefined;
};

function magicActionSaveGatedConditionFills(
  fills: readonly BattleFill[],
  procedureRef: BattleProcedureExecutionRef,
):
  | {
      readonly tag: "ok";
      readonly value: MagicActionSaveGatedConditionFillSet;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let savingThrows: MagicActionSaveGatedConditionSavingThrowFill | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId ===
        magicActionSaveGatedConditionSavingThrowHoleId(procedureRef)
    ) {
      if (savingThrows !== undefined) {
        return {
          tag: "invalid",
          message:
            "Magic Action condition Saving Throw outcomes were filled twice.",
        };
      }
      savingThrows = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Magic Action condition replay holes.`,
    };
  }
  return { tag: "ok", value: { savingThrows } };
}

function magicActionSaveGatedConditionProtocolId(
  procedureRef: BattleProcedureExecutionRef,
  hole: "saving-throws",
): string {
  return `battle:unit-feature:${procedureRef}:save-gated-condition:${hole}`;
}

function magicActionSaveGatedConditionSavingThrowHoleId(
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    magicActionSaveGatedConditionProtocolId(procedureRef, "saving-throws"),
  );
}

function magicActionSaveGatedConditionSavingThrowHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionSaveGatedConditionProtocolId(procedureRef, "saving-throws"),
  );
}

function validateMagicActionSaveGatedCondition(input: {
  readonly state: BattleState;
  readonly actor: CharacterBattleCreatureState;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly unitFeature: MagicActionSaveGatedConditionProfile;
  readonly savingThrows: MagicActionSaveGatedConditionSavingThrowFill;
}):
  | {
      readonly tag: "ok";
      readonly outcomes: readonly BattleSavingThrowOutcome[];
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const hole = magicActionSaveGatedConditionSavingThrowHole(
    input.state,
    input.actor.combatantId,
    input.unitFeature,
    input.sourceProcedureRef,
  );
  if (input.savingThrows.holeId !== hole.holeId) {
    return {
      tag: "invalid",
      message:
        "Magic Action condition Saving Throw fill must use the selected feature hole.",
    };
  }
  if (!("outcomes" in input.savingThrows.value)) {
    return {
      tag: "invalid",
      message: "Magic Action condition uses target Saving Throw outcomes.",
    };
  }
  const maxTargets = magicActionSaveGatedConditionMaxTargets(
    input.actor,
    input.unitFeature,
  );
  const outcomes = input.savingThrows.value.outcomes;
  if (outcomes.length < 1 || outcomes.length > maxTargets) {
    return {
      tag: "invalid",
      message: `Magic Action condition requires between 1 and ${maxTargets} selected targets.`,
    };
  }
  const choices = new Set(
    magicActionSaveGatedConditionTargetChoices(
      input.state,
      input.actor.combatantId,
      input.unitFeature,
    ),
  );
  const seen = new Set<CombatantId>();
  for (const outcome of outcomes) {
    if (seen.has(outcome.targetId)) {
      return {
        tag: "invalid",
        message:
          "Magic Action condition Saving Throw outcomes must not duplicate targets.",
      };
    }
    seen.add(outcome.targetId);
    if (!choices.has(outcome.targetId)) {
      return {
        tag: "invalid",
        message:
          "Magic Action condition target must be a visible creature within range.",
      };
    }
    if (
      !magicActionSaveGatedConditionHasTargetSpatialFact(
        input.savingThrows.spatialFacts ?? [],
        input.actor.combatantId,
        outcome.targetId,
        input.sourceProcedureRef,
        input.unitFeature,
      )
    ) {
      return {
        tag: "invalid",
        message:
          "Magic Action condition target requires table-supplied visibility and range evidence.",
      };
    }
  }
  return { tag: "ok", outcomes };
}

function magicActionSaveGatedConditionSavingThrowHole(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: MagicActionSaveGatedConditionProfile,
  procedureRef: BattleProcedureExecutionRef,
): BattleUnitFeatureSavingThrowOutcomeHole {
  const dc = spellSaveDcForCaster(state, actorId);
  if (dc === null) {
    throw new Error(
      "Magic Action condition save hole requires a spell save DC.",
    );
  }
  const targetIds = magicActionSaveGatedConditionTargetChoices(
    state,
    actorId,
    unitFeature,
  );
  return {
    kind: "savingThrowOutcome",
    holeId: magicActionSaveGatedConditionSavingThrowHoleId(procedureRef),
    holeInstanceKey:
      magicActionSaveGatedConditionSavingThrowHoleInstanceKey(procedureRef),
    label: "Magic Action condition Wisdom Saving Throws",
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId,
          },
        }
      : {}),
    ability: unitFeature.condition.save.ability,
    dc: { kind: "fixed", dc },
    targetIds,
    targetRollModes: savingThrowRollModeProjections(
      state,
      unitFeature.condition.save.ability,
    ).filter((projection) => targetIds.includes(projection.targetId)),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      unitFeature.condition.save.ability,
    ).filter((projection) => targetIds.includes(projection.targetId)),
  };
}

function magicActionSaveGatedConditionTargetChoices(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: MagicActionSaveGatedConditionProfile,
): readonly CombatantId[] {
  return [...state.combatants.keys()].filter(
    (targetId) =>
      combatantCanSee(state, actorId, targetId) &&
      magicalEffectTargetsInterdictionMessage({
        state,
        source: OTHER_MAGICAL_EFFECT_SOURCE,
        targetIds: [targetId],
      }) === null &&
      Number(unitFeature.condition.targetSelection.rangeFeet) === 60,
  );
}

function magicActionSaveGatedConditionMaxTargets(
  actor: CharacterBattleCreatureState,
  unitFeature: MagicActionSaveGatedConditionProfile,
): number {
  const modifier = scoreModifier(
    actor.origin.d20Statistics.abilityScores[
      unitFeature.condition.targetSelection.count.ability
    ],
  );
  return Math.max(
    unitFeature.condition.targetSelection.count.minimum,
    modifier,
  );
}

function magicActionSaveGatedConditionHasTargetSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionSaveGatedConditionProfile,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "unitFeatureVisibleTargetWithinRange" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === unitFeature.condition.targetSelection.rangeFeet,
  );
}

function applyMagicActionSaveGatedConditionFailures(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: MagicActionSaveGatedConditionProfile,
  sourceProcedureRef: BattleProcedureExecutionRef,
  targetIds: readonly CombatantId[],
): BattleState {
  const combatants = new Map(state.combatants);
  let currentTurnResources = state.currentTurnResources;
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) continue;
    const activeEffect = {
      kind: "unitFeatureCondition" as const,
      sourceProcedureRef,
      sourceCombatantId: actorId,
      condition: unitFeature.condition.onFail.condition,
      conditionHadNonSpellSource: hasCondition(
        target.conditions,
        unitFeature.condition.onFail.condition,
      ),
      earlyEnd: { kind: "targetTakesAnyDamage" as const },
      turnRestriction: { kind: "moveActionOrBonusAction" as const },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: unitFeature.condition.onFail.durationTicks,
      },
    };
    const nextTarget = {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(
          target.conditions,
          unitFeature.condition.onFail.condition,
        ),
      ),
      activeEffects: [
        ...target.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "unitFeatureCondition" &&
              candidate.sourceProcedureRef === sourceProcedureRef &&
              candidate.sourceCombatantId === actorId &&
              candidate.condition === unitFeature.condition.onFail.condition
            ),
        ),
        activeEffect,
      ],
    };
    combatants.set(targetId, nextTarget);
    if (targetId === currentActorId(state)) {
      currentTurnResources = enableMovementActionBonusActionExclusion(
        currentTurnResources,
        Number(target.movementSpentFeet) > 0,
      );
    }
  }
  return {
    ...state,
    currentTurnResources,
    combatants,
  };
}

function magicActionAreaSaveDamageHealingFills(
  fills: readonly BattleFill[],
  procedureRef: BattleProcedureExecutionRef,
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
        magicActionAreaSaveDamageHealingSavingThrowHoleId(procedureRef)
    ) {
      if (savingThrows !== undefined) {
        return {
          tag: "invalid",
          message:
            "Magic Action damage and healing Saving Throw outcomes were filled twice.",
        };
      }
      savingThrows = fill;
      continue;
    }
    if (
      fill.kind === "targetChoice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingHealingTargetHoleId(procedureRef)
    ) {
      if (healingTarget !== undefined) {
        return {
          tag: "invalid",
          message: "Magic Action damage and healing target was filled twice.",
        };
      }
      healingTarget = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingDamageRollHoleId(procedureRef)
    ) {
      if (damageRoll !== undefined) {
        return {
          tag: "invalid",
          message:
            "Magic Action damage and healing damage roll was filled twice.",
        };
      }
      const validation = validateRolledDiceFillForDiceExpr(
        fill,
        unitFeature.damageHealing.damage.amount.expr,
      );
      if (validation !== null) {
        return { tag: "invalid", message: validation };
      }
      damageRoll = fill;
      continue;
    }
    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        magicActionAreaSaveDamageHealingHealingRollHoleId(procedureRef)
    ) {
      if (healingRoll !== undefined) {
        return {
          tag: "invalid",
          message:
            "Magic Action damage and healing healing roll was filled twice.",
        };
      }
      const validation = validateRolledDiceFillForDiceExpr(
        fill,
        unitFeature.damageHealing.healing.amount.expr,
      );
      if (validation !== null) {
        return { tag: "invalid", message: validation };
      }
      healingRoll = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Magic Action damage and healing replay holes.`,
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
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
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
        message:
          "Magic Action damage and healing target Saving Throw was filled twice.",
      };
    }
    if (input.state.combatants.get(outcome.targetId) === undefined) {
      return {
        tag: "invalid",
        message:
          "Magic Action damage and healing Saving Throw target must be a creature in this battle.",
      };
    }
    outcomesByTargetId.set(outcome.targetId, outcome);
  }
  if (input.state.combatants.get(healingTarget) === undefined) {
    return {
      tag: "invalid",
      message:
        "Magic Action damage and healing target must be a creature in this battle.",
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
    input.sourceProcedureRef,
    input.unitFeature,
  );
  if (areaFact === undefined) {
    return {
      tag: "invalid",
      message:
        "Magic Action damage and healing requires caller-supplied Sphere area membership.",
    };
  }
  const areaTargetIds = new Set(areaFact.targetIds);
  for (const targetId of [...outcomesByTargetId.keys(), healingTarget]) {
    if (!areaTargetIds.has(targetId)) {
      return {
        tag: "invalid",
        message:
          "Magic Action damage and healing target must be in the supplied Sphere area.",
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
  readonly procedureRef: BattleProcedureExecutionRef;
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
            input.procedureRef,
            input.unitFeature,
          ),
        ]
      : []),
    ...(input.fills.damageRoll === undefined
      ? [
          magicActionAreaSaveDamageHealingDamageRollHole(
            input.procedureRef,
            input.unitFeature,
          ),
        ]
      : []),
    ...(input.fills.healingTarget === undefined
      ? [
          magicActionAreaSaveDamageHealingHealingTargetHole(
            input.state,
            input.procedureRef,
          ),
        ]
      : []),
    ...(input.fills.healingRoll === undefined
      ? [
          magicActionAreaSaveDamageHealingHealingRollHole(
            input.procedureRef,
            input.unitFeature,
          ),
        ]
      : []),
  ];
}

function magicActionAreaSaveDamageHealingHoles(
  state: BattleState,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
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
      procedureRef,
      unitFeature,
    ),
    magicActionAreaSaveDamageHealingDamageRollHole(procedureRef, unitFeature),
    magicActionAreaSaveDamageHealingHealingTargetHole(state, procedureRef),
    magicActionAreaSaveDamageHealingHealingRollHole(procedureRef, unitFeature),
  ];
}

function magicActionAreaSaveDamageHealingSavingThrowHole(
  state: BattleState,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleUnitFeatureSavingThrowOutcomeHole {
  const dc = spellSaveDcForCaster(state, actorId);
  if (dc === null) {
    throw new Error(
      "Magic Action damage and healing save hole requires a spell save DC.",
    );
  }
  return {
    kind: "savingThrowOutcome",
    holeId: magicActionAreaSaveDamageHealingSavingThrowHoleId(procedureRef),
    holeInstanceKey:
      magicActionAreaSaveDamageHealingSavingThrowHoleInstanceKey(procedureRef),
    label: "Magic Action damage and healing Constitution Saving Throws",
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId,
          },
        }
      : {}),
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
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      unitFeature.damageHealing.save.ability,
    ),
  };
}

function magicActionAreaSaveDamageHealingHealingTargetHole(
  state: BattleState,
  procedureRef: BattleProcedureExecutionRef,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: magicActionAreaSaveDamageHealingHealingTargetHoleId(procedureRef),
    holeInstanceKey:
      magicActionAreaSaveDamageHealingHealingTargetHoleInstanceKey(
        procedureRef,
      ),
    label: "Magic Action damage and healing target",
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
  procedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: magicActionAreaSaveDamageHealingDamageRollHoleId(procedureRef),
    holeInstanceKey:
      magicActionAreaSaveDamageHealingDamageRollHoleInstanceKey(procedureRef),
    label: `Magic Action damage (${diceExprLabel(unitFeature.damageHealing.damage.amount.expr)})`,
  };
}

function magicActionAreaSaveDamageHealingHealingRollHole(
  procedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: magicActionAreaSaveDamageHealingHealingRollHoleId(procedureRef),
    holeInstanceKey:
      magicActionAreaSaveDamageHealingHealingRollHoleInstanceKey(procedureRef),
    label: `Magic Action healing (${diceExprLabel(unitFeature.damageHealing.healing.amount.expr)})`,
  };
}

function magicActionAreaSaveDamageHealingAreaFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
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
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.originWithinRangeFeet ===
        unitFeature.damageHealing.area.origin.rangeFeet &&
      fact.radiusFeet === unitFeature.damageHealing.area.shape.radiusFeet,
  );
}

function magicActionAreaSaveDamageHealingProtocolId(
  procedureRef: BattleProcedureExecutionRef,
  hole: "saving-throws" | "damage-roll" | "healing-target" | "healing-roll",
): string {
  return `battle:unit-feature:${procedureRef}:${hole}`;
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
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    magicActionAreaSaveDamageHealingProtocolId(procedureRef, "saving-throws"),
  );
}

function magicActionAreaSaveDamageHealingSavingThrowHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionAreaSaveDamageHealingProtocolId(procedureRef, "saving-throws"),
  );
}

function magicActionAreaSaveDamageHealingDamageRollHoleId(
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    magicActionAreaSaveDamageHealingProtocolId(procedureRef, "damage-roll"),
  );
}

function magicActionAreaSaveDamageHealingDamageRollHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionAreaSaveDamageHealingProtocolId(procedureRef, "damage-roll"),
  );
}

function magicActionAreaSaveDamageHealingHealingTargetHoleId(
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    magicActionAreaSaveDamageHealingProtocolId(procedureRef, "healing-target"),
  );
}

function magicActionAreaSaveDamageHealingHealingTargetHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionAreaSaveDamageHealingProtocolId(procedureRef, "healing-target"),
  );
}

function magicActionAreaSaveDamageHealingHealingRollHoleId(
  procedureRef: BattleProcedureExecutionRef,
): BattleHoleId {
  return holeId(
    magicActionAreaSaveDamageHealingProtocolId(procedureRef, "healing-roll"),
  );
}

function magicActionAreaSaveDamageHealingHealingRollHoleInstanceKey(
  procedureRef: BattleProcedureExecutionRef,
): HoleInstanceKey {
  return holeInstanceKey(
    magicActionAreaSaveDamageHealingProtocolId(procedureRef, "healing-roll"),
  );
}

function bardicInspirationTargetCanSeeOrHear(
  state: BattleState,
  bardId: CombatantId,
  target: BattleCreatureState,
  facts: readonly BattleTargetSpatialFact[],
  sourceProcedureRef: BattleProcedureExecutionRef,
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
          fact.sourceProcedureRef === sourceProcedureRef,
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

  const procedure = characterUnitProcedure(
    actor.origin.execution,
    input.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  const unitFeature =
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "failedAbilityCheckResourceBoost"
      ? procedure.execution
      : undefined;
  const resource = actor.origin.resources.find(
    (resource) =>
      resource.resourcePoolRef ===
      unitFeature?.abilityCheck.spends.resourcePoolRef,
  );
  if (
    unitFeature === undefined ||
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
    input.boostRoll > unitFeature.abilityCheck.bonus.dieSize ||
    !Number.isInteger(input.boostRoll)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Failed ability-check resource boost roll is outside its projected die range.",
    );
  }

  if (input.abilityCheck.originalTotal >= input.abilityCheck.dc) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Failed ability-check resource boost requires an already-failed ability check.",
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
        resource.resourcePoolRef ===
          unitFeature.abilityCheck.spends.resourcePoolRef &&
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

  const procedure = characterUnitProcedure(
    reactor.origin.execution,
    input.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  const execution =
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "reactionRollOrDamageReduction"
      ? procedure.execution
      : undefined;
  const modifier =
    execution?.kind === "reactionRollOrDamageReduction"
      ? execution.modifiers.find(
          (candidate) => candidate.kind === "abilityCheckReduction",
        )
      : undefined;
  const source =
    procedure?.kind === "unitFeature" ? procedure.source : undefined;
  if (
    execution === undefined ||
    modifier === undefined ||
    source === undefined ||
    !combatantCanTakeReactions(reactor) ||
    !reactionModifierResourceAvailable(
      input.state,
      input.reactorId,
      source,
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
      "Ability-check Reaction reduction requires an already-successful ability check.",
    );
  }

  if (
    modifier.requiresVisibleCreature &&
    !combatantCanSee(input.state, input.reactorId, input.abilityCheck.actorId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Ability-check Reaction reduction requires a visible creature.",
    );
  }

  if (
    !hasReactionRollOrDamageReductionRangeFact(
      input.abilityCheck.targetSpatialFacts,
      input.reactorId,
      input.abilityCheck.actorId,
      input.procedureRef,
      modifier.rangeFeet,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Ability-check Reaction reduction requires the creature to be within range.",
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
      `Ability-check Reaction reduction ${reductionTotal.message}`,
    );
  }

  const reducedTotal = input.abilityCheck.originalTotal - reductionTotal.value;
  const reducedSucceeded = reducedTotal >= input.abilityCheck.dc;
  const spentState = spendReactionModifierResource(
    spendReaction(input.state, input.reactorId),
    input.reactorId,
    source,
    {
      kind: "abilityCheckReduction",
      procedureRef: input.procedureRef,
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
  sourceProcedureRef: BattleProcedureExecutionRef,
  rangeFeet: MovementFeet,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "reactionRollOrDamageReductionTargetWithinRange" &&
      fact.reactorId === reactorId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === rangeFeet,
  );
}

export function resolveExtraActionGrantUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  unitFeature: MechanicalUnitFeature<"extraActionGrant">,
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
    input.subject.procedureRef,
    unitFeature.restriction,
  );
  if (Either.isLeft(granted)) {
    return invalidResult(
      input.state,
      "staleSubject",
      granted.left === "unit-granted action resource already granted"
        ? "This Unit feature has already granted an action this turn."
        : "This Unit feature cannot grant an action for the current turn.",
    );
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === resource.resourcePoolRef &&
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
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): BattleResolutionResult {
  if (
    !resourceHasUsesRemaining(resource) ||
    !canSpendBonusAction(input.state.currentTurnResources)
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
          candidate.resourcePoolRef === resource.resourcePoolRef &&
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
  unitFeature: MechanicalUnitFeature<"ongoingFeature">,
  procedureRef: BattleProcedureExecutionRef,
): boolean {
  if (unitFeature.activationTrigger === "firstAttackRoll") {
    return false;
  }
  const occurrenceKey = procedureRef;
  const activeOngoingFeature =
    activeOngoingFeatureOccurrencesForCombatant(actor).get(occurrenceKey);
  if (activeOngoingFeature !== undefined) {
    return (
      canSpendBonusAction(state.currentTurnResources) &&
      ongoingFeatureLifecycleHasExtensionTrigger(
        unitFeature.lifecycle,
        "bonusAction",
      )
    );
  }
  if (unitFeature.spendsUse && !resourceHasUsesRemaining(resource)) {
    return false;
  }
  if (!canSpendBonusAction(state.currentTurnResources)) {
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
  unitFeature: MechanicalUnitFeature<"ongoingFeature">,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "This Unit feature does not accept battle fills.",
    );
  }
  if (
    !ongoingFeatureIsAvailable(
      input.state,
      actor,
      resource,
      unitFeature,
      input.subject.procedureRef,
    )
  ) {
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

  const occurrenceKey = input.subject.procedureRef;
  const activeOngoingFeature =
    activeOngoingFeatureOccurrencesForCombatant(actor).get(occurrenceKey);
  const nextActiveOngoingFeatureOccurrences = new Map(
    actor.activeOngoingFeatureOccurrences,
  );
  nextActiveOngoingFeatureOccurrences.set(
    occurrenceKey,
    activeOngoingFeature === undefined
      ? activeOngoingFeatureOccurrenceFromExecution(
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
        candidate.resourcePoolRef === resource.resourcePoolRef &&
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
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
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
          message: "Self-healing roll was filled twice.",
        };
      }
      healingRoll = fill;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the self-healing replay holes.`,
    };
  }

  if (healingRoll === undefined) {
    return { tag: "ok", value: undefined };
  }

  const validation = validateRolledDiceFillForDiceExpr(healingRoll, {
    dice: unitFeature.dice,
    dieSize: unitFeature.dieSize,
  });
  return validation == null
    ? { tag: "ok", value: healingRoll }
    : { tag: "invalid", message: validation };
}

export function selfBonusActionHealingRollHole(
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: selfBonusActionHealingRollHoleId(unitFeature),
    holeInstanceKey: selfBonusActionHealingRollHoleInstanceKey(unitFeature),
    label: `Self-healing (${unitFeature.dice}d${unitFeature.dieSize})`,
  };
}

export function selfBonusActionHealingStaleMessage(
  _unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): string {
  return "Self-healing is no longer available for the current actor.";
}

export function selfBonusActionHealingRollProtocolId(
  _unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): string {
  return "battle:unit-feature:self-bonus-action-healing:healing-roll";
}

export function selfBonusActionHealingRollHoleId(
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): BattleHoleId {
  return holeId(selfBonusActionHealingRollProtocolId(unitFeature));
}

export function selfBonusActionHealingRollHoleInstanceKey(
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): HoleInstanceKey {
  return holeInstanceKey(selfBonusActionHealingRollProtocolId(unitFeature));
}

export function selfBonusActionHealingAmount(
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
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
): readonly BattleActDiscoveryCandidate[] {
  return [...state.combatants].flatMap(([actorId, actor]) => {
    if (
      !statBlockLegendaryActionWindowIsOpen(state, actorId) ||
      actor.origin.kind !== "statBlock" ||
      !combatantCanTakeActions(actor)
    ) {
      return [];
    }
    return attackActionOptionsForActor(state, actorId)
      .filter(
        (attack) =>
          attack.kind === "statBlockAttack" &&
          statBlockAttackProcedureSection(
            state,
            actorId,
            attack.procedureRef,
          ) === "legendaryActions",
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
                  ...attackSubjectPart(attack),
                },
                initialHoles: [targetHole],
              },
            ];
      });
  });
}
