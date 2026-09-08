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
    [1, 3, 5, 6].includes(mechanics.level),
    ["action", "bonus_action"].includes(mechanics.castingTime.kind),
    directHitPointRestorationHasCharacteristicRange(mechanics.range),
    mechanics.duration.kind === "instantaneous",
    directHitPointRestorationHasCharacteristicAttachment(phase.attachment),
  ];
  const hasHealingEffect = (phase.effects ?? []).some(
    (effect) => effect.kind === "heal_hp",
  );
  const representationMismatchCount =
    representationWitnesses.length -
    representationWitnesses.filter(Boolean).length;
  return hasHealingEffect
    ? representationMismatchCount <=
        DIRECT_HIT_POINT_RESTORATION_MAX_TOLERATED_REPRESENTATION_MISMATCHES
    : mechanics.phases.length === 1 && representationMismatchCount === 0;
}

function directHitPointRestorationHasCharacteristicRange(
  range: SpellMechanics["range"],
): boolean {
  return range.kind === "touch" || isFixedDistancePointRange(range);
}

function directHitPointRestorationHasCharacteristicAttachment(
  attachment: DirectHitPointRestorationActivationPhase["attachment"],
): boolean {
  if (attachment.kind !== "hole") return false;
  const value = attachment.value;
  if (value.kind === "target") return value.selection !== undefined;
  if (value.kind === "area") return value.selection !== undefined;
  return false;
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

type DirectHitPointRestorationCandidate = {
  readonly mechanics: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >;
  readonly phaseIndex: number;
  readonly phaseOrdinal: PositiveInteger;
  readonly phase: DirectHitPointRestorationActivationPhase;
};

function directHitPointRestorationCandidate(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): DirectHitPointRestorationCandidate | null {
  const phaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      directHitPointRestorationStablePhase(mechanics, phase),
  );
  const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
  return phase?.kind === "direct"
    ? {
        mechanics,
        phaseIndex,
        phaseOrdinal: PositiveInteger(phaseIndex + 1),
        phase,
      }
    : null;
}

type DirectHitPointRestorationHeaderProjection = {
  readonly actionCost: HealingSpellActionCost | null;
  readonly range: DirectHitPointRestorationRange | null;
  readonly duration: DirectHitPointRestorationDuration | null;
  readonly issues: readonly DirectHitPointRestorationMechanicsIssue[];
};

function directHitPointRestorationHeaderProjection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): DirectHitPointRestorationHeaderProjection {
  const castingTime = topLevelSpellCastingTime(mechanics);
  const actionCost =
    castingTime === null ? null : hitPointRestorationActionCost(castingTime);
  const range = directHitPointRestorationRange(mechanics.range);
  const duration =
    mechanics.duration.kind === "instantaneous" ? mechanics.duration : null;
  return {
    actionCost,
    range,
    duration,
    issues: [
      ...(mechanics.school === "abjuration"
        ? []
        : [
            {
              failedFact: "school" as const,
              mechanicsPath: spellMechanicsHeaderPath("school"),
            },
          ]),
      ...(actionCost !== null
        ? []
        : [
            {
              failedFact: "castingTime" as const,
              mechanicsPath: spellMechanicsHeaderPath("castingTime"),
            },
          ]),
      ...(range !== null
        ? []
        : [
            {
              failedFact: "range" as const,
              mechanicsPath: spellMechanicsHeaderPath("range"),
            },
          ]),
      ...(duration !== null
        ? []
        : [
            {
              failedFact: "duration" as const,
              mechanicsPath: spellMechanicsHeaderPath("duration"),
            },
            ...spellDurationEvidencePaths(mechanics.duration).map(
              (mechanicsPath) => ({
                failedFact: "duration" as const,
                mechanicsPath,
              }),
            ),
          ]),
    ],
  };
}

function directHitPointRestorationPhaseIssues(
  candidate: DirectHitPointRestorationCandidate,
): readonly DirectHitPointRestorationMechanicsIssue[] {
  return [
    ...(candidate.mechanics.phases.length === 1
      ? []
      : candidate.mechanics.phases.flatMap((_phase, index) =>
          index === candidate.phaseIndex
            ? []
            : [
                {
                  failedFact: "phaseCount" as const,
                  mechanicsPath: spellActivationPhasePath(
                    PositiveInteger(index + 1),
                  ),
                },
              ],
        )),
    ...(candidate.phaseIndex === 0
      ? []
      : [
          {
            failedFact: "phaseOrder" as const,
            mechanicsPath: spellActivationPhasePath(candidate.phaseOrdinal),
          },
        ]),
  ];
}

type DirectHitPointRestorationTargetingProjection = {
  readonly targeting: HealingSpellTargeting | null;
  readonly issues: readonly DirectHitPointRestorationMechanicsIssue[];
};

function directHitPointRestorationTargetingProjection(
  candidate: DirectHitPointRestorationCandidate,
): DirectHitPointRestorationTargetingProjection {
  const targeting =
    candidate.phase.attachment.kind === "hole"
      ? hitPointRestorationTargeting(candidate.phase.attachment.value)
      : null;
  return {
    targeting,
    issues:
      targeting === null
        ? [
            {
              failedFact: "attachment",
              mechanicsPath: spellActivationAttachmentPath(
                candidate.phaseOrdinal,
              ),
            },
          ]
        : [],
  };
}

type DirectHitPointRestorationEffectProjection = {
  readonly amount: DirectHitPointRestorationAmount | null;
  readonly healHpIndex: number;
  readonly healHp:
    | Extract<
        NonNullable<
          DirectHitPointRestorationActivationPhase["effects"]
        >[number],
        { readonly kind: "heal_hp" }
      >
    | undefined;
  readonly issues: readonly DirectHitPointRestorationMechanicsIssue[];
};

function directHitPointRestorationEffectCountIssues(
  effects: readonly NonNullable<
    DirectHitPointRestorationActivationPhase["effects"]
  >[number][],
  healHpIndex: number,
  phaseOrdinal: PositiveInteger,
): readonly DirectHitPointRestorationMechanicsIssue[] {
  if (effects.length === 1) return [];
  return [
    ...(effects.length === 0
      ? [
          {
            failedFact: "effects" as const,
            mechanicsPath: spellActivationEffectPath(
              phaseOrdinal,
              PositiveInteger(1),
            ),
          },
        ]
      : []),
    ...effects.flatMap((_effect, index) =>
      index === healHpIndex
        ? []
        : [
            {
              failedFact: "effects" as const,
              mechanicsPath: spellActivationEffectPath(
                phaseOrdinal,
                PositiveInteger(index + 1),
              ),
            },
          ],
    ),
  ];
}

function directHitPointRestorationEffectProjection(
  candidate: DirectHitPointRestorationCandidate,
): DirectHitPointRestorationEffectProjection {
  const effects = candidate.phase.effects ?? [];
  const healHpIndex = directHitPointRestorationHealHpIndex(
    effects,
    Number(candidate.mechanics.level),
  );
  const healing = directHitPointRestorationSelectedHealing(
    effects,
    healHpIndex,
    Number(candidate.mechanics.level),
  );
  return {
    ...healing,
    healHpIndex,
    issues: [
      ...directHitPointRestorationEffectCountIssues(
        effects,
        healHpIndex,
        candidate.phaseOrdinal,
      ),
      ...directHitPointRestorationHealingIssues(
        healing,
        healHpIndex,
        candidate.phaseOrdinal,
      ),
    ],
  };
}

function directHitPointRestorationHealHpIndex(
  effects: readonly NonNullable<
    DirectHitPointRestorationActivationPhase["effects"]
  >[number][],
  spellLevel: number,
): number {
  const representedHealHpIndex = effects.findIndex(
    (effect) =>
      effect.kind === "heal_hp" &&
      directHitPointRestorationAmountProjection(effect.amount, spellLevel) !==
        null,
  );
  return representedHealHpIndex >= 0
    ? representedHealHpIndex
    : effects.findIndex((effect) => effect.kind === "heal_hp");
}

function directHitPointRestorationSelectedHealing(
  effects: readonly NonNullable<
    DirectHitPointRestorationActivationPhase["effects"]
  >[number][],
  healHpIndex: number,
  spellLevel: number,
): Pick<DirectHitPointRestorationEffectProjection, "healHp" | "amount"> {
  const selectedEffect = healHpIndex < 0 ? undefined : effects[healHpIndex];
  const healHp =
    selectedEffect?.kind === "heal_hp" ? selectedEffect : undefined;
  const amount =
    healHp === undefined
      ? null
      : directHitPointRestorationAmountProjection(healHp.amount, spellLevel);
  return { amount, healHp };
}

function directHitPointRestorationHealingIssues(
  healing: Pick<DirectHitPointRestorationEffectProjection, "healHp" | "amount">,
  healHpIndex: number,
  phaseOrdinal: PositiveInteger,
): readonly DirectHitPointRestorationMechanicsIssue[] {
  return healing.healHp !== undefined && healing.amount !== null
    ? []
    : [
        {
          failedFact: "healing",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(
              healing.healHp === undefined || healHpIndex < 0
                ? 1
                : healHpIndex + 1,
            ),
          ),
        },
      ];
}

type DirectHitPointRestorationSupportedProjection = {
  readonly range: DirectHitPointRestorationRange;
  readonly duration: DirectHitPointRestorationDuration;
  readonly actionCost: HealingSpellActionCost;
  readonly targeting: DirectHitPointRestorationTargeting;
  readonly amount: DirectHitPointRestorationAmount;
};

function directHitPointRestorationSupportedProjection(input: {
  readonly candidate: DirectHitPointRestorationCandidate;
  readonly header: DirectHitPointRestorationHeaderProjection;
  readonly targeting: DirectHitPointRestorationTargetingProjection;
  readonly effect: DirectHitPointRestorationEffectProjection;
}): DirectHitPointRestorationSupportedProjection | null {
  const { header, targeting, effect } = input;
  if (
    header.actionCost === null ||
    targeting.targeting === null ||
    header.range === null ||
    header.duration === null ||
    effect.healHp === undefined ||
    effect.amount === null
  ) {
    return null;
  }
  return {
    range: header.range,
    duration: header.duration,
    actionCost: header.actionCost,
    targeting: targeting.targeting,
    amount: effect.amount,
  };
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
  const candidate = directHitPointRestorationCandidate(source.mechanics);
  if (candidate === null) return { tag: "notRepresented" };
  const header = directHitPointRestorationHeaderProjection(candidate.mechanics);
  const targeting = directHitPointRestorationTargetingProjection(candidate);
  const effect = directHitPointRestorationEffectProjection(candidate);
  const issues = [
    ...header.issues,
    ...directHitPointRestorationPhaseIssues(candidate),
    ...targeting.issues,
    ...effect.issues,
  ];
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      directHitPointRestorationIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  const projection = directHitPointRestorationSupportedProjection({
    candidate,
    header,
    targeting,
    effect,
  });
  if (projection === null) {
    return {
      tag: "unsupported",
      issues: [
        directHitPointRestorationIssueResult({
          failedFact: "healing",
          mechanicsPath: spellActivationEffectPath(
            candidate.phaseOrdinal,
            PositiveInteger(1),
          ),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ...projection,
  } satisfies DirectHitPointRestorationMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "directHitPointRestoration",
      facts,
      evidence: directHitPointRestorationMechanicsEvidence(
        candidate.mechanics,
        candidate.phaseOrdinal,
        candidate.phase,
      ),
      admit: (executionSource, ctx) =>
        admitDirectHitPointRestoration(executionSource, ctx, facts),
    },
  };
}

function hitPointRestorationTargeting(
  attachment: Attachment,
): HealingSpellTargeting | null {
  if (attachment.kind === "target") {
    return hitPointRestorationTargetAttachmentTargeting(attachment);
  }
  if (attachment.kind === "area") {
    return hitPointRestorationAreaAttachmentTargeting(attachment);
  }
  return null;
}

function hitPointRestorationTargetAttachmentTargeting(
  attachment: Extract<Attachment, { readonly kind: "target" }>,
): Extract<HealingSpellTargeting, { readonly kind: "targetList" }> | null {
  if (
    !attachmentValueHasOnlyKeys(
      attachment,
      DIRECT_HIT_POINT_RESTORATION_TARGET_ATTACHMENT_KEYS,
    )
  )
    return null;
  const targetBounds = hitPointRestorationTargetBounds(attachment.selection);
  return targetBounds === null
    ? null
    : {
        kind: "targetList",
        minTargets: 1,
        maxTargets: targetBounds.maxTargets,
      };
}

function hitPointRestorationAreaAttachmentTargeting(
  attachment: Extract<Attachment, { readonly kind: "area" }>,
): Extract<
  HealingSpellTargeting,
  { readonly kind: "pointOriginSphereTargetList" }
> | null {
  if (
    !attachmentValueHasOnlyKeys(
      attachment,
      DIRECT_HIT_POINT_RESTORATION_AREA_ATTACHMENT_KEYS,
    )
  )
    return null;
  if (attachment.selection === undefined) return null;
  const targetBounds = hitPointRestorationTargetBounds(attachment.selection);
  if (targetBounds === null) return null;
  if (attachment.origin.kind !== "point_within_range") return null;
  if (attachment.shape.kind !== "sphere") return null;
  if (typeof attachment.shape.radiusFeet !== "number") return null;
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
