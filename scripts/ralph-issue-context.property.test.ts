import { Effect } from "effect";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  issueReferenceFromTask,
  issueUrl,
  parseBlockedIssueReferences,
  parseClaimMetadata,
  renderClaimMessage,
  repositoryFromRemoteUrl,
  type ClaimRequest,
  type IssueReference,
} from "./ralph-issue-context.js";

const identifierCharacter = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-",
);
const alphanumericCharacter = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
);
const identifier = fc.stringOf(identifierCharacter, {
  minLength: 1,
  maxLength: 30,
});
const runId = fc
  .tuple(
    alphanumericCharacter,
    fc.stringOf(identifierCharacter, { minLength: 0, maxLength: 63 }),
  )
  .map(([first, rest]) => first + rest);
const branch = fc
  .tuple(identifier, identifier)
  .map(([left, right]) => `${left}/${right}`);
const sha = fc
  .array(fc.constantFrom(..."0123456789abcdef"), {
    minLength: 40,
    maxLength: 40,
  })
  .map((characters) => characters.join(""));

const issueReferenceArbitrary = fc.record({
  owner: identifier,
  repo: identifier,
  number: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
});

const claimRequestArbitrary: fc.Arbitrary<ClaimRequest> = fc.record({
  runId,
  ownerToken: fc.uuid(),
  outputBranch: branch,
  acceptedRef: fc.constant("master"),
  baseSha: sha,
});

describe("Ralph parser properties", () => {
  it("round-trips every generated canonical issue reference", async () => {
    await fc.assert(
      fc.asyncProperty(issueReferenceArbitrary, async (reference) => {
        await expect(
          Effect.runPromise(issueReferenceFromTask(issueUrl(reference))),
        ).resolves.toEqual(reference);
      }),
      { numRuns: 200 },
    );
  });

  it("round-trips valid claim trailers without deriving product-tree state", async () => {
    await fc.assert(
      fc.asyncProperty(
        issueReferenceArbitrary,
        claimRequestArbitrary,
        async (reference, request) => {
          await expect(
            Effect.runPromise(
              parseClaimMetadata(renderClaimMessage(reference, request)),
            ),
          ).resolves.toEqual({
            ...request,
            issue: reference.number,
            phase: "active",
          });
        },
      ),
      { numRuns: 200 },
    );
  });

  it("preserves declared blocker order for every unique generated issue list", async () => {
    const canonical: IssueReference = {
      owner: "owner",
      repo: "repo",
      number: 1,
    };
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.integer({ min: 2, max: 1_000_000 }), {
          minLength: 1,
          maxLength: 30,
        }),
        async (numbers) => {
          const body = `## Blocked by\n\n${numbers.map((number) => `- #${number}`).join("\n")}`;
          await expect(
            Effect.runPromise(parseBlockedIssueReferences(body, canonical)),
          ).resolves.toEqual(
            numbers.map((number) => ({ owner: "owner", repo: "repo", number })),
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it("parses only exact supported GitHub remote hosts", async () => {
    await fc.assert(
      fc.asyncProperty(identifier, identifier, async (owner, repo) => {
        await expect(
          Effect.runPromise(
            repositoryFromRemoteUrl(`git@github.com:${owner}/${repo}.git`),
          ),
        ).resolves.toBe(`${owner}/${repo}`.toLowerCase());
        const rejected = await Effect.runPromise(
          repositoryFromRemoteUrl(
            `https://evilgithub.com/${owner}/${repo}.git`,
          ).pipe(Effect.flip),
        );
        expect(rejected.code).toBe("origin-mismatch");
      }),
      { numRuns: 200 },
    );
  });

  it("rejects every generated newline trailer injection", async () => {
    await fc.assert(
      fc.asyncProperty(
        issueReferenceArbitrary,
        claimRequestArbitrary,
        fc.integer({ min: 1, max: 1_000_000 }),
        async (reference, request, injectedIssue) => {
          const malformed = renderClaimMessage(reference, {
            ...request,
            runId: `${request.runId}\nRalph-Issue: ${injectedIssue}`,
          });
          const rejected = await Effect.runPromise(
            parseClaimMetadata(malformed).pipe(Effect.flip),
          );
          expect(rejected.code).toBe("boundary-decode");
        },
      ),
      { numRuns: 200 },
    );
  });
});
