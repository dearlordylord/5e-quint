import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// The persistentArmorEffect Spell Procedure Profile: a touch spell that
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
// creates a timed Spell Effect setting the willing unarmored target's base
// Armor Class to a fixed base plus Dexterity modifier.
//
// What lives here:
//   - admit()           - was supportedPreparedPersistentSpellProfile in
//                         spells-profiles.ts
//   - admitInvocationSpellAccess() - was
//                         supportedInvocationPersistentSpellProfile in
//                         spells-profiles.ts
//   - discoverCastAct() - was the generic target-bearing action-spell branch
//                         in spells-discovery.ts
//   - castSummary()     - was the persistentArmorEffect branch in
//                         spells-discovery.ts
//   - resolve()         - was the persistentArmorEffect branch in
//                         spells-resolve.ts
//   - applyEffect()     - was applyPersistentSpellActiveEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - Known-willing target checks and unarmored target legality stay in
//     spells-targeting.ts until targeting classification migrates.
//   - The Armor of Shadows Spell Access parser stays in
//     character-battle-resources.ts.

import { ArmorClassSchema } from "@dnd/shared-algebras/armor-class-values";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  persistentArmorEffectExecutionFactsForSpell,
  type PersistentArmorEffectExecutionFacts,
} from "../../procedure-execution/persistent-armor-effect-facts.ts";
import { CombatantId } from "../../identity.ts";
import { combatantWearingArmor } from "../creature-state-leaves.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import { willingCreatureTargetSelection } from "../spells-profiles-support.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  ArmorOfShadowsSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type PersistentArmorInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentArmorEffect" }
>;

const PersistentArmorEffectSchema = Schema.Struct({
  kind: Schema.Literal("spellBaseArmorClass"),
  sourceCombatantId: CombatantId,
  base: ArmorClassSchema,
  ability: Schema.Literal("dex"),
  earlyEnds: Schema.Tuple([
    Schema.Struct({ kind: Schema.Literal("targetDonsArmor") }),
  ]),
  expiresAt: DurationBattleActiveEffectExpirationSchema,
});
type PersistentArmorSpellSource =
  | Pick<
      Extract<
        PersistentArmorInvocation,
        { readonly access: { readonly tag: "prepared" } }
      >,
      "access" | "resource"
    >
  | Pick<
      Extract<
        PersistentArmorInvocation,
        { readonly access: { readonly tag: "armorOfShadows" } }
      >,
      "access" | "resource"
    >;

function persistentArmorEffectShape(
  actorId: CombatantId,
  executionFacts: PersistentArmorEffectExecutionFacts,
): Pick<PersistentArmorInvocation, "rangeFeet" | "activeEffect"> {
  return {
    rangeFeet: executionFacts.rangeFeet,
    activeEffect: {
      kind: "spellBaseArmorClass",
      sourceCombatantId: actorId,
      base: executionFacts.baseArmorClass,
      ability: executionFacts.ability,
      expiresAt: {
        kind: "duration",
        durationTicks: executionFacts.durationTicks,
      },
      earlyEnds: executionFacts.earlyEnds,
    },
  };
}

function buildPersistentArmorEffectInvocation(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  executionFacts: PersistentArmorEffectExecutionFacts,
  source: PersistentArmorSpellSource,
): PersistentArmorInvocation {
  return {
    ...source,
    procedure: "persistentArmorEffect",
    spell,
    ...persistentArmorEffectShape(actorId, executionFacts),
  };
}

function persistentArmorEffectHasWillingCreatureTarget(
  spell: Pick<BattleSpellAdmissionSource, "mechanics">,
): boolean {
  if (spell.mechanics.family !== "ongoing_effect") {
    return false;
  }
  const attachment = spell.mechanics.attachment;
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "target" &&
    willingCreatureTargetSelection(attachment.value.selection)
  );
}

function admitPersistentArmorEffect(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly PersistentArmorInvocation[] {
  if (!persistentArmorEffectHasWillingCreatureTarget(spell)) {
    return [];
  }
  const executionFacts = persistentArmorEffectExecutionFactsForSpell(spell);
  return executionFacts === null
    ? []
    : ctx.spellCastOptions.flatMap((option) =>
        option.spellLevel < executionFacts.slotLevel
          ? []
          : [
              buildPersistentArmorEffectInvocation(
                ctx.actor.combatantId,
                spell,
                executionFacts,
                {
                  access: { tag: "prepared" },
                  resource: spellInvocationResourceForCastOption(option),
                },
              ),
            ],
      );
}

export function admitPersistentArmorEffectInvocationSpellAccess(
  actorId: CombatantId,
  access: {
    readonly spell: BattleSpellAdmissionSource;
    readonly executionFacts: PersistentArmorEffectExecutionFacts;
  },
): readonly PersistentArmorInvocation[] {
  if (!persistentArmorEffectHasWillingCreatureTarget(access.spell)) {
    return [];
  }
  return [
    buildPersistentArmorEffectInvocation(
      actorId,
      access.spell,
      access.executionFacts,
      {
        access: { tag: "armorOfShadows" },
        resource: { tag: "none" },
      },
    ),
  ];
}

function discoverPersistentArmorEffectCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PersistentArmorInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function applyPersistentArmorEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PersistentArmorInvocation>,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || combatantWearingArmor(state, target)) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === invocation.activeEffect.kind &&
              effect.sourceProcedureRef === invocation.sourceProcedureRef
            ),
        ),
        {
          ...invocation.activeEffect,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
      ],
    }),
  };
}

function resolvePersistentArmorEffect(
  input: SpellProcedureProfileResolveInput<PersistentArmorInvocation>,
): BattleResolutionResult {
  const originalState = input.input.state;
  const castingState = input.input.castingState;

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined &&
    input.fillSet.objectTarget !== undefined
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target must choose either one combatant or one object, not both.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    input.fillSet.targetId === undefined &&
    input.fillSet.objectTarget === undefined
  ) {
    return needsHolesResult(originalState, input.input.subject, [
      spellTargetHole(originalState, input.actorId, input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.objectTarget !== undefined) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Object target fill does not match this spell act.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.targetId === undefined) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target fill did not select a target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const target = originalState.combatants.get(input.fillSet.targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      originalState,
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll != null ||
    input.fillSet.damageRoll != null ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Persistent spell effects do not use attack or damage fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const effected = applyPersistentArmorEffect(
    castingState,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: originalState,
    startConcentration: false,
  });
}

const PersistentArmorEffectInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentArmorEffect"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      rangeFeet: MovementFeet,
      activeEffect: PersistentArmorEffectSchema,
    }),
    Schema.Struct({
      access: ArmorOfShadowsSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentArmorEffect"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      rangeFeet: MovementFeet,
      activeEffect: PersistentArmorEffectSchema,
    }),
  ]),
);
export const persistentArmorEffectProfile: SpellProcedureDeclaration<
  "persistentArmorEffect",
  PersistentArmorInvocation
> = {
  procedure: "persistentArmorEffect",
  executionSchema: PersistentArmorEffectInvocationSchema,
  admit: admitPersistentArmorEffect,
  discoverCastAct: discoverPersistentArmorEffectCastAct,
  resolve: resolvePersistentArmorEffect,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
