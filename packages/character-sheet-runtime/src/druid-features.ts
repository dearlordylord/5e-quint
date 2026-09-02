import { srdStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";

import {
  druidWildShapeKnownFormsAfterLongRestWithStatBlockCatalog,
  druidWildShapeKnownFormsConstructionWithStatBlockCatalog,
  druidWildShapeKnownFormsFromInputWithStatBlockCatalog,
} from "./druid-features-core.ts";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog-contract";
import type {
  CharacterSheetInput,
  CharacterSheetLongRestInput,
} from "./sheet-types.ts";

export {
  characterSheetDruidCircleLandPreparedSpellAccess,
  characterSheetDruidWildShapeKnownForms,
  druidCircleLandAfterLongRest,
  druidCircleLandFromInput,
  isDruidCircleLandChoice,
  storedBookOfShadowsDruidCircleLandSelectionIssue,
} from "./druid-features-core.ts";

export function druidWildShapeStatBlockCatalogFromInput(
  statBlockCatalog: StatBlockCatalog | undefined,
): StatBlockCatalog {
  return statBlockCatalog ?? srdStatBlockCatalog;
}

type DruidWildShapeKnownFormsInput = Pick<
  CharacterSheetInput,
  | "build"
  | "unitLibrary"
  | "druidWildShapeKnownFormStatBlockIds"
  | "statBlockCatalog"
>;

function druidWildShapeKnownFormsInputWithStatBlockCatalog(
  input: DruidWildShapeKnownFormsInput,
) {
  return {
    ...input,
    statBlockCatalog: druidWildShapeStatBlockCatalogFromInput(
      input.statBlockCatalog,
    ),
  };
}

export function druidWildShapeKnownFormsFromInput(
  input: DruidWildShapeKnownFormsInput,
) {
  return druidWildShapeKnownFormsFromInputWithStatBlockCatalog(
    druidWildShapeKnownFormsInputWithStatBlockCatalog(input),
  );
}

export function druidWildShapeKnownFormsConstruction(
  input: DruidWildShapeKnownFormsInput,
) {
  return druidWildShapeKnownFormsConstructionWithStatBlockCatalog(
    druidWildShapeKnownFormsInputWithStatBlockCatalog(input),
  );
}

export function druidWildShapeKnownFormsAfterLongRest(input: {
  readonly input: CharacterSheetLongRestInput;
  readonly build: CharacterSheetLongRestInput["completion"]["startedRest"]["sheet"]["build"];
}) {
  return druidWildShapeKnownFormsAfterLongRestWithStatBlockCatalog({
    ...input,
    input: {
      ...input.input,
      statBlockCatalog: druidWildShapeStatBlockCatalogFromInput(
        input.input.statBlockCatalog,
      ),
    },
  });
}
