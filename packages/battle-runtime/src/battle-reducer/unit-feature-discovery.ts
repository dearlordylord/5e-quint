import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterUnitProcedure,
  type UnitFeatureProcedureExecution,
} from "../character-execution-queries.ts";
import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import type { HoleInstanceKey } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  type CharacterLevel,
  type DifficultyClass,
  difficultyClass,
  Hp,
  proficiencyBonusForCharacterLevel,
} from "@dnd/shared/types";
import { characterBattleLevel } from "../character-class-level.ts";
import type { DiceExpr } from "@dnd/surface/surface/types";
import {
  resourceHasUsesRemaining,
  type CharacterBattleResourceState,
} from "../character-battle-resource-execution.ts";
import {
  CombatantId,
  type BattleObjectId,
  type BattleProcedureExecutionRef,
} from "../identity.ts";
import {
  combatantCanSee,
  combatantWearingArmorCategory,
} from "./creature-state-leaves.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  combatantCanTakeActions,
  isCharacterBattleCreatureState,
  statBlockLegendaryActionWindowIsOpen,
} from "./creature-state-execution.ts";
import { activeDruidWildShapeEffect } from "./druid-wild-shape.ts";
import { effectiveHitPointMaximum } from "./hit-point-maximum.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";
import {
  OTHER_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictionMessage,
} from "./antimagic-field-magical-effect-interdiction.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import { spellSaveDcForCaster } from "./spell-save-dc.ts";
import { ongoingFeatureLifecycleHasExtensionTrigger } from "./ongoing-feature-helpers.ts";
import { scoreModifier } from "./domain-helpers.ts";
import { combatantInsideActiveAntimagicFieldAura } from "./antimagic-field-action-interdiction.ts";
import { combatantShapeShiftingSuppressed } from "./shape-shifting.ts";
import {
  wildShapeCanUseWornLoadoutObject,
  wildShapeLoadoutObjectRefs,
  type WildShapeLoadoutObjectRef,
} from "./wild-shape-equipment.ts";
import { attackActionOptionName } from "./statblock-attacks.ts";
import { attackTargetHole } from "./hole-helpers.ts";
import { characterEffectiveLoadout } from "./battle-object-lifecycle.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleWildShapeEquipmentDispositionHole,
  BattleHitPointHealingPoolDistributionHole,
  BattleHoleId,
  BattleState,
  BattleTargetChoiceHole,
  BattleUnitFeatureRollHole,
  BattleUnitFeatureSavingThrowOutcomeHole,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import {
  attackSubjectPart,
  statBlockAttackProcedureSection,
} from "./statblock.ts";

const WILD_SHAPE_EQUIPMENT_DISPOSITION_PROTOCOL =
  "druid-wild-shape-equipment-disposition";

export type MechanicalUnitFeature<
  Kind extends UnitFeatureProcedureExecution["kind"],
> = Extract<UnitFeatureProcedureExecution, { readonly kind: Kind }>;

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
      const choices = magicActionHealingPoolTargetChoices(state);
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
                  actor,
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
  const spellSaveDc = spellSaveDcForCaster(state, actor.combatantId);
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    spellSaveDc === null ||
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
                spellSaveDc,
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
  const spellSaveDc = spellSaveDcForCaster(state, actor.combatantId);
  if (
    !canSpendAction(state.currentTurnResources, "magic") ||
    spellSaveDc === null ||
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
                  spellSaveDc,
                ),
              ],
            },
          ]
        : [];
    },
  );
}

type SacredWeaponHeldMeleeWeapon = {
  readonly itemId: BattleObjectId;
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
    return sacredWeaponHeldMeleeWeapons(state, actor).map((weapon) => ({
      subject: {
        tag: "unitFeatureHeldWeaponActivation" as const,
        actorId: actor.combatantId,
        procedureRef,
        weaponItemId: weapon.itemId,
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

export function sacredWeaponHeldMeleeWeapons(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly SacredWeaponHeldMeleeWeapon[] {
  const weapons: SacredWeaponHeldMeleeWeapon[] = [];
  const loadout = characterEffectiveLoadout(state, actor);
  const main = loadout.weapon;
  const activeWildShape = activeDruidWildShapeEffect(actor);
  if (
    main !== undefined &&
    actor.origin.attack?.kind === "weapon" &&
    actor.origin.attack.weaponObjectId === main.itemId &&
    wildShapeCanUseLoadoutWeaponObject({
      loadout,
      activeWildShape,
      objectKind: "mainWeapon",
      objectId: main.itemId,
    }) &&
    actor.origin.attack.weapon.usage === "melee"
  ) {
    weapons.push({
      itemId: main.itemId,
      attackName: attackActionOptionName(actor.origin.attack),
    });
  }
  const offHand = loadout.offHandWeapon;
  if (
    offHand !== undefined &&
    actor.origin.offHandAttack?.kind === "weapon" &&
    actor.origin.offHandAttack.weaponObjectId === offHand.itemId &&
    wildShapeCanUseLoadoutWeaponObject({
      loadout,
      activeWildShape,
      objectKind: "offHandWeapon",
      objectId: offHand.itemId,
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
            state,
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
  state: BattleState,
  actor: CharacterBattleCreatureState,
  formExecutionRef: BattleWildShapeEquipmentDispositionHole["formExecutionRef"],
): readonly BattleWildShapeEquipmentDispositionHole[] {
  const candidates = wildShapeLoadoutObjectRefs(
    characterEffectiveLoadout(state, actor),
  );
  return [
    wildShapeEquipmentDispositionHole({
      actorId: actor.combatantId,
      formExecutionRef,
      candidates,
    }),
  ];
}

export function wildShapeEquipmentDispositionHole(input: {
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

export function bardicInspirationGrantTargetChoices(
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

export function bardicInspirationTargetCanPerceiveSurroundings(
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

export function bardicInspirationGrantTargetHoleId(
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

export function magicActionHealingPoolDistributionHole(
  state: BattleState,
  actor: CharacterBattleCreatureState,
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
      sourceCombatantId: actor.combatantId,
      sourceProcedureRef: procedureRef,
      rangeFeet: unitFeature.healingPool.rangeFeet,
      poolHitPoints: Hp(magicActionHealingPoolSize(actor, unitFeature)),
      perTargetCap: unitFeature.healingPool.perTargetCap,
    },
    choices: magicActionHealingPoolTargetChoices(state),
  };
}

export function magicActionHealingPoolDistributionHoleId(
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

export function magicActionHealingPoolSize(
  actor: CharacterBattleCreatureState,
  unitFeature: MechanicalUnitFeature<"magicActionHealingPool">,
): number {
  const classLevel =
    actor.origin.classLevels.find(
      (level) => level.className === unitFeature.className,
    )?.level ?? 0;
  return Number(classLevel) * unitFeature.healingPool.pool.multiplier;
}

export function combatantIsBloodied(combatant: BattleCreatureState): boolean {
  return Number(combatant.hp) <= combatantHalfHitPointMaximum(combatant);
}

export function combatantHalfHitPointMaximum(
  combatant: BattleCreatureState,
): number {
  return Math.floor(Number(effectiveHitPointMaximum(combatant)) / 2);
}

export type AttackActionAreaSaveDamageReplacementProfile =
  MechanicalUnitFeature<"attackActionAreaSaveDamageReplacement">;

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

export function attackActionAreaSaveDamageReplacementSavingThrowHole(
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

export function attackActionAreaSaveDamageReplacementSavingThrowHoleId(
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

export function attackActionAreaSaveDamageReplacementProtocolId(
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

export function characterTotalLevel(
  actor: CharacterBattleCreatureState,
): CharacterLevel {
  return characterBattleLevel(actor.origin.classLevels);
}

export type MagicActionAreaSaveDamageHealingProfile =
  MechanicalUnitFeature<"magicActionAreaSaveDamageHealing">;

export type MagicActionSaveGatedConditionProfile =
  MechanicalUnitFeature<"magicActionSaveGatedCondition">;

function magicActionSaveGatedConditionProtocolId(
  procedureRef: BattleProcedureExecutionRef,
  hole: "saving-throws",
): string {
  return `battle:unit-feature:${procedureRef}:save-gated-condition:${hole}`;
}

export function magicActionSaveGatedConditionSavingThrowHoleId(
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

export function magicActionSaveGatedConditionSavingThrowHole(
  state: BattleState,
  actorId: CombatantId,
  unitFeature: MagicActionSaveGatedConditionProfile,
  procedureRef: BattleProcedureExecutionRef,
  spellSaveDc: DifficultyClass,
): BattleUnitFeatureSavingThrowOutcomeHole {
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
    dc: { kind: "fixed", dc: spellSaveDc },
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

export function magicActionSaveGatedConditionTargetChoices(
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

function magicActionAreaSaveDamageHealingHoles(
  state: BattleState,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
  spellSaveDc: DifficultyClass,
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
      spellSaveDc,
    ),
    magicActionAreaSaveDamageHealingDamageRollHole(procedureRef, unitFeature),
    magicActionAreaSaveDamageHealingHealingTargetHole(state, procedureRef),
    magicActionAreaSaveDamageHealingHealingRollHole(procedureRef, unitFeature),
  ];
}

export function magicActionAreaSaveDamageHealingSavingThrowHole(
  state: BattleState,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  unitFeature: MagicActionAreaSaveDamageHealingProfile,
  spellSaveDc: DifficultyClass,
): BattleUnitFeatureSavingThrowOutcomeHole {
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
    dc: { kind: "fixed", dc: spellSaveDc },
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

export function magicActionAreaSaveDamageHealingHealingTargetHole(
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

export function magicActionAreaSaveDamageHealingDamageRollHole(
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

export function magicActionAreaSaveDamageHealingHealingRollHole(
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

function magicActionAreaSaveDamageHealingProtocolId(
  procedureRef: BattleProcedureExecutionRef,
  hole: "saving-throws" | "damage-roll" | "healing-target" | "healing-roll",
): string {
  return `battle:unit-feature:${procedureRef}:${hole}`;
}

export function diceExprLabel(expr: DiceExpr): string {
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

export function magicActionAreaSaveDamageHealingSavingThrowHoleId(
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

export function magicActionAreaSaveDamageHealingDamageRollHoleId(
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

export function magicActionAreaSaveDamageHealingHealingTargetHoleId(
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

export function magicActionAreaSaveDamageHealingHealingRollHoleId(
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
  const activeOngoingFeature = activeOngoingFeatureOccurrencesForCombatant(
    state,
    actor,
  ).get(occurrenceKey);
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
    combatantWearingArmorCategory(state, actor, category),
  );
}

export function selfBonusActionHealingRollHole(
  unitFeature: MechanicalUnitFeature<"selfBonusActionHealing">,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: selfBonusActionHealingRollHoleId(),
    holeInstanceKey: selfBonusActionHealingRollHoleInstanceKey(),
    label: `Self-healing (${unitFeature.dice}d${unitFeature.dieSize})`,
  };
}

export function selfBonusActionHealingRollProtocolId(): string {
  return "battle:unit-feature:self-bonus-action-healing:healing-roll";
}

export function selfBonusActionHealingRollHoleId(): BattleHoleId {
  return holeId(selfBonusActionHealingRollProtocolId());
}

export function selfBonusActionHealingRollHoleInstanceKey(): HoleInstanceKey {
  return holeInstanceKey(selfBonusActionHealingRollProtocolId());
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
