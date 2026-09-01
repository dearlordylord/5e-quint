import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES
//
// The attackBurstSaveDamage Spell Procedure Profile: a Spell Slot action
// spell that makes one Spell Attack against a primary target, then resolves a
// primary-target-origin burst whose affected creatures make Saving Throws for
// burst damage.
//
// RAW anchors:
//   - SRD 5.2.1 Ice Knife: ranged spell attack, hit-only Piercing damage,
//     hit-or-miss explosion, Dexterity Saving Throws, Cold damage, and
//     higher-level Cold damage scaling.
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls", "Damage Rolls", and
//     "Saving Throws and Damage".
//   - SRD 5.2.1 Rules Glossary "Spell Attack".
//   - UBIQUITOUS_LANGUAGE.md: Spell Attack, Attack Roll, Saving Throw,
//     Damage Roll, Damage Type, and Spell Invocation.
//
// What stays in shared infrastructure: the attack/burst resolver body remains
// in spells-resolve-attack-burst.ts because it owns the existing replay,
// reaction, and damage-lifecycle sequencing. The profile owns dispatch into
// that resolver and the procedure's admission/discovery projections.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import {
  readiedSpellAct,
  spellCastSelectionSubject,
} from "../spells-discovery.ts";
import {
  primaryTargetOriginEmanationTargeting,
  singleSpellAttackDamageRangeFeet,
  spellAttackDamageTargeting,
  supportedSpellAttackKind,
  type AttackBurstSaveDamageInvocation,
} from "../spells-profiles-attack-damage.ts";
import {
  supportedDamageAmountExpr,
  targetSelectionFromAttachment,
} from "../spells-execution-facts.ts";
import { resolveAttackBurstSaveDamageSpellAct } from "../spells-resolve-attack-burst.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import type {
  Ability,
  DamageType,
  DcSource,
  DiceAmount as SurfaceDiceAmount,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
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
import {
  attackBonus,
  PositiveInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  spellProcedureResolutionContext,
} from "./profile.ts";
import {
  AbilitySchema,
  AttackBonus,
  DamageTypeSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AttackBurstSaveDamageResolveInput =
  SpellProcedureProfileResolveInput<AttackBurstSaveDamageInvocation>;

type ActivationSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type AttackBurstAttackPhase = Extract<
  ActivationSpellMechanics["phases"][number],
  { readonly kind: "attack_roll" }
>;
type AttackBurstSavePhase = Extract<
  ActivationSpellMechanics["phases"][number],
  { readonly kind: "save_gate" }
>;

type AttackBurstSaveDamageMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly targeting: AttackBurstSaveDamageInvocation["targeting"];
  readonly attackKind: AttackBurstSaveDamageInvocation["attackKind"];
  readonly damageAmount: Extract<
    AttackBurstAttackPhase["onHit"][number],
    { readonly kind: "damage" }
  >["amount"];
  readonly damageType: DamageType;
  readonly burstAbility: Ability;
  readonly burstDc: DcSource;
  readonly burstTargeting: AttackBurstSaveDamageInvocation["burst"]["targeting"];
  readonly burstDamageAmount: Extract<
    AttackBurstSavePhase["onFail"],
    { readonly kind: "damage" }
  >["amount"];
  readonly burstDamageType: DamageType;
};

function admitAttackBurstSaveDamage(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: AttackBurstSaveDamageMechanicsFacts,
): readonly AttackBurstSaveDamageInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  const rangeFeet = singleSpellAttackDamageRangeFeet(
    facts.targeting,
    facts.range,
  );
  if (rangeFeet === null) return [];
  return ctx.spellCastOptions.flatMap((slot) => {
    if (Number(slot.spellLevel) < facts.level) return [];
    const hitDamageExpr = supportedDamageAmountExpr({
      amount: facts.damageAmount,
      spellLevel: facts.level,
      slotLevel: slot.spellLevel,
    });
    const burstDamageExpr = supportedDamageAmountExpr({
      amount: facts.burstDamageAmount,
      spellLevel: facts.level,
      slotLevel: slot.spellLevel,
    });
    if (hitDamageExpr === null || burstDamageExpr === null) return [];
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "attackBurstSaveDamage",
        spell,
        targeting: facts.targeting,
        attackKind: facts.attackKind,
        attackBonus: attackBonus(
          Number(ctx.castingSource.abilityModifier) +
            Number(spellcasting.proficiencyBonus),
        ),
        damage: {
          expr: hitDamageExpr,
          damageType: facts.damageType,
        },
        burst: {
          ability: facts.burstAbility,
          dc: facts.burstDc,
          targeting: facts.burstTargeting,
          damage: {
            expr: burstDamageExpr,
            damageType: facts.burstDamageType,
          },
          successDamage: "none",
        },
        rangeFeet,
      },
    ];
  });
}

export const ATTACK_BURST_SAVE_DAMAGE_FAILED_FACTS = [
  "level",
  "castingTime",
  "duration",
  "range",
  "phaseCount",
  "phaseOrder",
  "attackAttachment",
  "burstAttachment",
  "attackKind",
  "hitDamage",
  "missDamage",
  "burstAbility",
  "burstDc",
  "burstSuccess",
  "burstDamage",
  "damageAmount",
  "burstDamageAmount",
] as const;
type AttackBurstSaveDamageFailedFact =
  (typeof ATTACK_BURST_SAVE_DAMAGE_FAILED_FACTS)[number];

type AttackBurstSaveDamageMechanicsIssue = {
  readonly failedFact: AttackBurstSaveDamageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function attackBurstSaveDamageMechanicsIssue(
  failedFact: AttackBurstSaveDamageMechanicsIssue["failedFact"],
  mechanicsPath: SpellMechanicsBranchPath,
): AttackBurstSaveDamageMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function attackBurstSaveDamageIssueResult(
  issue: AttackBurstSaveDamageMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "attackBurstSaveDamage";
  readonly failedFact: AttackBurstSaveDamageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "attackBurstSaveDamage",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported attackBurstSaveDamage mechanics fact: ${issue.failedFact}.`,
  };
}

function attackBurstSaveDamageMechanicsEvidence(
  mechanics: ActivationSpellMechanics,
  attackPhase: AttackBurstAttackPhase,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...attackPhase.onHit.map((_effect, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...attackPhase.onMiss.map((_effect, index) =>
      spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(attackPhase.onHit.length + index + 1),
      ),
    ),
    spellActivationPhasePath(PositiveInteger(2)),
    spellActivationAttachmentPath(PositiveInteger(2)),
    spellActivationEffectPath(PositiveInteger(2), PositiveInteger(1)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function attackBurstSaveDamageAmountIsRepresented(
  amount: SurfaceDiceAmount,
): boolean {
  if (amount.kind === "fixed") return true;
  return (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel > 0 &&
    amount.base.dieSize !== undefined
  );
}

function attackBurstSaveDamageNonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

function attackBurstSaveDamageIssueKey(
  failedFact: AttackBurstSaveDamageFailedFact,
  path: SpellMechanicsBranchPath,
): string {
  return JSON.stringify([failedFact, path.nodes]);
}

function admitAttackBurstSaveDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "attackBurstSaveDamage",
  AttackBurstSaveDamageMechanicsFacts,
  AttackBurstSaveDamageInvocation,
  ReturnType<typeof attackBurstSaveDamageIssueResult>
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const attackPhaseIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "attack_roll",
  );
  const attackPhase =
    attackPhaseIndex < 0 ? undefined : mechanics.phases[attackPhaseIndex];
  if (attackPhase?.kind !== "attack_roll") {
    return { tag: "notRepresented" };
  }
  const attackSelection = spellAttackDamageTargeting(attackPhase.attachment);
  const rawAttackSelection = targetSelectionFromAttachment(
    attackPhase.attachment,
  );
  if (
    attackPhase.continue !== undefined ||
    rawAttackSelection?.mode === "choose_up_to"
  ) {
    return { tag: "notRepresented" };
  }
  const burstPhaseIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "save_gate",
  );
  const burstPhase =
    burstPhaseIndex < 0 ? undefined : mechanics.phases[burstPhaseIndex];
  if (burstPhase?.kind !== "save_gate") {
    return { tag: "notRepresented" };
  }
  const attackPhaseOrdinal = PositiveInteger(attackPhaseIndex + 1);
  const burstPhaseOrdinal = PositiveInteger(burstPhaseIndex + 1);
  const issues: AttackBurstSaveDamageMechanicsIssue[] = [];
  const issueKeys = new Set<string>();
  const pushIssue = (
    failedFact: AttackBurstSaveDamageMechanicsIssue["failedFact"],
    path: SpellMechanicsBranchPath,
  ): void => {
    const key = attackBurstSaveDamageIssueKey(failedFact, path);
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push(attackBurstSaveDamageMechanicsIssue(failedFact, path));
  };
  if (mechanics.level !== 1) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.duration.kind !== "instantaneous") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
  }
  const rangeFeet =
    attackSelection?.kind === "singleCombatant"
      ? singleSpellAttackDamageRangeFeet(attackSelection, mechanics.range)
      : null;
  if (rangeFeet === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.phases.length !== 2) {
    if (mechanics.phases.length < 2) {
      pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(2)));
    } else {
      for (const [index] of mechanics.phases.entries()) {
        if (index === attackPhaseIndex || index === burstPhaseIndex) continue;
        pushIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        );
      }
    }
  }
  if (attackPhaseIndex !== 0) {
    pushIssue(
      "phaseOrder",
      spellActivationPhasePath(PositiveInteger(attackPhaseIndex + 1)),
    );
  }
  if (burstPhaseIndex !== 1) {
    pushIssue(
      "phaseOrder",
      spellActivationPhasePath(PositiveInteger(burstPhaseIndex + 1)),
    );
  }
  if (
    attackSelection?.kind !== "singleCombatant" ||
    attackPhase.attachment.kind !== "hole" ||
    attackPhase.attachment.value.kind !== "target" ||
    attackPhase.attachment.value.selection.mode !== "one"
  ) {
    pushIssue(
      "attackAttachment",
      spellActivationAttachmentPath(attackPhaseOrdinal),
    );
  }
  const burstTargeting = primaryTargetOriginEmanationTargeting(
    burstPhase.attachment,
  );
  if (burstTargeting === null) {
    pushIssue(
      "burstAttachment",
      spellActivationAttachmentPath(burstPhaseOrdinal),
    );
  }
  if (!supportedSpellAttackKind(attackPhase.attackKind)) {
    pushIssue("attackKind", spellActivationPhasePath(attackPhaseOrdinal));
  }
  const hitDamage = attackPhase.onHit[0];
  if (
    hitDamage?.kind !== "damage" ||
    typeof hitDamage.damageType !== "string"
  ) {
    pushIssue(
      "hitDamage",
      spellActivationEffectPath(attackPhaseOrdinal, PositiveInteger(1)),
    );
  }
  if (attackPhase.onHit.length > 1) {
    for (const index of attackPhase.onHit.slice(1).keys()) {
      pushIssue(
        "hitDamage",
        spellActivationEffectPath(
          attackPhaseOrdinal,
          PositiveInteger(index + 2),
        ),
      );
    }
  }
  const firstMissPath = spellActivationEffectPath(
    attackPhaseOrdinal,
    PositiveInteger(attackPhase.onHit.length + 1),
  );
  if (attackPhase.onMiss[0]?.kind !== "none") {
    pushIssue("missDamage", firstMissPath);
  }
  for (const index of attackPhase.onMiss.slice(1).keys()) {
    pushIssue(
      "missDamage",
      spellActivationEffectPath(
        attackPhaseOrdinal,
        PositiveInteger(attackPhase.onHit.length + index + 2),
      ),
    );
  }
  if (burstPhase.ability !== "dex") {
    pushIssue("burstAbility", spellActivationPhasePath(burstPhaseOrdinal));
  }
  if (burstPhase.dc.kind !== "caster_spell_save_dc") {
    pushIssue("burstDc", spellActivationPhasePath(burstPhaseOrdinal));
  }
  if (burstPhase.onSuccess.kind !== "none") {
    pushIssue(
      "burstSuccess",
      spellActivationEffectPath(burstPhaseOrdinal, PositiveInteger(1)),
    );
  }
  const burstDamage = burstPhase.onFail;
  if (
    burstDamage.kind !== "damage" ||
    typeof burstDamage.damageType !== "string"
  ) {
    pushIssue(
      "burstDamage",
      spellActivationEffectPath(burstPhaseOrdinal, PositiveInteger(1)),
    );
  }
  if (
    hitDamage?.kind === "damage" &&
    !attackBurstSaveDamageAmountIsRepresented(hitDamage.amount)
  ) {
    pushIssue(
      "damageAmount",
      spellActivationEffectPath(attackPhaseOrdinal, PositiveInteger(1)),
    );
  }
  if (
    burstDamage.kind === "damage" &&
    !attackBurstSaveDamageAmountIsRepresented(burstDamage.amount)
  ) {
    pushIssue(
      "burstDamageAmount",
      spellActivationEffectPath(burstPhaseOrdinal, PositiveInteger(1)),
    );
  }
  const nonEmptyIssues = attackBurstSaveDamageNonEmpty(issues);
  if (nonEmptyIssues !== undefined) {
    const [firstIssue, ...remainingIssues] = nonEmptyIssues.map(
      attackBurstSaveDamageIssueResult,
    );
    return {
      tag: "unsupported",
      issues: [firstIssue, ...remainingIssues],
    };
  }
  if (
    hitDamage?.kind !== "damage" ||
    typeof hitDamage.damageType !== "string" ||
    burstDamage.kind !== "damage" ||
    typeof burstDamage.damageType !== "string" ||
    attackSelection === null ||
    attackSelection.kind !== "singleCombatant" ||
    burstTargeting === null ||
    rangeFeet === null ||
    !supportedSpellAttackKind(attackPhase.attackKind)
  ) {
    return {
      tag: "unsupported",
      issues: [
        attackBurstSaveDamageIssueResult(
          attackBurstSaveDamageMechanicsIssue(
            "hitDamage",
            spellActivationEffectPath(attackPhaseOrdinal, PositiveInteger(1)),
          ),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    targeting: attackSelection,
    attackKind: attackPhase.attackKind,
    damageAmount: hitDamage.amount,
    damageType: hitDamage.damageType,
    burstAbility: burstPhase.ability,
    burstDc: burstPhase.dc,
    burstTargeting,
    burstDamageAmount: burstDamage.amount,
    burstDamageType: burstDamage.damageType,
  } satisfies AttackBurstSaveDamageMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "attackBurstSaveDamage",
      facts,
      evidence: attackBurstSaveDamageMechanicsEvidence(mechanics, attackPhase),
      admit: (executionSource, ctx) =>
        admitAttackBurstSaveDamage(executionSource, ctx, facts),
    },
  };
}

function discoverAttackBurstSaveDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<AttackBurstSaveDamageInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: spellCastSelectionSubject(actorId, invocation),
            initialHoles: [targetHole],
          },
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveAttackBurstSaveDamage(
  input: AttackBurstSaveDamageResolveInput,
): BattleResolutionResult {
  return resolveAttackBurstSaveDamageSpellAct(
    spellProcedureResolutionContext(input),
  );
}

const AttackBurstSaveDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("attackBurstSaveDamage"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("singleCombatant"),
    }),
    attackKind: Schema.Literals(["melee_spell_attack", "ranged_spell_attack"]),
    attackBonus: AttackBonus,
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    burst: Schema.Struct({
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("primaryTargetOriginEmanation"),
        radiusFeet: MovementFeet,
      }),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      successDamage: Schema.Literal("none"),
    }),
    rangeFeet: MovementFeet,
  }),
);
export const attackBurstSaveDamageProfile: SpellProcedureDeclaration<
  "attackBurstSaveDamage",
  AttackBurstSaveDamageInvocation
> = {
  procedure: "attackBurstSaveDamage",
  executionSchema: AttackBurstSaveDamageInvocationSchema,
  admitMechanics: admitAttackBurstSaveDamageMechanics,
  discoverCastAct: discoverAttackBurstSaveDamageCastAct,
  resolve: resolveAttackBurstSaveDamage,
};
