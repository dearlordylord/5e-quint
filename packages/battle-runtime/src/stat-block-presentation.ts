import type { SupportedAttackActionOption } from "./battle-action-options.ts";
import { UNARMED_STRIKE_NAME } from "./battle-action-options.ts";
import type {
  AttackPresentationJoinIssue,
  BattleState,
} from "./battle-state-execution.ts";
import {
  characterWeaponPresentationSource,
  type BattleStatBlockProcedurePresentation,
  type BattleStatBlockPresentationSource,
  type BattleRuntimeContext,
} from "./battle-runtime-context.ts";
import { activeDruidWildShape } from "./battle-reducer/druid-wild-shape.ts";
import { attackActionOptionName } from "./battle-reducer/statblock-attacks.ts";
import type { CombatantId } from "./identity.ts";
import {
  statBlockPresentationAllocation,
  type StatBlockExecutionAdmission,
} from "./stat-block-execution.ts";
import { Match, Result } from "effect";
import type { Ability } from "@dnd/shared/game-facts";

export type StatBlockProcedurePresentation =
  BattleStatBlockProcedurePresentation;

export function battleCreaturePresentationDisplayName(
  state: BattleState,
  context: BattleRuntimeContext,
  combatantId: CombatantId,
): string | null {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) return null;
  return combatant.origin.kind === "statBlock"
    ? (context.statBlocks.get(combatantId)?.displayName ?? null)
    : combatant.origin.displayName;
}

export function statBlockLanguagePresentation(
  statBlock: Pick<StatBlockExecutionAdmission, "statBlock">["statBlock"],
): BattleStatBlockPresentationSource["languages"] {
  const languages = statBlock.statBlock.languages;
  if (languages === undefined) return { kind: "absentStatBlockLanguages" };
  return languages === "caster_languages"
    ? { kind: "casterLanguagesReference" }
    : { kind: "authoredStatBlockLanguageEntries", entries: languages };
}

export function statBlockProcedurePresentations(
  admission: Pick<StatBlockExecutionAdmission, "statBlock" | "execution">,
): readonly StatBlockProcedurePresentation[] {
  const allocation = statBlockPresentationAllocation(admission);
  return [
    ...allocation.occurrences.attacks.map((occurrence) => ({
      procedureRef: requirePresentationProcedureRef(
        allocation.procedureRefs,
        occurrence,
      ),
      kind: "attack" as const,
      name: occurrence.source.name,
    })),
    {
      procedureRef: requirePresentationProcedureRef(
        allocation.procedureRefs,
        allocation.occurrences.unarmedStrike,
      ),
      kind: "attack" as const,
      name: UNARMED_STRIKE_NAME,
    },
    ...allocation.occurrences.multiattacks.map((occurrence) => ({
      procedureRef: requirePresentationProcedureRef(
        allocation.procedureRefs,
        occurrence,
      ),
      kind: "multiattack" as const,
      label: occurrence.source.name,
    })),
    ...allocation.occurrences.bonusActions.map((occurrence) => ({
      procedureRef: requirePresentationProcedureRef(
        allocation.procedureRefs,
        occurrence,
      ),
      kind: "bonusActionOption" as const,
      label: occurrence.source.name,
    })),
  ];
}

function requirePresentationProcedureRef(
  refs: ReturnType<typeof statBlockPresentationAllocation>["procedureRefs"],
  occurrence: Parameters<typeof refs.get>[0],
): import("./identity.ts").BattleStatBlockProcedureExecutionRef {
  const procedureRef = refs.get(occurrence);
  if (procedureRef === undefined) {
    throw new Error(
      "Every admitted Stat Block presentation occurrence must have an allocated ref.",
    );
  }
  return procedureRef;
}

export function attackActionOptionPresentationName(
  state: BattleState,
  context: BattleRuntimeContext,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): Result.Result<string, AttackPresentationJoinIssue> {
  if (attack.kind === "unarmedStrike") {
    return Result.succeed(attackActionOptionName(attack));
  }
  if (attack.kind === "weapon") {
    const characterContext = context.characters.get(actorId);
    if (characterContext === undefined) {
      return Result.fail({
        tag: "attackPresentationJoinIssue",
        reason: "characterContextMissing",
      });
    }
    const source = characterWeaponPresentationSource(
      characterContext,
      attack.weapon.weaponUnitId,
    );
    if (Result.isFailure(source)) {
      return Result.fail({
        tag: "attackPresentationJoinIssue",
        reason: "weaponPresentationMissing",
      });
    }
    const actor = state.combatants.get(actorId);
    const baseAttack =
      actor?.origin.kind === "character"
        ? actor.origin.attack?.weapon.weaponUnitId ===
          attack.weapon.weaponUnitId
          ? actor.origin.attack
          : actor.origin.offHandAttack
        : undefined;
    const suffixes = [
      ...(baseAttack != null && baseAttack.ability !== attack.ability
        ? [abilityPresentationName(attack.ability)]
        : []),
      ...(attack.weapon.damage.kind === "dice" &&
      (baseAttack?.damageTypeChoices !== undefined ||
        attack.damageTypeChoices !== undefined ||
        (source.success.damage.kind === "dice" &&
          source.success.damage.damageType !== attack.weapon.damage.damageType))
        ? [attack.weapon.damage.damageType]
        : []),
    ];
    return Result.succeed(
      suffixes.length === 0
        ? source.success.name
        : `${source.success.name} (${suffixes.join(", ")})`,
    );
  }
  const presentations = statBlockProcedurePresentationsForActor(
    state,
    context,
    actorId,
  );
  if (presentations === null) {
    return Result.fail({
      tag: "attackPresentationJoinIssue",
      reason: "statBlockAdmissionMissing",
    });
  }
  const presentation = presentations.find(
    (candidate) =>
      candidate.kind === "attack" &&
      candidate.procedureRef === attack.procedureRef,
  );
  return presentation?.kind === "attack"
    ? Result.succeed(presentation.name)
    : Result.fail({
        tag: "attackPresentationJoinIssue",
        reason: "statBlockPresentationMissing",
      });
}

function abilityPresentationName(ability: Ability): string {
  return Match.value(ability).pipe(
    Match.when("str", () => "Strength"),
    Match.when("dex", () => "Dexterity"),
    Match.when("con", () => "Constitution"),
    Match.when("int", () => "Intelligence"),
    Match.when("wis", () => "Wisdom"),
    Match.when("cha", () => "Charisma"),
    Match.exhaustive,
  );
}

export function statBlockProcedurePresentationsForActor(
  state: BattleState,
  context: BattleRuntimeContext,
  actorId: CombatantId,
): readonly StatBlockProcedurePresentation[] | null {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind === "statBlock") {
    return context.statBlocks.get(actorId)?.procedures ?? null;
  }
  const activeForm = activeDruidWildShape(actor);
  return activeForm === null
    ? null
    : statBlockProcedurePresentations(activeForm.admission);
}
