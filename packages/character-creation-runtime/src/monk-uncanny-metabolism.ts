import { Either, Option } from "effect";
import { DAMAGE_DIE_SIZES, type DamageDieSize } from "@dnd/shared/types";
import type {
  ClassFeatureRecord,
  DiceExpr,
  DiceExprDelta,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { UnitCatalog } from "./types.ts";
import { characterBuildFeatureUnitIds } from "./finalization.ts";
import type { CharacterBuild } from "./types.ts";
import {
  MONK_MONKS_FOCUS_UNIT_ID,
  characterBuildMonksFocusFacts,
} from "./monk-focus.ts";
import { characterBuildClassFeatureOwnerLevel } from "./class-feature-facts.ts";

export const MONK_UNCANNY_METABOLISM_UNIT_ID =
  "monk_uncanny_metabolism" as const satisfies UnitRecord["id"];
export const MONK_MARTIAL_ARTS_UNIT_ID =
  "monk_martial_arts" as const satisfies UnitRecord["id"];

type MonkUncannyMetabolismFeature = ClassFeatureRecord & {
  readonly className: "monk";
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "initiative_focus_recovery" }
  > & {
    readonly trigger: { readonly kind: "roll_initiative" };
    readonly optional: true;
    readonly recovery: {
      readonly kind: "recover_all_expended_uses";
      readonly resourceUnitId: UnitRecord["id"];
    };
    readonly healing: {
      readonly kind: "heal_hp";
      readonly target: "self";
      readonly amount: {
        readonly kind: "monk_martial_arts_die_plus_monk_level";
        readonly martialArtsUnitId: UnitRecord["id"];
      };
    };
    readonly resetCadence: { readonly kind: "long_rest" };
  };
};

type MonkMartialArtsFeature = ClassFeatureRecord & {
  readonly className: "monk";
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "passive" }
  >;
};
type MonkMartialArtsPassiveGrant =
  MonkMartialArtsFeature["mechanics"]["grants"][number];
type ReplaceDamageDieGrant = Extract<
  MonkMartialArtsPassiveGrant,
  { readonly kind: "replace_damage_die" }
>;
type ThresholdTierDamageDie = Extract<
  ReplaceDamageDieGrant["die"],
  { readonly kind: "threshold_tiers" }
>;
type MonkMartialArtsDieGrant = ReplaceDamageDieGrant & {
  readonly scope: "unarmed_or_monk_weapon";
  readonly die: ThresholdTierDamageDie & { readonly axis: "class" };
};

export type CharacterBuildMonkUncannyMetabolismFacts = {
  readonly unitId: typeof MONK_UNCANNY_METABOLISM_UNIT_ID;
  readonly trigger: "roll_initiative";
  readonly optional: true;
  readonly oncePerLongRestUse: {
    readonly resetCadence: { readonly kind: "long_rest" };
  };
  readonly focusRecovery: {
    readonly resourceUnitId: typeof MONK_MONKS_FOCUS_UNIT_ID;
    readonly recoversAllExpended: true;
  };
  readonly healing: {
    readonly target: "self";
    readonly martialArtsDieSourceUnitId: UnitRecord["id"];
    readonly martialArtsDie: {
      readonly dice: 1;
      readonly dieSize: DamageDieSize;
    };
    readonly monkLevelBonus: number;
  };
};

export type CharacterBuildMonkUncannyMetabolismFactsIssue = {
  readonly tag: "monkUncannyMetabolismFactsIssue";
  readonly message: string;
};

export function characterBuildMonkUncannyMetabolismFacts(input: {
  readonly build: Pick<CharacterBuild, "progression" | "features">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBuildMonkUncannyMetabolismFacts | undefined,
  CharacterBuildMonkUncannyMetabolismFactsIssue
> {
  if (
    !characterBuildFeatureUnitIds(input.build, input.unitLibrary).includes(
      MONK_UNCANNY_METABOLISM_UNIT_ID,
    )
  ) {
    return Either.right(undefined);
  }

  const featureUnit = input.unitLibrary.getUnit(
    MONK_UNCANNY_METABOLISM_UNIT_ID,
  );
  if (Option.isNone(featureUnit)) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires an installed Unit.",
    );
  }
  if (!isMonkUncannyMetabolismFeature(featureUnit.value)) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires the installed Surface feature record.",
    );
  }

  const focusFacts = characterBuildMonksFocusFacts(input);
  if (Either.isLeft(focusFacts)) {
    return monkUncannyMetabolismFactsIssue(focusFacts.left.message);
  }
  if (focusFacts.right === undefined) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires the shared Monk's Focus resource projection.",
    );
  }
  if (
    featureUnit.value.mechanics.recovery.resourceUnitId !==
    focusFacts.right.unitId
  ) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism recovery must reference the shared Monk's Focus resource.",
    );
  }

  const martialArtsUnitId =
    featureUnit.value.mechanics.healing.amount.martialArtsUnitId;
  const martialArtsUnit = input.unitLibrary.getUnit(martialArtsUnitId);
  if (Option.isNone(martialArtsUnit)) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires the installed Martial Arts Unit.",
    );
  }
  if (!isMonkMartialArtsDieSource(martialArtsUnit.value)) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires Martial Arts die source facts.",
    );
  }

  const monkLevel = characterBuildClassFeatureOwnerLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature: featureUnit.value,
  });
  if (Either.isLeft(monkLevel)) {
    return monkUncannyMetabolismFactsIssue(monkLevel.left.message);
  }
  const martialArtsDie = monkMartialArtsDieForLevel({
    unit: martialArtsUnit.value,
    monkLevel: monkLevel.right,
  });
  if (Either.isLeft(martialArtsDie)) return Either.left(martialArtsDie.left);

  return Either.right({
    unitId: MONK_UNCANNY_METABOLISM_UNIT_ID,
    trigger: featureUnit.value.mechanics.trigger.kind,
    optional: true,
    oncePerLongRestUse: {
      resetCadence: featureUnit.value.mechanics.resetCadence,
    },
    focusRecovery: {
      resourceUnitId: focusFacts.right.unitId,
      recoversAllExpended: true,
    },
    healing: {
      target: featureUnit.value.mechanics.healing.target,
      martialArtsDieSourceUnitId: martialArtsUnitId,
      martialArtsDie: martialArtsDie.right,
      monkLevelBonus: monkLevel.right,
    },
  });
}

function isMonkUncannyMetabolismFeature(
  unit: UnitRecord,
): unit is MonkUncannyMetabolismFeature {
  return (
    unit.kind === "class_feature" &&
    unit.className === "monk" &&
    unit.mechanics.family === "initiative_focus_recovery" &&
    unit.mechanics.trigger.kind === "roll_initiative" &&
    unit.mechanics.optional === true &&
    unit.mechanics.recovery.kind === "recover_all_expended_uses" &&
    unit.mechanics.healing.kind === "heal_hp" &&
    unit.mechanics.healing.target === "self" &&
    unit.mechanics.healing.amount.kind ===
      "monk_martial_arts_die_plus_monk_level" &&
    unit.mechanics.resetCadence.kind === "long_rest"
  );
}

function isMonkMartialArtsDieSource(
  unit: UnitRecord,
): unit is MonkMartialArtsFeature {
  return (
    unit.kind === "class_feature" &&
    unit.className === "monk" &&
    unit.mechanics.family === "passive" &&
    unit.mechanics.grants.some(isMonkMartialArtsDieGrant)
  );
}

function monkMartialArtsDieForLevel(input: {
  readonly unit: MonkMartialArtsFeature;
  readonly monkLevel: number;
}): Either.Either<
  CharacterBuildMonkUncannyMetabolismFacts["healing"]["martialArtsDie"],
  CharacterBuildMonkUncannyMetabolismFactsIssue
> {
  const dieGrant = input.unit.mechanics.grants.find(isMonkMartialArtsDieGrant);
  if (dieGrant === undefined) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires Martial Arts die source facts.",
    );
  }

  const baseDie = parseSingleDamageDie(dieGrant.die.base);
  if (Either.isLeft(baseDie)) return Either.left(baseDie.left);

  let die = baseDie.right;
  const applicableTiers = [...dieGrant.die.tiers]
    .filter((tier) => tier.atLevel <= input.monkLevel)
    .sort((left, right) => left.atLevel - right.atLevel);
  for (const tier of applicableTiers) {
    const tierDie = applySingleDamageDieOverride({
      die,
      override: tier.override,
    });
    if (Either.isLeft(tierDie)) return Either.left(tierDie.left);
    die = tierDie.right;
  }

  return Either.right(die);
}

function isMonkMartialArtsDieGrant(
  grant: MonkMartialArtsPassiveGrant,
): grant is MonkMartialArtsDieGrant {
  return (
    grant.kind === "replace_damage_die" &&
    grant.scope === "unarmed_or_monk_weapon" &&
    grant.die.kind === "threshold_tiers" &&
    grant.die.axis === "class"
  );
}

function parseSingleDamageDie(
  value: DiceExpr,
): Either.Either<
  CharacterBuildMonkUncannyMetabolismFacts["healing"]["martialArtsDie"],
  CharacterBuildMonkUncannyMetabolismFactsIssue
> {
  if (value.dice !== 1 || value.flat !== undefined) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires a single Martial Arts damage die.",
    );
  }
  if (!isDamageDieSize(value.dieSize)) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires a supported Martial Arts damage die size.",
    );
  }
  return Either.right({ dice: 1, dieSize: value.dieSize });
}

function applySingleDamageDieOverride(input: {
  readonly die: CharacterBuildMonkUncannyMetabolismFacts["healing"]["martialArtsDie"];
  readonly override: DiceExprDelta;
}): Either.Either<
  CharacterBuildMonkUncannyMetabolismFacts["healing"]["martialArtsDie"],
  CharacterBuildMonkUncannyMetabolismFactsIssue
> {
  if (input.override.dice !== undefined || input.override.flat !== undefined) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires Martial Arts tiers to override only die size.",
    );
  }
  if (input.override.dieSize === undefined) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires Martial Arts tiers to override die size.",
    );
  }
  if (!isDamageDieSize(input.override.dieSize)) {
    return monkUncannyMetabolismFactsIssue(
      "Uncanny Metabolism requires a supported Martial Arts damage die size.",
    );
  }
  return Either.right({ dice: 1, dieSize: input.override.dieSize });
}

function isDamageDieSize(value: number): value is DamageDieSize {
  return DAMAGE_DIE_SIZES.some((dieSize) => dieSize === value);
}

function monkUncannyMetabolismFactsIssue(
  message: string,
): Either.Either<never, CharacterBuildMonkUncannyMetabolismFactsIssue> {
  return Either.left({ tag: "monkUncannyMetabolismFactsIssue", message });
}
