const fs = require("node:fs");
const path = require("node:path");
const { surfaceUnitKinds } = require("./unit-profile-coverage-config.cjs");
const { fail, readJson } = require("./unit-profile-coverage-io.cjs");

function hasExecutableMechanics(record) {
  if (record.mechanics) return true;
  return hasVariantMagicMechanics(record);
}

function hasVariantMagicMechanics(record) {
  return (
    Array.isArray(record.variants) &&
    record.variants.some((variant) => Boolean(variant?.magic?.mechanics))
  );
}

function repoRelativePath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function resolveModulePath(root, importerPath, specifier) {
  const unresolvedPath = path.resolve(path.dirname(importerPath), specifier);
  const candidates = path.extname(unresolvedPath)
    ? [unresolvedPath]
    : [
        unresolvedPath,
        ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map(
          (extension) => `${unresolvedPath}${extension}`,
        ),
        ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map((extension) =>
          path.join(unresolvedPath, `index${extension}`),
        ),
      ];
  const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (resolvedPath === undefined) {
    fail(
      `Could not resolve srdUnitCollection export target ${specifier} from ${repoRelativePath(root, importerPath)}.`,
    );
  }
  return resolvedPath;
}

function reExportsCollection(source) {
  const namedReExportPattern =
    /^\s*export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']\s*;?/gm;
  const namedReExportTargets = [];
  for (const match of source.matchAll(namedReExportPattern)) {
    const exports = match[1].split(",").map((entry) => entry.trim());
    if (
      exports.some((entry) => {
        const [importedName, exportedName] = entry
          .split(/\s+as\s+/)
          .map((name) => name.trim());
        return (exportedName ?? importedName) === "srdUnitCollection";
      })
    ) {
      namedReExportTargets.push(match[2]);
    }
  }
  if (namedReExportTargets.length > 0) return namedReExportTargets;

  return [
    ...source.matchAll(/^\s*export\s*\*\s*from\s*["']([^"']+)["']\s*;?/gm),
  ].map((match) => match[1]);
}

function resolveSrdUnitCollectionSource(root, sourcePath) {
  const globallyVisited = new Set();

  function search(currentPath, branchVisited) {
    const currentSourcePath = repoRelativePath(root, currentPath);
    if (branchVisited.has(currentPath) || globallyVisited.has(currentPath)) {
      return undefined;
    }
    globallyVisited.add(currentPath);
    const source = fs.readFileSync(currentPath, "utf8");
    if (/^\s*export\s+(?:const|let|var)\s+srdUnitCollection\b/m.test(source)) {
      return { path: currentPath, source, sourcePath: currentSourcePath };
    }

    const nextBranch = new Set(branchVisited);
    nextBranch.add(currentPath);
    for (const reExportSpecifier of reExportsCollection(source)) {
      const targetPath = resolveModulePath(
        root,
        currentPath,
        reExportSpecifier,
      );
      const resolved = search(targetPath, nextBranch);
      if (resolved !== undefined) return resolved;
    }
    return undefined;
  }

  const resolved = search(path.join(root, sourcePath), new Set());
  if (resolved === undefined) {
    fail(
      `Could not find srdUnitCollection declaration or re-export in ${sourcePath}.`,
    );
  }
  return resolved;
}

function discoverSrdUnits(root, collection) {
  const catalog = resolveSrdUnitCollectionSource(
    root,
    collection.discovery.sourcePath,
  );
  const membershipPath = path.join(
    path.dirname(catalog.path),
    "srd-unit-publication-membership.json",
  );
  return discoverSrdUnitPublicationMembers(root, collection, membershipPath);
}

function discoverSrdUnitPublicationMembers(root, collection, membershipPath) {
  const membership = readJson(membershipPath);
  if (
    membership.schema !== "dnd.srd-unit-publication-membership.v1" ||
    !Array.isArray(membership.unitIds) ||
    membership.unitIds.length === 0 ||
    Object.keys(membership).length !== 2 ||
    !membership.unitIds.every(
      (unitId) => typeof unitId === "string" && unitId.length > 0,
    )
  ) {
    fail(
      `Invalid SRD Unit publication membership ${repoRelativePath(root, membershipPath)}.`,
    );
  }
  const duplicateUnitId = membership.unitIds.find(
    (unitId, index) => membership.unitIds.indexOf(unitId) !== index,
  );
  if (duplicateUnitId !== undefined) {
    fail(
      `Duplicate SRD Unit publication member ${duplicateUnitId} in ${repoRelativePath(root, membershipPath)}.`,
    );
  }

  const contentDirectory = path.resolve(
    path.dirname(membershipPath),
    "..",
    "..",
    "content",
  );
  const peers = new Map();
  for (const peerName of fs
    .readdirSync(contentDirectory)
    .filter((name) => name.endsWith(".dhall") && !name.startsWith("_"))
    .sort()
    .map((name) => name.replace(/\.dhall$/, ".json"))) {
    const peerPath = path.join(contentDirectory, peerName);
    const parsed = readJson(peerPath);
    const records = Array.isArray(parsed) ? parsed : [parsed];
    for (const record of records) {
      if (
        record?.kind === "statBlock" ||
        record?.provenance?.kind !== "srd-5.2.1"
      ) {
        continue;
      }
      if (peers.has(record.id)) {
        fail(`Duplicate authored SRD Unit peer identity ${record.id}.`);
      }
      peers.set(record.id, { peerPath, record });
    }
  }

  return membership.unitIds.map((unitId) => {
    const peer = peers.get(unitId);
    if (peer === undefined) {
      fail(`Could not resolve published SRD Unit ${unitId} to a content peer.`);
    }
    return {
      unitId: peer.record.id,
      collectionId: collection.id,
      sourceRecordPath: repoRelativePath(root, peer.peerPath),
      kind: peer.record.kind,
      provenance: peer.record.provenance,
      executableMechanics: hasExecutableMechanics(peer.record),
      rawRecord: peer.record,
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
  resolveSrdUnitCollectionSource,
};
