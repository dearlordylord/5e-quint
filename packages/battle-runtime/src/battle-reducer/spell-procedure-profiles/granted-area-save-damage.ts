import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import { spellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-initial
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
//
// The grantedAreaSaveDamageAction Spell Procedure Profile: a prepared Bonus Action
// spell that attaches a Concentration-owned Spell Effect to one willing touched
// creature and stores the chosen damage type for the target-granted Magic
// Action. The source execution binding owns the cast level and save mechanics.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Dragon's Breath": Bonus Action, Touch,
//     Concentration up to 1 minute; choose Acid, Cold, Fire, Lightning, or
//     Poison; one willing creature can take a Magic Action to exhale a 15-foot
//     Cone; Dexterity Saving Throw for half damage.
//   - The same spell's "Using a Higher-Level Spell Slot" section: damage
//     increases by 1d6 for each Spell Slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Magic Action, Concentration,
//     Spell Slot, Spell Invocation, Spell Effect, and Spell Save DC.

import {
  ElapsedTimeTicksSchema,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { CombatantId } from "../../identity.ts";
import {
  MovementFeet,
  PositiveInteger,
  type DamageDieSize,
  type DamageType,
} from "@dnd/shared/types";
import type {
  DamageTypeRef,
  DiceAmount,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Schema } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type BattleSpellExecutionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import {
  GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS,
  GRANTED_AREA_SAVE_DAMAGE_CONE_LENGTH_FEET,
  GRANTED_AREA_SAVE_DAMAGE_DIE_SIZE,
  GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS,
  GRANTED_AREA_SAVE_DAMAGE_TYPE_CHOICES,
} from "../domain-constants.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import { applyGrantedAreaSaveDamageActionSpellEffect } from "../spells-active-effects.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetListHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DamageDieSizeSchema,
  DamageTypeSchema,
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  admitSpellAreaAttachment,
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellHasOnlyNamedFields,
  spellProcedureHasRedundantSignature,
  spellProcedureNonEmpty,
  spellTouchRangeFeet,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalEffectPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  spellOngoingInitialPhasePath,
  spellDurationValuePath,
  spellMechanicsRootPath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThan(0)),
  Schema.brand("Integer"),
  Schema.brand("PositiveInteger"),
);
const GrantedAreaSaveDamageConeLengthFeetSchema = Schema.Literal(
  GRANTED_AREA_SAVE_DAMAGE_CONE_LENGTH_FEET,
).pipe(Schema.brand("MovementFeet"));
const GrantedAreaSaveDamageDieSizeSchema = DamageDieSizeSchema.pipe(
  Schema.refine(
    (
      value,
    ): value is DamageDieSize & typeof GRANTED_AREA_SAVE_DAMAGE_DIE_SIZE =>
      value === GRANTED_AREA_SAVE_DAMAGE_DIE_SIZE,
    { expected: "the admitted granted-area damage die size" },
  ),
);

type GrantedAreaSaveDamageActionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "grantedAreaSaveDamageAction" }
>;
type GrantedAreaSaveDamageActionResolveInput =
  SpellProcedureProfileResolveInput<GrantedAreaSaveDamageActionInvocation>;

type GrantedAreaSaveDamageAmount = Extract<
  DiceAmount,
  {
    readonly kind: typeof GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage.kind;
  }
> & {
  readonly axis: typeof GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage.axis;
  readonly base: {
    readonly dice: PositiveInteger &
      (typeof GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage)["baseDice"];
    readonly dieSize: DamageDieSize & typeof GRANTED_AREA_SAVE_DAMAGE_DIE_SIZE;
  };
  readonly perLevel: {
    readonly dice: PositiveInteger &
      (typeof GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage)["perSlotDice"];
    readonly dieSize?: DamageDieSize & typeof GRANTED_AREA_SAVE_DAMAGE_DIE_SIZE;
  };
  readonly startingAtLevel: PositiveInteger &
    (typeof GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage)["startingAtLevel"];
};

type GrantedAreaSaveDamageActionMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly ability: typeof GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.ability;
  readonly dc: GrantedAreaSaveDamageActionInvocation["dc"];
  readonly rangeFeet: MovementFeet;
  readonly durationTicks: ElapsedTimeTicks;
  readonly coneLengthFeet: GrantedAreaSaveDamageActionInvocation["coneLengthFeet"];
  readonly damageTypeChoices: readonly [DamageType, ...DamageType[]];
  readonly damage: {
    readonly baseDice: GrantedAreaSaveDamageAmount["base"]["dice"];
    readonly dieSize: GrantedAreaSaveDamageAmount["base"]["dieSize"];
    readonly perSlotDice: GrantedAreaSaveDamageAmount["perLevel"]["dice"];
    readonly startingAtLevel: GrantedAreaSaveDamageAmount["startingAtLevel"];
  };
};

type GrantedAreaSaveDamageActionFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "durationValue"
  | "durationExtension"
  | "durationEnding"
  | "rootShape"
  | "attachment"
  | "phase"
  | "operationCount"
  | "operation"
  | "trigger"
  | "effect"
  | "saveAbility"
  | "saveDc"
  | "saveAttachment"
  | "cone"
  | "successOutcome"
  | "damageEffect"
  | "damageAmount"
  | "damageType"
  | "damageTypeChoices"
  | "extraOperation"
  | "authoredConditionalEffects"
  | "requiredFacts";

type GrantedAreaSaveDamageActionMechanicsIssue = SpellProcedureAdmissionIssue<
  "grantedAreaSaveDamageAction",
  GrantedAreaSaveDamageActionFailedFact,
  UnitMechanicsPath
>;

const GRANTED_AREA_SAVE_DAMAGE_FAILED_FACT_MESSAGES = {
  level: "Dragon's Breath requires a second-level spell.",
  castingTime: "Dragon's Breath requires a Bonus Action casting time.",
  range: "Dragon's Breath requires a Touch range.",
  duration: "Dragon's Breath requires one minute of concentration.",
  durationValue: "Dragon's Breath requires a one-minute concentration value.",
  durationExtension: "Dragon's Breath has an unsupported duration extension.",
  durationEnding: "Dragon's Breath has an unsupported duration ending.",
  rootShape: "Dragon's Breath has unsupported ongoing root fields.",
  attachment: "Dragon's Breath requires one willing creature target.",
  phase: "Dragon's Breath has an unsupported ongoing phase.",
  operationCount: "Dragon's Breath requires exactly one ongoing operation.",
  operation: "Dragon's Breath has an unsupported operation field.",
  trigger: "Dragon's Breath requires an attached Magic Action trigger.",
  effect: "Dragon's Breath requires one ongoing save gate.",
  saveAbility: "Dragon's Breath requires a Dexterity Saving Throw.",
  saveDc: "Dragon's Breath requires the caster's Spell Save DC.",
  saveAttachment: "Dragon's Breath requires an attached-creature Cone.",
  cone: "Dragon's Breath requires a 15-foot Cone.",
  successOutcome: "Dragon's Breath requires half damage on a successful save.",
  damageEffect: "Dragon's Breath requires damage on a failed save.",
  damageAmount: "Dragon's Breath has unsupported damage scaling.",
  damageType: "Dragon's Breath requires a damage-type choice.",
  damageTypeChoices: "Dragon's Breath has unsupported damage-type choices.",
  extraOperation: "Dragon's Breath has an unsupported additional operation.",
  authoredConditionalEffects:
    "Dragon's Breath has unsupported authored conditional effects.",
  requiredFacts: "Dragon's Breath did not retain required projected facts.",
} as const satisfies Record<GrantedAreaSaveDamageActionFailedFact, string>;

function grantedAreaSaveDamageIssue(
  failedFact: GrantedAreaSaveDamageActionFailedFact,
  mechanicsPath: UnitMechanicsPath,
): GrantedAreaSaveDamageActionMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "grantedAreaSaveDamageAction",
    failedFact,
    mechanicsPath,
    message: GRANTED_AREA_SAVE_DAMAGE_FAILED_FACT_MESSAGES[failedFact],
  };
}

function dragonDurationIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): GrantedAreaSaveDamageActionMechanicsIssue[] {
  const issues: GrantedAreaSaveDamageActionMechanicsIssue[] = [];
  const duration = mechanics.duration;
  if (duration.kind !== GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.duration.kind) {
    issues.push(
      grantedAreaSaveDamageIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    );
    return issues;
  }
  if (
    !isSpellCanonicalDurationValue(duration.upTo) ||
    duration.upTo.unit !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.duration.unit ||
    duration.upTo.amount !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.duration.amount
  ) {
    issues.push(
      grantedAreaSaveDamageIssue("durationValue", spellDurationValuePath()),
    );
  }
  for (const child of spellDurationChildCoordinates(duration)) {
    issues.push(
      grantedAreaSaveDamageIssue(
        child.branch === "extension" ? "durationExtension" : "durationEnding",
        spellDurationChildPath(child),
      ),
    );
  }
  return issues;
}

function dragonDamageTypeChoices(
  value: DamageTypeRef,
): readonly [DamageType, ...DamageType[]] | null {
  if (
    typeof value !== "object" ||
    value.kind !== "hole" ||
    typeof value.value !== "object" ||
    value.value.kind !== "choice" ||
    !spellHasOnlyNamedFields(value, ["kind", "holeId", "label", "value"]) ||
    !spellHasOnlyNamedFields(value.value, ["kind", "label", "options"])
  ) {
    return null;
  }
  return value.value.options;
}

function dragonDamageAmountSupported(
  amount: DiceAmount,
): amount is GrantedAreaSaveDamageAmount {
  if (
    amount.kind !== GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage.kind ||
    amount.axis !== GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage.axis ||
    amount.base.dice !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage.baseDice ||
    amount.base.dieSize !== GRANTED_AREA_SAVE_DAMAGE_DIE_SIZE ||
    amount.perLevel.dice !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage.perSlotDice ||
    amount.startingAtLevel !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.damage.startingAtLevel ||
    !spellHasOnlyNamedFields(amount, [
      "kind",
      "axis",
      "base",
      "perLevel",
      "startingAtLevel",
    ]) ||
    !spellHasOnlyNamedFields(amount.base, ["dice", "dieSize"]) ||
    !spellHasOnlyNamedFields(amount.perLevel, ["dice", "dieSize"]) ||
    (amount.perLevel.dieSize !== undefined &&
      amount.perLevel.dieSize !== GRANTED_AREA_SAVE_DAMAGE_DIE_SIZE)
  ) {
    return false;
  }
  return true;
}

function dragonRootAttachmentSupported(
  attachment: import("@dnd/surface/surface/types").Attachment,
): boolean {
  const result = admitSpellTargetAttachment(attachment, [
    "mode",
    "targetKinds",
    "disposition",
  ]);
  if (result.tag !== "admitted") return false;
  const selection = result.attachment.value.selection;
  return (
    selection.mode ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.attachment.mode &&
    "disposition" in selection &&
    selection.disposition ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.attachment.disposition &&
    selection.targetKinds?.length ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.attachment.targetKinds.length &&
    selection.targetKinds[0] ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.attachment.targetKinds[0]
  );
}

function dragonOngoingRootShape(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): boolean {
  const headerMatches =
    mechanics.level === GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.level &&
    mechanics.castingTime.kind ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.castingTimeKind &&
    mechanics.range.kind ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.rangeKind &&
    mechanics.duration.kind ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.duration.kind &&
    mechanics.duration.upTo.unit ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.duration.unit &&
    mechanics.duration.upTo.amount ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.duration.amount;
  const operationMatches = mechanics.operations.some(
    (operation) =>
      operation.trigger.kind ===
        GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.triggerKind &&
      operation.effect.kind ===
        GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.effectKind,
  );
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      { name: "header", present: headerMatches },
      {
        name: "rootAttachment",
        present: dragonRootAttachmentSupported(mechanics.attachment),
      },
      { name: "operation", present: operationMatches },
    ],
  });
}

function grantedAreaSaveDamageActionMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
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
    spellOngoingAttachmentPath(),
    spellOngoingOperationPath(PositiveInteger(1)),
    spellOngoingOperationEffectPath(PositiveInteger(1)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function grantedAreaSaveDamageActionInvocationsFromFacts(
  spell: BattleSpellExecutionSource,
  facts: GrantedAreaSaveDamageActionMechanicsFacts,
  actorId: CombatantId,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly GrantedAreaSaveDamageActionInvocation[] {
  return castOptions.flatMap(
    (slot): readonly GrantedAreaSaveDamageActionInvocation[] => {
      if (Number(slot.spellLevel) < Number(facts.level)) return [];
      const damageDice = PositiveInteger(
        Number(facts.damage.baseDice) +
          Math.max(
            0,
            Number(slot.spellLevel) - Number(facts.damage.startingAtLevel),
          ) *
            Number(facts.damage.perSlotDice),
      );
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "grantedAreaSaveDamageAction",
          spell,
          actionCost: GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.actionCost,
          ability: facts.ability,
          targeting: GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.targeting,
          activeEffect: {
            kind: GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.activeEffectKind,
            sourceCombatantId: actorId,
            expiresAt: {
              kind: GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.expirationKind,
              combatantId: actorId,
              durationTicks: facts.durationTicks,
            },
          },
          dc: facts.dc,
          damageTypeChoices: facts.damageTypeChoices,
          coneLengthFeet: facts.coneLengthFeet,
          damageDice,
          damageDieSize: facts.damage.dieSize,
          rangeFeet: facts.rangeFeet,
        },
      ];
    },
  );
}

function admitGrantedAreaSaveDamageActionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "grantedAreaSaveDamageAction",
  GrantedAreaSaveDamageActionMechanicsFacts,
  GrantedAreaSaveDamageActionInvocation,
  GrantedAreaSaveDamageActionMechanicsIssue
> {
  if (source.mechanics.family !== "ongoing_effect")
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  if (!dragonOngoingRootShape(mechanics)) return { tag: "notRepresented" };
  const issues: GrantedAreaSaveDamageActionMechanicsIssue[] = [];
  const push = (
    failedFact: GrantedAreaSaveDamageActionFailedFact,
    path: UnitMechanicsPath,
  ): void => {
    issues.push(grantedAreaSaveDamageIssue(failedFact, path));
  };
  if (mechanics.level !== GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.level) {
    push("level", spellMechanicsHeaderPath("level"));
  }
  if (
    mechanics.castingTime.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.castingTimeKind ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    mechanics.range.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.rangeKind ||
    !spellHasOnlyNamedFields(mechanics.range, ["kind"])
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  issues.push(...dragonDurationIssues(mechanics));
  if (
    !spellHasOnlyNamedFields(mechanics, [
      "level",
      "school",
      "range",
      "components",
      "duration",
      "castingTime",
      "family",
      "attachment",
      "initialPhase",
      "operations",
      "authoredConditionalEffects",
    ])
  ) {
    push("rootShape", spellMechanicsHeaderPath("family"));
  }
  for (const [index] of (
    mechanics.authoredConditionalEffects ?? []
  ).entries()) {
    push(
      "authoredConditionalEffects",
      spellOngoingAuthoredConditionalEffectPath(PositiveInteger(index + 1)),
    );
  }
  if (!dragonRootAttachmentSupported(mechanics.attachment)) {
    push("attachment", spellOngoingAttachmentPath());
  }
  if (mechanics.initialPhase !== undefined) {
    push("phase", spellOngoingInitialPhasePath());
  }
  if (
    mechanics.operations.length !==
    GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operationCount
  ) {
    for (const [index] of mechanics.operations.entries()) {
      if (index > 0) {
        push(
          "extraOperation",
          spellOngoingOperationPath(PositiveInteger(index + 1)),
        );
      }
    }
    if (mechanics.operations.length === 0) {
      push("operationCount", spellMechanicsRootPath());
    }
  }
  const operation = mechanics.operations[0];
  if (operation === undefined) {
    const nonEmptyIssues = spellProcedureNonEmpty(
      spellUniqueMechanicsIssues(issues),
    );
    if (nonEmptyIssues === undefined) {
      return {
        tag: "unsupported",
        issues: [
          grantedAreaSaveDamageIssue("requiredFacts", spellMechanicsRootPath()),
        ],
      };
    }
    const [first, ...rest] = nonEmptyIssues;
    return {
      tag: "unsupported",
      issues: [
        grantedAreaSaveDamageIssue(first.failedFact, first.mechanicsPath),
        ...rest.map((issue) =>
          grantedAreaSaveDamageIssue(issue.failedFact, issue.mechanicsPath),
        ),
      ],
    };
  }
  if (!spellHasOnlyNamedFields(operation, ["trigger", "effect"])) {
    push("operation", spellOngoingOperationPath(PositiveInteger(1)));
  }
  if (
    operation.trigger.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.triggerKind ||
    !spellHasOnlyNamedFields(operation.trigger, ["kind", "cost"]) ||
    operation.trigger.cost.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.costKind ||
    operation.trigger.cost.action !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.action ||
    !spellHasOnlyNamedFields(operation.trigger.cost, ["kind", "action"])
  ) {
    push("trigger", spellOngoingOperationPath(PositiveInteger(1)));
  }
  const effect = operation.effect;
  if (
    effect.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.effectKind ||
    !spellHasOnlyNamedFields(effect, [
      "kind",
      "attachment",
      "ability",
      "dc",
      "onFail",
      "onSuccess",
    ])
  ) {
    push("effect", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const saveGate =
    effect.kind === GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.effectKind
      ? effect
      : null;
  if (
    saveGate?.ability !==
    GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.ability
  ) {
    push("saveAbility", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  if (
    saveGate?.dc.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.dcKind ||
    (saveGate !== null && !spellHasOnlyNamedFields(saveGate.dc, ["kind"]))
  ) {
    push("saveDc", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const areaAdmission =
    saveGate?.attachment === undefined
      ? null
      : admitSpellAreaAttachment(saveGate.attachment, [], []);
  const areaAttachment =
    areaAdmission?.tag === "admitted" ? areaAdmission.attachment : null;
  const areaValue =
    areaAttachment === null
      ? null
      : areaAttachment.kind === "hole"
        ? areaAttachment.value
        : areaAttachment;
  if (
    areaAttachment === null ||
    areaValue === null ||
    areaValue.origin.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.areaOriginKind ||
    !spellHasOnlyNamedFields(areaValue.origin, ["kind"]) ||
    areaValue.shape.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.areaShapeKind ||
    !spellHasOnlyNamedFields(areaValue.shape, ["kind", "lengthFeet"])
  ) {
    push("saveAttachment", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const coneLengthFeet =
    areaValue?.shape.kind ===
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.areaShapeKind &&
    areaValue.shape.lengthFeet === GRANTED_AREA_SAVE_DAMAGE_CONE_LENGTH_FEET
      ? GrantedAreaSaveDamageConeLengthFeetSchema.make(
          areaValue.shape.lengthFeet,
        )
      : null;
  if (coneLengthFeet === null) {
    push("cone", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  if (
    saveGate?.onSuccess.kind !==
      GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.successKind ||
    !spellHasOnlyNamedFields(saveGate?.onSuccess ?? { kind: "none" }, ["kind"])
  ) {
    push("successOutcome", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const failedDamage =
    saveGate?.onFail.kind ===
    GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.operation.failureKind
      ? saveGate.onFail
      : null;
  if (
    failedDamage === null ||
    !spellHasOnlyNamedFields(failedDamage, ["kind", "damageType", "amount"])
  ) {
    push("damageEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const damageAmount = failedDamage?.amount;
  if (
    damageAmount === undefined ||
    !dragonDamageAmountSupported(damageAmount)
  ) {
    push("damageAmount", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const damageTypeChoices =
    failedDamage === null
      ? null
      : dragonDamageTypeChoices(failedDamage.damageType);
  if (damageTypeChoices === null) {
    push("damageType", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  if (
    damageTypeChoices === null ||
    damageTypeChoices.length !== GRANTED_AREA_SAVE_DAMAGE_TYPE_CHOICES.length ||
    GRANTED_AREA_SAVE_DAMAGE_TYPE_CHOICES.some(
      (type) => !damageTypeChoices.includes(type),
    )
  ) {
    push(
      "damageTypeChoices",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    );
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues;
    return {
      tag: "unsupported",
      issues: [
        grantedAreaSaveDamageIssue(first.failedFact, first.mechanicsPath),
        ...rest.map((issue) =>
          grantedAreaSaveDamageIssue(issue.failedFact, issue.mechanicsPath),
        ),
      ],
    };
  }
  const duration = mechanics.duration;
  if (
    coneLengthFeet === null ||
    damageAmount === undefined ||
    damageTypeChoices === null ||
    failedDamage === null ||
    !dragonDamageAmountSupported(damageAmount) ||
    saveGate === null ||
    duration.kind !== GRANTED_AREA_SAVE_DAMAGE_AUTHORED_FACTS.duration.kind ||
    !isSpellCanonicalDurationValue(duration.upTo)
  ) {
    return {
      tag: "unsupported",
      issues: [
        grantedAreaSaveDamageIssue(
          "requiredFacts",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ability: GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.ability,
    dc: saveGate.dc,
    rangeFeet: spellTouchRangeFeet(),
    durationTicks: spellDurationTicksFromCanonicalValue(duration.upTo),
    coneLengthFeet,
    damageTypeChoices,
    damage: {
      baseDice: damageAmount.base.dice,
      dieSize: damageAmount.base.dieSize,
      perSlotDice: damageAmount.perLevel.dice,
      startingAtLevel: damageAmount.startingAtLevel,
    },
  } satisfies GrantedAreaSaveDamageActionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "grantedAreaSaveDamageAction",
      facts,
      evidence: grantedAreaSaveDamageActionMechanicsEvidence(mechanics),
      admit: (executionSource: BattleSpellExecutionSource, ctx) =>
        grantedAreaSaveDamageActionInvocationsFromFacts(
          executionSource,
          facts,
          ctx.actor.combatantId,
          ctx.spellCastOptions,
        ),
    },
  };
}

function discoverGrantedAreaSaveDamageActionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<GrantedAreaSaveDamageActionInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return spellCastCandidatesForTargetHole(
    "bonusActionSpell",
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
    [spellDamageTypeChoiceHole(invocation)],
  );
}

function resolveGrantedAreaSaveDamageAction(
  input: GrantedAreaSaveDamageActionResolveInput,
): BattleResolutionResult {
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    additionalHoleIds: [spellDamageTypeChoiceHole(input.invocation).holeId],
    invalidFillMessage:
      "Granted area Save damage uses one target-list fill and one damage type choice.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const targetId = targetSelection.targetIds[0];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetId === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Granted area Save damage must target one willing creature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !input.invocation.damageTypeChoices.includes(
      input.fillSet.damageTypeChoice.value,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Granted area Save damage type must be one of the selected spell's choices.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    targetSelection.targetIds,
    { kind: GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.actionCost },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const effected = applyGrantedAreaSaveDamageActionSpellEffect(
    concentrationBase,
    input.actorId,
    targetId,
    input.fillSet.damageTypeChoice.value,
    input.invocation,
    input.input.subject.procedureRef,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

export const GrantedAreaSaveDamageActionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("grantedAreaSaveDamageAction"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal(
        GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.actionCost,
      ),
      ability: Schema.Literal(GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.ability),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal(
          GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.targeting.kind,
        ),
        minTargets: Schema.Literal(
          GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.targeting.minTargets,
        ),
        maxTargets: Schema.Literal(
          GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.targeting.maxTargets,
        ),
      }),
      activeEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal(
          GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.activeEffectKind,
        ),
        sourceCombatantId: CombatantId,
        expiresAt: Schema.Struct({
          kind: Schema.Literal(
            GRANTED_AREA_SAVE_DAMAGE_EXECUTION_FACTS.expirationKind,
          ),
          combatantId: CombatantId,
          durationTicks: ElapsedTimeTicksSchema,
        }),
      }),
      damageTypeChoices: Schema.NonEmptyArray(DamageTypeSchema),
      coneLengthFeet: GrantedAreaSaveDamageConeLengthFeetSchema,
      damageDice: PositiveIntegerSchema,
      damageDieSize: GrantedAreaSaveDamageDieSizeSchema,
      rangeFeet: MovementFeet,
    }),
  );
export const grantedAreaSaveDamageActionProfile = {
  procedure: "grantedAreaSaveDamageAction",
  executionSchema: GrantedAreaSaveDamageActionInvocationSchema,
  admitMechanics: admitGrantedAreaSaveDamageActionMechanics,
  discoverCastAct: discoverGrantedAreaSaveDamageActionCastAct,
  resolve: resolveGrantedAreaSaveDamageAction,
} satisfies SpellProcedureDeclaration<
  "grantedAreaSaveDamageAction",
  GrantedAreaSaveDamageActionInvocation
>;
