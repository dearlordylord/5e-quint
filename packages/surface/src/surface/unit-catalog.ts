import { Option } from "effect";

// Content JSON is generated from the matching content/*.dhall source.
// Keep authoring changes in Dhall, then regenerate JSON and trace output.
import armorChainMailInput from "../../content/armor_chain_mail.json";
import backgroundSoldierInput from "../../content/background_soldier.json";
import bardCuttingWordsInput from "../../content/bard_cutting_words.json";
import barbarianRageInput from "../../content/barbarian_rage.json";
import barbarianRecklessAttackInput from "../../content/barbarian_reckless_attack.json";
import classFighterInput from "../../content/class_fighter.json";
import classWizardInput from "../../content/class_wizard.json";
import equipmentShieldInput from "../../content/equipment_shield.json";
import featAbilityScoreImprovementInput from "../../content/feat_ability_score_improvement.json";
import featBoonOfCombatProwessInput from "../../content/feat_boon_of_combat_prowess.json";
import featDefenseInput from "../../content/feat_defense.json";
import featSavageAttackerInput from "../../content/feat_savage_attacker.json";
import fighterActionSurgeInput from "../../content/fighter_action_surge.json";
import fighterFightingStyleInput from "../../content/fighter_fighting_style.json";
import fighterImprovedCriticalInput from "../../content/fighter_improved_critical.json";
import fighterSecondWindInput from "../../content/fighter_second_wind.json";
import fighterTacticalMindInput from "../../content/fighter_tactical_mind.json";
import fighterWeaponMasteryInput from "../../content/fighter_weapon_mastery.json";
import detectMagicInput from "../../content/detect_magic.json";
import fireBoltInput from "../../content/fire_bolt.json";
import healingWordInput from "../../content/healing_word.json";
import lightInput from "../../content/light.json";
import mageArmorInput from "../../content/mage_armor.json";
import magicMissileInput from "../../content/magic_missile.json";
import masterySapInput from "../../content/mastery_sap.json";
import monkDeflectAttacksInput from "../../content/monk_deflect_attacks.json";
import orcAdrenalineRushInput from "../../content/orc_adrenaline_rush.json";
import orcDarkvisionInput from "../../content/species_orc_darkvision.json";
import orcRelentlessEnduranceInput from "../../content/orc_relentless_endurance.json";
import speciesOrcInput from "../../content/species_orc.json";
import subclassFighterChampionInput from "../../content/subclass_fighter_champion.json";
import subclassWizardEvokerInput from "../../content/subclass_wizard_evoker.json";
import rayOfFrostInput from "../../content/ray_of_frost.json";
import rogueCunningActionInput from "../../content/rogue_cunning_action.json";
import rogueEvasionInput from "../../content/rogue_evasion.json";
import rogueUncannyDodgeInput from "../../content/rogue_uncanny_dodge.json";
import rogueSneakAttackInput from "../../content/rogue_sneak_attack.json";
import shieldInput from "../../content/shield.json";
import sleepInput from "../../content/sleep.json";
import thunderwaveInput from "../../content/thunderwave.json";
import weaponDaggerInput from "../../content/weapon_dagger.json";
import weaponFlailInput from "../../content/weapon_flail.json";
import weaponLongswordInput from "../../content/weapon_longsword.json";
import weaponShortbowInput from "../../content/weapon_shortbow.json";
import weaponShortswordInput from "../../content/weapon_shortsword.json";
import weaponSpearInput from "../../content/weapon_spear.json";
import wizardArcaneRecoveryInput from "../../content/wizard_arcane_recovery.json";
import wizardRitualAdeptInput from "../../content/wizard_ritual_adept.json";
import acidSplashInput from "../../content/acid_splash.json";
import { decodeUnitRecordSync } from "./schema.ts";
import type {
  Provenance,
  StartingEquipmentChoice,
  UnitRecord,
  WizardClassRecord,
} from "./types.ts";

export type Srd521CollectionProvenance = {
  readonly kind: "srd-5.2.1";
};

export type UnitId = UnitRecord["id"];

export type Srd521Provenance = Provenance & {
  readonly kind: "srd-5.2.1";
};

export type Srd521Unit = UnitRecord & {
  readonly provenance: Srd521Provenance;
};

export type SrdUnitCollection = {
  readonly kind: "srdUnitCollection";
  readonly provenance: Srd521CollectionProvenance;
  readonly units: readonly Srd521Unit[];
};

export type UnitCatalog = {
  readonly getUnit: (id: UnitId) => Option.Option<UnitRecord>;
  readonly listUnits: () => readonly UnitRecord[];
  readonly requireUnit: (id: UnitId) => UnitRecord;
};

export type UnitCatalogBuildIssue =
  | {
      readonly code: "duplicateUnitId";
      readonly unitId: UnitId;
    }
  | {
      readonly code: "mixedProvenance";
      readonly collectionKind: SrdUnitCollection["kind"];
      readonly expected: Srd521CollectionProvenance;
      readonly actual: Provenance;
      readonly unitId: UnitId;
    }
  | {
      readonly code: "unknownUnitReference";
      readonly referringUnitId: UnitId;
      readonly referencedUnitId: UnitId;
    }
  | {
      readonly code: "invalidSubclassChoiceReference";
      readonly classUnitId: UnitId;
      readonly subclassUnitId: UnitId;
      readonly expectedClassName: string;
      readonly actualKind: UnitRecord["kind"];
      readonly actualClassName?: string;
    };

export type UnitCatalogBuildResult =
  | { readonly tag: "ok"; readonly catalog: UnitCatalog }
  | {
      readonly tag: "invalid";
      readonly issues: readonly UnitCatalogBuildIssue[];
    };

export function isSrd521Provenance(
  value: Provenance,
): value is Srd521Provenance {
  return value.kind === "srd-5.2.1";
}

export function isSrd521Unit(unit: UnitRecord): unit is Srd521Unit {
  return isSrd521Provenance(unit.provenance);
}

export function assertSrd521Unit(unit: UnitRecord): Srd521Unit {
  if (!isSrd521Unit(unit)) {
    throw new Error(`Unit is not SRD 5.2.1: ${unit.id}`);
  }

  return unit;
}

export function defineSrdUnitCollection(input: {
  readonly units: readonly Srd521Unit[];
}): SrdUnitCollection {
  const collection = {
    kind: "srdUnitCollection",
    provenance: { kind: "srd-5.2.1" },
    units: input.units,
  } as const satisfies SrdUnitCollection;
  const provenanceIssues = validateSrdUnitCollection(collection);

  if (provenanceIssues.length > 0) {
    throw new Error("SRD Unit collection contains non-SRD provenance");
  }

  return collection;
}

export const srdUnitCollection = defineSrdUnitCollection({
  units: [
    classFighterInput,
    classWizardInput,
    backgroundSoldierInput,
    speciesOrcInput,
    subclassFighterChampionInput,
    subclassWizardEvokerInput,
    fighterFightingStyleInput,
    fighterSecondWindInput,
    fighterWeaponMasteryInput,
    fighterActionSurgeInput,
    fighterTacticalMindInput,
    fighterImprovedCriticalInput,
    barbarianRageInput,
    barbarianRecklessAttackInput,
    bardCuttingWordsInput,
    monkDeflectAttacksInput,
    rogueCunningActionInput,
    rogueEvasionInput,
    rogueUncannyDodgeInput,
    rogueSneakAttackInput,
    wizardRitualAdeptInput,
    wizardArcaneRecoveryInput,
    featAbilityScoreImprovementInput,
    featBoonOfCombatProwessInput,
    featDefenseInput,
    featSavageAttackerInput,
    masterySapInput,
    orcAdrenalineRushInput,
    orcDarkvisionInput,
    orcRelentlessEnduranceInput,
    acidSplashInput,
    fireBoltInput,
    lightInput,
    rayOfFrostInput,
    detectMagicInput,
    mageArmorInput,
    magicMissileInput,
    healingWordInput,
    shieldInput,
    sleepInput,
    thunderwaveInput,
    armorChainMailInput,
    equipmentShieldInput,
    weaponDaggerInput,
    weaponLongswordInput,
    weaponSpearInput,
    weaponFlailInput,
    weaponShortbowInput,
    weaponShortswordInput,
  ].map((unit) => assertSrd521Unit(decodeUnitRecordSync(unit))),
});

export function buildUnitCatalog(input: {
  readonly collections: readonly SrdUnitCollection[];
}): UnitCatalogBuildResult {
  const issues: UnitCatalogBuildIssue[] = [];
  const records = new Map<UnitId, UnitRecord>();

  for (const collection of input.collections) {
    issues.push(...validateSrdUnitCollection(collection));

    for (const unit of collection.units) {
      if (records.has(unit.id)) {
        issues.push({
          code: "duplicateUnitId",
          unitId: unit.id,
        });
      } else {
        records.set(unit.id, unit);
      }
    }
  }

  for (const collection of input.collections) {
    for (const unit of collection.units) {
      issues.push(...findUnknownStartingEquipmentRefs(unit, records));
      issues.push(...findUnknownClassSpellRefs(unit, records));
      issues.push(...findInvalidSubclassChoiceRefs(unit, records));
    }
  }
  // Class feature grant refs are intentionally not catalog-validated yet:
  // this first vertical slice can load partial class progressions while
  // unimplemented higher-level feature Units are still absent. Consumers that
  // need a granted feature Unit dereference it at the point of use. Once the
  // catalog has an explicit supported-level horizon, validate all grant refs
  // inside that horizon here.

  if (issues.length > 0) {
    return { tag: "invalid", issues };
  }

  return {
    tag: "ok",
    catalog: {
      getUnit: (id) => Option.fromNullable(records.get(id)),
      listUnits: () => Array.from(records.values()),
      requireUnit: (id) => records.get(id)!,
    },
  };
}

function findUnknownStartingEquipmentRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (!hasStartingEquipment(unit)) {
    return [];
  }

  return unit.startingEquipment.flatMap((choice) =>
    choice.kind === "item_bundle"
      ? choice.items.flatMap((item) =>
          item.kind === "unit_ref" && !records.has(item.unitId)
            ? [
                {
                  code: "unknownUnitReference",
                  referringUnitId: unit.id,
                  referencedUnitId: item.unitId,
                } satisfies UnitCatalogBuildIssue,
              ]
            : [],
        )
      : [],
  );
}

function hasStartingEquipment(unit: UnitRecord): unit is UnitRecord & {
  readonly startingEquipment: readonly StartingEquipmentChoice[];
} {
  return unit.kind === "class" || unit.kind === "background";
}

function findUnknownClassSpellRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (!isWizardClassRecord(unit)) {
    return [];
  }

  const spellcasting = unit.spellcasting;
  const spellIds = Array.from(
    new Set([
      ...spellcasting.cantripAccess.spellIds,
      ...spellcasting.spellbookAccess.spells.map((spell) => spell.spellId),
      ...spellcasting.preparedAccess.spellIds,
    ]),
  );

  return spellIds.flatMap((spellId) =>
    records.has(spellId)
      ? []
      : [
          {
            code: "unknownUnitReference",
            referringUnitId: unit.id,
            referencedUnitId: spellId,
          } satisfies UnitCatalogBuildIssue,
        ],
  );
}

function isWizardClassRecord(unit: UnitRecord): unit is WizardClassRecord {
  return unit.kind === "class" && unit.className === "wizard";
}

function findInvalidSubclassChoiceRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (unit.kind !== "class") {
    return [];
  }

  return unit.subclassChoices.flatMap((choice) =>
    choice.options.flatMap((subclassUnitId): readonly UnitCatalogBuildIssue[] => {
      const referenced = records.get(subclassUnitId);
      if (referenced == null) {
        return [
          {
            code: "unknownUnitReference",
            referringUnitId: unit.id,
            referencedUnitId: subclassUnitId,
          } satisfies UnitCatalogBuildIssue,
        ];
      }
      if (
        referenced.kind === "subclass" &&
        referenced.className === unit.className
      ) {
        return [];
      }

      return [
        {
          code: "invalidSubclassChoiceReference",
          classUnitId: unit.id,
          subclassUnitId,
          expectedClassName: unit.className,
          actualKind: referenced.kind,
          ...("className" in referenced
            ? { actualClassName: referenced.className }
            : {}),
        } satisfies UnitCatalogBuildIssue,
      ];
    }),
  );
}

function validateSrdUnitCollection(
  collection: SrdUnitCollection,
): readonly UnitCatalogBuildIssue[] {
  return collection.units.flatMap((unit) =>
    isSrd521Provenance(unit.provenance)
      ? []
      : [
          {
            code: "mixedProvenance",
            collectionKind: collection.kind,
            expected: collection.provenance,
            actual: unit.provenance,
            unitId: unit.id,
          } satisfies UnitCatalogBuildIssue,
        ],
  );
}
