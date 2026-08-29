import { savingThrowMetamagicHoles } from "../saving-throw-metamagic-holes.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-hypnotic-pattern-control spell.invocation-glyph-stored-concentration-full-duration
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
//
// Hypnotic Pattern control profile: action-time level-3+ Spell Slot casting,
// table-supplied point-origin Cube affected targets with sight witnesses,
// Wisdom Saving Throws, and one source-owned target effect that projects
// Charmed, Incapacitated, and Speed 0 until damage, shake-awake, Concentration,
// or duration cleanup.
//
// RAW anchors:
//   - SRD 5.2.1 Spells/Descriptions-E-L.md: Hypnotic Pattern.
//   - Rules Glossary: Area of Effect, Cube, Charmed, Incapacitated, Speed,
//     Concentration, and Saving Throw.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Invocation, Spell Effect,
//     Area of Effect, Saving Throw, Charmed, Incapacitated, Speed.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { ActivationPhase, EffectAtom } from "@dnd/surface/surface/types";
import { Result, Schema } from "effect";
import { bindStoredSpellProcedureExecutionFacts } from "../../character-execution-queries.ts";
import type { SpellProcedureExecution } from "../../character-execution.ts";
import type {
  ActionSpellBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleExecutableSpellInvocation,
  BattleInterruptedProcedure,
  BattleResolutionResult,
  BattleSpellSavingThrowOutcomeValue,
  BattleState,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type GlyphStoredAreaControlInvocation } from "../../glyph-stored-spell-invocation.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
} from "../interrupt-execution.ts";
import { spellReplayContinuation } from "../spell-reaction-continuation.ts";
import type { CharacterBattleMetamagicOptionFact } from "../../character-battle-resource-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../../effect-execution-ref.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import {
  conditionApplicationPreventedByConditionImmunity,
  conditionApplicationPreventedByCreatureTypeProtection,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "../spell-condition-effects-helpers.ts";
import { extendSavingThrowOngoingFeatures } from "../attack-roll.ts";
import { resolveAreaSaveMetamagicFills } from "../spells-resolve-save-gates.ts";
import {
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "../spells-resolve-resources.ts";
import { invalidResult } from "../result-helpers.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type { SaveGatedAreaControlStoredGlyphRelease } from "./resolution-contract.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  discoverSpellMetamagicSelections,
  spellMetamagicApplications,
} from "../metamagic-support.ts";
import { spellSavingThrowOutcomeHole } from "../spells-holes-fills.ts";
import { failedSavingThrowTargetIds } from "../saving-throw-outcomes.ts";

type SaveGatedAreaControlSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAreaControl" }
>;
type StoredGlyphAreaControlSpellInvocation =
  SpellProcedureExecution<GlyphStoredAreaControlInvocation>;

type SaveGatedAreaControlPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly shape: { readonly kind: "cube"; readonly sideFeet: 30 };
      readonly origin: { readonly kind: "point_within_range" };
      readonly occupantPerceptionFilter: "can_see_area_effect";
    };
  };
};

type SaveGatedAreaControlResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedAreaControlSpellInvocation>;

export function resolveStoredGlyphAreaControlSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: StoredGlyphAreaControlSpellInvocation;
  readonly fillSet: Extract<
    SpellProcedureProfileResolveInput<SaveGatedAreaControlSpellInvocation>["fillSet"],
    { readonly tag: "ok" }
  >;
  readonly selfOriginAreaAnchorId: CombatantId;
}): BattleResolutionResult {
  return resolveSaveGatedAreaControl({
    input: input.input,
    actorId: input.actorId,
    invocation: bindStoredSpellProcedureExecutionFacts(
      input.invocation,
      input.input.subject.procedureRef,
    ),
    fillSet: input.fillSet,
    storedGlyphRelease: {
      kind: "storedGlyphSpellRelease",
      selfOriginAreaAnchorId: input.selfOriginAreaAnchorId,
    },
  });
}

function admitSaveGatedAreaControl(
  spell: SaveGatedAreaControlSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SaveGatedAreaControlSpellInvocation[] {
  const saveGatedAreaControl = saveGatedAreaControlSpell(spell);
  if (saveGatedAreaControl === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SaveGatedAreaControlSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "saveGatedAreaControl",
              spell,
              actionCost: "magicAction",
              ability: saveGatedAreaControl.phase.ability,
              dc: saveGatedAreaControl.phase.dc,
              targeting: {
                kind: "pointOriginCube",
                sideFeet: movementFeet(
                  saveGatedAreaControl.phase.attachment.value.shape.sideFeet,
                ),
              },
              rangeFeet: movementFeet(saveGatedAreaControl.rangeFeet),
              durationTicks: saveGatedAreaControl.durationTicks,
            },
          ],
  );
}

function saveGatedAreaControlSpell(
  spell: SaveGatedAreaControlSpellInvocation["spell"],
): {
  readonly phase: SaveGatedAreaControlPhase;
  readonly durationTicks: SaveGatedAreaControlSpellInvocation["durationTicks"];
  readonly rangeFeet: number;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 120 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    !spell.mechanics.duration.earlyEnd?.some(
      (earlyEnd) => earlyEnd.kind === "target_takes_damage",
    ) ||
    spell.mechanics.phases.length !== 1 ||
    !isSaveGatedAreaControlPhase(phase)
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Result.isFailure(durationTicks)
    ? null
    : {
        phase,
        durationTicks: durationTicks.success,
        rangeFeet: spell.mechanics.range.feet,
      };
}

function isSaveGatedAreaControlPhase(
  phase: ActivationPhase | undefined,
): phase is SaveGatedAreaControlPhase {
  const failedEffects =
    phase?.kind === "save_gate" && phase.onFail.kind === "composite"
      ? phase.onFail.effects
      : [];
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.repeatSaves === undefined &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "cube" &&
    phase.attachment.value.shape.sideFeet === 30 &&
    phase.attachment.value.occupantPerceptionFilter === "can_see_area_effect" &&
    failedEffects.length === 4 &&
    failedEffects.some((effect) => isApplyConditionEffect(effect, "charmed")) &&
    failedEffects.some((effect) =>
      isApplyConditionEffect(effect, "incapacitated"),
    ) &&
    failedEffects.some(
      (effect) => effect.kind === "set_speed" && effect.feet === 0,
    ) &&
    failedEffects.some(isSaveGatedAreaControlShakeAwakeEffect)
  );
}

function isApplyConditionEffect(
  effect: EffectAtom,
  condition: "charmed" | "incapacitated",
): boolean {
  return effect.kind === "apply_condition" && effect.condition === condition;
}

function isSaveGatedAreaControlShakeAwakeEffect(effect: EffectAtom): boolean {
  return (
    effect.kind === "target_effect_escape_action" &&
    effect.actor === "another_creature" &&
    effect.cost === "action" &&
    effect.method === "shake_awake" &&
    effect.outcome === "end_current_effect"
  );
}

function discoverSaveGatedAreaControlCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedAreaControlSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = actionSpellCastCandidate(
    actorId,
    invocation.sourceProcedureRef,
    [savingThrowHole],
  );
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [baseCastAct];
  }
  return [
    baseCastAct,
    ...discoverSpellMetamagicSelections({ actor, invocation }).map(
      (metamagic) => {
        const applications = spellMetamagicApplications(actor, metamagic);
        return {
          ...baseCastAct,
          subject: { ...baseCastAct.subject, metamagic },
          initialHoles: savingThrowMetamagicHoles(
            state,
            actorId,
            invocation,
            applications,
          ),
        };
      },
    ),
  ];
}

function saveGatedAreaControlReleaseResourceState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SaveGatedAreaControlResolveInput["invocation"];
  readonly errorState: BattleState;
  readonly metamagicApplications: readonly CharacterBattleMetamagicOptionFact[];
  readonly storedGlyphRelease:
    | SaveGatedAreaControlStoredGlyphRelease
    | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.storedGlyphRelease !== undefined) {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  return spendSpellCastResources({
    state: input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.errorState,
    startConcentration: false,
    metamagicApplications: input.metamagicApplications,
  });
}

function storedGlyphAreaControlReleaseUsesOrdinaryConcentration(
  storedGlyphRelease: SaveGatedAreaControlStoredGlyphRelease | undefined,
): boolean {
  return storedGlyphRelease === undefined;
}

function invalidStoredGlyphAreaCenterResult(input: {
  readonly state: BattleState;
  readonly savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue;
  readonly storedGlyphRelease:
    | SaveGatedAreaControlStoredGlyphRelease
    | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "invalid" }> | null {
  if (input.storedGlyphRelease === undefined) {
    return null;
  }
  if (
    "area" in input.savingThrowOutcomes &&
    input.savingThrowOutcomes.area.originAnchorId ===
      input.storedGlyphRelease.selfOriginAreaAnchorId
  ) {
    return null;
  }
  return invalidResult(
    input.state,
    "invalidFill",
    "Stored glyph area release must use a spell area centered on the triggering creature.",
  );
}

function resolveSaveGatedAreaControl(
  input: SaveGatedAreaControlResolveInput,
): BattleResolutionResult {
  const metamagicApplications =
    input.storedGlyphRelease === undefined ? input.metamagicApplications : [];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hypnotic Pattern uses an area Saving Throw outcome fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaSave = resolveAreaSaveMetamagicFills({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications,
    savingThrowOutcomes: input.fillSet.savingThrowOutcomes,
  });
  if (areaSave.tag !== "ready") {
    return areaSave;
  }
  const savingThrowOutcomes = areaSave.savingThrowOutcomes;
  const areaWitnessValidation =
    validateSaveGatedAreaControlAreaWitness(savingThrowOutcomes);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaWitnessValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      areaWitnessValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    savingThrowOutcomes,
    storedGlyphRelease: input.storedGlyphRelease,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }
  const affectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = failedSavingThrowTargetIds(
    savingThrowOutcomes.outcomes,
  );
  if (failedTargets.length > 0) {
    const continuation: BattleInterruptedProcedure = spellReplayContinuation(
      input.input,
    );
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        continuation,
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const resourced = saveGatedAreaControlReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    metamagicApplications,
    storedGlyphRelease: input.storedGlyphRelease,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applySaveGatedAreaControlControlEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const concentrationState =
    effected.appliedTargetIds.length === 0 ||
    !storedGlyphAreaControlReleaseUsesOrdinaryConcentration(
      input.storedGlyphRelease,
    )
      ? effected.state
      : startSpellEffectConcentration(
          effected.state,
          input.actorId,
          input.invocation,
        );
  const concentrationChecked = breakConcentrationForIncapacitatedTargets(
    concentrationState,
    effected.appliedTargetIds,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    concentrationChecked,
    input.actorId,
    affectedTargetIds,
    input.fillSet.savingThrowRelationshipFacts,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applySaveGatedAreaControlControlEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<SaveGatedAreaControlSpellInvocation>,
): {
  readonly state: BattleState;
  readonly appliedTargetIds: readonly CombatantId[];
} {
  const combatants = new Map(state.combatants);
  const appliedTargetIds: CombatantId[] = [];
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    if (
      conditionApplicationPreventedByConditionImmunity(target, "charmed") ||
      conditionApplicationPreventedByCreatureTypeProtection(
        state,
        actorId,
        target,
        "charmed",
      )
    ) {
      continue;
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === "saveGatedAreaControl" &&
        effect.sourceProcedureRef === invocation.sourceProcedureRef &&
        effect.sourceCombatantId === actorId,
    );
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "saveGatedAreaControl" as const,
        sourceProcedureRef: invocation.sourceProcedureRef,
        sourceCombatantId: actorId,
        conditionHadNonSpellCharmedSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "charmed"),
        conditionHadNonSpellIncapacitatedSource:
          conditionHadNonSpellSourceBeforeSpellEffect(target, "incapacitated"),
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
          durationTicks: invocation.durationTicks,
        },
      },
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) => !replacing.includes(effect),
      ),
      allocation.effect,
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
    );
    appliedTargetIds.push(targetId);
  }
  return { state: { ...state, combatants }, appliedTargetIds };
}

/* v8 ignore start -- @preserve -- Malformed area-witness validator: Hypnotic Pattern discovery supplies the typed Cube geometry, unique visible targets, and matching outcomes; admitted effect execution remains measured. */
function validateSaveGatedAreaControlAreaWitness(
  savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue,
): string | null {
  if (!("area" in savingThrowOutcomes)) {
    return "Hypnotic Pattern requires a point-origin Cube area witness.";
  }
  const area = savingThrowOutcomes.area;
  if (area.kind !== "saveGatedAreaControlArea") {
    return "Hypnotic Pattern requires explicit Cube membership and sight witnesses.";
  }
  if (area.cubeSideFeet !== 30) {
    return "Hypnotic Pattern requires a 30-foot Cube witness.";
  }
  const outcomeTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const affectedTargetIds = new Set(area.affectedTargetIds);
  if (
    affectedTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !affectedTargetIds.has(targetId))
  ) {
    return "Hypnotic Pattern Cube affected targets must match its Saving Throw outcomes.";
  }
  const witnessTargetIds = new Set<CombatantId>();
  for (const witness of area.affectedCreatureWitnesses) {
    if (witnessTargetIds.has(witness.targetId)) {
      return "Hypnotic Pattern Cube witnesses must not duplicate a target.";
    }
    witnessTargetIds.add(witness.targetId);
    if (witness.inCube !== true || witness.canSeePattern !== true) {
      return "Hypnotic Pattern affected-creature witnesses must prove Cube membership and sight.";
    }
  }
  if (
    witnessTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !witnessTargetIds.has(targetId))
  ) {
    return "Hypnotic Pattern requires a Cube and sight witness for every affected target.";
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function breakConcentrationForIncapacitatedTargets(
  state: BattleState,
  targetIds: readonly CombatantId[],
): BattleState {
  const incapacitatedTargetIds = targetIds.filter((targetId) => {
    const target = state.combatants.get(targetId);
    return (
      target !== undefined && hasCondition(target.conditions, "incapacitated")
    );
  });
  return incapacitatedTargetIds.reduce(
    (nextState, targetId) => breakBattleConcentration(nextState, targetId),
    state,
  );
}

const SaveGatedAreaControlInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("saveGatedAreaControl"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginCube"),
      sideFeet: MovementFeet,
    }),
    rangeFeet: MovementFeet,
    durationTicks: ElapsedTimeTicksSchema,
  }),
);

export const saveGatedAreaControlProfile = {
  procedure: "saveGatedAreaControl",
  executionSchema: SaveGatedAreaControlInvocationSchema,
  admit: admitSaveGatedAreaControl,
  discoverCastAct: discoverSaveGatedAreaControlCastAct,
  resolve: resolveSaveGatedAreaControl,
} satisfies SpellProcedureDeclaration<
  "saveGatedAreaControl",
  SaveGatedAreaControlSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
