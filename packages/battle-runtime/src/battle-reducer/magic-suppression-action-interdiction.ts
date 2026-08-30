// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-action-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
//
// SRD 5.2.1 Antimagic Field blocks spellcasting and Magic Actions inside its
// 10-foot Emanation. The battle runtime owns action interdiction from
// caller-supplied current aura-membership witnesses; table geometry remains
// outside this owner.

import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleMagicSuppressionEmanationMembership,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  RuntimeSpellProcedureExecution,
  SpellProcedureExecution,
} from "../character-execution.ts";
import type { BattleAreaId, CombatantId } from "../identity.ts";
import {
  characterProcedureBinding,
  characterSpellProcedure,
  unitSupportProfileKind,
} from "../character-execution-queries.ts";
import {
  spellInvocationIsSpellcasting,
  spellInvocationSpendsMagicAction,
} from "./spell-turn-resources.ts";
import { boundPersistentAreaSaveDamageEffectForArea } from "./persistent-area-save-damage-binding.ts";

type MagicSuppressionInterdictionKind = "spellcasting" | "magicAction";
type MagicSuppressionSubjectInterdiction = {
  readonly actorId: CombatantId;
  readonly kind: MagicSuppressionInterdictionKind;
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
export type ActiveMagicSuppressionEmanationMembership = {
  readonly areaId: BattleAreaId;
  readonly sourceCombatantId: CombatantId;
  readonly membership: BattleMagicSuppressionEmanationMembership;
};

const NON_SPELLCASTING_SPELL_ACT_PROCEDURES = [
  "spellCreatedHeldObjectAttack",
  "spellCreatedHeldObjectReEvoke",
  "objectContactDamageRepeat",
  "spatialMeleeSpellAttackProxy",
  "movableLightManifestation",
] as const satisfies ReadonlyArray<SpellProcedureExecution["procedure"]>;

export function combatantInsideActiveMagicSuppressionEmanation(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return activeMagicSuppressionEmanationMemberships(state).some((membership) =>
    magicSuppressionEmanationMembershipIncludesCombatant(
      membership,
      combatantId,
    ),
  );
}

export function battleSubjectInterdictedByMagicSuppressionEmanation(
  state: BattleState,
  subject: BattleSubject,
): boolean {
  const interdiction = magicSuppressionSubjectInterdiction(state, subject);
  return (
    interdiction !== null &&
    combatantInsideActiveMagicSuppressionEmanation(state, interdiction.actorId)
  );
}

export function magicSuppressionInterdictionMessage(
  state: BattleState,
  subject: BattleSubject,
): string {
  return magicSuppressionSubjectInterdiction(state, subject)?.kind ===
    "magicAction"
    ? "Magic Action is blocked inside a magic-suppression area."
    : "Spellcasting is blocked inside a magic-suppression area.";
}

export function spellInvocationActInterdictedByMagicSuppressionEmanation(
  invocation: RuntimeSpellProcedureExecution,
): boolean {
  return (
    spellInvocationIsSpellcasting(invocation) ||
    spellInvocationSpendsMagicAction(invocation)
  );
}

export function activeMagicSuppressionEmanationMemberships(
  state: BattleState,
): readonly ActiveMagicSuppressionEmanationMembership[] {
  return [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect) =>
      effect.kind === "magicSuppressionEmanation"
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

export function magicSuppressionEmanationMembershipIncludesCombatant(
  membership: ActiveMagicSuppressionEmanationMembership,
  combatantId: CombatantId,
): boolean {
  return combatantId === membership.sourceCombatantId
    ? membership.membership.originIncluded
    : membership.membership.nonOriginCombatantIds.includes(combatantId);
}

function magicSuppressionSubjectInterdiction(
  state: BattleState,
  subject: BattleSubject,
): MagicSuppressionSubjectInterdiction | null {
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell"
  ) {
    const kind = spellActSubjectInterdictionKind(state, subject);
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
  state: BattleState,
  subject: SpellActSubject,
): MagicSuppressionInterdictionKind | null {
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") return null;
  const invocation = characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  );
  if (invocation === undefined) return null;
  return NON_SPELLCASTING_SPELL_ACT_PROCEDURES.some(
    (procedure) => procedure === invocation.procedure,
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
    subject.command === "grantedAreaSaveDamageAction" ||
    subject.command === "controlledVerticalSuspensionAltitudeControl" ||
    subject.command === "replaceSelfTransformationMode"
  ) {
    return true;
  }
  return (
    subject.command === "movableZoneReposition" &&
    activeMagicActionPersistentAreaEffectForRepositionSubject(state, subject)
  );
}

function activeMagicActionPersistentAreaEffectForRepositionSubject(
  state: BattleState,
  subject: RuntimeCommandSubject,
): boolean {
  if (subject.command !== "movableZoneReposition") return false;
  const bound = boundPersistentAreaSaveDamageEffectForArea(
    state,
    subject.effectRef,
    subject.areaId,
  );
  return (
    bound?.facts.lifecycle.kind === "casterActionReposition" &&
    bound.facts.lifecycle.actionCost === "magicAction"
  );
}

function unitFeatureSubjectSpendsMagicAction(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "unitFeature" }>,
): boolean {
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") return false;
  const binding = characterProcedureBinding(
    actor.origin.execution,
    subject.procedureRef,
  );
  if (
    binding === undefined ||
    (binding.procedure.kind !== "unitFeature" &&
      binding.procedure.kind !== "unitSupportProfile")
  ) {
    return false;
  }
  const procedure = binding.procedure;
  const executionKind =
    procedure.kind === "unitFeature"
      ? procedure.execution.kind
      : unitSupportProfileKind(procedure.execution);
  return (
    executionKind === "magicActionHealingPool" ||
    executionKind === "magicActionAreaSaveDamageHealing"
  );
}
