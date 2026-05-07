const fs = require("node:fs");
const path = require("node:path");
const { surfaceUnitKinds } = require("./unit-profile-coverage-config.cjs");
const { fail, readJson } = require("./unit-profile-coverage-io.cjs");

function hasExecutableMechanics(record) {
  if (Boolean(record.mechanics)) return true;
  return hasVariantMagicMechanics(record);
}

function hasVariantMagicMechanics(record) {
  return (
    Array.isArray(record.variants) &&
    record.variants.some((variant) => Boolean(variant?.magic?.mechanics))
  );
}

function discoverSrdUnits(root, collection) {
  const catalogPath = path.join(root, collection.discovery.sourcePath);
  const source = fs.readFileSync(catalogPath, "utf8");
  const imports = new Map(
    [
      ...source.matchAll(
        /import (\w+) from "\.\.\/\.\.\/content\/([^"]+)\.json";/g,
      ),
    ].map((match) => [match[1], `${match[2]}.json`]),
  );
  const unitsBlock = source.match(
    /export const srdUnitCollection[\s\S]*?units: \[([\s\S]*?)\]\.map/,
  );
  if (!unitsBlock)
    fail(
      `Could not find srdUnitCollection units in ${collection.discovery.sourcePath}.`,
    );

  return [...unitsBlock[1].matchAll(/\b(\w+Input)\b/g)].map((match) => {
    const importName = match[1];
    const importPath = imports.get(importName);
    if (!importPath)
      fail(
        `Could not resolve ${importName} import in ${collection.discovery.sourcePath}.`,
      );
    const sourceRecordPath = `packages/surface/content/${importPath}`;
    const record = readJson(path.join(root, sourceRecordPath));
    return {
      unitId: record.id,
      collectionId: collection.id,
      sourceRecordPath,
      kind: record.kind,
      provenance: record.provenance,
      executableMechanics: hasExecutableMechanics(record),
      rawRecord: record,
    };
  });
}

function discoverClassicFixtureUnits(root, collection) {
  const fixtureDir = path.join(root, collection.discovery.sourcePath);
  return fs
    .readdirSync(fixtureDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const sourceRecordPath = `${collection.discovery.sourcePath}/${entry.name}`;
      const record = readJson(path.join(root, sourceRecordPath));
      return {
        unitId: record.id,
        collectionId: collection.id,
        syntheticLabel: record.syntheticLabel,
        sourceRecordPath,
        kind: "classic-non-srd-mechanics-fixture",
        provenance: record.provenance,
        executableMechanics: hasExecutableMechanics(record),
        rawRecord: record,
      };
    });
}

function discoverInventory(root, collections) {
  return collections.flatMap((collection) => {
    if (collection.discovery.kind === "surface-srd-unit-catalog") {
      return discoverSrdUnits(root, collection);
    }
    if (collection.discovery.kind === "classic-fixture-directory") {
      return discoverClassicFixtureUnits(root, collection);
    }
    fail(`Unknown collection discovery kind: ${collection.discovery.kind}`);
  });
}

function discoverAuthoredSurfaceUnits(root) {
  const contentDir = path.join(root, "packages/surface/content");
  return fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const sourceRecordPath = `packages/surface/content/${entry.name}`;
      const record = readJson(path.join(root, sourceRecordPath));
      if (!surfaceUnitKinds.has(record.kind)) return [];
      return [
        {
          unitId: record.id,
          sourceRecordPath,
          kind: record.kind,
          provenance: record.provenance,
          executableMechanics: hasExecutableMechanics(record),
          rawRecord: record,
        },
      ];
    });
}

module.exports = {
  discoverAuthoredSurfaceUnits,
  discoverInventory,
  hasExecutableMechanics,
  hasVariantMagicMechanics,
};
