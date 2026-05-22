import type { Size, SpellRecord, UnitRecord } from "@dnd/surface/surface/types";

import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  activeDruidWildShape,
  revertDruidWildShapeForm,
} from "./druid-wild-shape.ts";

export type BattleShapeShiftTrueFormFacts = {
  readonly kind: "combatantBaseState";
};

export type BattleShapeShiftSource =
  | {
      readonly kind: "classFeature";
      readonly sourceCombatantId: CombatantId;
      readonly sourceUnitId: UnitRecord["id"];
    }
  | {
      readonly kind: "spellEffect";
      readonly sourceCombatantId: CombatantId;
      readonly sourceSpellId: SpellRecord["id"];
    }
  | {
      readonly kind: "statBlockShapechanger";
      readonly sourceCombatantId: CombatantId;
    };

export type BattleShapeShiftReplacementFormFacts = {
  readonly kind: "runtimeCreatureForm";
  readonly creatureSize: Size;
};

export type BattleShapeShiftReversionOwner =
  | {
      readonly kind: "druidWildShapeActiveEffect";
      readonly effect: Extract<
        BattleActiveEffect,
        { readonly kind: "druidWildShapeForm" }
      >;
    }
  | {
      readonly kind: "spellTransformationActiveEffect";
    }
  | {
      readonly kind: "statBlockShapechangerRuntime";
    };

export type BattleShapeShiftRuntimeOwner =
  | {
      readonly source: Extract<
        BattleShapeShiftSource,
        { readonly kind: "classFeature" }
      >;
      readonly reversionOwner: Extract<
        BattleShapeShiftReversionOwner,
        { readonly kind: "druidWildShapeActiveEffect" }
      >;
    }
  | {
      readonly source: Extract<
        BattleShapeShiftSource,
        { readonly kind: "spellEffect" }
      >;
      readonly reversionOwner: Extract<
        BattleShapeShiftReversionOwner,
        { readonly kind: "spellTransformationActiveEffect" }
      >;
    }
  | {
      readonly source: Extract<
        BattleShapeShiftSource,
        { readonly kind: "statBlockShapechanger" }
      >;
      readonly reversionOwner: Extract<
        BattleShapeShiftReversionOwner,
        { readonly kind: "statBlockShapechangerRuntime" }
      >;
    };

export type BattleShapeShiftedRuntimeState =
  | {
      readonly kind: "trueForm";
      readonly trueForm: BattleShapeShiftTrueFormFacts;
    }
  | ({
      readonly kind: "shapeShifted";
      readonly trueForm: BattleShapeShiftTrueFormFacts;
      readonly replacementForm: BattleShapeShiftReplacementFormFacts;
    } & BattleShapeShiftRuntimeOwner);

export type BattleShapeShiftReversionResult =
  | { readonly tag: "trueForm"; readonly state: BattleState }
  | { readonly tag: "reverted"; readonly state: BattleState }
  | {
      readonly tag: "missingCombatant";
      readonly state: BattleState;
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "unsupportedShapeShiftSource";
      readonly state: BattleState;
      readonly source: BattleShapeShiftSource;
    };

const TRUE_FORM_FACTS: BattleShapeShiftTrueFormFacts = {
  kind: "combatantBaseState",
};

export function trueFormRuntimeState(): Extract<
  BattleShapeShiftedRuntimeState,
  { readonly kind: "trueForm" }
> {
  return {
    kind: "trueForm",
    trueForm: TRUE_FORM_FACTS,
  };
}

export function shapeShiftedRuntimeState(input: {
  readonly replacementForm: BattleShapeShiftReplacementFormFacts;
} & BattleShapeShiftRuntimeOwner): Extract<
  BattleShapeShiftedRuntimeState,
  { readonly kind: "shapeShifted" }
> {
  return {
    kind: "shapeShifted",
    trueForm: TRUE_FORM_FACTS,
    ...input,
  };
}

export function battleShapeShiftedRuntimeState(
  combatant: BattleCreatureState,
): BattleShapeShiftedRuntimeState {
  const wildShape = activeDruidWildShape(combatant);
  return wildShape === null
    ? trueFormRuntimeState()
    : shapeShiftedRuntimeState({
        source: {
          kind: "classFeature",
          sourceCombatantId: wildShape.effect.sourceCombatantId,
          sourceUnitId: wildShape.effect.sourceUnitId,
        },
        replacementForm: {
          kind: "runtimeCreatureForm",
          creatureSize: wildShape.form.statBlock.size,
        },
        reversionOwner: {
          kind: "druidWildShapeActiveEffect",
          effect: wildShape.effect,
        },
      });
}

export function combatantIsShapeShifted(
  combatant: BattleCreatureState,
): boolean {
  return battleShapeShiftedRuntimeState(combatant).kind === "shapeShifted";
}

export function revertShapeShiftedRuntimeState(input: {
  readonly state: BattleState;
  readonly shapeShift: Extract<
    BattleShapeShiftedRuntimeState,
    { readonly kind: "shapeShifted" }
  >;
}): BattleShapeShiftReversionResult {
  if (input.shapeShift.reversionOwner.kind !== "druidWildShapeActiveEffect") {
    return {
      tag: "unsupportedShapeShiftSource",
      state: input.state,
      source: input.shapeShift.source,
    };
  }
  const combatantId = input.shapeShift.reversionOwner.effect.sourceCombatantId;
  if (!input.state.combatants.has(combatantId)) {
    return {
      tag: "missingCombatant",
      state: input.state,
      combatantId,
    };
  }
  return {
    tag: "reverted",
    state: revertDruidWildShapeForm({
      state: input.state,
      actorId: combatantId,
    }),
  };
}

export function revertShapeShiftedCombatantToTrueForm(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
}): BattleShapeShiftReversionResult {
  const combatant = input.state.combatants.get(input.combatantId);
  if (combatant === undefined) {
    return {
      tag: "missingCombatant",
      state: input.state,
      combatantId: input.combatantId,
    };
  }
  const shapeShift = battleShapeShiftedRuntimeState(combatant);
  if (shapeShift.kind === "trueForm") {
    return { tag: "trueForm", state: input.state };
  }
  return revertShapeShiftedRuntimeState({
    state: input.state,
    shapeShift,
  });
}
