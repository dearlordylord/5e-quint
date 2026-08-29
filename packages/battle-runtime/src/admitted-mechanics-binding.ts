import { Either, Option } from "effect";

import type { StatBlockId } from "@dnd/shared/game-facts";
import {
  installSrdSurface,
  type InstalledSrdSurfaceCatalog,
  type InstalledStatBlockMechanicsGraph,
  type InstalledUnitMechanicsGraph,
  type SurfaceCatalogInstallResult,
} from "@dnd/surface/surface/catalog-install";
import type {
  StatBlockMechanicsPath,
  UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type { UnitId } from "@dnd/surface/surface/unit-catalog";

import type { AuthoredStatBlockProjection } from "./stat-block-authored-projection.ts";
import { admitCompleteStatBlockMechanics } from "./stat-block-mechanics-admission.ts";
import {
  admitCompleteUnitMechanics,
  type AdmittedUnitMechanics,
} from "./unit-mechanics-admission.ts";

type InstalledBattleCatalog = InstalledSrdSurfaceCatalog<
  AdmittedUnitMechanics,
  AuthoredStatBlockProjection
>;

declare const BattleInstalledSrdSurfaceCatalogTypeId: unique symbol;

export type BattleInstalledSrdSurfaceCatalog = InstalledBattleCatalog & {
  readonly [BattleInstalledSrdSurfaceCatalogTypeId]: typeof BattleInstalledSrdSurfaceCatalogTypeId;
};

export type BoundUnitMechanicsGraph =
  InstalledUnitMechanicsGraph<AdmittedUnitMechanics>;

export type BoundStatBlockMechanicsGraph =
  InstalledStatBlockMechanicsGraph<AuthoredStatBlockProjection>;

export type AuthoredMechanicsSelectionIssue =
  | {
      readonly tag: "unknownUnitSelection";
      readonly unitId: UnitId;
    }
  | {
      readonly tag: "unknownStatBlockSelection";
      readonly statBlockId: StatBlockId;
    };

type BattleSurfaceInstallResult = SurfaceCatalogInstallResult<
  UnitMechanicsPath,
  StatBlockMechanicsPath,
  AdmittedUnitMechanics,
  AuthoredStatBlockProjection
>;

export type BattleSrdSurfaceInstallResult =
  | {
      readonly tag: "accepted";
      readonly catalog: BattleInstalledSrdSurfaceCatalog;
    }
  | Extract<BattleSurfaceInstallResult, { readonly tag: "rejected" }>;

export function installBattleSrdSurface(
  raw: unknown,
): BattleSrdSurfaceInstallResult {
  const installed = installSrdSurface({
    raw,
    mechanicsAdmission: {
      admitUnit: admitCompleteUnitMechanics,
      admitStatBlock: admitCompleteStatBlockMechanics,
    },
  });
  if (installed.tag === "rejected") return installed;
  return {
    tag: "accepted",
    // Brands are erased at runtime. This exact catalog was produced with the
    // battle-runtime admission authorities above; no public callback can
    // establish the private battle-installed proof.
    catalog: installed.catalog as unknown as BattleInstalledSrdSurfaceCatalog,
  };
}

export function bindInstalledUnitMechanics(input: {
  readonly catalog: BattleInstalledSrdSurfaceCatalog;
  readonly unitId: UnitId;
}): Either.Either<BoundUnitMechanicsGraph, AuthoredMechanicsSelectionIssue> {
  const selected = input.catalog.unitLibrary.getInstalledUnit(input.unitId);
  return Option.isNone(selected)
    ? Either.left({ tag: "unknownUnitSelection", unitId: input.unitId })
    : Either.right(selected.value);
}

export function bindInstalledStatBlockMechanics(input: {
  readonly catalog: BattleInstalledSrdSurfaceCatalog;
  readonly statBlockId: StatBlockId;
}): Either.Either<
  BoundStatBlockMechanicsGraph,
  AuthoredMechanicsSelectionIssue
> {
  const selected = input.catalog.statBlockCatalog.getInstalledStatBlock(
    input.statBlockId,
  );
  return Option.isNone(selected)
    ? Either.left({
        tag: "unknownStatBlockSelection",
        statBlockId: input.statBlockId,
      })
    : Either.right(selected.value);
}
