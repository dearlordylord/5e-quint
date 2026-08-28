import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-marked-damage-rider
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
//
// The markedDamageRider Spell Procedure Profile: Bonus Action Concentration
// spells that mark one creature, add damage when the caster hits the marked
// creature with an Attack Roll, optionally affect Ability Checks, and move the
// mark after the target drops to 0 Hit Points.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Hex": Bonus Action, 90 feet, Concentration up to
//     1 hour; extra Necrotic damage on hits with Attack Rolls; chosen Ability
//     Check Disadvantage; later-turn Bonus Action transfer; longer duration
//     with higher-level Spell Slots.
//   - SRD 5.2.1 Spells "Hunter's Mark": Bonus Action, 90 feet, Concentration
//     up to 1 hour; extra Force damage on hits with Attack Rolls; Wisdom
//     (Perception or Survival) finding Advantage; Bonus Action transfer; longer
//     duration with higher-level Spell Slots.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Ability Check, Damage
//     Roll, Concentration, Spell Slot, Spell Invocation, and Spell Effect.
//
// What lives here: admit, discoverCastAct, castSummary, resolve,
// and applyEffect helpers.
//
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  MovementFeet,
  movementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  type Ability,
  type DamageType,
  type DiceExpr,
  type EffectAtom,
} from "@dnd/surface/surface/types";
import { Result, Match } from "effect";
import { allocateBattleActiveEffectRefForCreature } from "../../effect-execution-ref.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { characterExecutionWithMarkedDamageRiderTransfer } from "../../character-execution-queries.ts";
import type { MarkedDamageRiderTransferSpellProcedureExecution } from "../../character-execution.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type MarkedDamageRiderCastAbilityCheckBehavior,
  type MarkedDamageRiderRetargetTiming,
  type MarkedDamageRiderTransferState,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  type CombatantId,
} from "../../identity.ts";
import { activeMarkedDamageRiderEffect } from "../damage-helpers.ts";
import { currentActorId } from "../creature-state-leaves.ts";
import { breakBattleConcentration } from "../damage-apply.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "../sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import {
  spellAbilityChoiceHole,
  spellAbilityChoiceHoleId,
} from "../spells-damage-fills.ts";
import { HUNTERS_MARK_FINDING_SKILLS } from "../domain-constants.ts";
import { markSpellSlotExpendedThisTurn } from "../spell-turn-resources.ts";
import {
  spendSpellAccessFreeCastResource,
  startSpellEffectConcentration,
  type SpellCastResourceSpendResult,
} from "../spells-resolve-resources.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "../statblock-attacks.ts";
import type {
  SpellAdmissionBattleTurn,
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  AbilitySchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "../spells-execution-facts.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type MarkedDamageRiderInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "markedDamageRider" }
>;
type MarkedDamageRiderCastInvocation = Extract<
  MarkedDamageRiderInvocation,
  { readonly action: "cast" }
>;
type MarkedDamageRiderResolveInput =
  SpellProcedureProfileResolveInput<MarkedDamageRiderInvocation>;
type OngoingEffectMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingEffectOperation = OngoingEffectMechanics["operations"][number];
type ConcentrationDuration = Extract<
  OngoingEffectMechanics["duration"],
  { readonly kind: "concentration" }
>;

function admitMarkedDamageRider(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly MarkedDamageRiderInvocation[] {
  const projection = markedDamageRiderSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  const {
    abilityCheckBehavior,
    damageType,
    duration,
    expr,
    rangeFeet,
    retargetTiming,
  } = projection;
  const slotInvocations = ctx.spellCastOptions.flatMap(
    (slot): readonly MarkedDamageRiderInvocation[] => {
      const expiresAt = markedDamageRiderConcentrationExpirationForSlot(
        ctx.actor.combatantId,
        duration,
        slot.spellLevel,
      );
      return Number(slot.spellLevel) < spell.mechanics.level ||
        expiresAt === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "markedDamageRider",
              action: "cast",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "singleCombatant" },
              damage: { expr, damageType },
              abilityCheckBehavior,
              retargetTiming,
              rangeFeet,
              expiresAt,
            },
          ];
    },
  );
  return slotInvocations;
}

function markedDamageRiderTransferIsAvailableOnTurn(
  transfer: MarkedDamageRiderTransferState,
  battleTurn: SpellAdmissionBattleTurn | undefined,
): boolean {
  if (transfer.kind === "available") {
    return true;
  }
  if (transfer.kind === "awaitingTargetDrop") {
    return false;
  }
  return (
    battleTurn !== undefined &&
    (battleTurn.currentActorId !== transfer.droppedOnTurn.actorId ||
      battleTurn.round !== transfer.droppedOnTurn.round)
  );
}

function markedDamageRiderSpellProjection(spell: BattleSpellAdmissionSource): {
  readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
  readonly damageType: DamageType;
  readonly duration: ConcentrationDuration;
  readonly expr: DiceExpr;
  readonly rangeFeet: MovementFeet;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming;
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 90 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "mark" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.duration.kind !== "concentration"
  ) {
    return null;
  }

  if (spell.mechanics.operations.length === 1) {
    return markedDamageRiderDamageProjection(
      spell.mechanics.operations[0],
      movementFeet(spell.mechanics.range.feet),
      spell.mechanics.duration,
      "force",
      {
        kind: "findingAdvantage",
        ability: "wis",
        skills: HUNTERS_MARK_FINDING_SKILLS,
      },
      "sameTurn",
    );
  }

  if (spell.mechanics.operations.length === 2) {
    const passive = spell.mechanics.operations[1];
    const passiveEffect = passive?.effect;
    const abilityChoices = hexAbilityChoices(
      passiveEffect?.kind === "modify_roll_advantage"
        ? passiveEffect
        : undefined,
    );
    return abilityChoices === null
      ? null
      : markedDamageRiderDamageProjection(
          spell.mechanics.operations[0],
          movementFeet(spell.mechanics.range.feet),
          spell.mechanics.duration,
          "necrotic",
          { kind: "chosenAbilityDisadvantage", choices: abilityChoices },
          "laterTurn",
        );
  }

  return null;
}

function markedDamageRiderDamageProjection(
  operation: OngoingEffectOperation | undefined,
  rangeFeet: MovementFeet,
  duration: ConcentrationDuration,
  damageType: DamageType,
  abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior,
  retargetTiming: MarkedDamageRiderRetargetTiming,
): {
  readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
  readonly damageType: DamageType;
  readonly duration: ConcentrationDuration;
  readonly expr: DiceExpr;
  readonly rangeFeet: MovementFeet;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming;
} | null {
  if (
    operation?.trigger.kind !== "on_caster_attack_hit" ||
    operation.effect.kind !== "damage" ||
    operation.effect.damageType !== damageType
  ) {
    return null;
  }
  const expr = supportedDamageAmountExpr({ amount: operation.effect.amount });
  return expr === null
    ? null
    : {
        abilityCheckBehavior,
        damageType,
        duration,
        expr,
        rangeFeet,
        retargetTiming,
      };
}

function hexAbilityChoices(
  effect: EffectAtom | undefined,
): readonly Ability[] | null {
  if (effect === undefined || effect.kind !== "modify_roll_advantage") {
    return null;
  }
  const abilityFilter = effect.abilityFilter;
  if (
    effect.mode !== "disadvantage" ||
    (effect.affects ?? "self_roll") !== "self_roll" ||
    !sameStringSet(effect.on, ["ability_check"]) ||
    abilityFilter === undefined ||
    !("kind" in abilityFilter)
  ) {
    return null;
  }
  if (abilityFilter.kind !== "hole" || abilityFilter.value.kind !== "choice") {
    return null;
  }
  const options = abilityFilter.value.options;
  return sameStringSet(options, ["str", "dex", "con", "int", "wis", "cha"])
    ? options
    : null;
}

function markedDamageRiderConcentrationExpirationForSlot(
  actorId: CombatantId,
  duration: ConcentrationDuration,
  slotLevel: SpellSlotLevel,
): Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "concentration" }
> | null {
  const durationTiers = supportedMarkedDamageRiderDurationTiers(duration.upTo);
  if (
    duration.upTo.unit !== "hour" ||
    duration.upTo.amount !== 1 ||
    durationTiers === null
  ) {
    return null;
  }
  const upTo = duration.upTo;
  const amount = durationTiers.reduce(
    (currentAmount, tier) =>
      Number(slotLevel) >= tier.atSlot ? tier.amount : currentAmount,
    upTo.amount,
  );
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration({
    unit: "hour",
    amount,
  });
  if (Result.isFailure(durationTicks)) {
    return null;
  }
  return {
    kind: "concentration",
    combatantId: actorId,
    durationTicks: durationTicks.success,
  };
}

function supportedMarkedDamageRiderDurationTiers(
  upTo: Extract<
    BattleSpellAdmissionSource["mechanics"]["duration"],
    { readonly kind: "concentration" }
  >["upTo"],
): readonly { readonly atSlot: number; readonly amount: number }[] | null {
  const tiers = upTo.upcastTiers;
  if (tiers === undefined) {
    return null;
  }
  return durationTiersEqual(tiers, [
    { atSlot: 3, amount: 8 },
    { atSlot: 5, amount: 24 },
  ]) ||
    durationTiersEqual(tiers, [
      { atSlot: 2, amount: 4 },
      { atSlot: 3, amount: 8 },
      { atSlot: 5, amount: 24 },
    ])
    ? tiers
    : null;
}

function durationTiersEqual(
  tiers: readonly { readonly atSlot: number; readonly amount: number }[],
  expected: readonly { readonly atSlot: number; readonly amount: number }[],
): boolean {
  return (
    tiers.length === expected.length &&
    tiers.every(
      (tier, index) =>
        tier.atSlot === expected[index]?.atSlot &&
        tier.amount === expected[index]?.amount,
    )
  );
}

function discoverMarkedDamageRiderCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MarkedDamageRiderInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    invocation.action === "cast" &&
    actor?.activeEffects.some(
      (effect) => effect.kind === "spellMarkedDamageRider",
    ) === true
  ) {
    // TODO: Allow an ordinary recast while the current mark is still active.
    // RAW permits replacing Concentration by casting the spell again and
    // choosing a new quarry; this guard currently suppresses that cast act.
    return [];
  }
  if (
    invocation.action === "transfer" &&
    !markedDamageRiderTransferIsAvailable(state, invocation.activeEffect)
  ) {
    return [];
  }
  const targetHole = spellTargetHole(state, actorId, invocation);
  const initialHoles =
    invocation.action === "cast" &&
    invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
      ? [targetHole, spellAbilityChoiceHole(invocation)]
      : [targetHole];
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell" as const,
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" as const },
          },
          initialHoles,
        },
      ];
}

function resolveMarkedDamageRider(
  input: MarkedDamageRiderResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      ...(input.invocation.action === "cast"
        ? [spellAbilityChoiceHoleId(input.invocation)]
        : []),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked damage rider spells use one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.invocation.action === "transfer") {
    const activeMark = activeMarkedDamageRiderEffect(
      input.input.state.combatants.get(input.actorId),
      input.invocation.activeEffect.effectRef,
    );
    if (
      activeMark === null ||
      !markedDamageRiderTransferIsAvailable(input.input.state, activeMark)
    ) {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Marked damage rider spells can move only after the marked target drops to 0 Hit Points and any later-turn timing is satisfied.",
      );
    }
  }
  if (
    input.invocation.action === "cast" &&
    input.invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
  ) {
    if (input.fillSet.abilityChoice === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellAbilityChoiceHole(input.invocation),
      ]);
    }
    /* v8 ignore start -- @preserve -- Parsed fill invariant: a chosen-ability cast is the only admitted invocation whose hole contract can supply an ability choice. */
  } else if (input.fillSet.abilityChoice !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "This marked damage rider spell does not choose an ability.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.invocation.action === "cast") {
    const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
      input,
      [input.fillSet.targetId],
      { kind: "bonusAction" },
      undefined,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  const spent = spendActivationResource(
    input.input.state.currentTurnResources,
    {
      kind: "bonusAction",
    },
  );
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  if (input.invocation.action === "transfer") {
    const nextState = applyMarkedDamageRiderSpellEffect(
      {
        ...input.input.state,
        currentTurnResources:
          clearPendingAttackRollMissToHitReplacementSelection(
            spent.success,
            input.actorId,
          ),
      },
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.abilityChoice,
    );
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const turnResources = clearPendingAttackRollMissToHitReplacementSelection(
    spent.success,
    input.actorId,
  );
  const resourced = Match.value(input.invocation.resource).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, ({ resourcePoolRef }) =>
      spendSpellAccessFreeCastResource(
        {
          ...concentrationBase,
          currentTurnResources: turnResources,
        },
        input.actorId,
        resourcePoolRef,
        input.invocation,
        input.input.state,
      ),
    ),
    Match.when({ tag: "spellSlot" }, ({ slotLevel }) =>
      spendMarkedDamageRiderSpellSlot(
        {
          ...concentrationBase,
          currentTurnResources: turnResources,
        },
        input.actorId,
        slotLevel,
        input.input.state,
      ),
    ),
    Match.exhaustive,
  );
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyMarkedDamageRiderSpellEffect(
    resourced.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.abilityChoice,
  );
  const nextState = startSpellEffectConcentration(
    effected,
    input.actorId,
    input.invocation,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function spendMarkedDamageRiderSpellSlot(
  state: BattleState,
  actorId: CombatantId,
  slotLevel: Extract<
    MarkedDamageRiderCastInvocation["resource"],
    { readonly tag: "spellSlot" }
  >["slotLevel"],
  errorState: BattleState,
): SpellCastResourceSpendResult {
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    state,
    actorId,
  );
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    spellCastState.currentTurnResources,
    actorId,
  );
  if (Result.isFailure(slotTurnResources)) {
    return invalidResult(
      errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  return {
    tag: "resolved",
    state: expendSpellSlot(
      {
        ...spellCastState,
        currentTurnResources: slotTurnResources.success,
      },
      actorId,
      slotLevel,
    ),
  };
}

function markedDamageRiderTransferIsAvailable(
  state: BattleState,
  activeMark: SpellMarkedDamageRider,
): boolean {
  return markedDamageRiderTransferIsAvailableOnTurn(activeMark.transfer, {
    currentActorId: currentActorId(state),
    round: state.initiative.round,
  });
}

function applyMarkedDamageRiderSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MarkedDamageRiderInvocation>,
  selectedAbility?: Ability,
): BattleState {
  const caster = state.combatants.get(actorId);
  /* v8 ignore start -- @preserve -- Resolver invariant: spell procedure dispatch establishes the acting combatant before this effect helper is called. */
  if (caster === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  const existingExpiresAt =
    invocation.action === "transfer"
      ? invocation.activeEffect.expiresAt
      : invocation.expiresAt;
  const occurrence =
    invocation.action === "transfer"
      ? {
          effectRef: invocation.activeEffect.effectRef,
          owner: caster,
        }
      : allocateBattleActiveEffectRefForCreature({ owner: caster });
  const transfer: MarkedDamageRiderTransferState = {
    kind: "awaitingTargetDrop",
    retargetTiming:
      invocation.action === "transfer"
        ? invocation.activeEffect.transfer.retargetTiming
        : invocation.retargetTiming,
  };
  const activeEffect = {
    kind: "spellMarkedDamageRider" as const,
    effectRef: occurrence.effectRef,
    sourceProcedureRef:
      invocation.action === "transfer"
        ? invocation.activeEffect.sourceProcedureRef
        : invocation.sourceProcedureRef,
    sourceCombatantId: actorId,
    targetCombatantId: targetId,
    transfer,
    abilityCheckBehavior:
      invocation.action === "transfer"
        ? invocation.activeEffect.abilityCheckBehavior
        : markedDamageRiderActiveAbilityCheckBehavior(
            invocation.abilityCheckBehavior,
            selectedAbility,
          ),
    damage:
      invocation.action === "transfer"
        ? invocation.activeEffect.damage
        : invocation.damage,
    expiresAt: existingExpiresAt,
  } satisfies SpellMarkedDamageRider;
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellMarkedDamageRider" &&
          (invocation.action === "transfer"
            ? effect.effectRef === invocation.activeEffect.effectRef
            : effect.sourceProcedureRef === invocation.sourceProcedureRef) &&
          effect.sourceCombatantId === actorId
        ),
    ),
    activeEffect,
  ];
  const owner = occurrence.owner;
  /* v8 ignore start -- @preserve -- Admission invariant: authored spell executions are installed only for character-origin combatants. */
  if (owner.origin.kind !== "character") return state;
  /* v8 ignore stop -- @preserve */
  const transferExecution = {
    procedure: "markedDamageRider" as const,
    action: "transfer" as const,
    activeEffectRef: activeEffect.effectRef,
    activeEffectSourceProcedureRef: activeEffect.sourceProcedureRef,
  } satisfies MarkedDamageRiderTransferSpellProcedureExecution;
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...owner,
      activeEffects,
      origin: {
        ...owner.origin,
        execution: characterExecutionWithMarkedDamageRiderTransfer(
          owner.origin.execution,
          transferExecution,
        ),
      },
    }),
  };
}

function markedDamageRiderActiveAbilityCheckBehavior(
  behavior: MarkedDamageRiderCastInvocation["abilityCheckBehavior"],
  selectedAbility: Ability | undefined,
): Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>["abilityCheckBehavior"] {
  return Match.value(behavior).pipe(
    Match.when({ kind: "none" }, () => ({ kind: "none" as const })),
    Match.when({ kind: "findingAdvantage" }, (findingAdvantage) => ({
      kind: "findingAdvantage" as const,
      ability: findingAdvantage.ability,
      skills: findingAdvantage.skills,
    })),
    Match.when({ kind: "chosenAbilityDisadvantage" }, () =>
      /* v8 ignore next -- @preserve -- Resolver invariant: this invocation cannot reach effect application until its required ability-choice hole is filled. */
      selectedAbility === undefined
        ? { kind: "none" as const }
        : { kind: "abilityDisadvantage" as const, ability: selectedAbility },
    ),
    Match.exhaustive,
  );
}

const MarkedDamageRiderInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("markedDamageRider"),
      action: Schema.Literal("cast"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      abilityCheckBehavior: Schema.Union([
        Schema.Struct({ kind: Schema.Literal("none") }),
        Schema.Struct({
          kind: Schema.Literal("chosenAbilityDisadvantage"),
          choices: Schema.Array(AbilitySchema),
        }),
        Schema.Struct({
          kind: Schema.Literal("findingAdvantage"),
          ability: Schema.Literal("wis"),
          skills: Schema.Tuple([
            Schema.Literal("perception"),
            Schema.Literal("survival"),
          ]),
        }),
      ]),
      retargetTiming: Schema.Literals(["sameTurn", "laterTurn"]),
      rangeFeet: MovementFeet,
      expiresAt: BattleActiveEffectExpirationSchema,
    }),
    Schema.Struct({
      procedure: Schema.Literal("markedDamageRider"),
      action: Schema.Literal("transfer"),
      spellRuleFacts: Schema.optionalKey(Schema.Never),
      activeEffectRef: BattleEffectExecutionRef,
      activeEffectSourceProcedureRef: BattleProcedureExecutionRef,
    }),
  ]),
);
export const markedDamageRiderProfile: SpellProcedureDeclaration<
  "markedDamageRider",
  MarkedDamageRiderInvocation
> = {
  procedure: "markedDamageRider",
  executionSchema: MarkedDamageRiderInvocationSchema,
  admit: admitMarkedDamageRider,
  discoverCastAct: discoverMarkedDamageRiderCastAct,
  resolve: resolveMarkedDamageRider,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
