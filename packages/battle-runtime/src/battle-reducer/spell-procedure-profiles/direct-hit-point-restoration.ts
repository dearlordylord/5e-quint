import { spellInvocationResourceForCastOption } from "./profile.ts";
import { optionalProperty } from "../../optional-property.ts";
import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.hit-point-restoration unit-feature.spell-slot-healing-modifier
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HIT_POINT_RESTORATION BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The directHitPointRestoration Spell Procedure Profile: prepared spells that
// directly restore Hit Points through target fills and one healing roll, with
// Magic Action or Bonus Action casting.
//
// RAW anchors:
//   - SRD 5.2.1 Rules Glossary "Hit Points": healing restores Hit Points and
//     cannot raise them above the Hit Point maximum.
//   - SRD 5.2.1 Rules Glossary "Bonus Action": Bonus Actions exist only when a
//     rule explicitly grants one.
//   - SRD 5.2.1 Spells "Healing Word" and "Mass Healing Word": Bonus Action
//     restoration spells.
//   - SRD 5.2.1 Spells "Cure Wounds" and "Mass Cure Wounds": Magic Action
//     restoration spells.
//   - SRD 5.2.1 Cleric "Level 3: Disciple of Life": slot-cast spell
//     restoration adds 2 plus the Spell Slot level to each healed creature.

import {
  movementFeet,
  type AbilityModifier,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { isFixedDistancePointRange } from "@dnd/surface/surface/types";
import type {
  Attachment,
  DiceExpr,
  DiceExprDelta,
  FixedDistancePointRange,
  Range,
  TopLevelSpellCastingTime,
  DiceAmount as SurfaceDiceAmount,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { topLevelSpellCastingTime } from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";

import { characterUnitProcedureBindings } from "../../character-execution-queries.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type HealingSpellActionCost,
  type HealingSpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { applyHpHealing } from "../damage-apply.ts";
import {
  needsHolesResult,
  spellSelectionResolution,
} from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { spellHealingAmount } from "../spell-effects.ts";
import {
  spellHealingRollHole,
  validateSpellHealingFill,
} from "../spells-damage-fills.ts";
import {
  spellCastSelectionSubject,
  targetListSpellUsesTargetListHole,
} from "../spells-discovery.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { healingSpellTargetSelection } from "../spells-resolve-target-selection.ts";
import {
  attachmentValueHasOnlyKeys,
  sameStringSet,
  targetSelectionHasOnlyKeys,
} from "../spells-execution-facts.ts";
import {
  spellTargetHole,
  spellTargetListHole,
  spellTargetListHoleId,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationEvidencePaths,
  spellProcedureNonEmpty,
  spellTouchRangeFeet,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { PositiveInteger } from "@dnd/shared/types";
import {
  MovementFeet as MovementFeetSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type DirectHitPointRestorationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "directHitPointRestoration" }
>;
type DirectHitPointRestorationResolveInput =
  SpellProcedureProfileResolveInput<DirectHitPointRestorationInvocation>;

type DirectHitPointRestorationActivationPhase = Extract<
  Extract<SpellMechanics, { readonly family: "activation" }>["phases"][number],
  { readonly kind: "direct" }
>;

function directHitPointRestorationStablePhase(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: DirectHitPointRestorationActivationPhase,
): boolean {
  const representationWitnesses = [
    mechanics.school === "abjuration",
    mechanics.level === 1 ||
      mechanics.level === 3 ||
      mechanics.level === 5 ||
      mechanics.level === 6,
    mechanics.castingTime.kind === "action" ||
      mechanics.castingTime.kind === "bonus_action",
    mechanics.range.kind === "touch" ||
      isFixedDistancePointRange(mechanics.range),
    mechanics.duration.kind === "instantaneous",
    phase.attachment.kind === "hole" &&
      ((phase.attachment.value.kind === "target" &&
        phase.attachment.value.selection !== undefined) ||
        (phase.attachment.value.kind === "area" &&
          phase.attachment.value.selection !== undefined)),
  ];
  const hasHealingEffect = (phase.effects ?? []).some(
    (effect) => effect.kind === "heal_hp",
  );
  const allRepresentationWitnesses = [
    ...representationWitnesses,
    hasHealingEffect,
  ];
  const allRepresentationWitnessCount =
    allRepresentationWitnesses.filter(Boolean).length;
  const allRepresentationMismatchCount =
    allRepresentationWitnesses.length - allRepresentationWitnessCount;
  return (
    allRepresentationMismatchCount <=
    DIRECT_HIT_POINT_RESTORATION_MAX_TOLERATED_REPRESENTATION_MISMATCHES
  );
}

function admitDirectHitPointRestoration(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: DirectHitPointRestorationMechanicsFacts,
): readonly DirectHitPointRestorationInvocation[] {
  const rangeFeet = hitPointRestorationRangeFeet(facts.range);
  return ctx.spellCastOptions.flatMap(
    (slot): readonly DirectHitPointRestorationInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) {
        return [];
      }
      const healingExpr = hitPointRestorationAmountExpr(
        facts.amount,
        facts.level,
        slot.spellLevel,
        ctx.castingSource.abilityModifier,
      );
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "directHitPointRestoration",
          spell,
          actionCost: facts.actionCost,
          targeting: facts.targeting,
          healing: { expr: healingExpr },
          rangeFeet,
        },
      ];
    },
  );
}

type DirectHitPointRestorationRange =
  | Extract<SpellDefinitionRuleFacts["range"], { readonly kind: "touch" }>
  | FixedDistancePointRange;
type DirectHitPointRestorationDuration = Extract<
  SpellDefinitionRuleFacts["duration"],
  { readonly kind: "instantaneous" }
>;
type DirectHitPointRestorationSpellcastingDiceExpr = Omit<
  DiceExpr,
  "dieSize" | "spellcastingMod" | "flat" | "abilityModifier"
> & {
  readonly dieSize: number;
  readonly spellcastingMod: true;
  readonly flat?: never;
  readonly abilityModifier?: never;
};
type DirectHitPointRestorationPerLevel = Omit<
  DiceExprDelta,
  "dieSize" | "flat"
> & {
  readonly dieSize?: never;
  readonly flat?: never;
};
type DirectHitPointRestorationAmount = Extract<
  SurfaceDiceAmount,
  { readonly kind: "linear_per_level" }
> & {
  readonly axis: "slot";
  readonly base: DirectHitPointRestorationSpellcastingDiceExpr;
  readonly perLevel: DirectHitPointRestorationPerLevel;
};
type DirectHitPointRestorationTargeting =
  | Extract<HealingSpellTargeting, { readonly kind: "targetList" }>
  | Extract<
      HealingSpellTargeting,
      { readonly kind: "pointOriginSphereTargetList" }
    >;
type DirectHitPointRestorationMechanicsFacts = Omit<
  SpellDefinitionRuleFacts,
  "range" | "duration"
> & {
  readonly range: DirectHitPointRestorationRange;
  readonly duration: DirectHitPointRestorationDuration;
  readonly actionCost: HealingSpellActionCost;
  readonly targeting: DirectHitPointRestorationTargeting;
  readonly amount: DirectHitPointRestorationAmount;
};

const DIRECT_HIT_POINT_RESTORATION_TARGET_SELECTION_KEYS = [
  "mode",
  "count",
  "targetKinds",
] as const;
const DIRECT_HIT_POINT_RESTORATION_TARGET_ATTACHMENT_KEYS = [
  "kind",
  "selection",
] as const;
const DIRECT_HIT_POINT_RESTORATION_AREA_ATTACHMENT_KEYS = [
  "kind",
  "shape",
  "origin",
  "selection",
] as const;
const DIRECT_HIT_POINT_RESTORATION_MAX_TOLERATED_REPRESENTATION_MISMATCHES = 1;

export const DIRECT_HIT_POINT_RESTORATION_FAILED_FACTS = [
  "school",
  "castingTime",
  "range",
  "duration",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "effects",
  "healing",
] as const;
type DirectHitPointRestorationFailedFact =
  (typeof DIRECT_HIT_POINT_RESTORATION_FAILED_FACTS)[number];

type DirectHitPointRestorationMechanicsIssue = {
  readonly failedFact: DirectHitPointRestorationFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function directHitPointRestorationIssueResult(
  issue: DirectHitPointRestorationMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "directHitPointRestoration";
  readonly failedFact: DirectHitPointRestorationFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "directHitPointRestoration",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported directHitPointRestoration mechanics fact: ${issue.failedFact}.`,
  };
}

function directHitPointRestorationMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseOrdinal: PositiveInteger,
  phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "activation" }
    >["phases"][number],
    { readonly kind: "direct" }
  >,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellActivationPhasePath(phaseOrdinal),
    spellActivationAttachmentPath(phaseOrdinal),
    ...(phase.effects ?? []).map((_effect, index) =>
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function directHitPointRestorationAmountProjection(
  amount: SurfaceDiceAmount,
  spellLevel: number,
): DirectHitPointRestorationAmount | null {
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel ||
    amount.base.spellcastingMod !== true ||
    amount.base.dieSize === undefined
  ) {
    return null;
  }
  const base = directHitPointRestorationBaseProjection(amount.base);
  const perLevel = directHitPointRestorationPerLevelProjection(amount.perLevel);
  if (base === null || perLevel === null) return null;
  return {
    kind: "linear_per_level",
    axis: "slot",
    base,
    perLevel,
    startingAtLevel: amount.startingAtLevel,
  };
}

function directHitPointRestorationBaseProjection(
  base: DiceExpr,
): DirectHitPointRestorationSpellcastingDiceExpr | null {
  if (
    base.spellcastingMod !== true ||
    base.flat !== undefined ||
    base.abilityModifier !== undefined
  ) {
    return null;
  }
  return {
    dice: base.dice,
    dieSize: base.dieSize,
    spellcastingMod: true,
  };
}

function directHitPointRestorationPerLevelProjection(
  perLevel: DiceExprDelta,
): DirectHitPointRestorationPerLevel | null {
  if (perLevel.dieSize !== undefined || perLevel.flat !== undefined) {
    return null;
  }
  return perLevel.dice === undefined ? {} : { dice: perLevel.dice };
}

function admitDirectHitPointRestorationMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "directHitPointRestoration",
  DirectHitPointRestorationMechanicsFacts,
  DirectHitPointRestorationInvocation,
  ReturnType<typeof directHitPointRestorationIssueResult>
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      directHitPointRestorationStablePhase(mechanics, phase),
  );
  const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
  if (phase?.kind !== "direct") {
    return { tag: "notRepresented" };
  }
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  const issues: DirectHitPointRestorationMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: DirectHitPointRestorationFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  const castingTime = topLevelSpellCastingTime(mechanics);
  if (mechanics.school !== "abjuration") {
    pushIssue("school", spellMechanicsHeaderPath("school"));
  }
  const actionCost =
    castingTime === null ? null : hitPointRestorationActionCost(castingTime);
  if (actionCost === null) {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  const range = directHitPointRestorationRange(mechanics.range);
  if (range === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  const duration =
    mechanics.duration.kind === "instantaneous" ? mechanics.duration : null;
  if (duration === null) {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationEvidencePaths(mechanics.duration)) {
      pushIssue("duration", path);
    }
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === phaseIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
    }
  }
  if (phaseIndex !== 0) {
    pushIssue("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  }
  const targeting =
    phase.attachment.kind === "hole"
      ? hitPointRestorationTargeting(phase.attachment.value)
      : null;
  if (targeting === null) {
    pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
  }
  const effects = phase.effects ?? [];
  const representedHealHpIndex = effects.findIndex(
    (effect) =>
      effect.kind === "heal_hp" &&
      directHitPointRestorationAmountProjection(
        effect.amount,
        Number(mechanics.level),
      ) !== null,
  );
  const healHpIndex =
    representedHealHpIndex >= 0
      ? representedHealHpIndex
      : effects.findIndex((effect) => effect.kind === "heal_hp");
  if (effects.length !== 1) {
    if (effects.length === 0) {
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      );
    }
    for (const [index] of effects.entries()) {
      if (index === healHpIndex) continue;
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
      );
    }
  }
  const healHp = healHpIndex < 0 ? undefined : effects[healHpIndex];
  const amount =
    healHp?.kind === "heal_hp"
      ? directHitPointRestorationAmountProjection(
          healHp.amount,
          Number(mechanics.level),
        )
      : null;
  if (healHp?.kind !== "heal_hp") {
    pushIssue(
      "healing",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
  } else if (amount === null) {
    pushIssue(
      "healing",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(healHpIndex < 0 ? 1 : healHpIndex + 1),
      ),
    );
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      directHitPointRestorationIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    actionCost === null ||
    targeting === null ||
    range === null ||
    duration === null ||
    healHp?.kind !== "heal_hp" ||
    amount === null
  ) {
    return {
      tag: "unsupported",
      issues: [
        directHitPointRestorationIssueResult({
          failedFact: "healing",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(1),
          ),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range,
    duration,
    actionCost,
    targeting,
    amount,
  } satisfies DirectHitPointRestorationMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "directHitPointRestoration",
      facts,
      evidence: directHitPointRestorationMechanicsEvidence(
        mechanics,
        phaseOrdinal,
        phase,
      ),
      admit: (executionSource, ctx) =>
        admitDirectHitPointRestoration(executionSource, ctx, facts),
    },
  };
}

function hitPointRestorationTargeting(
  attachment: Attachment,
): HealingSpellTargeting | null {
  const supportedAttachmentKeys =
    attachment.kind === "target"
      ? DIRECT_HIT_POINT_RESTORATION_TARGET_ATTACHMENT_KEYS
      : attachment.kind === "area"
        ? DIRECT_HIT_POINT_RESTORATION_AREA_ATTACHMENT_KEYS
        : null;
  if (
    supportedAttachmentKeys === null ||
    !attachmentValueHasOnlyKeys(attachment, supportedAttachmentKeys)
  ) {
    return null;
  }
  if (attachment.kind === "target") {
    const targetBounds = hitPointRestorationTargetBounds(attachment.selection);
    return targetBounds === null
      ? null
      : {
          kind: "targetList",
          minTargets: 1,
          maxTargets: targetBounds.maxTargets,
        };
  }

  if (attachment.kind === "area") {
    const targetBounds =
      attachment.selection === undefined
        ? null
        : hitPointRestorationTargetBounds(attachment.selection);
    if (
      targetBounds === null ||
      attachment.origin.kind !== "point_within_range" ||
      attachment.shape.kind !== "sphere" ||
      typeof attachment.shape.radiusFeet !== "number"
    ) {
      return null;
    }
    return {
      kind: "pointOriginSphereTargetList",
      minTargets: 1,
      maxTargets: targetBounds.maxTargets,
      area: {
        kind: "pointOriginSphere",
        radiusFeet: movementFeet(attachment.shape.radiusFeet),
      },
    };
  }

  return null;
}

function hitPointRestorationActionCost(
  castingTime: TopLevelSpellCastingTime,
): HealingSpellActionCost | null {
  return Match.value(castingTime).pipe(
    Match.when({ kind: "action" }, () => "magicAction" as const),
    Match.when({ kind: "bonus_action" }, () => "bonusAction" as const),
    Match.orElse(() => null),
  );
}

function hitPointRestorationTargetBounds(
  selection: TargetSelection,
): { readonly maxTargets: number } | null {
  if (
    !targetSelectionHasOnlyKeys(
      selection,
      DIRECT_HIT_POINT_RESTORATION_TARGET_SELECTION_KEYS,
    ) ||
    !sameStringSet(selection.targetKinds ?? ["creature"], ["creature"])
  ) {
    return null;
  }
  if (selection.mode === "one") {
    return { maxTargets: 1 };
  }
  if (
    selection.mode === "choose_up_to" &&
    typeof selection.count === "number" &&
    selection.count >= 1
  ) {
    return { maxTargets: selection.count };
  }
  return null;
}

function directHitPointRestorationRange(
  range: Range,
): DirectHitPointRestorationRange | null {
  if (range.kind === "touch") return range;
  return isFixedDistancePointRange(range) ? range : null;
}

function hitPointRestorationRangeFeet(
  range: DirectHitPointRestorationRange,
): MovementFeet {
  return range.kind === "touch"
    ? spellTouchRangeFeet()
    : movementFeet(range.feet);
}

function hitPointRestorationAmountExpr(
  amount: DirectHitPointRestorationAmount,
  _spellLevel: number,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr {
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat: Number(spellcastingAbilityModifier),
  };
}

function discoverDirectHitPointRestorationCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DirectHitPointRestorationInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: spellCastSelectionSubject(actorId, invocation),
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function resolveDirectHitPointRestoration(
  input: DirectHitPointRestorationResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellTargetListHoleId(input.invocation),
      spellHealingRollHole(input.invocation).holeId,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hit Point restoration spells use target fills and one healing roll.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    healingSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    targetSelection.targetIds,
    input.actionCostOverride === "bonusAction" ||
      input.input.subject.tag === "bonusActionSpell"
      ? { kind: "bonusAction" }
      : { kind: "magicAction" },
    input.metamagicApplications ?? [],
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (input.fillSet.healingRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellHealingRollHole(input.invocation),
    ]);
  }
  const healingValidation = validateSpellHealingFill(
    input.fillSet.healingRoll,
    input.invocation,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (healingValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", healingValidation);
  }
  /* v8 ignore stop -- @preserve */
  const healingAmount = spellHealingAmount(
    input.invocation,
    input.fillSet.healingRoll,
  );
  const healingModifierAmount = spellSlotHealingModifierAmount(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  const healed = targetSelection.targetIds.reduce((state, targetId) => {
    const target = state.combatants.get(targetId);
    return target === undefined
      ? state
      : {
          ...state,
          combatants: new Map(state.combatants).set(
            targetId,
            applyHpHealing(target, healingAmount + healingModifierAmount),
          ),
        };
  }, input.input.state);
  return spendSpellCastResources({
    state: healed,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

function spellSlotHealingModifierAmount(
  state: BattleState,
  actorId: CombatantId,
  invocation: DirectHitPointRestorationResolveInput["invocation"],
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return 0;
  }
  const castLevel = Match.value(invocation.resource).pipe(
    Match.when({ tag: "spellSlot" }, ({ slotLevel }) => slotLevel),
    Match.when({ tag: "spellAccessFreeCast" }, ({ castLevel }) => castLevel),
    Match.exhaustive,
  );
  return characterUnitProcedureBindings(actor.origin.execution).reduce(
    (total, { procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "spellSlotHealingModifier"
        ? total +
          procedure.execution.healingModifier.bonus.flat +
          Number(castLevel)
        : total,
    0,
  );
}

const DirectHitPointRestorationInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("directHitPointRestoration"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literals(["magicAction", "bonusAction"]),
    targeting: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginSphereTargetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
        area: Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeetSchema,
        }),
      }),
    ]),
    healing: Schema.Struct({ expr: DiceExprSchema }),
    rangeFeet: MovementFeetSchema,
  }),
);
export const directHitPointRestorationProfile = {
  procedure: "directHitPointRestoration",
  executionSchema: DirectHitPointRestorationInvocationSchema,
  admitMechanics: admitDirectHitPointRestorationMechanics,
  discoverCastAct: discoverDirectHitPointRestorationCastAct,
  resolve: resolveDirectHitPointRestoration,
} satisfies SpellProcedureDeclaration<
  "directHitPointRestoration",
  DirectHitPointRestorationInvocation
>;
