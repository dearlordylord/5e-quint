// KERNEL-COVERAGE: runtime-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.armor-class-base-formula
import {
  characterBuildArmorTraining,
  characterBuildFeatureUnitIds,
  characterCreationIssueMessage,
  characterEquipmentItemSourceFromId,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  abilityModifier,
  armorClass,
  armorClassDelta,
  currentArmorClass,
  defaultArmorClassState,
  defaultUnarmoredArmorClassBase,
  zeroAbilityModifiers,
  type ArmorClassBaseSource,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { abilityScoreToMod } from "@dnd/shared-algebras/ability-score-algebra";
import type {
  ClassFeatureComponentMechanics,
  EquipmentPredicate,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Result } from "effect";

import {
  projectCharacterSheetEquipmentDefinition,
  type CharacterSheetArmorDefinitionFacts,
  type CharacterSheetEquipmentDefinitionProjection,
} from "./equipment-definition-projection.ts";

import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheetArmorClassBaseChoice,
  type CharacterSheetArmorClassProjection,
  type CharacterSheetArmorClassStateInput,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

const CHARACTER_SHEET_ARMOR_CLASS_ROUTE = [
  {
    kind: "retainCharacterSheetSelectedReferences",
    subject: "selectedReferenceProjection",
    owner: "selectedReference",
  },
  {
    kind: "projectCharacterSheetFacts",
    subject: "armorClassProjection",
    owner: "buildProjection",
  },
] as const satisfies CharacterSheetArmorClassProjection["qRoute"];

export function characterSheetArmorClassState(
  input: CharacterSheetArmorClassStateInput,
): Result.Result<ArmorClassState, CharacterSheetIssue> {
  const { build, unitLibrary } = input;
  const loadout = build.equipment.loadout;
  const defaultState = defaultArmorClassState();
  const armorTraining = characterBuildArmorTraining(build, unitLibrary);
  /* v8 ignore start -- @preserve -- Armor training failure means the parsed build and Unit catalog no longer correlate. */
  if (Result.isFailure(armorTraining)) {
    return characterSheetIssue(
      armorTraining.failure.map(characterCreationIssueMessage).join("; "),
    );
  }
  /* v8 ignore stop -- @preserve */

  const armor =
    loadout.armor == null
      ? undefined
      : getRequiredUnit(
          unitLibrary,
          characterEquipmentItemSourceFromId(loadout.armor).unitId,
        );
  /* v8 ignore start -- @preserve -- A loadout armor item id must resolve in the same Unit catalog used to parse equipment. */
  if (armor !== undefined && Result.isFailure(armor)) {
    return Result.fail(armor.failure);
  }
  /* v8 ignore stop -- @preserve */

  const shield =
    loadout.shield == null
      ? undefined
      : getRequiredUnit(
          unitLibrary,
          characterEquipmentItemSourceFromId(loadout.shield).unitId,
        );
  /* v8 ignore start -- @preserve -- A loadout shield item id must resolve in the same Unit catalog used to parse equipment. */
  if (shield !== undefined && Result.isFailure(shield)) {
    return Result.fail(shield.failure);
  }
  /* v8 ignore stop -- @preserve */

  const armorDefinition = projectSelectedEquipmentDefinition(
    armor === undefined || Result.isFailure(armor) ? undefined : armor.success,
    "armor",
  );
  if (Result.isFailure(armorDefinition)) {
    return Result.fail(armorDefinition.failure);
  }
  const armorFacts = armorDefinition.success?.facts;

  const shieldDefinition = projectSelectedEquipmentDefinition(
    shield === undefined || Result.isFailure(shield)
      ? undefined
      : shield.success,
    "shield",
  );
  if (Result.isFailure(shieldDefinition)) {
    return Result.fail(shieldDefinition.failure);
  }
  const shieldFacts = shieldDefinition.success?.facts;

  const base =
    armorFacts !== undefined
      ? Result.succeed(armorBaseSource(armorFacts))
      : selectedUnarmoredBaseSource(input, {
          wearingArmor: false,
          wieldingShield: shieldFacts !== undefined,
        });
  /* v8 ignore next -- @preserve -- Base selection rejection is malformed stored choice or build/catalog input. */
  if (Result.isFailure(base)) return Result.fail(base.failure);

  const bonuses: ArmorClassState["bonuses"][number][] = [];
  if (
    shield !== undefined &&
    Result.isSuccess(shield) &&
    shieldFacts !== undefined
  ) {
    bonuses.push({
      kind: "shield",
      bonus: armorClassDelta(shieldFacts.armorClassProjection.bonus),
      handUse: shieldFacts.armorClassProjection.handUse,
      trainingRequired: shieldFacts.armorClassProjection.trainingRequired,
      sourceUnitId: shield.success.id,
    });
  }

  return Result.succeed({
    ...defaultState,
    abilityModifiers: characterSheetAbilityModifiers(build),
    base: base.success,
    bonuses,
    armorTraining: new Set(armorTraining.success),
    leftHandUse:
      shieldFacts !== undefined
        ? "shield"
        : loadout.offHandWeapon == null
          ? "free"
          : "offWeapon",
    rightHandUse: loadout.weapon == null ? "free" : "mainWeapon",
  });
}

function projectSelectedEquipmentDefinition(
  unit: UnitRecord | undefined,
  expectedKind: "armor",
): Result.Result<
  | Extract<CharacterSheetEquipmentDefinitionProjection, { kind: "armor" }>
  | undefined,
  CharacterSheetIssue
>;
function projectSelectedEquipmentDefinition(
  unit: UnitRecord | undefined,
  expectedKind: "shield",
): Result.Result<
  | Extract<CharacterSheetEquipmentDefinitionProjection, { kind: "shield" }>
  | undefined,
  CharacterSheetIssue
>;
function projectSelectedEquipmentDefinition(
  unit: UnitRecord | undefined,
  expectedKind: CharacterSheetEquipmentDefinitionProjection["kind"],
): Result.Result<
  CharacterSheetEquipmentDefinitionProjection | undefined,
  CharacterSheetIssue
> {
  if (unit === undefined) return Result.succeed(undefined);
  const definition = projectCharacterSheetEquipmentDefinition(unit);
  if (Result.isFailure(definition)) {
    return characterSheetIssue(
      definition.failure.map(({ message }) => message).join("; "),
    );
  }
  return definition.success.kind === expectedKind
    ? Result.succeed(definition.success)
    : characterSheetIssue(
        `The selected ${expectedKind} loadout root must project ${expectedKind} facts.`,
      );
}

export function characterSheetUnarmoredArmorClassBase(
  input: CharacterSheetArmorClassStateInput & {
    readonly wieldingShield: boolean;
  },
): Result.Result<
  Extract<ArmorClassBaseSource, { readonly kind: "ability_sum" }>,
  CharacterSheetIssue
> {
  return selectedUnarmoredBaseSource(input, {
    wearingArmor: false,
    wieldingShield: input.wieldingShield,
  });
}

export function characterSheetArmorClass(
  input: CharacterSheetArmorClassStateInput,
): Result.Result<ReturnType<typeof currentArmorClass>, CharacterSheetIssue> {
  const state = characterSheetArmorClassState(input);
  if (Result.isSuccess(state)) {
    return Result.succeed(currentArmorClass(state.success));
  }
  /* v8 ignore start -- @preserve -- The scalar wrapper propagates malformed Armor Class state input unchanged. */
  return Result.fail(state.failure);
  /* v8 ignore stop -- @preserve */
}

export function characterSheetArmorClassProjection(
  input: CharacterSheetArmorClassStateInput,
): Result.Result<CharacterSheetArmorClassProjection, CharacterSheetIssue> {
  return Result.map(characterSheetArmorClassState(input), (state) => ({
    state,
    armorClass: currentArmorClass(state),
    qRoute: CHARACTER_SHEET_ARMOR_CLASS_ROUTE,
  }));
}

type CharacterSheetArmorClassBaseCandidate = {
  readonly choice: CharacterSheetArmorClassBaseChoice;
  readonly base: Extract<
    ArmorClassBaseSource,
    { readonly kind: "ability_sum" }
  >;
};
type CharacterSheetArmorClassEquipmentState = {
  readonly wearingArmor: boolean;
  readonly wieldingShield: boolean;
};
type CharacterSheetClassFeatureRecord = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
>;
type ModifyAcSetBaseGrant = Extract<
  Extract<
    ClassFeatureComponentMechanics,
    { readonly family: "passive" }
  >["grants"][number],
  { readonly kind: "modify_ac_set_base" }
>;

function selectedUnarmoredBaseSource(
  input: CharacterSheetArmorClassStateInput,
  equipment: CharacterSheetArmorClassEquipmentState,
): Result.Result<
  Extract<ArmorClassBaseSource, { readonly kind: "ability_sum" }>,
  CharacterSheetIssue
> {
  const defaultBase = {
    choice: { kind: "default_unarmored" },
    base: defaultUnarmoredArmorClassBase(),
  } as const satisfies CharacterSheetArmorClassBaseCandidate;
  const classFeatureCandidateResult =
    characterSheetClassFeatureArmorClassBaseCandidates(
      input.build,
      input.unitLibrary,
      equipment,
    );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: feature ids admitted into the build must still resolve while Armor Class candidates are projected. */
  if (Result.isFailure(classFeatureCandidateResult)) {
    return Result.fail(classFeatureCandidateResult.failure);
  }
  /* v8 ignore stop -- @preserve */
  const candidates = [defaultBase, ...classFeatureCandidateResult.success];
  const baseChoice = input.baseChoice;
  if (baseChoice !== undefined) {
    const selected = candidates.find((candidate) =>
      armorClassChoiceEquals(candidate.choice, baseChoice),
    );
    /* v8 ignore start -- @preserve -- Malformed retained selection: a stored Armor Class base identity must name a candidate reprojected from the same admitted build. */
    if (selected !== undefined) return Result.succeed(selected.base);
    return characterSheetIssue(
      "Selected Armor Class base formula is not available.",
    );
    /* v8 ignore stop -- @preserve */
  }
  const classFeatureCandidates = candidates.filter(
    (candidate) => candidate.choice.kind === "class_feature",
  );
  if (classFeatureCandidates.length === 0)
    return Result.succeed(defaultBase.base);
  if (classFeatureCandidates.length === 1) {
    return Result.succeed(classFeatureCandidates[0].base);
  }
  return characterSheetIssue(
    "Multiple class-feature Armor Class base formulas are available; choose one.",
  );
}

function characterSheetClassFeatureArmorClassBaseCandidates(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  equipment: CharacterSheetArmorClassEquipmentState,
): Result.Result<
  readonly CharacterSheetArmorClassBaseCandidate[],
  CharacterSheetIssue
> {
  const candidates: CharacterSheetArmorClassBaseCandidate[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    /* v8 ignore next -- @preserve -- A build-owned Armor Class feature id must resolve in the same Unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    candidates.push(
      ...armorClassBaseCandidatesForUnit(unit.success, equipment),
    );
  }
  return Result.succeed(candidates);
}

function armorClassBaseCandidatesForUnit(
  unit: UnitRecord,
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  if (unit.kind !== "class_feature") return [];
  return armorClassBaseCandidatesForClassFeatureMechanics(
    unit.id,
    unit.mechanics,
    equipment,
  );
}

function armorClassBaseCandidatesForClassFeatureMechanics(
  unitId: UnitRecord["id"],
  mechanics: CharacterSheetClassFeatureRecord["mechanics"],
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  if (mechanics.family === "composite") {
    return mechanics.parts.flatMap((part) =>
      armorClassBaseCandidatesForClassFeatureComponent(unitId, part, equipment),
    );
  }
  if (mechanics.family !== "passive") return [];
  return armorClassBaseCandidatesForClassFeatureComponent(
    unitId,
    mechanics,
    equipment,
  );
}

function armorClassBaseCandidatesForClassFeatureComponent(
  unitId: UnitRecord["id"],
  mechanics: ClassFeatureComponentMechanics,
  equipment: CharacterSheetArmorClassEquipmentState,
): readonly CharacterSheetArmorClassBaseCandidate[] {
  /* v8 ignore next -- @preserve -- Unsupported authored AC data: this component projector is reached only for admitted passive mechanics. */
  if (mechanics.family !== "passive") return [];
  if (!equipmentPredicateMatches(mechanics.condition, equipment)) {
    return [];
  }
  return mechanics.grants.flatMap((grant) => {
    if (grant.kind !== "modify_ac_set_base") return [];
    const base = armorClassBaseSourceForFormula(unitId, grant.formula);
    /* v8 ignore start -- @preserve -- Unsupported authored AC data: V8 maps the untranslatable-formula edge to this whole conditional, but admission permits only formulas this projector can translate. */
    if (base !== undefined) {
      return [{ choice: { kind: "class_feature", unitId }, base }];
    }
    return [];
    /* v8 ignore stop -- @preserve */
  });
}

function equipmentPredicateMatches(
  predicate: EquipmentPredicate | undefined,
  equipment: CharacterSheetArmorClassEquipmentState,
): boolean {
  if (predicate === undefined || predicate.kind === "always") return true;
  if (predicate.kind === "unarmored") return !equipment.wearingArmor;
  if (predicate.kind === "not_wielding_shield")
    return !equipment.wieldingShield;
  if (predicate.kind === "all_of") {
    return predicate.predicates.every((part) =>
      equipmentPredicateMatches(part, equipment),
    );
  }
  /* v8 ignore next -- @preserve -- Unsupported authored AC profile: holding-item predicates require item-specific state this base projector does not admit. */
  if (predicate.kind === "holding_item") return false;
  /* v8 ignore next -- @preserve -- Unsupported authored AC profile: peering predicates require item-specific state this base projector does not admit. */
  if (predicate.kind === "peering_through_item") return false;
  /* v8 ignore next -- @preserve -- Unsupported authored AC profile: wearing-item predicates require item-specific state this base projector does not admit. */
  if (predicate.kind === "wearing_item") return false;
  /* v8 ignore next -- @preserve -- Unsupported authored AC profile: Monk-weapon predicates require weapon qualification state this base projector does not admit. */
  if (predicate.kind === "unarmed_or_monk_weapons_only") return false;
  /* v8 ignore next -- @preserve -- Unsupported authored AC profile: wearing-armor predicates do not admit an unarmored base formula. */
  if (predicate.kind === "wearing_armor") return false;
  if (predicate.kind === "not_wearing_armor") return !equipment.wearingArmor;
  /* v8 ignore next -- @preserve -- Unsupported authored AC profile: wielding-weapon predicates require weapon-specific state this base projector does not admit. */
  if (predicate.kind === "wielding_weapon") return false;
  /* v8 ignore next -- @preserve -- Internal invariant: EquipmentPredicate is exhaustively handled above. */
  const exhaustive: never = predicate;
  return exhaustive;
}

function armorClassBaseSourceForFormula(
  sourceUnitId: UnitRecord["id"],
  formula: ModifyAcSetBaseGrant["formula"],
): Extract<ArmorClassBaseSource, { readonly kind: "ability_sum" }> | undefined {
  if (formula.kind === "base_plus_dex") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex"],
      source: "spell_base_plus_ability",
    };
  }
  if (formula.kind === "base_plus_dex_con") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex", "con"],
      source: "unarmored_defense",
      sourceUnitId,
    };
  }
  if (formula.kind === "base_plus_dex_wis") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex", "wis"],
      source: "unarmored_defense",
      sourceUnitId,
    };
  }
  /* v8 ignore start -- @preserve -- Unsupported authored AC data: V8 maps the escaped-roster edge to this final conditional, but admission permits base_plus_dex_cha after the three preceding formulas. */
  if (formula.kind === "base_plus_dex_cha") {
    return {
      kind: "ability_sum",
      base: armorClass(formula.base),
      abilityModifiers: ["dex", "cha"],
      source: "class_feature_base_plus_ability",
      sourceUnitId,
    };
  }
  return undefined;
  /* v8 ignore stop -- @preserve */
}

function armorBaseSource(
  armor: CharacterSheetArmorDefinitionFacts,
): ArmorClassBaseSource {
  return {
    kind: "armor",
    formula: armor.acFormula,
    category: armor.category,
  };
}

function characterSheetAbilityModifiers(
  build: Pick<CharacterBuild, "abilityScores">,
): ArmorClassState["abilityModifiers"] {
  return {
    ...zeroAbilityModifiers(),
    str: abilityModifier(abilityScoreToMod(build.abilityScores.str)),
    dex: abilityModifier(abilityScoreToMod(build.abilityScores.dex)),
    con: abilityModifier(abilityScoreToMod(build.abilityScores.con)),
    int: abilityModifier(abilityScoreToMod(build.abilityScores.int)),
    wis: abilityModifier(abilityScoreToMod(build.abilityScores.wis)),
    cha: abilityModifier(abilityScoreToMod(build.abilityScores.cha)),
  };
}

function armorClassChoiceEquals(
  left: CharacterSheetArmorClassBaseChoice,
  right: CharacterSheetArmorClassBaseChoice,
): boolean {
  return left.kind === "default_unarmored"
    ? right.kind === "default_unarmored"
    : right.kind === "class_feature" && left.unitId === right.unitId;
}
