// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.contact-patron-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.planar-entity-answers
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import {
  PositiveInteger,
  difficultyClass,
  resourceCount,
  type ResourceCount,
} from "@dnd/shared/types";
import {
  CONTACT_PATRON_CONTACT_OTHER_PLANE_FREE_CAST_RESOURCE_TAG,
  CONTACT_PATRON_CONTACT_OTHER_PLANE_SPELL_ID,
  supportedClassFeatureSpellFreeCastGrantsForUnit,
  type SpellRecord,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import { characterSheetClassFeaturePreparedSpellAccessesForBuild } from "./class-feature-spells.ts";
import { characterSheetResources } from "./resources.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetContactPatronInvocation,
  type CharacterSheetContactPatronResult,
  type CharacterSheetIssue,
  type CharacterSheetResourceExpenditure,
} from "./sheet-types.ts";

type ContactPatronFreeCastResource = {
  readonly unitId: UnitRecord["id"];
  readonly tag: typeof CONTACT_PATRON_CONTACT_OTHER_PLANE_FREE_CAST_RESOURCE_TAG;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export function castContactPatron(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetContactPatronResult, CharacterSheetIssue> {
  const resource = contactPatronFreeCastResource(input);
  if (Either.isLeft(resource)) return Either.left(resource.left);
  if (resource.right.expended >= resource.right.count) {
    return characterSheetIssue(
      "Contact Patron cannot be used again until a Long Rest.",
    );
  }

  const feature = getRequiredUnit(input.unitLibrary, resource.right.unitId);
  if (Either.isLeft(feature)) return Either.left(feature.left);
  const grants = supportedClassFeatureSpellFreeCastGrantsForUnit(feature.right);
  if (
    grants === null ||
    grants.profile.resourceTag !==
      CONTACT_PATRON_CONTACT_OTHER_PLANE_FREE_CAST_RESOURCE_TAG ||
    grants.profile.spellId !== CONTACT_PATRON_CONTACT_OTHER_PLANE_SPELL_ID
  ) {
    return characterSheetIssue(
      "Contact Patron requires the supported class-feature spell free-cast profile.",
    );
  }

  const preparedAccesses =
    characterSheetClassFeaturePreparedSpellAccessesForBuild({
      build: input.sheet.build,
      unitLibrary: input.unitLibrary,
    });
  const hasPreparedAccess = preparedAccesses.some(
    (access) =>
      access.sourceUnitId === resource.right.unitId &&
      access.spellIds.some(
        (spellId) => spellId === CONTACT_PATRON_CONTACT_OTHER_PLANE_SPELL_ID,
      ),
  );
  if (!hasPreparedAccess) {
    return characterSheetIssue(
      "Contact Patron requires prepared Contact Other Plane Spell Access from the feature.",
    );
  }

  const spell = getRequiredUnit(
    input.unitLibrary,
    CONTACT_PATRON_CONTACT_OTHER_PLANE_SPELL_ID,
  );
  if (Either.isLeft(spell)) return Either.left(spell.left);
  if (spell.right.kind !== "spell") {
    return characterSheetIssue("Contact Patron requires a Spell record.");
  }

  const invocation = contactPatronInvocationFromSpell({
    spell: spell.right,
    featureUnitId: resource.right.unitId,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  return Either.right({
    sheet: {
      ...input.sheet,
      resourceExpenditures: replaceTaggedResourceExpenditure({
        expenditures: input.sheet.resourceExpenditures,
        tag: CONTACT_PATRON_CONTACT_OTHER_PLANE_FREE_CAST_RESOURCE_TAG,
        expended: resourceCount(resource.right.expended + 1),
      }),
    },
    invocation: invocation.right,
  });
}

function contactPatronFreeCastResource(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<ContactPatronFreeCastResource, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const resource = resources.right.find(
    (candidate): candidate is ContactPatronFreeCastResource =>
      candidate.tag === CONTACT_PATRON_CONTACT_OTHER_PLANE_FREE_CAST_RESOURCE_TAG,
  );
  if (resource === undefined) {
    return characterSheetIssue(
      "Contact Patron requires the Warlock Contact Patron feature.",
    );
  }
  return Either.right(resource);
}

function contactPatronInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly featureUnitId: UnitRecord["id"];
}): Either.Either<CharacterSheetContactPatronInvocation, CharacterSheetIssue> {
  const phase =
    input.spell.mechanics.family === "activation"
      ? input.spell.mechanics.phases.find(
          (candidate) =>
            candidate.kind === "save_gate" &&
            candidate.ability === "int" &&
            candidate.dc.kind === "fixed" &&
            candidate.dc.dc === 15 &&
            candidate.onSuccess.kind === "planar_entity_answers",
        )
      : undefined;
  if (
    phase === undefined ||
    phase.kind !== "save_gate" ||
    phase.dc.kind !== "fixed" ||
    phase.onSuccess.kind !== "planar_entity_answers"
  ) {
    return characterSheetIssue(
      "Contact Patron requires the Contact Other Plane save and answer profile.",
    );
  }

  const questionWindow = timeSpanDuration(phase.onSuccess.questionWindow);
  if (Either.isLeft(questionWindow)) {
    return characterSheetIssue(
      "Contact Patron requires a supported question window duration.",
    );
  }

  return Either.right({
    tag: "contactPatron",
    spellId: input.spell.id,
    spellLevel: input.spell.mechanics.level,
    featureUnitId: input.featureUnitId,
    freeCastResourceTag: CONTACT_PATRON_CONTACT_OTHER_PLANE_FREE_CAST_RESOURCE_TAG,
    spellSlotCost: { kind: "none" },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_feature",
    savingThrow: {
      ability: phase.ability,
      dc: difficultyClass(phase.dc.dc),
      outcome: "automatic_success",
      scope: "patron_contact",
    },
    questions: {
      count: PositiveInteger(phase.onSuccess.questionCount),
      answerOwner: "gm",
      primaryAnswer: phase.onSuccess.answer.primary,
      unknownAnswer: phase.onSuccess.answer.unknown,
      misleadingAnswerFallback: phase.onSuccess.answer.fallback,
      window: questionWindow.right,
    },
  });
}

function replaceTaggedResourceExpenditure(input: {
  readonly expenditures: readonly CharacterSheetResourceExpenditure[];
  readonly tag: typeof CONTACT_PATRON_CONTACT_OTHER_PLANE_FREE_CAST_RESOURCE_TAG;
  readonly expended: ResourceCount;
}): CharacterSheetResourceExpenditure[] {
  const next = input.expenditures.filter(
    (expenditure) => expenditure.tag !== input.tag,
  );
  if (input.expended > resourceCount(0)) {
    next.push({ tag: input.tag, expended: input.expended });
  }
  return next;
}
