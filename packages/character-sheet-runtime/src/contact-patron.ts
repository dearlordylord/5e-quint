// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.contact-patron-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.planar-entity-answers
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { PositiveInteger, difficultyClass } from "@dnd/shared/types";
import {
  CONTACT_PATRON_CONTACT_OTHER_PLANE_FREE_CAST_RESOURCE_TAG,
  CONTACT_PATRON_CONTACT_OTHER_PLANE_SPELL_ID,
  supportedClassFeatureSpellFreeCastGrantsForUnit,
  type SpellRecord,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import { characterSheetClassFeaturePreparedSpellAccessesForBuild } from "./class-feature-spells.ts";
import {
  characterSheetResources,
  spendCharacterSheetSpellAccessFreeCast,
} from "./resources.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetContactPatronInvocation,
  type CharacterSheetContactPatronResult,
  type CharacterSheetIssue,
  type CharacterSheetResourceState,
} from "./sheet-types.ts";

type ContactPatronFreeCastResource = Extract<
  CharacterSheetResourceState,
  { readonly tag: "spellAccessFreeCast" }
>;

export function castContactPatron(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetContactPatronResult, CharacterSheetIssue> {
  const resource = contactPatronFreeCastResource(input);
  /* v8 ignore next -- Malformed retained support state: Contact Patron admission correlates the feature with its projected free-cast resource. */
  if (Either.isLeft(resource)) return Either.left(resource.left);
  if (resource.right.expended >= resource.right.count) {
    return characterSheetIssue(
      "Contact Patron cannot be used again until a Long Rest.",
    );
  }

  const feature = getRequiredUnit(
    input.unitLibrary,
    resource.right.sourceUnitId,
  );
  /* v8 ignore next -- Malformed sheet/catalog correlation: the projected Contact Patron resource retains its admitted feature Unit id. */
  if (Either.isLeft(feature)) return Either.left(feature.left);
  const grants = supportedClassFeatureSpellFreeCastGrantsForUnit(feature.right);
  /* v8 ignore start -- The retained Contact Patron resource and its authored free-cast grant are one correlated support profile. */
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
  /* v8 ignore stop */

  const preparedAccesses =
    characterSheetClassFeaturePreparedSpellAccessesForBuild({
      build: input.sheet.build,
      unitLibrary: input.unitLibrary,
    });
  const hasPreparedAccess = preparedAccesses.some(
    (access) =>
      access.sourceUnitId === resource.right.sourceUnitId &&
      access.spellIds.some(
        (spellId) => spellId === CONTACT_PATRON_CONTACT_OTHER_PLANE_SPELL_ID,
      ),
  );
  /* v8 ignore start -- Contact Patron resource ownership and its prepared spell grant are correlated by feature projection. */
  if (!hasPreparedAccess) {
    return characterSheetIssue(
      "Contact Patron requires prepared Contact Other Plane Spell Access from the feature.",
    );
  }
  /* v8 ignore stop */

  const spell = getRequiredUnit(
    input.unitLibrary,
    CONTACT_PATRON_CONTACT_OTHER_PLANE_SPELL_ID,
  );
  /* v8 ignore next -- Malformed support catalog: the fixed Contact Other Plane reference is required when Contact Patron is admitted. */
  if (Either.isLeft(spell)) return Either.left(spell.left);
  /* v8 ignore start -- The fixed Contact Other Plane id must resolve to its Spell Unit in the same catalog. */
  if (spell.right.kind !== "spell") {
    return characterSheetIssue("Contact Patron requires a Spell record.");
  }
  /* v8 ignore stop */

  const invocation = contactPatronInvocationFromSpell({
    spell: spell.right,
    featureUnitId: resource.right.sourceUnitId,
  });
  /* v8 ignore next -- Unsupported authored data: admission verifies the exact Contact Other Plane invocation profile before this projector runs. */
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const sheet = spendCharacterSheetSpellAccessFreeCast({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    resource: {
      sourceUnitId: resource.right.sourceUnitId,
      spellId: resource.right.spellId,
    },
  });
  if (Either.isLeft(sheet)) return Either.left(sheet.left);
  return Either.right({ sheet: sheet.right, invocation: invocation.right });
}

function contactPatronFreeCastResource(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<ContactPatronFreeCastResource, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  /* v8 ignore next -- Malformed build/catalog correlation: resource projection can fail only when retained admitted Units no longer resolve. */
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const resource = resources.right.find(
    (candidate): candidate is ContactPatronFreeCastResource =>
      candidate.tag === "spellAccessFreeCast" &&
      candidate.spellId === CONTACT_PATRON_CONTACT_OTHER_PLANE_SPELL_ID,
  );
  /* v8 ignore start -- This operation is admitted only after locating its retained Contact Patron free-cast resource. */
  if (resource === undefined) {
    return characterSheetIssue(
      "Contact Patron requires the Warlock Contact Patron feature.",
    );
  }
  /* v8 ignore stop */
  return Either.right(resource);
}

function contactPatronInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly featureUnitId: UnitRecord["id"];
}): Either.Either<CharacterSheetContactPatronInvocation, CharacterSheetIssue> {
  /* v8 ignore start -- Unsupported authored Contact Other Plane data: Contact Patron admission requires activation mechanics before save-phase projection. */
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
  /* v8 ignore stop */
  /* v8 ignore start -- The authored Contact Other Plane record failed the exact save-and-answer profile required by Contact Patron. */
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
  /* v8 ignore stop */

  const questionWindow = timeSpanDuration(phase.onSuccess.questionWindow);
  /* v8 ignore start -- The admitted authored question window is always accepted by the elapsed-time parser. */
  if (Either.isLeft(questionWindow)) {
    return characterSheetIssue(
      "Contact Patron requires a supported question window duration.",
    );
  }
  /* v8 ignore stop */

  return Either.right({
    tag: "contactPatron",
    spellId: input.spell.id,
    spellLevel: input.spell.mechanics.level,
    featureUnitId: input.featureUnitId,
    freeCastResource: {
      sourceUnitId: input.featureUnitId,
      spellId: input.spell.id,
    },
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
