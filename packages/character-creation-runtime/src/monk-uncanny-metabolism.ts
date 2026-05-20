import { Either, Option } from "effect";
import type { ClassFeatureRecord, UnitRecord } from "@dnd/surface/surface/types";
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
    unit.mechanics.grants.some(
      (grant) =>
        grant.kind === "replace_damage_die" &&
        grant.scope === "unarmed_or_monk_weapon" &&
        grant.die.kind === "threshold_tiers" &&
        grant.die.axis === "class",
    )
  );
}

function monkUncannyMetabolismFactsIssue(
  message: string,
): Either.Either<never, CharacterBuildMonkUncannyMetabolismFactsIssue> {
  return Either.left({ tag: "monkUncannyMetabolismFactsIssue", message });
}
