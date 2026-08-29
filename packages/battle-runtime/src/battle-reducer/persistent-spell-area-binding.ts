import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  AreaMovementDistanceDamageSpellProcedureExecution,
  DirectionalPersistentAreaSpellProcedureExecution,
  MagicalDarknessPointOriginSpellProcedureExecution,
  MagicSuppressionEmanationSpellProcedureExecution,
  PersistentAreaSaveCompositeSpellProcedureExecution,
  PersistentAreaSaveConditionEscapeSpellProcedureExecution,
  PersistentAreaSaveConditionSpellProcedureExecution,
  PersistentAreaTraitSpellProcedureExecution,
} from "../procedure-execution/spell-procedure-execution.ts";
import { spellProcedureBoundToActiveEffect } from "./spell-active-effect-binding.ts";

type EffectOf<Kind extends BattleActiveEffect["kind"]> = Extract<
  BattleActiveEffect,
  { readonly kind: Kind }
>;

export type BoundPersistentAreaSaveConditionEffect =
  EffectOf<"persistentAreaSaveCondition"> & {
    readonly save: {
      readonly ability: PersistentAreaSaveConditionSpellProcedureExecution["ability"];
      readonly dc: PersistentAreaSaveConditionSpellProcedureExecution["dc"];
    };
  };

export function boundPersistentAreaSaveConditionEffect(
  state: BattleState,
  effect: EffectOf<"persistentAreaSaveCondition">,
): BoundPersistentAreaSaveConditionEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "persistentAreaSaveCondition"
    ? { ...effect, save: { ability: facts.ability, dc: facts.dc } }
    : undefined;
}

export type BoundPersistentAreaSaveConditionEscapeEffect =
  EffectOf<"persistentAreaSaveConditionEscape"> & {
    readonly sideFeet: PersistentAreaSaveConditionEscapeSpellProcedureExecution["targeting"]["sideFeet"];
    readonly save: {
      readonly ability: PersistentAreaSaveConditionEscapeSpellProcedureExecution["ability"];
      readonly dc: PersistentAreaSaveConditionEscapeSpellProcedureExecution["dc"];
    };
  };

export function boundPersistentAreaSaveConditionEscapeEffect(
  state: BattleState,
  effect: EffectOf<"persistentAreaSaveConditionEscape">,
): BoundPersistentAreaSaveConditionEscapeEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "persistentAreaSaveConditionEscape"
    ? {
        ...effect,
        sideFeet: facts.targeting.sideFeet,
        save: { ability: facts.ability, dc: facts.dc },
      }
    : undefined;
}

export type BoundPersistentAreaSaveCompositeEffect =
  EffectOf<"persistentAreaSaveComposite"> & {
    readonly radiusFeet: PersistentAreaSaveCompositeSpellProcedureExecution["targeting"]["radiusFeet"];
    readonly heightFeet: PersistentAreaSaveCompositeSpellProcedureExecution["targeting"]["heightFeet"];
    readonly save: {
      readonly ability: PersistentAreaSaveCompositeSpellProcedureExecution["ability"];
      readonly dc: PersistentAreaSaveCompositeSpellProcedureExecution["dc"];
    };
  };

export function boundPersistentAreaSaveCompositeEffect(
  state: BattleState,
  effect: EffectOf<"persistentAreaSaveComposite">,
): BoundPersistentAreaSaveCompositeEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "persistentAreaSaveComposite"
    ? {
        ...effect,
        radiusFeet: facts.targeting.radiusFeet,
        heightFeet: facts.targeting.heightFeet,
        save: { ability: facts.ability, dc: facts.dc },
      }
    : undefined;
}

export type BoundAreaMovementDistanceDamageEffect =
  EffectOf<"areaMovementDistanceDamage"> &
    Pick<
      AreaMovementDistanceDamageSpellProcedureExecution,
      "damage" | "damagePerFeet"
    >;

export function boundAreaMovementDistanceDamageEffect(
  state: BattleState,
  effect: EffectOf<"areaMovementDistanceDamage">,
): BoundAreaMovementDistanceDamageEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "areaMovementDistanceDamage"
    ? {
        ...effect,
        damage: facts.damage,
        damagePerFeet: facts.damagePerFeet,
      }
    : undefined;
}

export type BoundDirectionalPersistentAreaEffect =
  EffectOf<"directionalPersistentArea"> & {
    readonly line: DirectionalPersistentAreaSpellProcedureExecution["targeting"];
    readonly save: {
      readonly ability: DirectionalPersistentAreaSpellProcedureExecution["ability"];
      readonly dc: DirectionalPersistentAreaSpellProcedureExecution["dc"];
    };
  } & Pick<
      DirectionalPersistentAreaSpellProcedureExecution,
      "movementCost" | "pushDistanceFeet"
    >;

export function boundDirectionalPersistentAreaEffect(
  state: BattleState,
  effect: EffectOf<"directionalPersistentArea">,
): BoundDirectionalPersistentAreaEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "directionalPersistentArea"
    ? {
        ...effect,
        line: facts.targeting,
        save: { ability: facts.ability, dc: facts.dc },
        movementCost: facts.movementCost,
        pushDistanceFeet: facts.pushDistanceFeet,
      }
    : undefined;
}

export function persistentAreaTraitRadiusFeet(
  state: BattleState,
  effect: EffectOf<"persistentAreaTrait">,
):
  | PersistentAreaTraitSpellProcedureExecution["targeting"]["radiusFeet"]
  | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "persistentAreaTrait"
    ? facts.targeting.radiusFeet
    : undefined;
}

export function magicalDarknessPointOriginRadiusFeet(
  state: BattleState,
  effect: EffectOf<"magicalDarknessPointOrigin">,
):
  | MagicalDarknessPointOriginSpellProcedureExecution["targeting"]["radiusFeet"]
  | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "magicalDarknessPointOrigin"
    ? facts.targeting.radiusFeet
    : undefined;
}

export function magicSuppressionEmanationRadiusFeet(
  state: BattleState,
  effect: EffectOf<"magicSuppressionEmanation">,
):
  | MagicSuppressionEmanationSpellProcedureExecution["targeting"]["radiusFeet"]
  | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "magicSuppressionEmanation"
    ? facts.targeting.radiusFeet
    : undefined;
}
