// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-MONK-MARTIAL-ARTS-SCALING monk_martial_arts
// UNIT-IDENTITY-MBT-REPLAY: L1D2-MONK-MARTIAL-ARTS-SCALING monk_martial_arts doProjectMartialArtsD12
import {
  classLevel,
  DAMAGE_DIE_SIZES,
  type DamageDieSize,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { martialArtsAttackProjectionProfileForUnit } from "./index.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";

type MonkMartialArtsLastResult = "init" | "projected" | "invalid";
type MonkMartialArtsProjection = {
  readonly classLevel: number;
  readonly damageDieSize: DamageDieSize | 0;
  readonly unitBound: boolean;
  readonly lastResult: MonkMartialArtsLastResult;
};

const monkMartialArtsUnitId = "monk_martial_arts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Monk Martial Arts selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

defineSelectedIdentityWitness({
  describeLabel: "Monk Martial Arts selected identity MBT",
  taskId: "L1D2-MONK-MARTIAL-ARTS-SCALING",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "monk-martial-arts-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    classLevel: "int",
    damageDieSize: "int",
    unitBound: "bool",
    lastResult: "str",
  },
  initialProjection: initialProjection(),
  units: [
    {
      unitId: monkMartialArtsUnitId,
      procedures: [
        {
          actionName: "doProjectMartialArtsD12",
          projectionAfter: {
            classLevel: 17,
            damageDieSize: 12,
            unitBound: true,
            lastResult: "projected",
          },
          discover: () => projectMartialArtsD12(),
        },
      ],
    },
  ],
});

function initialProjection(): MonkMartialArtsProjection {
  return {
    classLevel: 0,
    damageDieSize: 0,
    unitBound: false,
    lastResult: "init",
  };
}

function projectMartialArtsD12(): MonkMartialArtsProjection {
  const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);
  const profile = martialArtsAttackProjectionProfileForUnit(unit, [
    { className: "monk", level: classLevel(17) },
  ]);
  if (profile === null) {
    return { ...initialProjection(), lastResult: "invalid" };
  }
  const dieSize = profile.martialArts.damageReplacement.dieSize;
  if (!isDamageDieSize(dieSize)) {
    throw new Error(
      `Unexpected Monk Martial Arts die size ${String(dieSize)}.`,
    );
  }
  return {
    classLevel: Number(profile.classLevel),
    damageDieSize: dieSize,
    unitBound: profile.unit.id === monkMartialArtsUnitId,
    lastResult: "projected",
  };
}

function isDamageDieSize(dieSize: number): dieSize is DamageDieSize {
  return DAMAGE_DIE_SIZES.some((candidate) => candidate === dieSize);
}
