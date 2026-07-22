// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-save
import {
  AbilitySchema,
  CreatureTypeSchema,
  DcSourceSchema,
} from "@dnd/surface/surface/schema";
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The saveGatedCondition Spell Procedure Profile: action-time Spell Slot
// casting where affected targets make a Saving Throw before a condition is
// applied.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Animal Friendship, Blindness/Deafness, Charm Person,
//     Color Spray, Entangle, and Hold Person each use a Saving Throw to gate a
//     condition.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition, Magic Action, and Spell
//     Invocation.

import {
  isTargetListSpellInvocation,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { type CombatantId } from "../../identity.ts";
import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import { supportedPreparedSaveGateConditionProfile } from "./_save-gate-helpers.ts";
import { resolveSaveGateConditionSpellAct } from "../spells-resolve-save-gates.ts";
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
  BattleConditionSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellConditionCountedRepeatSaveSchema,
  SpellConditionEscapeSchema,
  SpellConditionRepeatSaveSchema,
  SpellSavingThrowRollModeRuleSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const SpellFailedSaveConditionExpirationExecutionSchema = Schema.Union(
  Schema.Literal("endOfCasterNextTurn", "concentration"),
  Schema.Struct({
    kind: Schema.Literal("concentration"),
    durationTicks: ElapsedTimeTicksSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("duration"),
    durationTicks: ElapsedTimeTicksSchema,
  }),
);

const SpellTurnStartDamageExecutionSchema = Schema.Struct({
  expr: DiceExprSchema,
  damageType: DamageTypeSchema,
});

const SpellFailedSaveConditionNoRepeatFields = {
  expiresAt: SpellFailedSaveConditionExpirationExecutionSchema,
  escape: Schema.NullOr(SpellConditionEscapeSchema),
  turnStartDamage: Schema.NullOr(SpellTurnStartDamageExecutionSchema),
  repeatSave: Schema.Null,
};

const SpellFailedSaveConditionRepeatFields = {
  expiresAt: SpellFailedSaveConditionExpirationExecutionSchema,
  escape: Schema.Null,
  turnStartDamage: Schema.Null,
  repeatSave: Schema.Union(
    SpellConditionRepeatSaveSchema,
    SpellConditionCountedRepeatSaveSchema,
  ),
};

export const SpellFailedSaveConditionEffectExecutionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    condition: BattleConditionSchema,
    ...SpellFailedSaveConditionNoRepeatFields,
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    condition: BattleConditionSchema,
    ...SpellFailedSaveConditionRepeatFields,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice"),
    choices: Schema.NonEmptyArray(BattleConditionSchema),
    ...SpellFailedSaveConditionNoRepeatFields,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice"),
    choices: Schema.NonEmptyArray(BattleConditionSchema),
    ...SpellFailedSaveConditionRepeatFields,
  }),
);
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  saveGatedConditionHasConditionChoice,
  spellConditionChoiceHole,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
  spellTargetHole,
  spellTargetListHole,
} from "../spells-holes-fills.ts";

type SaveGatedConditionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
>;

type SaveGatedConditionResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedConditionSpellInvocation>;

function admitSaveGatedCondition(
  spell: SaveGatedConditionSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SaveGatedConditionSpellInvocation[] {
  return supportedPreparedSaveGateConditionProfile(
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  ).filter(isSaveGatedConditionInvocation);
}

function isSaveGatedConditionInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SaveGatedConditionSpellInvocation {
  return invocation.procedure === "saveGatedCondition";
}

function discoverSaveGatedConditionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  return invocation.targeting.kind === "singleCombatant" ||
    invocation.targeting.kind === "targetList"
    ? discoverTargetedSaveGatedConditionCastActs(
        state,
        actorId,
        actor,
        invocation,
      )
    : discoverAreaSaveGatedConditionCastActs(state, actorId, actor, invocation);
}

function discoverTargetedSaveGatedConditionCastActs(
  state: BattleState,
  actorId: CombatantId,
  actor: BattleCreatureState | undefined,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole =
    invocation.targeting.kind === "singleCombatant"
      ? spellTargetHole(state, actorId, invocation)
      : isTargetListSpellInvocation(invocation)
        ? spellTargetListHole(state, actorId, invocation)
        : null;
  if (targetHole === null || targetHole.choices.length === 0) {
    return [];
  }
  const conditionChoiceHoles = saveGatedConditionChoiceHoles(invocation);
  const baseCastAct = saveGatedConditionCastAct(actorId, invocation, [
    targetHole,
    ...conditionChoiceHoles,
  ]);
  return [
    baseCastAct,
    ...saveGatedConditionMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      metamagicInitialHoles: (saveMetamagicSelectionHoles) =>
        saveMetamagicSelectionHoles.length === 0
          ? [targetHole]
          : [targetHole, ...saveMetamagicSelectionHoles],
      conditionChoiceHoles,
    }),
  ];
}

function discoverAreaSaveGatedConditionCastActs(
  state: BattleState,
  actorId: CombatantId,
  actor: BattleCreatureState | undefined,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const conditionChoiceHoles = saveGatedConditionChoiceHoles(invocation);
  const baseCastAct = saveGatedConditionCastAct(actorId, invocation, [
    savingThrowHole,
    ...conditionChoiceHoles,
  ]);
  return [
    baseCastAct,
    ...saveGatedConditionMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      metamagicInitialHoles: (saveMetamagicSelectionHoles) =>
        saveMetamagicSelectionHoles.length === 0
          ? [savingThrowHole]
          : saveMetamagicSelectionHoles,
      conditionChoiceHoles,
    }),
  ];
}

function saveGatedConditionChoiceHoles(
  invocation: import("../../battle-reducer.ts").BattleExecutableSpellInvocation<SaveGatedConditionSpellInvocation>,
): readonly BattleHole[] {
  return saveGatedConditionHasConditionChoice(invocation)
    ? [spellConditionChoiceHole(invocation)]
    : [];
}

function saveGatedConditionMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: BattleExecutableSpellInvocation<SaveGatedConditionSpellInvocation>;
  readonly baseCastAct: BattleActDiscoveryCandidate;
  readonly metamagicInitialHoles: (
    saveMetamagicSelectionHoles: readonly BattleHole[],
  ) => readonly BattleHole[];
  readonly conditionChoiceHoles: readonly BattleHole[];
}): readonly BattleActDiscoveryCandidate[] {
  const actor = input.actor;
  if (actor === undefined) {
    return [];
  }
  return discoverSpellMetamagicSelections({
    actor,
    invocation: input.invocation,
  }).map((metamagic) => {
    const applications = spellMetamagicApplications(actor, metamagic);
    const metamagicInitialHoles = saveGatedConditionMetamagicInitialHoles(
      input.state,
      input.actorId,
      input.invocation,
      applications,
    );
    return {
      ...input.baseCastAct,
      subject: {
        ...input.baseCastAct.subject,
        metamagic,
      },
      initialHoles: [
        ...input.metamagicInitialHoles(metamagicInitialHoles),
        ...input.conditionChoiceHoles,
      ],
    };
  });
}

function saveGatedConditionCastAct(
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionSpellInvocation>,
  initialHoles: readonly BattleHole[],
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" },
    },
    initialHoles,
  };
}

function saveGatedConditionMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionSpellInvocation>,
  metamagicApplications: readonly SpellMetamagicApplicationFact[],
): readonly BattleHole[] {
  const targeting = spellSavingThrowTargeting(invocation);
  const holes: BattleHole[] = [];
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }
  return holes;
}

function resolveSaveGatedCondition(
  input: SaveGatedConditionResolveInput,
): BattleResolutionResult {
  return resolveSaveGateConditionSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const SaveGatedConditionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("saveGatedCondition"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: AbilitySchema,
    dc: DcSourceSchema,
    targeting: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginCubeExcludingCaster"),
        sideFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        sideFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("selfOriginCone"),
        lengthFeet: MovementFeet,
      }),
    ),
    targetCreatureTypes: Schema.NullOr(Schema.Array(CreatureTypeSchema)),
    effect: SpellFailedSaveConditionEffectExecutionSchema,
    saveRollModeRule: Schema.NullOr(SpellSavingThrowRollModeRuleSchema),
    rangeFeet: MovementFeet,
  }),
);
export const saveGatedConditionProfile = {
  procedure: "saveGatedCondition",
  executionSchema: SaveGatedConditionInvocationSchema,
  metamagicCompatibility: "bonusActionRewrite",
  admit: admitSaveGatedCondition,
  discoverCastAct: discoverSaveGatedConditionCastAct,
  resolve: resolveSaveGatedCondition,
} satisfies SpellProcedureDeclaration<
  "saveGatedCondition",
  SaveGatedConditionSpellInvocation
>;
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
