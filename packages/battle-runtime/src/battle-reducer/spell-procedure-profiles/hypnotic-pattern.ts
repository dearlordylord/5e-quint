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
import { Either, Schema } from "effect";
import {
  bindStoredSpellProcedureExecutionFacts,
  type SpellProcedureExecution,
} from "../../character-execution-admission.ts";
import type {
  ActionSpellBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleExecutableSpellInvocation,
  BattleHole,
  BattleInterruptedProcedure,
  BattleResolutionResult,
  BattleSpellSavingThrowOutcomeValue,
  BattleState,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  GLYPH_STORED_AREA_CONTROL_PROCEDURES,
  type GlyphStoredAreaControlInvocation,
  type GlyphStoredAreaControlProcedure,
} from "../../procedure-admission/glyph-stored-spell.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
} from "../../battle-state-execution.ts";
import type { CharacterBattleMetamagicOptionFact } from "../../character-battle-resources.ts";
import { type CombatantId } from "../../identity.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import {
  conditionApplicationPreventedByConditionImmunity,
  conditionApplicationPreventedByCreatureTypeProtection,
  conditionHadNonSpellSourceBeforeSpellEffect,
} from "../spell-condition-effects-helpers.ts";
import { extendSavingThrowOngoingFeatures } from "../attack-roll.ts";
import {
  saveMetamagicSelectionState,
  validateSavingThrowOutcomes,
} from "../spells-resolve-save-gates.ts";
import {
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "../spells-resolve-resources.ts";
import { invalidResult } from "../result-helpers.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type { HypnoticPatternStoredGlyphRelease } from "./resolution-contract.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowOutcomeHole,
} from "../spells-holes-fills.ts";

type HypnoticPatternSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "hypnoticPattern" }
>;
type StoredGlyphAreaControlSpellInvocation =
  SpellProcedureExecution<GlyphStoredAreaControlInvocation>;

type HypnoticPatternPhase = Extract<
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

type HypnoticPatternResolveInput =
  SpellProcedureProfileResolveInput<HypnoticPatternSpellInvocation>;

export function isGlyphStoredAreaControlSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is GlyphStoredAreaControlInvocation;
export function isGlyphStoredAreaControlSpellInvocation(
  invocation: SpellProcedureExecution,
): invocation is StoredGlyphAreaControlSpellInvocation;
export function isGlyphStoredAreaControlSpellInvocation(
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
): invocation is
  | GlyphStoredAreaControlInvocation
  | StoredGlyphAreaControlSpellInvocation;
export function isGlyphStoredAreaControlSpellInvocation(
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
): boolean {
  return (
    isGlyphStoredAreaControlProcedure(invocation.procedure) &&
    ("spellRuleFacts" in invocation
      ? invocation.spellRuleFacts.duration.kind === "concentration"
      : "spell" in invocation &&
        invocation.spell.mechanics.duration.kind === "concentration")
  );
}

export function isGlyphStoredAreaControlProcedure(
  procedure: SupportedSpellInvocation["procedure"],
): procedure is GlyphStoredAreaControlProcedure {
  return GLYPH_STORED_AREA_CONTROL_PROCEDURES.some(
    (candidate) => candidate === procedure,
  );
}

export function resolveStoredGlyphAreaControlSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: StoredGlyphAreaControlSpellInvocation;
  readonly fillSet: Extract<
    SpellProcedureProfileResolveInput<HypnoticPatternSpellInvocation>["fillSet"],
    { readonly tag: "ok" }
  >;
  readonly selfOriginAreaAnchorId: CombatantId;
}): BattleResolutionResult {
  return resolveHypnoticPattern({
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

function admitHypnoticPattern(
  spell: HypnoticPatternSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly HypnoticPatternSpellInvocation[] {
  const hypnoticPattern = hypnoticPatternSpell(spell);
  if (hypnoticPattern === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly HypnoticPatternSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "hypnoticPattern",
              spell,
              actionCost: "magicAction",
              ability: hypnoticPattern.phase.ability,
              dc: hypnoticPattern.phase.dc,
              targeting: {
                kind: "pointOriginCube",
                sideFeet: movementFeet(
                  hypnoticPattern.phase.attachment.value.shape.sideFeet,
                ),
              },
              rangeFeet: movementFeet(hypnoticPattern.rangeFeet),
              durationTicks: hypnoticPattern.durationTicks,
            },
          ],
  );
}

function hypnoticPatternSpell(spell: HypnoticPatternSpellInvocation["spell"]): {
  readonly phase: HypnoticPatternPhase;
  readonly durationTicks: HypnoticPatternSpellInvocation["durationTicks"];
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
    !isHypnoticPatternPhase(phase)
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        phase,
        durationTicks: durationTicks.right,
        rangeFeet: spell.mechanics.range.feet,
      };
}

function isHypnoticPatternPhase(
  phase: ActivationPhase | undefined,
): phase is HypnoticPatternPhase {
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
    failedEffects.some(isHypnoticPatternShakeAwakeEffect)
  );
}

function isApplyConditionEffect(
  effect: EffectAtom,
  condition: "charmed" | "incapacitated",
): boolean {
  return effect.kind === "apply_condition" && effect.condition === condition;
}

function isHypnoticPatternShakeAwakeEffect(effect: EffectAtom): boolean {
  return (
    effect.kind === "target_effect_escape_action" &&
    effect.actor === "another_creature" &&
    effect.cost === "action" &&
    effect.method === "shake_awake" &&
    effect.outcome === "end_current_effect"
  );
}

function discoverHypnoticPatternCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HypnoticPatternSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = hypnoticPatternCastAct(actorId, invocation, [
    savingThrowHole,
  ]);
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
          initialHoles: hypnoticPatternMetamagicInitialHoles(
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

function hypnoticPatternCastAct(
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<HypnoticPatternSpellInvocation>,
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

function hypnoticPatternMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HypnoticPatternSpellInvocation>,
  metamagicApplications: readonly CharacterBattleMetamagicOptionFact[],
): readonly BattleHole[] {
  const holes: BattleHole[] = [];
  if (
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }
  return holes;
}

function hypnoticPatternReleaseResourceState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: HypnoticPatternResolveInput["invocation"];
  readonly errorState: BattleState;
  readonly metamagicApplications: readonly CharacterBattleMetamagicOptionFact[];
  readonly storedGlyphRelease: HypnoticPatternStoredGlyphRelease | undefined;
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
  storedGlyphRelease: HypnoticPatternStoredGlyphRelease | undefined,
): boolean {
  return storedGlyphRelease === undefined;
}

function invalidStoredGlyphAreaCenterResult(input: {
  readonly state: BattleState;
  readonly savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue;
  readonly storedGlyphRelease: HypnoticPatternStoredGlyphRelease | undefined;
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

function resolveHypnoticPattern(
  input: HypnoticPatternResolveInput,
): BattleResolutionResult {
  const metamagicApplications =
    input.storedGlyphRelease === undefined ? input.metamagicApplications : [];
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
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  const areaWitnessValidation = validateHypnoticPatternAreaWitness(
    input.fillSet.savingThrowOutcomes,
  );
  if (areaWitnessValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      areaWitnessValidation,
    );
  }
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    savingThrowOutcomes: input.fillSet.savingThrowOutcomes,
    storedGlyphRelease: input.storedGlyphRelease,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }
  const affectedTargetIds = input.fillSet.savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  if (failedTargets.length > 0) {
    const continuation: BattleInterruptedProcedure =
      input.input.glyphStoredSpellReleaseReplay === undefined
        ? {
            kind: "replay",
            subject:
              input.input.reactionContinuationSubject ?? input.input.subject,
            fills: input.input.fills,
          }
        : {
            kind: "replay",
            subject: input.input.subject,
            fills: input.input.fills,
            glyphStoredSpellReleaseReplay:
              input.input.glyphStoredSpellReleaseReplay,
          };
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
  const resourced = hypnoticPatternReleaseResourceState({
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
  const effected = applyHypnoticPatternControlEffects(
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

function applyHypnoticPatternControlEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<HypnoticPatternSpellInvocation>,
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
        effect.kind === "hypnoticPatternControl" &&
        effect.sourceProcedureRef === invocation.sourceProcedureRef &&
        effect.sourceCombatantId === actorId,
    );
    const activeEffects = [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        kind: "hypnoticPatternControl" as const,
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
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    );
    appliedTargetIds.push(targetId);
  }
  return { state: { ...state, combatants }, appliedTargetIds };
}

function validateHypnoticPatternAreaWitness(
  savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue,
): string | null {
  if (!("area" in savingThrowOutcomes)) {
    return "Hypnotic Pattern requires a point-origin Cube area witness.";
  }
  const area = savingThrowOutcomes.area;
  if (area.kind !== "hypnoticPatternArea") {
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

const HypnoticPatternInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("hypnoticPattern"),
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

export const hypnoticPatternProfile = {
  procedure: "hypnoticPattern",
  executionSchema: HypnoticPatternInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  admit: admitHypnoticPattern,
  discoverCastAct: discoverHypnoticPatternCastAct,
  resolve: resolveHypnoticPattern,
} satisfies SpellProcedureDeclaration<
  "hypnoticPattern",
  HypnoticPatternSpellInvocation
>;
