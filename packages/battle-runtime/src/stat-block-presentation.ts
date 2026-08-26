import type { SupportedAttackActionOption } from "./battle-action-options.ts";
import { UNARMED_STRIKE_NAME } from "./battle-action-options.ts";
import type {
  AttackPresentationJoinIssue,
  BattleState,
} from "./battle-state-execution.ts";
import {
  characterWeaponPresentationSource,
  type BattleStatBlockPresentationSource,
  type BattleRuntimeContext,
} from "./battle-runtime-context.ts";
import { activeDruidWildShape } from "./battle-reducer/druid-wild-shape.ts";
import { attackActionOptionName } from "./battle-reducer/statblock-attacks.ts";
import type { CombatantId } from "./identity.ts";
import * as Either from "effect/Either";
import { Match } from "effect";
import type { Ability } from "@dnd/shared/game-facts";
import type { StatBlockProjectionIssue } from "./stat-block-execution-state.ts";
import type {
  StatBlockExecutionState,
  StatBlockActionProjectionShape,
} from "./stat-block-execution-state.ts";

export type StatBlockProcedurePresentation =
  import("./battle-runtime-context.ts").BattleStatBlockProcedurePresentation;

export type StatBlockPresentationAdmission = {
  readonly execution: StatBlockExecutionState;
  /** Missing authored context is a valid boundary state with no labels to join. */
  readonly presentation?: BattleStatBlockPresentationSource;
};

function procedurePresentationKey(section: string, ordinal: number): string {
  return `${section}:${ordinal}`;
}

export function statBlockProjectionIssuesForActor(
  state: BattleState,
  context: BattleRuntimeContext,
  actorId: CombatantId,
): readonly StatBlockProjectionIssue[] | null {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock") return null;
  const presentation = context.statBlocks.get(actorId);
  return presentation === undefined
    ? null
    : statBlockProjectionIssues(presentation, actor?.origin.execution);
}

function statBlockProjectionIssues(
  presentation: BattleStatBlockPresentationSource,
  execution: StatBlockExecutionState | undefined,
): readonly StatBlockProjectionIssue[] {
  if (execution === undefined) return [];
  const admitted = new Map(
    execution.procedureBindings.flatMap((binding) =>
      binding.procedure.kind === "unarmedStrike"
        ? []
        : [
            [
              procedurePresentationKey(
                binding.procedure.section,
                binding.procedure.procedureOrdinal,
              ),
              binding.procedure,
            ] as const,
          ],
    ),
  );
  type ActionIssue = Extract<
    StatBlockProjectionIssue,
    { readonly source: { readonly kind: "action" } }
  >;
  return presentation.orderedProcedures.flatMap(
    (entry): readonly ActionIssue[] => {
      if (entry.kind === "textOnly") {
        return [
          {
            tag: "statBlockProjectionIssue" as const,
            source: {
              kind: "action" as const,
              section: entry.section,
              shape: "special" as const,
              nonExecutableReason: entry.reason,
            },
          },
        ];
      }
      const admittedProcedure = admitted.get(
        procedurePresentationKey(entry.section, entry.procedureOrdinal),
      );
      if (admittedProcedure?.kind === "unsupported") {
        return [
          {
            tag: "statBlockProjectionIssue" as const,
            source: {
              kind: "action" as const,
              section: entry.section,
              shape: projectionShape(entry.kind),
              nonExecutableReason: "unsupportedActionShape" as const,
            },
          },
        ];
      }
      if (
        admittedProcedure !== undefined &&
        admittedProcedure.kind ===
          (entry.kind === "bonusActionOption"
            ? "bonusActionOption"
            : entry.kind)
      ) {
        return [];
      }
      return [
        {
          tag: "statBlockProjectionIssue" as const,
          source: {
            kind: "action" as const,
            section: entry.section,
            shape: projectionShape(entry.kind),
            nonExecutableReason: "unsupportedActionShape" as const,
          },
        },
      ];
    },
  );
}

function projectionShape(
  kind: Exclude<
    BattleStatBlockPresentationSource["orderedProcedures"][number]["kind"],
    "textOnly"
  >,
): StatBlockActionProjectionShape {
  return Match.value(kind).pipe(
    Match.when("attack", () => "attack" as const),
    Match.when("multiattack", () => "multiattack" as const),
    Match.when("bonusActionOption", () => "actionOption" as const),
    Match.when("save", () => "save" as const),
    Match.when("support", () => "support" as const),
    Match.when("spellcasting", () => "special" as const),
    Match.exhaustive,
  );
}

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

export function statBlockProcedurePresentations(
  admission: StatBlockPresentationAdmission,
): readonly StatBlockProcedurePresentation[] {
  if (admission.presentation === undefined) return [];
  const labels = new Map(
    admission.presentation.orderedProcedures.map((entry) => [
      procedurePresentationKey(entry.section, entry.procedureOrdinal),
      entry,
    ]),
  );
  const labelFor = (section: string, ordinal: number): string =>
    labels.get(procedurePresentationKey(section, ordinal))?.name ??
    "Unsupported Stat Block procedure";
  return admission.execution.procedureBindings.flatMap(
    (binding): readonly StatBlockProcedurePresentation[] =>
      Match.value(binding.procedure).pipe(
        Match.when({ kind: "unarmedStrike" }, () => [
          {
            procedureRef: binding.procedureRef,
            kind: "attack" as const,
            name: UNARMED_STRIKE_NAME,
          },
        ]),
        Match.when({ kind: "attack" }, (procedure) => [
          {
            procedureRef: binding.procedureRef,
            kind: "attack" as const,
            name: labelFor(procedure.section, procedure.procedureOrdinal),
          },
        ]),
        Match.when({ kind: "multiattack" }, (procedure) => [
          {
            procedureRef: binding.procedureRef,
            kind: "multiattack" as const,
            label: labelFor("actions", procedure.procedureOrdinal),
          },
        ]),
        Match.when({ kind: "bonusActionOption" }, (procedure) => [
          {
            procedureRef: binding.procedureRef,
            kind: "bonusActionOption" as const,
            label: labelFor("bonusActions", procedure.procedureOrdinal),
          },
        ]),
        Match.when({ kind: "unsupported" }, (procedure) => [
          {
            procedureRef: binding.procedureRef,
            kind: "unsupported" as const,
            label: labelFor(procedure.section, procedure.procedureOrdinal),
            reason: procedure.reason,
          },
        ]),
        Match.exhaustive,
      ),
  );
}

export function attackActionOptionPresentationName(
  state: BattleState,
  context: BattleRuntimeContext,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): Either.Either<string, AttackPresentationJoinIssue> {
  if (attack.kind === "unarmedStrike") {
    return Either.right(attackActionOptionName(attack));
  }
  if (attack.kind === "weapon") {
    const characterContext = context.characters.get(actorId);
    if (characterContext === undefined) {
      return Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "characterContextMissing",
      });
    }
    const source = characterWeaponPresentationSource(
      characterContext,
      attack.weapon.weaponUnitId,
    );
    if (Either.isLeft(source)) {
      return Either.left({
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
      ...(baseAttack !== undefined && baseAttack.ability !== attack.ability
        ? [abilityPresentationName(attack.ability)]
        : []),
      ...(attack.weapon.damage.kind === "dice" &&
      (baseAttack?.damageTypeChoices !== undefined ||
        attack.damageTypeChoices !== undefined ||
        (source.right.damage.kind === "dice" &&
          source.right.damage.damageType !== attack.weapon.damage.damageType))
        ? [attack.weapon.damage.damageType]
        : []),
    ];
    return Either.right(
      suffixes.length === 0
        ? source.right.name
        : `${source.right.name} (${suffixes.join(", ")})`,
    );
  }
  const presentations = statBlockProcedurePresentationsForActor(
    state,
    context,
    actorId,
  );
  if (presentations === null) {
    return Either.left({
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
    ? Either.right(presentation.name)
    : Either.left({
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
    const presentation = context.statBlocks.get(actorId);
    return presentation === undefined
      ? null
      : statBlockProcedurePresentations({
          execution: actor.origin.execution,
          presentation,
        });
  }
  const activeForm = activeDruidWildShape(actor);
  if (activeForm === null) return null;
  const presentation = context.characters
    .get(actorId)
    ?.druidWildShapeFormPresentations?.get(
      activeForm.admission.execution.scopeRef,
    );
  return presentation === undefined
    ? null
    : statBlockProcedurePresentations({
        execution: activeForm.admission.execution,
        presentation,
      });
}
