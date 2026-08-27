import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  SrdStatBlockRecord,
  StatBlockRecord,
  UnitRecord,
} from "../packages/surface/src/surface/types.ts";
import {
  decodeStatBlockRecordSync,
  decodeUnitRecordSync,
} from "../packages/surface/src/surface/schema.ts";
import { normalizeStatBlockIdentity } from "../packages/surface/src/surface/stat-block-identity.ts";
import {
  discoverSrdStatBlocks,
  SRD_STAT_BLOCK_SOURCE_PATHS,
  type SrdStatBlockSourceDiscovery,
} from "./srd521-stat-block-parity.ts";
import { discoverCanonicalSurfaceContentPeers } from "./surface-content-peer-discovery.ts";

const SRD_SOURCE_SECTION_PATHS = new Set(
  SRD_STAT_BLOCK_SOURCE_PATHS.map((sourcePath) =>
    sourcePath.replace(".references/srd-5.2.1/", ""),
  ),
);

export const SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH =
  "packages/surface/src/surface/generated/srd-stat-block-aggregate.ts" as const;

type StatBlockPeer = {
  readonly record: SrdStatBlockRecord;
  readonly peerPath: string;
  readonly peerName: string;
  readonly recordIndex: number | undefined;
};

/**
 * Build the generated SRD catalog projection from strict JSON peers in RAW
 * denominator order. The projection is intentionally partial while authoring
 * is in progress: source identities without a peer remain absent, and every
 * available peer must bind to exactly one canonical source identity.
 */
export function buildSrdStatBlockAggregateModule(repoRoot: string): string {
  const sourceFiles = SRD_STAT_BLOCK_SOURCE_PATHS.map((sourcePath) => ({
    sourcePath,
    contents: readFileSync(join(repoRoot, sourcePath), "utf8"),
  }));
  const discovery = discoverSrdStatBlocks([...sourceFiles]);
  assertCompleteSourceDiscovery(discovery);

  const peers = readSrdStatBlockPeers(
    join(repoRoot, "packages", "surface", "content"),
  );
  const sourceIdentities = new Set(
    discovery.identities.map((identity) =>
      normalizeStatBlockIdentity(identity.name),
    ),
  );
  const orderedPeers: StatBlockPeer[] = [];

  for (const identityRecord of discovery.identities) {
    const identity = normalizeStatBlockIdentity(identityRecord.name);
    const peer = peers.get(identity);
    if (peer !== undefined) orderedPeers.push(peer);
  }

  for (const [identity, peer] of peers) {
    if (!sourceIdentities.has(identity)) {
      throw new Error(
        `SRD JSON peer ${peer.peerPath} is not present in the RAW denominator`,
      );
    }
  }

  return renderAggregateModule(orderedPeers);
}

export function buildSrdStatBlockAggregateBytes(repoRoot: string): Buffer {
  return Buffer.from(buildSrdStatBlockAggregateModule(repoRoot), "utf8");
}

function assertCompleteSourceDiscovery(
  discovery: SrdStatBlockSourceDiscovery,
): void {
  if (discovery.issues.length > 0) {
    throw new Error(
      `RAW SRD denominator is not complete: ${JSON.stringify(discovery.issues)}`,
    );
  }
}

function readSrdStatBlockPeers(
  contentDirectory: string,
): ReadonlyMap<string, StatBlockPeer> {
  const peerNames = discoverCanonicalSurfaceContentPeers(contentDirectory).map(
    ({ peerName }) => peerName,
  );
  const peers = new Map<string, StatBlockPeer>();

  for (const peerName of peerNames) {
    const peerPath = join(contentDirectory, peerName);
    const parsed: unknown = JSON.parse(readFileSync(peerPath, "utf8"));
    const records = Array.isArray(parsed) ? parsed : [parsed];
    for (const [index, rawRecord] of records.entries()) {
      const decoded = decodeSurfaceContentRecord(rawRecord);
      if (decoded.kind !== "statBlock" || !isSrdStatBlockRecord(decoded)) {
        continue;
      }
      if (!isSrdSourceSection(decoded.provenance.section)) continue;
      const record: SrdStatBlockRecord = decoded;
      const identity = normalizeStatBlockIdentity(record.name);
      const prior = peers.get(identity);
      if (prior !== undefined) {
        throw new Error(
          `Duplicate SRD JSON peer identity ${record.name}: ${prior.peerPath} and ${peerName}[${index}]`,
        );
      }
      peers.set(identity, {
        record,
        peerPath: `${peerName}[${index}]`,
        peerName,
        recordIndex: Array.isArray(parsed) ? index : undefined,
      });
    }
  }

  return peers;
}

function decodeSurfaceContentRecord(
  record: unknown,
): StatBlockRecord | UnitRecord {
  return isStatBlockDocument(record)
    ? decodeStatBlockRecordSync(record)
    : decodeUnitRecordSync(record);
}

function isStatBlockDocument(
  record: unknown,
): record is { readonly kind: "statBlock" } {
  return (
    typeof record === "object" &&
    record !== null &&
    !Array.isArray(record) &&
    "kind" in record &&
    record.kind === "statBlock"
  );
}

function isSrdStatBlockRecord(
  record: StatBlockRecord,
): record is SrdStatBlockRecord {
  return record.provenance.kind === "srd-5.2.1";
}

function isSrdSourceSection(section: string): boolean {
  const separator = section.indexOf(":");
  return (
    separator > 0 && SRD_SOURCE_SECTION_PATHS.has(section.slice(0, separator))
  );
}

function renderAggregateModule(orderedPeers: readonly StatBlockPeer[]): string {
  const peerNames = Array.from(
    new Set(orderedPeers.map((peer) => peer.peerName)),
  ).sort();
  const aliases = new Map(
    peerNames.map((peerName, index) => [peerName, `statBlockPeer${index}`]),
  );
  const imports = peerNames.map(
    (peerName, index) =>
      `import statBlockPeer${index} from "../../../content/${peerName}";`,
  );
  const entries = orderedPeers.map((peer) => {
    const alias = aliases.get(peer.peerName);
    if (alias === undefined) {
      throw new Error(`Missing generated alias for ${peer.peerName}`);
    }
    return peer.recordIndex === undefined
      ? alias
      : `${alias}[${peer.recordIndex}]`;
  });
  return [
    ...imports,
    "",
    "// Generated from canonical strict JSON peers in SRD RAW denominator order.",
    "// Regenerate with pnpm generate:surface-stat-block-aggregate.",
    "export const srdStatBlockAggregateInputs = [",
    ...entries.map((entry) => `  ${entry},`),
    "] as const;",
    "",
  ].join("\n");
}
