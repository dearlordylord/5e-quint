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
  BattlePersistentAreaSaveDamageRamMovementHole,
  BattleCollisionRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole,
  BattleCollisionRepositionPersistentAreaSaveDamageTrigger,
  BattlePersistentAreaSaveConditionSavingThrowOutcomeHole,
  BattleDirectionalPersistentAreaDirectionChoiceHole,
  BattleDirectionalPersistentAreaSavingThrowOutcomeHole,
  BattleDirectedRepositionPersistentAreaSaveDamageTrigger,
  BattleDirectedRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole,
  BattleMovableZoneRepositionMovementHole,
  BattleSavingThrowRollModeProjection,
  BattleState,
  BattlePersistentAreaSaveConditionEscapeSavingThrowOutcomeHole,
  BattlePersistentAreaSaveConditionEscapeTrigger,
} from "../battle-state-execution.ts";
import type {
  CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution,
  DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution,
} from "../procedure-execution/spell-procedure-execution.ts";
import type {
  BoundDirectionalPersistentAreaEffect,
  BoundPersistentAreaSaveConditionEffect,
  BoundPersistentAreaSaveConditionEscapeEffect,
} from "./persistent-spell-area-binding.ts";

export type PersistentAreaSaveConditionEffect =
  BoundPersistentAreaSaveConditionEffect;

export type PersistentAreaSaveConditionEscapeEffect =
  BoundPersistentAreaSaveConditionEscapeEffect;

export type RamMovablePersistentAreaEffect = Omit<
  Extract<
    BattleActiveEffect,
    {
      readonly kind: "persistentAreaSaveDamage";
      readonly lifecycle: "collisionReposition";
    }
  >,
  "lifecycle"
> & {
  readonly lifecycle: CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution["lifecycle"];
  readonly save: {
    readonly ability: CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution["ability"];
    readonly dc: CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution["dc"];
  };
  readonly ramMaxMoveFeet: CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution["ramMaxMoveFeet"];
  readonly damage: CollisionRepositionPersistentAreaSaveDamageSpellProcedureExecution["damage"];
};

export type MovablePersistentAreaEffect = Omit<
  Extract<
    BattleActiveEffect,
    {
      readonly kind: "persistentAreaSaveDamage";
      readonly lifecycle: "directedReposition";
    }
  >,
  "lifecycle"
> & {
  readonly lifecycle: DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution["lifecycle"];
  readonly save: {
    readonly ability: DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution["ability"];
    readonly dc: DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution["dc"];
  };
  readonly repositionMaxMoveFeet: DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution["repositionMaxMoveFeet"];
  readonly damage: DirectedRepositionPersistentAreaSaveDamageSpellProcedureExecution["damage"];
};

export type DirectionalPersistentAreaEffect =
  BoundDirectionalPersistentAreaEffect;

type HazardSavingThrow =
  | PersistentAreaSaveConditionEffect["save"]
  | DirectionalPersistentAreaEffect["save"]
  | MovablePersistentAreaEffect["save"];
type SingleTargetSavingThrowProjections<Save extends HazardSavingThrow> = Pick<
  BattleCollisionRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole,
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
export function persistentAreaSaveConditionSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: PersistentAreaSaveConditionEffect,
  trigger: "entersArea" | "endsTurnInArea",
): BattlePersistentAreaSaveConditionSavingThrowOutcomeHole {
  const key = `battle:persistent-area-save-condition-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "End-turn"} DEX save`,
    persistentAreaSaveCondition: {
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
      persistentAreaSaveConditionHeightenedRollModeProjection(effect, targetId),
    ),
  };
}

function persistentAreaSaveConditionHeightenedRollModeProjection(
  effect: PersistentAreaSaveConditionEffect,
  targetId: CombatantId,
): BattleSavingThrowRollModeProjection | undefined {
  return effect.heightenedSpellTargetDisadvantage?.targetId === targetId
    ? { targetId, rollMode: "disadvantage" }
    : undefined;
}

export function persistentAreaSaveConditionEscapeSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: PersistentAreaSaveConditionEscapeEffect,
  trigger: BattlePersistentAreaSaveConditionEscapeTrigger,
): BattlePersistentAreaSaveConditionEscapeSavingThrowOutcomeHole {
  const key = `battle:persistent-area-save-condition-escape-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${trigger === "entersArea" ? "Entry" : "Start-turn"} DEX save`,
    persistentAreaSaveConditionEscape: {
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

export function directionalPersistentAreaSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: DirectionalPersistentAreaEffect,
  trigger: "endsTurnInLine",
): BattleDirectionalPersistentAreaSavingThrowOutcomeHole {
  const key = `battle:directional-persistent-area-line-save:${targetId}:${effect.effectRef}:${effect.directionId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "End-turn STR save",
    directionalPersistentArea: {
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
      directionalPersistentAreaHeightenedRollModeProjection(effect, targetId),
    ),
  };
}

function directionalPersistentAreaHeightenedRollModeProjection(
  effect: DirectionalPersistentAreaEffect,
  targetId: CombatantId,
): BattleSavingThrowRollModeProjection | undefined {
  return effect.heightenedSpellTargetDisadvantage?.targetId === targetId
    ? { targetId, rollMode: "disadvantage" }
    : undefined;
}

export function directionalPersistentAreaDirectionChoiceHole(
  effect: DirectionalPersistentAreaEffect,
): BattleDirectionalPersistentAreaDirectionChoiceHole {
  const key = `battle:directional-persistent-area-line-direction:${effect.effectRef}:${effect.directionId}`;
  return {
    kind: "directionalPersistentAreaDirectionChoice",
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

export function ramMovablePersistentAreaTriggerLabel(
  trigger: BattleCollisionRepositionPersistentAreaSaveDamageTrigger,
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

export function ramMovablePersistentAreaRamMovementHole(
  targetId: CombatantId,
  effect: RamMovablePersistentAreaEffect,
): BattlePersistentAreaSaveDamageRamMovementHole {
  const key = `battle:ram-movable-persistent-area-ram-movement:${targetId}:${effect.effectRef}`;
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

export function ramMovablePersistentAreaRepositionMovementHole(
  effect: RamMovablePersistentAreaEffect,
): BattleMovableZoneRepositionMovementHole {
  const key = `battle:ram-movable-persistent-area-reposition-movement:${effect.effectRef}`;
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

export function ramMovablePersistentAreaSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: RamMovablePersistentAreaEffect,
  trigger: BattleCollisionRepositionPersistentAreaSaveDamageTrigger,
): BattleCollisionRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole {
  const key = `battle:ram-movable-persistent-area-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    ...movableZoneSavingThrowOutcomeHoleBase(
      state,
      targetId,
      effect.save,
      key,
      `${ramMovablePersistentAreaTriggerLabel(trigger)} DEX save`,
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

export function movablePersistentAreaTriggerLabel(
  trigger: BattleDirectedRepositionPersistentAreaSaveDamageTrigger,
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

export function movablePersistentAreaSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: MovablePersistentAreaEffect,
  trigger: BattleDirectedRepositionPersistentAreaSaveDamageTrigger,
): BattleDirectedRepositionPersistentAreaSaveDamageSavingThrowOutcomeHole {
  const key = `battle:movablePersistentArea-save:${targetId}:${effect.effectRef}:${trigger}`;
  return {
    ...movableZoneSavingThrowOutcomeHoleBase(
      state,
      targetId,
      effect.save,
      key,
      `${movablePersistentAreaTriggerLabel(trigger)} CON save`,
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
  Save extends
    | RamMovablePersistentAreaEffect["save"]
    | MovablePersistentAreaEffect["save"],
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

export function movablePersistentAreaRepositionMovementHole(
  effect: MovablePersistentAreaEffect,
): BattleMovableZoneRepositionMovementHole {
  const key = `battle:movablePersistentArea-reposition-movement:${effect.effectRef}`;
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
