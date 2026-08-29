import type { InstalledSrdSurfaceCatalog } from "@dnd/surface/surface/catalog-install";
import type { AuthoredStatBlockBattleInitInput } from "./battle-init.ts";
import { battleCreatureInitFromBoundStatBlock } from "./battle-init.ts";
import {
  bindInstalledStatBlockMechanics,
  bindInstalledUnitMechanics,
  type BattleSrdSurfaceInstallResult,
} from "./admitted-mechanics-binding.ts";
import { statBlockId, unitId } from "@dnd/shared/game-facts";

declare const genericInstalledCatalog: InstalledSrdSurfaceCatalog;
declare const battleInstall: BattleSrdSurfaceInstallResult;
declare const rawStatBlockInput: AuthoredStatBlockBattleInitInput;

if (battleInstall.tag === "accepted") {
  bindInstalledUnitMechanics({
    catalog: battleInstall.catalog,
    unitId: unitId("synthetic_bound_unit"),
  });
  bindInstalledStatBlockMechanics({
    catalog: battleInstall.catalog,
    statBlockId: statBlockId("stat_block_synthetic_bound"),
  });
}

bindInstalledUnitMechanics({
  // @ts-expect-error generic/permissive installation cannot establish battle admission
  catalog: genericInstalledCatalog,
  unitId: unitId("synthetic_unadmitted_unit"),
});

// @ts-expect-error raw authored Stat Blocks cannot bypass installed binding
battleCreatureInitFromBoundStatBlock(rawStatBlockInput);
