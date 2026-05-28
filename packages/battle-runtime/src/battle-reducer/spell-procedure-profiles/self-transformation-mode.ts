// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TRANSFORMATION_MODE
//
// The selfTransformationMode Spell Procedure Profile: a prepared Magic Action
// spell that lets the caster choose and later replace one active self
// transformation mode.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Alter Self": Action, Self, Concentration up to 1 hour;
//     choose Aquatic Adaptation, Change Appearance, or Natural Weapons; replace
//     the chosen option with a Magic action during the duration.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration,
//     Spell Invocation, Spell Effect, Speed, Damage Type, and Unarmed Strike.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  attackBonus,
  AbilityModifier,
  type ProficiencyBonus as ProficiencyBonusType,
} from "@dnd/shared/types";
import type {
  DamageType,
  EffectAtom,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either, Match } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type SelfTransformationModeEffectPayload,
  type SelfTransformationModeKind,
  type SelfTransformationModeSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { SELF_TRANSFORMATION_MODE_KINDS } from "../domain-constants.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import {
  applySelfTransformationModeEffect,
  selfTransformationModeLabel,
} from "../spells-active-effects.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import { selfTransformationModeChoiceHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  AttackBonus,
  BattleRuntimeObjectSchema,
  DamageDieSizeSchema,
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type SelfTransformationModeInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "selfTransformationMode" }
>;
type SelfTransformationModeResolveInput = SpellProcedureProfileResolveInput<
  SelfTransformationModeInvocation,
  ActionSpellBattleResolutionInput
>;

type SpellActivationPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>["phases"][number];
type DirectActivationPhase = Extract<
  SpellActivationPhase,
  { readonly kind: "direct" }
>;
type CastTimeEffectModeChoice = NonNullable<DirectActivationPhase["mode"]>;
type CastTimeEffectModeOption = CastTimeEffectModeChoice["options"][number];

function admitSelfTransformationMode(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SelfTransformationModeInvocation[] {
  const projection = selfTransformationModeSpellProjection({
    actorId: ctx.actor.combatantId,
    spell,
    spellcastingAbilityModifier:
      ctx.actor.origin.spellcasting.spellcastingAbilityModifier,
    proficiencyBonus: ctx.actor.origin.spellcasting.proficiencyBonus,
  });
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly SelfTransformationModeInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "selfTransformationMode",
              spell,
              actionCost: "magicAction",
              modeChoices: projection.modeChoices,
              naturalWeaponFacts: projection.naturalWeaponFacts,
              expiresAt: projection.expiresAt,
            },
          ],
  );
}

function selfTransformationModeSpellProjection(input: {
  readonly actorId: CombatantId;
  readonly spell: SpellRecord;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
}): Pick<
  SelfTransformationModeSpellInvocation,
  "modeChoices" | "naturalWeaponFacts" | "expiresAt"
> | null {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase === undefined ||
    phase.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects !== undefined ||
    phase.mode?.allowsMidDurationSwitchAs !== "magic_action"
  ) {
    return null;
  }
  const modeProjection = selfTransformationModeOptionsProjection(
    phase.mode.options,
    input.spellcastingAbilityModifier,
    input.proficiencyBonus,
  );
  if (modeProjection === null) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        modeChoices: modeProjection.modeChoices,
        naturalWeaponFacts: modeProjection.naturalWeaponFacts,
        expiresAt: {
          kind: "concentration",
          combatantId: input.actorId,
          durationTicks: durationTicks.right,
        },
      };
}

function selfTransformationModeOptionsProjection(
  options: CastTimeEffectModeChoice["options"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): Pick<
  SelfTransformationModeSpellInvocation,
  "modeChoices" | "naturalWeaponFacts"
> | null {
  const naturalWeaponFacts = options.reduce<
    SelfTransformationModeSpellInvocation["naturalWeaponFacts"] | null
  >(
    (projected, option) =>
      projected ??
      selfTransformationNaturalWeaponProjection(
        option.effects,
        spellcastingAbilityModifier,
        proficiencyBonus,
      ),
    null,
  );
  const modeChoices = SELF_TRANSFORMATION_MODE_KINDS.filter((mode) =>
    selfTransformationModeIsSupportedByOptions(mode, options),
  );
  const [firstMode, ...restModes] = modeChoices;
  return naturalWeaponFacts === null ||
    firstMode === undefined ||
    modeChoices.length !== SELF_TRANSFORMATION_MODE_KINDS.length
    ? null
    : {
        modeChoices: [firstMode, ...restModes],
        naturalWeaponFacts,
      };
}

function selfTransformationModeIsSupportedByOptions(
  mode: SelfTransformationModeKind,
  options: CastTimeEffectModeChoice["options"],
): boolean {
  return options.some((option) =>
    Match.value(mode).pipe(
      Match.when("aquaticAdaptation", () =>
        effectsAreAquaticAdaptation(option.effects),
      ),
      Match.when("changeAppearance", () => option.effects === undefined),
      Match.when("naturalWeapons", () =>
        effectsAreNaturalWeapons(option.effects),
      ),
      Match.exhaustive,
    ),
  );
}

function effectsAreAquaticAdaptation(
  effects: CastTimeEffectModeOption["effects"] | undefined,
): boolean {
  return (
    effects?.length === 2 &&
    effects.some((effect) => effect.kind === "water_breathing") &&
    effects.some(
      (effect) =>
        effect.kind === "grant_speed" &&
        effect.speedKind === "swim" &&
        typeof effect.feet !== "number" &&
        effect.feet.kind === "walk_speed",
    )
  );
}

function effectsAreNaturalWeapons(
  effects: CastTimeEffectModeOption["effects"] | undefined,
): boolean {
  return selfTransformationNaturalWeaponsEffect(effects) !== null;
}

function selfTransformationNaturalWeaponProjection(
  effects: CastTimeEffectModeOption["effects"] | undefined,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): SelfTransformationModeSpellInvocation["naturalWeaponFacts"] | null {
  const effect = selfTransformationNaturalWeaponsEffect(effects);
  if (effect === null) {
    return null;
  }
  const damageTypeChoices = uniqueDamageTypeChoices(
    effect.damageType.options.map((option) => option.damageType),
  );
  return damageTypeChoices === null
    ? null
    : {
        damage: {
          dice: 1,
          dieSize: effect.damageDie,
          damageTypeChoices,
        },
        spellcastingAbilityModifier,
        attackBonus: attackBonus(
          Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
        ),
      };
}

function selfTransformationNaturalWeaponsEffect(
  effects: CastTimeEffectModeOption["effects"] | undefined,
): Extract<EffectAtom, { readonly kind: "natural_weapons" }> | null {
  if (effects?.length !== 1) {
    return null;
  }
  const effect = effects[0];
  if (
    effect === undefined ||
    effect.kind !== "natural_weapons" ||
    effect.damageDie !== 6 ||
    effect.replacesAbility !== "str" ||
    effect.attackRollAbility !== "spellcasting" ||
    effect.damageRollAbility !== "spellcasting"
  ) {
    return null;
  }
  return effect;
}

function uniqueDamageTypeChoices(
  damageTypes: readonly DamageType[],
): readonly [DamageType, ...DamageType[]] | null {
  const unique: DamageType[] = [];
  for (const damageType of damageTypes) {
    if (!unique.includes(damageType)) {
      unique.push(damageType);
    }
  }
  const [first, ...rest] = unique;
  return first === undefined ? null : [first, ...rest];
}

function discoverSelfTransformationModeCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: SelfTransformationModeInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        invocation: selfTransformationModeInvocationRef(invocation),
        mode: { tag: "cast" as const },
      },
      label: invocation.spell.name,
      summary: selfTransformationModeCastSummary(invocation),
      initialHoles: [selfTransformationModeChoiceHole(invocation)],
    },
  ];
}

function selfTransformationModeInvocationRef(
  invocation: SelfTransformationModeInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "selfTransformationMode",
  };
}

function selfTransformationModeCastSummary(
  invocation: SelfTransformationModeInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot and choose ${invocation.modeChoices.map(selfTransformationModeLabel).join(" or ")}.`;
}

function resolveSelfTransformationMode(
  input: SelfTransformationModeResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetSpatialFacts.length > 0 ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.mirrorImageDuplicateRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Self-transformation mode spells use one mode choice fill and Natural Weapons damage type choice.",
    );
  }
  if (input.fillSet.selfTransformationModeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      selfTransformationModeChoiceHole(input.invocation),
    ]);
  }
  const modeEffect = selfTransformationModeEffectPayload(
    input.invocation,
    input.fillSet.selfTransformationModeChoice,
    input.fillSet.damageTypeChoice,
  );
  if (modeEffect.tag === "needsDamageType") {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  if (modeEffect.tag === "invalid") {
    return invalidResult(input.input.state, "invalidFill", modeEffect.message);
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applySelfTransformationModeEffect({
    state: concentrationBase,
    actorId: input.actorId,
    sourceCombatantId: input.actorId,
    sourceSpellId: input.invocation.spell.id,
    modeEffect: modeEffect.modeEffect,
    expiresAt: input.invocation.expiresAt,
  });
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

function selfTransformationModeEffectPayload(
  invocation: SelfTransformationModeInvocation,
  mode: SelfTransformationModeKind,
  damageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined,
):
  | {
      readonly tag: "ok";
      readonly modeEffect: SelfTransformationModeEffectPayload;
    }
  | { readonly tag: "needsDamageType" }
  | { readonly tag: "invalid"; readonly message: string } {
  if (mode !== "naturalWeapons") {
    return damageTypeChoice === undefined
      ? {
          tag: "ok",
          modeEffect: {
            mode,
            naturalWeaponFacts: invocation.naturalWeaponFacts,
          },
        }
      : {
          tag: "invalid",
          message:
            "Self-transformation damage type choice is only valid for Natural Weapons.",
        };
  }
  if (damageTypeChoice === undefined) {
    return { tag: "needsDamageType" };
  }
  const selectedDamageType = damageTypeChoice.value;
  if (
    !invocation.naturalWeaponFacts.damage.damageTypeChoices.includes(
      selectedDamageType,
    )
  ) {
    return {
      tag: "invalid",
      message: "Natural Weapons damage type choice is not available.",
    };
  }
  return {
    tag: "ok",
    modeEffect: {
      mode,
      naturalWeaponFacts: invocation.naturalWeaponFacts,
      naturalWeaponDamageType: selectedDamageType,
    },
  };
}

const SelfTransformationModeInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "selfTransformationMode" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("selfTransformationMode"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    modeChoices: Schema.NonEmptyArray(
      Schema.Literal(...SELF_TRANSFORMATION_MODE_KINDS),
    ),
    naturalWeaponFacts: Schema.Struct({
      damage: Schema.Struct({
        dice: Schema.Literal(1),
        dieSize: DamageDieSizeSchema,
        damageTypeChoices: Schema.NonEmptyArray(DamageTypeSchema),
      }),
      spellcastingAbilityModifier: AbilityModifier,
      attackBonus: AttackBonus,
    }),
    expiresAt: BattleRuntimeObjectSchema,
  }),
);
export const selfTransformationModeProfile = {
  procedure: "selfTransformationMode",
  invocationSchema: SelfTransformationModeInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSelfTransformationMode,
  discoverCastAct: discoverSelfTransformationModeCastAct,
  castSummary: selfTransformationModeCastSummary,
  invocationRef: selfTransformationModeInvocationRef,
  resolve: resolveSelfTransformationMode,
} satisfies SpellProcedureProfile<
  "selfTransformationMode",
  SelfTransformationModeInvocation
>;
