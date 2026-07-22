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

import { spellSlotLevel } from "@dnd/shared/types";
import { ArmorClassSchema } from "@dnd/shared-algebras/armor-class-values";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Match } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
  type ActionSpellBattleResolutionInput,
} from "../../battle-reducer.ts";
import {
  admitPersistentArmorEffectSpell,
  type PersistentArmorEffectAdmission,
  type PersistentArmorEffectExecutionFacts,
} from "../../procedure-admission/persistent-armor-effect-facts.ts";
import type { CharacterBattleInvocationSpellAccessState } from "../../character-battle-resources.ts";
import { CombatantId } from "../../identity.ts";
import { combatantWearingArmor } from "../creature-state-leaves.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
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
  SpellSlotInvocationResourceSchema,
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
  earlyEnds: Schema.Tuple(
    Schema.Struct({ kind: Schema.Literal("targetDonsArmor") }),
  ),
  expiresAt: DurationBattleActiveEffectExpirationSchema,
});
type PersistentArmorEffectResolutionInput = ActionSpellBattleResolutionInput & {
  readonly castingState: BattleState;
};
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
  admission: PersistentArmorEffectAdmission,
  source: PersistentArmorSpellSource,
): PersistentArmorInvocation {
  return {
    ...source,
    procedure: "persistentArmorEffect",
    spell: admission.authoredSpell,
    ...persistentArmorEffectShape(actorId, admission.executionFacts),
  };
}

function admitPersistentArmorEffect(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly PersistentArmorInvocation[] {
  const admission = admitPersistentArmorEffectSpell(spell);
  return admission === null
    ? []
    : [
        buildPersistentArmorEffectInvocation(ctx.actor.combatantId, admission, {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: spellSlotLevel(1) },
        }),
      ];
}

export function admitPersistentArmorEffectInvocationSpellAccess(
  actorId: CombatantId,
  access: CharacterBattleInvocationSpellAccessState,
): readonly PersistentArmorInvocation[] {
  return Match.value(access).pipe(
    Match.when({ tag: "armorOfShadowsMageArmor" }, (armorOfShadows) => [
      buildPersistentArmorEffectInvocation(actorId, armorOfShadows.admission, {
        access: { tag: "armorOfShadows" },
        resource: { tag: "none" },
      }),
    ]),
    Match.when({ tag: "pactOfTheChainFindFamiliar" }, () => []),
    Match.exhaustive,
  );
}

function discoverPersistentArmorEffectCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PersistentArmorInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [targetHole],
    },
  ];
}

function applyPersistentArmorEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PersistentArmorInvocation>,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || combatantWearingArmor(target)) {
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
  input: SpellProcedureProfileResolveInput<
    PersistentArmorInvocation,
    PersistentArmorEffectResolutionInput
  >,
): BattleResolutionResult {
  const originalState = input.input.state;
  const castingState = input.input.castingState;

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
  if (
    input.fillSet.targetId === undefined &&
    input.fillSet.objectTarget === undefined
  ) {
    return needsHolesResult(originalState, input.input.subject, [
      spellTargetHole(originalState, input.actorId, input.invocation),
    ]);
  }
  if (input.fillSet.objectTarget !== undefined) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Object target fill does not match this spell act.",
    );
  }
  if (input.fillSet.targetId === undefined) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target fill did not select a target.",
    );
  }
  const target = originalState.combatants.get(input.fillSet.targetId);
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
  Schema.Union(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
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
  ),
);
export const persistentArmorEffectProfile: SpellProcedureProfile<
  "persistentArmorEffect",
  PersistentArmorInvocation,
  PersistentArmorEffectResolutionInput
> = {
  procedure: "persistentArmorEffect",
  executionSchema: PersistentArmorEffectInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  admit: admitPersistentArmorEffect,
  discoverCastAct: discoverPersistentArmorEffectCastAct,
  resolve: resolvePersistentArmorEffect,
};
