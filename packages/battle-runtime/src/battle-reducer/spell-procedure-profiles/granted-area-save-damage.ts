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
  movementFeet,
  type DamageType,
} from "@dnd/shared/types";
import type { SpellMechanics } from "@dnd/surface/surface/types";
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
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThan(0)),
  Schema.brand("Integer"),
  Schema.brand("PositiveInteger"),
);

type GrantedAreaSaveDamageActionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "grantedAreaSaveDamageAction" }
>;
type GrantedAreaSaveDamageActionResolveInput =
  SpellProcedureProfileResolveInput<GrantedAreaSaveDamageActionInvocation>;

type GrantedAreaSaveDamageActionMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly ability: "dex";
  readonly dc: GrantedAreaSaveDamageActionInvocation["dc"];
  readonly rangeFeet: MovementFeet;
  readonly durationTicks: ElapsedTimeTicks;
  readonly coneLengthFeet: MovementFeet;
  readonly damageTypeChoices: readonly [DamageType, ...DamageType[]];
  readonly damage: {
    readonly baseDice: PositiveInteger;
    readonly dieSize: PositiveInteger;
    readonly perSlotDice: PositiveInteger;
    readonly startingAtLevel: PositiveInteger;
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
  SpellMechanicsBranchPath
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
  mechanicsPath: SpellMechanicsBranchPath,
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
  if (duration.kind !== "concentration") {
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
    duration.upTo.unit !== "minute" ||
    duration.upTo.amount !== 1
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
  value: unknown,
): readonly [DamageType, ...DamageType[]] | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    value.kind !== "hole" ||
    !("value" in value) ||
    typeof value.value !== "object" ||
    value.value === null ||
    !("kind" in value.value) ||
    value.value.kind !== "choice" ||
    !("options" in value.value) ||
    !Array.isArray(value.value.options) ||
    value.value.options.length === 0 ||
    !spellHasOnlyNamedFields(value, ["kind", "holeId", "label", "value"]) ||
    !spellHasOnlyNamedFields(value.value, ["kind", "label", "options"])
  ) {
    return null;
  }
  const options = value.value.options.filter((option): option is DamageType =>
    Schema.is(DamageTypeSchema)(option),
  );
  if (options.length !== value.value.options.length) return null;
  const [first, ...rest] = options;
  return first === undefined ? null : [first, ...rest];
}

function dragonDamageAmountSupported(amount: unknown): amount is {
  readonly kind: "linear_per_level";
  readonly axis: "slot";
  readonly base: {
    readonly dice: PositiveInteger;
    readonly dieSize: PositiveInteger;
  };
  readonly perLevel: {
    readonly dice: PositiveInteger;
    readonly dieSize?: PositiveInteger;
  };
  readonly startingAtLevel: PositiveInteger;
} {
  if (
    typeof amount !== "object" ||
    amount === null ||
    !("kind" in amount) ||
    amount.kind !== "linear_per_level" ||
    !("axis" in amount) ||
    amount.axis !== "slot" ||
    !("base" in amount) ||
    !("perLevel" in amount) ||
    !("startingAtLevel" in amount) ||
    typeof amount.base !== "object" ||
    amount.base === null ||
    typeof amount.perLevel !== "object" ||
    amount.perLevel === null ||
    !("dice" in amount.base) ||
    !("dieSize" in amount.base) ||
    !("dice" in amount.perLevel) ||
    amount.base.dice !== 3 ||
    amount.base.dieSize !== 6 ||
    amount.perLevel.dice !== 1 ||
    amount.startingAtLevel !== 2 ||
    !spellHasOnlyNamedFields(amount, [
      "kind",
      "axis",
      "base",
      "perLevel",
      "startingAtLevel",
    ]) ||
    !spellHasOnlyNamedFields(amount.base, ["dice", "dieSize"]) ||
    !spellHasOnlyNamedFields(amount.perLevel, ["dice", "dieSize"]) ||
    ("dieSize" in amount.perLevel && amount.perLevel.dieSize !== 6)
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
    selection.mode === "one" &&
    "disposition" in selection &&
    selection.disposition === "willing" &&
    selection.targetKinds?.length === 1 &&
    selection.targetKinds[0] === "creature"
  );
}

function dragonOngoingRootShape(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): boolean {
  return (
    mechanics.operations.some(
      (operation) => operation.trigger.kind === "on_attached_spends_action",
    ) || dragonRootAttachmentSupported(mechanics.attachment)
  );
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
          actionCost: "bonusAction",
          ability: facts.ability,
          targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
          activeEffect: {
            kind: "grantedAreaSaveDamageAction",
            sourceCombatantId: actorId,
            expiresAt: {
              kind: "concentration",
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
    path: SpellMechanicsBranchPath,
  ): void => {
    issues.push(grantedAreaSaveDamageIssue(failedFact, path));
  };
  if (mechanics.level !== 2) push("level", spellMechanicsHeaderPath("level"));
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    mechanics.range.kind !== "touch" ||
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
  if (mechanics.operations.length !== 1) {
    for (const [index] of mechanics.operations.entries()) {
      if (index > 0) {
        push(
          "extraOperation",
          spellOngoingOperationPath(PositiveInteger(index + 1)),
        );
      }
    }
    if (mechanics.operations.length === 0) {
      push("operationCount", spellOngoingOperationPath(PositiveInteger(1)));
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
          grantedAreaSaveDamageIssue(
            "requiredFacts",
            spellOngoingOperationPath(PositiveInteger(1)),
          ),
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
    operation.trigger.kind !== "on_attached_spends_action" ||
    !spellHasOnlyNamedFields(operation.trigger, ["kind", "cost"]) ||
    operation.trigger.cost.kind !== "standard_action" ||
    operation.trigger.cost.action !== "magic" ||
    !spellHasOnlyNamedFields(operation.trigger.cost, ["kind", "action"])
  ) {
    push("trigger", spellOngoingOperationPath(PositiveInteger(1)));
  }
  const effect = operation.effect;
  if (
    effect.kind !== "save_gate" ||
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
  const saveGate = effect.kind === "save_gate" ? effect : null;
  if (saveGate?.ability !== "dex") {
    push("saveAbility", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  if (
    saveGate?.dc.kind !== "caster_spell_save_dc" ||
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
    areaValue.origin.kind !== "on_attached_creature" ||
    !spellHasOnlyNamedFields(areaValue.origin, ["kind"]) ||
    areaValue.shape.kind !== "cone" ||
    !spellHasOnlyNamedFields(areaValue.shape, ["kind", "lengthFeet"])
  ) {
    push("saveAttachment", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const coneLengthFeet =
    areaValue?.shape.kind === "cone" && areaValue.shape.lengthFeet === 15
      ? movementFeet(areaValue.shape.lengthFeet)
      : null;
  if (coneLengthFeet === null) {
    push("cone", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  if (
    saveGate?.onSuccess.kind !== "half_damage" ||
    !spellHasOnlyNamedFields(saveGate?.onSuccess ?? { kind: "none" }, ["kind"])
  ) {
    push("successOutcome", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const failedDamage =
    saveGate?.onFail.kind === "damage" ? saveGate.onFail : null;
  if (
    failedDamage === null ||
    !spellHasOnlyNamedFields(failedDamage, ["kind", "damageType", "amount"])
  ) {
    push("damageEffect", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const damageAmount = failedDamage?.amount;
  if (!dragonDamageAmountSupported(damageAmount)) {
    push("damageAmount", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const damageTypeChoices = dragonDamageTypeChoices(failedDamage?.damageType);
  if (damageTypeChoices === null) {
    push("damageType", spellOngoingOperationEffectPath(PositiveInteger(1)));
  }
  const expectedDamageTypes = [
    "acid",
    "cold",
    "fire",
    "lightning",
    "poison",
  ] as const;
  if (
    damageTypeChoices === null ||
    damageTypeChoices.length !== expectedDamageTypes.length ||
    expectedDamageTypes.some((type) => !damageTypeChoices.includes(type))
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
    duration.kind !== "concentration" ||
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
    ability: "dex" as const,
    dc: saveGate.dc,
    rangeFeet: spellTouchRangeFeet(),
    durationTicks: spellDurationTicksFromCanonicalValue(duration.upTo),
    coneLengthFeet,
    damageTypeChoices,
    damage: {
      baseDice: PositiveInteger(damageAmount.base.dice),
      dieSize: PositiveInteger(damageAmount.base.dieSize),
      perSlotDice: PositiveInteger(damageAmount.perLevel.dice),
      startingAtLevel: PositiveInteger(damageAmount.startingAtLevel),
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
    { kind: "bonusAction" },
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
      actionCost: Schema.Literal("bonusAction"),
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
      }),
      activeEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("grantedAreaSaveDamageAction"),
        sourceCombatantId: CombatantId,
        expiresAt: Schema.Struct({
          kind: Schema.Literal("concentration"),
          combatantId: CombatantId,
          durationTicks: ElapsedTimeTicksSchema,
        }),
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      coneLengthFeet: MovementFeet,
      damageDice: PositiveIntegerSchema,
      damageDieSize: PositiveIntegerSchema,
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
