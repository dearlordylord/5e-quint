import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { ongoingConcentrationAreaSpellFacts } from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
//
// The Sleet Storm Spell Procedure Profile: action-time Spell Slot casting
// creates a caster-owned Concentration Cylinder. The runtime owns Spell Slot
// spending, Concentration duration, caller-supplied Cylinder identity,
// Difficult Terrain and Heavily Obscured projections, a shared per-turn
// Dexterity Saving Throw ledger, failed-save Prone application, failed-save
// Concentration loss, and duration/concentration cleanup. Exposed-flame
// dousing, automatic table geometry, and pathfinding remain outside the battle
// runtime.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Sleet Storm":
//     Action; 150 feet; Concentration up to 1 minute; 40-foot-tall
//     20-foot-radius Cylinder; Heavily Obscured; exposed flames are doused;
//     ground is Difficult Terrain; first entry on a turn or turn start in the
//     Cylinder requires a Dexterity save or the creature has Prone and loses
//     Concentration.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Spell
//     Invocation, Area of Effect/Cylinder, Difficult Terrain, Heavily Obscured,
//     Prone, and Saving Throw.

import { type ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Result, Schema } from "effect";

import {
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { resolvePersistentAreaSaveCompositeSpellAct } from "../spells-resolve-area-effects.ts";
import { hasSharedNonEmptyOncePerTurnLimitGroup } from "./once-per-turn-limit-group-admission.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type PersistentAreaSaveCompositeSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentAreaSaveComposite" }
>;
type PersistentAreaSaveCompositeResolveInput =
  SpellProcedureProfileResolveInput<PersistentAreaSaveCompositeSpellInvocation>;
type OngoingMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingOperationEffect = OngoingMechanics["operations"][number]["effect"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type OngoingConcentrationAreaSpell = NonNullable<
  ReturnType<typeof ongoingConcentrationAreaSpellFacts>
>;
type PersistentAreaSaveCompositeMechanicsShape = OngoingMechanics & {
  readonly range: Extract<
    OngoingMechanics["range"],
    { readonly kind: "point" }
  > & { readonly feet: number };
};
type PersistentAreaSaveCompositeSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "composite" }
  >;
};
type PersistentAreaSaveCompositeProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly heightFeet: number;
};

const PERSISTENT_AREA_SAVE_COMPOSITE_LEVEL = 3;
const PERSISTENT_AREA_SAVE_COMPOSITE_RANGE_FEET = 150;
const PERSISTENT_AREA_SAVE_COMPOSITE_DURATION_MINUTES = 1;
const PERSISTENT_AREA_SAVE_COMPOSITE_OPERATION_COUNT = 5;
const PERSISTENT_AREA_SAVE_COMPOSITE_RADIUS_FEET = 20;
const PERSISTENT_AREA_SAVE_COMPOSITE_HEIGHT_FEET = 40;

function admitPersistentAreaSaveComposite(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly PersistentAreaSaveCompositeSpellInvocation[] {
  const persistentAreaSaveComposite = persistentAreaSaveCompositeSpell(spell);
  if (persistentAreaSaveComposite === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
    (slot): readonly PersistentAreaSaveCompositeSpellInvocation[] => {
      if (Number(slot.spellLevel) < PERSISTENT_AREA_SAVE_COMPOSITE_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaSaveComposite",
          spell,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginCylinder",
            radiusFeet: movementFeet(persistentAreaSaveComposite.radiusFeet),
            heightFeet: movementFeet(persistentAreaSaveComposite.heightFeet),
          },
          durationTicks: persistentAreaSaveComposite.durationTicks,
          rangeFeet: movementFeet(persistentAreaSaveComposite.rangeFeet),
        },
      ];
    },
  );
}

function persistentAreaSaveCompositeSpell(
  spell: BattleSpellAdmissionSource,
): PersistentAreaSaveCompositeProfileShape | null {
  const ongoing = ongoingConcentrationAreaSpellFacts(spell);
  if (ongoing === null) {
    return null;
  }
  const { mechanics, duration, durationTicks, area } = ongoing;
  const enterOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const startTurnOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_starts_turn_in_area",
  );
  const difficultTerrainOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_difficult_terrain",
  );
  const heavilyObscuredOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_heavily_obscured",
  );
  const exposedFlamesOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "douse_exposed_flames",
  );
  if (
    !persistentAreaSaveCompositeEnvelopeIsSupported(mechanics, duration) ||
    Result.isFailure(durationTicks) ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "cylinder" ||
    area.shape.radiusFeet !== PERSISTENT_AREA_SAVE_COMPOSITE_RADIUS_FEET ||
    area.shape.heightFeet !== PERSISTENT_AREA_SAVE_COMPOSITE_HEIGHT_FEET ||
    !isPersistentAreaSaveCompositeSaveGate(enterOperation?.effect) ||
    !isPersistentAreaSaveCompositeSaveGate(startTurnOperation?.effect) ||
    !hasSharedNonEmptyOncePerTurnLimitGroup([
      enterOperation?.usageLimit,
      startTurnOperation?.usageLimit,
    ]) ||
    difficultTerrainOperation === undefined ||
    heavilyObscuredOperation === undefined ||
    exposedFlamesOperation === undefined
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.success,
    rangeFeet: mechanics.range.feet,
    radiusFeet: area.shape.radiusFeet,
    heightFeet: area.shape.heightFeet,
  };
}

function persistentAreaSaveCompositeEnvelopeIsSupported(
  mechanics: OngoingMechanics,
  duration: OngoingConcentrationAreaSpell["duration"],
): mechanics is PersistentAreaSaveCompositeMechanicsShape {
  return (
    mechanics.level === PERSISTENT_AREA_SAVE_COMPOSITE_LEVEL &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === PERSISTENT_AREA_SAVE_COMPOSITE_RANGE_FEET &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === PERSISTENT_AREA_SAVE_COMPOSITE_DURATION_MINUTES &&
    mechanics.operations.length ===
      PERSISTENT_AREA_SAVE_COMPOSITE_OPERATION_COUNT
  );
}

function isPersistentAreaSaveCompositeSaveGate(
  effect: OngoingOperationEffect | undefined,
): effect is PersistentAreaSaveCompositeSaveEffect {
  if (
    effect?.kind !== "save_gate" ||
    effect.ability !== "dex" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    effect.onSuccess.kind !== "none" ||
    effect.onFail.kind !== "composite" ||
    effect.onFail.effects.length !== 2
  ) {
    return false;
  }
  const appliesProne = effect.onFail.effects.some(
    (failedEffect) =>
      failedEffect.kind === "apply_condition" &&
      failedEffect.condition === "prone",
  );
  const breaksConcentration = effect.onFail.effects.some(
    (failedEffect) => failedEffect.kind === "break_concentration",
  );
  return appliesProne && breaksConcentration;
}

function resolvePersistentAreaSaveComposite(
  input: PersistentAreaSaveCompositeResolveInput,
): BattleResolutionResult {
  return resolvePersistentAreaSaveCompositeSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const PersistentAreaSaveCompositeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveComposite"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginCylinder"),
        radiusFeet: MovementFeet,
        heightFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
    }),
  );

export const persistentAreaSaveCompositeProfile = {
  procedure: "persistentAreaSaveComposite",
  executionSchema: PersistentAreaSaveCompositeInvocationSchema,
  admit: admitPersistentAreaSaveComposite,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolvePersistentAreaSaveComposite,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveComposite",
  PersistentAreaSaveCompositeSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
