import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { CombatantId } from "../identity.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import type {
  BattleActiveEffect,
  BattleFlamingSphereRamMovementHole,
  BattleFlamingSphereSavingThrowOutcomeHole,
  BattleFlamingSphereTrigger,
  BattleGreaseGroundHazardSavingThrowOutcomeHole,
  BattleGustOfWindLineDirectionChoiceHole,
  BattleGustOfWindLineSavingThrowOutcomeHole,
  BattleMoonbeamSaveTrigger,
  BattleMoonbeamSavingThrowOutcomeHole,
  BattleMovableZoneRepositionMovementHole,
  BattleSavingThrowRollModeProjection,
  BattleState,
  BattleWebRestraintSavingThrowOutcomeHole,
  BattleWebRestraintTrigger,
} from "../battle-state-execution.ts";

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
export function greaseGroundHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: GreaseGroundHazardEffect,
  trigger: "entersArea" | "endsTurnInArea",
): BattleGreaseGroundHazardSavingThrowOutcomeHole {
  const key = `battle:grease-ground-hazard-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "End-turn"} DEX save`,
    greaseGroundHazard: {
      targetId,
      effectRef: effect.effectRef,
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
  const key = `battle:web-restraint-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "Start-turn"} DEX save`,
    webRestraint: {
      targetId,
      effectRef: effect.effectRef,
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
  const key = `battle:gust-of-wind-line-save:${targetId}:${effect.effectRef}:${effect.directionId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "End-turn STR save",
    gustOfWindLine: {
      targetId,
      effectRef: effect.effectRef,
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
  const key = `battle:gust-of-wind-line-direction:${effect.effectRef}:${effect.directionId}`;
  return {
    kind: "gustOfWindLineDirectionChoice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Line direction",
    sourceCombatantId: effect.sourceCombatantId,
    sourceProcedureRef: effect.sourceProcedureRef,
    effectRef: effect.effectRef,
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
  const key = `battle:flaming-sphere-ram-movement:${targetId}:${effect.effectRef}`;
  return {
    kind: "movableZoneRamMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Ram movement",
    movableZone: {
      targetId,
      effectRef: effect.effectRef,
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
  const key = `battle:flaming-sphere-reposition-movement:${effect.effectRef}`;
  return {
    kind: "movableZoneRepositionMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Reposition movement",
    movableZone: {
      effectRef: effect.effectRef,
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
  const key = `battle:flaming-sphere-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    ...movableZoneSavingThrowOutcomeHoleBase(
      state,
      targetId,
      effect.save,
      key,
      `${flamingSphereTriggerLabel(trigger)} DEX save`,
    ),
    movableZone: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
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
  const key = `battle:moonbeam-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    ...movableZoneSavingThrowOutcomeHoleBase(
      state,
      targetId,
      effect.save,
      key,
      `${moonbeamTriggerLabel(trigger)} CON save`,
    ),
    movableZone: {
      targetId,
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
  };
}

function movableZoneSavingThrowOutcomeHoleBase<
  Save extends FlamingSphereEffect["save"] | MoonbeamEffect["save"],
>(
  state: BattleState,
  targetId: CombatantId,
  save: Save,
  key: string,
  label: string,
) {
  return {
    kind: "savingThrowOutcome" as const,
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label,
    ...singleTargetSavingThrowProjections(state, targetId, save),
  };
}

export function moonbeamRepositionMovementHole(
  effect: MoonbeamEffect,
): BattleMovableZoneRepositionMovementHole {
  const key = `battle:moonbeam-reposition-movement:${effect.effectRef}`;
  return {
    kind: "movableZoneRepositionMovement",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Reposition movement",
    movableZone: {
      effectRef: effect.effectRef,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      maxMoveFeet: effect.repositionMaxMoveFeet,
    },
    requiresTableSpatialFact: true,
  };
}
