// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.wizard-spellcasting-advancement
// KERNEL-COVERAGE: runtime-owner CREATION.SPELL_ACCESS.WIZARD_PROGRESSION
import { unitId } from "@dnd/shared/game-facts";
// RAW: SRD 5.2.1 classes.md:10221-10228; 11522-11526.
import { Array, Option, Result } from "effect";
import type {
  ClassRecord,
  ClassFeatureMechanics,
  UnitRecord,
  WizardSpellcastingCreation,
} from "@dnd/surface/surface/types";
import { classLevelForUnit } from "./character-progression-types.ts";
import { characterBuildFeatureUnitIds } from "./finalization.ts";
import { classSpellcastingCreationAtLevel } from "./class-spellcasting.ts";
import type { CharacterBuild, UnitCatalog, UnitChoiceKey } from "./types.ts";
import type {
  CharacterBuildClassLevelGain,
  CharacterBuildAdvancementIssue,
} from "./character-build-advancement.ts";

export const WIZARD_SPELLCASTING_GAIN_CHOICE_KEYS = [
  "wizard_spellbook_choices",
  "wizard_prepared_spell_choices",
  "wizard_cantrip_choices",
] as const satisfies readonly UnitChoiceKey[];
export function isWizardSpellcastingGainChoiceKey(
  key: UnitChoiceKey,
): key is (typeof WIZARD_SPELLCASTING_GAIN_CHOICE_KEYS)[number] {
  return WIZARD_SPELLCASTING_GAIN_CHOICE_KEYS.some(
    (candidate) => candidate === key,
  );
}
type WizardSpellcastingGainInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnit: ClassRecord;
  readonly spellcastingFacts: WizardSpellcastingCreation;
  readonly levelGain: CharacterBuildClassLevelGain;
};

export function updateWizardSpellcastingForClassLevelGain(
  input: WizardSpellcastingGainInput,
): Result.Result<
  NonNullable<CharacterBuild["spellcasting"]>,
  CharacterBuildAdvancementIssue
> {
  const context = wizardSpellcastingGainContext(input);
  if (Result.isFailure(context)) return Result.fail(context.failure);
  const { spellcasting, source, current, next } = context.success;
  const choices =
    input.levelGain.gainedChoices
      ?.filter((choice) => choice.kind === "unitChoice")
      .filter((choice) =>
        isWizardSpellcastingGainChoiceKey(choice.choiceKey),
      ) ?? [];
  const classChoices = choices.filter(
    (choice) => choice.featureUnitId === input.classUnit.id,
  );
  const additions = (
    key: (typeof WIZARD_SPELLCASTING_GAIN_CHOICE_KEYS)[number],
  ) =>
    classChoices
      .filter((choice) => choice.choiceKey === key)
      .flatMap((choice) => choice.optionIds.map(unitId));
  const book = additions("wizard_spellbook_choices");
  const prepared = additions("wizard_prepared_spell_choices");
  const cantrips = additions("wizard_cantrip_choices");
  const expected = [
    {
      key: "wizard_spellbook_choices",
      count: next.spellbookAccess.choose - current.spellbookAccess.choose,
    },
    {
      key: "wizard_prepared_spell_choices",
      count: next.preparedAccess.choose - current.preparedAccess.choose,
    },
    {
      key: "wizard_cantrip_choices",
      count: next.cantripAccess.choose - current.cantripAccess.choose,
    },
  ] as const;
  if (
    expected.some(
      ({ key, count }) =>
        classChoices.filter((choice) => choice.choiceKey === key).length !==
          (count > 0 ? 1 : 0) || additions(key).length !== count,
    )
  )
    return invalidWizardGain(
      "Wizard advancement requires exactly the newly earned Spellbook, preparation, and cantrip choices.",
    );
  const eligible = new Set(
    next.spellbookAccess.spells
      .filter(
        (spell) =>
          spell.spellLevel <=
          Math.max(
            ...next.spellSlotProjection.slots.map((slot) => slot.spellLevel),
          ),
      )
      .map((spell) => spell.spellId),
  );
  const bonusBook = wizardBonusBookAdditions(
    input,
    choices,
    current,
    next,
    eligible,
  );
  if (Result.isFailure(bonusBook)) return Result.fail(bonusBook.failure);
  const gainedBook = [...book, ...bonusBook.success];
  const nextBook = [...source.spellbook, ...gainedBook];
  const validated = validateWizardSpellAdditions(
    source,
    gainedBook,
    prepared,
    cantrips,
    nextBook,
    eligible,
    next,
  );
  if (Result.isFailure(validated)) return Result.fail(validated.failure);
  return Result.succeed({
    ...spellcasting,
    sources: Array.map(spellcasting.sources, (owned) =>
      owned === source
        ? {
            ...owned,
            spellbook: nextBook,
            preparedSpells: [...source.preparedSpells, ...prepared],
            cantrips: [...source.cantrips, ...cantrips],
          }
        : owned,
    ),
    slotPools: {
      ...spellcasting.slotPools,
      spellcasting: {
        kind: "spellcasting",
        slots: next.spellSlotProjection.slots,
      },
    },
  });
}

type WizardGainChoice = Extract<
  NonNullable<CharacterBuildClassLevelGain["gainedChoices"]>[number],
  { readonly kind: "unitChoice" }
>;
function invalidWizardGain(
  message: string,
): Result.Result<never, CharacterBuildAdvancementIssue> {
  return Result.fail({ code: "invalidWizardSpellcastingGains", message });
}
function wizardBonusBookAdditions(
  input: WizardSpellcastingGainInput,
  choices: readonly WizardGainChoice[],
  current: WizardSpellcastingCreation,
  next: WizardSpellcastingCreation,
  eligible: ReadonlySet<UnitRecord["id"]>,
): Result.Result<readonly UnitRecord["id"][], CharacterBuildAdvancementIssue> {
  const featureChoices = choices.filter(
    (choice) => choice.featureUnitId !== input.classUnit.id,
  );
  const heldFeatures = characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  );
  const highestSlot = (facts: WizardSpellcastingCreation) =>
    Math.max(...facts.spellSlotProjection.slots.map((slot) => slot.spellLevel));
  const featureBook: UnitRecord["id"][] = [];
  if (
    new Set(featureChoices.map((choice) => choice.featureUnitId)).size !==
    featureChoices.length
  )
    return invalidWizardGain(
      "A bonus Spellbook grant can be selected only once per level gain.",
    );
  for (const choice of featureChoices) {
    const resolvedGrant = ownedWizardLearningGrant(
      choice,
      heldFeatures,
      input.unitLibrary,
      highestSlot(next) > highestSlot(current),
    );
    if (Result.isFailure(resolvedGrant))
      return Result.fail(resolvedGrant.failure);
    const grant = resolvedGrant.success;
    for (const id of choice.optionIds.map(unitId)) {
      if (!wizardBonusSpellEligible(input.unitLibrary, id, grant, eligible))
        return invalidWizardGain(
          "Bonus Spellbook addition must satisfy its source-authored spell school and level.",
        );
      featureBook.push(id);
    }
  }
  return Result.succeed(featureBook);
}

type WizardSpellcastingSource = NonNullable<
  CharacterBuild["spellcasting"]
>["sources"][number];
function validateWizardSpellAdditions(
  source: WizardSpellcastingSource,
  gainedBook: readonly UnitRecord["id"][],
  prepared: readonly UnitRecord["id"][],
  cantrips: readonly UnitRecord["id"][],
  nextBook: readonly UnitRecord["id"][],
  eligible: ReadonlySet<UnitRecord["id"]>,
  next: WizardSpellcastingCreation,
): Result.Result<void, CharacterBuildAdvancementIssue> {
  if (
    new Set(gainedBook).size !== gainedBook.length ||
    gainedBook.some((id) => source.spellbook.includes(id) || !eligible.has(id))
  )
    return invalidWizardGain(
      "Wizard Spellbook additions must be distinct eligible spells not already in the book.",
    );
  if (
    new Set(prepared).size !== prepared.length ||
    prepared.some(
      (id) =>
        source.preparedSpells.includes(id) ||
        !nextBook.includes(id) ||
        !eligible.has(id),
    )
  )
    return invalidWizardGain(
      "Wizard preparation gains must be distinct eligible unprepared spells from the resulting book.",
    );
  if (
    new Set(cantrips).size !== cantrips.length ||
    cantrips.some(
      (id) =>
        source.cantrips.includes(id) ||
        !next.cantripAccess.spellIds.includes(id),
    )
  )
    return invalidWizardGain(
      "Wizard cantrip gains must be distinct eligible new cantrips.",
    );
  return Result.succeed(undefined);
}

type WizardLearningGrant = Extract<
  ClassFeatureMechanics,
  { readonly family: "wizard_spellbook_learning" }
>["grants"][number];
function ownedWizardLearningGrant(
  choice: WizardGainChoice,
  heldFeatures: readonly UnitRecord["id"][],
  unitLibrary: UnitCatalog,
  newSlotAccess: boolean,
): Result.Result<WizardLearningGrant, CharacterBuildAdvancementIssue> {
  const feature = Option.getOrUndefined(
    unitLibrary.getUnit(choice.featureUnitId),
  );
  if (
    choice.choiceKey !== "wizard_spellbook_choices" ||
    !heldFeatures.includes(choice.featureUnitId) ||
    feature?.kind !== "class_feature" ||
    feature.mechanics.family !== "wizard_spellbook_learning" ||
    !newSlotAccess
  )
    return invalidWizardGain(
      "Bonus Spellbook additions require an owned learning grant at new Spell Slot access.",
    );
  return wizardNewSlotLearningGrant(feature.mechanics, choice);
}

function wizardSpellcastingGainContext(
  input: WizardSpellcastingGainInput,
): Result.Result<
  {
    readonly spellcasting: NonNullable<CharacterBuild["spellcasting"]>;
    readonly source: WizardSpellcastingSource;
    readonly current: WizardSpellcastingCreation;
    readonly next: WizardSpellcastingCreation;
  },
  CharacterBuildAdvancementIssue
> {
  const spellcasting = input.build.spellcasting;
  const source = spellcasting?.sources.find(
    (source) => source.sourceUnitId === input.classUnit.id,
  );
  if (spellcasting === undefined || source === undefined)
    return invalidWizardGain(
      "Wizard advancement requires the owned Spellbook Spellcasting source.",
    );
  const level = classLevelForUnit(input.build.progression, input.classUnit.id);
  const current = classSpellcastingCreationAtLevel(
    input.spellcastingFacts,
    level,
  );
  const next = classSpellcastingCreationAtLevel(
    input.spellcastingFacts,
    level + 1,
  );
  if (
    current?.kind !== "wizard_spellcasting_creation" ||
    next?.kind !== "wizard_spellcasting_creation"
  )
    return invalidWizardGain(
      "Wizard advancement requires adjacent Spellcasting table rows.",
    );
  return Result.succeed({ spellcasting, source, current, next });
}

function wizardBonusSpellEligible(
  unitLibrary: UnitCatalog,
  id: UnitRecord["id"],
  grant: WizardLearningGrant,
  eligible: ReadonlySet<UnitRecord["id"]>,
): boolean {
  const spell = Option.getOrUndefined(unitLibrary.getUnit(id));
  return (
    spell?.kind === "spell" &&
    spell.mechanics.school === grant.eligibility.school &&
    eligible.has(id)
  );
}

function wizardNewSlotLearningGrant(
  mechanics: Extract<
    ClassFeatureMechanics,
    { readonly family: "wizard_spellbook_learning" }
  >,
  choice: WizardGainChoice,
): Result.Result<WizardLearningGrant, CharacterBuildAdvancementIssue> {
  const grants = mechanics.grants.filter(
    (grant) => grant.timing.kind === "new_spell_slot_level_access",
  );
  const grant = grants[0];
  if (
    grant === undefined ||
    grants.length !== 1 ||
    choice.optionIds.length !== grant.choiceCount
  )
    return invalidWizardGain(
      "Bonus Spellbook addition must match its learning grant count.",
    );
  return Result.succeed(grant);
}
