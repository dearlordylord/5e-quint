import { statBlockId } from "@dnd/shared/game-facts";
import { srdStatBlockCollection } from "@dnd/surface/surface/installed-srd-stat-block-catalog";
import { Match, Option } from "effect";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createMcpApplicationServices } from "./composition-root.ts";
import {
  evaluateSrdStatBlockCatalogReachability,
  presentStatBlockSummary,
  type SrdStatBlockCatalogReachabilityIssue,
  type SrdStatBlockCatalogReachabilityResult,
} from "./stat-block-catalog-reachability.ts";

const INDEPENDENT_MUTATIONS = [
  "missing",
  "duplicate",
  "listed-record-mismatch",
  "unselectable",
  "selected-record-mismatch",
  "presentation-failed",
  "presentation-identity-mismatch",
  "unexpected",
] as const;
type IndependentMutation = (typeof INDEPENDENT_MUTATIONS)[number];

const EXPECTED_ISSUE_KIND_BY_MUTATION = {
  missing: "missing-list-entry",
  duplicate: "duplicate-list-entry",
  "listed-record-mismatch": "listed-record-mismatch",
  unselectable: "unselectable-list-entry",
  "selected-record-mismatch": "selected-record-mismatch",
  "presentation-failed": "presentation-failed",
  "presentation-identity-mismatch": "presentation-identity-mismatch",
  unexpected: "unexpected-list-entry",
} as const satisfies Record<
  IndependentMutation,
  SrdStatBlockCatalogReachabilityIssue["kind"]
>;

function unreachableIssues(
  result: SrdStatBlockCatalogReachabilityResult,
): readonly [
  SrdStatBlockCatalogReachabilityIssue,
  ...SrdStatBlockCatalogReachabilityIssue[],
] {
  return Match.value(result).pipe(
    Match.when({ tag: "reachable" }, () => {
      expect(result.tag).toBe("unreachable");
      throw new Error("Expected mutated catalog reachability to be rejected");
    }),
    Match.when({ tag: "unreachable" }, ({ issues }) => issues),
    Match.exhaustive,
  );
}

function mutatedReachability(mutations: readonly IndependentMutation[]) {
  const mutationSet = new Set(mutations);
  const installed = srdStatBlockCollection.statBlocks;
  const [
    missing,
    duplicate,
    listedMismatch,
    unselectable,
    selectedMismatch,
    presentationFailure,
    presentationIdentityMismatch,
    unexpectedSource,
  ] = installed;
  if (
    missing === undefined ||
    duplicate === undefined ||
    listedMismatch === undefined ||
    unselectable === undefined ||
    selectedMismatch === undefined ||
    presentationFailure === undefined ||
    presentationIdentityMismatch === undefined ||
    unexpectedSource === undefined
  ) {
    throw new Error("Reachability mutations require eight installed records");
  }
  const unexpected = {
    ...unexpectedSource,
    id: statBlockId("stat_block_synthetic_unexpected_reachability"),
    name: "Synthetic Unexpected Reachability Creature",
  };
  const canonicalById = new Map(installed.map((record) => [record.id, record]));
  const listed = installed
    .filter(
      (record) => !(mutationSet.has("missing") && record.id === missing.id),
    )
    .map((record) =>
      mutationSet.has("listed-record-mismatch") &&
      record.id === listedMismatch.id
        ? { ...record, name: "Synthetic Listed Record" }
        : record,
    );
  if (mutationSet.has("duplicate")) listed.push(duplicate);
  if (mutationSet.has("unexpected")) listed.push(unexpected);

  const requestedIds = new Set<typeof missing.id>();
  const presentedIds = new Set<typeof missing.id>();
  const result = evaluateSrdStatBlockCatalogReachability({
    installedStatBlocks: installed,
    catalog: {
      listStatBlocks: () => listed,
      getStatBlock: (id) => {
        requestedIds.add(id);
        if (mutationSet.has("unselectable") && id === unselectable.id) {
          return Option.none();
        }
        if (
          mutationSet.has("selected-record-mismatch") &&
          id === selectedMismatch.id
        ) {
          return Option.some({
            ...selectedMismatch,
            name: "Synthetic Selected Record",
          });
        }
        return Option.fromNullable(
          id === unexpected.id ? unexpected : canonicalById.get(id),
        );
      },
    },
    present: (record) => {
      presentedIds.add(record.id);
      if (
        mutationSet.has("presentation-failed") &&
        record.id === presentationFailure.id
      ) {
        return {
          tag: "failed",
          issues: [
            {
              kind: "stat-block-summary-projection-failed",
              message: "Synthetic presentation failure",
            },
          ],
        };
      }
      if (
        mutationSet.has("presentation-identity-mismatch") &&
        record.id === presentationIdentityMismatch.id
      ) {
        return presentStatBlockSummary(unexpectedSource);
      }
      return presentStatBlockSummary(record);
    },
  });
  return {
    result,
    requestedIds,
    presentedIds,
    records: {
      missing,
      duplicate,
      listedMismatch,
      unselectable,
      selectedMismatch,
      presentationFailure,
      presentationIdentityMismatch,
      unexpected,
      unexpectedSource,
    },
  };
}

describe("installed SRD Stat Block catalog reachability", () => {
  it("lists, selects, canonically resolves, and presents exactly 330 unique identities", () => {
    const services = createMcpApplicationServices();
    const result = evaluateSrdStatBlockCatalogReachability({
      installedStatBlocks: srdStatBlockCollection.statBlocks,
      catalog: services.statBlockCatalog,
      present: presentStatBlockSummary,
    });

    Match.value(result).pipe(
      Match.when({ tag: "unreachable" }, ({ issues }) => {
        throw new Error(JSON.stringify(issues));
      }),
      Match.when({ tag: "reachable" }, ({ statBlockIds }) => {
        expect(statBlockIds).toHaveLength(330);
        expect(new Set(statBlockIds).size).toBe(330);
      }),
      Match.exhaustive,
    );
  });

  it("rejects a non-330 installed denominator inside the typed result", () => {
    const first = srdStatBlockCollection.statBlocks[0];
    if (first === undefined) {
      throw new Error("Cardinality mutation requires an installed record");
    }

    expect(
      unreachableIssues(
        evaluateSrdStatBlockCatalogReachability({
          installedStatBlocks: [first],
          catalog: {
            listStatBlocks: () => [first],
            getStatBlock: () => Option.some(first),
          },
          present: presentStatBlockSummary,
        }),
      ),
    ).toEqual([
      {
        kind: "installed-cardinality-mismatch",
        expected: 330,
        actualInstalledCount: 1,
        actualUniqueStatBlockIdCount: 1,
        actualUniqueAuthoredIdentityCount: 1,
      },
    ]);
  });

  it("accumulates independent failures and still selects unexpected listed identities", () => {
    const fixture = mutatedReachability([
      "missing",
      "duplicate",
      "listed-record-mismatch",
      "unselectable",
      "selected-record-mismatch",
      "presentation-failed",
      "presentation-identity-mismatch",
      "unexpected",
    ]);
    const { records } = fixture;

    expect(unreachableIssues(fixture.result)).toEqual([
      { kind: "missing-list-entry", statBlockId: records.missing.id },
      {
        kind: "duplicate-list-entry",
        statBlockId: records.duplicate.id,
        occurrences: 2,
      },
      {
        kind: "listed-record-mismatch",
        statBlockId: records.listedMismatch.id,
        listEntryOrdinal: 1,
      },
      {
        kind: "unselectable-list-entry",
        statBlockId: records.unselectable.id,
      },
      {
        kind: "selected-record-mismatch",
        statBlockId: records.selectedMismatch.id,
      },
      {
        kind: "presentation-failed",
        statBlockId: records.presentationFailure.id,
        issues: [
          {
            kind: "stat-block-summary-projection-failed",
            message: "Synthetic presentation failure",
          },
        ],
      },
      {
        kind: "presentation-identity-mismatch",
        requestedStatBlockId: records.presentationIdentityMismatch.id,
        selectedStatBlockId: records.presentationIdentityMismatch.id,
        presentedStatBlockId: records.unexpectedSource.id,
      },
      { kind: "unexpected-list-entry", statBlockId: records.unexpected.id },
    ]);
    expect(fixture.requestedIds).toContain(records.unexpected.id);
    expect(fixture.presentedIds).toContain(records.unexpected.id);
    expect(fixture.presentedIds).not.toContain(records.unselectable.id);
    expect(fixture.presentedIds).not.toContain(records.selectedMismatch.id);
  });

  it("does not suppress independent issues for any non-empty mutation subset or permutation", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...INDEPENDENT_MUTATIONS), {
          minLength: 1,
          maxLength: INDEPENDENT_MUTATIONS.length,
        }),
        (mutations) => {
          const issues = unreachableIssues(
            mutatedReachability(mutations).result,
          );
          const issueKinds = new Set(issues.map(({ kind }) => kind));

          expect(issueKinds).toEqual(
            new Set(
              mutations.map(
                (mutation) => EXPECTED_ISSUE_KIND_BY_MUTATION[mutation],
              ),
            ),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("distinguishes duplicate Stat Block ids from duplicate authored identities", () => {
    const [first, second] = srdStatBlockCollection.statBlocks;
    if (first === undefined || second === undefined) {
      throw new Error("Duplicate mutation requires two installed records");
    }
    const secondWithFirstIdentity = { ...second, name: first.name };
    const presentation = presentStatBlockSummary;

    expect(
      unreachableIssues(
        evaluateSrdStatBlockCatalogReachability({
          installedStatBlocks: [first, first],
          catalog: {
            listStatBlocks: () => [first],
            getStatBlock: () => Option.some(first),
          },
          present: presentation,
        }),
      ).map(({ kind }) => kind),
    ).toEqual([
      "installed-cardinality-mismatch",
      "duplicate-installed-stat-block-id",
    ]);

    expect(
      unreachableIssues(
        evaluateSrdStatBlockCatalogReachability({
          installedStatBlocks: [first, secondWithFirstIdentity],
          catalog: {
            listStatBlocks: () => [first, secondWithFirstIdentity],
            getStatBlock: (id) =>
              id === first.id
                ? Option.some(first)
                : Option.some(secondWithFirstIdentity),
          },
          present: presentation,
        }),
      ).map(({ kind }) => kind),
    ).toEqual([
      "installed-cardinality-mismatch",
      "duplicate-installed-authored-identity",
      "duplicate-list-authored-identity",
    ]);
  });
});
