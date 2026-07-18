# Cleanroom Ralph Delivery Post-mortem — 2026-07-16

> **Historical delivery evidence:** this report records both Cleanroom product
> outcomes and one-off Ralph harness behavior. It is neither main-application
> nor Ralph tooling architecture. Current Ralph ownership is mapped in the
> [tooling architecture](../../tooling/ralph/ARCHITECTURE.md).

## Outcome

Product delivery stopped at accepted integration commit
`2a5d069b420cd7a6e915c99e32f11937f6f6f04b`. The later documentation/tracker
reconciliation is recorded by this report's integration commit.

- Plan size: 55 tasks.
- Completed: 9.
- Remaining: 46.
- Completed before this delivery: GH-41, GH-42, GH-25, GH-44, GH-47.
- Completed during this delivery: GH-152, GH-153, GH-100, GH-98.
- Capped and preserved: GH-92 and GH-154.
- Started, then explicitly stopped and deleted: GH-113.
- Never started: 43.
- New OOM, SIGKILL, or orphaned Quint evaluator incidents: none.

The plan began with 53 leaves: five complete and 48 remaining. Splitting two
oversized leaves added two net leaves, producing the final 55-task graph. Four
new leaves completed, so the final position is 9 complete and 46 remaining.

The accepted diff from `c5543d7f1` contains 52 changed files, 5,217 insertions,
and 811 deletions.

## Completed work

### Pre-existing baseline

The immutable delivery base already contained:

1. GH-41 — reconciled shared D&D language.
2. GH-42 — source-ready Cleanroom modeling assumptions.
3. GH-25 — canonical RAW-to-Surface omissions.
4. GH-44 — complete Surface discovery/regeneration.
5. GH-47 — spell execution from typed procedure facts.

### GH-152 — schema-owned Surface string roles

GH-152 delivered the closed role vocabulary and schema annotations for decoded
Surface strings without mixing traversal policy or content-side admission
state into the schema. A Luna implementer with Sol review converged in seven
rounds. Surface typecheck, 243 package tests, seven focused role tests,
formatting, and diff checks passed.

The product result was accepted, but Ralph exited nonzero: the decider clearly
reported `Task Disposition: done`, while the parser also consumed the later
`Plan Impact: Status: none` and treated the disposition as ambiguous. Manual
ancestry verification, integration, and issue completion recovered the valid
result.

### GH-153 — finite tuple-aware schema/value traversal

GH-153 delivered finite schema/value lockstep traversal, fixed/rest/post-rest
tuple semantics, reachable union compatibility, recursive pair memoization,
fail-closed role checks, and complete decoded-string corpus coverage. It was
accepted in round ten. Surface typecheck, 259 package tests, 23 focused
traversal tests, provenance checker tests, and the production provenance check
passed.

### GH-100 — canonical weapon-attack interruption frame

The first Luna attempt reached ten rejected rounds. Its final design still
allowed contradictory participant/continuation facts, recomputed supposedly
captured damage input, used test-owned rather than production handoff evidence,
and had tautological phase reconstruction.

The WIP was quarantined and classified by exact file/hunk. A Sol retry accepted
in round two after correcting those defects. Verification included 1,627
battle-runtime tests, 47 QNT proofs, focused frame MBT, interrupt-stack-resume
MBT, MBT-closure checks, and combined-state verification.

### GH-98 — strict SRD Surface publication pair

GH-98 accepted in one Sol round. It delivered a deterministic SRD-only Unit and
Stat Block aggregate, strict Draft 2020-12 schema, committed publication pair,
drift enforcement, independent Ajv validation, and graph-size bounds. Surface
typecheck, 267 tests, publication self-tests, and synchronization of 604 source
and generated records passed.

The first combined test could not resolve the newly declared Ajv dependency in
the older integration install. A frozen offline pnpm refresh repaired the
installation; the unchanged verification then passed.

## Capped work

### GH-92 — presentation-free Oracle facts

GH-92 reached the six-round Sol cap. Its final two defects were:

1. Battle projections still exposed Stat Block IDs and authored limited-use
   resource names.
2. Independent Spell Slot and Pact Slot construction failures still returned
   fail-fast rather than as an accumulated typed collection.

Earlier rounds materially improved owner projections, schemas, role mapping,
and error accumulation, but did not converge. Review rounds one and five were
not semantic reviews at all: Sol returned a capacity error. The harness still
charged those technical failures against the six-round cap, so the issue
received only four substantive completed reviews.

The claim, branch, worktree, commits, and reviews remain preserved. GH-93 is
dependency-gated by this incomplete leaf.

### GH-154 — exact Character Build profile graph

GH-154 failed ten Luna rounds and six Sol rounds. The Luna attempt mixed in
GH-155 lifecycle work, dispatched on authored class name, used non-exhaustive
reference traversal, compared nested bundles by order, and mislabeled
synthetic fixtures as SRD.

The Sol retry removed much of that, but its final review still found:

1. incomplete canonical spell graphs were accepted through an object-identity
   fail-open bypass;
2. nested subclass equivalence still depended on authored class identity and
   admitted contradictory ownership;
3. generated owner evidence named the bypass rather than a surviving reader.

The claim and both Luna/Sol quarantines remain preserved. GH-155 remains
dependency-gated.

## Paused work

GH-113 began one Sol implementation round but was stopped by explicit owner
direction before review. Its process was interrupted, the exact claim was
released, and its dirty task worktree, launcher worktree, task branch, output
branch, and launcher branch were deleted. Nothing from GH-113 was integrated.

## Never-started work

Five leaves were runnable but not launched before work stopped: GH-97, GH-99,
GH-46, GH-101, and GH-108.

Thirty-eight leaves were dependency-gated and never launched:

- Oracle: GH-93, GH-94, GH-95.
- Stat Block/Unit/Character lifecycle: GH-110, GH-114, GH-111, GH-112,
  GH-115, GH-62, GH-116, GH-121, GH-51, GH-52, GH-53, GH-117, GH-118,
  GH-122.
- Interruption work: GH-102, GH-103, GH-105, GH-104, GH-106, GH-107, GH-56,
  GH-119, GH-120.
- Transport: GH-64, GH-65, GH-66.
- Cleanroom generation/proof/package pipeline: GH-29, GH-58, GH-59, GH-60,
  GH-40, GH-34, GH-35, GH-36.
- Character Build replay: GH-155.

## Splits

GH-96 reached round ten with one tuple post-rest defect. It was replaced by
GH-152 and GH-153. Both completed, so the technical split worked. GH-96 remains
open, unlabeled, claimed, and quarantined as a predecessor.

GH-109 reached round ten with permissive extra-grant admission, stale owner
evidence, and a dead order-sensitive comparator. It was replaced by GH-154 and
GH-155. The split clarified ownership but did not produce completion: GH-154
capped and GH-155 never started.

No further splits were made after the owner prohibited them.

## GitHub changes

Created replacement issues: GH-152, GH-153, GH-154, and GH-155. GH-153 depends
on GH-152; GH-155 depends on GH-154. The local graph grew from 53 to 55 leaves.

Closed after accepted ancestry and verification: GH-152, GH-153, GH-100, and
GH-98. Their claims were released.

GH-96 and GH-109 had `ready-for-agent` removed and received safety-cap/WIP
reconciliation sections with exact paths, SHAs, reviews, and permitted/discard
classifications. Both remain open quarantined predecessors.

GH-100 and GH-154 received Luna quarantine and Sol retry context. GH-100 then
closed successfully. At the time delivery stopped, GH-154's body lacked its
final Sol cap, GH-92 lacked its Sol cap evidence, and closed accepted issues
still retained `ready-for-agent`. These items were reconciled in the follow-up
described below.

GH-113's temporary claim was released; the issue itself was not otherwise
changed.

## What went well

- Accepted results preserved Base-SHA and output ancestry.
- Issues closed only after integration contained the output.
- Claims prevented duplicate work and were safely released on completion or
  explicit deletion.
- Reviewers caught substantive domain, identity, state-duplication, and
  verification defects rather than rubber-stamping work.
- Selective quarantine reuse succeeded for GH-152, GH-153, and GH-100 without
  merging rejected branches wholesale.
- No new OOM, SIGKILL, leaked evaluator, or concurrent heavy-verifier event
  occurred.
- The requested Sol switch, six-round cap, slower polling, and prohibition on
  new splits were followed.

## What did not go well

- GH-96, GH-109, GH-154, and GH-92 still bundled too many interacting
  invariants for predictable convergence.
- Approximately 72 implementation/review cycles were consumed.
- Technical model-capacity failures consumed semantic review budget.
- GH-152 exposed a real disposition-parser defect.
- Broad verification had persistent baseline noise: typecheck errors,
  authored-identity dispatch violations, and Character Sheet export-split
  drift.
- Tracker state required a separate follow-up reconciliation after the capped
  Sol runs.
- GH-113's partial work was intentionally discarded when its branch was
  deleted.

## Remediation outcomes

| Problem                     | Action                                 | Outcome                                             |
| --------------------------- | -------------------------------------- | --------------------------------------------------- |
| GH-96 did not converge      | Split into GH-152/GH-153               | Worked; both completed                              |
| GH-109 did not converge     | Split into GH-154/GH-155               | Partial; neither chain completed                    |
| GH-100 Luna cap             | Selective WIP quarantine and Sol retry | Worked in two rounds                                |
| GH-154 Luna cap             | Narrow scope and Sol retry             | Did not converge                                    |
| Ten-round cost              | Reduce future cap to six               | Bounded cost, but capacity failures consumed rounds |
| GH-98 stale install         | Frozen offline pnpm refresh            | Worked                                              |
| GH-152 parser abort         | Manual ancestry/merge/close            | Product recovered; harness still needs repair       |
| Unsafe WIP reuse            | Exact paths and hunk classifications   | Worked on three accepted leaves                     |
| Further issue proliferation | Stop splitting                         | Worked                                              |
| GH-113 stop request         | Interrupt, release, delete             | Worked completely                                   |

## Follow-up: baseline verification debt

The post-mortem follow-up reran the three broad gates that reviewers had been
treating as baseline noise.

### Root TypeScript typecheck

`pnpm typecheck` fails on three errors in
`packages/character-creation-runtime/src/character-build-advancement.ts`:

- line 2700: `input.replacement` may be undefined;
- line 3556: the same narrowing loss in a cantrip replacement callback;
- line 3591: the same narrowing loss in a prepared-spell callback.

All three are localized closure-narrowing problems after an explicit undefined
check. They should be repaired before further product delivery so root
typecheck becomes a useful signal again.

### Authored-identity dispatch gate

`pnpm check:authored-id-dispatch` reports 63 violations:

- 58 in Character Sheet Runtime;
- 4 in Battle Runtime;
- 1 in Character Creation Runtime.

These include runtime dispatch on spell, feature, option, class, and resource
authored identities. Some sites may prove to be legitimate narrow admission or
selection boundaries and deserve explicit allowlisting, but most are in
execution-facing modules and conflict with the repository's standing
identity-independent runtime rule. This is real architectural debt and should
not be silenced with a blanket allowlist.

### Character Sheet split audit

`pnpm check:character-sheet-runtime-split` reports 462 current public barrel
exports against 199 expected exports: 263 additions are unreconciled. The
barrel is syntactically clean, has no duplicate exports, resolves every module,
and preserves the two audited moved implementations. The failure is therefore
public-surface ownership drift, not a broken module graph.

This should be reviewed as an architecture task: decide which exports are
genuinely public owner boundaries, record reasons for them, and keep the rest
package-private. Mechanically accepting all 263 additions would defeat the
audit.

Together, these baseline failures mean future Cleanroom work can still use
focused verification, but broad `pnpm quality` cannot provide a trustworthy
green acceptance signal. A supervised continuation should clear the three
TypeScript errors first and then run dedicated authored-identity and Character
Sheet API-surface remediation before resuming leaves that heavily touch those
packages.

## Follow-up: tracker reconciliation

The following low-risk tracker cleanup was completed after the delivery stop:

- removed `ready-for-agent` from closed GH-98, GH-100, GH-152, and GH-153;
- appended exact final Sol-cap evidence to GH-92 and GH-154;
- removed `ready-for-agent` and marked GH-92/GH-154 deferred while retaining
  their claims, branches, worktrees, and reviews;
- recorded that both GH-96 replacement children completed while the capped
  predecessor remains quarantined;
- recorded the incomplete GH-109 replacement state;
- marked the owner-stopped GH-113 deferred, removed its readiness label, and
  recorded its released claim and deleted branches/worktrees.

Live GitHub-backed plan validation passed after these changes. The only
currently runnable frontier is GH-97, GH-99, GH-46, GH-101, and GH-108; no run
was launched.

## Final retained state

Preserved capped/quarantined evidence includes GH-92, GH-154, GH-96, GH-109,
the Luna GH-100 predecessor, and their branches/reviews where applicable.

Deleted state consists of the complete GH-113 launcher/task worktrees, local
branches, and remote claim.

No worker remains active. Integration is clean after committing the
post-mortem and deferred-status reconciliation.

## Follow-up: branch and worktree authority

The repository has three branch roles:

1. `master` at `7dc21604e` is the eventual trunk destination. It is an ancestor
   of the reconciled integration branch and is 22 commits behind it.
2. `wayfinder/cleanroom-ralph-redesign` at `c5543d7f1` is immutable redesign
   provenance. The root `/workspace/typescript/dnd` worktree is checked out
   there and must not be used for new fixes.
3. `ralph/cleanroom-sdk-delivery/integration` at the current reconciled HEAD is
   the delivery authority. Accepted product code ends at its parent
   `2a5d069b4`. All follow-up branches must start at this reconciliation commit
   or later and merge back into integration.

Worktrees fall into three groups:

- Authoritative clean working tree:
  `/workspace/typescript/dnd-cleanroom-sdk-delivery-integration`.
- Completed-run evidence: GH-152, GH-153, GH-100 Sol, and GH-98 Sol. Their
  output branches are contained in integration. Their nested implementation
  worktrees are evidence, not merge authority; some retain dirty reviewer-time
  state or non-integrated implementation commits because the decider produced
  the accepted output separately.
- Capped/quarantined evidence: GH-96, GH-109, GH-100 Luna, GH-154 Luna,
  GH-154 Sol, and GH-92 Sol. Do not run new work from, rebase, clean, or merge
  these worktrees. Retained remote claims exist for GH-96, GH-109, GH-154, and
  GH-92.

GH-113 has no remaining branch, claim, or worktree.

Completed-run worktrees and launcher branches may eventually be archived and
removed, but only after their `.ralph` review/run evidence is preserved in an
agreed durable location. They were intentionally not deleted during this
reconciliation. Branch refs themselves are cheap and do not affect branch
selection.

New harness and baseline work should each use a fresh dedicated worktree from
the latest integration commit. After both converge and combined verification
passes, update `master` with an ancestry-preserving fast-forward from
integration. Do not independently replay fixes onto master or the redesign
branch.
