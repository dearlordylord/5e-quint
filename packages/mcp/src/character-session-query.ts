import type { BattleId, CharacterId } from "@dnd/battle-runtime";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import {
  characterSheetAbilityCheckAbility,
  characterSheetAbilityCheckProficiencyBonusProjection,
  characterSheetArmorClassProjection,
  characterSheetDruidWildShapeKnownForms,
  characterSheetJumpDistanceAbility,
  characterSheetLinkedSpeedGrants,
  characterSheetSpellAccessesForBuild,
  characterSheetSpellbookRitualAccess,
  characterSheetSpellbookRitualAccessesForBuild,
  characterSheetSpellbookRitualInvocationProjection,
  characterSheetWeaponMasterySelectedReferenceProjection,
  type CharacterSheetAbilityCheckAbility,
  type CharacterSheetArmorClassProjection,
  type CharacterSheetDruidWildShapeKnownForms,
  type CharacterSheetIssue,
  type CharacterSheetJumpDistanceAbility,
  type CharacterSheetLinkedSpeedGrant,
  type CharacterSheetSpellAccess,
  type CharacterSheetSpellbookRitualAccess,
  type CharacterSheetSpellbookRitualInvocationProjection,
  type CharacterSheetWeaponMasterySelectedReferenceProjection,
} from "@dnd/character-sheet-runtime";
import { Either, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type {
  CharacterSessionQueryInput,
  QueryCharacterSessionToolInput,
} from "./character-session-query-tool-input.ts";
import type { AvailableCharacterSession } from "./session-store.ts";

type RightProjection<Result> =
  Result extends Either.Either<infer Projection, unknown> ? Projection : never;
type CharacterSheetAbilityCheckProficiencyBonusProjection = RightProjection<
  ReturnType<typeof characterSheetAbilityCheckProficiencyBonusProjection>
>;

export type CharacterSessionQueryProjection =
  | {
      readonly kind: "abilityCheckAbility";
      readonly projection: CharacterSheetAbilityCheckAbility;
    }
  | {
      readonly kind: "abilityCheckProficiencyBonus";
      readonly projection: CharacterSheetAbilityCheckProficiencyBonusProjection;
    }
  | {
      readonly kind: "jumpDistanceAbility";
      readonly projection: CharacterSheetJumpDistanceAbility;
    }
  | {
      readonly kind: "linkedSpeedGrants";
      readonly projection: readonly CharacterSheetLinkedSpeedGrant[];
    }
  | {
      readonly kind: "armorClass";
      readonly projection: CharacterSheetArmorClassProjection;
    }
  | {
      readonly kind: "spellAccess";
      readonly projection: readonly CharacterSheetSpellAccess[];
    }
  | {
      readonly kind: "knownForms";
      readonly projection: CharacterSheetDruidWildShapeKnownForms;
    }
  | {
      readonly kind: "weaponMasterySelections";
      readonly projection: CharacterSheetWeaponMasterySelectedReferenceProjection;
    }
  | {
      readonly kind: "spellbookRitualAccesses";
      readonly projection: readonly CharacterSheetSpellbookRitualAccess[];
    }
  | {
      readonly kind: "spellbookRitualAccess";
      readonly projection: CharacterSheetSpellbookRitualAccess;
    }
  | {
      readonly kind: "spellInvocation";
      readonly projection: CharacterSheetSpellbookRitualInvocationProjection;
    };

export type CharacterSessionQueryIssue =
  | {
      readonly tag: "unknownCharacterSession";
      readonly characterId: CharacterId;
    }
  | {
      readonly tag: "inBattleCharacterSession";
      readonly characterId: CharacterId;
      readonly battleId: BattleId;
    }
  | {
      readonly tag: "queryRejected";
      readonly characterId: CharacterId;
      readonly queryKind: CharacterSessionQueryInput["kind"];
      readonly issue: CharacterSheetIssue;
    };

export type CharacterSessionQueryRequest = Omit<
  QueryCharacterSessionToolInput,
  "characterId"
> & {
  readonly characterId: CharacterId;
};

export function queryCharacterSession(
  root: McpPlaySessionRoot,
  input: CharacterSessionQueryRequest,
): Either.Either<CharacterSessionQueryProjection, CharacterSessionQueryIssue> {
  const session = root.sessionStore.characters.get(input.characterId);
  if (session === undefined) {
    return Either.left({
      tag: "unknownCharacterSession",
      characterId: input.characterId,
    });
  }
  if (session.tag === "inBattle") {
    return Either.left({
      tag: "inBattleCharacterSession",
      characterId: input.characterId,
      battleId: session.battleId,
    });
  }

  return projectCharacterSessionQuery({
    sheet: session,
    unitLibrary: root.unitLibrary,
    query: input.query,
    characterId: input.characterId,
  });
}

function projectCharacterSessionQuery(input: {
  readonly sheet: AvailableCharacterSession;
  readonly unitLibrary: UnitCatalog;
  readonly query: CharacterSessionQueryInput;
  readonly characterId: CharacterId;
}): Either.Either<CharacterSessionQueryProjection, CharacterSessionQueryIssue> {
  return Match.value(input.query).pipe(
    Match.when({ kind: "abilityCheckAbility" }, (query) =>
      projectEither(
        input,
        query,
        characterSheetAbilityCheckAbility({
          build: input.sheet.build,
          unitLibrary: input.unitLibrary,
          skill: query.skill,
          defaultAbility: query.defaultAbility,
          activeFeatureUnitIds: query.activeFeatureUnitIds,
        }),
      ),
    ),
    Match.when({ kind: "abilityCheckProficiencyBonus" }, (query) =>
      projectEither(
        input,
        query,
        characterSheetAbilityCheckProficiencyBonusProjection({
          build: input.sheet.build,
          unitLibrary: input.unitLibrary,
          skill: query.skill,
          otherProficiencyBonus: query.otherProficiencyBonus,
        }),
      ),
    ),
    Match.when({ kind: "jumpDistanceAbility" }, (query) =>
      projectEither(
        input,
        query,
        characterSheetJumpDistanceAbility({
          build: input.sheet.build,
          unitLibrary: input.unitLibrary,
          defaultAbility: query.defaultAbility,
        }),
      ),
    ),
    Match.when({ kind: "linkedSpeedGrants" }, (query) =>
      projectEither(
        input,
        query,
        characterSheetLinkedSpeedGrants(input.sheet.build, input.unitLibrary),
      ),
    ),
    Match.when({ kind: "armorClass" }, (query) =>
      projectEither(
        input,
        query,
        characterSheetArmorClassProjection({
          build: input.sheet.build,
          unitLibrary: input.unitLibrary,
          ...(query.baseChoice === undefined
            ? {}
            : { baseChoice: query.baseChoice }),
        }),
      ),
    ),
    Match.when({ kind: "spellAccess" }, (query) =>
      Either.right({
        kind: query.kind,
        projection: characterSheetSpellAccessesForBuild({
          build: input.sheet.build,
          unitLibrary: input.unitLibrary,
        }),
      }),
    ),
    Match.when({ kind: "knownForms" }, (query) => {
      const projection = characterSheetDruidWildShapeKnownForms(input.sheet);
      return projection === undefined
        ? queryRejected(
            input,
            query,
            "Character Session does not have Druid Wild Shape known forms.",
          )
        : Either.right({ kind: query.kind, projection });
    }),
    Match.when({ kind: "weaponMasterySelections" }, (query) =>
      projectEither(
        input,
        query,
        characterSheetWeaponMasterySelectedReferenceProjection({
          sheet: input.sheet,
          unitLibrary: input.unitLibrary,
          featureUnitId: query.featureUnitId,
        }),
      ),
    ),
    Match.when({ kind: "spellbookRitualAccesses" }, (query) =>
      projectEither(
        input,
        query,
        characterSheetSpellbookRitualAccessesForBuild({
          build: input.sheet.build,
          unitLibrary: input.unitLibrary,
        }),
      ),
    ),
    Match.when({ kind: "spellbookRitualAccess" }, (query) =>
      projectEither(
        input,
        query,
        characterSheetSpellbookRitualAccess({
          build: input.sheet.build,
          unitLibrary: input.unitLibrary,
          spellId: query.spellId,
        }),
      ),
    ),
    Match.when({ kind: "spellInvocation" }, (query) =>
      Either.right({
        kind: query.kind,
        projection: characterSheetSpellbookRitualInvocationProjection({
          sheet: input.sheet,
          unitLibrary: input.unitLibrary,
          spellId: query.spellId,
          invocation: query.invocation,
        }),
      }),
    ),
    Match.exhaustive,
  );
}

function projectEither<Query extends CharacterSessionQueryInput, Projection>(
  input: {
    readonly characterId: CharacterId;
  },
  query: Query,
  result: Either.Either<Projection, CharacterSheetIssue>,
): Either.Either<
  { readonly kind: Query["kind"]; readonly projection: Projection },
  CharacterSessionQueryIssue
> {
  return Either.isLeft(result)
    ? queryRejected(input, query, result.left.message, result.left)
    : Either.right({ kind: query.kind, projection: result.right });
}

function queryRejected<Query extends CharacterSessionQueryInput>(
  input: { readonly characterId: CharacterId },
  query: Query,
  message: string,
  issue: CharacterSheetIssue = {
    tag: "characterSheetIssue",
    message,
  },
): Either.Either<never, CharacterSessionQueryIssue> {
  return Either.left({
    tag: "queryRejected",
    characterId: input.characterId,
    queryKind: query.kind,
    issue,
  });
}
