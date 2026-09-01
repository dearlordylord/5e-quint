import type { SupportedAttackActionOption } from "./battle-action-options.ts";
import { UNARMED_STRIKE_NAME } from "./battle-action-options.ts";
import type {
  AttackPresentationJoinIssue,
  BattleState,
  CharacterBattleCreatureState,
} from "./battle-state-execution.ts";
import {
  characterWeaponPresentationSource,
  type BattleStatBlockPresentationSource,
  type BattleRuntimeContext,
} from "./battle-runtime-context.ts";
import { activeDruidWildShape } from "./battle-reducer/druid-wild-shape.ts";
import { attackActionOptionName } from "./battle-reducer/statblock-attacks.ts";
import type { CombatantId } from "./identity.ts";
import { Match, Result } from "effect";
import type { Ability } from "@dnd/shared/game-facts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { StatBlockProcedureOrdinal } from "../../surface/src/surface/stat-block-types.ts";
import type { WeaponRecord } from "@dnd/surface/surface/types";
import type { StatBlockProjectionIssue } from "./stat-block-execution-state.ts";
import { supportedStatBlockTraitAttackRollModes } from "./statblock-action-execution-support.ts";
import type {
  StatBlockExecutionState,
  StatBlockActionProjectionShape,
  StatBlockProcedure,
  StatBlockProcedureBindingFor,
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
  { readonly kind: "unarmedStrike" | "effectOccurrenceSource" }
>;

export type StatBlockProcedurePresentationResult = Result.Result<
  readonly StatBlockProcedurePresentation[],
  ReadonlyNonEmptyArray<StatBlockProcedurePresentationJoinIssue>
>;

type CharacterWeaponAttackActionOption = Extract<
  SupportedAttackActionOption,
  { readonly kind: "weapon" }
>;

type CharacterBaseAttack = NonNullable<
  | CharacterBattleCreatureState["origin"]["attack"]
  | CharacterBattleCreatureState["origin"]["offHandAttack"]
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
    const ordinals =
      index.get(value.section) ?? new Map<StatBlockProcedureOrdinal, T>();
    index.set(value.section, ordinals);
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
  execution: StatBlockExecutionState,
): readonly StatBlockProjectionIssue[] {
  const admitted = procedureCoordinateIndex(
    execution.procedureBindings.flatMap((binding) =>
      binding.procedure.kind === "unarmedStrike" ||
      binding.procedure.kind === "effectOccurrenceSource"
        ? []
        : [binding.procedure],
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
  const traitIssues = presentation.traits.flatMap(
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
    Match.when("spellcasting", () => "spellcasting" as const),
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
    : (context.characters.get(combatantId)?.displayName ?? null);
}

export function statBlockProcedurePresentations(
  admission: StatBlockPresentationAdmission,
): StatBlockProcedurePresentationResult {
  if (admission.presentation === undefined) {
    const issues = admission.execution.procedureBindings.flatMap((binding) =>
      binding.procedure.kind === "unarmedStrike" ||
      binding.procedure.kind === "effectOccurrenceSource"
        ? []
        : [
            {
              tag: "statBlockProcedurePresentationJoinIssue" as const,
              reason: "missingPresentation" as const,
              section: binding.procedure.section,
              procedureOrdinal: binding.procedure.procedureOrdinal,
              executionKind: binding.procedure.kind,
            },
          ],
    );
    const [firstIssue, ...remainingIssues] = issues;
    return firstIssue === undefined
      ? Result.succeed([])
      : Result.fail([firstIssue, ...remainingIssues]);
  }
  const labels = procedureCoordinateIndex(
    admission.presentation.orderedProcedures,
  );
  const issues: StatBlockProcedurePresentationJoinIssue[] = [];
  const presentations: StatBlockProcedurePresentation[] = [];
  for (const binding of admission.execution.procedureBindings) {
    if (!isPresentedStatBlockProcedureBinding(binding)) continue;
    const joined = statBlockProcedurePresentationForBinding(binding, labels);
    if (Result.isFailure(joined)) {
      issues.push(joined.failure);
    } else {
      presentations.push(joined.success);
    }
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? Result.succeed(presentations)
    : Result.fail([firstIssue, ...remainingIssues]);
}

function isPresentedStatBlockProcedureBinding(
  binding: StatBlockExecutionState["procedureBindings"][number],
): binding is StatBlockProcedureBindingFor<
  Exclude<StatBlockProcedure, { readonly kind: "effectOccurrenceSource" }>
> {
  return binding.procedure.kind !== "effectOccurrenceSource";
}

function statBlockProcedurePresentationForBinding(
  binding: StatBlockProcedureBindingFor<
    Exclude<StatBlockProcedure, { readonly kind: "effectOccurrenceSource" }>
  >,
  labels: ProcedureCoordinateIndex<
    BattleStatBlockPresentationSource["orderedProcedures"][number]
  >,
): Result.Result<
  StatBlockProcedurePresentation,
  StatBlockProcedurePresentationJoinIssue
> {
  return Match.value(binding.procedure).pipe(
    Match.when({ kind: "unarmedStrike" }, () =>
      Result.succeed({
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
    Match.when({ kind: "spellcasting" }, (procedure) =>
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
): Result.Result<
  StatBlockProcedurePresentation,
  StatBlockProcedurePresentationJoinIssue
> {
  const entry = procedureAtCoordinate(labels, procedure);
  if (entry === undefined) {
    return Result.fail({
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
    Match.when({ kind: "spellcasting" }, () => "spellcasting" as const),
    Match.exhaustive,
  );
  if (entry.kind !== expectedKind) {
    return Result.fail({
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
      Result.succeed({
        procedureRef,
        kind: "attack" as const,
        name: entry.name,
      }),
    ),
    Match.when({ kind: "multiattack" }, () =>
      Result.succeed({
        procedureRef,
        kind: "multiattack" as const,
        label: entry.name,
      }),
    ),
    Match.when({ kind: "bonusActionOption" }, () =>
      Result.succeed({
        procedureRef,
        kind: "bonusActionOption" as const,
        label: entry.name,
      }),
    ),
    Match.when({ kind: "spellcasting" }, () =>
      Result.succeed({
        procedureRef,
        kind: "spellcasting" as const,
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
    const baseAttack = characterWeaponBaseAttack(
      state,
      actorId,
      attack.weapon.weaponUnitId,
    );
    const suffixes = characterWeaponPresentationSuffixes(
      attack,
      baseAttack,
      source.success,
    );
    return Result.succeed(
      formatWeaponPresentationName(source.success.name, suffixes),
    );
  }
  return statBlockAttackPresentationName(state, context, actorId, attack);
}

function characterWeaponBaseAttack(
  state: BattleState,
  actorId: CombatantId,
  weaponUnitId: CharacterWeaponAttackActionOption["weapon"]["weaponUnitId"],
): CharacterBaseAttack | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  return actor.origin.attack?.weapon.weaponUnitId === weaponUnitId
    ? actor.origin.attack
    : actor.origin.offHandAttack;
}

function characterWeaponPresentationSuffixes(
  attack: CharacterWeaponAttackActionOption,
  baseAttack: CharacterBaseAttack | undefined,
  source: WeaponRecord,
): readonly string[] {
  const abilitySuffix =
    baseAttack !== undefined && baseAttack.ability !== attack.ability
      ? [abilityPresentationName(attack.ability)]
      : [];
  return [
    ...abilitySuffix,
    ...characterWeaponDamageTypeSuffix(attack, baseAttack, source),
  ];
}

function characterWeaponDamageTypeSuffix(
  attack: CharacterWeaponAttackActionOption,
  baseAttack: CharacterBaseAttack | undefined,
  source: WeaponRecord,
): readonly string[] {
  if (attack.weapon.damage.kind !== "dice") return [];
  const sourceDamageTypeDiffers =
    source.damage.kind === "dice" &&
    source.damage.damageType !== attack.weapon.damage.damageType;
  return baseAttack?.damageTypeChoices !== undefined ||
    attack.damageTypeChoices !== undefined ||
    sourceDamageTypeDiffers
    ? [attack.weapon.damage.damageType]
    : [];
}

function formatWeaponPresentationName(
  name: string,
  suffixes: readonly string[],
): string {
  return suffixes.length === 0 ? name : `${name} (${suffixes.join(", ")})`;
}

function statBlockAttackPresentationName(
  state: BattleState,
  context: BattleRuntimeContext,
  actorId: CombatantId,
  attack: Extract<
    SupportedAttackActionOption,
    { readonly kind: "statBlockAttack" }
  >,
): Result.Result<string, AttackPresentationJoinIssue> {
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
  if (Result.isFailure(presentations)) {
    return Result.fail({
      tag: "attackPresentationJoinIssue",
      reason: "statBlockProcedurePresentationJoin",
      issues: presentations.failure,
    });
  }
  const presentation = presentations.success.find(
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
