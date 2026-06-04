import type { UnitRecord } from "@dnd/surface/surface/types";
import { Match } from "effect";

import {
  activeEffectsWithoutShapeShiftOwner,
  activeShapeShiftOwnerEffect,
  battleCreatureWithSpellActiveEffects,
} from "../active-effect/lifecycle.ts";
import type {
  BattleShapeShiftReplacementFormFacts,
  SpellShapeShiftedFormActiveEffect,
} from "../active-effect/types.ts";
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

const byKind = Match.discriminator("kind");

export type {
  BattleShapeShiftReplacementFormFacts,
  SpellShapeShiftedFormActiveEffect,
};

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
      readonly sourceSpellId: SpellShapeShiftedFormActiveEffect["sourceSpellId"];
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
      readonly kind: "spellShapeShiftActiveEffect";
      readonly targetCombatantId: CombatantId;
      readonly effect: SpellShapeShiftedFormActiveEffect;
    };

export type BattleShapeShiftRuntimeOwner = {
  readonly source: BattleShapeShiftSource;
  readonly reversionOwner: BattleShapeShiftReversionOwner;
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
    };

export type BattleShapeShiftRuntimeReversionProjection =
  | {
      readonly tag: "alreadyTrueForm";
      readonly shapeShift: Extract<
        BattleShapeShiftedRuntimeState,
        { readonly kind: "trueForm" }
      >;
    }
  | {
      readonly tag: "revertedToTrueForm";
      readonly shapeShift: Extract<
        BattleShapeShiftedRuntimeState,
        { readonly kind: "trueForm" }
      >;
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

export function shapeShiftedRuntimeState(
  input: {
    readonly replacementForm: BattleShapeShiftReplacementFormFacts;
  } & BattleShapeShiftRuntimeOwner,
): Extract<BattleShapeShiftedRuntimeState, { readonly kind: "shapeShifted" }> {
  return {
    kind: "shapeShifted",
    trueForm: TRUE_FORM_FACTS,
    ...input,
  };
}

export function projectShapeShiftRuntimeReversion(
  shapeShift: BattleShapeShiftedRuntimeState,
): BattleShapeShiftRuntimeReversionProjection {
  return Match.value(shapeShift).pipe(
    byKind(
      "trueForm",
      (): Extract<
        BattleShapeShiftRuntimeReversionProjection,
        { readonly tag: "alreadyTrueForm" }
      > => ({
        tag: "alreadyTrueForm",
        shapeShift: trueFormRuntimeState(),
      }),
    ),
    byKind(
      "shapeShifted",
      (): Extract<
        BattleShapeShiftRuntimeReversionProjection,
        { readonly tag: "revertedToTrueForm" }
      > => ({
        tag: "revertedToTrueForm",
        shapeShift: trueFormRuntimeState(),
      }),
    ),
    Match.exhaustive,
  );
}

export function battleShapeShiftedRuntimeState(
  combatant: BattleCreatureState,
): BattleShapeShiftedRuntimeState {
  const shapeShiftOwner = activeShapeShiftOwnerEffect(combatant.activeEffects);
  if (shapeShiftOwner === null) {
    return trueFormRuntimeState();
  }
  return Match.value(shapeShiftOwner).pipe(
    byKind("druidWildShapeForm", (wildShapeEffect) => {
      const canonicalCombatant = {
        ...combatant,
        activeEffects: activeEffectsWithoutShapeShiftOwner(
          combatant.activeEffects,
        ),
      };
      const wildShape = activeDruidWildShape({
        ...canonicalCombatant,
        activeEffects: [...canonicalCombatant.activeEffects, wildShapeEffect],
      });
      if (wildShape === null) {
        return trueFormRuntimeState();
      }
      return shapeShiftedRuntimeState({
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
    }),
    byKind("spellShapeShiftedForm", (spellShapeShift) =>
      shapeShiftedRuntimeState({
        source: {
          kind: "spellEffect",
          sourceCombatantId: spellShapeShift.sourceCombatantId,
          sourceSpellId: spellShapeShift.sourceSpellId,
        },
        replacementForm: spellShapeShift.replacementForm,
        reversionOwner: {
          kind: "spellShapeShiftActiveEffect",
          targetCombatantId: combatant.combatantId,
          effect: spellShapeShift,
        },
      }),
    ),
    Match.exhaustive,
  );
}

function revertDruidWildShapeRuntimeState(input: {
  readonly state: BattleState;
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "druidWildShapeForm" }
  >;
}): BattleShapeShiftReversionResult {
  const combatantId = input.effect.sourceCombatantId;
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

function revertSpellShapeShiftRuntimeState(input: {
  readonly state: BattleState;
  readonly targetCombatantId: CombatantId;
  readonly effect: SpellShapeShiftedFormActiveEffect;
}): BattleShapeShiftReversionResult {
  const target = input.state.combatants.get(input.targetCombatantId);
  if (target === undefined) {
    return {
      tag: "missingCombatant",
      state: input.state,
      combatantId: input.targetCombatantId,
    };
  }
  const activeEffects = activeEffectsWithoutShapeShiftOwner(
    target.activeEffects,
  );
  const combatants = new Map(input.state.combatants);
  combatants.set(input.targetCombatantId, {
    ...battleCreatureWithSpellActiveEffects(target, activeEffects),
  });
  return {
    tag: "reverted",
    state: { ...input.state, combatants },
  };
}

export function spellShapeShiftedRuntimeState(
  input: {
    readonly targetCombatantId: CombatantId;
    readonly effect: SpellShapeShiftedFormActiveEffect;
  },
): Extract<BattleShapeShiftedRuntimeState, { readonly kind: "shapeShifted" }> {
  return shapeShiftedRuntimeState({
    source: {
      kind: "spellEffect",
      sourceCombatantId: input.effect.sourceCombatantId,
      sourceSpellId: input.effect.sourceSpellId,
    },
    replacementForm: input.effect.replacementForm,
    reversionOwner: {
      kind: "spellShapeShiftActiveEffect",
      targetCombatantId: input.targetCombatantId,
      effect: input.effect,
    },
  });
}

export function combatantIsShapeShifted(
  combatant: BattleCreatureState,
): boolean {
  return battleShapeShiftedRuntimeState(combatant).kind === "shapeShifted";
}

export function combatantShapeShiftingSuppressed(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "moonbeam" &&
        effect.shapeShiftSuppressed.includes(combatantId),
    ),
  );
}

export function revertShapeShiftedRuntimeState(input: {
  readonly state: BattleState;
  readonly shapeShift: Extract<
    BattleShapeShiftedRuntimeState,
    { readonly kind: "shapeShifted" }
  >;
}): BattleShapeShiftReversionResult {
  return Match.value(input.shapeShift.reversionOwner).pipe(
    byKind("druidWildShapeActiveEffect", (owner) =>
      revertDruidWildShapeRuntimeState({
        state: input.state,
        effect: owner.effect,
      }),
    ),
    byKind("spellShapeShiftActiveEffect", (owner) =>
      revertSpellShapeShiftRuntimeState({
        state: input.state,
        targetCombatantId: owner.targetCombatantId,
        effect: owner.effect,
      }),
    ),
    Match.exhaustive,
  );
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
