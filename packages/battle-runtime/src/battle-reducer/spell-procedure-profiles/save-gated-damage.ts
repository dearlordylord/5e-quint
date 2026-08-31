import {
  discoverSavingThrowMetamagicCastActs,
  savingThrowMetamagicHolesOr,
} from "../saving-throw-metamagic-holes.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
import {
  DamageTypeSchema,
  DcSourceSchema,
  DiceExprSchema,
} from "@dnd/surface/surface/schema";
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE
//
// The saveGatedDamage Spell Procedure Profile: action-time cantrip or Spell
// Slot casting where affected targets make a Saving Throw before spell damage
// is applied.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Acid Splash, Burning Hands, Fireball, Sacred Flame,
//     and Shatter each use a Saving Throw to gate damage.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Damage Type, Magic Action, and
//     Spell Invocation.

import { type CombatantId } from "../../identity.ts";
import { BATTLE_READIED_SPELL_TRIGGERS } from "../../battle-interrupt-triggers.ts";
import {
  supportedCantripSaveGateDamageProfile,
  supportedPreparedSaveGateDamageProfile,
} from "./_save-gate-helpers.ts";
import { resolveSaveGateDamageSpellAct } from "../spells-resolve-save-gates.ts";
import { resolveTriggeredReactionSaveGatedDamage } from "../triggered-reaction-spell-procedures.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Match, Schema } from "effect";
import { invalidResult } from "../result-helpers.ts";
import {
  AbilitySchema,
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SaveGatedDamageSpellTargetingSchema,
  SpellFailedSavePostDamageRiderSchema,
  SpellPostSaveAreaEffectSchema,
  SpellSavingThrowRollModeRuleSchema,
  LeveledSpellInvocationResourceSchema,
  SpellDamageSchema,
} from "../codec-building-blocks.ts";
import { SpellFailedSaveConditionEffectExecutionSchema } from "./save-gated-condition.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleCreatureState,
  type BattleExecutableSpellInvocation,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  spellAbilityChoiceHole,
  spellSavingThrowOutcomeHole,
  spellTargetHole,
} from "../spells-holes-fills.ts";
import {
  spellAdmissionCharacterLevel,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  spellProcedureResolutionContext,
} from "./profile.ts";

type SaveGatedDamageSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedDamage" }
>;

type SaveGatedDamageResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedDamageSpellInvocation>;

function admitSaveGatedDamage(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SaveGatedDamageSpellInvocation[] {
  const invocations =
    spell.mechanics.level === 0
      ? supportedCantripSaveGateDamageProfile(
          spell,
          spellAdmissionCharacterLevel(ctx),
        )
      : supportedPreparedSaveGateDamageProfile(spell, ctx.spellCastOptions);
  return invocations.filter(isSaveGatedDamageInvocation);
}

function isSaveGatedDamageInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SaveGatedDamageSpellInvocation {
  return invocation.procedure === "saveGatedDamage";
}

function discoverSaveGatedDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  const castActs =
    invocation.targeting.kind === "singleCombatant"
      ? discoverSingleTargetSaveGatedDamageCastActs(
          state,
          actorId,
          actor,
          invocation,
        )
      : discoverAreaSaveGatedDamageCastActs(state, actorId, actor, invocation);
  return [
    ...castActs,
    ...readiedSaveGatedDamageActs(state, actorId, invocation),
  ];
}

function discoverSingleTargetSaveGatedDamageCastActs(
  state: BattleState,
  actorId: CombatantId,
  actor: BattleCreatureState | undefined,
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  const baseCastAct = actionSpellCastCandidate(
    actorId,
    invocation.sourceProcedureRef,
    [targetHole, ...saveGatedDamageAbilityChoiceHoles(invocation)],
  );
  return [
    baseCastAct,
    ...discoverSavingThrowMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      initialHoles: (applications) =>
        savingThrowMetamagicHolesOr(
          state,
          actorId,
          invocation,
          applications,
          [targetHole],
          saveGatedDamageAbilityChoiceHoles(invocation),
        ),
    }),
  ];
}

function discoverAreaSaveGatedDamageCastActs(
  state: BattleState,
  actorId: CombatantId,
  actor: BattleCreatureState | undefined,
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = actionSpellCastCandidate(
    actorId,
    invocation.sourceProcedureRef,
    [savingThrowHole, ...saveGatedDamageAbilityChoiceHoles(invocation)],
  );
  return [
    baseCastAct,
    ...discoverSavingThrowMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      initialHoles: (applications) =>
        savingThrowMetamagicHolesOr(
          state,
          actorId,
          invocation,
          applications,
          [savingThrowHole],
          saveGatedDamageAbilityChoiceHoles(invocation),
        ),
    }),
  ];
}

function saveGatedDamageAbilityChoiceHoles(
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleHole[] {
  return invocation.failedSaveAbilityChoices === null
    ? []
    : [spellAbilityChoiceHole(invocation)];
}

function readiedSaveGatedDamageActs(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (state.readiedSpells.has(actorId)) {
    return [];
  }
  return BATTLE_READIED_SPELL_TRIGGERS.map((trigger) => ({
    subject: {
      tag: "actionSpell",
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "ready", trigger },
    },
    initialHoles: [],
  }));
}

function resolveSaveGatedDamage(
  input: SaveGatedDamageResolveInput,
): BattleResolutionResult {
  return Match.value(input).pipe(
    Match.when(
      {
        invocation: {
          access: { tag: "prepared" },
          castingTime: { kind: "reaction" },
          resource: { tag: "spellSlot" },
        },
        input: {
          subject: {
            tag: "runtimeCommand",
            command: "castTriggeredReactionSpell",
          },
        },
      },
      (triggered) =>
        resolveTriggeredReactionSaveGatedDamage(
          { ...triggered.input, invocation: triggered.invocation },
          triggered.fillSet,
        ),
    ),
    Match.when({ input: { subject: { tag: "actionSpell" } } }, (ordinary) =>
      resolveSaveGateDamageSpellAct(spellProcedureResolutionContext(ordinary)),
    ),
    Match.when(
      { input: { subject: { tag: "bonusActionSpell" } } },
      (ordinary) =>
        resolveSaveGateDamageSpellAct(
          spellProcedureResolutionContext(ordinary),
        ),
    ),
    Match.orElse(() =>
      invalidResult(
        input.input.state,
        "unsupportedSubject",
        "Save-gated damage procedure requires a spell-cast resolution lane.",
      ),
    ),
  );
}

const ActionSpellInvocationCastingTimeSchema = Schema.Struct({
  kind: Schema.Literal("action"),
});
const ReactionSpellInvocationCastingTimeSchema = Schema.Struct({
  kind: Schema.Literal("reaction"),
});

const SaveGatedDamageCommonFields = {
  procedure: Schema.Literal("saveGatedDamage"),
  spellRuleFacts: SpellRuleExecutionFactsSchema,
  ability: AbilitySchema,
  dc: DcSourceSchema,
  targeting: SaveGatedDamageSpellTargetingSchema,
  damage: Schema.Struct({
    expr: DiceExprSchema,
    damageType: DamageTypeSchema,
  }),
  additionalDamageComponents: Schema.Array(SpellDamageSchema),
  successDamage: Schema.Literals(["none", "half"]),
  rangeFeet: MovementFeet,
  failedSavePostDamageRiders: Schema.Array(
    SpellFailedSavePostDamageRiderSchema,
  ),
  failedSaveConditionEffects: Schema.Array(
    SpellFailedSaveConditionEffectExecutionSchema,
  ),
  failedSaveAbilityChoices: Schema.NullOr(Schema.Array(AbilitySchema)),
  saveRollModeRule: Schema.NullOr(SpellSavingThrowRollModeRuleSchema),
  postSaveAreaEffect: Schema.optionalKey(SpellPostSaveAreaEffectSchema),
} as const;

export const SaveGatedDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      castingTime: ActionSpellInvocationCastingTimeSchema,
      ...SaveGatedDamageCommonFields,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      castingTime: Schema.Union([
        ActionSpellInvocationCastingTimeSchema,
        ReactionSpellInvocationCastingTimeSchema,
      ]),
      ...SaveGatedDamageCommonFields,
    }),
  ]),
);
export const saveGatedDamageProfile = {
  procedure: "saveGatedDamage",
  executionSchema: SaveGatedDamageInvocationSchema,
  admit: admitSaveGatedDamage,
  discoverCastAct: discoverSaveGatedDamageCastAct,
  resolve: resolveSaveGatedDamage,
} satisfies SpellProcedureDeclaration<
  "saveGatedDamage",
  SaveGatedDamageSpellInvocation
>;
