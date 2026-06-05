// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-action-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
//
// SRD 5.2.1 Antimagic Field blocks spellcasting and Magic Actions inside its
// 10-foot Emanation. The battle runtime owns action interdiction from
// caller-supplied current aura-membership witnesses; table geometry remains
// outside this owner.

import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleAntimagicFieldAuraMembership,
  BattleState,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { BattleAreaId, CombatantId } from "../identity.ts";
import {
  spellInvocationIsSpellcasting,
  spellInvocationSpendsMagicAction,
} from "./spell-turn-resources.ts";

type AntimagicFieldInterdictionKind = "spellcasting" | "magicAction";
type AntimagicFieldSubjectInterdiction = {
  readonly actorId: CombatantId;
  readonly kind: AntimagicFieldInterdictionKind;
};
type RuntimeCommandSubject = Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand" }
>;
type SpellActSubject = Extract<
  BattleSubject,
  {
    readonly tag: "actionSpell" | "bonusActionSpell" | "bonusActionDashSpell";
  }
>;
type ActiveAntimagicFieldAuraMembership = {
  readonly areaId: BattleAreaId;
  readonly sourceCombatantId: CombatantId;
  readonly membership: BattleAntimagicFieldAuraMembership;
};

const NON_SPELLCASTING_SPELL_ACT_PROCEDURES = [
  "spellCreatedHeldObjectAttack",
  "spellCreatedHeldObjectReEvoke",
  "objectContactDamageRepeat",
  "spiritualWeaponRepeatAttack",
  "dancingLightsReposition",
] as const satisfies ReadonlyArray<SupportedSpellInvocation["procedure"]>;

export function combatantInsideActiveAntimagicFieldAura(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return activeAntimagicFieldAuraMemberships(state).some((membership) =>
    antimagicFieldAuraMembershipIncludesCombatant(membership, combatantId),
  );
}

export function battleSubjectInterdictedByAntimagicField(
  state: BattleState,
  subject: BattleSubject,
): boolean {
  const interdiction = antimagicFieldSubjectInterdiction(state, subject);
  return (
    interdiction !== null &&
    combatantInsideActiveAntimagicFieldAura(state, interdiction.actorId)
  );
}

export function antimagicFieldInterdictionMessage(
  state: BattleState,
  subject: BattleSubject,
): string {
  return antimagicFieldSubjectInterdiction(state, subject)?.kind ===
    "magicAction"
    ? "Magic Action is blocked inside an Antimagic Field aura."
    : "Spellcasting is blocked inside an Antimagic Field aura.";
}

export function spellInvocationActInterdictedByAntimagicField(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    spellInvocationIsSpellcasting(invocation) ||
    spellInvocationSpendsMagicAction(invocation)
  );
}

function activeAntimagicFieldAuraMemberships(
  state: BattleState,
): readonly ActiveAntimagicFieldAuraMembership[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect) =>
      effect.kind === "antimagicFieldOngoingSpellSuppression"
        ? [
            {
              areaId: effect.areaId,
              sourceCombatantId: effect.sourceCombatantId,
              membership: effect.auraMembership,
            },
          ]
        : [],
    ),
  );
}

function antimagicFieldAuraMembershipIncludesCombatant(
  membership: ActiveAntimagicFieldAuraMembership,
  combatantId: CombatantId,
): boolean {
  return combatantId === membership.sourceCombatantId
    ? membership.membership.originIncluded
    : membership.membership.nonOriginCombatantIds.includes(combatantId);
}

function antimagicFieldSubjectInterdiction(
  state: BattleState,
  subject: BattleSubject,
): AntimagicFieldSubjectInterdiction | null {
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell"
  ) {
    const kind = spellActSubjectInterdictionKind(subject);
    if (kind === null) {
      return null;
    }
    return {
      actorId: subject.actorId,
      kind,
    };
  }
  if (
    subject.tag === "runtimeCommand" &&
    subject.command === "castTriggeredReactionSpell"
  ) {
    return { actorId: subject.reactorId, kind: "spellcasting" };
  }
  if (
    subject.tag === "runtimeCommand" &&
    subject.command === "castAttackHitBonusActionSpell"
  ) {
    return { actorId: subject.casterId, kind: "spellcasting" };
  }
  if (
    subject.tag === "runtimeCommand" &&
    runtimeCommandSubjectSpendsMagicAction(state, subject)
  ) {
    return { actorId: subject.actorId, kind: "magicAction" };
  }
  return subject.tag === "unitFeature" &&
    unitFeatureSubjectSpendsMagicAction(state, subject)
    ? { actorId: subject.actorId, kind: "magicAction" }
    : null;
}

function spellActSubjectInterdictionKind(
  subject: SpellActSubject,
): AntimagicFieldInterdictionKind | null {
  return NON_SPELLCASTING_SPELL_ACT_PROCEDURES.some(
    (procedure) => procedure === subject.invocation.procedure,
  )
    ? subject.tag === "actionSpell"
      ? "magicAction"
      : null
    : "spellcasting";
}

function runtimeCommandSubjectSpendsMagicAction(
  state: BattleState,
  subject: RuntimeCommandSubject,
): boolean {
  if (
    subject.command === "dragonsBreathExhale" ||
    subject.command === "levitateAltitudeControl" ||
    subject.command === "replaceSelfTransformationMode"
  ) {
    return true;
  }
  return (
    subject.command === "movableZoneReposition" &&
    activeMoonbeamEffectForRepositionSubject(state, subject)
  );
}

function activeMoonbeamEffectForRepositionSubject(
  state: BattleState,
  subject: RuntimeCommandSubject,
): boolean {
  return (
    subject.command === "movableZoneReposition" &&
    [...state.combatants.values()].some((combatant) =>
      combatant.activeEffects.some(
        (effect) =>
          effect.kind === "moonbeam" &&
          effect.sourceCombatantId === subject.sourceCombatantId &&
          effect.sourceSpellId === subject.sourceSpellId &&
          effect.areaId === subject.areaId,
      ),
    )
  );
}

function unitFeatureSubjectSpendsMagicAction(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "unitFeature" }>,
): boolean {
  const actor = state.combatants.get(subject.actorId);
  return (
    actor?.origin.kind === "character" &&
    (actor.origin.magicActionHealingPoolProfiles.has(subject.unitId) ||
      actor.origin.magicActionAreaSaveDamageHealingProfiles.has(subject.unitId))
  );
}
