import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-transformation-mode spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TRANSFORMATION_MODE BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION
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

import {
  elapsedTimeTicks,
  ELAPSED_TIME_TICKS_PER_HOUR,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  attackBonus,
  AbilityModifier,
  type ReadonlyNonEmptyArray,
  type ProficiencyBonus as ProficiencyBonusType,
} from "@dnd/shared/types";
import type { DamageType, EffectAtom } from "@dnd/surface/surface/types";
import { Match } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type SelfTransformationModeEffectPayload,
  type SelfTransformationModeSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { type SelfTransformationModeKind } from "../domain-constants.ts";
import { CombatantId } from "../../identity.ts";
import { allocateBattleActiveEffectRefForCreature } from "../../active-effect/execution-ref.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { SELF_TRANSFORMATION_MODE_KINDS } from "../domain-constants.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { applySelfTransformationModeEffect } from "../spells-active-effects.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import { selfTransformationModeChoiceHole } from "../spells-targeting.ts";
import type {
  OkSpellFillSet,
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  AttackBonus,
  DamageDieSizeSchema,
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type SelfTransformationModeInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "selfTransformationMode" }
>;
type SelfTransformationModeResolveInput =
  SpellProcedureProfileResolveInput<SelfTransformationModeInvocation>;

type SpellActivationPhase = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "activation" }
>["phases"][number];
type DirectActivationPhase = Extract<
  SpellActivationPhase,
  { readonly kind: "direct" }
>;
type CastTimeEffectModeChoice = NonNullable<DirectActivationPhase["mode"]>;
type CastTimeEffectModeOption = CastTimeEffectModeChoice["options"][number];
const SELF_TRANSFORMATION_DURATION_TICKS = elapsedTimeTicks(
  ELAPSED_TIME_TICKS_PER_HOUR,
);

function admitSelfTransformationMode(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SelfTransformationModeInvocation[] {
  const projection = selfTransformationModeSpellProjection({
    actorId: ctx.actor.combatantId,
    spell,
    spellcastingAbilityModifier: ctx.castingSource.abilityModifier,
    proficiencyBonus: ctx.actor.origin.spellcasting.proficiencyBonus,
  });
  if (projection === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SelfTransformationModeInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
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
  readonly spell: BattleSpellAdmissionSource;
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
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1
  ) {
    return null;
  }
  const phase = selfTransformationModePhase(spell.mechanics.phases);
  if (phase === null) return null;
  const modeProjection = selfTransformationModeOptionsProjection(
    phase.mode.options,
    input.spellcastingAbilityModifier,
    input.proficiencyBonus,
  );
  if (modeProjection === null) {
    return null;
  }
  return {
    modeChoices: modeProjection.modeChoices,
    naturalWeaponFacts: modeProjection.naturalWeaponFacts,
    expiresAt: {
      kind: "concentration",
      combatantId: input.actorId,
      durationTicks: SELF_TRANSFORMATION_DURATION_TICKS,
    },
  };
}

function selfTransformationModePhase(phases: readonly SpellActivationPhase[]):
  | (Extract<SpellActivationPhase, { readonly kind: "direct" }> & {
      readonly mode: NonNullable<
        Extract<SpellActivationPhase, { readonly kind: "direct" }>["mode"]
      >;
    })
  | null {
  const [phase, secondPhase] = phases;
  if (
    phase === undefined ||
    secondPhase !== undefined ||
    phase.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects !== undefined ||
    phase.mode === undefined ||
    phase.mode.allowsMidDurationSwitchAs !== "magic_action"
  ) {
    return null;
  }
  return { ...phase, mode: phase.mode };
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
  const damageTypeChoices = uniqueDamageTypeChoices(effect.damageType.options);
  return {
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
  damageTypeOptions: ReadonlyNonEmptyArray<{
    readonly damageType: DamageType;
  }>,
): ReadonlyNonEmptyArray<DamageType> {
  const [firstOption, ...restOptions] = damageTypeOptions;
  const first = firstOption.damageType;
  const unique: DamageType[] = [first];
  for (const { damageType } of restOptions) {
    if (!unique.includes(damageType)) {
      unique.push(damageType);
    }
  }
  return [first, ...unique.slice(1)];
}

function discoverSelfTransformationModeCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SelfTransformationModeInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
      },
      initialHoles: [selfTransformationModeChoiceHole(invocation)],
    },
  ];
}

function resolveSelfTransformationMode(
  input: SelfTransformationModeResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !selfTransformationModeFillsAreAllowed(input.input.fills, input.invocation)
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Self-transformation mode spells use one mode choice fill and Natural Weapons damage type choice.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const modeEffect = selfTransformationModeEffectPayloadFromFillSet(
    input.invocation,
    input.fillSet,
  );
  if (modeEffect.tag === "needsModeChoice") {
    return needsHolesResult(input.input.state, input.input.subject, [
      selfTransformationModeChoiceHole(input.invocation),
    ]);
  }
  if (modeEffect.tag === "needsDamageType") {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (modeEffect.tag === "invalid") {
    return invalidResult(input.input.state, "invalidFill", modeEffect.message);
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [input.actorId],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effectOwner = concentrationBase.combatants.get(input.actorId);
  if (effectOwner === undefined) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Self-transformation effect owner is no longer in the battle.",
    );
  }
  const allocation = allocateBattleActiveEffectRefForCreature({
    owner: effectOwner,
  });
  const allocatedState = {
    ...concentrationBase,
    combatants: new Map(concentrationBase.combatants).set(
      input.actorId,
      allocation.owner,
    ),
  };
  const effected = applySelfTransformationModeEffect({
    state: allocatedState,
    actorId: input.actorId,
    sourceCombatantId: input.actorId,
    sourceProcedureRef: input.input.subject.procedureRef,
    modeEffect: modeEffect.modeEffect,
    expiresAt: input.invocation.expiresAt,
    effectRef: allocation.effectRef,
  });
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

export function resolveStoredGlyphSelfTransformationModeSpellRelease(input: {
  readonly state: BattleState;
  readonly subject: ActionSpellBattleResolutionInput["subject"];
  readonly targetId: CombatantId;
  readonly sourceCombatantId: CombatantId;
  readonly invocation: SelfTransformationModeResolveInput["invocation"];
  readonly fills: readonly BattleFill[];
  readonly fillSet: OkSpellFillSet;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!selfTransformationModeFillsAreAllowed(input.fills, input.invocation)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Self-transformation mode spells use one mode choice fill and Natural Weapons damage type choice.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const modeEffect = selfTransformationModeEffectPayloadFromFillSet(
    input.invocation,
    input.fillSet,
  );
  if (modeEffect.tag === "needsModeChoice") {
    return needsHolesResult(input.state, input.subject, [
      selfTransformationModeChoiceHole({
        ...input.invocation,
        sourceProcedureRef: input.subject.procedureRef,
      }),
    ]);
  }
  if (modeEffect.tag === "needsDamageType") {
    return needsHolesResult(input.state, input.subject, [
      spellDamageTypeChoiceHole({
        ...input.invocation,
        sourceProcedureRef: input.subject.procedureRef,
      }),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (modeEffect.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", modeEffect.message);
  }
  /* v8 ignore stop -- @preserve */
  const effectOwner = input.state.combatants.get(input.targetId);
  if (effectOwner === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Self-transformation effect owner is no longer in the battle.",
    );
  }
  const allocation = allocateBattleActiveEffectRefForCreature({
    owner: effectOwner,
  });
  const allocatedState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.targetId,
      allocation.owner,
    ),
  };
  const effected = applySelfTransformationModeEffect({
    state: allocatedState,
    actorId: input.targetId,
    sourceCombatantId: input.sourceCombatantId,
    sourceProcedureRef: input.subject.procedureRef,
    modeEffect: modeEffect.modeEffect,
    expiresAt: {
      kind: "duration",
      durationTicks: input.invocation.expiresAt.durationTicks,
    },
    effectRef: allocation.effectRef,
  });
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

function selfTransformationModeFillsAreAllowed(
  fills: readonly BattleFill[],
  invocation: SelfTransformationModeResolveInput["invocation"],
): boolean {
  return fillsBelongToSpellCastHoles(fills, [
    selfTransformationModeChoiceHole(invocation).holeId,
    spellDamageTypeChoiceHole(invocation).holeId,
  ]);
}

function selfTransformationModeEffectPayloadFromFillSet(
  invocation: SelfTransformationModeResolveInput["invocation"],
  fillSet: OkSpellFillSet,
):
  | {
      readonly tag: "ok";
      readonly modeEffect: SelfTransformationModeEffectPayload;
    }
  | { readonly tag: "needsModeChoice" }
  | { readonly tag: "needsDamageType" }
  | { readonly tag: "invalid"; readonly message: string } {
  return fillSet.selfTransformationModeChoice === undefined
    ? { tag: "needsModeChoice" }
    : selfTransformationModeEffectPayload(
        invocation,
        fillSet.selfTransformationModeChoice,
        fillSet.damageTypeChoice,
      );
}

function selfTransformationModeEffectPayload(
  invocation: SelfTransformationModeResolveInput["invocation"],
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ok",
    modeEffect: {
      mode,
      naturalWeaponFacts: invocation.naturalWeaponFacts,
      naturalWeaponDamageType: selectedDamageType,
    },
  };
}

export const SelfTransformationModeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("selfTransformationMode"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      modeChoices: Schema.NonEmptyArray(
        Schema.Literals(SELF_TRANSFORMATION_MODE_KINDS),
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
      expiresAt: Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: ElapsedTimeTicksSchema,
      }),
    }),
  );
export const selfTransformationModeProfile = {
  procedure: "selfTransformationMode",
  executionSchema: SelfTransformationModeInvocationSchema,
  admit: admitSelfTransformationMode,
  discoverCastAct: discoverSelfTransformationModeCastAct,
  resolve: resolveSelfTransformationMode,
} satisfies SpellProcedureDeclaration<
  "selfTransformationMode",
  SelfTransformationModeInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
