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
  spellProcedureNonEmpty,
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
import {
  attackBonus,
  PositiveInteger,
  type MovementFeet as MovementFeetType,
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
type AttackBurstDamageEffect = Extract<
  AttackBurstAttackPhase["onHit"][number],
  { readonly kind: "damage" }
> & { readonly damageType: DamageType };
type AttackBurstFailedSaveDamageEffect = Extract<
  AttackBurstSavePhase["onFail"],
  { readonly kind: "damage" }
> & { readonly damageType: DamageType };

type AttackBurstSaveDamageCandidate = {
  readonly mechanics: ActivationSpellMechanics;
  readonly attackPhase: AttackBurstAttackPhase;
  readonly attackPhaseIndex: number;
  readonly burstPhase: AttackBurstSavePhase;
  readonly burstPhaseIndex: number;
};

type AttackBurstSaveDamageSupportedProjection = {
  readonly attackSelection: AttackBurstSaveDamageInvocation["targeting"];
  readonly attackKind: AttackBurstSaveDamageInvocation["attackKind"];
  readonly hitDamage: AttackBurstDamageEffect;
  readonly burstTargeting: AttackBurstSaveDamageInvocation["burst"]["targeting"];
  readonly burstDamage: AttackBurstFailedSaveDamageEffect;
};

type AttackBurstSaveDamageProjection = {
  readonly attackSelection: AttackBurstSaveDamageInvocation["targeting"] | null;
  readonly attackAttachmentSupported: boolean;
  readonly attackKind: AttackBurstSaveDamageInvocation["attackKind"] | null;
  readonly hitDamage: AttackBurstDamageEffect | null;
  readonly burstTargeting:
    | AttackBurstSaveDamageInvocation["burst"]["targeting"]
    | null;
  readonly burstDamage: AttackBurstFailedSaveDamageEffect | null;
};

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

function admitAttackBurstSaveDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "attackBurstSaveDamage",
  AttackBurstSaveDamageMechanicsFacts,
  AttackBurstSaveDamageInvocation,
  ReturnType<typeof attackBurstSaveDamageIssueResult>
> {
  const candidate = attackBurstSaveDamageCandidate(source.mechanics);
  if (candidate === null) return { tag: "notRepresented" };
  const {
    mechanics,
    attackPhase,
    attackPhaseIndex,
    burstPhase,
    burstPhaseIndex,
  } = candidate;
  const attackPhaseOrdinal = PositiveInteger(attackPhaseIndex + 1);
  const burstPhaseOrdinal = PositiveInteger(burstPhaseIndex + 1);
  const attackSelection = spellAttackDamageTargeting(attackPhase.attachment);
  const rangeFeet =
    attackSelection?.kind === "singleCombatant"
      ? singleSpellAttackDamageRangeFeet(attackSelection, mechanics.range)
      : null;
  const burstTargeting = primaryTargetOriginEmanationTargeting(
    burstPhase.attachment,
  );
  const hitDamage = attackPhase.onHit[0];
  const burstDamage = burstPhase.onFail;
  const projection = attackBurstSaveDamageProjection({
    attackPhase,
    attackSelection,
    hitDamage,
    burstTargeting,
    burstDamage,
  });
  const issues = [
    ...attackBurstSaveDamageHeaderIssues(mechanics, rangeFeet),
    ...attackBurstSaveDamagePhaseTopologyIssues(candidate),
    ...attackBurstSaveDamageAttachmentIssues(
      attackPhaseOrdinal,
      projection.attackAttachmentSupported,
    ),
    ...attackBurstSaveDamageBurstAttachmentIssues(
      burstPhaseOrdinal,
      projection.burstTargeting,
    ),
    ...attackBurstSaveDamageAttackKindIssues(
      projection.attackKind,
      attackPhaseOrdinal,
    ),
    ...attackBurstSaveDamageHitIssues(
      attackPhase,
      attackPhaseOrdinal,
      projection.hitDamage,
    ),
    ...attackBurstSaveDamageMissIssues(attackPhase, attackPhaseOrdinal),
    ...attackBurstSaveDamageBurstIssues(
      burstPhase,
      burstPhaseOrdinal,
      projection.burstDamage,
    ),
    ...attackBurstSaveDamageAmountIssues(
      hitDamage,
      attackPhaseOrdinal,
      "damageAmount",
    ),
    ...attackBurstSaveDamageAmountIssues(
      burstDamage,
      burstPhaseOrdinal,
      "burstDamageAmount",
    ),
  ];
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
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
    !attackBurstSaveDamageProjectionIsSupported(projection) ||
    rangeFeet === null
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
    targeting: projection.attackSelection,
    attackKind: projection.attackKind,
    damageAmount: projection.hitDamage.amount,
    damageType: projection.hitDamage.damageType,
    burstAbility: burstPhase.ability,
    burstDc: burstPhase.dc,
    burstTargeting: projection.burstTargeting,
    burstDamageAmount: projection.burstDamage.amount,
    burstDamageType: projection.burstDamage.damageType,
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

function attackBurstSaveDamageCandidate(
  mechanics: SpellMechanics,
): AttackBurstSaveDamageCandidate | null {
  if (mechanics.family !== "activation") return null;
  const attackPhaseIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "attack_roll",
  );
  const attackPhase = mechanics.phases[attackPhaseIndex];
  if (attackPhase?.kind !== "attack_roll") return null;
  if (!attackBurstSaveDamageAttackRepresentation(attackPhase)) return null;
  const burstPhaseIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "save_gate",
  );
  const burstPhase = mechanics.phases[burstPhaseIndex];
  return burstPhase?.kind !== "save_gate"
    ? null
    : { mechanics, attackPhase, attackPhaseIndex, burstPhase, burstPhaseIndex };
}

function attackBurstSaveDamageAttackRepresentation(
  phase: AttackBurstAttackPhase,
): boolean {
  const selection = targetSelectionFromAttachment(phase.attachment);
  return phase.continue === undefined && selection?.mode !== "choose_up_to";
}

function attackBurstSaveDamageHeaderIssues(
  mechanics: ActivationSpellMechanics,
  rangeFeet: MovementFeetType | null,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  return [
    ...(mechanics.level === 1
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "level",
            spellMechanicsHeaderPath("level"),
          ),
        ]),
    ...(mechanics.castingTime.kind === "action"
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "castingTime",
            spellMechanicsHeaderPath("castingTime"),
          ),
        ]),
    ...(mechanics.duration.kind === "instantaneous"
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "duration",
            spellMechanicsHeaderPath("duration"),
          ),
        ]),
    ...(rangeFeet === null
      ? [
          attackBurstSaveDamageMechanicsIssue(
            "range",
            spellMechanicsHeaderPath("range"),
          ),
        ]
      : []),
  ];
}

function attackBurstSaveDamagePhaseTopologyIssues(
  candidate: AttackBurstSaveDamageCandidate,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  return [
    ...attackBurstSaveDamagePhaseCountIssues(candidate),
    ...(candidate.attackPhaseIndex === 0
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "phaseOrder",
            spellActivationPhasePath(
              PositiveInteger(candidate.attackPhaseIndex + 1),
            ),
          ),
        ]),
    ...(candidate.burstPhaseIndex === 1
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "phaseOrder",
            spellActivationPhasePath(
              PositiveInteger(candidate.burstPhaseIndex + 1),
            ),
          ),
        ]),
  ];
}

function attackBurstSaveDamagePhaseCountIssues(
  candidate: AttackBurstSaveDamageCandidate,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  if (candidate.mechanics.phases.length === 2) return [];
  if (candidate.mechanics.phases.length < 2) {
    return [
      attackBurstSaveDamageMechanicsIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(2)),
      ),
    ];
  }
  return candidate.mechanics.phases.flatMap((_phase, index) =>
    index === candidate.attackPhaseIndex || index === candidate.burstPhaseIndex
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "phaseCount",
            spellActivationPhasePath(PositiveInteger(index + 1)),
          ),
        ],
  );
}

function attackBurstSaveDamageAttachmentIssues(
  ordinal: PositiveInteger,
  supported: boolean,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  return supported
    ? []
    : [
        attackBurstSaveDamageMechanicsIssue(
          "attackAttachment",
          spellActivationAttachmentPath(ordinal),
        ),
      ];
}

function attackBurstSaveDamageBurstAttachmentIssues(
  ordinal: PositiveInteger,
  targeting: ReturnType<typeof primaryTargetOriginEmanationTargeting>,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  return targeting === null
    ? [
        attackBurstSaveDamageMechanicsIssue(
          "burstAttachment",
          spellActivationAttachmentPath(ordinal),
        ),
      ]
    : [];
}

function attackBurstSaveDamageAttackKindIssues(
  attackKind: AttackBurstSaveDamageInvocation["attackKind"] | null,
  ordinal: PositiveInteger,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  return attackKind !== null
    ? []
    : [
        attackBurstSaveDamageMechanicsIssue(
          "attackKind",
          spellActivationPhasePath(ordinal),
        ),
      ];
}

function attackBurstSaveDamageHitIssues(
  phase: AttackBurstAttackPhase,
  ordinal: PositiveInteger,
  hitDamage: AttackBurstDamageEffect | null,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  const firstPath = spellActivationEffectPath(ordinal, PositiveInteger(1));
  return [
    ...(hitDamage === null
      ? [attackBurstSaveDamageMechanicsIssue("hitDamage", firstPath)]
      : []),
    ...phase.onHit
      .slice(1)
      .map((_effect, index) =>
        attackBurstSaveDamageMechanicsIssue(
          "hitDamage",
          spellActivationEffectPath(ordinal, PositiveInteger(index + 2)),
        ),
      ),
  ];
}

function attackBurstSaveDamageMissIssues(
  phase: AttackBurstAttackPhase,
  ordinal: PositiveInteger,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  return [
    ...(phase.onMiss[0]?.kind === "none"
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "missDamage",
            spellActivationEffectPath(
              ordinal,
              PositiveInteger(phase.onHit.length + 1),
            ),
          ),
        ]),
    ...phase.onMiss
      .slice(1)
      .map((_effect, index) =>
        attackBurstSaveDamageMechanicsIssue(
          "missDamage",
          spellActivationEffectPath(
            ordinal,
            PositiveInteger(phase.onHit.length + index + 2),
          ),
        ),
      ),
  ];
}

function attackBurstSaveDamageBurstIssues(
  phase: AttackBurstSavePhase,
  ordinal: PositiveInteger,
  damage: AttackBurstFailedSaveDamageEffect | null,
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  const effectPath = spellActivationEffectPath(ordinal, PositiveInteger(1));
  return [
    ...(phase.ability === "dex"
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "burstAbility",
            spellActivationPhasePath(ordinal),
          ),
        ]),
    ...(phase.dc.kind === "caster_spell_save_dc"
      ? []
      : [
          attackBurstSaveDamageMechanicsIssue(
            "burstDc",
            spellActivationPhasePath(ordinal),
          ),
        ]),
    ...(phase.onSuccess.kind === "none"
      ? []
      : [attackBurstSaveDamageMechanicsIssue("burstSuccess", effectPath)]),
    ...(damage === null
      ? [attackBurstSaveDamageMechanicsIssue("burstDamage", effectPath)]
      : []),
  ];
}

function attackBurstSaveDamageAmountIssues(
  effect:
    | AttackBurstAttackPhase["onHit"][number]
    | AttackBurstSavePhase["onFail"]
    | undefined,
  ordinal: PositiveInteger,
  failedFact: "damageAmount" | "burstDamageAmount",
): readonly AttackBurstSaveDamageMechanicsIssue[] {
  return effect?.kind === "damage" &&
    !attackBurstSaveDamageAmountIsRepresented(effect.amount)
    ? [
        attackBurstSaveDamageMechanicsIssue(
          failedFact,
          spellActivationEffectPath(ordinal, PositiveInteger(1)),
        ),
      ]
    : [];
}

function attackBurstDamageEffect(
  effect: AttackBurstAttackPhase["onHit"][number] | undefined,
): AttackBurstDamageEffect | null {
  return isAttackBurstDamageEffect(effect) ? effect : null;
}

function isAttackBurstDamageEffect(
  effect: AttackBurstAttackPhase["onHit"][number] | undefined,
): effect is AttackBurstDamageEffect {
  return effect?.kind === "damage" && typeof effect.damageType === "string";
}

function attackBurstFailedSaveDamageEffect(
  effect: AttackBurstSavePhase["onFail"],
): AttackBurstFailedSaveDamageEffect | null {
  return isAttackBurstFailedSaveDamageEffect(effect) ? effect : null;
}

function isAttackBurstFailedSaveDamageEffect(
  effect: AttackBurstSavePhase["onFail"],
): effect is AttackBurstFailedSaveDamageEffect {
  return effect.kind === "damage" && typeof effect.damageType === "string";
}

function attackBurstSaveDamageProjection(input: {
  readonly attackPhase: AttackBurstAttackPhase;
  readonly attackSelection: ReturnType<typeof spellAttackDamageTargeting>;
  readonly hitDamage: AttackBurstAttackPhase["onHit"][number] | undefined;
  readonly burstTargeting: ReturnType<
    typeof primaryTargetOriginEmanationTargeting
  >;
  readonly burstDamage: AttackBurstSavePhase["onFail"];
}): AttackBurstSaveDamageProjection {
  const hitDamage = attackBurstDamageEffect(input.hitDamage);
  const burstDamage = attackBurstFailedSaveDamageEffect(input.burstDamage);
  return {
    attackSelection:
      input.attackSelection?.kind === "singleCombatant"
        ? input.attackSelection
        : null,
    attackAttachmentSupported:
      input.attackSelection?.kind === "singleCombatant" &&
      input.attackPhase.attachment.kind === "hole" &&
      input.attackPhase.attachment.value.kind === "target" &&
      input.attackPhase.attachment.value.selection.mode === "one",
    attackKind: supportedSpellAttackKind(input.attackPhase.attackKind)
      ? input.attackPhase.attackKind
      : null,
    hitDamage,
    burstTargeting: input.burstTargeting,
    burstDamage,
  };
}

function attackBurstSaveDamageProjectionIsSupported(
  projection: AttackBurstSaveDamageProjection,
): projection is AttackBurstSaveDamageSupportedProjection &
  AttackBurstSaveDamageProjection {
  return (
    projection.attackSelection !== null &&
    projection.attackKind !== null &&
    projection.hitDamage !== null &&
    projection.burstTargeting !== null &&
    projection.burstDamage !== null
  );
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
