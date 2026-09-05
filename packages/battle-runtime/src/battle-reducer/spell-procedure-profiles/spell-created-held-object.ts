import {
  maybeOpenConfiguredSpellCastReactionWindow,
  spendConfiguredSpellCastResources,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import {
  actionSpellCastCandidatesForTargetHole,
  spellCastCandidate,
} from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE
//
// The spellCreatedHeldObject profile family: a prepared Bonus Action spell
// creates a spell effect held in the caster's free hand, the held object can be
// used for a Magic Action melee Spell Attack, and the same spell effect can be
// re-evoked with a Bonus Action after the caster lets it go.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Flame Blade":
//     Bonus Action; Self; Concentration up to 10 minutes; evoke a fiery blade
//     in a free hand; disappears when let go; can be evoked again as a Bonus
//     Action; Magic Action melee Spell Attack; Fire damage equal to 3d6 plus
//     spellcasting ability modifier; sheds Bright and Dim Light; higher-level
//     slots add 1d6 damage.
//   - UBIQUITOUS_LANGUAGE.md: Free Hand, Holding / Wielding, Magic Action,
//     Spell Attack, Spell Slot, Spell Invocation, and Spell Effect.
//
// What stays in shared infrastructure:
//   - The active-effect state transitions and light projection stay in
//     spells-active-effects.ts.
//   - The Magic Action spell attack damage lifecycle stays in the shared
//     spell attack resolver because held-light hurls, spell-created held-object
//     attacks, spiritual weapon attacks, object-contact repeats, and ordinary
//     spell attacks share target, attack-roll, damage, reaction, and reduction
//     flow.
//   - The release runtime command remains outside this profile because it is a
//     command over an existing Spell Effect, not a Spell Invocation.

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import {
  attackBonus,
  movementFeet,
  PositiveInteger,
  type AbilityModifier,
  type MovementFeet as MovementFeetType,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationChildPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { Match, Result, Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type SpellCreatedHeldObjectActiveEffect,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../../identity.ts";
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { allocateBattleEffectExecutionRef } from "../../effect-execution-ref.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { spellCreatedHeldObjectHasFreeHand } from "../spell-created-held-object.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import { resolveSpellAttackDamageAct } from "../spells-resolve.ts";
import type { SpellProcedureExecutionRegistry } from "./execution-registry.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET } from "../domain-constants.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
  SynthesizedSpellProcedureDeclaration,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationTicksFromCanonicalValue,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  AttackBonus,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellEffectSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  applySpellCreatedHeldObjectEffect,
  setSpellCreatedHeldObjectState,
} from "../spells-active-effects.ts";

type SpellCreatedHeldObjectInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObject" }
>;

const SpellCreatedHeldObjectTemplateSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("spellCreatedHeldObject"),
  sourceCombatantId: CombatantId,
  objectState: Schema.Struct({ kind: Schema.Literal("held") }),
  light: Schema.Struct({
    brightRadiusFeet: MovementFeet,
    dimAdditionalFeet: MovementFeet,
  }),
  attack: Schema.Struct({
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    attackKind: Schema.Literal("melee_spell_attack"),
    attackBonus: AttackBonus,
  }),
  expiresAt: Schema.Struct({
    kind: Schema.Literal("concentration"),
    combatantId: CombatantId,
    durationTicks: ElapsedTimeTicksSchema,
  }),
});

type SpellCreatedHeldObjectAttackInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObjectAttack" }
>;
type SpellCreatedHeldObjectReEvokeInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObjectReEvoke" }
>;
type OngoingEffectSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type OngoingEffectInitialEffect = NonNullable<
  Extract<
    NonNullable<OngoingEffectSpellMechanics["initialPhase"]>,
    { readonly kind: "direct" }
  >["effects"]
>[number];
type SpellCreatedHeldObjectEffect = Extract<
  OngoingEffectInitialEffect,
  { readonly kind: "spell_created_held_object" }
>;
type SpellCreatedHeldObjectAttackOperation =
  OngoingEffectSpellMechanics["operations"][number] & {
    readonly effect: Extract<
      OngoingEffectSpellMechanics["operations"][number]["effect"],
      { readonly kind: "attack_roll" }
    >;
  };
type SpellCreatedHeldObjectLightOperation =
  OngoingEffectSpellMechanics["operations"][number] & {
    readonly effect: Extract<
      OngoingEffectSpellMechanics["operations"][number]["effect"],
      { readonly kind: "emit_bright_and_dim_illumination" }
    >;
  };

const SPELL_CREATED_HELD_OBJECT_DURATION_MINUTES_VALUE = 10;
type SpellCreatedHeldObjectDurationMinutes = PositiveInteger &
  typeof SPELL_CREATED_HELD_OBJECT_DURATION_MINUTES_VALUE;
type SpellCreatedHeldObjectDuration = {
  readonly kind: "concentration";
  readonly upTo: SpellCanonicalDurationValue & {
    readonly amount: SpellCreatedHeldObjectDurationMinutes;
    readonly unit: "minute";
  };
};
type SpellCreatedHeldObjectFacts =
  SpellMechanicsAdmissionSource["spellDefinitionRuleFacts"] & {
    readonly level: 2;
    readonly duration: SpellCreatedHeldObjectDuration;
    readonly light: {
      readonly brightRadiusFeet: MovementFeetType;
      readonly dimAdditionalFeet: MovementFeetType;
    };
    readonly attack: {
      readonly attackKind: "melee_spell_attack";
      readonly rangeFeet: MovementFeetType;
      readonly damageType: "fire";
      readonly baseDice: 3;
      readonly dieSize: 6;
      readonly additionalDicePerSlotLevel: 1;
      readonly scalingStartsAtLevel: 2;
    };
  };

const SPELL_CREATED_HELD_OBJECT_LEVEL = 2;
const SPELL_CREATED_HELD_OBJECT_DURATION_MINUTES = PositiveInteger(
  SPELL_CREATED_HELD_OBJECT_DURATION_MINUTES_VALUE,
);
const SPELL_CREATED_HELD_OBJECT_BRIGHT_RADIUS_FEET = 10;
const SPELL_CREATED_HELD_OBJECT_DIM_ADDITIONAL_FEET = 10;
const SPELL_CREATED_HELD_OBJECT_BASE_DAMAGE_DICE = 3;
const SPELL_CREATED_HELD_OBJECT_DAMAGE_DIE_SIZE = 6;
const SPELL_CREATED_HELD_OBJECT_ADDITIONAL_DICE_PER_SLOT_LEVEL = 1;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for SpellCreatedHeldObjectFailedFact.
const SPELL_CREATED_HELD_OBJECT_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "attachment",
  "initialPhase",
  "heldObjectLifecycle",
  "operationCount",
  "illuminationOperation",
  "attackOperation",
  "attackDamage",
  "attackDisposition",
  "authoredConditionalMechanics",
] as const;
type SpellCreatedHeldObjectFailedFact =
  (typeof SPELL_CREATED_HELD_OBJECT_FAILED_FACTS)[number];
type SpellCreatedHeldObjectIssue = SpellProcedureAdmissionIssue<
  "spellCreatedHeldObject",
  SpellCreatedHeldObjectFailedFact,
  UnitMechanicsPath
>;

const ROOT_FIELDS = [
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
  "authoredConditionalMechanics",
] as const satisfies ReadonlyArray<keyof OngoingEffectSpellMechanics>;
const KIND_FIELDS = ["kind"] as const;
const COMPONENT_FIELDS = ["v", "s", "m"] as const;
const DURATION_FIELDS = ["kind", "upTo"] as const;
const DURATION_VALUE_FIELDS = ["amount", "unit"] as const;
const INITIAL_PHASE_FIELDS = ["kind", "attachment", "effects"] as const;
const HELD_OBJECT_FIELDS = [
  "kind",
  "heldBy",
  "requirements",
  "disappearsWhen",
  "reEvoke",
] as const;
const RE_EVOKE_FIELDS = ["cost", "requirements"] as const;
const OPERATION_FIELDS = ["trigger", "predicate", "effect"] as const;
const PREDICATE_FIELDS = ["kind"] as const;
const ATTACK_TRIGGER_FIELDS = ["kind", "cost"] as const;
const ATTACK_COST_FIELDS = ["kind", "action"] as const;
const LIGHT_EFFECT_FIELDS = [
  "kind",
  "brightRadiusFeet",
  "dimAdditionalFeet",
] as const;
const ATTACK_EFFECT_FIELDS = ["kind", "attackKind", "onHit", "onMiss"] as const;
const DAMAGE_EFFECT_FIELDS = ["kind", "damageType", "amount"] as const;
const DAMAGE_AMOUNT_FIELDS = [
  "kind",
  "axis",
  "startingAtLevel",
  "base",
  "perLevel",
] as const;
const BASE_DAMAGE_FIELDS = ["dice", "dieSize", "spellcastingMod"] as const;
const PER_LEVEL_DAMAGE_FIELDS = ["dice", "dieSize"] as const;

function spellCreatedHeldObjectIssue(
  failedFact: SpellCreatedHeldObjectFailedFact,
  mechanicsPath: UnitMechanicsPath,
): SpellCreatedHeldObjectIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "spellCreatedHeldObject",
    failedFact,
    mechanicsPath,
    message: `Unsupported spellCreatedHeldObject mechanics fact: ${failedFact}.`,
  };
}

function spellCreatedHeldObjectRepresentation(
  mechanics: SpellMechanics,
): mechanics is OngoingEffectSpellMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "ongoing_effect" }, (ongoing) => {
      const initialEffects =
        ongoing.initialPhase?.kind === "direct"
          ? (ongoing.initialPhase.effects ?? [])
          : [];
      return spellProcedureHasRedundantSignature({
        kind: "oneOfFiveWitnessesMayBeMissing",
        witnesses: [
          {
            name: "spellEnvelope",
            present:
              ongoing.level === SPELL_CREATED_HELD_OBJECT_LEVEL &&
              ongoing.school === "evocation" &&
              ongoing.castingTime.kind === "bonus_action" &&
              ongoing.range.kind === "self",
          },
          {
            name: "durationAndAttachment",
            present:
              ongoing.duration.kind === "concentration" &&
              ongoing.duration.upTo.amount ===
                SPELL_CREATED_HELD_OBJECT_DURATION_MINUTES &&
              ongoing.duration.upTo.unit === "minute" &&
              ongoing.attachment.kind === "self",
          },
          {
            name: "heldObjectLifecycle",
            present: initialEffects.some(
              (effect) => effect.kind === "spell_created_held_object",
            ),
          },
          {
            name: "illumination",
            present: ongoing.operations.some(
              (operation) =>
                operation.effect.kind === "emit_bright_and_dim_illumination",
            ),
          },
          {
            name: "heldObjectAttack",
            present: ongoing.operations.some(
              (operation) => operation.effect.kind === "attack_roll",
            ),
          },
        ],
      });
    }),
    Match.whenOr(
      { family: "activation" },
      { family: "modal_ongoing_effect" },
      { family: "modal_activation" },
      { family: "triggered_reaction" },
      { family: "passive_hit_intercept" },
      { family: "anchored_trigger" },
      { family: "magic_circle_ward" },
      { family: "stone_merge" },
      { family: "glyph_warding" },
      { family: "spawned_creature" },
      { family: "reanimated_creature" },
      { family: "templated_multi_spawn" },
      { family: "object_repair" },
      { family: "minor_magic_effect_menu" },
      () => false,
    ),
    Match.exhaustive,
  );
}

function spellCreatedHeldObjectDuration(
  mechanics: OngoingEffectSpellMechanics,
): SpellCreatedHeldObjectDuration | undefined {
  const duration = mechanics.duration;
  if (
    duration.kind !== "concentration" ||
    !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS) ||
    !spellMechanicsObjectHasOnlyKeys(duration.upTo, DURATION_VALUE_FIELDS) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    duration.upTo.unit !== "minute" ||
    !isSpellCreatedHeldObjectDurationMinutes(duration.upTo.amount)
  )
    return undefined;
  return {
    kind: duration.kind,
    upTo: {
      amount: duration.upTo.amount,
      unit: duration.upTo.unit,
    },
  };
}

function isSpellCreatedHeldObjectDurationMinutes(
  amount: PositiveInteger,
): amount is SpellCreatedHeldObjectDurationMinutes {
  return amount === SPELL_CREATED_HELD_OBJECT_DURATION_MINUTES;
}

function spellCreatedHeldObjectInitialEffectIsSupported(
  effect: SpellCreatedHeldObjectEffect,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(effect, HELD_OBJECT_FIELDS) &&
    effect.requirements.length === 1 &&
    effect.disappearsWhen.length === 1 &&
    spellCreatedHeldObjectLifecycleIsSupported(effect) &&
    spellMechanicsObjectHasOnlyKeys(effect.reEvoke, RE_EVOKE_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(effect.reEvoke.cost, KIND_FIELDS) &&
    effect.reEvoke.requirements.length === 1
  );
}

function spellCreatedHeldObjectOperationShellIsSupported(
  operation:
    | SpellCreatedHeldObjectLightOperation
    | SpellCreatedHeldObjectAttackOperation,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(operation, OPERATION_FIELDS) &&
    operation.predicate?.kind === "spell_created_held_object_active" &&
    spellMechanicsObjectHasOnlyKeys(operation.predicate, PREDICATE_FIELDS)
  );
}

function spellCreatedHeldObjectLightOperationIsSupported(
  operation: SpellCreatedHeldObjectLightOperation,
): boolean {
  return (
    spellCreatedHeldObjectOperationShellIsSupported(operation) &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(operation.trigger, KIND_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(operation.effect, LIGHT_EFFECT_FIELDS) &&
    operation.effect.brightRadiusFeet ===
      SPELL_CREATED_HELD_OBJECT_BRIGHT_RADIUS_FEET &&
    operation.effect.dimAdditionalFeet ===
      SPELL_CREATED_HELD_OBJECT_DIM_ADDITIONAL_FEET
  );
}

function spellCreatedHeldObjectAttackOperationShellIsSupported(
  operation: SpellCreatedHeldObjectAttackOperation,
): boolean {
  return (
    spellCreatedHeldObjectOperationShellIsSupported(operation) &&
    operation.trigger.kind === "on_caster_spends_action" &&
    spellMechanicsObjectHasOnlyKeys(operation.trigger, ATTACK_TRIGGER_FIELDS) &&
    operation.trigger.cost?.kind === "standard_action" &&
    operation.trigger.cost.action === "magic" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger.cost,
      ATTACK_COST_FIELDS,
    ) &&
    operation.effect.attackKind === "melee_spell_attack" &&
    spellMechanicsObjectHasOnlyKeys(operation.effect, ATTACK_EFFECT_FIELDS)
  );
}

function isSpellCreatedHeldObjectLightOperation(
  operation: OngoingEffectSpellMechanics["operations"][number],
): operation is SpellCreatedHeldObjectLightOperation {
  return operation.effect.kind === "emit_bright_and_dim_illumination";
}

function isSpellCreatedHeldObjectAttackOperation(
  operation: OngoingEffectSpellMechanics["operations"][number],
): operation is SpellCreatedHeldObjectAttackOperation {
  return operation.effect.kind === "attack_roll";
}

function spellCreatedHeldObjectMechanicsEvidence(
  mechanics: OngoingEffectSpellMechanics,
): SpellProcedureMechanicsEvidence {
  return {
    consumed: [
      spellMechanicsHeaderPath("level"),
      spellMechanicsHeaderPath("school"),
      spellMechanicsHeaderPath("range"),
      spellMechanicsHeaderPath("components"),
      spellMechanicsHeaderPath("duration"),
      spellMechanicsHeaderPath("castingTime"),
      spellMechanicsHeaderPath("family"),
      spellDurationValuePath(),
      spellOngoingAttachmentPath(),
      spellOngoingInitialPhasePath(),
      ...mechanics.operations.flatMap((_operation, index) => [
        spellOngoingOperationPath(PositiveInteger(index + 1)),
        spellOngoingOperationEffectPath(PositiveInteger(index + 1)),
      ]),
      ...spellConsumedMaterialEvidencePaths(mechanics.components),
    ],
    unowned: [],
  };
}

function admitSpellCreatedHeldObjectMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "spellCreatedHeldObject",
  SpellCreatedHeldObjectFacts,
  SpellCreatedHeldObjectInvocation,
  SpellCreatedHeldObjectIssue
> {
  if (!spellCreatedHeldObjectRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: SpellCreatedHeldObjectFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const push = (
    failedFact: SpellCreatedHeldObjectFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== SPELL_CREATED_HELD_OBJECT_LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "evocation")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, KIND_FIELDS)
  )
    push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, COMPONENT_FIELDS)
  )
    push("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    push("components", path);
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, KIND_FIELDS)
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (
    mechanics.attachment.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.attachment, KIND_FIELDS)
  )
    push("attachment", spellOngoingAttachmentPath());

  const duration = spellCreatedHeldObjectDuration(mechanics);
  if (mechanics.duration.kind !== "concentration")
    push("duration", spellMechanicsHeaderPath("duration"));
  else if (duration === undefined)
    push("durationValue", spellDurationValuePath());
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    push(spellDurationChildFailedFact(child), spellDurationChildPath(child));

  const initialPhase = mechanics.initialPhase;
  const initialEffects =
    initialPhase?.kind === "direct" ? (initialPhase.effects ?? []) : [];
  const heldObjectEffects = initialEffects.filter(
    (effect): effect is SpellCreatedHeldObjectEffect =>
      effect.kind === "spell_created_held_object",
  );
  if (
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(initialPhase, INITIAL_PHASE_FIELDS) ||
    !spellMechanicsObjectHasOnlyKeys(initialPhase.attachment, KIND_FIELDS)
  )
    push("initialPhase", spellOngoingInitialPhasePath());
  if (
    initialEffects.length !== 1 ||
    heldObjectEffects.length !== 1 ||
    heldObjectEffects[0] === undefined ||
    !spellCreatedHeldObjectInitialEffectIsSupported(heldObjectEffects[0])
  )
    push("heldObjectLifecycle", spellOngoingInitialPhasePath());

  const lightOperations = mechanics.operations.flatMap((operation, index) =>
    isSpellCreatedHeldObjectLightOperation(operation)
      ? [
          {
            operation,
            ordinal: PositiveInteger(index + 1),
          },
        ]
      : [],
  );
  const attackOperations = mechanics.operations.flatMap((operation, index) =>
    isSpellCreatedHeldObjectAttackOperation(operation)
      ? [
          {
            operation,
            ordinal: PositiveInteger(index + 1),
          },
        ]
      : [],
  );
  for (const [index, operation] of mechanics.operations.entries())
    if (
      operation.effect.kind !== "emit_bright_and_dim_illumination" &&
      operation.effect.kind !== "attack_roll"
    )
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
  for (const duplicate of [
    ...lightOperations.slice(1),
    ...attackOperations.slice(1),
  ])
    push("operationCount", spellOngoingOperationPath(duplicate.ordinal));
  if (mechanics.operations.length < 2)
    for (
      let ordinal = mechanics.operations.length + 1;
      ordinal <= 2;
      ordinal += 1
    )
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(ordinal)),
      );

  const light = lightOperations[0];
  if (light === undefined)
    push(
      "illuminationOperation",
      spellOngoingOperationEffectPath(
        PositiveInteger(mechanics.operations.length + 1),
      ),
    );
  else if (!spellCreatedHeldObjectLightOperationIsSupported(light.operation))
    push("illuminationOperation", spellOngoingOperationPath(light.ordinal));

  const attack = attackOperations[0];
  if (attack === undefined)
    push(
      "attackOperation",
      spellOngoingOperationEffectPath(
        PositiveInteger(mechanics.operations.length + 1),
      ),
    );
  else {
    if (
      !spellCreatedHeldObjectAttackOperationShellIsSupported(attack.operation)
    )
      push("attackOperation", spellOngoingOperationPath(attack.ordinal));
    if (!spellCreatedHeldObjectDamageIsSupported(attack.operation))
      push("attackDamage", spellOngoingOperationEffectPath(attack.ordinal));
    const miss = attack.operation.effect.onMiss[0];
    if (
      attack.operation.effect.onMiss.length !== 1 ||
      miss?.kind !== "none" ||
      !spellMechanicsObjectHasOnlyKeys(miss, KIND_FIELDS)
    )
      push(
        "attackDisposition",
        spellOngoingOperationEffectPath(attack.ordinal),
      );
  }
  for (const [index] of (
    mechanics.authoredConditionalMechanics ?? []
  ).entries())
    push(
      "authoredConditionalMechanics",
      spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
    );

  const failures = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (failures !== undefined)
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          spellCreatedHeldObjectIssue(failedFact, mechanicsPath),
      ),
    };
  if (duration === undefined)
    return {
      tag: "unsupported",
      issues: [
        spellCreatedHeldObjectIssue("durationValue", spellDurationValuePath()),
      ],
    };
  const facts = {
    ...source.spellDefinitionRuleFacts,
    level: SPELL_CREATED_HELD_OBJECT_LEVEL,
    duration,
    light: {
      brightRadiusFeet: movementFeet(
        SPELL_CREATED_HELD_OBJECT_BRIGHT_RADIUS_FEET,
      ),
      dimAdditionalFeet: movementFeet(
        SPELL_CREATED_HELD_OBJECT_DIM_ADDITIONAL_FEET,
      ),
    },
    attack: {
      attackKind: "melee_spell_attack",
      rangeFeet: SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET,
      damageType: "fire",
      baseDice: SPELL_CREATED_HELD_OBJECT_BASE_DAMAGE_DICE,
      dieSize: SPELL_CREATED_HELD_OBJECT_DAMAGE_DIE_SIZE,
      additionalDicePerSlotLevel:
        SPELL_CREATED_HELD_OBJECT_ADDITIONAL_DICE_PER_SLOT_LEVEL,
      scalingStartsAtLevel: SPELL_CREATED_HELD_OBJECT_LEVEL,
    },
  } satisfies SpellCreatedHeldObjectFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "spellCreatedHeldObject",
      facts,
      evidence: spellCreatedHeldObjectMechanicsEvidence(mechanics),
      admit: (executionSource, context) =>
        admitSpellCreatedHeldObject(executionSource, context, facts),
    },
  };
}

type SpellCreatedHeldObjectResolveInput =
  SpellProcedureProfileResolveInput<SpellCreatedHeldObjectInvocation>;
type SpellCreatedHeldObjectAttackResolveInput =
  SpellProcedureProfileResolveInput<SpellCreatedHeldObjectAttackInvocation>;
type SpellCreatedHeldObjectReEvokeResolveInput =
  SpellProcedureProfileResolveInput<SpellCreatedHeldObjectReEvokeInvocation>;

function admitSpellCreatedHeldObject(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SpellCreatedHeldObjectFacts,
): readonly SpellCreatedHeldObjectInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SpellCreatedHeldObjectInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) {
        return [];
      }
      const activeEffect = spellCreatedHeldObjectActiveEffectProjection({
        actorId: ctx.actor.combatantId,
        facts,
        slotLevel: slot.spellLevel,
        spellcastingAbilityModifier: ctx.castingSource.abilityModifier,
        proficiencyBonus: spellcasting.proficiencyBonus,
      });
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "spellCreatedHeldObject",
          spell,
          actionCost: "bonusAction",
          activeEffect,
        },
      ];
    },
  );
}

function spellCreatedHeldObjectActiveEffectProjection(input: {
  readonly actorId: CombatantId;
  readonly facts: SpellCreatedHeldObjectFacts;
  readonly slotLevel: SpellSlotLevel;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
}): Omit<
  SpellCreatedHeldObjectActiveEffect,
  "effectRef" | "sourceProcedureRef"
> & { readonly objectState: { readonly kind: "held" } } {
  const slotDelta = Math.max(
    0,
    Number(input.slotLevel) - input.facts.attack.scalingStartsAtLevel,
  );
  return {
    kind: "spellCreatedHeldObject",
    sourceCombatantId: input.actorId,
    objectState: { kind: "held" },
    light: input.facts.light,
    attack: {
      damage: {
        expr: {
          dice:
            input.facts.attack.baseDice +
            input.facts.attack.additionalDicePerSlotLevel * slotDelta,
          dieSize: input.facts.attack.dieSize,
          flat: Number(input.spellcastingAbilityModifier),
        },
        damageType: input.facts.attack.damageType,
      },
      attackKind: input.facts.attack.attackKind,
      attackBonus: attackBonus(
        Number(input.spellcastingAbilityModifier) +
          Number(input.proficiencyBonus),
      ),
    },
    expiresAt: {
      kind: "concentration",
      combatantId: input.actorId,
      durationTicks: spellDurationTicksFromCanonicalValue(
        input.facts.duration.upTo,
      ),
    },
  };
}

function spellCreatedHeldObjectLifecycleIsSupported(
  effect: SpellCreatedHeldObjectEffect,
): boolean {
  return (
    effect.heldBy === "caster" &&
    sameStringSet(effect.requirements, ["free_hand"]) &&
    sameStringSet(effect.disappearsWhen, ["caster_lets_go"]) &&
    effect.reEvoke.cost.kind === "bonus_action" &&
    sameStringSet(effect.reEvoke.requirements, ["free_hand"])
  );
}

function spellCreatedHeldObjectDamageIsSupported(
  operation: SpellCreatedHeldObjectAttackOperation,
): boolean {
  const damage = operation.effect.onHit[0];
  if (
    operation.effect.onHit.length !== 1 ||
    damage?.kind !== "damage" ||
    damage.damageType !== "fire" ||
    damage.amount?.kind !== "linear_per_level" ||
    damage.amount.axis !== "slot" ||
    damage.amount.startingAtLevel !== SPELL_CREATED_HELD_OBJECT_LEVEL ||
    damage.amount.base.dice !== SPELL_CREATED_HELD_OBJECT_BASE_DAMAGE_DICE ||
    damage.amount.base.dieSize !== SPELL_CREATED_HELD_OBJECT_DAMAGE_DIE_SIZE ||
    damage.amount.base.spellcastingMod !== true ||
    damage.amount.perLevel?.dice !==
      SPELL_CREATED_HELD_OBJECT_ADDITIONAL_DICE_PER_SLOT_LEVEL ||
    damage.amount.perLevel.dieSize !== SPELL_CREATED_HELD_OBJECT_DAMAGE_DIE_SIZE
  )
    return false;
  return (
    spellMechanicsObjectHasOnlyKeys(damage, DAMAGE_EFFECT_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(damage.amount, DAMAGE_AMOUNT_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(damage.amount.base, BASE_DAMAGE_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(
      damage.amount.perLevel,
      PER_LEVEL_DAMAGE_FIELDS,
    )
  );
}

function discoverSpellCreatedHeldObjectCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SpellCreatedHeldObjectInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return [];
  }
  return [
    spellCastCandidate(
      "bonusActionSpell",
      actorId,
      invocation.sourceProcedureRef,
      [],
    ),
  ];
}

function discoverSpellCreatedHeldObjectAttackCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SpellCreatedHeldObjectAttackInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const effect = state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (candidate): candidate is SpellCreatedHeldObjectActiveEffect =>
        candidate.kind === "spellCreatedHeldObject" &&
        candidate.effectRef === invocation.sourceEffectRef &&
        candidate.sourceProcedureRef ===
          invocation.sourceHeldObjectProcedureRef &&
        candidate.sourceCombatantId === actorId,
    );
  if (effect?.objectState.kind !== "held") return [];
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function discoverSpellCreatedHeldObjectReEvokeCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SpellCreatedHeldObjectReEvokeInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return [];
  }
  const effect = state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (candidate): candidate is SpellCreatedHeldObjectActiveEffect =>
        candidate.kind === "spellCreatedHeldObject" &&
        candidate.effectRef === invocation.sourceEffectRef &&
        candidate.sourceProcedureRef ===
          invocation.sourceHeldObjectProcedureRef &&
        candidate.sourceCombatantId === actorId,
    );
  if (effect?.objectState.kind !== "notHeld") return [];
  return [
    spellCastCandidate(
      "bonusActionSpell",
      actorId,
      invocation.sourceProcedureRef,
      [],
    ),
  ];
}

function resolveSpellCreatedHeldObject(
  input: SpellCreatedHeldObjectResolveInput,
): BattleResolutionResult {
  const handStateError = spellCreatedHeldObjectHandStateError(
    input.input.state,
    input.actorId,
    input.input.fills,
    {
      allowSpellCastReactionFacts: true,
      unrelatedFillsMessage:
        "Spell-created held object creation only accepts spell-cast Reaction facts.",
    },
  );
  if (handStateError !== null) {
    return invalidResult(
      input.input.state,
      handStateError.reason,
      handStateError.message,
    );
  }
  const resolution = { ...input, actionCostOverride: "bonusAction" as const };
  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution,
    targetIds: [input.actorId],
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }
  const resourced = spendConfiguredSpellCastResources({
    resolution,
    state: input.input.state,
  });
  /* v8 ignore start -- @preserve -- The dispatcher rechecks the stored Bonus Action subject against current turn and slot resources before invoking this profile; this fallback preserves the shared resource-spender contract. */
  if (resourced.tag === "invalid") {
    return resourced;
  }
  /* v8 ignore stop -- @preserve */
  const allocation = allocateBattleEffectExecutionRef({
    state: resourced.state,
    ownerId: input.actorId,
  });
  /* v8 ignore start -- @preserve -- Resource spending cannot remove combatants, and dispatcher admission established this actor immediately before resolution; allocation retains a typed failure for callers without that proof. */
  if (allocation.tag === "ownerNotFound") {
    return invalidResult(
      resourced.state,
      "staleSubject",
      "Held-object effect owner is no longer in the battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effected = applySpellCreatedHeldObjectEffect({
    state: allocation.state,
    actorId: input.actorId,
    activeEffect: {
      ...input.invocation.activeEffect,
      sourceProcedureRef: input.input.subject.procedureRef,
      effectRef: allocation.effectRef,
    },
    sourceExecution: input.invocation,
  });
  /* v8 ignore start -- @preserve -- The hand-state check above proves the actor and free hand, while this admitted spell procedure proves a character owner; resource spending and effect-ref allocation preserve all three facts. */
  if (effected.tag === "invalid") {
    return invalidResult(input.input.state, "staleSubject", effected.message);
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "resolved",
    state: effected.state,
    snapshot: snapshotBattle(effected.state),
  };
}

function resolveSpellCreatedHeldObjectAttack(
  input: SpellCreatedHeldObjectAttackResolveInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.reactionSpellTargetFacts.length > 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell-created held object attacks are not spell casts and do not accept spell-cast Reaction facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return resolveSpellAttackDamageAct(input, executionRegistry);
}

function resolveSpellCreatedHeldObjectReEvoke(
  input: SpellCreatedHeldObjectReEvokeResolveInput,
): BattleResolutionResult {
  const handStateError = spellCreatedHeldObjectHandStateError(
    input.input.state,
    input.actorId,
    input.input.fills,
    {
      allowSpellCastReactionFacts: false,
      unrelatedFillsMessage:
        "Spell-created held object re-evocation does not accept fills.",
    },
  );
  if (handStateError !== null) {
    return invalidResult(
      input.input.state,
      handStateError.reason,
      handStateError.message,
    );
  }
  const actor = input.input.state.combatants.get(input.actorId);
  const activeEffect = actor?.activeEffects.find(
    (effect): effect is SpellCreatedHeldObjectActiveEffect =>
      effect.kind === "spellCreatedHeldObject" &&
      effect.effectRef === input.invocation.sourceEffectRef &&
      effect.sourceProcedureRef ===
        input.invocation.sourceHeldObjectProcedureRef &&
      effect.sourceCombatantId === input.actorId,
  );
  if (
    activeEffect === undefined ||
    activeEffect.objectState.kind !== "notHeld"
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Spell-created held object can no longer be re-evoked.",
    );
  }
  const spent = spendActivationResource(
    input.input.state.currentTurnResources,
    {
      kind: "bonusAction",
    },
  );
  /* v8 ignore start -- @preserve -- The dispatcher rechecks the stored Bonus Action subject before invoking this synthesized profile; this fallback keeps direct callers of the action-economy operation total. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell-created held object re-evocation is no longer available.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const reEvoked = setSpellCreatedHeldObjectState({
    state: { ...input.input.state, currentTurnResources: spent.success },
    actorId: input.actorId,
    effect: activeEffect,
    objectState: { kind: "held" },
  });
  /* v8 ignore start -- @preserve -- The checks above prove the actor, matching not-held effect, and free hand that setSpellCreatedHeldObjectState requires; spending a Bonus Action changes none of those facts. */
  if (reEvoked.tag === "invalid") {
    return invalidResult(input.input.state, "staleSubject", reEvoked.message);
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "resolved",
    state: reEvoked.state,
    snapshot: snapshotBattle(reEvoked.state),
  };
}

function spellCreatedHeldObjectHandStateError(
  state: BattleState,
  actorId: CombatantId,
  fills: readonly BattleFill[],
  options: {
    readonly allowSpellCastReactionFacts: boolean;
    readonly unrelatedFillsMessage: string;
  },
): {
  readonly reason: "invalidFill" | "staleSubject";
  readonly message: string;
} | null {
  /* v8 ignore start -- @preserve -- Replay validation rejects fills that do not correspond to the discovered cast holes before dispatch reaches this profile. */
  if (
    options.allowSpellCastReactionFacts
      ? !fillsBelongToSpellCastHoles(fills)
      : fills.length > 0
  ) {
    return { reason: "invalidFill", message: options.unrelatedFillsMessage };
  }
  /* v8 ignore stop -- @preserve */
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return {
      reason: "staleSubject",
      message: "Spell-created held object requires a free hand.",
    };
  }
  return null;
}

const SpellCreatedHeldObjectInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("spellCreatedHeldObject"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    activeEffect: SpellCreatedHeldObjectTemplateSchema,
  }),
);

const SpellCreatedHeldObjectAttackInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: SpellEffectSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellCreatedHeldObjectAttack"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack"),
      attackBonus: AttackBonus,
      sourceEffectRef: BattleEffectExecutionRef,
      sourceHeldObjectProcedureRef: BattleProcedureExecutionRef,
    }),
  );

const SpellCreatedHeldObjectReEvokeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: SpellEffectSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellCreatedHeldObjectReEvoke"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      sourceEffectRef: BattleEffectExecutionRef,
      sourceHeldObjectProcedureRef: BattleProcedureExecutionRef,
    }),
  );
export const spellCreatedHeldObjectProfile: SpellProcedureDeclaration<
  "spellCreatedHeldObject",
  SpellCreatedHeldObjectInvocation,
  SpellCreatedHeldObjectFacts,
  SpellCreatedHeldObjectIssue
> = {
  procedure: "spellCreatedHeldObject",
  executionSchema: SpellCreatedHeldObjectInvocationSchema,
  admitMechanics: admitSpellCreatedHeldObjectMechanics,
  discoverCastAct: discoverSpellCreatedHeldObjectCastAct,
  resolve: resolveSpellCreatedHeldObject,
};

export const spellCreatedHeldObjectAttackProfile = {
  admission: "synthesized",
  procedure: "spellCreatedHeldObjectAttack",
  executionSchema: SpellCreatedHeldObjectAttackInvocationSchema,
  discoverCastAct: discoverSpellCreatedHeldObjectAttackCastAct,
  resolve: resolveSpellCreatedHeldObjectAttack,
} satisfies SynthesizedSpellProcedureDeclaration<"spellCreatedHeldObjectAttack">;

export const spellCreatedHeldObjectReEvokeProfile = {
  admission: "synthesized",
  procedure: "spellCreatedHeldObjectReEvoke",
  executionSchema: SpellCreatedHeldObjectReEvokeInvocationSchema,
  discoverCastAct: discoverSpellCreatedHeldObjectReEvokeCastAct,
  resolve: resolveSpellCreatedHeldObjectReEvoke,
} satisfies SynthesizedSpellProcedureDeclaration<"spellCreatedHeldObjectReEvoke">;
import { spellInvocationResourceForCastOption } from "./profile.ts";
