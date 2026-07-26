import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { type BattleSubject } from "../battle-subjects.ts";
import { type BattleObjectId, CombatantId } from "../identity.ts";
import {
  battleMovementBudgetForActor,
  effectiveWalkSpeed,
} from "./movement-speed.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleFlamingSphereRamMovementHole,
  BattleFlamingSphereSavingThrowOutcomeHole,
  BattleFlamingSphereTrigger,
  BattleGustOfWindLineDirectionChoiceHole,
  BattleGustOfWindLineSavingThrowOutcomeHole,
  BattleMoonbeamSaveTrigger,
  BattleMoonbeamSavingThrowOutcomeHole,
  BattleMovableZoneRepositionMovementHole,
  BattleGreaseGroundHazardSavingThrowOutcomeHole,
  BattleWebRestraintSavingThrowOutcomeHole,
  BattleWebRestraintTrigger,
  BattleHeldObjectFactsHole,
  BattleHoleId,
  BattleState,
  BattleSavingThrowRollModeProjection,
} from "../battle-state-execution.ts";

export type HideousLaughterEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "hideousLaughter" }
>;

export type GreaseGroundHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "greaseGroundHazard" }
>;

export type WebRestraintHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "webRestraintHazard" }
>;

export type FlamingSphereEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "flamingSphere" }
>;

export type MoonbeamEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "moonbeam" }
>;

export type GustOfWindLineEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "gustOfWindLine" }
>;

export type CommandPendingEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "commandPending" }
>;

type HazardSavingThrow =
  | GreaseGroundHazardEffect["save"]
  | GustOfWindLineEffect["save"]
  | MoonbeamEffect["save"];
type SingleTargetSavingThrowProjections<Save extends HazardSavingThrow> = Pick<
  BattleFlamingSphereSavingThrowOutcomeHole,
  "areaChoices" | "targetRollModes" | "targetFlatBonuses"
> & {
  readonly ability: Save["ability"];
  readonly dc: Save["dc"];
};

function singleTargetSavingThrowProjections<Save extends HazardSavingThrow>(
  state: BattleState,
  targetId: CombatantId,
  save: Save,
  heightenedRollMode?: BattleSavingThrowRollModeProjection,
): SingleTargetSavingThrowProjections<Save> {
  return {
    ability: save.ability,
    dc: save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      save.ability,
      undefined,
      heightenedRollMode,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

export function commandPendingEffectsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly CommandPendingEffect[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return actor.activeEffects.filter(
    (effect): effect is CommandPendingEffect =>
      effect.kind === "commandPending" &&
      effect.expiresAt.combatantId === actorId &&
      effect.expiresAt.round === state.initiative.round,
  );
}

const COMMAND_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE = holeInstanceKey(
  "battle:command-drop:held-object-facts",
);

export function commandDropHeldObjectFactsHole(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "commandDrop";
    }
  >,
): BattleHeldObjectFactsHole {
  return {
    holeInstanceKey: COMMAND_DROP_HELD_OBJECT_FACTS_HOLE_INSTANCE,
    holeId: commandDropHeldObjectFactsHoleId(subject),
    kind: "heldObjectFacts",
    label: "Command Drop held-object facts",
    actorId: subject.actorId,
  };
}

export function commandDropHeldObjectFactsHoleId(
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "commandDrop";
    }
  >,
): BattleHoleId {
  return holeId(
    `battle:command-drop:held-object-facts:${subject.actorId}:${subject.effectRef}`,
  );
}

export function canonicalHeldObjectIdsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleObjectId[] | null {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return null;
  }
  const loadout = actor.origin.selectedLoadout;
  return [
    ...(loadout.weapon === undefined ? [] : [loadout.weapon.itemId]),
    ...(loadout.offHandWeapon === undefined
      ? []
      : [loadout.offHandWeapon.itemId]),
    ...(loadout.shield === undefined ? [] : [loadout.shield.itemId]),
  ];
}

export function greaseGroundHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: GreaseGroundHazardEffect,
  trigger: "entersArea" | "endsTurnInArea",
): BattleGreaseGroundHazardSavingThrowOutcomeHole {
  const key = `battle:grease-ground-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "End-turn"} DEX save`,
    greaseGroundHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ...singleTargetSavingThrowProjections(
      state,
      targetId,
      effect.save,
      greaseGroundHazardHeightenedRollModeProjection(effect, targetId),
    ),
  };
}

function greaseGroundHazardHeightenedRollModeProjection(
  effect: GreaseGroundHazardEffect,
  targetId: CombatantId,
): BattleSavingThrowRollModeProjection | undefined {
  return effect.heightenedSpellTargetDisadvantage?.targetId === targetId
    ? { targetId, rollMode: "disadvantage" }
    : undefined;
}

export function webRestraintSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: WebRestraintHazardEffect,
  trigger: BattleWebRestraintTrigger,
): BattleWebRestraintSavingThrowOutcomeHole {
  const key = `battle:web-restraint-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "Start-turn"} DEX save`,
    webRestraint: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ...singleTargetSavingThrowProjections(state, targetId, effect.save),
  };
}

export function gustOfWindLineSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: GustOfWindLineEffect,
  trigger: "endsTurnInLine",
): BattleGustOfWindLineSavingThrowOutcomeHole {
  const key = `battle:gust-of-wind-line-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${effect.directionId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "End-turn STR save",
    gustOfWindLine: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      directionId: effect.directionId,
      trigger,
      save: effect.save,
      pushDistanceFeet: effect.pushDistanceFeet,
    },
    ...singleTargetSavingThrowProjections(
      state,
      targetId,
      effect.save,
      gustOfWindLineHeightenedRollModeProjection(effect, targetId),
    ),
  };
}

function gustOfWindLineHeightenedRollModeProjection(
  effect: GustOfWindLineEffect,
  targetId: CombatantId,
): BattleSavingThrowRollModeProjection | undefined {
  return effect.heightenedSpellTargetDisadvantage?.targetId === targetId
    ? { targetId, rollMode: "disadvantage" }
    : undefined;
}

export function gustOfWindLineDirectionChoiceHole(
  effect: GustOfWindLineEffect,
): BattleGustOfWindLineDirectionChoiceHole {
  const key = `battle:gust-of-wind-line-direction:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${effect.directionId}`;
  return {
    kind: "gustOfWindLineDirectionChoice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Line direction",
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    areaId: effect.areaId,
    directionId: effect.directionId,
    requiresTableSpatialFact: true,
  };
}

export function flamingSphereTriggerLabel(
  trigger: BattleFlamingSphereTrigger,
): "ram" | "end-within-5-feet" {
  if (trigger === "rammedBySphere") {
    return "ram";
  }
  if (trigger === "endsTurnWithinFiveFeetOfSphere") {
    return "end-within-5-feet";
  }
  const _: never = trigger;
  return _;
}

export function flamingSphereRamMovementHole(
  targetId: CombatantId,
  effect: FlamingSphereEffect,
): BattleFlamingSphereRamMovementHole {
  const key = `battle:flaming-sphere-ram-movement:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}`;
  return {
    kind: "movableZoneRamMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Ram movement",
    movableZone: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.ramMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}

export function flamingSphereRepositionMovementHole(
  effect: FlamingSphereEffect,
): BattleMovableZoneRepositionMovementHole {
  const key = `battle:flaming-sphere-reposition-movement:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}`;
  return {
    kind: "movableZoneRepositionMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Reposition movement",
    movableZone: {
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.ramMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}

export function flamingSphereSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: FlamingSphereEffect,
  trigger: BattleFlamingSphereTrigger,
): BattleFlamingSphereSavingThrowOutcomeHole {
  const key = `battle:flaming-sphere-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${flamingSphereTriggerLabel(trigger)} DEX save`,
    movableZone: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ...singleTargetSavingThrowProjections(state, targetId, effect.save),
  };
}

export function moonbeamTriggerLabel(
  trigger: BattleMoonbeamSaveTrigger,
):
  | "appears-in-area"
  | "area-moves-into-space"
  | "enters-area"
  | "ends-turn-in-area" {
  if (trigger === "appearsInArea") {
    return "appears-in-area";
  }
  if (trigger === "areaMovesIntoSpace") {
    return "area-moves-into-space";
  }
  if (trigger === "entersArea") {
    return "enters-area";
  }
  if (trigger === "endsTurnInArea") {
    return "ends-turn-in-area";
  }
  const _: never = trigger;
  return _;
}

export function moonbeamSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: MoonbeamEffect,
  trigger: BattleMoonbeamSaveTrigger,
): BattleMoonbeamSavingThrowOutcomeHole {
  const key = `battle:moonbeam-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${moonbeamTriggerLabel(trigger)} CON save`,
    movableZone: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ...singleTargetSavingThrowProjections(state, targetId, effect.save),
  };
}

export function moonbeamRepositionMovementHole(
  effect: MoonbeamEffect,
): BattleMovableZoneRepositionMovementHole {
  const key = `battle:moonbeam-reposition-movement:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}`;
  return {
    kind: "movableZoneRepositionMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Reposition movement",
    movableZone: {
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.repositionMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}

export function hideousLaughterEffects(
  combatant: BattleCreatureState | undefined,
): readonly HideousLaughterEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is HideousLaughterEffect =>
          effect.kind === "hideousLaughter",
      );
}

export function standFromProneCostFeet(
  state: BattleState,
  actorId: CombatantId,
): number | null {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || !hasCondition(actor.conditions, "prone")) {
    return null;
  }
  if (hideousLaughterEffects(actor).length > 0) {
    return null;
  }
  const speed = effectiveWalkSpeed(
    actor,
    state.grapples.some((grapple) => grapple.targetId === actorId),
  );
  const cost = Math.floor(Number(speed) / 2);
  const remaining = battleMovementBudgetForActor(state, actorId).remainingFeet;
  if (cost <= 0 || Number(remaining) < cost) return null;
  return cost;
}
