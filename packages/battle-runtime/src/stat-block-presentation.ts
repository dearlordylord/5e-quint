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
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { StatBlockProcedureOrdinal } from "@dnd/surface/surface/types";
import type { StatBlockProjectionIssue } from "./stat-block-execution-state.ts";
import { supportedStatBlockTraitAttackRollModes } from "./statblock-action-execution-support.ts";
import type {
  StatBlockExecutionState,
  StatBlockActionProjectionShape,
  StatBlockProcedure,
} from "./stat-block-execution-state.ts";
import type {
  StatBlockActionProjectionSection,
  StatBlockProcedurePresentationJoinIssue,
} from "./stat-block-presentation-contract.ts";

export type StatBlockProcedurePresentation =
  import("./battle-runtime-context.ts").BattleStatBlockProcedurePresentation;

export type StatBlockPresentationAdmission = {
  readonly execution: StatBlockExecutionState;
  /** Missing authored context is a valid boundary state with no labels to join. */
  readonly presentation?: BattleStatBlockPresentationSource;
};

type ExecutableStatBlockProcedure = Exclude<
  StatBlockProcedure,
  { readonly kind: "unarmedStrike" }
>;

export type StatBlockProcedurePresentationResult = Either.Either<
  readonly StatBlockProcedurePresentation[],
  ReadonlyNonEmptyArray<StatBlockProcedurePresentationJoinIssue>
>;

type ProcedureCoordinate = {
  readonly section: StatBlockActionProjectionSection;
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
};

type ProcedureCoordinateIndex<T extends ProcedureCoordinate> = ReadonlyMap<
  StatBlockActionProjectionSection,
  ReadonlyMap<StatBlockProcedureOrdinal, T>
>;

function procedureCoordinateIndex<T extends ProcedureCoordinate>(
  values: readonly T[],
): ProcedureCoordinateIndex<T> {
  const index = new Map<
    StatBlockActionProjectionSection,
    Map<StatBlockProcedureOrdinal, T>
  >();
  for (const value of values) {
    let ordinals = index.get(value.section);
    if (ordinals === undefined) {
      ordinals = new Map();
      index.set(value.section, ordinals);
    }
    ordinals.set(value.procedureOrdinal, value);
  }
  return index;
}

function procedureAtCoordinate<T extends ProcedureCoordinate>(
  index: ProcedureCoordinateIndex<T>,
  coordinate: ProcedureCoordinate,
): T | undefined {
  return index.get(coordinate.section)?.get(coordinate.procedureOrdinal);
}

export function statBlockProjectionIssuesForActor(
  state: BattleState,
  context: BattleRuntimeContext,
  actorId: CombatantId,
): readonly StatBlockProjectionIssue[] | null {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind === "statBlock") {
    const presentation = context.statBlocks.get(actorId);
    return presentation === undefined
      ? null
      : statBlockProjectionIssues(presentation, actor.origin.execution);
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
    : statBlockProjectionIssues(presentation, activeForm.admission.execution);
}

function statBlockProjectionIssues(
  presentation: BattleStatBlockPresentationSource,
  execution: StatBlockExecutionState | undefined,
): readonly StatBlockProjectionIssue[] {
  if (execution === undefined) return [];
  const admitted = procedureCoordinateIndex(
    execution.procedureBindings.flatMap((binding) =>
      binding.procedure.kind === "unarmedStrike" ? [] : [binding.procedure],
    ),
  );
  type TraitIssue = Extract<
    StatBlockProjectionIssue,
    { readonly source: { readonly kind: "trait" } }
  >;
  type ActionIssue = Extract<
    StatBlockProjectionIssue,
    { readonly source: { readonly kind: "action" } }
  >;
  const traitIssues = (presentation.traits ?? []).flatMap(
    (trait): readonly TraitIssue[] => {
      const nonExecutableReason =
        trait.effect === undefined
          ? "textOnlyTrait"
          : supportedStatBlockTraitAttackRollModes([trait]) === undefined
            ? "unsupportedTraitEffect"
            : undefined;
      return nonExecutableReason === undefined
        ? []
        : [
            {
              tag: "statBlockProjectionIssue" as const,
              source: {
                kind: "trait" as const,
                nonExecutableReason,
              },
            },
          ];
    },
  );
  const actionIssues = presentation.orderedProcedures.flatMap(
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
      const admittedProcedure = procedureAtCoordinate(admitted, entry);
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
  return [...traitIssues, ...actionIssues];
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
): StatBlockProcedurePresentationResult {
  if (admission.presentation === undefined) return Either.right([]);
  const labels = procedureCoordinateIndex(
    admission.presentation.orderedProcedures,
  );
  const issues: StatBlockProcedurePresentationJoinIssue[] = [];
  const presentations: StatBlockProcedurePresentation[] = [];
  for (const binding of admission.execution.procedureBindings) {
    const joined = statBlockProcedurePresentationForBinding(binding, labels);
    if (Either.isLeft(joined)) {
      issues.push(joined.left);
    } else {
      presentations.push(joined.right);
    }
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? Either.right(presentations)
    : Either.left([firstIssue, ...remainingIssues]);
}

function statBlockProcedurePresentationForBinding(
  binding: StatBlockExecutionState["procedureBindings"][number],
  labels: ProcedureCoordinateIndex<
    BattleStatBlockPresentationSource["orderedProcedures"][number]
  >,
): Either.Either<
  StatBlockProcedurePresentation,
  StatBlockProcedurePresentationJoinIssue
> {
  return Match.value(binding.procedure).pipe(
    Match.when({ kind: "unarmedStrike" }, () =>
      Either.right({
        procedureRef: binding.procedureRef,
        kind: "attack" as const,
        name: UNARMED_STRIKE_NAME,
      }),
    ),
    Match.when({ kind: "attack" }, (procedure) =>
      joinedExecutableStatBlockProcedurePresentation(
        binding.procedureRef,
        procedure,
        labels,
      ),
    ),
    Match.when({ kind: "multiattack" }, (procedure) =>
      joinedExecutableStatBlockProcedurePresentation(
        binding.procedureRef,
        procedure,
        labels,
      ),
    ),
    Match.when({ kind: "bonusActionOption" }, (procedure) =>
      joinedExecutableStatBlockProcedurePresentation(
        binding.procedureRef,
        procedure,
        labels,
      ),
    ),
    Match.exhaustive,
  );
}

function joinedExecutableStatBlockProcedurePresentation(
  procedureRef: StatBlockExecutionState["procedureBindings"][number]["procedureRef"],
  procedure: ExecutableStatBlockProcedure,
  labels: ProcedureCoordinateIndex<
    BattleStatBlockPresentationSource["orderedProcedures"][number]
  >,
): Either.Either<
  StatBlockProcedurePresentation,
  StatBlockProcedurePresentationJoinIssue
> {
  const entry = procedureAtCoordinate(labels, procedure);
  if (entry === undefined) {
    return Either.left({
      tag: "statBlockProcedurePresentationJoinIssue",
      reason: "missingPresentation",
      section: procedure.section,
      procedureOrdinal: procedure.procedureOrdinal,
      executionKind: procedure.kind,
    });
  }
  const expectedKind = Match.value(procedure).pipe(
    Match.when({ kind: "attack" }, () => "attack" as const),
    Match.when({ kind: "multiattack" }, () => "multiattack" as const),
    Match.when(
      { kind: "bonusActionOption" },
      () => "bonusActionOption" as const,
    ),
    Match.exhaustive,
  );
  if (entry.kind !== expectedKind) {
    return Either.left({
      tag: "statBlockProcedurePresentationJoinIssue",
      reason: "presentationKindMismatch",
      section: procedure.section,
      procedureOrdinal: procedure.procedureOrdinal,
      executionKind: procedure.kind,
      presentationKind: entry.kind,
    });
  }
  return Match.value(procedure).pipe(
    Match.when({ kind: "attack" }, () =>
      Either.right({ procedureRef, kind: "attack" as const, name: entry.name }),
    ),
    Match.when({ kind: "multiattack" }, () =>
      Either.right({
        procedureRef,
        kind: "multiattack" as const,
        label: entry.name,
      }),
    ),
    Match.when({ kind: "bonusActionOption" }, () =>
      Either.right({
        procedureRef,
        kind: "bonusActionOption" as const,
        label: entry.name,
      }),
    ),
    Match.exhaustive,
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
  if (Either.isLeft(presentations)) {
    return Either.left({
      tag: "attackPresentationJoinIssue",
      reason: "statBlockProcedurePresentationJoin",
      issues: presentations.left,
    });
  }
  const presentation = presentations.right.find(
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
): StatBlockProcedurePresentationResult | null {
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
