import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  decodeStatBlockRecordSync,
  decodeUnitRecordSync,
} from "../packages/surface/src/surface/schema.ts";
import { discoverCanonicalSurfaceContentPeers } from "./surface-content-peer-discovery.ts";

export const SRD_UNIT_PUBLICATION_MEMBERSHIP_RELATIVE_PATH =
  "packages/surface/src/surface/srd-unit-publication-membership.json" as const;

export const SRD_UNIT_AGGREGATE_RELATIVE_PATH =
  "packages/surface/src/surface/generated/srd-unit-aggregate.ts" as const;

const SRD_UNIT_PUBLICATION_MEMBERSHIP_SCHEMA =
  "dnd.srd-unit-publication-membership.v1" as const;

type UnitPeer = {
  readonly peerName: string;
  readonly recordIndex: number | undefined;
};

export function buildSrdUnitAggregateModule(repoRoot: string): string {
  const unitIds = readPublicationUnitIds(repoRoot);
  const peers = readSrdUnitPeers(
    join(repoRoot, "packages", "surface", "content"),
  );
  const orderedPeers = unitIds.map((unitId) => {
    const peer = peers.get(unitId);
    if (peer === undefined) {
      throw new Error(
        `SRD Unit publication member ${unitId} has no canonical strict JSON peer`,
      );
    }
    return peer;
  });

  return renderAggregateModule(orderedPeers);
}

export function buildSrdUnitAggregateBytes(repoRoot: string): Buffer {
  return Buffer.from(buildSrdUnitAggregateModule(repoRoot), "utf8");
}

function readPublicationUnitIds(repoRoot: string): readonly string[] {
  const membershipPath = join(
    repoRoot,
    SRD_UNIT_PUBLICATION_MEMBERSHIP_RELATIVE_PATH,
  );
  const parsed: unknown = JSON.parse(readFileSync(membershipPath, "utf8"));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !("schema" in parsed) ||
    parsed.schema !== SRD_UNIT_PUBLICATION_MEMBERSHIP_SCHEMA ||
    !("unitIds" in parsed) ||
    Object.keys(parsed).length !== 2
  ) {
    throw new Error(
      `Invalid SRD Unit publication membership: ${SRD_UNIT_PUBLICATION_MEMBERSHIP_RELATIVE_PATH}`,
    );
  }
  const unitIds: unknown = parsed.unitIds;
  if (
    !Array.isArray(unitIds) ||
    unitIds.length === 0 ||
    !unitIds.every(
      (unitId): unitId is string =>
        typeof unitId === "string" && unitId.length > 0,
    )
  ) {
    throw new Error(
      `Invalid SRD Unit publication membership: ${SRD_UNIT_PUBLICATION_MEMBERSHIP_RELATIVE_PATH}`,
    );
  }

  const duplicateUnitId = unitIds.find(
    (unitId, index) => unitIds.indexOf(unitId) !== index,
  );
  if (duplicateUnitId !== undefined) {
    throw new Error(
      `Duplicate SRD Unit publication member ${duplicateUnitId}: ${SRD_UNIT_PUBLICATION_MEMBERSHIP_RELATIVE_PATH}`,
    );
  }

  return unitIds;
}

function readSrdUnitPeers(
  contentDirectory: string,
): ReadonlyMap<string, UnitPeer> {
  const peers = new Map<string, UnitPeer>();

  for (const { peerName } of discoverCanonicalSurfaceContentPeers(
    contentDirectory,
  )) {
    const parsed: unknown = JSON.parse(
      readFileSync(join(contentDirectory, peerName), "utf8"),
    );
    const records = Array.isArray(parsed) ? parsed : [parsed];
    for (const [index, rawRecord] of records.entries()) {
      if (isStatBlockDocument(rawRecord)) {
        decodeStatBlockRecordSync(rawRecord);
        continue;
      }

      const record = decodeUnitRecordSync(rawRecord);
      if (record.provenance.kind !== "srd-5.2.1") continue;
      const prior = peers.get(record.id);
      if (prior !== undefined) {
        throw new Error(
          `Duplicate SRD Unit peer identity ${record.id}: ${prior.peerName} and ${peerName}[${index}]`,
        );
      }
      peers.set(record.id, {
        peerName,
        recordIndex: Array.isArray(parsed) ? index : undefined,
      });
    }
  }

  return peers;
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

function renderAggregateModule(orderedPeers: readonly UnitPeer[]): string {
  const peerNames = Array.from(
    new Set(orderedPeers.map((peer) => peer.peerName)),
  ).sort();
  const aliases = new Map(
    peerNames.map((peerName, index) => [peerName, `unitPeer${index}`]),
  );
  const imports = peerNames.map(
    (peerName, index) =>
      `import unitPeer${index} from "../../../content/${peerName}";`,
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
    "// Generated from the ordered SRD Unit publication membership and canonical strict JSON peers.",
    "// Regenerate with pnpm generate:surface-unit-aggregate.",
    "export const srdUnitAggregateInputs = [",
    ...entries.map((entry) => `  ${entry},`),
    "] as const;",
    "",
  ].join("\n");
}
