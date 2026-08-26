import * as Either from "effect/Either";
import type { ReadonlyNonEmptyArray, Size } from "@dnd/shared/types";
import type {
  CreatureAttackRollMechanics,
  StatBlockProcedureEntry,
  StatBlockRecord,
  StandaloneStatBlock,
} from "@dnd/surface/surface/types";
import {
  creatureAttackRollMechanicsAreSupported,
  supportedStatBlockTraitAttackRollModes,
} from "./statblock-action-execution-support.ts";
import {
  SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS,
  type SupportedStatBlockBonusActionStandardAction,
} from "./battle-reducer/battle-runtime-protocol.ts";
import type {
  BattleStatBlockAuthoredProcedurePresentation,
  BattleStatBlockPresentationSource,
} from "./battle-runtime-context.ts";
import type {
  BattleStatBlockExecutionSource,
  BattleStatBlockRuntimeProcedure,
  BattleStatBlockRuntimeResource,
  BattleStatBlockRuntimeSpeed,
  BattleStatBlockRuntimeSense,
  StatBlockActionProjectionSection,
} from "./stat-block-execution-state.ts";
import type { StatBlockTraitAttackRollMode } from "./battle-action-options.ts";

export type BattleStatBlockProjectionFailure = {
  readonly tag: "battleStatBlockProjectionFailure";
  readonly reason:
    | "nonLiteralSize"
    | "nonLiteralArmorClass"
    | "nonLiteralHitPoints"
    | "nonLiteralSpeed"
    | "unsupportedProcedureBinding";
  readonly procedureOrdinal?: number;
  readonly section?: StatBlockActionProjectionSection;
};

export type AuthoredStatBlockProjection = {
  readonly runtime: BattleStatBlockExecutionSource;
  readonly presentation: BattleStatBlockPresentationSource;
};

/**
 * The catalog admission boundary. The authored record is consumed once;
 * execution receives only literal mechanics and ordinal bindings while the
 * presentation companion retains source identity and exact prose.
 */
export function projectAuthoredStatBlock(
  record: StatBlockRecord,
): Either.Either<
  AuthoredStatBlockProjection,
  BattleStatBlockProjectionFailure
> {
  const source = record.statBlock;
  const size = literalSize(source.size);
  if (size === null) return Either.left(failure("nonLiteralSize"));
  if (source.ac.value.kind !== "literal") {
    return Either.left(failure("nonLiteralArmorClass"));
  }
  if (source.hp.kind !== "literal") {
    return Either.left(failure("nonLiteralHitPoints"));
  }
  const speeds = source.speeds.map(runtimeSpeed);
  if (speeds.some((speed) => speed === null)) {
    return Either.left(failure("nonLiteralSpeed"));
  }
  const runtimeProcedures = runtimeProcedureBindings(source);
  const runtime: BattleStatBlockExecutionSource = {
    id: record.id,
    challengeRating: record.challengeRating,
    statBlock: {
      size,
      creatureType: source.creatureType,
      ac: source.ac.value,
      hp: source.hp,
      speeds: nonEmptyRuntimeValues(speeds),
      abilityScores: source.abilityScores,
      initiativeModifier: source.initiative.modifier,
      initiativeScore: source.initiative.score,
      passivePerception: source.passivePerception,
      communication: source.communication,
      ...(source.savingThrowModifiers === undefined
        ? {}
        : { savingThrowModifiers: source.savingThrowModifiers }),
      ...(source.skillModifiers === undefined
        ? {}
        : { skillModifiers: source.skillModifiers }),
      ...(source.saveProficiencies === undefined
        ? {}
        : { saveProficiencies: source.saveProficiencies }),
      ...(source.vulnerabilities === undefined
        ? {}
        : { vulnerabilities: source.vulnerabilities }),
      ...(source.resistances === undefined
        ? {}
        : { resistances: source.resistances }),
      ...(source.immunities === undefined
        ? {}
        : { immunities: source.immunities }),
      ...(source.senses === undefined
        ? {}
        : { senses: source.senses.map(runtimeSense) }),
    },
    procedures: runtimeProcedures,
    ...(source.resources === undefined
      ? {}
      : { resources: source.resources.map(runtimeResource) }),
    ...(source.legendaryActions === undefined
      ? {}
      : { legendaryActionUses: source.legendaryActions.uses }),
  };
  return Either.right({
    runtime,
    presentation: presentationProjection(record),
  });
}

function runtimeProcedureBindings(
  source: StandaloneStatBlock,
): readonly BattleStatBlockRuntimeProcedure[] {
  const bindings: BattleStatBlockRuntimeProcedure[] = [];
  const sections: readonly [
    StatBlockActionProjectionSection,
    readonly StatBlockProcedureEntry[] | undefined,
  ][] = [
    ["actions", source.actions],
    ["bonusActions", source.bonusActions],
    ["reactions", source.reactions],
    ["legendaryActions", source.legendaryActions?.entries],
  ];

  for (const [section, entries] of sections) {
    for (const entry of entries ?? []) {
      if (entry.kind !== "executable") continue;
      const resourceRefs = procedureResourceRefs(entry);
      const procedure = entry.procedure;
      if (procedure.kind === "attack_roll") {
        const attack = authoredAttackMechanics(procedure);
        if (
          (section === "actions" || section === "legendaryActions") &&
          attack !== null &&
          creatureAttackRollMechanicsAreSupported(attack)
        ) {
          bindings.push({
            kind: "attack",
            section,
            procedureOrdinal: entry.procedureOrdinal,
            attack,
            resourceRefs,
            ...traitModes(source),
          });
        }
        continue;
      }
      if (procedure.kind === "multiattack" && section === "actions") {
        // Dispatches are checked against admitted action attacks after all
        // entries are projected. This is ordinal-only and duplicate-name safe.
        bindings.push({
          kind: "multiattack",
          section,
          procedureOrdinal: entry.procedureOrdinal,
          dispatches: nonEmptyRuntimeValues(
            procedure.dispatches.map((dispatch) => ({
              procedureOrdinal: dispatch.procedureOrdinal,
              count: dispatch.count.value,
            })),
          ),
          resourceRefs,
        });
        continue;
      }
      if (procedure.kind === "action_option" && section === "bonusActions") {
        const options = procedure.options.filter(isSupportedBonusAction);
        if (options.length === procedure.options.length) {
          bindings.push({
            kind: "bonusActionOption",
            section,
            procedureOrdinal: entry.procedureOrdinal,
            standardActions: nonEmptyRuntimeValues(options),
            resourceRefs,
          });
        }
      }
    }
  }

  const admittedActions = new Set(
    bindings
      .filter(
        (
          binding,
        ): binding is Extract<
          BattleStatBlockRuntimeProcedure,
          { readonly kind: "attack" }
        > => binding.kind === "attack" && binding.section === "actions",
      )
      .map((binding) => binding.procedureOrdinal),
  );
  return bindings.filter(
    (binding) =>
      binding.kind !== "multiattack" ||
      binding.dispatches.every((dispatch) =>
        admittedActions.has(dispatch.procedureOrdinal),
      ),
  );
}

function presentationProjection(
  record: StatBlockRecord,
): BattleStatBlockPresentationSource {
  return {
    displayName: record.name,
    orderedProcedures: authoredProcedurePresentations(record.statBlock),
  };
}

function authoredProcedurePresentations(
  source: StandaloneStatBlock,
): readonly BattleStatBlockAuthoredProcedurePresentation[] {
  const sections: readonly [
    StatBlockActionProjectionSection,
    readonly StatBlockProcedureEntry[] | undefined,
  ][] = [
    ["actions", source.actions],
    ["bonusActions", source.bonusActions],
    ["reactions", source.reactions],
    ["legendaryActions", source.legendaryActions?.entries],
  ];
  return sections.flatMap(([section, entries]) =>
    (entries ?? []).map((entry) => {
      if (entry.kind === "textOnly") {
        return {
          section,
          procedureOrdinal: entry.procedureOrdinal,
          name: entry.name,
          description: entry.description,
          kind: "textOnly" as const,
          reason: entry.reason,
          resourceRefs: procedureResourceRefs(entry),
        };
      }
      const procedure = entry.procedure;
      return {
        section,
        procedureOrdinal: entry.procedureOrdinal,
        name: procedure.name,
        ...(!("description" in procedure) || procedure.description === undefined
          ? {}
          : { description: procedure.description }),
        kind: runtimePresentationKind(procedure.kind),
        resourceRefs: procedureResourceRefs(entry),
      };
    }),
  );
}

function authoredAttackMechanics(
  procedure: Extract<
    Extract<
      StatBlockProcedureEntry,
      { readonly kind: "executable" }
    >["procedure"],
    { readonly kind: "attack_roll" }
  >,
): CreatureAttackRollMechanics {
  const {
    kind: _kind,
    name: _name,
    description: _description,
    ...attack
  } = procedure;
  return attack;
}

function procedureResourceRefs(
  entry: StatBlockProcedureEntry,
): readonly number[] {
  const refs =
    entry.resourceRefs.kind === "none" ? [] : [...entry.resourceRefs.ordinals];
  if (entry.kind === "executable" && entry.procedure.kind === "spellcasting") {
    return [
      ...refs,
      ...entry.procedure.groups.flatMap((group) =>
        group.resourceRefs.kind === "none" ? [] : group.resourceRefs.ordinals,
      ),
    ];
  }
  return refs;
}

function runtimeResource(
  resource: NonNullable<StandaloneStatBlock["resources"]>[number],
): BattleStatBlockRuntimeResource {
  return {
    ordinal: resource.ordinal,
    ownership: resource.ownership,
    limit: resource.limit,
  };
}

function runtimePresentationKind(
  kind: Extract<
    StatBlockProcedureEntry,
    { readonly kind: "executable" }
  >["procedure"]["kind"],
): Exclude<BattleStatBlockAuthoredProcedurePresentation["kind"], "textOnly"> {
  switch (kind) {
    case "attack_roll":
      return "attack";
    case "multiattack":
      return "multiattack";
    case "action_option":
      return "bonusActionOption";
    case "save":
      return "save";
    case "support":
      return "support";
    case "spellcasting":
      return "spellcasting";
  }
}

function isSupportedBonusAction(
  option: string,
): option is SupportedStatBlockBonusActionStandardAction {
  return SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS.includes(
    option as SupportedStatBlockBonusActionStandardAction,
  );
}

function traitModes(source: StandaloneStatBlock): {
  readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
} {
  const modes = supportedStatBlockTraitAttackRollModes(source.traits);
  return modes === undefined ? {} : { traitAttackRollModes: modes };
}

function runtimeSpeed(
  speed: StandaloneStatBlock["speeds"][number],
): BattleStatBlockRuntimeSpeed | null {
  if (speed.feet.kind !== "literal") return null;
  return {
    kind: speed.kind,
    feet: speed.feet,
    ...(speed.kind === "fly" && speed.hover === true ? { hover: true } : {}),
  };
}

function runtimeSense(
  sense: NonNullable<StandaloneStatBlock["senses"]>[number],
): BattleStatBlockRuntimeSense {
  return {
    kind: sense.kind,
    rangeFeet: sense.rangeFeet,
    ...(sense.kind === "darkvision" && sense.qualifier !== undefined
      ? { qualifier: sense.qualifier }
      : {}),
  };
}

function literalSize(size: StandaloneStatBlock["size"]): Size | null {
  return typeof size === "string" ? size : null;
}

function nonEmptyRuntimeValues<T>(
  values: readonly (T | null)[],
): ReadonlyNonEmptyArray<T> {
  const present = values.filter((value): value is T => value !== null);
  const [first, ...rest] = present;
  if (first === undefined) {
    throw new Error("Projection requires a non-empty runtime collection.");
  }
  return [first, ...rest];
}

function failure(
  reason: BattleStatBlockProjectionFailure["reason"],
): BattleStatBlockProjectionFailure {
  return { tag: "battleStatBlockProjectionFailure", reason };
}
